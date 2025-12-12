# Formula Functions Reference

**Last Updated**: 2025-12-11

This document provides a complete reference of all built-in formula functions in v-sheet.

---

## Math Functions

### SUM

Adds all numbers in a range of cells.

**Syntax**: `SUM(value1, [value2], ...)`

**Parameters**:
- `value1` (required): First number or range
- `value2, ...` (optional): Additional numbers or ranges

**Returns**: Number - sum of all values

**Examples**:
```
=SUM(A1:A10)        // Sum of range
=SUM(1, 2, 3)       // Sum of values: 6
=SUM(A1, B1:B5, 10) // Mixed: cell + range + literal
```

**Behavior**:
- Text values are treated as 0
- Empty cells are treated as 0
- Boolean TRUE = 1, FALSE = 0

---

### AVERAGE

Calculates the average of all numbers in a range.

**Syntax**: `AVERAGE(value1, [value2], ...)`

**Parameters**:
- `value1` (required): First number or range
- `value2, ...` (optional): Additional numbers or ranges

**Returns**: Number - average of numeric values

**Examples**:
```
=AVERAGE(A1:A10)    // Average of range
=AVERAGE(1, 2, 3)   // Returns 2
```

**Behavior**:
- Only counts cells containing actual numbers
- Text values are ignored (not counted as 0)
- Empty cells are ignored

---

### MIN

Returns the minimum value from a range.

**Syntax**: `MIN(value1, [value2], ...)`

**Parameters**:
- `value1` (required): First number or range
- `value2, ...` (optional): Additional numbers or ranges

**Returns**: Number - smallest value

**Examples**:
```
=MIN(A1:A10)        // Minimum in range
=MIN(5, 3, 8, 1)    // Returns 1
```

**Behavior**:
- Only considers numeric values
- Text values are ignored
- Returns 0 if no numeric values found

---

### MAX

Returns the maximum value from a range.

**Syntax**: `MAX(value1, [value2], ...)`

**Parameters**:
- `value1` (required): First number or range
- `value2, ...` (optional): Additional numbers or ranges

**Returns**: Number - largest value

**Examples**:
```
=MAX(A1:A10)        // Maximum in range
=MAX(5, 3, 8, 1)    // Returns 8
```

---

### COUNT

Counts the number of cells that contain numbers.

**Syntax**: `COUNT(value1, [value2], ...)`

**Parameters**:
- `value1` (required): First value or range
- `value2, ...` (optional): Additional values or ranges

**Returns**: Number - count of numeric cells

**Examples**:
```
=COUNT(A1:A10)      // Count numeric cells
=COUNT(1, "text", 3) // Returns 2
```

**Behavior**:
- Only counts cells with actual numbers
- Text, empty cells, and errors are not counted

---

### COUNTA

Counts the number of non-empty cells.

**Syntax**: `COUNTA(value1, [value2], ...)`

**Parameters**:
- `value1` (required): First value or range
- `value2, ...` (optional): Additional values or ranges

**Returns**: Number - count of non-empty cells

**Examples**:
```
=COUNTA(A1:A10)     // Count non-empty cells
=COUNTA(1, "text", "") // Returns 2 (empty string not counted)
```

---

### ROUND

Rounds a number to a specified number of decimal places.

**Syntax**: `ROUND(number, num_digits)`

**Parameters**:
- `number` (required): The number to round
- `num_digits` (optional): Decimal places (default 0)

**Returns**: Number - rounded value

**Examples**:
```
=ROUND(3.14159, 2)  // Returns 3.14
=ROUND(1234, -2)    // Returns 1200 (negative rounds left of decimal)
```

**Errors**:
- `#VALUE!` if number cannot be converted to numeric

---

### SUMIF

Sums values that meet a specified criterion.

**Syntax**: `SUMIF(range, criteria, [sum_range])`

**Parameters**:
- `range` (required): Range to evaluate against criteria
- `criteria` (required): Condition (e.g., ">10", "Apple", 5)
- `sum_range` (optional): Range to sum (defaults to `range`)

**Returns**: Number - sum of matching values

**Examples**:
```
=SUMIF(A1:A10, ">10")           // Sum cells > 10
=SUMIF(A1:A10, "Apple", B1:B10) // Sum B where A = "Apple"
=SUMIF(A1:A10, "<>0")           // Sum non-zero cells
```

