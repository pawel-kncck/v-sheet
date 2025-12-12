# Resize Flow

**Last Updated**: 2025-12-12

This document traces the complete flow of column/row resize operations in v-sheet.

---

## Overview

Resizing columns and rows allows users to adjust the grid layout. The system provides visual feedback during drag operations and persists the final sizes.

**Primary File**: `js/ui/GridResizer.js`

---

## User Interaction

### Resize Triggers

| Action | Effect |
|--------|--------|
| Hover near column header right edge | Cursor changes to `col-resize` |
| Hover near row header bottom edge | Cursor changes to `row-resize` |
| Drag column edge | Column width changes |
| Drag row edge | Row height changes |

### Visual Indicators

1. **Cursor change**: `col-resize` or `row-resize` near edges
2. **Guide line**: Vertical or horizontal line showing new position during drag
3. **Live preview**: Column/row resizes in real-time

---

## Complete Flow Diagram

```
                              RESIZE FLOW
                              ===========

User hovers header edge
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    CURSOR DETECTION                          │
│                                                              │
│   GridResizer.getCursorForHeader(target, event)             │
│     │                                                        │
│     ├─ Check if target is header-cell                       │
│     ├─ Check proximity to right edge (columns)              │
│     └─ Check proximity to bottom edge (rows)                │
│                                                              │
│   Returns: 'col-resize' | 'row-resize' | 'default'          │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
User mousedown on resize edge
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    START RESIZE                              │
│                                                              │
│   GridResizer.startResize(type, indices, currentSizes)      │
│     │                                                        │
│     ├─ Set isResizing = true                                │
│     ├─ Store initial state:                                 │
│     │    • type ('col' or 'row')                            │
│     │    • indices to resize                                │
│     │    • originalSizes (for undo calculation)             │
│     │    • startPos (mouse X or Y)                          │
│     │                                                        │
│     ├─ Emit onResizeStart callback (show guide)             │
│     │                                                        │
│     └─ Attach global listeners:                             │
│          • window.mousemove → _onMouseMove                  │
│          • window.mouseup → _onMouseUp                      │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
User drags mouse
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    RESIZE UPDATE                             │
│                                                              │
│   GridResizer._onMouseMove(event)                           │
│     │                                                        │
│     ├─ Calculate delta from startPos                        │
│     │    delta = currentPos - startPos                      │
│     │                                                        │
│     ├─ Calculate new sizes:                                 │
│     │    newSize = Math.max(MIN_SIZE, originalSize + delta) │
│     │                                                        │
│     └─ Emit onResizeUpdate callback:                        │
│          { type, newSizes, delta }                          │
│                                                              │
│   GridRenderer receives callback:                           │
│     • Updates guide line position                           │
│     • Optionally updates column/row preview                 │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
User releases mouse
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    RESIZE END                                │
│                                                              │
│   GridResizer._onMouseUp(event)                             │
│     │                                                        │
│     ├─ Final calculation of sizes                           │
│     │                                                        │
│     ├─ Remove global listeners                              │
│     │                                                        │
│     ├─ Emit onResizeEnd callback:                           │
│     │    { type, finalSizes }                               │
│     │                                                        │
│     ├─ Set isResizing = false                               │
│     │                                                        │
│     └─ Set justFinishedResizing = true (50ms)               │
│          (Prevents accidental header selection)             │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    COMMAND EXECUTION                         │
│                                                              │
│   Spreadsheet receives onResizeEnd:                         │
│     │                                                        │
│     ├─ Create ResizeCommand(type, indices, oldSizes, newSizes)
│     │                                                        │
│     └─ HistoryManager.execute(command)                      │
│          │                                                   │
│          ├─ command.execute()                               │
│          │    • Apply new sizes to grid                     │
│          │    • Update CSS variables / inline styles        │
│          │                                                   │
│          └─ Push to undo stack                              │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    PERSISTENCE                               │
│                                                              │
│   FileManager.setColumnWidths() / setRowHeights()           │
│     │                                                        │
│     ├─ Update internal state                                │
│     │                                                        │
│     └─ Mark file as modified (triggers autosave)            │
└─────────────────────────────────────────────────────────────┘
```

---

## GridResizer Implementation

### Constructor

