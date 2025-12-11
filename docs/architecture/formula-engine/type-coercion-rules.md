# Type Coercion Rules

**Last Updated**: 2025-12-12

This document describes how v-sheet's formula engine converts values between types during evaluation.

---

## Overview

Type coercion is essential for spreadsheet compatibility. When operations require specific types (e.g., addition needs numbers), values are automatically converted following consistent rules.

**Primary File**: `js/engine/utils/TypeCoercion.js`

---

## Coercion Functions

### `toNumber(value)`

Converts any value to a number:

| Input Type | Input Value | Output |
|------------|-------------|--------|
| Number | `42` | `42` |
| Boolean | `true` | `1` |
| Boolean | `false` | `0` |
| String | `"123"` | `123` |
| String | `"3.14"` | `3.14` |
| String | `"1e5"` | `100000` |
| String | `"abc"` | `0` |
| String | `""` | `0` |
| Null | `null` | `0` |
| Undefined | `undefined` | `0` |
| Array | `[5, 10]` | `5` (first element) |

### Implementation

```javascript
static toNumber(value) {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  if (typeof value === 'string') {
    const num = parseFloat(value);
    // Only accept if string was purely numeric
    return isFinite(num) &&
      /^-?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i.test(value.trim())
      ? num
      : 0;
  }
  if (Array.isArray(value) && value.length > 0) {
    return this.toNumber(value[0]);  // First element
  }
  return 0;
}
```

---

### `toString(value)`

Converts any value to a string:

| Input Type | Input Value | Output |
|------------|-------------|--------|
| String | `"hello"` | `"hello"` |
| Number | `42` | `"42"` |
| Number | `3.14159` | `"3.14159"` |
| Boolean | `true` | `"TRUE"` |
| Boolean | `false` | `"FALSE"` |
| Null | `null` | `""` |
| Undefined | `undefined` | `""` |

### Implementation

```javascript
static toString(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return String(value);
}
```

---

### `toBoolean(value)`

Converts any value to a boolean:

| Input Type | Input Value | Output |
|------------|-------------|--------|
| Boolean | `true` | `true` |
| Boolean | `false` | `false` |
| Number | `0` | `false` |
| Number | `1` | `true` |
| Number | `-5` | `true` |
| String | `""` | `false` |
| String | `"anything"` | `true` |
| String | `"FALSE"` | `true` (non-empty string!) |
| Null | `null` | `false` |
| Undefined | `undefined` | `false` |

### Implementation

```javascript
static toBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'string') {
    // Important: Any non-empty string is true (even "FALSE")
    return value !== '';
  }
  return true;
}
```

**Note**: Unlike JavaScript's falsy values, spreadsheet boolean coercion considers ANY non-empty string as truthy, including `"FALSE"` and `"0"`.

---

### `compare(a, b)`

Compares two values, handling mixed types:

```javascript
static compare(a, b) {
  const aType = typeof a;
  const bType = typeof b;

  // Mixed types: try numeric comparison
  if (aType !== bType) {
    const aNum = this.toNumber(a);
    const bNum = this.toNumber(b);

    if (aNum !== 0 || bNum !== 0 || (a === 0 && b === 0)) {
      return aNum - bNum;
    }
    // Fall back to string comparison
  }

  // Number comparison
  if (aType === 'number') {
    return a - b;
  }

  // Boolean comparison
  if (aType === 'boolean') {
    return this.toNumber(a) - this.toNumber(b);
  }

  // Default: string comparison (locale-aware)
  return this.toString(a).localeCompare(this.toString(b));
}
```

### Return Value

| Result | Meaning |
|--------|---------|
| `< 0` | `a < b` |
| `0` | `a == b` |
| `> 0` | `a > b` |

---

## Coercion in Operations

### Arithmetic Operations

All arithmetic operators coerce operands to numbers:

