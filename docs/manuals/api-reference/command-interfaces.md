# Command Interfaces Reference

**Last Updated**: 2025-12-12

This document describes the command interfaces used for undo/redo operations in v-sheet.

---

## Overview

Commands encapsulate state-changing operations. They implement `execute()` and `undo()` methods, enabling the HistoryManager to maintain a reversible operation stack.

**Primary Files**:
- `js/history/Command.js` - Base class
- `js/history/commands/` - Concrete implementations

---

## Base Command Class

### Interface

```javascript
// js/history/Command.js

class Command {
  /**
   * Execute the command (apply changes)
   * @returns {void}
   */
  execute() {
    throw new Error('execute() must be implemented');
  }

  /**
   * Undo the command (revert changes)
   * @returns {void}
   */
  undo() {
    throw new Error('undo() must be implemented');
  }

  /**
   * Optional: Get a description for debugging
   * @returns {string}
   */
  getDescription() {
    return this.constructor.name;
  }
}
```

---

## UpdateCellsCommand

Updates one or more cell values and optionally their styles.

### Constructor

```javascript
/**
 * @param {FileManager} fileManager - File manager instance
 * @param {Array} updates - Array of { cellId, newValue, style? }
 */
constructor(fileManager, updates)
```

### Structure

```javascript
{
  cellId: 'A1',
  newValue: '=B1+C1',
  style: { font: { bold: true } }  // Optional
}
```

### Implementation

```javascript
class UpdateCellsCommand extends Command {
  constructor(fileManager, updates) {
    super();
    this.fileManager = fileManager;
    this.updates = updates;

    // Capture old values for undo
    this.oldValues = updates.map(update => ({
      cellId: update.cellId,
      oldValue: fileManager.getRawCellValue(update.cellId),
      oldStyleId: fileManager.getCellStyleId(update.cellId)
    }));
  }

  execute() {
    this.updates.forEach(update => {
      this.fileManager.setCellValue(update.cellId, update.newValue);
      if (update.style) {
        this.fileManager.setCellStyle(update.cellId, update.style);
      }
    });
  }

  undo() {
    this.oldValues.forEach(old => {
      this.fileManager.setCellValue(old.cellId, old.oldValue);
      if (old.oldStyleId !== undefined) {
        this.fileManager.setCellStyleId(old.cellId, old.oldStyleId);
      }
    });
  }
}
```

### Usage

```javascript
// Single cell update
const command = new UpdateCellsCommand(fileManager, [
  { cellId: 'A1', newValue: 'Hello' }
]);
historyManager.execute(command);

// Multi-cell update with styles
const command = new UpdateCellsCommand(fileManager, [
  { cellId: 'A1', newValue: 100, style: { font: { bold: true } } },
  { cellId: 'A2', newValue: 200 },
  { cellId: 'A3', newValue: '=SUM(A1:A2)' }
]);
historyManager.execute(command);
```

---

## FormatRangeCommand

Applies formatting changes to a range of cells.

### Constructor

```javascript
/**
 * @param {FileManager} fileManager - File manager instance
 * @param {StyleManager} styleManager - Style manager instance
 * @param {Array<string>} cellIds - Array of cell IDs to format
 * @param {Object} styleChanges - Style properties to apply
 * @param {string} mode - 'apply' | 'toggle'
 */
constructor(fileManager, styleManager, cellIds, styleChanges, mode = 'apply')
```

### Implementation

```javascript
class FormatRangeCommand extends Command {
  constructor(fileManager, styleManager, cellIds, styleChanges, mode = 'apply') {
    super();
    this.fileManager = fileManager;
    this.styleManager = styleManager;
    this.cellIds = cellIds;
    this.styleChanges = styleChanges;
    this.mode = mode;

    // Capture old styleIds for undo
    this.oldStyleIds = {};
    cellIds.forEach(cellId => {
      this.oldStyleIds[cellId] = fileManager.getCellStyleId(cellId);
    });

    // For toggle mode, determine the new state
    if (mode === 'toggle') {
      this._calculateToggleState();
    }
  }

  _calculateToggleState() {
    // Check if ALL cells have the property enabled
    // If yes, toggle turns it OFF; if no, toggle turns it ON
    const property = Object.keys(this.styleChanges)[0];
    const allHaveProperty = this.cellIds.every(cellId => {
      const style = this.fileManager.getCellStyle(cellId);
      return this._getNestedProperty(style, property);
    });

    this.toggleToValue = !allHaveProperty;
  }

  execute() {
    this.cellIds.forEach(cellId => {
      const currentStyle = this.fileManager.getCellStyle(cellId) || {};
      let newStyle;

      if (this.mode === 'toggle') {
        newStyle = this._deepMergeWithToggle(currentStyle, this.styleChanges, this.toggleToValue);
      } else {
        newStyle = this._deepMerge(currentStyle, this.styleChanges);
      }

      const newStyleId = this.styleManager.addStyle(newStyle);
      this.fileManager.setCellStyleId(cellId, newStyleId);
    });
  }

  undo() {
    this.cellIds.forEach(cellId => {
      const oldStyleId = this.oldStyleIds[cellId];
      this.fileManager.setCellStyleId(cellId, oldStyleId);
    });
  }

  _deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (typeof source[key] === 'object' && source[key] !== null) {
        result[key] = this._deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
}
```

### Usage

```javascript
// Apply bold to selection
const command = new FormatRangeCommand(
  fileManager,
  styleManager,
  ['A1', 'A2', 'A3'],
  { font: { bold: true } },
  'apply'
);
historyManager.execute(command);

// Toggle italic on selection
const command = new FormatRangeCommand(
  fileManager,
  styleManager,
  ['B1', 'B2'],
  { font: { italic: true } },
  'toggle'
);
historyManager.execute(command);
```

