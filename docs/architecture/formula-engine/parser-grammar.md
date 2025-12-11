# Parser Grammar Specification

**Last Updated**: 2025-12-11

This document describes the formal grammar of v-sheet's formula parser.

---

## Overview

The parser uses **recursive descent** with operator precedence to convert a stream of tokens into an Abstract Syntax Tree (AST).

**Files**:
- Tokenizer: `js/engine/parser/Tokenizer.js`
- Parser: `js/engine/parser/Parser.js`

---

## Lexical Grammar (Tokenizer)

### Token Types

| Token Type | Pattern | Examples |
|------------|---------|----------|
| `NUMBER` | `[0-9]+(\.[0-9]+)?` | `42`, `3.14`, `0.5` |
| `STRING` | `"..."` or `'...'` | `"hello"`, `'world'` |
| `BOOLEAN` | `TRUE` or `FALSE` | `TRUE`, `FALSE` |
| `CELL_REF` | `\$?[A-Z]+\$?[0-9]+` | `A1`, `$B$2`, `AA100` |
| `IDENTIFIER` | `[A-Z_][A-Z0-9_]*` | `SUM`, `IF`, `VLOOKUP` |
| `OPERATOR` | `+`, `-`, `*`, `/`, `^`, `&`, `=`, `<>`, `<`, `>`, `<=`, `>=` | |
| `LEFT_PAREN` | `(` | |
| `RIGHT_PAREN` | `)` | |
| `COMMA` | `,` | |
| `COLON` | `:` | |

### Tokenization Rules

1. **Whitespace**: Ignored (not tokenized)
2. **Numbers**: Greedy match of digits and decimal point
3. **Strings**: Delimited by matching quotes, supports `\` escapes
4. **Cell References**: Must match pattern exactly (validated by regex)
5. **Identifiers**: Uppercase letters, digits, underscores; must start with letter/underscore
6. **Operators**: Multi-character operators (`<=`, `>=`, `<>`) matched first

### Example Tokenization

```
Input: "=SUM(A1:B2, 5) * 2"

Tokens:
[
  { type: 'IDENTIFIER',   value: 'SUM' },
  { type: 'LEFT_PAREN',   value: '(' },
  { type: 'CELL_REF',     value: 'A1' },
  { type: 'COLON',        value: ':' },
  { type: 'CELL_REF',     value: 'B2' },
  { type: 'COMMA',        value: ',' },
  { type: 'NUMBER',       value: 5 },
  { type: 'RIGHT_PAREN',  value: ')' },
  { type: 'OPERATOR',     value: '*' },
  { type: 'NUMBER',       value: 2 }
]
```

---

## Syntactic Grammar (Parser)

### BNF-Style Grammar

```bnf
expression     → comparison

comparison     → concatenation ( ( "=" | "<>" | "!=" | "<" | "<=" | ">" | ">=" ) concatenation )*

concatenation  → addition ( "&" addition )*

addition       → multiplication ( ( "+" | "-" ) multiplication )*

multiplication → power ( ( "*" | "/" ) power )*

power          → unary ( "^" unary )*

unary          → ( "-" | "+" ) unary
               | primary

primary        → NUMBER
               | STRING
               | BOOLEAN
               | cell_or_range
               | function_call
               | "(" expression ")"

cell_or_range  → CELL_REF ( ":" CELL_REF )?

function_call  → IDENTIFIER "(" argument_list? ")"

