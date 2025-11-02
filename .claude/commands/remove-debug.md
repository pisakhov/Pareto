# Remove Debug Commands

Scan the repository and remove debug statements while preserving functional code.

## Usage

```
remove-debug
```

## What it does

Removes common debug statements from both backend and frontend code:

**Python (Backend):**
- `print()` calls
- `pprint()` calls
- Debug logging (logger.debug, logging.debug)
- `breakpoint()` calls
- Commented-out debug code (`# DEBUG:`, `# print`, `# breakpoint`)

**JavaScript (Frontend):**
- `console.log()` calls
- `console.debug()` calls
- `console.error()` used for debugging
- `console.table()` calls
- `alert()` and `debugger` statements
- Commented-out debug code (`// DEBUG:`, `// print`, `// console.log`)

**What it keeps:**
- Functional error handling (try/catch)
- Production logging (logger.error, logger.warning, logger.info)
- User-facing console operations
- Commented code with business logic context

## Implementation

Uses precise pattern matching to avoid removing functional code. Only targets explicit debug patterns in known contexts.
