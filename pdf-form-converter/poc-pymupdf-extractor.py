#!/usr/bin/env python3
"""
Proof-of-Concept: PDF extraction using PyMuPDF and pdfplumber
Demonstrates improved text and table extraction compared to pdf-parse
"""

import json
import sys
import fitz  # PyMuPDF
from pathlib import Path

# Try to import pdfplumber, but make it optional
try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False
    print("Note: pdfplumber not available, skipping table extraction")


def extract_with_pymupdf(pdf_path):
    """Extract text with coordinates using PyMuPDF"""
    doc = fitz.open(pdf_path)

    extraction = {
        "method": "PyMuPDF",
        "pages": [],
        "total_text_blocks": 0
    }

    for page_num in range(len(doc)):
        page = doc[page_num]

        # Extract text blocks with coordinates
        blocks = page.get_text("dict")["blocks"]

        page_data = {
            "page_number": page_num + 1,
            "width": page.rect.width,
            "height": page.rect.height,
            "text_blocks": []
        }

        for block in blocks:
            if block["type"] == 0:  # Text block
                for line in block.get("lines", []):
                    line_text = ""
                    for span in line.get("spans", []):
                        line_text += span["text"]

                    if line_text.strip():
                        page_data["text_blocks"].append({
                            "text": line_text.strip(),
                            "bbox": block["bbox"],  # [x0, y0, x1, y1]
                            "font_size": line["spans"][0]["size"] if line["spans"] else 0
                        })
                        extraction["total_text_blocks"] += 1

        extraction["pages"].append(page_data)

    doc.close()
    return extraction


def extract_with_pdfplumber(pdf_path):
    """Extract text and tables using pdfplumber"""
    extraction = {
        "method": "pdfplumber",
        "pages": [],
        "total_tables": 0,
        "total_text_lines": 0
    }

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            page_data = {
                "page_number": page_num + 1,
                "width": page.width,
                "height": page.height,
                "text_lines": [],
                "tables": []
            }

            # Extract text with layout preservation
            text = page.extract_text()
            if text:
                lines = [line.strip() for line in text.split('\n') if line.strip()]
                page_data["text_lines"] = lines
                extraction["total_text_lines"] += len(lines)

            # Extract tables
            tables = page.extract_tables()
            for table_idx, table in enumerate(tables):
                if table:
                    # Convert table to structured format
                    table_data = {
                        "table_number": table_idx + 1,
                        "rows": len(table),
                        "columns": len(table[0]) if table else 0,
                        "data": table
                    }
                    page_data["tables"].append(table_data)
                    extraction["total_tables"] += 1

            extraction["pages"].append(page_data)

    return extraction


def extract_text_with_words(pdf_path):
    """Extract individual words with their coordinates using PyMuPDF"""
    doc = fitz.open(pdf_path)

    extraction = {
        "method": "PyMuPDF-Words",
        "pages": [],
        "total_words": 0
    }

    for page_num in range(len(doc)):
        page = doc[page_num]

        # Extract words with coordinates
        words = page.get_text("words")  # Returns list of (x0, y0, x1, y1, "word", block_no, line_no, word_no)

        page_data = {
            "page_number": page_num + 1,
            "words": []
        }

        for word in words:
            if len(word) >= 5:
                page_data["words"].append({
                    "text": word[4],
                    "bbox": [word[0], word[1], word[2], word[3]],
                    "x0": word[0],
                    "y0": word[1],
                    "x1": word[2],
                    "y1": word[3]
                })
                extraction["total_words"] += 1

        extraction["pages"].append(page_data)

    doc.close()
    return extraction


def find_text_near_coordinates(words_data, target_x, target_y, max_distance=50):
    """Find text near specific coordinates"""
    nearby_words = []

    for page in words_data["pages"]:
        for word in page["words"]:
            # Calculate distance from target coordinates
            word_center_x = (word["x0"] + word["x1"]) / 2
            word_center_y = (word["y0"] + word["y1"]) / 2

            distance = ((word_center_x - target_x) ** 2 + (word_center_y - target_y) ** 2) ** 0.5

            if distance <= max_distance:
                nearby_words.append({
                    "text": word["text"],
                    "distance": distance,
                    "bbox": word["bbox"]
                })

    # Sort by distance
    nearby_words.sort(key=lambda x: x["distance"])
    return nearby_words


