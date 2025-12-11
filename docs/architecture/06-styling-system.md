# Styling System Architecture

**Last Updated**: 2025-12-11

This document describes the architecture of v-sheet's cell styling system, which uses the Flyweight pattern for efficient style storage and deduplication.

---

## Responsibility

The styling system manages cell formatting (fonts, colors, alignment, borders) with minimal memory overhead by deduplicating identical styles.

---

## Core Component: StyleManager

**File**: `js/StyleManager.js`

### What It Does

- Maintains a central "palette" of unique style objects
- Provides `addStyle(styleObject)` which returns a `styleId`
- Provides `getStyle(styleId)` to retrieve the full style object
- Uses hash-based reverse lookup to prevent duplicates
- Exports palette for file persistence via `getPalette()`

### What It Doesn't Do

- Does NOT apply styles to DOM (GridRenderer does that)
- Does NOT decide when to apply styles (FormatRangeCommand does that)
- Does NOT store cell → style mappings (FileManager does that)

---

## The Flyweight Pattern

### Problem

If 1000 cells have bold text, storing `{ font: { bold: true } }` in each cell wastes memory and complicates persistence.

### Solution

```
StyleManager.styles (The Palette)
┌────────────────────────────────────────┐
│ "abc123": { font: { bold: true } }     │  ← 1 entry
│ "def456": { fill: { color: '#FF0' } }  │
│ "ghi789": { font: { bold: true },      │
│             fill: { color: '#FF0' } }  │
└────────────────────────────────────────┘

FileManager.cells
┌─────────────────────────────────────┐
│ A1: { value: "Hello", styleId: "abc123" }  │  ← Reference only
│ A2: { value: "World", styleId: "abc123" }  │  ← Same reference
│ B1: { value: "Test",  styleId: "def456" }  │
└─────────────────────────────────────┘
```

### Benefits

1. **Memory Efficiency**: 1000 cells with same style = 1 palette entry
2. **Simple Persistence**: Styles stored once in file, cells store only IDs
3. **Automatic Deduplication**: `addStyle()` returns existing ID if style already exists

---

## Style Object Structure

```javascript
{
  font: {
    bold: boolean,        // Bold text
    italic: boolean,      // Italic text
    underline: boolean,   // Underlined text
    strikethrough: boolean, // Strikethrough text
    color: '#RRGGBB',     // Text color (hex)
    size: number,         // Font size in points (e.g., 11)
    family: string        // Font family (e.g., 'Arial')
  },
  fill: {
    color: '#RRGGBB'      // Background color (hex)
  },
  align: {
    h: 'left' | 'center' | 'right',  // Horizontal alignment
    v: 'top' | 'middle' | 'bottom'   // Vertical alignment
  },
  wrap: boolean,          // Text wrapping enabled
  border: {
    top: { style: string, color: string },
    bottom: { style: string, color: string },
    left: { style: string, color: string },
    right: { style: string, color: string }
  }
}
```

**Note**: Style objects are sparse - only include properties that differ from defaults.

---

## Key Methods

### `addStyle(styleObject)`

Gets or creates an ID for a style object.

```javascript
// First call - creates new entry
const id1 = styleManager.addStyle({ font: { bold: true } });
// id1 = "lxyz123abc"

// Second call with identical style - returns same ID
const id2 = styleManager.addStyle({ font: { bold: true } });
// id2 = "lxyz123abc" (same as id1)
```

**How deduplication works**:
1. Generate deterministic hash from style object (sorted keys → JSON)
2. Check reverse lookup map for existing hash
3. If found, return existing ID
4. If not found, generate new ID, store style, update reverse lookup

### `getStyle(id)`

Retrieves the full style object for a given ID.

```javascript
const style = styleManager.getStyle("lxyz123abc");
// { font: { bold: true } }
```

### `getPalette()`

Exports all styles for file persistence.

```javascript
const palette = styleManager.getPalette();
// { "lxyz123abc": { font: { bold: true } }, ... }
```

---

## Style Application Flow

```
User clicks Bold button
    │
    ▼
Toolbar.handleBoldClick()
    │
    ▼
Spreadsheet.applyRangeFormat({ font: { bold: true } }, 'toggle')
    │
    ▼
FormatRangeCommand.execute()
    │
    ├──► For each cell:
    │    │
    │    ▼
    │    Get existing style: styleManager.getStyle(cell.styleId)
    │    │
    │    ▼
    │    Deep merge: existingStyle + newChanges
    │    │
    │    ▼
    │    Get/create ID: styleManager.addStyle(mergedStyle)
    │    │
    │    ▼
    │    Update cell: fileManager.updateCellFormat(cellId, newStyleId)
    │    │
    │    ▼
    │    Update DOM: gridRenderer.updateCellStyle(cellId, fullStyleObject)
    │
    ▼
Autosave includes updated palette
```

---

## Deep Merge Logic

When applying styles, existing styles are preserved unless explicitly overwritten:

```javascript
// Cell has: { font: { bold: true, size: 14 } }
// User applies: { font: { italic: true } }

// Result (deep merge):
{ font: { bold: true, size: 14, italic: true } }
```

This is handled by `FormatRangeCommand` using recursive merge:

```javascript
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

## Toggle Mode vs Set Mode

### Toggle Mode (Bold, Italic)

Used for boolean styles that should flip on/off:

```javascript
// All selected cells are bold → remove bold
// Any selected cell is not bold → apply bold to all

spreadsheet.applyRangeFormat({ font: { bold: true } }, 'toggle');
```

### Set Mode (Colors, Fonts)

Used for styles that should always apply the specified value:

```javascript
// Always set this exact color, regardless of current state
spreadsheet.applyRangeFormat({ fill: { color: '#FFFF00' } }, 'set');
```

---

## Persistence

### File Format

Styles are persisted alongside cell data:

```json
{
  "cells": {
    "A1": { "value": "Hello", "styleId": "abc123" },
    "B2": { "value": "World", "styleId": "def456" }
  },
  "styles": {
    "abc123": { "font": { "bold": true } },
    "def456": { "fill": { "color": "#FFFF00" } }
  }
}
```

### Loading Styles

When a file is loaded:

1. StyleManager is initialized with existing styles palette
2. Reverse lookup map is rebuilt from existing styles
3. New style additions check against existing entries

---

## Related Components

| Component | Responsibility |
|-----------|----------------|
| `StyleManager` | Style palette and deduplication |
| `FormatRangeCommand` | Undo-able style application |
| `FileManager` | Cell → styleId storage |
| `GridRenderer` | DOM style application |
| `Toolbar` | User interface for formatting |

---

## See Also

- Feature flow: `/docs/architecture/features/formatting-flow.md`
- ADR: `/docs/architecture/adr/004-flyweight-styles.md`
- User workflows: `/docs/manuals/user-workflows.md` (Apply Bold Formatting)
- API reference: `/docs/manuals/api-reference/style-object-schema.md`
