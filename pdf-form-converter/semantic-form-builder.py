#!/usr/bin/env python3
"""
Semantic Form Structure Builder
Converts PDF form extraction into hierarchical structure for HTML form generation
Organizes into: Sections → Questions → Input Fields
"""

import json
import sys
import re
from pathlib import Path
from collections import defaultdict


def detect_sections(text_lines):
    """Detect major sections in the form (e.g., 'A. DEMOGRAPHIC SECTION' or 'DEMOGRAPHIC SECTION A.')"""
    sections = []

    # Common section patterns
    section_patterns = [
        (r'^([A-Z])\.\s+([A-Z\s]+SECTION[A-Z\s]*)$', 'prefix'),  # A. SECTION NAME
        (r'^([A-Z\s]+SECTION[A-Z\s]*)\s+([A-Z])\.?$', 'suffix'),  # SECTION NAME A.
        (r'^([A-Z]\s+)?([A-Z\s]+SECTION[A-Z\s]*)$', 'plain'),     # SECTION NAME or B SECTION NAME
        (r'^([A-Z\s]{15,})$', 'allcaps'),                          # ALL CAPS (very long)
        (r'^SECTION\s+\d+:?\s+(.+)$', 'numbered')                  # SECTION 1: Name
    ]

    for line in text_lines:
        text = line['text'].strip()

        for pattern, pattern_type in section_patterns:
            match = re.match(pattern, text)
            if match:
                # Normalize the title based on pattern type
                if pattern_type == 'prefix':
                    # "A. DEMOGRAPHIC SECTION" -> "A. DEMOGRAPHIC SECTION"
                    normalized = text
                elif pattern_type == 'suffix':
                    # "DEMOGRAPHIC SECTION A." -> "A. DEMOGRAPHIC SECTION"
                    section_text = match.group(1).strip()
                    letter = match.group(2)
                    normalized = f"{letter}. {section_text}"
                    text = normalized  # Update display text too
                elif pattern_type == 'plain':
                    # "B MEMORY SECTION" -> "B. MEMORY SECTION"
                    if match.group(1):
                        letter = match.group(1).strip()
                        section_text = match.group(2).strip()
                        normalized = f"{letter}. {section_text}"
                        text = normalized
                    else:
                        normalized = match.group(2).strip()
                else:
                    normalized = text

                # Remove letter prefix for clean title
                clean_title = re.sub(r'^[A-Z]\.\s+', '', normalized).strip()

                sections.append({
                    'title': clean_title,
                    'display_title': text,
                    'page': line['page'],
                    'y_position': line['y0'],
                    'normalized_title': clean_title
                })
                break

    return sections


def detect_questions(text_lines):
    """Detect numbered questions (e.g., '1. Question text', '12. Question')"""
    questions = []

    # Question number patterns (allows leading whitespace and special chars)
    # Also handles questions that appear mid-line (after other text)
    question_pattern_start = r'^[\s\uf0a0-\uf0ff]*(\d+)\.\s+(.+)$'  # At start of line
    question_pattern_mid = r'^.+\s+(\d+)\.\s+(.+)$'  # Mid-line (after other text)

    for line in text_lines:
        text = line['text']

        # First try matching at start of line
        match = re.match(question_pattern_start, text)

        # If no match, try mid-line pattern (for cases like "No Yes 11. Question...")
        if not match and re.search(r'\d+\.\s+[A-Z]', text):  # Contains "##. Capital"
            match = re.search(r'(\d+)\.\s+(.+)$', text)  # Extract from number onward

        if match:
            q_num = match.group(1)
            q_text = match.group(2)

            questions.append({
                'number': int(q_num),
                'text': q_text,
                'full_text': text,
                'page': line['page'],
                'y_position': line['y0'],
                'x_position': line['x0']
            })

    return questions


