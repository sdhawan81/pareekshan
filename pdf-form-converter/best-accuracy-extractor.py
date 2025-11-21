#!/usr/bin/env python3
"""
Best Accuracy PDF Form Extractor
Combines PyMuPDF text extraction with intelligent spatial matching
Uses coordinates to achieve maximum accuracy in field-to-label matching
"""

import json
import sys
import fitz  # PyMuPDF
from pathlib import Path
from collections import defaultdict
import re


def extract_text_with_layout(pdf_path):
    """Extract text with full layout information"""
    doc = fitz.open(pdf_path)

    layout_data = {
        "pages": [],
        "all_words": [],
        "all_lines": [],
        "all_blocks": []
    }

    for page_num in range(len(doc)):
        page = doc[page_num]
        page_height = page.rect.height
        page_width = page.rect.width

        # Get words with coordinates
        words = page.get_text("words")

        page_words = []
        for word in words:
            if len(word) >= 5 and word[4].strip():
                word_data = {
                    "text": word[4],
                    "page": page_num + 1,
                    "x0": round(word[0], 2),
                    "y0": round(word[1], 2),
                    "x1": round(word[2], 2),
                    "y1": round(word[3], 2),
                }
                page_words.append(word_data)
                layout_data["all_words"].append(word_data)

        # Get text blocks (higher level grouping)
        blocks = page.get_text("dict")["blocks"]

        page_blocks = []
        for block in blocks:
            if block["type"] == 0:  # Text block
                block_text = ""
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        block_text += span["text"] + " "

                if block_text.strip():
                    block_data = {
                        "text": block_text.strip(),
                        "page": page_num + 1,
                        "bbox": [round(x, 2) for x in block["bbox"]]
                    }
                    page_blocks.append(block_data)
                    layout_data["all_blocks"].append(block_data)

        layout_data["pages"].append({
            "page_number": page_num + 1,
            "width": page_width,
            "height": page_height,
            "words": page_words,
            "blocks": page_blocks
        })

    doc.close()

    # Group words into lines
    layout_data["all_lines"] = group_words_into_lines(layout_data["all_words"])

    return layout_data


def group_words_into_lines(words, max_y_diff=3):
    """Group words into lines based on vertical position"""
    if not words:
        return []

    # Sort by page, y-coordinate, then x-coordinate
    sorted_words = sorted(words, key=lambda w: (w["page"], w["y0"], w["x0"]))

    lines = []
    current_line = {
        "words": [sorted_words[0]],
        "page": sorted_words[0]["page"],
        "y0": sorted_words[0]["y0"],
        "x0": sorted_words[0]["x0"],
        "x1": sorted_words[0]["x1"]
    }

    for word in sorted_words[1:]:
        # Check if word is on same page and same line
        if (word["page"] == current_line["page"] and
            abs(word["y0"] - current_line["y0"]) <= max_y_diff):
            current_line["words"].append(word)
            current_line["x1"] = max(current_line["x1"], word["x1"])
        else:
            # Finalize current line
            current_line["text"] = " ".join(w["text"] for w in current_line["words"])
            current_line["y1"] = current_line["words"][0]["y1"]
            lines.append(current_line)

            # Start new line
            current_line = {
                "words": [word],
                "page": word["page"],
                "y0": word["y0"],
                "x0": word["x0"],
                "x1": word["x1"]
            }

    # Add last line
    if current_line["words"]:
        current_line["text"] = " ".join(w["text"] for w in current_line["words"])
        current_line["y1"] = current_line["words"][0]["y1"]
        lines.append(current_line)

    return lines


def find_field_widgets(pdf_path):
    """Extract form field positions using PyMuPDF (reads AcroForm data)"""
    doc = fitz.open(pdf_path)

    fields_with_positions = []

    for page_num in range(len(doc)):
        page = doc[page_num]

        # Get form fields (widgets) on this page
        widgets = page.widgets()

        for widget in widgets:
            if widget.field_name:
                field_data = {
                    "name": widget.field_name,
                    "page": page_num + 1,
                    "rect": [round(x, 2) for x in list(widget.rect)],  # [x0, y0, x1, y1]
                    "type": widget.field_type_string,
                    "value": widget.field_value if hasattr(widget, 'field_value') else None
                }
                fields_with_positions.append(field_data)

    doc.close()
    return fields_with_positions


