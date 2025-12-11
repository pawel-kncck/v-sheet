# Formula Error Types Reference

**Last Updated**: 2025-12-11

This document describes all formula error types in v-sheet and when they occur.

---

## Overview

Formula errors are special values displayed in cells when a formula cannot be evaluated. They inherit from `FormulaError` base class and override `toString()` to return the error code.

**File**: `js/engine/utils/FormulaErrors.js`

---

## Error Hierarchy

```
Error (JavaScript built-in)
  └── FormulaError (base class)
        ├── DivZeroError     (#DIV/0!)
        ├── NotAvailableError (#N/A)
        ├── NameError        (#NAME?)
        ├── NullError        (#NULL!)
        ├── NumError         (#NUM!)
        ├── RefError         (#REF!)
        └── ValueError       (#VALUE!)
```

---

## Base Class: FormulaError

### Structure

```javascript
class FormulaError extends Error {
  constructor(name, message) {
    super(message || name);
    this.name = name;  // The error code (e.g., "#DIV/0!")
  }

  toString() {
    return this.name;  // Displayed in cell
  }
}
```

### Usage

FormulaError is not thrown directly - use specific subclasses instead.

---

## Error: #DIV/0! (DivZeroError)

**Display**: `#DIV/0!`

### When It Occurs

Division by zero or empty cell.

### Examples

```
=1/0         → #DIV/0!
=A1/B1       → #DIV/0! (if B1 is 0 or empty)
=MOD(10, 0)  → #DIV/0!
```

### Code

```javascript
class DivZeroError extends FormulaError {
  constructor(message = 'Division by zero') {
    super('#DIV/0!', message);
  }
}

// Usage in evaluator
if (right === 0) {
  throw new DivZeroError();
}
```

---

## Error: #N/A (NotAvailableError)

**Display**: `#N/A`

### When It Occurs

- VLOOKUP/HLOOKUP value not found
- MATCH value not found
- Missing required argument

### Examples

```
=VLOOKUP("xyz", A1:B10, 2, FALSE)  → #N/A (if "xyz" not in column A)
=MATCH(100, A1:A5, 0)              → #N/A (if 100 not found)
```

### Code

```javascript
class NotAvailableError extends FormulaError {
  constructor(message = 'Value not available') {
    super('#N/A', message);
  }
}

// Usage in VLOOKUP
throw new NotAvailableError(`Value "${searchKey}" not found`);
```

---

## Error: #NAME? (NameError)

**Display**: `#NAME?`

### When It Occurs

- Unknown function name
- Misspelled function
- Invalid named range (not supported yet)

### Examples

```
=SUMM(A1:A10)  → #NAME? (SUMM is not a function)
=UNKNOWN()     → #NAME?
```

### Code

```javascript
class NameError extends FormulaError {
  constructor(message = 'Invalid name') {
    super('#NAME?', message);
  }
}

// Usage in evaluator
if (!this.functions.has(node.name)) {
  throw new NameError(`Unknown function: ${node.name}`);
}
```

---

## Error: #NULL! (NullError)

**Display**: `#NULL!`

### When It Occurs

- Invalid range intersection (currently unused)
- Incorrect range syntax

### Examples

```
=A1:A10 B1:B10  → #NULL! (space is intersection operator)
```

### Code

```javascript
class NullError extends FormulaError {
  constructor(message = 'Null range') {
    super('#NULL!', message);
  }
}
```

**Note**: Range intersection is not yet implemented in v-sheet.

---

## Error: #NUM! (NumError)

**Display**: `#NUM!`

### When It Occurs

- Invalid numeric value in calculation
- Number too large or too small
- Invalid arguments for math functions

### Examples

```
=SQRT(-1)           → #NUM! (negative square root)
=LOG(-10)           → #NUM!
=POWER(10, 1000)    → #NUM! (overflow)
```

### Code

```javascript
class NumError extends FormulaError {
  constructor(message = 'Invalid number') {
    super('#NUM!', message);
  }
}

// Usage
if (value < 0) {
  throw new NumError('Cannot take square root of negative number');
}
```

---

## Error: #REF! (RefError)

**Display**: `#REF!`

### When It Occurs

- Reference to deleted cell/row/column
- Invalid cell reference
- Column index out of range in VLOOKUP

### Examples

```
=VLOOKUP("a", A1:B10, 5, FALSE)  → #REF! (only 2 columns, asked for 5)
=#REF!+1                         → #REF! (reference to deleted cell)
```

### Code

```javascript
class RefError extends FormulaError {
  constructor(message = 'Invalid reference') {
    super('#REF!', message);
  }
}

// Usage in VLOOKUP
if (colIndex > range[0].length) {
  throw new RefError('Column index is out of range');
}
```

---

## Error: #VALUE! (ValueError)

**Display**: `#VALUE!`

### When It Occurs

- Wrong argument type
- Text where number expected
- Invalid operation on data types

### Examples

```
=1+"abc"        → #VALUE! (can't add text to number)
=LEFT(123)      → #VALUE! (LEFT expects text, not number)
=SUM("hello")   → 0 (SUM coerces, but some functions throw)
```

### Code

```javascript
class ValueError extends FormulaError {
  constructor(message = 'Invalid value type') {
    super('#VALUE!', message);
  }
}

// Usage
if (typeof text !== 'string') {
  throw new ValueError('Expected text value');
}
```

---

## Error Handling in Evaluator

### Try-Catch Pattern

```javascript
evaluate(node) {
  try {
    return this._visit(node);
  } catch (error) {
    if (error instanceof FormulaError) {
      return error;  // Return error as cell value
    }
    throw error;  // Re-throw unexpected errors
  }
}
```

### Cell Display

When a formula returns a FormulaError:

```javascript
const result = engine.evaluate(formula);

if (result instanceof FormulaError) {
  cell.textContent = result.toString();  // "#DIV/0!"
  cell.classList.add('error');
} else {
  cell.textContent = result;
}
```

---

## Error Propagation

Errors propagate through calculations:

```
A1 = 1/0                → #DIV/0!
B1 = A1 + 5            → #DIV/0! (inherits error)
C1 = SUM(A1:B1)        → #DIV/0! (inherits error)
D1 = IF(ISERROR(A1), 0, A1)  → 0 (ISERROR catches it)
```

---

## Creating Custom Errors

To add a new error type:

```javascript
class CustomError extends FormulaError {
  constructor(message = 'Custom error occurred') {
    super('#CUSTOM!', message);
  }
}

// Export it
export { CustomError };
```

---

## Error Detection Functions (Future)

Common spreadsheet functions for error handling:

| Function | Description | Status |
|----------|-------------|--------|
| `ISERROR(value)` | Returns TRUE if value is any error | Not implemented |
| `ISNA(value)` | Returns TRUE if value is #N/A | Not implemented |
| `IFERROR(value, fallback)` | Returns fallback if error | Not implemented |

---

## Summary Table

| Error | Display | Primary Cause |
|-------|---------|---------------|
| DivZeroError | `#DIV/0!` | Division by zero |
| NotAvailableError | `#N/A` | Lookup not found |
| NameError | `#NAME?` | Unknown function |
| NullError | `#NULL!` | Invalid range |
| NumError | `#NUM!` | Invalid math operation |
| RefError | `#REF!` | Invalid reference |
| ValueError | `#VALUE!` | Wrong type |

---

## See Also

- Formula engine: `/docs/architecture/02-formula-engine.md`
- Functions reference: `/docs/architecture/formula-engine/functions-reference.md`
- Type coercion: `/docs/architecture/formula-engine/type-coercion-rules.md`
