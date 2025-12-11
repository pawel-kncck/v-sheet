# Clipboard System

**Last Updated**: 2025-12-12

This document describes the clipboard system architecture in v-sheet.

---

## Overview

The clipboard system handles copy, cut, and paste operations. It maintains an internal clipboard for rich data (values + styles) while also integrating with the system clipboard for plain text interoperability.

**Primary File**: `js/ui/ClipboardManager.js`

---

## Architecture

### Dual Clipboard Design

```
┌─────────────────────────────────────────────────────────────┐
│                    ClipboardManager                         │
│                                                             │
│  ┌─────────────────────┐    ┌────────────────────────────┐ │
│  │  Internal Clipboard │    │    System Clipboard        │ │
│  │  ─────────────────  │    │    ─────────────────────   │ │
│  │  • Values           │    │    • Tab-separated text    │ │
│  │  • Styles           │    │    • Cross-app compatible  │ │
│  │  • Source positions │    │                            │ │
│  │  • Formula refs     │    │                            │ │
│  └─────────────────────┘    └────────────────────────────┘ │
│                                                             │
│  copy() writes to BOTH clipboards                          │
│  paste() reads from internal clipboard (rich data)         │
└─────────────────────────────────────────────────────────────┘
```

---

## ClipboardManager API

### Constructor

```javascript
constructor(gridRenderer, dataGetter, selectionManager = null) {
  this.renderer = gridRenderer;
  this.dataGetter = dataGetter;  // Function(cellId) -> { value, style }
  this.selectionManager = selectionManager;

  this.clipboard = {
    data: null,           // Array of copied cell data
    sourceRange: null,    // Bounds of copied range
    copiedCellIds: new Set(),  // For visual highlighting
    isCut: false          // True if cut operation
  };
}
```

### Internal Clipboard Structure

```javascript
{
  data: [
    {
      originalCellId: "A1",
      value: "=B1+C1",
      style: { font: { bold: true } },
      relativePos: { row: 0, col: 0 }
    },
    {
      originalCellId: "A2",
      value: 100,
      style: null,
      relativePos: { row: 1, col: 0 }
    }
  ],
  sourceRange: { minRow: 1, maxRow: 2, minCol: 0, maxCol: 0 },
  copiedCellIds: Set(["A1", "A2"]),
  isCut: false
}
```

---

## Copy Operation

### `copy(ranges)`

```javascript
copy(ranges = null) {
  this.clearVisuals();

  // Get ranges from SelectionManager if not provided
  if (!ranges && this.selectionManager) {
    ranges = this.selectionManager.ranges;
  }

  if (!ranges || ranges.length === 0) return;

  // Use the last range (primary selection)
  const primaryRange = ranges[ranges.length - 1];
  const { start, end } = primaryRange;

  // Calculate bounds
  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);
  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);

  const copiedData = [];
  const cellsForSystemClipboard = [];

  // Iterate all cells in range
  for (let r = minRow; r <= maxRow; r++) {
    const rowData = [];
    for (let c = minCol; c <= maxCol; c++) {
      const cellId = this._coordsToCellId(r, c);

      // Get both value AND style
      const cellData = this.dataGetter(cellId);

      copiedData.push({
        originalCellId: cellId,
        value: cellData.value,
        style: cellData.style,
        relativePos: { row: r - minRow, col: c - minCol }
      });

      rowData.push(cellData.value || '');
      this.clipboard.copiedCellIds.add(cellId);
    }
    cellsForSystemClipboard.push(rowData);
  }

  // Store in internal clipboard
  this.clipboard.data = copiedData;
  this.clipboard.sourceRange = { minRow, maxRow, minCol, maxCol };

  // Visual feedback
  this.renderer.highlightCells(Array.from(this.clipboard.copiedCellIds), 'copy-source');

  // Write to system clipboard (tab-separated)
  this._writeToSystemClipboard(cellsForSystemClipboard);
}
```

### System Clipboard Integration

```javascript
async _writeToSystemClipboard(data2D) {
  try {
    // Convert 2D array to tab-separated, newline-delimited text
    const text = data2D.map(row => row.join('\t')).join('\n');
    await navigator.clipboard.writeText(text);
  } catch (err) {
    Logger.warn('ClipboardManager', 'System clipboard write failed', err);
  }
}
```

---

## Paste Operation

### `getPasteUpdates(targetCell, targetSelection)`

Returns an array of updates without executing them:

