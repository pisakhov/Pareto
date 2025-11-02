# Spot Duplicates

Scan the repository file-by-file to identify duplicate code patterns with visual indicators.

## Usage

```
spot-duplicates
```

## What it does

Performs file-by-file analysis to find:

1. **Duplicate Functions**: Functions with identical or similar logic within the same file
2. **Duplicate Classes**: Similar class structures
3. **Duplicate Code Blocks**: Repeated code segments (5+ lines) within files
4. **Repeated Patterns**: Common boilerplate code

## Report Format

Scans each file individually and displays:

- **File Path**: Location of the file
- **Status Icon**:
  - ✅ **Clean** - No duplicates found in this file
  - ⚠️ **Issues Found** - Duplicates detected with reason
- **Details**: Specific duplicates found with line numbers
- **Suggestion**: Refactoring recommendation to remove unnecessary code

## What it scans

- Python files (*.py)
- JavaScript files (*.js)
- TypeScript files (*.ts)
- HTML files (*.html)
- CSS files (*.css)

## Indicators

- ✅ **V (Clean)**: File has no duplicate code
- ❌ **X (Duplicates)**: File contains duplicate code with reasons:
  - Same function defined multiple times
  - Repeated code blocks (5+ lines)
  - Similar class methods
  - Identical code patterns

## Notes

- No bash commands used - pure code analysis
- Compares code within each file, not across files
- Ignores imports, comments, and whitespace
- Focus: identifying unnecessary code for cleanup