def assign_questions_to_sections(sections, questions):
    """Assign questions to their parent sections based on position"""
    if not sections:
        # If no sections detected, create a default section
        return [{
            'title': 'Form',
            'page': 1,
            'y_position': 0,
            'questions': questions
        }]

    sections_with_questions = []

    for i, section in enumerate(sections):
        section_copy = section.copy()
        section_copy['questions'] = []

        # Determine the range for this section
        section_start_y = section['y_position']
        section_page = section['page']

        # End of section is start of next section or end of page
        if i < len(sections) - 1:
            next_section = sections[i + 1]
            section_end_y = next_section['y_position']
            section_end_page = next_section['page']
        else:
            section_end_y = float('inf')
            section_end_page = float('inf')

        # Assign questions in this range
        for question in questions:
            q_page = question['page']
            q_y = question['y_position']

            # Check if question is in this section's range
            if q_page == section_page and q_y > section_start_y:
                if q_page < section_end_page or (q_page == section_end_page and q_y < section_end_y):
                    section_copy['questions'].append(question)
            elif q_page > section_page and (q_page < section_end_page or section_end_page == float('inf')):
                section_copy['questions'].append(question)

        sections_with_questions.append(section_copy)

    return sections_with_questions


def group_fields_by_question(fields, questions):
    """Match form fields to questions based on labels"""
    question_field_map = defaultdict(list)
    unmatched_fields = []

    for field in fields:
        label = field.get('label', '')
        if not label:
            unmatched_fields.append(field)
            continue

        # Try to match to a question
        matched = False
        for question in questions:
            # Check if question text is in field label
            if question['text'] in label or question['full_text'] in label:
                question_field_map[question['number']].append(field)
                matched = True
                break

        if not matched:
            unmatched_fields.append(field)

    return question_field_map, unmatched_fields


def detect_field_group_type(fields):
    """Determine if fields form a checkbox group, radio group, or text field"""
    if not fields:
        return None

    if len(fields) == 1:
        field = fields[0]
        field_type = field.get('type', '').lower()

        if 'radio' in field_type:
            return {
                'type': 'radio',
                'options': field.get('optionLabels', [])
            }
        elif 'checkbox' in field_type:
            # Single checkbox
            return {
                'type': 'checkbox',
                'option': field.get('optionLabel', field.get('label', ''))
            }
        elif 'text' in field_type or 'tx' in field_type:
            return {
                'type': 'text',
                'multiline': field.get('properties', {}).get('multiline', False)
            }
        else:
            return {'type': field_type}

    else:
        # Multiple fields - likely checkbox group
        field_types = [f.get('type', '').lower() for f in fields]

        if all('checkbox' in ft for ft in field_types):
            options = []
            for field in fields:
                option = field.get('optionLabel', field.get('label', ''))
                if option:
                    options.append(option)

            return {
                'type': 'checkbox-group',
                'options': options
            }
        else:
            # Mixed types or multiple text fields
            return {
                'type': 'field-group',
                'fields': [{'type': f.get('type', ''), 'name': f.get('name', '')} for f in fields]
            }


def detect_tables_in_text(text_lines):
    """Detect table structures in text"""
    tables = []

    # Look for common table indicators
    table_keywords = ['Task', 'No assistance needed', 'ADL', 'IADL']

    i = 0
    while i < len(text_lines):
        line = text_lines[i]
        text = line['text']

        # Check if this looks like a table header
        if any(keyword in text for keyword in table_keywords):
            # Potential table start
            table_lines = [line]
            table_y_start = line['y0']
            table_page = line['page']

            # Collect following lines that are close together
            j = i + 1
            while j < len(text_lines):
                next_line = text_lines[j]

                # Stop if different page or too far down
                if next_line['page'] != table_page or next_line['y0'] - table_y_start > 200:
                    break

                # Stop if we hit a question number
                if re.match(r'^\d+\.\s', next_line['text']):
                    break

                table_lines.append(next_line)
                j += 1

            if len(table_lines) > 3:  # Minimum for a table
                tables.append({
                    'start_line': i,
                    'end_line': j,
                    'page': table_page,
                    'lines': table_lines,
                    'text': '\n'.join(l['text'] for l in table_lines)
                })

            i = j
        else:
            i += 1

    return tables


