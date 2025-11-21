import { convertPdfFormToJson } from './converter.js';
import { generateSamplePdfForm } from './samplePdfGenerator.js';

/**
 * PDF Form to JSON Converter - Main API
 */

export {
  convertPdfFormToJson,
  generateSamplePdfForm
};

// CLI Interface
async function main() {
  const command = process.argv[2];

  if (!command) {
    console.log('PDF Form to JSON Converter\n');
    console.log('Usage:');
    console.log('  node src/index.js convert <pdf-path> [output-json-path]');
    console.log('  node src/index.js generate [output-pdf-path]');
    console.log('  node src/index.js demo\n');
    console.log('Commands:');
    console.log('  convert  - Convert a PDF form to JSON');
    console.log('  generate - Generate a sample PDF form');
    console.log('  demo     - Generate sample PDF and convert it to JSON\n');
    console.log('Examples:');
    console.log('  node src/index.js convert examples/form.pdf output/form.json');
    console.log('  node src/index.js generate examples/sample-form.pdf');
    console.log('  node src/index.js demo');
    process.exit(0);
  }

  try {
    switch (command) {
      case 'convert': {
        const pdfPath = process.argv[3];
        if (!pdfPath) {
          console.error('Error: PDF path is required');
          console.log('Usage: node src/index.js convert <pdf-path> [output-json-path]');
          process.exit(1);
        }
        const outputPath = process.argv[4] || pdfPath.replace('.pdf', '.json');
        await convertPdfFormToJson(pdfPath, outputPath);
        break;
      }

      case 'generate': {
        const outputPath = process.argv[3] || './examples/sample-form.pdf';
        await generateSamplePdfForm(outputPath);
        console.log('\nSample PDF form generated successfully!');
        break;
      }

      case 'demo': {
        console.log('Running demo: Generating sample PDF and converting to JSON\n');

        // Generate sample PDF
        const pdfPath = './examples/sample-form.pdf';
        console.log('Step 1: Generating sample PDF form...');
        await generateSamplePdfForm(pdfPath);

        // Convert to JSON
        console.log('\nStep 2: Converting PDF to JSON...');
        const jsonPath = './output/sample-form.json';
        const result = await convertPdfFormToJson(pdfPath, jsonPath);

        console.log('\n=== Demo Complete ===');
        console.log(`PDF Form: ${pdfPath}`);
        console.log(`JSON Output: ${jsonPath}`);
        console.log(`\nExtracted ${result.fields.length} form fields:`);
        result.fields.forEach(field => {
          console.log(`  - ${field.name} (${field.type})`);
        });
        console.log('\nCheck the output directory for the generated files!');
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        console.log('Use "node src/index.js" for help');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
