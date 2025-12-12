# ADR 004: Flyweight Pattern for Cell Styles

**Status**: Accepted
**Date**: 2025-12-11
**Context**: Cell formatting architecture

---

## Context

Spreadsheets often have many cells with identical formatting. For example:
- 1000 cells might all be bold
- An entire column might have the same background color
- Multiple ranges might share the same font settings

Storing a full style object in each cell would:
1. Waste memory (N cells × style object size)
2. Complicate persistence (duplicate data in saved files)
3. Make style updates inefficient

---

## Decision

We implemented the **Flyweight Pattern** via `StyleManager`:

1. **Central Palette**: All unique styles are stored in a single "palette" object
2. **ID References**: Cells store only a `styleId` reference, not the full style
3. **Automatic Deduplication**: Adding an existing style returns the existing ID
4. **Hash-Based Lookup**: Deterministic hashing enables O(1) duplicate detection

---

## Implementation

### StyleManager

```javascript
class StyleManager {
  constructor() {
    this.styles = {};           // Palette: { id: styleObject }
    this.reverseLookup = Map(); // Hash → ID for deduplication
  }

  addStyle(styleObject) {
    const hash = this._generateHash(styleObject);

    // Return existing ID if style already exists
    if (this.reverseLookup.has(hash)) {
      return this.reverseLookup.get(hash);
    }

    // Create new entry
    const newId = this._generateId();
    this.styles[newId] = styleObject;
    this.reverseLookup.set(hash, newId);
    return newId;
  }

  getStyle(id) {
    return this.styles[id] || null;
  }
}
```

### Cell Storage

```javascript
// Instead of:
cell = {
  value: "Hello",
  style: { font: { bold: true, size: 14 }, fill: { color: '#FFFF00' } }
}

// We store:
cell = {
  value: "Hello",
  styleId: "abc123"  // Reference to palette entry
}
```

### File Format

```json
{
  "cells": {
    "A1": { "value": "Hello", "styleId": "abc123" },
    "A2": { "value": "World", "styleId": "abc123" },
    "B1": { "value": "Test", "styleId": "def456" }
  },
  "styles": {
    "abc123": { "font": { "bold": true } },
    "def456": { "fill": { "color": "#FFFF00" } }
  }
}
```

---

## Alternatives Considered

### 1. Direct Style Storage

Store full style object in each cell.

**Pros**:
- Simpler implementation
- No indirection

**Cons**:
- Memory inefficient for repeated styles
- Larger file sizes
- Difficult to implement "find all cells with style X"

**Decision**: Rejected due to inefficiency at scale.

### 2. CSS Classes

Generate CSS classes for each unique style, apply via className.

**Pros**:
- Leverages browser's style deduplication
- Very fast rendering

**Cons**:
- Requires dynamic stylesheet management
- Complex style serialization for persistence
- Harder to do partial style updates

**Decision**: Rejected due to complexity of persistence.

### 3. Style Inheritance

Use a hierarchy of named styles that inherit from each other.

**Pros**:
- Powerful for complex formatting
- Changes to parent style affect all children

**Cons**:
- More complex to implement
- Harder to understand for simple cases
- Overkill for v1 requirements

**Decision**: Rejected as over-engineering for current needs.

---

## Consequences

### Positive

1. **Memory Efficiency**: 1000 cells with identical bold style = 1 palette entry + 1000 ID references
2. **Smaller Files**: Styles stored once, not repeated per cell
3. **Fast Style Lookup**: O(1) to check if style exists
4. **Easy Bulk Updates**: Change palette entry → all referencing cells update
5. **Clean Separation**: Style definition separate from style usage

### Negative

1. **Extra Indirection**: Getting a cell's style requires palette lookup
2. **Orphaned Styles**: Deleted styles may leave unused palette entries
3. **ID Management**: Must ensure unique IDs across sessions

### Mitigation

- **Indirection Cost**: Negligible - single hash lookup
- **Orphaned Styles**: Could implement periodic garbage collection (not yet needed)
- **ID Generation**: Use timestamp + random suffix for uniqueness

---

## Style Object Structure

We chose a sparse, nested structure:

```javascript
{
  font: {
    bold: boolean,
    italic: boolean,
    underline: boolean,
    strikethrough: boolean,
    color: '#RRGGBB',
    size: number,
    family: string
  },
  fill: {
    color: '#RRGGBB'
  },
  align: {
    h: 'left' | 'center' | 'right',
    v: 'top' | 'middle' | 'bottom'
  },
  border: {
    top: { style: string, color: string },
    bottom: { style: string, color: string },
    left: { style: string, color: string },
    right: { style: string, color: string }
  },
  wrap: boolean
}
```

**Why sparse**: Only include non-default properties. `{ font: { bold: true } }` is valid - no need to specify all properties.

**Why nested**: Enables deep merge for partial updates. Apply `{ font: { italic: true } }` to cell with `{ font: { bold: true } }` → `{ font: { bold: true, italic: true } }`.

---

## Hash Generation

For deduplication, we need deterministic hashing:

```javascript
_generateHash(style) {
  // Sort keys recursively for consistent hashing
  const sortKeys = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    return Object.keys(obj).sort().reduce((result, key) => {
      result[key] = sortKeys(obj[key]);
      return result;
    }, {});
  };
  return JSON.stringify(sortKeys(style));
}
```

This ensures `{ a: 1, b: 2 }` hashes the same as `{ b: 2, a: 1 }`.

---

## Deep Merge for Partial Updates

When applying new style changes to an existing style:

```javascript
// Existing: { font: { bold: true, size: 14 } }
// New changes: { font: { italic: true } }
// Result: { font: { bold: true, size: 14, italic: true } }

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (typeof source[key] === 'object' && source[key] !== null) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
```

---

## Related Decisions

- **Command Pattern (ADR 003)**: FormatRangeCommand captures old styleIds for undo
- **File Persistence**: Styles palette is saved alongside cells

---

## References

- Flyweight Pattern: Gang of Four Design Patterns
- Similar approach used in: Excel (internal), Google Sheets
- Implementation: `js/StyleManager.js`
