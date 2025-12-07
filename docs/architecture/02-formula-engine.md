# Formula Engine Architecture

**Last Updated**: 2025-12-07

This document describes the high-level architecture of v-sheet's formula engine - a web worker-based calculation system with a universal parser design.

**Related Documents**:
- System Overview: `/docs/architecture/00-system-overview.md`
- ADR: `/docs/adr/002-web-worker-engine.md` (TODO)
- Worker Protocol: `/docs/api-reference/worker-protocol.md` (TODO)

---

## Conceptual Model

The formula engine is a **multi-threaded calculation system** that runs in a Web Worker to prevent UI blocking. It consists of five core subsystems that work together to parse, evaluate, and track formula dependencies.

```
┌─────────────────────────────────────────────────────────────┐
│                     Main Thread                             │
│  FileManager → Worker.postMessage({type: 'setValue'})       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Web Worker Thread                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              FormulaEngine (Facade)                  │  │
│  └──────────────────────────────────────────────────────┘  │
│         │           │           │           │               │
│         ▼           ▼           ▼           ▼               │
│  ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────┐   │
│  │Tokenizer │→│ Parser  │→│Evaluator │ │ Dependency   │   │
│  │          │ │         │ │          │ │ Graph        │   │
│  └──────────┘ └─────────┘ └──────────┘ └──────────────┘   │
│                      │                                      │
│                      ▼                                      │
│              ┌──────────────┐                              │
│              │  Function    │                              │
│              │  Registry    │                              │
│              └──────────────┘                              │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│         Worker.postMessage({type: 'updates'})               │
│                     Main Thread                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Why Web Worker?

**Problem**: Complex formulas or large dependency chains can block the UI thread, causing the application to freeze.

**Solution**: Run the entire formula engine in a separate Web Worker thread.

**Benefits**:
- UI remains responsive during calculations
- Can use full CPU for parsing/evaluating
- Natural isolation of formula logic
- Parallel execution (worker + main thread)

**Trade-off**: Asynchronous communication via message passing (can't access DOM)

---

## Core Components

### FormulaEngine (`js/engine/FormulaEngine.js`)

**Responsibility**: Main facade coordinating all formula subsystems

**What It Does**:
- Provides high-level API (`setValue`, `deleteCell`, `loadData`)
- Coordinates tokenizer → parser → evaluator pipeline
- Manages cell state and formula storage
- Triggers dependency graph recalculation
- Maintains cell value cache

**What It Doesn't Do**:
- ❌ Access DOM (runs in worker)
- ❌ Handle file persistence (main thread does)
- ❌ Parse formulas directly (delegates to Parser)

**Key Methods**:
- `setValue(address, value)` - Update cell value, trigger recalc
- `deleteCell(address)` - Remove cell, update dependents
- `loadData(cellsData)` - Bulk load spreadsheet data
- `getCellValue(address)` - Get computed value
- `getCellFormula(address)` - Get formula string

**Data It Owns**:
- `cells` - Map of address → {value, formula}
- `formulas` - Map of address → formula string

---

## Parsing Pipeline

The formula engine uses a **three-stage pipeline** to convert formula strings to computed values:

```
String → Tokenizer → Tokens → Parser → AST → Evaluator → Result
         (Lexical)            (Syntax)      (Runtime)
```

### Stage 1: Tokenizer (Lexical Analysis)

**Responsibility**: Convert formula string into stream of tokens

**Input**: `"=SUM(A1:A10)+5"`

**Output**:
```javascript
[
  {type: 'EQUALS', value: '='},
  {type: 'IDENTIFIER', value: 'SUM'},
  {type: 'LPAREN', value: '('},
  {type: 'CELL_REFERENCE', value: 'A1:A10'},
  {type: 'RPAREN', value: ')'},
  {type: 'PLUS', value: '+'},
  {type: 'NUMBER', value: 5}
]
```

**Token Types**:
- `NUMBER` - Numeric literals (42, 3.14)
- `STRING` - String literals ("Hello")
- `IDENTIFIER` - Function names (SUM, AVERAGE)
- `CELL_REFERENCE` - Cell refs (A1, B2:C5)
- `OPERATOR` - Math operators (+, -, *, /, ^)
- `COMPARISON` - Comparison ops (=, <, >, <=, >=, <>)
- `LPAREN`, `RPAREN` - Parentheses
- `COMMA` - Function argument separator

**Key Features**:
- Recognizes cell references (A1, AA123)
- Recognizes ranges (A1:B10)
- Handles string literals with quotes
- Identifies function names as IDENTIFIER tokens

---

### Stage 2: Parser (Syntactic Analysis)

**Responsibility**: Convert token stream into Abstract Syntax Tree (AST)

**Input**: Token stream (from Tokenizer)

**Output**: AST representing formula structure

**Example**:
```
Formula: =A1+B1*2

