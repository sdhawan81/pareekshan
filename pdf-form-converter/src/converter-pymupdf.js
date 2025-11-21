/**
 * Enhanced PDF Form Converter using PyMuPDF for text extraction
 * Combines PyMuPDF's superior text extraction with pdf-lib's form field parsing
 */

import { promises as fs } from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extract text using PyMuPDF (via Python script)
 */
async function extractTextWithPyMuPDF(pdfPath) {
  try {
    const scriptPath = path.join(__dirname, '../poc-pymupdf-extractor.py');
    const result = execSync(`python3 "${scriptPath}" "${pdfPath}"`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024
    });

    // Load the generated JSON files
    const wordsPath = path.join(__dirname, '../output/words_extraction.json');
    const wordsData = JSON.parse(await fs.readFile(wordsPath, 'utf-8'));

    return wordsData;
  } catch (error) {
    console.error('Error running PyMuPDF extraction:', error.message);
    throw error;
  }
}

/**
 * Group words into text lines based on vertical position
 */
function groupWordsIntoLines(words, maxYDiff = 3) {
  if (!words || words.length === 0) return [];

  // Sort by y-coordinate, then x-coordinate
  const sorted = [...words].sort((a, b) => {
    const yDiff = a.y0 - b.y0;
    if (Math.abs(yDiff) <= maxYDiff) {
      return a.x0 - b.x0;
    }
    return yDiff;
  });

  const lines = [];
  let currentLine = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const word = sorted[i];
    const prevWord = currentLine[0];

    if (Math.abs(word.y0 - prevWord.y0) <= maxYDiff) {
      currentLine.push(word);
    } else {
      lines.push(currentLine);
      currentLine = [word];
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Reconstruct text lines from word data
 */
function reconstructTextLines(wordsData) {
  const allLines = [];

  for (const pageNum in wordsData.by_page) {
    const pageWords = wordsData.by_page[pageNum];
    const lines = groupWordsIntoLines(pageWords);

    for (const lineWords of lines) {
      const sortedWords = [...lineWords].sort((a, b) => a.x0 - b.x0);
      const text = sortedWords.map(w => w.text).join(' ');

      allLines.push({
        text: text,
        page: parseInt(pageNum),
        y0: lineWords[0].y0,
        x0: lineWords[0].x0,
        x1: lineWords[lineWords.length - 1].x1,
        words: sortedWords
      });
    }
  }

  return allLines;
}

/**
 * Extract options from lines following a label
 */
function extractOptionsFromLines(labelLineIndex, textLines, maxLines = 10) {
  const options = [];
  const labelLine = textLines[labelLineIndex];

  for (let i = labelLineIndex + 1; i < Math.min(labelLineIndex + maxLines, textLines.length); i++) {
    const line = textLines[i];

    // Stop if different page
    if (line.page !== labelLine.page) break;

    // Stop if we hit another question number
    if (/^\d+\.\s/.test(line.text.trim())) break;

    // Skip empty lines
    if (!line.text.trim()) continue;

    // Extract words from the line that look like options
    const words = line.words
      .filter(w => {
        const text = w.text.trim();
        // Filter out checkbox symbols and short strings
        return text.length > 1 && /[a-zA-Z]/.test(text);
      })
      .map(w => w.text.trim());

    options.push(...words);

    if (options.length >= 20) break;
  }

  return options;
}

/**
 * Find label for field by matching field name patterns
 */
function findLabelForField(fieldName, textLines) {
  // Extract question number from field name
  const qMatch = fieldName.match(/Q_(\d+)_/);
  if (qMatch) {
    const qNum = qMatch[1];
    const pattern = new RegExp(`^${qNum}\\.\\s+`);

    for (const line of textLines) {
      if (pattern.test(line.text.trim())) {
        return line.text.trim();
      }
    }
  }

  // Try other patterns
  const patterns = [
    { regex: /SSN/i, search: 'Social Security' },
    { regex: /Name/i, search: 'Name:' },
    { regex: /DOB/i, search: 'Date of birth' },
    { regex: /Sex/i, search: 'Sex:' }
  ];

  for (const { regex, search } of patterns) {
    if (regex.test(fieldName)) {
      for (const line of textLines) {
        if (line.text.includes(search)) {
          return line.text.trim();
        }
      }
    }
  }

  return null;
}

/**
 * Enhanced converter using PyMuPDF
 */
export async function convertPdfToJsonEnhanced(pdfPath, options = {}) {
  try {
    console.log(`Converting PDF with PyMuPDF enhancement: ${pdfPath}`);

    // Extract text with PyMuPDF
    console.log('Extracting text with PyMuPDF...');
    const wordsData = await extractTextWithPyMuPDF(pdfPath);

    // Reconstruct text lines
    const textLines = reconstructTextLines(wordsData);
    console.log(`Reconstructed ${textLines.length} text lines from ${wordsData.total_words} words`);

    // Load PDF with pdf-lib for form fields
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log(`Found ${fields.length} form fields`);

    // Create form data structure
    const formData = {
      metadata: {
        fileName: path.basename(pdfPath),
        pageCount: pdfDoc.getPageCount(),
        fieldCount: fields.length,
        textLinesExtracted: textLines.length,
        totalWords: wordsData.total_words,
        extractionMethod: 'PyMuPDF + pdf-lib',
        extractedAt: new Date().toISOString()
      },
      fields: []
    };

    // Process each field
    const { getFieldType, getFieldValue, extractFieldProperties } = await import('./converter.js');

    for (const field of fields) {
      try {
        const fieldName = field.getName();
        const fieldType = getFieldType(field);
        const fieldValue = getFieldValue(field, fieldType);
        const properties = extractFieldProperties(field, fieldType);

        // Find label
        const label = findLabelForField(fieldName, textLines);

        const fieldData = {
          name: fieldName,
          label: label,
          type: fieldType,
          value: fieldValue,
          properties: properties
        };

        formData.fields.push(fieldData);
      } catch (error) {
        console.error(`Error processing field: ${error.message}`);
      }
    }

    // Group related fields and extract options
    console.log('Extracting options for fields...');
    const { groupRelatedFields } = await import('./converter.js');
    const fieldGroups = groupRelatedFields(formData.fields);

    let optionsExtracted = 0;

    // Process each group
    fieldGroups.forEach(group => {
      if (group.length === 0) return;

      const mainLabel = group[0].label;
      if (!mainLabel) return;

      // Find label in text lines
      let labelLineIndex = -1;
      for (let i = 0; i < textLines.length; i++) {
        if (textLines[i].text.includes(mainLabel)) {
          labelLineIndex = i;
          break;
        }
      }

      if (labelLineIndex < 0) return;

      // Extract options
      const options = extractOptionsFromLines(labelLineIndex, textLines);

      if (options.length === 0) return;

      // Assign options to fields
      if (group.length === 1 && group[0].type === 'radio') {
        group[0].optionLabels = options;
        optionsExtracted++;
      } else {
        group.forEach((field, idx) => {
          if (idx < options.length) {
            field.optionLabel = options[idx];
            optionsExtracted++;
          }
        });
      }
    });

    console.log(`Extracted options for ${optionsExtracted} fields`);

    // Add statistics
    formData.metadata.fieldsWithLabels = formData.fields.filter(f => f.label).length;
    formData.metadata.fieldsWithOptions = formData.fields.filter(f => f.optionLabel || f.optionLabels).length;

    let totalOptions = 0;
    formData.fields.forEach(f => {
      if (f.optionLabel) totalOptions++;
      if (f.optionLabels) totalOptions += f.optionLabels.length;
    });
    formData.metadata.totalOptionsExtracted = totalOptions;

    return formData;

  } catch (error) {
    throw new Error(`Failed to convert PDF: ${error.message}`);
  }
}

/**
 * Save JSON to file
 */
export async function saveJsonToFile(jsonData, outputPath) {
  const jsonString = JSON.stringify(jsonData, null, 2);
  await fs.writeFile(outputPath, jsonString, 'utf-8');
  console.log(`JSON saved to: ${outputPath}`);
  return outputPath;
}

/**
 * Main conversion function
 */
export async function convertPdfFormToJsonEnhanced(pdfPath, outputPath = null, options = {}) {
  try {
    const jsonData = await convertPdfToJsonEnhanced(pdfPath, options);

    console.log(`\n=== RESULTS ===`);
    console.log(`Fields: ${jsonData.metadata.fieldCount}`);
    console.log(`With labels: ${jsonData.metadata.fieldsWithLabels}`);
    console.log(`With options: ${jsonData.metadata.fieldsWithOptions}`);
    console.log(`Total options: ${jsonData.metadata.totalOptionsExtracted}`);

    if (outputPath) {
      await saveJsonToFile(jsonData, outputPath);
    }

    return jsonData;
  } catch (error) {
    throw new Error(`Conversion failed: ${error.message}`);
  }
}