def build_semantic_structure(extraction_data):
    """Build semantic form structure from extraction data"""

    # Load text lines (try full lines first, fallback to sample)
    text_lines = []
    if 'text_lines' in extraction_data:
        text_lines = extraction_data['text_lines']
    elif 'text_lines_sample' in extraction_data:
        text_lines = extraction_data['text_lines_sample']

    # Normalize format (handle both 'y' and 'y0', 'x' and 'x0')
    for line in text_lines:
        if 'y' in line and 'y0' not in line:
            line['y0'] = line['y']
        if 'x' in line and 'x0' not in line:
            line['x0'] = line.get('x', 0)
        if 'x0' not in line:
            line['x0'] = 0

    print(f"Building semantic structure from {len(text_lines)} text lines...")

    # Step 1: Detect sections
    print("\n[1/5] Detecting sections...")
    sections = detect_sections(text_lines)
    print(f"  ✓ Found {len(sections)} sections")

    # Step 2: Detect questions
    print("\n[2/5] Detecting questions...")
    questions = detect_questions(text_lines)
    print(f"  ✓ Found {len(questions)} questions")

    # Step 3: Assign questions to sections
    print("\n[3/5] Assigning questions to sections...")
    sections_with_questions = assign_questions_to_sections(sections, questions)

    # Step 4: Match fields to questions
    print("\n[4/5] Matching fields to questions...")
    fields = extraction_data.get('fields', [])
    question_field_map, unmatched = group_fields_by_question(fields, questions)
    print(f"  ✓ Matched {len(fields) - len(unmatched)} fields to questions")
    print(f"  ✓ {len(unmatched)} unmatched fields")

    # Step 5: Build final structure
    print("\n[5/5] Building final structure...")

    form_structure = {
        'title': extraction_data.get('metadata', {}).get('pdf_path', 'Form'),
        'sections': []
    }

    for section in sections_with_questions:
        section_data = {
            'title': section['normalized_title'],
            'page': section['page'],
            'questions': []
        }

        for question in section.get('questions', []):
            q_num = question['number']
            q_fields = question_field_map.get(q_num, [])

            # Detect field type
            field_info = detect_field_group_type(q_fields)

            question_data = {
                'id': f"q{q_num}",
                'number': q_num,
                'text': question['text'],
                'page': question['page'],
                'input': field_info if field_info else {'type': 'unknown'},
                'field_count': len(q_fields)
            }

            section_data['questions'].append(question_data)

        form_structure['sections'].append(section_data)

    # Add metadata
    form_structure['metadata'] = {
        'total_sections': len(sections_with_questions),
        'total_questions': sum(len(s.get('questions', [])) for s in sections_with_questions),
        'total_fields': len(fields),
        'extraction_method': extraction_data.get('metadata', {}).get('extraction_method', 'unknown')
    }

    return form_structure


