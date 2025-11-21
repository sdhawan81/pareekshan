import { convertPdfFormToJson } from './src/converter.js';

const data = await convertPdfFormToJson('examples/701T_V1.pdf', null, { includeFullText: false });

// Check radio fields with labels
const radioWithLabels = data.fields.filter(f => f.type === 'radio' && f.label);

console.log(`=== Radio Fields WITH Labels: ${radioWithLabels.length} ===\n`);

radioWithLabels.slice(0, 10).forEach((field, idx) => {
  console.log(`${idx + 1}. ${field.name}`);
  console.log(`   Label: ${field.label}`);
  console.log(`   Has optionLabels: ${field.optionLabels ? 'YES' : 'NO'}`);
  if (field.optionLabels) {
    console.log(`   Options: [${field.optionLabels.join(', ')}]`);
  }
  console.log('');
});