AST:
       +
      / \
    A1   *
        / \
       B1  2
```

**Grammar** (Recursive Descent with Operator Precedence):
```
Expression    → Comparison
Comparison    → Concatenation (('=' | '<' | '>' | ...) Concatenation)*
Concatenation → Addition ('&' Addition)*
Addition      → Multiplication (('+' | '-') Multiplication)*
Multiplication→ Power (('*' | '/') Power)*
Power         → Unary ('^' Unary)*
Unary         → ('-' | '+') Unary | Primary
Primary       → NUMBER | STRING | CELL_REF | Function | '(' Expression ')'
Function      → IDENTIFIER '(' Arguments ')'
Arguments     → Expression (',' Expression)*
```

**Operator Precedence** (highest to lowest):
1. Parentheses `()`
2. Unary `-`, `+`
3. Power `^`
4. Multiplication `*`, Division `/`
5. Addition `+`, Subtraction `-`
6. Concatenation `&`
7. Comparison `=`, `<`, `>`, `<=`, `>=`, `<>`

**Key Features**:
- Universal parser (doesn't hardcode function names)
- Handles operator precedence correctly
- Supports nested function calls
- Validates syntax (detects mismatched parentheses, etc.)

---

### Stage 3: Evaluator (Runtime Execution)

**Responsibility**: Walk AST and compute result

**Input**: AST (from Parser)

**Output**: Computed value (number, string, boolean, or error)

**How It Works**:
1. Traverse AST recursively (depth-first)
2. Evaluate leaf nodes (numbers, strings, cell refs)
3. Apply operators to child node results
4. Call functions via FunctionRegistry
5. Return computed result

**Example**:
```
AST:     +
        / \
      A1   B1

Evaluation:
1. Evaluate left child: A1 → lookup cell value → 10
2. Evaluate right child: B1 → lookup cell value → 20
3. Apply operator: 10 + 20 → 30
4. Return 30
```

**Type Coercion**:
- String + Number → Number (if string is numeric)
- Boolean → Number (TRUE=1, FALSE=0)
- Error values propagate (if any operand is error, result is error)

**Error Handling**:
- `#DIV/0!` - Division by zero
- `#VALUE!` - Type mismatch
- `#REF!` - Invalid cell reference
- `#ERROR!` - General evaluation error
- `#CIRCULAR!` - Circular dependency (from DependencyGraph)

---

## Dependency Graph

**Responsibility**: Track cell relationships and ensure correct calculation order

**What It Does**:
- Maintains directed graph of cell dependencies
- Detects circular references
- Provides topological sort for recalculation order
- Identifies affected cells when source changes

**Graph Structure**:
```
Node = Cell address (e.g., "A1")
Edge = Dependency (e.g., B1 depends on A1)

Example:
A1 = 10
B1 = =A1*2      (depends on A1)
C1 = =B1+5      (depends on B1)

Graph:
A1 → B1 → C1
```

**Key Operations**:

#### addDependency(cell, dependsOn)
Adds edge to graph: `cell` depends on `dependsOn`

```javascript
// For formula "=A1+B1" in cell C1
addDependency('C1', 'A1');
addDependency('C1', 'B1');
```

#### getAffectedCells(changedCell)
Returns all cells that need recalculation when `changedCell` changes

```javascript
// A1 changed
getAffectedCells('A1');
// Returns: ['B1', 'C1'] (in topological order)
```

#### detectCircularReference(cell)
Checks if adding formula in `cell` would create a cycle

**Example Circular Reference**:
```
A1 = =B1+10
B1 = =A1*2     ← Circular!

Dependency graph:
A1 → B1
B1 → A1        ← Cycle detected
```

**Topological Sort**:
Ensures cells are calculated in correct order (dependencies first)

