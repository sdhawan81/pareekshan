import fs from 'fs/promises';

const data = JSON.parse(await fs.readFile('output/701T_V1_fixed.json', 'utf8'));

const labelCounts = new Map();
data.fields.forEach(field => {
  const label = field.label || 'NO_LABEL';
  labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
});

console.log('=== Fixed Matching Results ===\n');
console.log('Match Rate:', data.metadata.labelMatchRate);
console.log('Unique labels:', labelCounts.size);
console.log('Fields with labels:', data.metadata.fieldsWithLabels);
console.log('Fields without labels:', data.metadata.fieldsWithoutLabels);

console.log('\n=== All Matched Labels ===\n');
const sortedLabels = Array.from(labelCounts.entries())
  .sort((a, b) => b[1] - a[1]);

sortedLabels.forEach(([label, count]) => {
  if (label !== 'NO_LABEL') {
    console.log(`${count}x: ${label.substring(0, 100)}${label.length > 100 ? '...' : ''}`);
  }
});

const noLabelCount = sortedLabels.find(([l]) => l === 'NO_LABEL')?.[1] || 0;
console.log(`\n${noLabelCount}x: [NO LABEL]`);

console.log('\n=== Sample Fields WITH Labels (First 15) ===\n');
data.fields.filter(f => f.label).slice(0, 15).forEach((field, idx) => {
  console.log(`${idx + 1}. ${field.name}`);
  console.log(`   Type: ${field.type}`);
  console.log(`   Label: ${field.label}`);
  console.log('');
});
