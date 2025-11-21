import { PDFDocument } from 'pdf-lib';
import pdfParse from 'pdf-parse';
import fs from 'fs/promises';
import path from 'path';

/**
 * Enhanced PDF Form to JSON Converter with Text Extraction
 * Extracts both form fields and associated label text
 */

/**
 * Get field type from PDF field
 */
function getFieldType(field) {
  const constructor = field.constructor.name;

  const typeMap = {
    'PDFTextField': 'text',
    'PDFCheckBox': 'checkbox',
    'PDFRadioGroup': 'radio',
    'PDFDropdown': 'dropdown',
    'PDFOptionList': 'select',
    'PDFButton': 'button',
    'PDFSignature': 'signature'
  };

  return typeMap[constructor] || 'unknown';
}

/**
 * Extract field properties and metadata
 */
function extractFieldProperties(field, fieldType) {
  const properties = {
    readOnly: false,
    required: false,
    multiline: false,
    maxLength: null
  };

  try {
    // Check if field is read-only
    if (field.acroField && field.acroField.getFlags) {
      const flags = field.acroField.getFlags();
      properties.readOnly = !!(flags.readOnly || flags.locked);
    }

    // Check if field is required
    const fieldDict = field.acroField?.dict;
    if (fieldDict) {
      const ff = fieldDict.lookup(field.acroField.Ff);
      if (ff) {
        properties.required = !!(ff.asNumber() & (1 << 1)); // Required bit
      }
    }

    // Text field specific properties
    if (fieldType === 'text') {
      try {
        properties.multiline = field.isMultiline ? field.isMultiline() : false;
        properties.maxLength = field.getMaxLength ? field.getMaxLength() : null;
      } catch (e) {
        // Some PDFs may not have these properties
      }
    }

    // Checkbox properties
    if (fieldType === 'checkbox') {
      try {
        properties.checked = field.isChecked ? field.isChecked() : false;
      } catch (e) {
        properties.checked = false;
      }
    }

    // Dropdown/Select properties
    if (fieldType === 'dropdown' || fieldType === 'select') {
      try {
        properties.options = field.getOptions ? field.getOptions() : [];
        properties.selected = field.getSelected ? field.getSelected() : [];
      } catch (e) {
        properties.options = [];
        properties.selected = [];
      }
    }

    // Radio group properties
    if (fieldType === 'radio') {
      try {
        properties.options = field.getOptions ? field.getOptions() : [];
        properties.selected = field.getSelected ? field.getSelected() : null;
      } catch (e) {
        properties.options = [];
        properties.selected = null;
      }
    }

  } catch (error) {
    console.warn(`Warning: Could not extract all properties for field ${field.getName()}:`, error.message);
  }

  return properties;
}

/**
 * Get field value based on type
 */
function getFieldValue(field, fieldType) {
  try {
    switch (fieldType) {
      case 'text':
        return field.getText ? field.getText() : '';
      case 'checkbox':
        return field.isChecked ? field.isChecked() : false;
      case 'radio':
        return field.getSelected ? field.getSelected() : null;
      case 'dropdown':
      case 'select':
        return field.getSelected ? field.getSelected() : [];
      default:
        return null;
    }
  } catch (error) {
    console.warn(`Warning: Could not get value for field ${field.getName()}:`, error.message);
    return null;
  }
}

/**
 * Extract all text content from PDF
 */
async function extractPdfText(pdfBytes) {
  try {
    const data = await pdfParse(pdfBytes);
    return {
      text: data.text,
      numPages: data.numpages,
      info: data.info
    };
  } catch (error) {
    console.warn('Warning: Could not extract text content:', error.message);
    return { text: '', numPages: 0, info: {} };
  }
}

/**
 * Parse text content into lines and structure
 */
function parseTextContent(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  return lines;
}

/**
 * Try to find label text for a field based on field name patterns
 */
function findLabelForField(fieldName, textLines) {
  // Extract question number or identifier from field name
  // Pattern like "Q_10_C_100_0" -> look for "Q 10", "10.", "Question 10", etc.

  const patterns = [
    /Q_(\d+)_/,           // Q_10_
    /Q_(\d+[A-Za-z]?)_/,  // Q_10a_
    /_(\d+)_/,            // _10_
  ];

  let questionNum = null;
  for (const pattern of patterns) {
    const match = fieldName.match(pattern);
    if (match) {
      questionNum = match[1];
      break;
    }
  }

  if (!questionNum) {
    return null;
  }

  // Search for lines that might contain this question
  const searchPatterns = [
    new RegExp(`^${questionNum}\\.?\\s+(.+)`, 'i'),           // "10. Question text"
    new RegExp(`^Q\\.?\\s*${questionNum}\\.?\\s+(.+)`, 'i'),  // "Q 10. Question text"
    new RegExp(`^Question\\s+${questionNum}\\.?\\s+(.+)`, 'i'), // "Question 10. text"
    new RegExp(`\\b${questionNum}\\.\\s+(.+)`, 'i'),          // "...10. Question text"
  ];

  for (const line of textLines) {
    for (const pattern of searchPatterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }
  }

  // If no match found, try fuzzy matching - find lines that contain the question number
  for (const line of textLines) {
    if (line.includes(questionNum + '.') || line.includes(questionNum + ')')) {
      return line;
    }
  }

  return null;
}

