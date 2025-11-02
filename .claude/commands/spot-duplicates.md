# Spot Duplicates

Scan the repository to identify duplicate code patterns and generate a concise report.

## Usage

```
spot-duplicates
```

## What it does

Analyzes the codebase to find:

1. **Duplicate Functions**: Functions with identical or nearly identical logic
2. **Duplicate Code Blocks**: Repeated code segments (5+ lines)
3. **Similar Logic**: Functions with same structure but different variable names
4. **Repeated Patterns**: Common boilerplate or template code

## Report Format

Generates a markdown report with:

- **Location**: File path and line numbers
- **Code Snippet**: The duplicated code
- **Occurrences**: Where else it appears
- **Suggestion**: Refactoring recommendation

## What it scans

- Python files (*.py)
- JavaScript files (*.js)
- HTML files (*.html)
- CSS files (*.css)

## Notes

- Read-only analysis - no modifications made
- Ignores imports and comments
- Flags similarity threshold: 80%+ match
- Reports exact duplicates and near-duplicates separately