```javascript
getPasteUpdates(targetCell, targetSelection = null) {
  if (!this.clipboard.data) return [];

  const updates = [];
  const { row: targetRow, col: targetCol } = targetCell;

  // Calculate offsets from source to destination
  const sourceRow = this.clipboard.sourceRange.minRow;
  const sourceCol = this.clipboard.sourceRange.minCol;
  const rowOffset = targetRow - sourceRow;
  const colOffset = targetCol - sourceCol;

  // Check for single-cell to multi-cell fill
  const isSingleCell = this.clipboard.data.length === 1;
  let shouldFillRange = false;

  if (isSingleCell && targetSelection && targetSelection.length > 0) {
    // If pasting single cell into larger selection, fill the selection
    const selectionSize = calculateSelectionSize(targetSelection);
    shouldFillRange = selectionSize > 1;
  }

  if (shouldFillRange) {
    // Fill entire selection with single source value
    fillCells.forEach(coords => {
      const destCellId = this._coordsToCellId(coords.row, coords.col);
      let value = sourceItem.value;

      // Adjust formula for each destination cell
      if (typeof value === 'string' && value.startsWith('=')) {
        const fillRowOffset = coords.row - targetRow;
        const fillColOffset = coords.col - targetCol;
        value = FormulaAdjuster.adjustFormula(sourceValue, fillRowOffset, fillColOffset);
      }

      updates.push({
        cellId: destCellId,
        value: value,
        style: sourceItem.style
      });
    });
  } else {
    // Standard paste - maintain relative positions
    this.clipboard.data.forEach(item => {
      const destRow = targetRow + item.relativePos.row;
      const destCol = targetCol + item.relativePos.col;

      // Bounds check
      if (destRow > 100 || destCol >= 26) return;

      const destCellId = this._coordsToCellId(destRow, destCol);

      let value = item.value;

      // Adjust formula references
      if (typeof value === 'string' && value.startsWith('=')) {
        value = FormulaAdjuster.adjustFormula(value, rowOffset, colOffset);
      }

      updates.push({
        cellId: destCellId,
        value: value,
        style: item.style
      });
    });
  }

  return updates;
}
```

### Formula Adjustment

When pasting formulas, cell references are adjusted relative to the paste position:

```javascript
// Original formula in A1: =B1+C1
// Pasted to D5:
// Row offset: 5 - 1 = 4
// Col offset: 3 - 0 = 3
// Adjusted formula: =E5+F5
```

The `FormulaAdjuster` handles this transformation, respecting absolute references (`$A$1`).

---

## Cut Operation

### `cut(ranges)`

```javascript
cut(ranges = null) {
  // Copy first
  this.copy(ranges);

  // Mark for deletion after paste
  this.clipboard.isCut = true;

  Logger.log('ClipboardManager', 'Cut operation - cells marked for removal');
}
```

The actual deletion happens when `paste()` is executed - the source cells are cleared after the paste completes.

---

## Visual Feedback

### Copy Source Highlighting

```javascript
// Add marching ants border to copied cells
this.renderer.highlightCells(
  Array.from(this.clipboard.copiedCellIds),
  'copy-source'
);
```

### Clearing Visuals

```javascript
clearVisuals() {
  if (this.clipboard.copiedCellIds.size > 0) {
    const cellsToRemove = Array.from(this.clipboard.copiedCellIds);
    cellsToRemove.forEach(cellId => {
      const el = this.renderer.getCellElement(cellId);
      if (el) el.classList.remove('copy-source');
    });
    this.clipboard.copiedCellIds.clear();
  }
}
```

---

## Data Flow

### Copy Flow

```
User: Ctrl+C
    │
    ▼
InputController: COPY intent
    │
    ▼
NavigationMode._handleCopy()
    │
    ▼
ClipboardManager.copy()
    │
    ├─► Internal clipboard populated (values + styles)
    ├─► System clipboard written (plain text)
    └─► Visual highlight applied
```

### Paste Flow

```
User: Ctrl+V
    │
    ▼
InputController: PASTE intent
    │
    ▼
NavigationMode._handlePaste()
    │
    ▼
Spreadsheet.executePaste()
    │
    ▼
ClipboardManager.getPasteUpdates(targetCell)
    │
    ▼
UpdateCellsCommand created & executed
    │
    ├─► Cells updated with adjusted formulas
    └─► Styles applied via StyleManager
```

---

## Integration with History

Paste operations are executed through the command pattern for undo/redo support:

```javascript
// In Spreadsheet.executePaste()
executePaste() {
  const updates = this.clipboardManager.getPasteUpdates(
    this.selectionManager.activeCell,
    this.selectionManager.ranges
  );

  if (updates.length === 0) return;

  // Create command with all updates
  const command = new UpdateCellsCommand(
    this.fileManager,
    updates.map(u => ({
      cellId: u.cellId,
      newValue: u.value,
      style: u.style
    }))
  );

  this.historyManager.execute(command);
}
```

---

## See Also

- Copy-paste flow: `/docs/architecture/features/copy-paste-flow.md`
- Selection system: `/docs/architecture/08-selection-system.md`
- Formula adjuster: `/docs/architecture/02-formula-engine.md`