argument_list  → expression ( "," expression )*
```

### Operator Precedence (Lowest to Highest)

| Level | Operators | Associativity | Description |
|-------|-----------|---------------|-------------|
| 1 | `=`, `<>`, `<`, `>`, `<=`, `>=` | Left | Comparison |
| 2 | `&` | Left | Concatenation |
| 3 | `+`, `-` | Left | Addition/Subtraction |
| 4 | `*`, `/` | Left | Multiplication/Division |
| 5 | `^` | Left | Exponentiation |
| 6 | `-`, `+` (unary) | Right | Unary operators |
| 7 | `()`, literals, calls | - | Primary expressions |

---

## Parser Methods

### Entry Point

```javascript
parse() {
  const ast = this.parseExpression();
  if (!this.isAtEnd()) {
    throw new Error('Unexpected token at end');
  }
  return ast;
}
```

### Recursive Descent Chain

```javascript
parseExpression()   → parseComparison()
parseComparison()   → parseConcatenation() (loop with comparison ops)
parseConcatenation() → parseAddition() (loop with &)
parseAddition()     → parseMultiplication() (loop with +/-)
parseMultiplication() → parsePower() (loop with *//)
parsePower()        → parseUnary() (loop with ^)
parseUnary()        → parsePrimary() (handle -/+ prefix)
parsePrimary()      → NUMBER | STRING | BOOLEAN | cell_or_range | function_call | grouped
```

### Pattern: Binary Operator Parsing

```javascript
parseAddition() {
  let left = this.parseMultiplication();

  while (this.match('OPERATOR', '+', '-')) {
    const operator = this.previous();
    const right = this.parseMultiplication();
    left = { type: 'operator', op: operator.value, left, right };
  }

  return left;
}
```

### Pattern: Unary Operator Parsing

```javascript
parseUnary() {
  if (this.match('OPERATOR', '-', '+')) {
    const operator = this.previous();
    const operand = this.parseUnary();  // Recursive for stacking
    return { type: 'unary', op: operator.value, operand };
  }

  return this.parsePrimary();
}
```

### Pattern: Primary Expression Parsing

```javascript
parsePrimary() {
  // Literals
  if (this.match('NUMBER')) {
    return { type: 'number', value: this.previous().value };
  }
  if (this.match('STRING')) {
    return { type: 'string', value: this.previous().value };
  }
  if (this.match('BOOLEAN')) {
    return { type: 'boolean', value: this.previous().value };
  }

  // Cell reference or range
  if (this.match('CELL_REF')) {
    const start = this.previous();
    if (this.match('COLON')) {
      if (!this.match('CELL_REF')) {
        throw new Error('Expected cell ref after :');
      }
      return { type: 'range', start: start.value, end: this.previous().value };
    }
    return { type: 'cell', ref: start.value };
  }

  // Function call
  if (this.match('IDENTIFIER')) {
    const name = this.previous();
    if (this.match('LEFT_PAREN')) {
      const args = this.parseArgumentList();
      if (!this.match('RIGHT_PAREN')) {
        throw new Error('Expected )');
      }
      return { type: 'function', name: name.value, args };
    }
    throw new Error('Unexpected identifier');
  }

  // Grouped expression
  if (this.match('LEFT_PAREN')) {
    const expr = this.parseExpression();
    if (!this.match('RIGHT_PAREN')) {
      throw new Error('Expected )');
    }
    return { type: 'group', expression: expr };
  }

  throw new Error('Unexpected token');
}
```

---

## AST Node Types

### Literal Nodes

```javascript
{ type: 'number', value: 42 }
{ type: 'string', value: 'hello' }
{ type: 'boolean', value: true }
```

### Reference Nodes

```javascript
{ type: 'cell', ref: 'A1' }
{ type: 'cell', ref: '$A$1' }
{ type: 'range', start: 'A1', end: 'B2' }
```

### Operator Nodes

```javascript
// Binary operator
{
  type: 'operator',
  op: '+',
  left: { type: 'cell', ref: 'A1' },
  right: { type: 'number', value: 5 }
}

// Unary operator
{
  type: 'unary',
  op: '-',
  operand: { type: 'cell', ref: 'A1' }
}
```

### Function Call Node

```javascript
{
  type: 'function',
  name: 'SUM',
  args: [
    { type: 'range', start: 'A1', end: 'A10' },
    { type: 'number', value: 100 }
  ]
}
```

### Grouped Expression Node

```javascript
{
  type: 'group',
  expression: { type: 'operator', op: '+', ... }
}
```

---

## Example: Full Parse Tree

### Formula: `=SUM(A1:A10) + B1 * 2`

```
AST:
{
  type: 'operator',
  op: '+',
  left: {
    type: 'function',
    name: 'SUM',
    args: [
      { type: 'range', start: 'A1', end: 'A10' }
    ]
  },
  right: {
    type: 'operator',
    op: '*',
    left: { type: 'cell', ref: 'B1' },
    right: { type: 'number', value: 2 }
  }
}
```

### Visual Representation

```
        +
       / \
    SUM   *
     |   / \
   A1:A10 B1  2
```

### Formula: `-A1 + 5`

```
AST:
{
  type: 'operator',
  op: '+',
  left: {
    type: 'unary',
    op: '-',
    operand: { type: 'cell', ref: 'A1' }
  },
  right: { type: 'number', value: 5 }
}
```

---

## Error Handling

### Common Parse Errors

| Error | Cause | Example |
|-------|-------|---------|
| "Unexpected token at end" | Extra tokens after expression | `=A1 B1` |
| "Expected ) after arguments" | Missing closing paren | `=SUM(A1` |
| "Expected cell ref after :" | Invalid range | `=A1:` |
| "Unexpected identifier" | Function without parens | `=SUM` |
| "Unexpected token" | Invalid syntax | `=A1 ++` |

### Error Recovery

Currently, the parser does NOT recover from errors - it throws immediately. Future enhancement could include:
- Error tokens in AST
- Partial parsing for syntax highlighting

---

## Universal Parser Design

The parser is **universal** - it doesn't hardcode function names:

```javascript
// Parser sees IDENTIFIER, checks for LEFT_PAREN
if (this.match('IDENTIFIER')) {
  const name = this.previous();
  if (this.match('LEFT_PAREN')) {
    // It's a function call - parser doesn't care what function
    return { type: 'function', name: name.value, args };
  }
}
```

Function validation happens in the **Evaluator**, not the parser. This means:
- Adding new functions requires NO parser changes
- Unknown functions produce `#NAME?` at evaluation time, not parse time

---

## See Also

- AST node types: `/docs/architecture/formula-engine/ast-node-types.md`
- Evaluator: `/docs/architecture/02-formula-engine.md`
- Functions reference: `/docs/architecture/formula-engine/functions-reference.md`