**Criteria Operators**:
- `>`, `<`, `>=`, `<=` - Numeric comparison
- `=` - Exact match
- `<>` - Not equal

---

### SUMPRODUCT

Multiplies corresponding elements and returns the sum of products.

**Syntax**: `SUMPRODUCT(array1, [array2], ...)`

**Parameters**:
- `array1` (required): First array
- `array2, ...` (optional): Additional arrays (same size)

**Returns**: Number - sum of element-wise products

**Examples**:
```
=SUMPRODUCT(A1:A3, B1:B3)  // (A1*B1) + (A2*B2) + (A3*B3)
```

**Errors**:
- `#VALUE!` if arrays are different sizes

---

## Logical Functions

### IF

Returns one value if condition is true, another if false.

**Syntax**: `IF(logical_test, value_if_true, [value_if_false])`

**Parameters**:
- `logical_test` (required): Condition to evaluate
- `value_if_true` (required): Value if condition is true
- `value_if_false` (optional): Value if false (default: FALSE)

**Returns**: Any - selected value based on condition

**Examples**:
```
=IF(A1>10, "High", "Low")   // Returns "High" or "Low"
=IF(A1=B1, "Match", "Diff") // Compare cells
=IF(A1, "Yes", "No")        // Non-zero = true
```

---

### AND

Returns TRUE if all arguments are true.

**Syntax**: `AND(logical1, [logical2], ...)`

**Parameters**:
- `logical1` (required): First condition
- `logical2, ...` (optional): Additional conditions

**Returns**: Boolean - TRUE if all are true

**Examples**:
```
=AND(A1>0, A1<10)      // TRUE if 0 < A1 < 10
=AND(TRUE, TRUE, FALSE) // Returns FALSE
```

---

### OR

Returns TRUE if any argument is true.

**Syntax**: `OR(logical1, [logical2], ...)`

**Parameters**:
- `logical1` (required): First condition
- `logical2, ...` (optional): Additional conditions

**Returns**: Boolean - TRUE if any is true

**Examples**:
```
=OR(A1>10, B1>10)      // TRUE if either > 10
=OR(FALSE, FALSE, TRUE) // Returns TRUE
```

---

### NOT

Reverses the logical value.

**Syntax**: `NOT(logical)`

**Parameters**:
- `logical` (required): Value to reverse

**Returns**: Boolean - opposite of input

**Examples**:
```
=NOT(TRUE)   // Returns FALSE
=NOT(A1>10)  // TRUE if A1 <= 10
```

---

## Text Functions

### LEN

Returns the length of a string.

**Syntax**: `LEN(text)`

**Parameters**:
- `text` (required): The text to measure

**Returns**: Number - character count

**Examples**:
```
=LEN("Hello")  // Returns 5
=LEN(A1)       // Length of A1's content
```

---

### UPPER

Converts text to uppercase.

**Syntax**: `UPPER(text)`

**Parameters**:
- `text` (required): Text to convert

**Returns**: String - uppercase text

**Examples**:
```
=UPPER("hello")  // Returns "HELLO"
```

---

### LOWER

Converts text to lowercase.

**Syntax**: `LOWER(text)`

**Parameters**:
- `text` (required): Text to convert

**Returns**: String - lowercase text

**Examples**:
```
=LOWER("HELLO")  // Returns "hello"
```

---

### TRIM

Removes leading/trailing spaces and collapses multiple spaces.

**Syntax**: `TRIM(text)`

**Parameters**:
- `text` (required): Text to trim

**Returns**: String - trimmed text

**Examples**:
```
=TRIM("  Hello  World  ")  // Returns "Hello World"
```

---

### CONCATENATE

Joins multiple text strings.

**Syntax**: `CONCATENATE(text1, [text2], ...)`

**Parameters**:
- `text1` (required): First text
- `text2, ...` (optional): Additional text

**Returns**: String - combined text

**Examples**:
```
=CONCATENATE("Hello", " ", "World")  // "Hello World"
=CONCATENATE(A1, "-", B1)            // Combine cells
```

**Note**: The `&` operator is often easier: `=A1 & "-" & B1`

---

### LEFT

