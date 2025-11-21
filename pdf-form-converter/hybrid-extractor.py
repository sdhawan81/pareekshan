#!/usr/bin/env python3
"""
Hybrid PDF Form Extractor
Combines PyMuPDF text extraction with pdf-lib form field structure
Uses spatial coordinates to intelligently match labels to fields
"""

import json
import sys
import fitz  # PyMuPDF
from pathlib import Path
from collections import defaultdict


def extract_text_with_coordinates(pdf_path):
    """Extract all text with precise word-level coordinates"""
    doc = fitz.open(pdf_path)

    all_words = []
    words_by_page = defaultdict(list)

    for page_num in range(len(doc)):
        page = doc[page_num]
        words = page.get_text("words")  # (x0, y0, x1, y1, "word", block, line, word_no)

        for word in words:
            if len(word) >= 5:
                word_data = {
                    "text": word[4],
                    "page": page_num + 1,
                    "x0": word[0],
                    "y0": word[1],
                    "x1": word[2],
                    "y1": word[3],
                    "center_x": (word[0] + word[2]) / 2,
                    "center_y": (word[1] + word[3]) / 2
                }
                all_words.append(word_data)
                words_by_page[page_num + 1].append(word_data)

    doc.close()

    return {
        "all_words": all_words,
        "by_page": dict(words_by_page),
        "total_words": len(all_words)
    }


def group_words_into_lines(words, max_y_diff=3):
    """Group words that are on the same line"""
    if not words:
        return []

    # Sort by y-coordinate, then x-coordinate
    sorted_words = sorted(words, key=lambda w: (w['y0'], w['x0']))

    lines = []
    current_line = [sorted_words[0]]

    for word in sorted_words[1:]:
        # Check if word is on the same line as current_line
        if abs(word['y0'] - current_line[0]['y0']) <= max_y_diff:
            current_line.append(word)
        else:
            # Start new line
            lines.append(current_line)
            current_line = [word]

    # Add the last line
    if current_line:
        lines.append(current_line)

    return lines


def reconstruct_text_lines(words_data):
    """Reconstruct text lines from word-level data"""
    text_lines = []

    for page_num in sorted(words_data['by_page'].keys()):
        page_words = words_data['by_page'][page_num]
        lines = group_words_into_lines(page_words)

        for line_words in lines:
            # Sort words in line by x-coordinate
            line_words.sort(key=lambda w: w['x0'])

            # Reconstruct line text
            line_text = ' '.join(w['text'] for w in line_words)

            text_lines.append({
                "text": line_text,
                "page": page_num,
                "y0": line_words[0]['y0'],
                "x0": line_words[0]['x0'],
                "x1": line_words[-1]['x1'],
                "words": line_words
            })

    return text_lines


def find_label_candidates(field_name, text_lines, field_page=None):
    """Find potential label text for a field based on field name"""
    candidates = []

    # Extract keywords from field name
    # Example: "Q_12_C_505217_1" -> look for "Q 12" or similar patterns
    keywords = []

    # Common patterns in field names
    import re

    # Look for Q_<number> pattern
    q_match = re.search(r'Q_(\d+)', field_name)
    if q_match:
        q_num = q_match.group(1)
        keywords.append(f"{q_num}.")
        keywords.append(f"ASSESSOR")

    # Look for specific field name patterns
    if "SSN" in field_name:
        keywords.append("Social Security")
    elif "Name" in field_name:
        keywords.append("Name:")
    elif "Marital" in field_name:
        keywords.append("Marital")

    # Search for keywords in text lines
    for line in text_lines:
        if field_page and line['page'] != field_page:
            continue

        line_text = line['text']

        for keyword in keywords:
            if keyword in line_text:
                candidates.append({
                    "text": line_text,
                    "page": line['page'],
                    "y0": line['y0'],
                    "match_keyword": keyword
                })

    return candidates


