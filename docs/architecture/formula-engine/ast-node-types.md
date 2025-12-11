# AST Node Types Reference

**Last Updated**: 2025-12-11

This document describes all Abstract Syntax Tree (AST) node types produced by the formula parser.

---

## Overview

The parser converts formula strings into an AST - a tree structure representing the formula's syntax. Each node has a `type` property identifying its kind.

---

## Node Type: `number`

Represents a numeric literal.

### Structure

```javascript
{
  type: 'number',
  value: number
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `type` | `'number'` | Node type identifier |
| `value` | `number` | Numeric value (parsed from string) |

### Examples

```javascript
// Formula: =42
{ type: 'number', value: 42 }

// Formula: =3.14159
{ type: 'number', value: 3.14159 }

// Formula: =0.5
{ type: 'number', value: 0.5 }
```

---

## Node Type: `string`

Represents a string literal.

### Structure

```javascript
{
  type: 'string',
  value: string
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `type` | `'string'` | Node type identifier |
| `value` | `string` | String content (without quotes) |

### Examples

```javascript
// Formula: ="hello"
{ type: 'string', value: 'hello' }

// Formula: ="with \"quotes\""
{ type: 'string', value: 'with "quotes"' }

// Formula: =''
{ type: 'string', value: '' }
```

---

## Node Type: `boolean`

Represents a boolean literal (TRUE or FALSE).

### Structure

```javascript
{
  type: 'boolean',
  value: boolean
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `type` | `'boolean'` | Node type identifier |
| `value` | `boolean` | `true` or `false` |

### Examples

```javascript
// Formula: =TRUE
{ type: 'boolean', value: true }

// Formula: =FALSE
{ type: 'boolean', value: false }
```

---

## Node Type: `cell`

Represents a single cell reference.

### Structure

```javascript
{
  type: 'cell',
  ref: string
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `type` | `'cell'` | Node type identifier |
| `ref` | `string` | Cell reference (e.g., "A1", "$B$2") |

### Reference Formats

| Format | Column | Row | Example |
|--------|--------|-----|---------|
| Relative | Relative | Relative | `A1` |
| Absolute Column | Absolute | Relative | `$A1` |
| Absolute Row | Relative | Absolute | `A$1` |
| Fully Absolute | Absolute | Absolute | `$A$1` |

### Examples

```javascript
// Formula: =A1
{ type: 'cell', ref: 'A1' }

// Formula: =$B$2
{ type: 'cell', ref: '$B$2' }

// Formula: =AA100
{ type: 'cell', ref: 'AA100' }
```

---

## Node Type: `range`

Represents a range of cells.

### Structure

```javascript
{
  type: 'range',
  start: string,
  end: string
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `type` | `'range'` | Node type identifier |
| `start` | `string` | Starting cell reference |
| `end` | `string` | Ending cell reference |

### Examples

```javascript
// Formula: =A1:B2
{ type: 'range', start: 'A1', end: 'B2' }

// Formula: =$A$1:$C$10
{ type: 'range', start: '$A$1', end: '$C$10' }

// Formula: =A1:A100
{ type: 'range', start: 'A1', end: 'A100' }
```

---

## Node Type: `operator`

Represents a binary operator expression.

### Structure

```javascript
{
  type: 'operator',
  op: string,
  left: ASTNode,
  right: ASTNode
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `type` | `'operator'` | Node type identifier |
| `op` | `string` | Operator symbol |
| `left` | `ASTNode` | Left operand |
| `right` | `ASTNode` | Right operand |

### Supported Operators

| Operator | Category | Description |
|----------|----------|-------------|
| `+` | Arithmetic | Addition |
| `-` | Arithmetic | Subtraction |
| `*` | Arithmetic | Multiplication |
| `/` | Arithmetic | Division |
| `^` | Arithmetic | Exponentiation |
| `&` | Text | Concatenation |
| `=` | Comparison | Equal |
| `<>` | Comparison | Not equal |
| `<` | Comparison | Less than |
| `>` | Comparison | Greater than |
| `<=` | Comparison | Less or equal |
| `>=` | Comparison | Greater or equal |

### Examples

```javascript
// Formula: =A1+B1
{
  type: 'operator',
  op: '+',
  left: { type: 'cell', ref: 'A1' },
  right: { type: 'cell', ref: 'B1' }
}

// Formula: =A1*2+B1
{
  type: 'operator',
  op: '+',
  left: {
    type: 'operator',
    op: '*',
    left: { type: 'cell', ref: 'A1' },
    right: { type: 'number', value: 2 }
  },
  right: { type: 'cell', ref: 'B1' }
}

// Formula: ="Hello"&" "&"World"
{
  type: 'operator',
  op: '&',
  left: {
    type: 'operator',
    op: '&',
    left: { type: 'string', value: 'Hello' },
    right: { type: 'string', value: ' ' }
  },
  right: { type: 'string', value: 'World' }
}
```

---

## Node Type: `unary`

Represents a unary operator expression.

### Structure

```javascript
{
  type: 'unary',
  op: string,
  operand: ASTNode
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `type` | `'unary'` | Node type identifier |
| `op` | `string` | Operator symbol (`-` or `+`) |
| `operand` | `ASTNode` | The operand |

### Examples

```javascript
// Formula: =-A1
{
  type: 'unary',
  op: '-',
  operand: { type: 'cell', ref: 'A1' }
}

// Formula: =--5 (double negation)
{
  type: 'unary',
  op: '-',
  operand: {
    type: 'unary',
    op: '-',
    operand: { type: 'number', value: 5 }
  }
}
```

---

## Node Type: `function`

Represents a function call.

### Structure

```javascript
{
  type: 'function',
  name: string,
  args: ASTNode[]
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `type` | `'function'` | Node type identifier |
| `name` | `string` | Function name (uppercase) |
| `args` | `ASTNode[]` | Array of argument nodes |

### Examples

```javascript
// Formula: =SUM(A1:A10)
{
  type: 'function',
  name: 'SUM',
  args: [
    { type: 'range', start: 'A1', end: 'A10' }
  ]
}

// Formula: =IF(A1>10, "High", "Low")
{
  type: 'function',
  name: 'IF',
  args: [
    {
      type: 'operator',
      op: '>',
      left: { type: 'cell', ref: 'A1' },
      right: { type: 'number', value: 10 }
    },
    { type: 'string', value: 'High' },
    { type: 'string', value: 'Low' }
  ]
}

// Formula: =NOW()
{
  type: 'function',
  name: 'NOW',
  args: []
}
```

---

## Node Type: `group`

Represents a parenthesized expression.

### Structure

```javascript
{
  type: 'group',
  expression: ASTNode
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `type` | `'group'` | Node type identifier |
| `expression` | `ASTNode` | The grouped expression |

### Examples

```javascript
// Formula: =(A1+B1)*2
{
  type: 'operator',
  op: '*',
  left: {
    type: 'group',
    expression: {
      type: 'operator',
      op: '+',
      left: { type: 'cell', ref: 'A1' },
      right: { type: 'cell', ref: 'B1' }
    }
  },
  right: { type: 'number', value: 2 }
}
```

---

## Node Type: `literal`

Represents an empty or literal value (edge case).

### Structure

```javascript
{
  type: 'literal',
  value: any
}
```

### Examples

```javascript
// Empty formula
{ type: 'literal', value: '' }
```

---

## Type Definitions (TypeScript Style)

```typescript
type ASTNode =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'cell'; ref: string }
  | { type: 'range'; start: string; end: string }
  | { type: 'operator'; op: string; left: ASTNode; right: ASTNode }
  | { type: 'unary'; op: string; operand: ASTNode }
  | { type: 'function'; name: string; args: ASTNode[] }
  | { type: 'group'; expression: ASTNode }
  | { type: 'literal'; value: any };
```

---

## AST Traversal Example

```javascript
function evaluate(node) {
  switch (node.type) {
    case 'number':
      return node.value;

    case 'string':
      return node.value;

    case 'boolean':
      return node.value;

    case 'cell':
      return getCellValue(node.ref);

    case 'range':
      return getRangeValues(node.start, node.end);

    case 'operator':
      const left = evaluate(node.left);
      const right = evaluate(node.right);
      return applyOperator(node.op, left, right);

    case 'unary':
      const operand = evaluate(node.operand);
      return node.op === '-' ? -operand : operand;

    case 'function':
      const args = node.args.map(evaluate);
      return callFunction(node.name, args);

    case 'group':
      return evaluate(node.expression);
  }
}
```

---

## See Also

- Parser grammar: `/docs/architecture/formula-engine/parser-grammar.md`
- Evaluator: `/docs/architecture/02-formula-engine.md`
- Error types: `/docs/architecture/formula-engine/error-types.md`
