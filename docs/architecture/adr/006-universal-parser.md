# ADR 006: Universal Parser Design

**Status**: Accepted
**Date**: 2025-12-12
**Context**: Formula engine architecture

---

## Context

The formula parser converts formula strings (e.g., `=SUM(A1:A10) + 5`) into Abstract Syntax Trees (ASTs) that can be evaluated. A key design decision is how to handle function names.

Two approaches:

1. **Hardcoded Parser**: Parser knows all function names, validates them during parsing
2. **Universal Parser**: Parser treats all identifiers followed by `(` as function calls, validation happens at evaluation time

---

## Decision

We implemented a **Universal Parser** that:

1. Does NOT hardcode function names
2. Recognizes `IDENTIFIER(...)` pattern as a function call
3. Delegates function validation to the Evaluator/FunctionRegistry
4. Unknown functions produce `#NAME?` error at evaluation, not parse time

---

## Implementation

### Parser Recognition

```javascript
// js/engine/parser/Parser.js

parsePrimary() {
  // ... handle literals, cell refs ...

  // Function call detection
  if (this.match('IDENTIFIER')) {
    const name = this.previous();

    // If followed by '(', it's a function call
    if (this.match('LEFT_PAREN')) {
      const args = this.parseArgumentList();
      if (!this.match('RIGHT_PAREN')) {
        throw new Error('Expected )');
      }
      // Return function node - parser doesn't care what function
      return { type: 'function', name: name.value, args };
    }

    throw new Error('Unexpected identifier');
  }

  // ...
}
```

### Function Validation at Evaluation

```javascript
// js/engine/Evaluator.js

_visit(node) {
  // ... handle other node types ...

  case 'function':
    // Look up function in registry
    const func = this.functionRegistry.get(node.name);

    if (!func) {
      // Unknown function - throw NameError
      throw new NameError(`Unknown function: ${node.name}`);
    }

    // Evaluate arguments and call function
    const args = node.args.map((arg) => this._visit(arg));
    return func.call(this, ...args);
}
```

### Function Registry

```javascript
// js/engine/FunctionRegistry.js

class FunctionRegistry {
  constructor() {
    this.functions = new Map();
  }

  register(name, implementation) {
    this.functions.set(name.toUpperCase(), implementation);
  }

  get(name) {
    return this.functions.get(name.toUpperCase());
  }

  has(name) {
    return this.functions.has(name.toUpperCase());
  }
}

// Registration
registry.register('SUM', sumImpl);
registry.register('AVERAGE', avgImpl);
registry.register('IF', ifImpl);
// ...
```

---

## Alternatives Considered

### 1. Hardcoded Function Names

Parser contains a list of valid function names and validates during parsing.

```javascript
// Hypothetical hardcoded approach
const FUNCTIONS = ['SUM', 'AVERAGE', 'IF', 'VLOOKUP', ...];

parsePrimary() {
  if (this.match('IDENTIFIER')) {
    const name = this.previous();

    // Validate function name
    if (!FUNCTIONS.includes(name.value)) {
      throw new ParseError(`Unknown function: ${name.value}`);
    }

    // Parse function call...
  }
}
```

**Pros**:
- Earlier error detection (at parse time)
- Parser can do function-specific argument validation

**Cons**:
- Adding new functions requires parser changes
- Parser becomes coupled to function catalog
- Can't easily support user-defined functions
- Harder to extend

**Decision**: Rejected due to coupling and extensibility concerns.

### 2. Grammar per Function

Each function has its own grammar rule.

```javascript
parseSum() { /* specific grammar */ }
parseIf() { /* specific grammar */ }
// ...
```

**Pros**:
- Very precise argument validation
- Custom syntax per function possible

**Cons**:
- Explosion of grammar rules
- Not scalable
- Hard to maintain

**Decision**: Rejected as impractical.

---

## Consequences

### Positive

1. **Extensibility**: Adding functions requires NO parser changes
2. **Decoupling**: Parser is independent of function catalog
3. **User Functions**: Future support for user-defined functions is easier
4. **Simpler Parser**: Parser logic is cleaner and smaller
5. **Plugin-Ready**: External plugins could register functions

### Negative

1. **Late Error Detection**: Unknown function errors occur at evaluation, not parse time
2. **No Function-Specific Parsing**: Can't have custom syntax per function (e.g., array formulas)
3. **Autocomplete Separate**: IDE features need separate function catalog

### Mitigation

- **Late Errors**: For most use cases, this is acceptable. Error still shown to user.
- **Custom Syntax**: Not currently needed. If required, could add special cases.
- **Autocomplete**: FunctionRegistry serves as single source of truth for both evaluation and UI.

---

## Examples

### Adding a New Function

Before (hardcoded):
```javascript
// 1. Add to parser's function list
// 2. Add implementation to evaluator
// 3. Update grammar tests
// 4. Update function list in multiple files
```

After (universal):
```javascript
// Just register the function
registry.register('NEWFUNCTION', (a, b) => {
  return a + b;
});
// That's it! Parser already handles it.
```

### Unknown Function Behavior

```
=SUMM(A1:A10)    // Typo: SUMM instead of SUM

Parse: ✓ Succeeds - valid function call syntax
Evaluate: ✗ NameError - Unknown function: SUMM
Display: #NAME?
```

---

## Integration Points

### Syntax Highlighting (Future)

```javascript
// Can use FunctionRegistry for highlighting
function highlightFormula(formula) {
  const tokens = tokenize(formula);

  return tokens.map(token => {
    if (token.type === 'IDENTIFIER') {
      if (registry.has(token.value)) {
        return { ...token, highlight: 'function' };
      } else {
        return { ...token, highlight: 'unknown' };
      }
    }
    return token;
  });
}
```

### Autocomplete (Future)

```javascript
// FunctionRegistry provides function list
function getAutocompleteSuggestions(partial) {
  return registry.getAllNames()
    .filter(name => name.startsWith(partial.toUpperCase()));
}
```

---

## Grammar Impact

The grammar remains simple:

```bnf
function_call  → IDENTIFIER "(" argument_list? ")"
argument_list  → expression ( "," expression )*
```

No function-specific rules needed.

---

## Related Decisions

- **ADR 002**: Formula Engine Architecture
- Error handling: `/docs/architecture/formula-engine/error-types.md`

---

## References

- Similar approach: Excel's function registration system
- Implementation files:
  - `js/engine/parser/Parser.js`
  - `js/engine/Evaluator.js`
  - `js/engine/FunctionRegistry.js`
  - `js/engine/functions/register.js`