```javascript
constructor(config = {}) {
  this.MIN_COL_WIDTH = config.minColWidth || 5;
  this.MIN_ROW_HEIGHT = config.minRowHeight || 5;

  this.isResizing = false;
  this.justFinishedResizing = false;
  this.resizeInfo = null;

  this.callbacks = {
    onResizeStart: null,
    onResizeUpdate: null,
    onResizeEnd: null
  };

  // Bind methods for event listeners
  this._onMouseMove = this._onMouseMove.bind(this);
  this._onMouseUp = this._onMouseUp.bind(this);
}
```

### Resize Info Structure

```javascript
{
  type: 'col',           // 'col' or 'row'
  indices: [2],          // Column/row indices being resized
  originalSizes: { 2: 100 },  // Original sizes for undo
  startPos: 450          // Initial mouse position (X or Y)
}
```

### Cursor Detection

```javascript
getCursorForHeader(target, e) {
  if (!target.classList.contains('header-cell')) return 'default';

  const rect = target.getBoundingClientRect();
  const isCol = target.dataset.col !== undefined;

  if (isCol) {
    const nearRightEdge = e.clientX > rect.right - 5;
    return nearRightEdge ? 'col-resize' : 'default';
  } else {
    const nearBottomEdge = e.clientY > rect.bottom - 5;
    return nearBottomEdge ? 'row-resize' : 'default';
  }
}
```

### Size Calculation

```javascript
_onMouseMove(e) {
  if (!this.isResizing || !this.resizeInfo) return;

  const { type, startPos, indices, originalSizes } = this.resizeInfo;

  // Calculate delta
  const currentPos = type === 'col' ? e.clientX : e.clientY;
  const delta = currentPos - startPos;

  // Calculate new sizes with minimum constraint
  const newSizes = {};
  indices.forEach(index => {
    const originalSize = originalSizes[index];
    const limit = type === 'col' ? this.MIN_COL_WIDTH : this.MIN_ROW_HEIGHT;
    newSizes[index] = Math.max(limit, originalSize + delta);
  });

  // Emit update for live preview
  if (this.callbacks.onResizeUpdate) {
    this.callbacks.onResizeUpdate({ type, newSizes, delta });
  }
}
```

---

## Multi-Column/Row Resize

When multiple columns or rows are selected, all can be resized together:

```javascript
startResize(type, indices, currentSizes, event) {
  // indices can be [0, 1, 2] for multi-column resize
  this.resizeInfo = {
    type,
    indices,                    // All selected indices
    originalSizes: { ...currentSizes },
    startPos: type === 'col' ? event.clientX : event.clientY
  };

  // All indices get the same delta applied
}
```

---

## Preventing Click Events

After a resize operation, a brief delay prevents accidental header selection:

```javascript
_onMouseUp(e) {
  // ... emit final event ...

  this.isResizing = false;
  this.resizeInfo = null;

  // Prevent click events for 50ms
  this.justFinishedResizing = true;
  setTimeout(() => {
    this.justFinishedResizing = false;
  }, 50);
}
```

The header click handler checks this flag:

```javascript
onHeaderClick(type, index, e) {
  if (this.gridResizer.justFinishedResizing) return;
  // ... handle selection ...
}
```

---

## Command Pattern Integration

### ResizeCommand

```javascript
class ResizeCommand extends Command {
  constructor(gridRenderer, type, indices, oldSizes, newSizes) {
    super();
    this.gridRenderer = gridRenderer;
    this.type = type;
    this.indices = indices;
    this.oldSizes = oldSizes;
    this.newSizes = newSizes;
  }

  execute() {
    this._applySizes(this.newSizes);
  }

  undo() {
    this._applySizes(this.oldSizes);
  }

  _applySizes(sizes) {
    this.indices.forEach(index => {
      if (this.type === 'col') {
        this.gridRenderer.setColumnWidth(index, sizes[index]);
      } else {
        this.gridRenderer.setRowHeight(index, sizes[index]);
      }
    });
  }
}
```

---

## File Format

Column widths and row heights are persisted:

```json
{
  "cells": { ... },
  "styles": { ... },
  "columnWidths": {
    "0": 100,
    "1": 150,
    "2": 80
  },
  "rowHeights": {
    "1": 25,
    "5": 40
  }
}
```

---

## See Also

- Grid renderer: `/docs/architecture/03-grid-rendering.md`
- Undo/redo flow: `/docs/architecture/features/undo-redo-flow.md`
- File format schema: `/docs/manuals/api-reference/file-format-schema.md`