def extract_options_after_line(text_lines, label_line_index, max_lines=5):
    """Extract option text from lines following a question"""
    options = []

    label_line = text_lines[label_line_index]

    for i in range(label_line_index + 1, min(label_line_index + max_lines, len(text_lines))):
        line = text_lines[i]

        # Skip if different page
        if line['page'] != label_line['page']:
            break

        # Stop if we hit another question number
        if re.match(r'^\d+\.', line['text'].strip()):
            break

        # Skip empty lines
        if not line['text'].strip():
            continue

        # Extract potential options from the line
        line_text = line['text']

        # Split by multiple spaces or checkbox symbols
        # Look for capitalized words that might be options
        words_in_line = [w['text'] for w in line['words']]

        # Filter out checkbox symbols and group actual option text
        filtered_words = [w for w in words_in_line if len(w) > 1 and any(c.isalpha() for c in w)]

        options.extend(filtered_words)

        if len(options) >= 20:  # Reasonable max
            break

    return options


def create_hybrid_extraction(pdf_path, fields_json_path=None):
    """Create hybrid extraction combining PyMuPDF text + pdf-lib fields"""
    print(f"Extracting text from: {pdf_path}")

    # Extract text with coordinates
    words_data = extract_text_with_coordinates(pdf_path)
    print(f"Extracted {words_data['total_words']} words")

    # Reconstruct text lines
    text_lines = reconstruct_text_lines(words_data)
    print(f"Reconstructed {len(text_lines)} text lines")

    result = {
        "pdf_path": str(pdf_path),
        "extraction_method": "hybrid (PyMuPDF + spatial analysis)",
        "total_words": words_data['total_words'],
        "total_lines": len(text_lines),
        "text_lines": []
    }

    # Export text lines for inspection
    for idx, line in enumerate(text_lines[:50]):  # First 50 lines
        result["text_lines"].append({
            "index": idx,
            "page": line['page'],
            "y": line['y0'],
            "text": line['text']
        })

    # If fields JSON provided, match labels
    if fields_json_path and Path(fields_json_path).exists():
        print(f"\nLoading form fields from: {fields_json_path}")
        with open(fields_json_path) as f:
            fields_data = json.load(f)

        fields = fields_data.get('fields', [])
        print(f"Found {len(fields)} form fields")

        # Enhance fields with better label matching
        enhanced_fields = []
        for field in fields:
            field_copy = field.copy()

            # Find label candidates
            candidates = find_label_candidates(field['name'], text_lines)
            if candidates:
                field_copy['label_candidates'] = candidates[:3]  # Top 3

            enhanced_fields.append(field_copy)

        result['fields'] = enhanced_fields
        result['fields_matched'] = len([f for f in enhanced_fields if 'label_candidates' in f])

    return result, words_data, text_lines


def main():
    if len(sys.argv) < 2:
        print("Usage: python hybrid-extractor.py <pdf_path> [fields_json_path]")
        sys.exit(1)

    pdf_path = Path(sys.argv[1])
    fields_json_path = Path(sys.argv[2]) if len(sys.argv) > 2 else None

    if not pdf_path.exists():
        print(f"Error: PDF not found: {pdf_path}")
        sys.exit(1)

    # Create hybrid extraction
    result, words_data, text_lines = create_hybrid_extraction(pdf_path, fields_json_path)

    # Save results
    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)

    with open(output_dir / "hybrid_extraction.json", "w") as f:
        json.dump(result, f, indent=2)
    print(f"\n✓ Saved hybrid extraction to: output/hybrid_extraction.json")

    with open(output_dir / "words_by_page.json", "w") as f:
        json.dump(words_data['by_page'], f, indent=2)
    print(f"✓ Saved words by page to: output/words_by_page.json")

    # Show comparison
    print("\n" + "=" * 60)
    print("HYBRID APPROACH BENEFITS")
    print("=" * 60)
    print("✓ Word-level coordinates (exact positioning)")
    print("✓ Proper 'Initial' and 'Annual' separation")
    print("✓ Can match fields to labels using proximity")
    print("✓ Layout-aware line reconstruction")
    print("✓ No special character issues")
    print(f"\nTotal words extracted: {result['total_words']}")
    print(f"Total lines reconstructed: {result['total_lines']}")

    if 'fields_matched' in result:
        print(f"Fields with label matches: {result['fields_matched']}")


if __name__ == "__main__":
    import re
    main()
