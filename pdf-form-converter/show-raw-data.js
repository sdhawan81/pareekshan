import pdfParse from 'pdf-parse';
import fs from 'fs/promises';

const pdfBytes = await fs.readFile('examples/701T_V1.pdf');
const data = await pdfParse(pdfBytes);

console.log('=== RAW TEXT EXTRACTED FROM PDF ===\n');
console.log('Total pages:', data.numpages);
console.log('Total characters:', data.text.length);
console.log('\n=== RAW TEXT (First 3000 characters) ===\n');
console.log(data.text.substring(0, 3000));

console.log('\n\n=== RAW TEXT (Characters 3000-6000) ===\n');
console.log(data.text.substring(3000, 6000));

console.log('\n\n=== PARSED INTO LINES ===\n');
const lines = data.text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
console.log(`Total lines after parsing: ${lines.length}\n`);

console.log('=== First 50 lines ===\n');
lines.slice(0, 50).forEach((line, idx) => {
  console.log(`${idx}: "${line}"`);
});

console.log('\n\n=== Lines 50-100 ===\n');
lines.slice(50, 100).forEach((line, idx) => {
  console.log(`${idx + 50}: "${line}"`);
});

// Save full text to file for detailed inspection
await fs.writeFile('output/raw_pdf_text.txt', data.text);
console.log('\n\n=== Full raw text saved to: output/raw_pdf_text.txt ===');

// Save parsed lines to file
const linesText = lines.map((line, idx) => `${idx}: "${line}"`).join('\n');
await fs.writeFile('output/parsed_lines.txt', linesText);
console.log('=== Parsed lines saved to: output/parsed_lines.txt ===');
