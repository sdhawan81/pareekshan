# PDF Form to JSON Converter

A Node.js application that extracts AcroForm fields from PDF documents and converts them to JSON format. This tool is perfect for building web forms based on existing PDF forms.

## Features

- **Supports AcroForm PDF fields**: Text fields, checkboxes, radio buttons, dropdowns, and more
- **Comprehensive field extraction**: Captures field names, types, values, properties, and constraints
- **Metadata extraction**: Includes PDF metadata and form statistics
- **JSON output**: Clean, structured JSON format ready for web form generation
- **Sample generator**: Create test PDF forms with various field types
- **Easy-to-use CLI**: Simple command-line interface

## Installation

```bash
cd pdf-form-converter
npm install
```

## Usage

### Quick Start - Demo

Run the demo to see the converter in action:

```bash
npm start
# or
node src/index.js demo
```

This will:
1. Generate a sample PDF form (`examples/sample-form.pdf`)
2. Convert it to JSON (`output/sample-form.json`)
3. Display the extracted fields

### Convert Existing PDF

Convert your own PDF form to JSON:

```bash
node src/index.js convert path/to/your-form.pdf output/form.json
```

Or use the shorter version (auto-generates output filename):

```bash
node src/index.js convert path/to/your-form.pdf
```

### Generate Sample PDF

Create a sample PDF form for testing:

```bash
node src/index.js generate examples/my-form.pdf
```

## JSON Output Format

The converter produces JSON with the following structure:

```json
{
  "metadata": {
    "fileName": "sample-form.pdf",
    "filePath": "./examples/sample-form.pdf",
    "pageCount": 1,
    "fieldCount": 13,
    "extractedAt": "2025-11-21T08:41:19.550Z"
  },
  "fields": [
    {
      "name": "firstName",
      "type": "text",
      "value": "",
      "properties": {
        "readOnly": false,
        "required": false,
        "multiline": false,
        "maxLength": null
      },
      "appearance": {
        "widgetCount": 1
      }
    },
    {
      "name": "country",
      "type": "dropdown",
      "value": ["USA"],
      "properties": {
        "readOnly": false,
        "required": false,
        "options": ["USA", "Canada", "UK", "Australia", "India", "Other"],
        "selected": ["USA"]
      },
      "appearance": {
        "widgetCount": 1
      }
    }
  ]
}
```

## Supported Field Types

| PDF Field Type | JSON Type | Properties Extracted |
|---------------|-----------|---------------------|
| Text Field | `text` | value, multiline, maxLength, readOnly, required |
| Checkbox | `checkbox` | checked, value, readOnly, required |
| Radio Button | `radio` | options, selected, readOnly, required |
| Dropdown | `dropdown` | options, selected, readOnly, required |
| List Box | `select` | options, selected, readOnly, required |
| Signature | `signature` | readOnly, required |
| Button | `button` | readOnly |

## API Usage

You can also use the converter programmatically in your Node.js applications:

```javascript
import { convertPdfFormToJson, generateSamplePdfForm } from './src/index.js';

// Convert PDF to JSON
const jsonData = await convertPdfFormToJson('path/to/form.pdf', 'output.json');

console.log(`Extracted ${jsonData.fields.length} fields`);

// Generate sample PDF
await generateSamplePdfForm('sample-form.pdf');
```

### Options

The `convertPdfFormToJson` function accepts an optional third parameter for options:

```javascript
const options = {
  sortFields: true  // Sort fields alphabetically by name (default: true)
};

const jsonData = await convertPdfFormToJson('form.pdf', 'output.json', options);
```

## Project Structure

```
pdf-form-converter/
├── src/
│   ├── index.js              # Main CLI and API entry point
│   ├── converter.js          # PDF to JSON converter
│   └── samplePdfGenerator.js # Sample PDF form generator
├── examples/                  # Sample PDF files
├── output/                    # JSON output files
├── package.json
└── README.md
```

## Use Cases

1. **Web Form Generation**: Convert existing PDF forms to JSON and use the data to dynamically generate HTML forms
2. **Form Analysis**: Analyze PDF form structures and field types
3. **Data Migration**: Extract form field definitions for database schema creation
4. **Form Validation**: Use extracted field properties for validation rules
5. **Documentation**: Generate documentation of form fields from PDFs

## Building a Web Form from JSON

Here's a simple example of how to use the JSON output to create an HTML form:

```javascript
// Load the JSON
const formData = JSON.parse(fs.readFileSync('output/form.json'));

// Generate HTML
formData.fields.forEach(field => {
  switch(field.type) {
    case 'text':
      console.log(`<input type="text" name="${field.name}"
        ${field.properties.required ? 'required' : ''}
        ${field.properties.maxLength ? `maxlength="${field.properties.maxLength}"` : ''}
      />`);
      break;

    case 'checkbox':
      console.log(`<input type="checkbox" name="${field.name}"
        ${field.value ? 'checked' : ''}
      />`);
      break;

    case 'dropdown':
      console.log(`<select name="${field.name}">`);
      field.properties.options.forEach(option => {
        const selected = field.properties.selected.includes(option);
        console.log(`  <option ${selected ? 'selected' : ''}>${option}</option>`);
      });
      console.log('</select>');
      break;
  }
});
```

## Technologies Used

- **Node.js**: Runtime environment
- **pdf-lib**: PDF parsing and manipulation library with excellent AcroForm support

## Limitations

- Only supports AcroForm PDF fields (not XFA forms)
- Complex nested field structures may require additional processing
- Some advanced PDF features may not be fully captured

## Troubleshooting

### "Cannot find module" error
Make sure you've installed dependencies:
```bash
npm install
```

### "Failed to load PDF" error
- Ensure the PDF file path is correct
- Verify the PDF contains AcroForm fields (not just static forms)
- Check that the PDF is not corrupted or password-protected

### Missing field properties
Some PDF forms may not include all field properties. The converter handles this gracefully and provides default values where necessary.

## Contributing

Feel free to submit issues or pull requests to improve the converter!

## License

MIT