/**
 * Enhanced converter that includes text extraction
 */
export async function convertPdfToJson(pdfPath, options = {}) {
  try {
    // Read the PDF file
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Extract text content
    console.log('Extracting text content...');
    const textData = await extractPdfText(pdfBytes);
    const textLines = parseTextContent(textData.text);
    console.log(`Extracted ${textLines.length} lines of text`);

    // Get the form
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    // Extract form metadata
    const formData = {
      metadata: {
        fileName: path.basename(pdfPath),
        filePath: pdfPath,
        pageCount: pdfDoc.getPageCount(),
        fieldCount: fields.length,
        textLinesExtracted: textLines.length,
        extractedAt: new Date().toISOString()
      },
      textContent: options.includeFullText ? textLines : null,
      fields: []
    };

    // Process each field
    for (const field of fields) {
      try {
        const fieldName = field.getName();
        const fieldType = getFieldType(field);
        const fieldValue = getFieldValue(field, fieldType);
        const properties = extractFieldProperties(field, fieldType);

        // Try to find label text for this field
        const labelText = findLabelForField(fieldName, textLines);

        const fieldData = {
          name: fieldName,
          label: labelText,
          type: fieldType,
          value: fieldValue,
          properties: properties
        };

        // Add appearance information if available
        try {
          const widgets = field.acroField?.getWidgets();
          if (widgets && widgets.length > 0) {
            fieldData.appearance = {
              widgetCount: widgets.length
            };
          }
        } catch (e) {
          // Appearance info not available
        }

        formData.fields.push(fieldData);
      } catch (fieldError) {
        console.error(`Error processing field: ${fieldError.message}`);
        // Continue with other fields
      }
    }

    // Sort fields by name for consistency
    if (options.sortFields !== false) {
      formData.fields.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Add summary statistics
    formData.metadata.fieldsWithLabels = formData.fields.filter(f => f.label).length;
    formData.metadata.fieldsWithoutLabels = formData.fields.filter(f => !f.label).length;

    return formData;

  } catch (error) {
    throw new Error(`Failed to convert PDF to JSON: ${error.message}`);
  }
}

/**
 * Save JSON to file
 */
export async function saveJsonToFile(jsonData, outputPath) {
  try {
    const jsonString = JSON.stringify(jsonData, null, 2);
    await fs.writeFile(outputPath, jsonString, 'utf-8');
    console.log(`JSON saved to: ${outputPath}`);
    return outputPath;
  } catch (error) {
    throw new Error(`Failed to save JSON: ${error.message}`);
  }
}

/**
 * Main conversion function
 */
export async function convertPdfFormToJson(pdfPath, outputPath = null, options = {}) {
  try {
    console.log(`Converting PDF form: ${pdfPath}`);

    // Convert PDF to JSON
    const jsonData = await convertPdfToJson(pdfPath, options);

    console.log(`Found ${jsonData.fields.length} form fields`);
    console.log(`Matched ${jsonData.metadata.fieldsWithLabels} fields with labels`);

    // Save to file if output path provided
    if (outputPath) {
      await saveJsonToFile(jsonData, outputPath);
    }

    return jsonData;

  } catch (error) {
    console.error(`Error: ${error.message}`);
    throw error;
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node converter.js <input-pdf-path> [output-json-path]');
    console.log('Example: node converter.js sample-form.pdf output.json');
    process.exit(1);
  }

  const inputPath = args[0];
  const outputPath = args[1] || inputPath.replace('.pdf', '.json');

  convertPdfFormToJson(inputPath, outputPath)
    .then(data => {
      console.log('\nConversion completed successfully!');
      console.log(`Fields extracted: ${data.fields.length}`);
      console.log(`Fields with labels: ${data.metadata.fieldsWithLabels}`);
    })
    .catch(error => {
      console.error('Conversion failed:', error.message);
      process.exit(1);
    });
}
