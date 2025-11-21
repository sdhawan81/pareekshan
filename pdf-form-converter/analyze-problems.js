import pdfParse from 'pdf-parse';
import fs from 'fs/promises';

const pdfBytes = await fs.readFile('examples/701T_V1.pdf');
const data = await pdfParse(pdfBytes);
const lines = data.text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

console.log('=== ANALYSIS OF EXTRACTION PROBLEMS ===\n');

console.log('PROBLEM 1: Options on same line with multiple spaces\n');
console.log('Line 8: ' + lines[8]);
console.log('Split by 2+ spaces:', lines[8].split(/\s{2,}/).map(s => `"${s.trim()}"`));
console.log('');

console.log('\nPROBLEM 2: Options spanning multiple lines\n');
console.log('Line 17-19 (Race):');
console.log('  Line 17:', lines[17]);
console.log('  Line 18:', lines[18]);
console.log('  Line 19:', lines[19]);
console.log('');

console.log('\nPROBLEM 3: Mixed question and option formats\n');
for (let i = 0; i < 30; i++) {
  if (lines[i].match(/^\d+\./)) {
    console.log(`Line ${i}: ${lines[i]}`);
    if (i + 1 < lines.length) {
      console.log(`Line ${i + 1}: ${lines[i + 1]}`);
    }
    console.log('');
  }
}

console.log('\n\nPROBLEM 4: Sub-questions (a., b., c.)\n');
for (let i = 10; i < 40; i++) {
  if (lines[i].match(/^[a-z]\./)) {
    console.log(`Line ${i}: ${lines[i]}`);
  }
}

console.log('\n\nPROBLEM 5: Table-like structures (ADL section)\n');
const adlStart = lines.findIndex(l => l.includes('How much assistance do you need'));
if (adlStart >= 0) {
  for (let i = adlStart; i < Math.min(adlStart + 20, lines.length); i++) {
    console.log(`Line ${i}: ${lines[i]}`);
  }
}

console.log('\n\n=== SPECIFIC FIELD ANALYSIS ===\n');

// Analyze "Purpose of assessment"
const purposeIdx = lines.findIndex(l => l.includes('purpose of this assessment'));
console.log('1. "Purpose of assessment" field:');
console.log(`   Found at line ${purposeIdx}: ${lines[purposeIdx]}`);
console.log(`   Next line ${purposeIdx + 1}: ${lines[purposeIdx + 1]}`);
console.log(`   Options extracted: ${lines[purposeIdx + 1].split(/\s{2,}/).map(s => `"${s.trim()}"`).join(', ')}`);
console.log('');

// Analyze "Sex"
const sexIdx = lines.findIndex(l => l === '7. Sex:');
console.log('2. "Sex" field:');
console.log(`   Found at line ${sexIdx}: ${lines[sexIdx]}`);
console.log(`   Next line ${sexIdx + 1}: ${lines[sexIdx + 1]}`);
console.log(`   Options extracted: ${lines[sexIdx + 1].split(/\s{2,}/).map(s => `"${s.trim()}"`).join(', ')}`);
console.log('');

// Analyze "Race"
const raceIdx = lines.findIndex(l => l.includes('Race (Mark all that apply)'));
console.log('3. "Race" field:');
console.log(`   Found at line ${raceIdx}: ${lines[raceIdx]}`);
console.log(`   Line ${raceIdx + 1}: ${lines[raceIdx + 1]}`);
console.log(`   Line ${raceIdx + 2}: ${lines[raceIdx + 2]}`);
console.log('   OPTIONS SPAN MULTIPLE LINES!');
console.log('');

console.log('\n=== KEY FINDINGS ===\n');
console.log('1. Options are separated by multiple spaces (2+) ✓ Current code handles this');
console.log('2. Options can span multiple lines ✗ Current code only checks 5 lines but stops at next question');
console.log('3. Some fields have sub-questions (a., b., c.) ✓ Current code filters these');
console.log('4. Table structures are complex ✗ Current code may not handle well');
console.log('5. Some options contain special characters and formatting ⚠ Partially handled');