def find_text_near_position(lines, page, x, y, search_radius=100, search_direction="left-up"):
    """Find text near a specific position on a page"""
    candidates = []

    for line in lines:
        if line["page"] != page:
            continue

        # Calculate distance from field position to line
        line_center_x = (line["x0"] + line["x1"]) / 2
        line_center_y = (line["y0"] + line["y1"]) / 2

        distance = ((line_center_x - x) ** 2 + (line_center_y - y) ** 2) ** 0.5

        if distance <= search_radius:
            # Prefer text that is to the left or above the field
            direction_score = 0
            if search_direction == "left-up":
                if line_center_x < x:  # Left of field
                    direction_score += 2
                if line_center_y < y:  # Above field
                    direction_score += 3

            candidates.append({
                "text": line["text"],
                "distance": distance,
                "direction_score": direction_score,
                "y0": line["y0"],
                "x0": line["x0"]
            })

    # Sort by direction preference, then distance
    candidates.sort(key=lambda c: (-c["direction_score"], c["distance"]))

    return candidates


def extract_options_after_line(lines, label_line, max_distance=50):
    """Extract options from lines following a question label"""
    options = []

    # Find the label line index
    label_idx = -1
    for i, line in enumerate(lines):
        if (line["page"] == label_line["page"] and
            abs(line["y0"] - label_line["y0"]) < 2):
            label_idx = i
            break

    if label_idx < 0:
        return options

    # Look at next few lines
    for i in range(label_idx + 1, min(label_idx + 10, len(lines))):
        line = lines[i]

        # Stop if different page
        if line["page"] != label_line["page"]:
            break

        # Stop if too far down
        if line["y0"] - label_line["y0"] > max_distance:
            break

        # Stop if we hit another numbered question
        if re.match(r'^\d+\.\s', line["text"]):
            break

        # Skip empty lines
        if not line["text"].strip():
            continue

        # Extract words from this line that look like options
        for word in line["words"]:
            text = word["text"].strip()

            # Filter out noise
            if len(text) < 2:
                continue
            if not re.search(r'[a-zA-Z]', text):
                continue
            if re.match(r'^[a-z]\.$', text):  # Sub-question markers
                continue

            # Add unique options
            if text not in options:
                options.append(text)

        if len(options) >= 20:
            break

    return options


def match_fields_to_labels(fields_with_positions, layout_data):
    """Match form fields to their labels using spatial proximity"""
    lines = layout_data["all_lines"]

    enhanced_fields = []

    for field in fields_with_positions:
        # Get field position (center of rectangle)
        rect = field["rect"]
        field_x = (rect[0] + rect[2]) / 2
        field_y = (rect[1] + rect[3]) / 2

        # Find nearby text
        candidates = find_text_near_position(
            lines,
            field["page"],
            field_x,
            field_y,
            search_radius=200
        )

        # Enhanced field data
        enhanced_field = field.copy()

        if candidates:
            # Best match is the first candidate (already sorted)
            best_match = candidates[0]
            enhanced_field["label"] = best_match["text"]
            enhanced_field["label_confidence"] = "high" if best_match["direction_score"] >= 3 else "medium"

            # Find the line object for option extraction
            label_line = next(
                (line for line in lines
                 if line["page"] == field["page"] and abs(line["y0"] - best_match["y0"]) < 2),
                None
            )

            if label_line:
                # Extract options following this label
                options = extract_options_after_line(lines, label_line)
                if options:
                    enhanced_field["options"] = options
        else:
            enhanced_field["label"] = None
            enhanced_field["label_confidence"] = "none"

        enhanced_fields.append(enhanced_field)

    return enhanced_fields


def group_related_fields(fields):
    """Group related fields by base name (e.g., Q_12_C_505217_1, Q_12_C_505217_2)"""
    groups = defaultdict(list)

    for field in fields:
        # Extract base name (remove trailing _number)
        name = field["name"]
        base_name = re.sub(r'_\d+$', '', name)
        groups[base_name].append(field)

    return list(groups.values())


def assign_options_to_groups(field_groups):
    """Assign options to grouped fields (checkbox/radio groups)"""
    for group in field_groups:
        if len(group) == 0:
            continue

        # Check if any field in group has options
        options = None
        for field in group:
            if "options" in field and field["options"]:
                options = field["options"]
                break

        if not options:
            continue

        # Assign options to fields
        if len(group) == 1:
            # Single field (radio group) - all options belong to it
            group[0]["optionLabels"] = options
        else:
            # Multiple fields (checkbox group) - one option per field
            for i, field in enumerate(group):
                if i < len(options):
                    field["optionLabel"] = options[i]


