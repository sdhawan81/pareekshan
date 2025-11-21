import { PDFDocument } from 'pdf-lib';
import pdfParse from 'pdf-parse';
import fs from 'fs/promises';
import path from 'path';

/**
 * Enhanced PDF Form to JSON Converter with Advanced Text Extraction
 * Extracts both form fields and associated label text with improved matching
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
 * Extract tooltip/alternate text from field if available
 */
function extractFieldTooltip(field) {
  try {
    const fieldDict = field.acroField?.dict;
    if (fieldDict) {
      // Try to get TU (alternate description/tooltip)
      const tu = fieldDict.lookup(field.acroField.TU);
      if (tu) {
        return tu.decodeText ? tu.decodeText() : null;
      }

      // Try to get TM (tooltip mapping)
      const tm = fieldDict.lookup(field.acroField.TM);
      if (tm) {
        return tm.decodeText ? tm.decodeText() : null;
      }
    }
  } catch (error) {
    // Tooltip not available
  }
  return null;
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
 * Extract all possible identifiers from field name
 */
function extractIdentifiers(fieldName) {
  const identifiers = [];

  // Pattern 1: Q_number_ (e.g., Q_10_C_100_0)
  const qPattern = /Q_(\d+[A-Za-z]?)_/g;
  let match;
  while ((match = qPattern.exec(fieldName)) !== null) {
    identifiers.push({ type: 'question', value: match[1] });
  }

  // Pattern 2: C_number (e.g., C_523087)
  const cPattern = /C_(\d+)/g;
  while ((match = cPattern.exec(fieldName)) !== null) {
    identifiers.push({ type: 'code', value: match[1] });
  }

  // Pattern 3: Any standalone numbers
  const numPattern = /_(\d+)_/g;
  while ((match = numPattern.exec(fieldName)) !== null) {
    if (match[1].length <= 3) { // Only consider short numbers as potential question numbers
      identifiers.push({ type: 'number', value: match[1] });
    }
  }

  // Pattern 4: Word patterns (e.g., firstName, lastName)
  const wordPattern = /([a-z][a-z]+)([A-Z][a-z]+)/;
  match = fieldName.match(wordPattern);
  if (match) {
    identifiers.push({ type: 'camelCase', value: match[0] });
  }

  // Pattern 5: Check for specific keywords in field name (with word boundaries)
  const keywords = ['name', 'first', 'last', 'middle', 'address', 'city', 'state', 'zip',
                    'phone', 'email', 'date', 'birth', 'ssn', 'social'];
  for (const keyword of keywords) {
    // Use word boundary regex to avoid matching substrings like "age" in "Page"
    const wordBoundaryPattern = new RegExp(`\\b${keyword}\\b`, 'i');
    if (wordBoundaryPattern.test(fieldName)) {
      identifiers.push({ type: 'keyword', value: keyword });
    }
  }

  return identifiers;
}

/**
 * Advanced label matching with multiple strategies
 */
function findLabelForField(fieldName, textLines, fieldType) {
  const identifiers = extractIdentifiers(fieldName);
  let bestMatch = null;
  let matchConfidence = 0;

  // Strategy 1: Question number matching
  for (const id of identifiers) {
    if (id.type === 'question' || id.type === 'number') {
      const patterns = [
        new RegExp(`^${id.value}\\.\\s+(.+)`, 'i'),                    // "10. Question text"
        new RegExp(`^Q\\.?\\s*${id.value}\\.?\\s+(.+)`, 'i'),         // "Q 10. Question text"
        new RegExp(`^Question\\s+${id.value}\\.?\\s+(.+)`, 'i'),      // "Question 10. text"
        new RegExp(`^${id.value}\\)\\s+(.+)`, 'i'),                   // "10) Question text"
        new RegExp(`\\b${id.value}\\.\\s+([^\\d].{10,})`, 'i'),       // "...10. Question text" (at least 10 chars)
      ];

      for (const line of textLines) {
        for (const pattern of patterns) {
          const match = line.match(pattern);
          if (match && match[1]) {
            const label = match[1].trim();
            if (label.length > 3 && matchConfidence < 0.9) {
              bestMatch = label;
              matchConfidence = 0.9;
            }
          }
        }
      }
    }
  }

  // Strategy 2: Keyword matching for common field names
  for (const id of identifiers) {
    if (id.type === 'keyword') {
      const keyword = id.value;
      const patterns = [
        new RegExp(`^.*${keyword}.*:`, 'i'),                          // "First Name:"
        new RegExp(`^${keyword}\\s*\\(?[^)]*\\)?:`, 'i'),            // "Name (required):"
        new RegExp(`^.*\\b${keyword}\\b.*:`, 'i'),                   // "...name...:"
      ];

      for (const line of textLines) {
        for (const pattern of patterns) {
          if (pattern.test(line) && matchConfidence < 0.7) {
            bestMatch = line;
            matchConfidence = 0.7;
          }
        }
      }
    }
  }

  // Strategy 3: Partial field name matching (more conservative)
  const cleanFieldName = fieldName
    .replace(/\[0\]/g, '')
    .replace(/_/g, ' ')
    .replace(/topmostSubform\s*/gi, '')
    .replace(/Page\d+\s*/gi, '')
    .trim();

  // Only use similarity matching if we have a reasonably long, meaningful field name
  if (cleanFieldName.length > 15 && matchConfidence < 0.5) {
    for (const line of textLines) {
      // Require higher similarity threshold (0.6 instead of 0.3)
      const similarity = calculateSimilarity(cleanFieldName.toLowerCase(), line.toLowerCase());
      if (similarity > 0.6 && line.length > 10 && matchConfidence < 0.5) {
        bestMatch = line;
        matchConfidence = 0.5;
      }
    }
  }

  // Strategy 4: Context-based matching for checkboxes and radio buttons (disabled for now)
  // This strategy was too aggressive and caused false matches
  // Keeping code for reference but not using it
  /*
  if ((fieldType === 'checkbox' || fieldType === 'radio') && matchConfidence < 0.4) {
    // Look for common checkbox/radio labels
    const optionPatterns = [
      /^(Yes|No)$/i,
      /^(Male|Female)$/i,
      /^(Married|Single|Divorced|Widowed|Separated|Partnered)$/i,
      /^(True|False)$/i,
      /^(Agree|Disagree)$/i,
    ];

    for (const line of textLines) {
      for (const pattern of optionPatterns) {
        if (pattern.test(line.trim()) && matchConfidence < 0.4) {
          // Look at previous lines for context
          const idx = textLines.indexOf(line);
          if (idx > 0) {
            bestMatch = textLines[idx - 1];
            matchConfidence = 0.4;
          }
        }
      }
    }
  }
  */

  // Only return matches with reasonable confidence (>= 0.5)
  return matchConfidence >= 0.5 ? bestMatch : null;
}

/**
 * Calculate similarity between two strings (simple Levenshtein-like approach)
 */
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Build a field name to text mapping index
 */
function buildTextIndex(textLines) {
  const index = {
    byNumber: new Map(),
    byKeyword: new Map(),
    allLines: textLines
  };

  // Index by numbers
  textLines.forEach((line, idx) => {
    const numberMatch = line.match(/^(\d+)\./);
    if (numberMatch) {
      index.byNumber.set(numberMatch[1], { line, index: idx });
    }
  });

  // Index by keywords (with word boundary matching)
  const keywords = ['name', 'address', 'phone', 'email', 'date', 'ssn', 'social', 'first', 'last', 'middle'];
  textLines.forEach((line, idx) => {
    keywords.forEach(keyword => {
      const wordBoundaryPattern = new RegExp(`\\b${keyword}\\b`, 'i');
      if (wordBoundaryPattern.test(line)) {
        if (!index.byKeyword.has(keyword)) {
          index.byKeyword.set(keyword, []);
        }
        index.byKeyword.get(keyword).push({ line, index: idx });
      }
    });
  });

  return index;
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

    // Build text index for faster lookups
    const textIndex = buildTextIndex(textLines);

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

        // Try multiple strategies to find label
        let labelText = null;

        // 1. Check for tooltip/alternate text in PDF
        labelText = extractFieldTooltip(field);

        // 2. If no tooltip, try text matching
        if (!labelText) {
          labelText = findLabelForField(fieldName, textLines, fieldType);
        }

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
    formData.metadata.labelMatchRate = ((formData.metadata.fieldsWithLabels / formData.metadata.fieldCount) * 100).toFixed(1) + '%';

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
    console.log(`Matched ${jsonData.metadata.fieldsWithLabels} fields with labels (${jsonData.metadata.labelMatchRate})`);

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
      console.log(`Fields with labels: ${data.metadata.fieldsWithLabels} (${data.metadata.labelMatchRate})`);
    })
    .catch(error => {
      console.error('Conversion failed:', error.message);
      process.exit(1);
    });
}
