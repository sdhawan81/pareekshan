import fs from 'fs/promises';

const data = JSON.parse(await fs.readFile('output/701T_V1_comprehensive.json', 'utf8'));

// Check the 'purpose of assessment' field
const purposeField = data.fields.find(f =>
  f.label && f.label.includes('purpose of this assessment')
);

console.log('=== "Purpose of Assessment" Field ===\n');
if (purposeField) {
  console.log('Field type:', purposeField.type);
  console.log('Label:', purposeField.label);
  console.log('Has optionLabels:', purposeField.optionLabels ? 'YES' : 'NO');
  if (purposeField.optionLabels) {
    console.log('Options:', JSON.stringify(purposeField.optionLabels, null, 2));
  }
} else {
  console.log('Field not found!');
}

console.log('\n=== Summary ===\n');
console.log('Total fields:', data.metadata.fieldCount);
console.log('Fields with labels:', data.metadata.fieldsWithLabels);
console.log('Fields with options:', data.metadata.fieldsWithOptionLabels);
console.log('Total options extracted:', data.metadata.totalOptionsExtracted);

console.log('\n=== Fields by Type with Options ===\n');
const byType = new Map();
data.fields.filter(f => f.optionLabels || f.optionLabel).forEach(f => {
  if (!byType.has(f.type)) byType.set(f.type, 0);
  byType.set(f.type, byType.get(f.type) + 1);
});

byType.forEach((count, type) => {
  console.log(`${type}: ${count} fields`);
});

console.log('\n=== Sample Text Fields with Options (first 10) ===\n');
const textWithOptions = data.fields.filter(f => f.type === 'text' && f.optionLabels);
textWithOptions.slice(0, 10).forEach((field, idx) => {
  console.log(`${idx + 1}. ${field.label}`);
  console.log(`   Options: [${field.optionLabels.slice(0, 5).join(', ')}${field.optionLabels.length > 5 ? ', ...' : ''}]`);
  console.log('');
});

console.log('\n=== All Radio Fields with Options ===\n');
const radioWithOptions = data.fields.filter(f => f.type === 'radio' && f.optionLabels);
console.log(`Total: ${radioWithOptions.length}\n`);
radioWithOptions.forEach((field, idx) => {
  console.log(`${idx + 1}. ${field.label}`);
  console.log(`   Options: [${field.optionLabels.join(', ')}]`);
  console.log('');
});