def create_best_accuracy_extraction(pdf_path):
    """Create the most accurate extraction possible"""
    print(f"Best Accuracy Extraction from: {pdf_path}")
    print("=" * 70)

    # Step 1: Extract text layout with PyMuPDF
    print("\n[1/5] Extracting text layout with PyMuPDF...")
    layout_data = extract_text_with_layout(pdf_path)
    print(f"  ✓ {len(layout_data['all_words'])} words extracted")
    print(f"  ✓ {len(layout_data['all_lines'])} lines reconstructed")
    print(f"  ✓ {len(layout_data['all_blocks'])} text blocks identified")

    # Step 2: Extract form fields with positions
    print("\n[2/5] Extracting form fields with positions...")
    fields_with_positions = find_field_widgets(pdf_path)
    print(f"  ✓ {len(fields_with_positions)} form fields found")

    # Step 3: Match fields to labels using spatial proximity
    print("\n[3/5] Matching fields to labels using spatial proximity...")
    enhanced_fields = match_fields_to_labels(fields_with_positions, layout_data)

    fields_with_labels = sum(1 for f in enhanced_fields if f.get("label"))
    fields_with_options = sum(1 for f in enhanced_fields if f.get("options"))

    print(f"  ✓ {fields_with_labels} fields matched to labels ({fields_with_labels/len(enhanced_fields)*100:.1f}%)")
    print(f"  ✓ {fields_with_options} fields have options extracted")

    # Step 4: Group related fields and assign options
    print("\n[4/5] Grouping related fields and assigning options...")
    field_groups = group_related_fields(enhanced_fields)
    assign_options_to_groups(field_groups)

    # Recount after group assignment
    total_options = 0
    for field in enhanced_fields:
        if "optionLabel" in field:
            total_options += 1
        if "optionLabels" in field:
            total_options += len(field["optionLabels"])

    print(f"  ✓ {len(field_groups)} field groups identified")
    print(f"  ✓ {total_options} total options extracted")

    # Step 5: Create final output
    print("\n[5/5] Creating final output...")

    result = {
        "metadata": {
            "pdf_path": str(pdf_path),
            "extraction_method": "Best Accuracy (PyMuPDF spatial matching)",
            "total_pages": len(layout_data["pages"]),
            "total_fields": len(enhanced_fields),
            "fields_with_labels": fields_with_labels,
            "label_match_rate": f"{fields_with_labels/len(enhanced_fields)*100:.1f}%",
            "total_options_extracted": total_options,
            "extraction_date": Path(pdf_path).stat().st_mtime
        },
        "fields": enhanced_fields,
        "text_lines_sample": [
            {"index": i, "page": line["page"], "y": line["y0"], "text": line["text"]}
            for i, line in enumerate(layout_data["all_lines"][:30])
        ]
    }

    return result, layout_data


def main():
    if len(sys.argv) < 2:
        print("Usage: python best-accuracy-extractor.py <pdf_path>")
        sys.exit(1)

    pdf_path = Path(sys.argv[1])

    if not pdf_path.exists():
        print(f"Error: PDF not found: {pdf_path}")
        sys.exit(1)

    # Run extraction
    result, layout_data = create_best_accuracy_extraction(pdf_path)

    # Save output
    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)

    output_file = output_dir / "best_accuracy_extraction.json"
    with open(output_file, "w") as f:
        json.dump(result, f, indent=2)

    print(f"\n✓ Saved to: {output_file}")

    # Show summary
    print("\n" + "=" * 70)
    print("EXTRACTION SUMMARY")
    print("=" * 70)
    print(f"Total fields:           {result['metadata']['total_fields']}")
    print(f"Fields with labels:     {result['metadata']['fields_with_labels']} ({result['metadata']['label_match_rate']})")
    print(f"Total options:          {result['metadata']['total_options_extracted']}")

    # Show a sample field
    sample_field = next((f for f in result["fields"] if f.get("label") and f.get("options")), None)
    if sample_field:
        print(f"\nSample Field:")
        print(f"  Name: {sample_field['name']}")
        print(f"  Label: {sample_field['label']}")
        if "options" in sample_field:
            print(f"  Options: {sample_field['options'][:5]}{'...' if len(sample_field['options']) > 5 else ''}")
        if "optionLabels" in sample_field:
            print(f"  Option Labels: {sample_field['optionLabels'][:5]}{'...' if len(sample_field['optionLabels']) > 5 else ''}")

    print("\n" + "=" * 70)
    print("This is the BEST ACCURACY approach:")
    print("  ✓ PyMuPDF for clean text with coordinates")
    print("  ✓ Spatial matching for field-to-label mapping")
    print("  ✓ Context-aware option extraction")
    print("  ✓ Coordinate-based proximity analysis")
    print("=" * 70)


if __name__ == "__main__":
    main()