---

## MoveRangeCommand

Moves a range of cells to a new location.

### Constructor

```javascript
/**
 * @param {FileManager} fileManager - File manager instance
 * @param {Object} sourceRange - { minRow, maxRow, minCol, maxCol }
 * @param {Object} targetStart - { row, col }
 */
constructor(fileManager, sourceRange, targetStart)
```

### Implementation

```javascript
class MoveRangeCommand extends Command {
  constructor(fileManager, sourceRange, targetStart) {
    super();
    this.fileManager = fileManager;
    this.sourceRange = sourceRange;
    this.targetStart = targetStart;

    // Calculate offsets
    this.rowOffset = targetStart.row - sourceRange.minRow;
    this.colOffset = targetStart.col - sourceRange.minCol;

    // Capture all affected cell data for undo
    this._captureAffectedCells();
  }

  _captureAffectedCells() {
    this.sourceData = {};  // Original source cells
    this.targetData = {};  // Original target cells (will be overwritten)

    // Capture source cells
    for (let r = this.sourceRange.minRow; r <= this.sourceRange.maxRow; r++) {
      for (let c = this.sourceRange.minCol; c <= this.sourceRange.maxCol; c++) {
        const cellId = this._coordsToCellId(r, c);
        this.sourceData[cellId] = {
          value: this.fileManager.getRawCellValue(cellId),
          styleId: this.fileManager.getCellStyleId(cellId)
        };

        // Capture target cell (may be different or same)
        const targetR = r + this.rowOffset;
        const targetC = c + this.colOffset;
        const targetCellId = this._coordsToCellId(targetR, targetC);

        if (!this.targetData[targetCellId]) {
          this.targetData[targetCellId] = {
            value: this.fileManager.getRawCellValue(targetCellId),
            styleId: this.fileManager.getCellStyleId(targetCellId)
          };
        }
      }
    }
  }

  execute() {
    // Clear source cells
    Object.keys(this.sourceData).forEach(cellId => {
      this.fileManager.setCellValue(cellId, '');
      this.fileManager.setCellStyleId(cellId, null);
    });

    // Set target cells with adjusted formulas
    Object.entries(this.sourceData).forEach(([sourceCellId, data]) => {
      const coords = this._cellIdToCoords(sourceCellId);
      const targetR = coords.row + this.rowOffset;
      const targetC = coords.col + this.colOffset;
      const targetCellId = this._coordsToCellId(targetR, targetC);

      let value = data.value;

      // Adjust formula references
      if (typeof value === 'string' && value.startsWith('=')) {
        value = FormulaAdjuster.adjustFormula(value, this.rowOffset, this.colOffset);
      }

      this.fileManager.setCellValue(targetCellId, value);
      this.fileManager.setCellStyleId(targetCellId, data.styleId);
    });
  }

  undo() {
    // Restore target cells to original state
    Object.entries(this.targetData).forEach(([cellId, data]) => {
      this.fileManager.setCellValue(cellId, data.value);
      this.fileManager.setCellStyleId(cellId, data.styleId);
    });

    // Restore source cells
    Object.entries(this.sourceData).forEach(([cellId, data]) => {
      this.fileManager.setCellValue(cellId, data.value);
      this.fileManager.setCellStyleId(cellId, data.styleId);
    });
  }
}
```

---

## ResizeCommand

Resizes columns or rows.

### Constructor

```javascript
/**
 * @param {GridRenderer} gridRenderer - Grid renderer instance
 * @param {string} type - 'col' or 'row'
 * @param {number[]} indices - Indices to resize
 * @param {Object} oldSizes - { index: size } before resize
 * @param {Object} newSizes - { index: size } after resize
 */
constructor(gridRenderer, type, indices, oldSizes, newSizes)
```

### Implementation

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

  getDescription() {
    return `Resize ${this.type}(s): ${this.indices.join(', ')}`;
  }
}
```

---

## HistoryManager Usage

### Executing Commands

```javascript
// Execute a command and add to history
historyManager.execute(command);

// Check undo/redo availability
if (historyManager.canUndo()) {
  historyManager.undo();
}

if (historyManager.canRedo()) {
  historyManager.redo();
}

// Clear history
historyManager.clear();
```

### Stack Behavior

```
Initial:  undoStack: [], redoStack: []

Execute A:  undoStack: [A], redoStack: []
Execute B:  undoStack: [A, B], redoStack: []
Undo:       undoStack: [A], redoStack: [B]
Undo:       undoStack: [], redoStack: [B, A]
Redo:       undoStack: [A], redoStack: [B]
Execute C:  undoStack: [A, C], redoStack: []  // redo cleared
```

---

## Creating Custom Commands

### Template

```javascript
class CustomCommand extends Command {
  constructor(/* dependencies, parameters */) {
    super();
    // Store dependencies
    this.dep = dep;

    // Capture old state for undo
    this.oldState = this._captureState();
  }

  _captureState() {
    // Return current state that needs to be restored on undo
  }

  execute() {
    // Apply the change
  }

  undo() {
    // Restore old state
  }

  getDescription() {
    return 'Custom operation description';
  }
}
```

### Best Practices

1. **Capture state in constructor**: Don't defer to execute()
2. **Keep commands atomic**: One logical operation per command
3. **Avoid side effects**: Commands should be self-contained
4. **Make idempotent**: Multiple execute() calls should have same effect

---

## See Also

- Undo/redo flow: `/docs/architecture/features/undo-redo-flow.md`
- Style object schema: `/docs/manuals/api-reference/style-object-schema.md`
- Formatting flow: `/docs/architecture/features/formatting-flow.md`
