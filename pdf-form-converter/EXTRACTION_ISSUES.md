# PDF Text Extraction Issues

## Raw Data Files Generated

1. **output/raw_pdf_text.txt** - Complete raw text extracted from PDF (14,639 chars)
2. **output/parsed_lines.txt** - Text split into 447 lines
3. **output/raw_extraction_log.txt** - Full extraction log

## Key Problems Identified

### Problem 1: "Initial Annual" Extracted as ONE Option ❌
```
Line 8: " Initial  Annual       Health      Living situation..."
Currently extracts: [" Initial  Annual", " Health", ...]
Should extract: ["Initial", "Annual", "Health", ...]
```
**Issue**: Some options like "Initial" and "Annual" are close together with only 2 spaces, so they're grouped as one.

### Problem 2: Options Spanning Multiple Lines ⚠️
```
Line 17: "8. Race (Mark all that apply):"
Line 18: " White   Black/African American  Asian"
Line 19: " American Indian/Alaska Native    Native Hawaiian/Pacific Islander    Other"
```
**Issue**: Current code processes multiple lines but may miss some options.

### Problem 3: Table Structures Completely Broken ❌
```
Line 94: "35. How much assistance do you need with the following tasks?"
Line 95: "Task"
Line 96: "No"
Line 97: "assistance"
Line 98: "needed"
...
```
**Issue**: PDF tables are extracted with each word on separate line! This breaks the extraction logic completely.

### Problem 4: Leading/Trailing Spaces
```
Line 8: " Initial  Annual..." (starts with space)
Line 16: " Male     Female" (starts with space)
```
**Issue**: Options have leading spaces that need to be trimmed.

### Problem 5: Sub-questions Mixed with Options
```
Line 10: "3. Name: a. First:"
Line 11: "b. Middle initial:  c. Last:"
```
**Issue**: Sub-questions (a., b., c.) appear in same text block as options.

## Current Code Behavior

The `extractOptionsFromText()` function:
- ✅ Splits by 2+ spaces: `split(/\s{2,}/)`
- ✅ Filters sub-questions: `/^[a-z]\.\s+/i`
- ✅ Checks 5 lines after question
- ✅ Stops at next question number
- ❌ Can't handle table structures
- ⚠️ May group closely-spaced options together

## Specific Field Examples

### Working Well:
- **Sex**: `["Male", "Female"]` ✓
- **Marital Status**: `["Married", "Partnered", "Single", "Separated", "Divorced", "Widowed"]` ✓
- **Yes/No questions**: Most working ✓

### Problematic:
- **Purpose of Assessment**: Gets `["Initial  Annual", "Health", ...]` instead of separate options
- **Race**: May miss options on second line
- **ADL Tables**: Completely broken - table structure not recognized
- **Therapy sections**: Similar table issues

## Recommendations

1. **Split on ALL whitespace (1+ spaces)** for simple cases, not just 2+
2. **Detect table structures** and handle differently
3. **Better multi-line continuation** - continue until next question OR empty line
4. **Trim all extracted options** more aggressively
5. **Consider using PDF positioning data** instead of just text extraction