```
Given:
A1 = 10
B1 = =A1*2
C1 = =B1+5
D1 = =A1+C1

Topological order: A1 → B1 → C1 → D1
(A1 has no deps, must be calculated first)
```

---

## Function Registry

**Responsibility**: Dynamic function lookup and execution

**What It Provides**:
- Map of function name → function implementation
- Allows parser to be universal (doesn't know function names)
- Enables adding functions without parser changes

**Registered Functions**:

### Math Functions (`js/engine/functions/math.js`)
- `SUM(range)` - Sum of values
- `AVERAGE(range)` - Mean of values
- `MIN(range)` - Minimum value
- `MAX(range)` - Maximum value
- `ROUND(number, digits)` - Round to N decimal places
- `ABS(number)` - Absolute value
- `SQRT(number)` - Square root
- `POWER(base, exponent)` - Exponentiation

### Logical Functions (`js/engine/functions/logical.js`)
- `IF(condition, trueValue, falseValue)` - Conditional
- `AND(values...)` - Logical AND
- `OR(values...)` - Logical OR
- `NOT(value)` - Logical NOT

### Registration**:
```javascript
// js/engine/functions/register.js
import { SUM, AVERAGE, MIN, MAX } from './math.js';

FunctionRegistry.register('SUM', SUM);
FunctionRegistry.register('AVERAGE', AVERAGE);
// ...
```

**Function Signature**:
```javascript
function SUM(args, context) {
  // args: Array of evaluated arguments
  // context: { getCellValue, getCellRange, ... }

  // Implementation
  return result;
}
```

**Why Universal Parser Works**:
1. Parser sees `SUM` → creates IDENTIFIER token
2. AST has FunctionCall node with name "SUM"
3. Evaluator asks FunctionRegistry for "SUM"
4. Registry returns function implementation
5. Function is called with evaluated arguments

**Benefit**: Add new function by registering it, no parser changes needed

---

## Universal Parser Design

**Key Principle**: Parser doesn't know what functions exist

**Traditional Approach** (hardcoded functions):
```javascript
// Parser knows about SUM
if (token.value === 'SUM') {
  return parseSumFunction();
}
```
❌ Adding functions requires parser changes

**Universal Approach** (v-sheet):
```javascript
// Parser sees any IDENTIFIER as potential function
if (token.type === 'IDENTIFIER') {
  return parseFunctionCall();  // Generic function parsing
}
```
✅ Adding functions requires only registry update

**How It Works**:
1. **Tokenizer** sees "SUM" → creates `{type: 'IDENTIFIER', value: 'SUM'}`
2. **Parser** sees IDENTIFIER before `(` → creates FunctionCall AST node
3. **Evaluator** looks up "SUM" in FunctionRegistry at runtime
4. Function exists → call it. Function doesn't exist → #NAME! error

**Benefits**:
- Extensible (add functions without touching parser)
- Simpler parser (less special cases)
- User-defined functions possible (future enhancement)

---

## Data Flow Example

### Scenario: User enters formula "=A1+B1" in cell C1

#### 1. Main Thread
```
User types "=A1+B1" in C1, presses Enter
  ↓
UpdateCellsCommand.execute()
  ↓
FileManager.updateCell('C1', '=A1+B1')
  ↓
Worker.postMessage({
  type: 'setValue',
  address: 'C1',
  value: '=A1+B1'
})
```

#### 2. Worker Thread
```
Worker receives message
  ↓
FormulaEngine.setValue('C1', '=A1+B1')
  ↓
Is formula? Yes (starts with =)
  ↓
Tokenizer.tokenize('=A1+B1')
  → [EQUALS, CELL_REF(A1), PLUS, CELL_REF(B1)]
  ↓
Parser.parse(tokens)
  → AST: BinaryOp(+, CellRef(A1), CellRef(B1))
  ↓
DependencyGraph.updateDependencies('C1', ['A1', 'B1'])
  (C1 now depends on A1 and B1)
  ↓
Evaluator.evaluate(ast)
  → Lookup A1 value: 10
  → Lookup B1 value: 20
  → Apply +: 10 + 20 = 30
  → Return 30
  ↓
FormulaEngine stores: cells['C1'] = {value: 30, formula: '=A1+B1'}
  ↓
Check for dependents: DependencyGraph.getAffectedCells('C1')
  → (None in this example)
  ↓
Worker.postMessage({
  type: 'updates',
  cells: {
    'C1': {value: 30, formula: '=A1+B1'}
  }
})
```

#### 3. Main Thread
```
Receive updates message
  ↓
FileManager.updateCells(updates)
  ↓
GridRenderer.updateCells(updates)
  ↓
Cell C1 displays "30"
```

---

## Recalculation Flow

### Scenario: User changes A1 from 10 to 15 (C1 contains "=A1+B1")

```
Main Thread: setValue('A1', 15)
  ↓
Worker: FormulaEngine.setValue('A1', 15)
  ↓
Update A1 value: cells['A1'] = {value: 15, formula: null}
  ↓
Get affected cells: DependencyGraph.getAffectedCells('A1')
  → Returns: ['C1'] (cells that depend on A1)
  ↓
Recalculate C1:
  → Parse formula: =A1+B1
  → Evaluate: 15 + 20 = 35
  → Update: cells['C1'] = {value: 35, formula: '=A1+B1'}
  ↓
Check C1's dependents: getAffectedCells('C1')
  → (Recursively recalculate if any)
  ↓
Send updates back:
  Worker.postMessage({
    type: 'updates',
    cells: {
      'A1': {value: 15, formula: null},
      'C1': {value: 35, formula: '=A1+B1'}
    }
  })
  ↓
Main Thread: Update UI with new values
```

**Key Insight**: Dependency graph ensures:
1. Only affected cells are recalculated (not entire sheet)
2. Cells are calculated in correct order (topological sort)
3. Circular dependencies are detected before calculation

---

## Performance Optimizations

### 1. Web Worker (Non-Blocking)
- Parsing and evaluation don't block UI
- User can interact while formulas calculate
- Main thread remains responsive

### 2. Incremental Recalculation
- Only recalculate cells affected by changes
- DependencyGraph tracks which cells need updates
- Avoid full-sheet recalculation

### 3. Value Caching
- Store computed values in `cells` map
- Only recompute when dependencies change
- Avoid re-parsing formulas on every access

### 4. Lazy Evaluation
- Parse formulas only when needed (on set/load)
- Don't evaluate cells until values are requested
- Formulas without dependents aren't recalculated

### 5. Topological Sort
- Calculate cells in dependency order
- Each cell calculated exactly once per change
- No redundant calculations

---

## Error Handling

### Error Types

| Error | Cause | Example |
|-------|-------|---------|
| `#DIV/0!` | Division by zero | `=10/0` |
| `#VALUE!` | Type mismatch | `=A1+` (incomplete) |
| `#REF!` | Invalid reference | `=ZZZ999` |
| `#NAME!` | Unknown function | `=SUMM(A1:A10)` (typo) |
| `#ERROR!` | General error | Parser or evaluator failure |
| `#CIRCULAR!` | Circular dependency | A1→B1, B1→A1 |

### Error Propagation

Errors propagate through formulas:
```
A1 = #VALUE!
B1 = =A1+10      → #VALUE! (error propagates)
C1 = =B1*2       → #VALUE! (error propagates)
```

**Design**: Errors are treated as special values that "infect" dependent cells

---

## Extension Points

### Adding a New Function

**1. Implement Function** (`js/engine/functions/math.js`):
```javascript
export function COUNT(args, context) {
  // args is array of evaluated arguments
  let count = 0;
  for (const arg of args) {
    if (typeof arg === 'number') count++;
  }
  return count;
}
```

**2. Register Function** (`js/engine/functions/register.js`):
```javascript
import { COUNT } from './math.js';

FunctionRegistry.register('COUNT', COUNT);
```

**3. Add Tests** (`tests/engine/functions/math.test.js`):
```javascript
test('COUNT function', () => {
  const result = COUNT([1, 2, 'text', 3], context);
  expect(result).toBe(3);
});
```

**No parser changes needed!**

---

### Adding a New Operator

**1. Add Token Type** (Tokenizer):
```javascript
// Tokenizer recognizes new operator
if (char === '%') {
  tokens.push({type: 'MODULO', value: '%'});
}
```

**2. Add to Grammar** (Parser):
```javascript
// Add to multiplication level
parseMultiplication() {
  let left = this.parsePower();
  while (this.match('MULTIPLY', 'DIVIDE', 'MODULO')) {
    const operator = this.previous();
    const right = this.parsePower();
    left = new BinaryOp(operator.type, left, right);
  }
  return left;
}
```

**3. Handle in Evaluator**:
```javascript
case 'MODULO':
  return left % right;
```

---

## Testing Strategy

### Unit Tests (`tests/engine/`)

**Tokenizer Tests**:
```javascript
test('tokenizes formula', () => {
  const tokens = tokenize('=SUM(A1:A10)');
  expect(tokens[1].type).toBe('IDENTIFIER');
  expect(tokens[1].value).toBe('SUM');
});
```

**Parser Tests**:
```javascript
test('parses formula with precedence', () => {
  const ast = parse('=1+2*3');
  // Should be: +(1, *(2, 3)), not *(+(1,2), 3)
  expect(ast.operator).toBe('PLUS');
  expect(ast.right.operator).toBe('MULTIPLY');
});
```

**Evaluator Tests**:
```javascript
test('evaluates formula', () => {
  const cells = {A1: 10, B1: 20};
  const result = evaluate('=A1+B1', cells);
  expect(result).toBe(30);
});
```

**DependencyGraph Tests**:
```javascript
test('detects circular dependency', () => {
  graph.addDependency('A1', 'B1');
  graph.addDependency('B1', 'A1');
  expect(graph.hasCircularReference('A1')).toBe(true);
});
```

### E2E Tests (`e2e/recalc.spec.js`)

```javascript
test('formula recalculates when dependency changes', async ({ page }) => {
  // Create formula
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('10');
  await page.keyboard.press('Enter');

  await page.locator('[data-cell="B1"]').click();
  await page.keyboard.type('=A1*2');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-cell="B1"]')).toHaveText('20');

  // Change dependency
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('15');
  await page.keyboard.press('Enter');

  // Verify recalculation
  await expect(page.locator('[data-cell="B1"]')).toHaveText('30');
});
```

---

## Debugging

### Debug Logging

Enable debug mode:
```javascript
sessionStorage.setItem('vsheet-debug', 'true');
```

Logs show:
- Formula parsing: "Parsing formula: =A1+B1"
- Evaluation: "Evaluating cell C1: result = 30"
- Dependencies: "Cell C1 depends on [A1, B1]"
- Recalculation: "Recalculating affected cells: [C1, D1]"

### Common Issues

**Issue**: Formula shows #NAME! error
**Cause**: Function not registered
**Fix**: Check FunctionRegistry, verify spelling

**Issue**: Circular reference not detected
**Cause**: DependencyGraph not updated
**Fix**: Verify addDependency called after parsing

**Issue**: Formula doesn't recalculate
**Cause**: Missing from dependency graph
**Fix**: Check getAffectedCells returns dependent cell

---

## Design Decisions

### Why Recursive Descent Parser?

**Alternatives Considered**:
- Shunting Yard algorithm
- Parser combinators
- LL(1) parser generator

**Why Recursive Descent**:
- Natural mapping to operator precedence
- Easy to understand and maintain
- Flexible (easy to add features)
- Good error messages

### Why Not Eval()?

**Don't use JavaScript `eval()` for formulas**:
- ❌ Security risk (code injection)
- ❌ Can't customize error handling
- ❌ Can't track dependencies
- ❌ Can't implement custom functions easily

**Custom parser/evaluator**:
- ✅ Safe (no code execution)
- ✅ Full control over syntax
- ✅ Dependency tracking built-in
- ✅ Custom error types

---

## Future Enhancements

### Array Formulas
Support formulas that return arrays:
```
=TRANSPOSE(A1:C3)
```

### User-Defined Functions
Allow users to define custom functions:
```
=MYFUNCTION(A1)
```

### Formula Optimization
- Constant folding: `=2+3` → `5` at parse time
- Common subexpression elimination
- JIT compilation for hot paths

### Parallel Evaluation
Calculate independent cells in parallel using multiple workers

---

## See Also

- **System Overview**: `/docs/architecture/00-system-overview.md`
- **Worker Protocol**: `/docs/api-reference/worker-protocol.md`
- **Formula Test Scenarios**: `/docs/test-scenarios/formula-building.scenarios.md`
- **Source Code**: `js/engine/` directory