def main():
    if len(sys.argv) < 2:
        print("Usage: python poc-pymupdf-extractor.py <pdf_path>")
        sys.exit(1)

    pdf_path = sys.argv[1]

    if not Path(pdf_path).exists():
        print(f"Error: PDF file not found: {pdf_path}")
        sys.exit(1)

    print(f"Extracting from: {pdf_path}\n")

    # Extract with PyMuPDF
    print("=" * 60)
    print("METHOD 1: PyMuPDF (text blocks with coordinates)")
    print("=" * 60)
    pymupdf_data = extract_with_pymupdf(pdf_path)
    print(f"Total pages: {len(pymupdf_data['pages'])}")
    print(f"Total text blocks: {pymupdf_data['total_text_blocks']}")

    # Show sample from first page
    if pymupdf_data['pages']:
        first_page = pymupdf_data['pages'][0]
        print(f"\nFirst 10 text blocks from page 1:")
        for i, block in enumerate(first_page['text_blocks'][:10]):
            print(f"  {i+1}. [{block['bbox'][0]:.1f}, {block['bbox'][1]:.1f}] {block['text'][:60]}")

    # Extract with pdfplumber (if available)
    if HAS_PDFPLUMBER:
        print("\n" + "=" * 60)
        print("METHOD 2: pdfplumber (text + tables)")
        print("=" * 60)
        pdfplumber_data = extract_with_pdfplumber(pdf_path)
        print(f"Total pages: {len(pdfplumber_data['pages'])}")
        print(f"Total text lines: {pdfplumber_data['total_text_lines']}")
        print(f"Total tables found: {pdfplumber_data['total_tables']}")

        # Show tables
        if pdfplumber_data['total_tables'] > 0:
            print(f"\nTables found:")
            for page_idx, page in enumerate(pdfplumber_data['pages']):
                if page['tables']:
                    print(f"  Page {page['page_number']}: {len(page['tables'])} table(s)")
                    for table_idx, table in enumerate(page['tables']):
                        print(f"    Table {table_idx + 1}: {table['rows']}x{table['columns']}")
                        # Show first few rows
                        print("    First 3 rows:")
                        for row in table['data'][:3]:
                            print(f"      {row}")
    else:
        pdfplumber_data = None
        print("\n" + "=" * 60)
        print("METHOD 2: pdfplumber (SKIPPED - not available)")
        print("=" * 60)

    # Extract words with coordinates
    print("\n" + "=" * 60)
    print("METHOD 3: PyMuPDF Words (individual words with coordinates)")
    print("=" * 60)
    words_data = extract_text_with_words(pdf_path)
    print(f"Total pages: {len(words_data['pages'])}")
    print(f"Total words: {words_data['total_words']}")

    # Show sample words
    if words_data['pages']:
        first_page = words_data['pages'][0]
        print(f"\nFirst 20 words from page 1:")
        for i, word in enumerate(first_page['words'][:20]):
            print(f"  {i+1}. [{word['x0']:.1f}, {word['y0']:.1f}] '{word['text']}'")

    # Save outputs
    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)

    with open(output_dir / "pymupdf_extraction.json", "w") as f:
        json.dump(pymupdf_data, f, indent=2)
    print(f"\n✓ Saved PyMuPDF extraction to: output/pymupdf_extraction.json")

    if pdfplumber_data:
        with open(output_dir / "pdfplumber_extraction.json", "w") as f:
            json.dump(pdfplumber_data, f, indent=2)
        print(f"✓ Saved pdfplumber extraction to: output/pdfplumber_extraction.json")

    with open(output_dir / "words_extraction.json", "w") as f:
        json.dump(words_data, f, indent=2)
    print(f"✓ Saved words extraction to: output/words_extraction.json")

    print("\n" + "=" * 60)
    print("COMPARISON WITH CURRENT APPROACH (pdf-parse)")
    print("=" * 60)
    print("Advantages of new approach:")
    print("  ✓ Text with bounding box coordinates (precise positioning)")
    print("  ✓ Table structure extraction (solves ADL/IADL issue)")
    print("  ✓ Word-level extraction (better option matching)")
    print("  ✓ Layout-aware text grouping")
    print("  ✓ Can find text near form field coordinates")
    print("  ✓ Faster and lighter than Docling")


if __name__ == "__main__":
    main()
