import fs from 'fs/promises';

const data = JSON.parse(await fs.readFile('output/701T_V1.json', 'utf8'));

// Count field types
const typeCounts = {};
data.fields.forEach(field => {
  typeCounts[field.type] = (typeCounts[field.type] || 0) + 1;
});

console.log('=== PDF Form Analysis ===\n');
console.log('Metadata:');
console.log('  File:', data.metadata.fileName);
console.log('  Pages:', data.metadata.pageCount);
console.log('  Total Fields:', data.metadata.fieldCount);
console.log('  Extracted:', data.metadata.extractedAt);

console.log('\nField Type Breakdown:');
Object.entries(typeCounts).sort((a,b) => b[1] - a[1]).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});

console.log('\n=== Sample Fields (First 15) ===\n');
data.fields.slice(0, 15).forEach((field, idx) => {
  console.log(`${idx + 1}. ${field.name}`);
  console.log(`   Type: ${field.type}`);
  if (field.properties.options) {
    console.log(`   Options: [${field.properties.options.join(', ')}]`);
  }
  if (field.value !== undefined && field.value !== null && field.value !== '' && field.value !== false) {
    console.log(`   Value: ${JSON.stringify(field.value)}`);
  }
  console.log('');
});

// Show some fields from middle and end
console.log('\n=== Sample Fields from Page 5 (Fields ~240-245) ===\n');
data.fields.slice(240, 245).forEach((field, idx) => {
  console.log(`${idx + 241}. ${field.name} (${field.type})`);
  if (field.properties.options) {
    console.log(`   Options: [${field.properties.options.join(', ')}]`);
  }
});

console.log('\n=== Last 5 Fields ===\n');
const lastFields = data.fields.slice(-5);
lastFields.forEach((field, idx) => {
  console.log(`${data.fields.length - 5 + idx + 1}. ${field.name} (${field.type})`);
});