```javascript
// In Evaluator._performOperation()

if (op === '+') {
  return this.coerce.toNumber(left) + this.coerce.toNumber(right);
}
if (op === '-') {
  return this.coerce.toNumber(left) - this.coerce.toNumber(right);
}
if (op === '*') {
  return this.coerce.toNumber(left) * this.coerce.toNumber(right);
}
if (op === '/') {
  const rightNum = this.coerce.toNumber(right);
  if (rightNum === 0) {
    throw new DivZeroError('Division by zero');
  }
  return this.coerce.toNumber(left) / rightNum;
}
if (op === '^') {
  return Math.pow(this.coerce.toNumber(left), this.coerce.toNumber(right));
}
```

### Examples

```
=5 + "3"      → 8         (string coerced to number)
=5 + "abc"   → 5         (non-numeric string → 0)
=5 + TRUE    → 6         (true → 1)
=5 + FALSE   → 5         (false → 0)
=5 + ""      → 5         (empty string → 0)
```

---

### Concatenation

The `&` operator coerces to strings:

```javascript
if (op === '&') {
  return this.coerce.toString(left) + this.coerce.toString(right);
}
```

### Examples

```
="Hello" & " World"  → "Hello World"
=5 & 3               → "53"
=TRUE & "!"          → "TRUE!"
="" & 100            → "100"
```

---

### Comparison Operations

Comparisons use `compare()` for mixed-type handling:

```javascript
if (op === '<') {
  return this.coerce.compare(left, right) < 0;
}
if (op === '<=') {
  return this.coerce.compare(left, right) <= 0;
}
if (op === '>') {
  return this.coerce.compare(left, right) > 0;
}
if (op === '>=') {
  return this.coerce.compare(left, right) >= 0;
}
```

### Equality

Equality uses strict comparison (no coercion):

```javascript
if (op === '=') {
  return left === right;
}
if (op === '<>' || op === '!=') {
  return left !== right;
}
```

### Examples

```
=5 = 5           → TRUE
=5 = "5"         → FALSE   (strict equality)
=5 < 10          → TRUE
="A" < "B"       → TRUE    (string comparison)
=TRUE > FALSE    → TRUE    (1 > 0)
```

---

## Unary Operators

```javascript
// In Evaluator._visit()

case 'unary':
  const operand = this._visit(node.operand);
  if (node.op === '-') {
    return -this.coerce.toNumber(operand);
  }
  if (node.op === '+') {
    return this.coerce.toNumber(operand);  // Converts to number
  }
```

### Examples

```
=-5          → -5
=-"10"       → -10    (string coerced to number, then negated)
=-TRUE       → -1     (true → 1, then negated)
=+"abc"      → 0      (non-numeric string → 0)
```

---

## Function Argument Coercion

Most functions coerce arguments as needed:

```javascript
// SUM coerces all values to numbers
function SUM(...args) {
  return args.flat(Infinity).reduce((sum, val) => {
    return sum + TypeCoercion.toNumber(val);
  }, 0);
}
```

### Example

```
=SUM(1, "2", TRUE, FALSE)  → 4  (1 + 2 + 1 + 0)
```

---

## Edge Cases

### Empty Cells

Empty cells evaluate to:
- `0` in numeric context
- `""` in string context
- `false` in boolean context

### Array Coercion

When a range is used where a single value is expected, the first element is used:

```javascript
// A1:A3 contains [10, 20, 30]
=5 + A1:A3  → 15  (5 + 10, first element)
```

### Scientific Notation

Numeric strings with scientific notation are recognized:

```
="1e5" + 0   → 100000
="1E-3" + 0  → 0.001
```

---

## Differences from JavaScript

| Behavior | JavaScript | v-sheet |
|----------|------------|---------|
| `"" + 0` | `"0"` | `0` (numeric context) |
| `"FALSE"` truthiness | `true` | `true` |
| `[] + 0` | `"0"` | `0` |
| `null + 5` | `5` | `5` |

---

## See Also

- Evaluator: `/docs/architecture/02-formula-engine.md`
- Error types: `/docs/architecture/formula-engine/error-types.md`
- Functions reference: `/docs/architecture/formula-engine/functions-reference.md`