def generate_html_example(form_structure):
    """Generate example HTML from form structure"""
    html = ['<!DOCTYPE html>', '<html>', '<head>',
            '  <meta charset="UTF-8">',
            '  <title>PDF Form</title>',
            '  <style>',
            '    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }',
            '    .section { margin: 30px 0; padding: 20px; border: 1px solid #ddd; }',
            '    .section-title { font-size: 1.5em; font-weight: bold; margin-bottom: 20px; color: #333; }',
            '    .question { margin: 15px 0; }',
            '    .question-text { font-weight: bold; margin-bottom: 8px; }',
            '    .input-group { margin-left: 20px; }',
            '    .checkbox-group label, .radio-group label { display: block; margin: 5px 0; }',
            '    input[type="text"], textarea { width: 100%; padding: 8px; box-sizing: border-box; }',
            '    textarea { min-height: 80px; }',
            '  </style>',
            '</head>', '<body>']

    html.append(f'  <h1>{form_structure.get("title", "Form")}</h1>')

    for section in form_structure.get('sections', []):
        html.append(f'  <div class="section">')
        html.append(f'    <div class="section-title">{section["title"]}</div>')

        for question in section.get('questions', []):
            html.append(f'    <div class="question">')
            html.append(f'      <div class="question-text">{question["number"]}. {question["text"]}</div>')
            html.append(f'      <div class="input-group">')

            input_type = question['input']['type']

            if input_type == 'text':
                multiline = question['input'].get('multiline', False)
                if multiline:
                    html.append(f'        <textarea id="{question["id"]}" name="{question["id"]}"></textarea>')
                else:
                    html.append(f'        <input type="text" id="{question["id"]}" name="{question["id"]}">')

            elif input_type == 'checkbox-group':
                html.append(f'        <div class="checkbox-group">')
                for option in question['input'].get('options', []):
                    option_id = f"{question['id']}_{option.replace(' ', '_')}"
                    html.append(f'          <label><input type="checkbox" id="{option_id}" name="{question["id"]}" value="{option}"> {option}</label>')
                html.append(f'        </div>')

            elif input_type == 'radio':
                html.append(f'        <div class="radio-group">')
                for option in question['input'].get('options', []):
                    option_id = f"{question['id']}_{option.replace(' ', '_')}"
                    html.append(f'          <label><input type="radio" id="{option_id}" name="{question["id"]}" value="{option}"> {option}</label>')
                html.append(f'        </div>')

            elif input_type == 'checkbox':
                option = question['input'].get('option', '')
                html.append(f'        <label><input type="checkbox" id="{question["id"]}" name="{question["id"]}"> {option}</label>')

            else:
                html.append(f'        <div class="unknown-type">Input type: {input_type}</div>')

            html.append(f'      </div>')
            html.append(f'    </div>')

        html.append(f'  </div>')

    html.append('</body>')
    html.append('</html>')

    return '\n'.join(html)


def main():
    if len(sys.argv) < 2:
        print("Usage: python semantic-form-builder.py <extraction_json_path>")
        print("\nExample:")
        print("  python semantic-form-builder.py output/best_accuracy_extraction.json")
        sys.exit(1)

    extraction_file = Path(sys.argv[1])

    if not extraction_file.exists():
        print(f"Error: Extraction file not found: {extraction_file}")
        sys.exit(1)

    # Load extraction data
    print(f"Loading extraction data from: {extraction_file}")
    with open(extraction_file) as f:
        extraction_data = json.load(f)

    # Build semantic structure
    form_structure = build_semantic_structure(extraction_data)

    # Save structure
    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)

    structure_file = output_dir / "semantic_form_structure.json"
    with open(structure_file, "w") as f:
        json.dump(form_structure, f, indent=2)

    print(f"\n✓ Saved semantic structure to: {structure_file}")

    # Generate HTML example
    html_content = generate_html_example(form_structure)
    html_file = output_dir / "example_form.html"
    with open(html_file, "w") as f:
        f.write(html_content)

    print(f"✓ Generated HTML example: {html_file}")

    # Show summary
    print("\n" + "=" * 70)
    print("SEMANTIC STRUCTURE SUMMARY")
    print("=" * 70)
    print(f"Sections: {form_structure['metadata']['total_sections']}")
    print(f"Questions: {form_structure['metadata']['total_questions']}")
    print(f"Fields: {form_structure['metadata']['total_fields']}")

    # Show structure preview
    print("\n" + "=" * 70)
    print("STRUCTURE PREVIEW")
    print("=" * 70)

    for section in form_structure['sections'][:2]:  # Show first 2 sections
        print(f"\n{section['title']}")
        print("-" * 70)
        for question in section['questions'][:5]:  # Show first 5 questions
            print(f"  {question['number']}. {question['text'][:60]}...")
            print(f"     Input: {question['input']['type']}")
            if question['input']['type'] == 'checkbox-group':
                options = question['input'].get('options', [])
                print(f"     Options: {', '.join(options[:3])}{'...' if len(options) > 3 else ''}")

    print("\n" + "=" * 70)
    print("You can now use 'semantic_form_structure.json' to build your HTML form!")
    print("Open 'example_form.html' in a browser to see a working example.")
    print("=" * 70)


if __name__ == "__main__":
    main()
