import { convertPdfFormToJsonEnhanced } from './src/converter-pymupdf.js';

const pdfPath = 'examples/701T_V1.pdf';
const outputPath = 'output/701T_V1_pymupdf_enhanced.json';

console.log('Testing PyMuPDF-enhanced converter...\n');

try {
  const data = await convertPdfFormToJsonEnhanced(pdfPath, outputPath);

  // Find the "purpose of assessment" field to verify options
  const purposeField = data.fields.find(f =>
    f.label && f.label.includes('purpose of this assessment')
  );

  if (purposeField) {
    console.log('\n=== "Purpose of Assessment" Field ===');
    console.log('Label:', purposeField.label);
    console.log('Options:', purposeField.optionLabels || purposeField.optionLabel || 'None');
  }

  console.log('\n=== Comparison with Previous Approach ===');
  console.log('Previous (pdf-parse):  191 total options');
  console.log(`Current  (PyMuPDF):    ${data.metadata.totalOptionsExtracted} total options`);

} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
