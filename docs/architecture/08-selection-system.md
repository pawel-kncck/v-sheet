# Selection System

**Last Updated**: 2025-12-12

This document describes the selection system architecture in v-sheet.

---

## Overview

The selection system manages which cells are currently selected, highlighted, and active. It supports single cells, rectangular ranges, and multi-range selections (Cmd/Ctrl+Click).

**Primary File**: `js/ui/SelectionManager.js`

---

## Core Concepts

### Active Cell vs Selection

| Concept | Description |
|---------|-------------|
| **Active Cell** | The single cell with keyboard focus (shows cursor) |
| **Selection Anchor** | The starting point when extending a selection |
| **Selection Range** | A rectangular region from anchor to current position |
| **Ranges Array** | Multiple disconnected selections (Cmd/Ctrl+Click) |

### Selection State Structure

```javascript
{
  activeCell: { row: number, col: number },  // Keyboard focus
  selectionAnchor: { row: number, col: number },  // Extension starting point
  ranges: [
    { start: { row, col }, end: { row, col } },  // First selection
    { start: { row, col }, end: { row, col } }   // Second selection (Cmd+Click)
  ]
}
```

---

## SelectionManager API

### Constructor

```javascript
constructor(gridRenderer, config = {}) {
  this.gridRenderer = gridRenderer;
  this.config = {
    rows: config.rows || 100,
    cols: config.cols || 26
  };

  this.activeCell = null;
  this.selectionAnchor = null;
  this.ranges = [];

  this.callbacks = {
    onSelectionChange: null,
    onActiveCellChange: null
  };
}
```

### Core Methods

#### `selectCell(coords, isShift, isCmd)`

Handles cell selection with modifier support:

```javascript
selectCell(coords, isShift = false, isCmd = false) {
  if (isShift) {
    this._extendSelection(coords);  // Extend from anchor
  } else if (isCmd) {
    this._addRangeToSelection(coords);  // Add new range
  } else {
    this._selectSingleCell(coords);  // Replace selection
  }

  this.render();
  this._notifySelectionChange();
}
```

#### `moveSelection(direction, isShift)`

Handles arrow key navigation:

```javascript
moveSelection(direction, isShift = false) {
  // If shifting, move the END of the range
  // Otherwise, move relative to active cell
  let { row, col } = (isShift && this.ranges.length > 0)
    ? this.ranges[this.ranges.length - 1].end
    : this.activeCell;

  switch (direction) {
    case 'up':    row = Math.max(1, row - 1); break;
    case 'down':  row = Math.min(this.ROWS, row + 1); break;
    case 'left':  col = Math.max(0, col - 1); break;
    case 'right': col = Math.min(this.COLS - 1, col + 1); break;
  }

  // Update selection and scroll into view
  this.selectCell({ row, col }, isShift, false);
}
```

#### `jumpToEdge(direction, hasValue, shift)`

Implements Ctrl+Arrow behavior - jumping to data region boundaries:

```javascript
jumpToEdge(direction, hasValue, shift = false) {
  // Logic:
  // 1. If on data and neighbor is data → Keep going until empty or edge
  // 2. If on data and neighbor is empty → Keep going until data or edge
  // 3. If on empty → Keep going until data or edge

  let { row, col } = this.activeCell;
  const startHasValue = hasValue(this._coordsToCellId({ row, col }));

  // Traverse until boundary condition met
  while (isValid(nextR, nextC)) {
    // Stop conditions based on data presence
    // ...
  }

  // Update selection
  if (shift) {
    this.selectCell(newCoords, true, false);
  } else {
    this.setActiveCell(newCoords);
    this.selectCell(newCoords, false, false);
  }
}
```

#### `getSelectionBounds()`

Returns the bounding box of all selections:

```javascript
getSelectionBounds() {
  if (this.ranges.length === 0) return null;

  let minRow = Infinity, maxRow = -Infinity;
  let minCol = Infinity, maxCol = -Infinity;

  this.ranges.forEach(range => {
    minRow = Math.min(minRow, range.start.row, range.end.row);
    maxRow = Math.max(maxRow, range.start.row, range.end.row);
    // ... same for col
  });

  return { minRow, maxRow, minCol, maxCol };
}
```

---

## Selection Rendering

### Render Pipeline