Returns leftmost characters.

**Syntax**: `LEFT(text, [num_chars])`

**Parameters**:
- `text` (required): Source text
- `num_chars` (optional): Characters to extract (default 1)

**Returns**: String - extracted characters

**Examples**:
```
=LEFT("Hello", 3)  // Returns "Hel"
=LEFT("Hello")     // Returns "H"
```

---

### RIGHT

Returns rightmost characters.

**Syntax**: `RIGHT(text, [num_chars])`

**Parameters**:
- `text` (required): Source text
- `num_chars` (optional): Characters to extract (default 1)

**Returns**: String - extracted characters

**Examples**:
```
=RIGHT("Hello", 3)  // Returns "llo"
```

---

### MID

Returns characters from the middle of text.

**Syntax**: `MID(text, start_num, num_chars)`

**Parameters**:
- `text` (required): Source text
- `start_num` (required): Starting position (1-based)
- `num_chars` (required): Characters to extract

**Returns**: String - extracted characters

**Examples**:
```
=MID("Hello World", 7, 5)  // Returns "World"
=MID("Hello", 2, 3)        // Returns "ell"
```

---

## Lookup Functions

### VLOOKUP

Searches first column and returns value from specified column.

**Syntax**: `VLOOKUP(search_key, range, index, [is_sorted])`

**Parameters**:
- `search_key` (required): Value to search for
- `range` (required): Table range to search
- `index` (required): Column number to return (1-based)
- `is_sorted` (optional): FALSE for exact match (required in v1)

**Returns**: Any - value from matching row

**Examples**:
```
=VLOOKUP("Apple", A1:C10, 3, FALSE)  // Find "Apple", return col 3
=VLOOKUP(100, A1:B5, 2, FALSE)       // Find 100, return col 2
```

**Errors**:
- `#N/A` if value not found
- `#REF!` if column index out of range
- `#VALUE!` if approximate match requested (not supported)

**Notes**:
- V1 only supports exact match (is_sorted = FALSE)
- String comparison is case-insensitive

---

## Operators

### Arithmetic

| Operator | Description | Example |
|----------|-------------|---------|
| `+` | Addition | `=A1+B1` |
| `-` | Subtraction | `=A1-B1` |
| `*` | Multiplication | `=A1*B1` |
| `/` | Division | `=A1/B1` |
| `^` | Exponentiation | `=A1^2` |

### Comparison

| Operator | Description | Example |
|----------|-------------|---------|
| `=` | Equal | `=A1=B1` |
| `<>` | Not equal | `=A1<>B1` |
| `<` | Less than | `=A1<B1` |
| `>` | Greater than | `=A1>B1` |
| `<=` | Less or equal | `=A1<=B1` |
| `>=` | Greater or equal | `=A1>=B1` |

### Text

| Operator | Description | Example |
|----------|-------------|---------|
| `&` | Concatenation | `=A1&B1` |

---

## Error Types

| Error | Meaning | Common Cause |
|-------|---------|--------------|
| `#DIV/0!` | Division by zero | `=1/0` |
| `#VALUE!` | Wrong argument type | `=LEN(123)` on non-text |
| `#REF!` | Invalid reference | Deleted cell, invalid range |
| `#NAME?` | Unknown function | Misspelled function name |
| `#N/A` | Value not available | VLOOKUP not found |
| `#NUM!` | Invalid number | `=SQRT(-1)` |
| `#NULL!` | Null range intersection | Invalid range syntax |

---

## Adding New Functions

Functions are registered in `js/engine/functions/register.js`:

```javascript
import { mathFunctions } from './math.js';
import { logicalFunctions } from './logical.js';

export function registerFunctions(registry) {
  Object.entries(mathFunctions).forEach(([name, fn]) => {
    registry.register(name, fn);
  });
  // ...
}
```

To add a new function:
1. Create function in appropriate category file
2. Export from that file's functions object
3. No parser changes needed (universal parser)

---

## See Also

- Formula engine: `/docs/architecture/02-formula-engine.md`
- Parser grammar: `/docs/architecture/formula-engine/parser-grammar.md`
- Error types: `/docs/architecture/formula-engine/error-types.md`
- Test scenarios: `/docs/manuals/test-scenarios/formula-building.scenarios.md`