```javascript
render() {
  // 1. Clear previous drawings
  this.gridRenderer.clearAllHighlights();

  // 2. Calculate overlaps for background opacity
  const cellSelectionCounts = {};
  this.ranges.forEach(range => {
    // Count how many times each cell is selected
    // (for overlapping multi-selections)
  });

  // 3. Apply background colors based on overlap count
  for (const cellId in cellSelectionCounts) {
    const count = Math.min(cellSelectionCounts[cellId], 8);
    this.gridRenderer.highlightCells([cellId], `range-selected-${count}`);
  }

  // 4. Apply perimeter borders for each range
  this.ranges.forEach(range => {
    // Apply border classes to edge cells
  });

  // 5. Highlight active cell specifically
  if (this.activeCell) {
    const activeId = this._coordsToCellId(this.activeCell);
    this.gridRenderer.highlightCells([activeId], 'selected');
  }

  // 6. Render fill handle if applicable
  if (this.ranges.length === 1 && this._fillHandle) {
    this._fillHandle.render();
  }
}
```

### CSS Classes Applied

| Class | Purpose |
|-------|---------|
| `selected` | Active cell highlight |
| `range-selected-N` | Background opacity (N = overlap count) |
| `range-border-top/bottom/left/right` | Selection border edges |
| `copy-source` | Cells currently copied |

---

## Cursor Detection

The selection system detects when the cursor is near selection edges for drag operations:

```javascript
getCursorForCell(coords, event, cellElement) {
  const cellId = this._coordsToCellId(coords);

  // Quick check: if cell isn't selected, ignore
  if (!this.getSelectedCellIds().includes(cellId)) return 'default';

  // Check for fill handle (bottom-right corner)
  const bounds = this.getSelectionBounds();
  if (bounds && coords.row === bounds.maxRow && coords.col === bounds.maxCol) {
    const rect = cellElement.getBoundingClientRect();
    const nearBottomRight =
      (rect.right - event.clientX) <= 10 &&
      (rect.bottom - event.clientY) <= 10;

    if (nearBottomRight) return 'crosshair';
  }

  // Check for edge grab zones
  const THRESHOLD = 5; // 5px buffer
  const nearTop = Math.abs(event.clientY - rect.top) <= THRESHOLD;
  // ... check all edges

  // Return 'grab' if near selection boundary
  for (const range of this.ranges) {
    if (nearTop && coords.row === minRow) return 'grab';
    // ... check all edges
  }

  return 'default';
}
```

---

## Header Selection

Selecting entire rows or columns:

```javascript
selectHeader(type, index, isShift = false, isCmd = false) {
  let start, end;

  if (type === 'col') {
    start = { col: index, row: 1 };
    end = { col: index, row: this.ROWS };
  } else {
    start = { col: 0, row: index };
    end = { col: this.COLS - 1, row: index };
  }

  // Handle shift/cmd modifiers same as cell selection
  if (!isShift) {
    this.setActiveCell(start);
  }

  // Update ranges based on modifier keys
  // ...
}
```

---

## Event Callbacks

### Registering Callbacks

```javascript
const selectionManager = new SelectionManager(gridRenderer);

selectionManager.on('selectionChange', ({ ranges, activeCell }) => {
  console.log('Selection changed:', ranges);
});

selectionManager.on('activeCellChange', (cellId, coords) => {
  updateCellReference(cellId);
});
```

### Callback Types

| Event | Data | Triggered When |
|-------|------|----------------|
| `selectionChange` | `{ ranges, activeCell }` | Any selection modification |
| `activeCellChange` | `cellId, coords` | Active cell moves |

---

## Integration Points

### With InputController

```javascript
// InputController creates CELL_SELECT intents
case INTENTS.CELL_SELECT:
  selectionManager.selectCell(
    context.coords,
    context.shift,
    context.ctrl
  );
```

### With Modes

```javascript
// NavigationMode uses SelectionManager for navigation
_handleNavigate(context) {
  const { direction, shift } = context;

  if (shift) {
    this._selectionManager.extendSelection(direction);
  } else {
    this._selectionManager.moveSelection(direction);
  }
}
```

### With ClipboardManager

```javascript
// ClipboardManager reads selection for copy
copy() {
  const ranges = this.selectionManager.ranges;
  const primaryRange = ranges[ranges.length - 1];
  // ... copy cells in range
}
```

---

## Coordinate Utilities

### Cell ID Conversion

```javascript
// Coords → Cell ID
_coordsToCellId(coords) {
  const colLetter = String.fromCharCode(65 + coords.col);
  return `${colLetter}${coords.row}`;
}

// { row: 1, col: 0 } → "A1"
// { row: 10, col: 2 } → "C10"
```

### Getting Selected Cell IDs

```javascript
getSelectedCellIds() {
  const cellIds = new Set();

  this.ranges.forEach(range => {
    const { start, end } = range;
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    // ... iterate all cells in range
  });

  return Array.from(cellIds);
}
```

---

## See Also

- Selection flow: `/docs/architecture/features/selection-flow.md`
- Input controller: `/docs/architecture/07-input-controller.md`
- Fill handle flow: `/docs/architecture/features/fill-handle-flow.md`
