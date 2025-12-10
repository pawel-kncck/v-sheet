# Implementation Plan: Fill Handle

**Status**: Planning Complete
**Date**: 2025-12-10
**Epic Dependencies**: Epic 4 (Advanced Copy/Paste), Epic 1 (History Management)
**Feature Spec**: `docs/features/fill-handle.md`

## Overview

Implement the fill handle feature - a blue dot in the bottom-right corner of the selection that users can drag to fill adjacent cells with values derived from the source range. The feature supports:

1. **Single Cell Fill**: Copy/paste with formula reference adjustment
2. **Numeric Pattern Fill**: Linear regression to continue numeric sequences
3. **Formula/Text Fill**: Cyclic copy/paste with formula adjustment
4. **Multi-directional Drag**: Up, down, left, right
5. **Multi-row/column Ranges**: Per-row or per-column pattern extension

---

## Architecture Overview

### Design Decision

Following existing codebase patterns, the fill handle is implemented **outside the mode system**, consistent with:
- Cell drag-to-move (`Spreadsheet.js` - `isDraggingCells`)
- Column/row resizing (`GridResizer.js` - `isResizing`)

### Component Architecture

```
SelectionManager.render()
    ↓
FillHandle.render() [positioning]
    ↓
Mouse Interaction (Spreadsheet.js)
    ↓
FillPatternDetector (pattern analysis)
    ↓
FillRangeCommand (history)
    ↓
UpdateCellsCommand pattern → FileManager → FormulaWorker
```

### Key Files

| File | Purpose |
|------|---------|
| `js/ui/FillHandle.js` | Fill handle rendering, hit detection, drag state |
| `js/engine/utils/FillPatternDetector.js` | Pattern detection and value generation |
| `js/history/commands/FillRangeCommand.js` | Undo/redo support |
| `tests/ui/FillHandle.test.js` | Unit tests for fill handle |
| `tests/engine/utils/FillPatternDetector.test.js` | Unit tests for pattern detection |
| `e2e/fill-handle.spec.js` | End-to-end tests |

### Files to Modify

| File | Changes |
|------|---------|
| `js/spreadsheet.js` | Wire FillHandle, add fill drag handlers |
| `js/ui/SelectionManager.js` | Add fill handle cursor detection |
| `js/ui/GridRenderer.js` | Add fill preview overlay methods |
| `css/spreadsheet.css` | Add fill handle and preview styles |

---

## Phase 1: Core Infrastructure

### 1.1 Create FillPatternDetector Utility

**File**: `js/engine/utils/FillPatternDetector.js`

**Purpose**: Analyze source data and generate fill values.

**Key Methods**:

```javascript
class FillPatternDetector {
  /**
   * Determine if a sequence is numeric-only (eligible for linear regression)
   * @param {Array<{value: string, isFormula: boolean}>} cells
   * @returns {boolean}
   */
  static isNumericSequence(cells) { }

  /**
   * Calculate linear regression parameters
   * @param {number[]} values - Numeric values in order
   * @returns {{slope: number, intercept: number}}
   */
  static calculateLinearRegression(values) { }

  /**
   * Generate fill values for a numeric sequence
   * @param {number[]} sourceValues - Source numeric values
   * @param {number} count - Number of values to generate
   * @param {boolean} reverse - Fill in reverse direction
   * @returns {number[]}
   */
  static generateNumericFill(sourceValues, count, reverse) { }

  /**
   * Generate fill values for cyclic copy (formulas/text)
   * @param {Array<{value: string, sourceCoords: {row, col}}>} sourceData
   * @param {number} count - Number of values to generate
   * @param {boolean} reverse - Fill in reverse direction
   * @returns {Array<{value: string, sourceCoords: {row, col}}>}
   */
  static generateCyclicFill(sourceData, count, reverse) { }

  /**
   * Main entry point - analyze source and generate fill data
   * @param {Object} params
   * @param {Array} params.sourceRange - Source cells with values
   * @param {Object} params.targetRange - Target range bounds
   * @param {'horizontal'|'vertical'} params.fillDirection
   * @param {boolean} params.reverse - Filling backwards
   * @returns {Array<{cellId, value, style}>}
   */
  static generateFillData(params) { }
}
```

**Linear Regression Algorithm**:
```javascript
// For values [v1, v2, v3, ...]
// slope = (vn - v1) / (n - 1)
// intercept = v1
// nextValue = intercept + slope * position
```

### 1.2 Create FillRangeCommand

**File**: `js/history/commands/FillRangeCommand.js`

**Extends**: `Command`

**Constructor**:
```javascript
constructor({
  cellUpdates,      // Array of { cellId, newValue, oldValue, newStyle, oldStyle }
  fileManager,
  formulaWorker,
  renderer
})
```

**Implementation**: Delegates to UpdateCellsCommand pattern for execution.

### 1.3 Create FillHandle Class

**File**: `js/ui/FillHandle.js`

**Constructor**:
```javascript
constructor({
  container,        // #spreadsheet-container
  selectionManager,
  gridRenderer,
  onFillComplete    // Callback with fill data
})
```

**Key Methods**:
```javascript
class FillHandle {
  /**
   * Render the fill handle dot at selection bottom-right
   */
  render() { }

  /**
   * Remove the fill handle from DOM
   */
  hide() { }

  /**
   * Check if coordinates are over the fill handle
   * @returns {boolean}
   */
  isOverFillHandle(x, y) { }

  /**
   * Start fill drag operation
   */
  startDrag(event, sourceSelection) { }

  /**
   * Update fill preview during drag
   */
  updateDrag(event) { }

  /**
   * Complete fill operation
   * @returns {{targetRange, fillDirection, reverse}}
   */
  endDrag(event) { }

  /**
   * Show/update fill preview overlay
   */
  _renderPreview(targetRange) { }

  /**
   * Hide fill preview overlay
   */
  _hidePreview() { }
}
```

**State**:
```javascript
this.element = null;         // The dot element
this.previewElement = null;  // Preview overlay
this.isDragging = false;
this.dragInfo = {
  sourceSelection: null,
  startCoords: null,
  currentCoords: null
};
```

---

## Phase 2: Integration

### 2.1 Update SelectionManager

**File**: `js/ui/SelectionManager.js`

**Modify `getCursorForCell()`** - Add fill handle detection before edge grab detection:

```javascript
getCursorForCell(coords, event, cellElement) {
  // ... existing code ...

  // NEW: Check for fill handle (bottom-right corner of selection)
  const bounds = this.getSelectionBounds();
  if (bounds && coords.row === bounds.maxRow && coords.col === bounds.maxCol) {
    const rect = cellElement.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;

    // 10px hit zone in bottom-right corner
    const nearBottomRight =
      (rect.right - x) <= 10 &&
      (rect.bottom - y) <= 10;

    if (nearBottomRight) {
      return 'crosshair';
    }
  }

  // ... existing grab cursor logic ...
}
```

**Modify `render()`** - Call FillHandle.render() at end:

```javascript
render() {
  // ... existing rendering code ...

  // Render fill handle (if single range and in ReadyMode)
  if (this.ranges.length === 1 && this._fillHandle) {
    this._fillHandle.render();
  }
}
```

### 2.2 Update Spreadsheet.js

**File**: `js/spreadsheet.js`

**Constructor additions**:
```javascript
import { FillHandle } from './ui/FillHandle.js';
import { FillPatternDetector } from './engine/utils/FillPatternDetector.js';
import { FillRangeCommand } from './history/commands/FillRangeCommand.js';

// In constructor:
this.fillHandle = new FillHandle({
  container: this.container,
  selectionManager: this.selectionManager,
  gridRenderer: this.renderer,
  onFillComplete: (fillData) => this._executeFill(fillData)
});

// Pass to SelectionManager
this.selectionManager._fillHandle = this.fillHandle;

// Bind handlers
this._onFillMouseMove = this._onFillMouseMove.bind(this);
this._onFillMouseUp = this._onFillMouseUp.bind(this);
```

**Modify cell mousedown handler** (around line 230):
```javascript
const cursor = this.selectionManager.getCursorForCell(coords, event, cellElement);

if (cursor === 'crosshair') {
  // Start fill operation
  event.preventDefault();
  this.isFilling = true;
  this.fillHandle.startDrag(event, this.selectionManager.getSelection());
  window.addEventListener('mousemove', this._onFillMouseMove);
  window.addEventListener('mouseup', this._onFillMouseUp, { once: true });
  return;
}

// ... existing drag logic ...
```

**Add fill handlers**:
```javascript
_onFillMouseMove(event) {
  if (!this.isFilling) return;
  this.fillHandle.updateDrag(event);
}

_onFillMouseUp(event) {
  if (!this.isFilling) return;

  window.removeEventListener('mousemove', this._onFillMouseMove);

  const result = this.fillHandle.endDrag(event);
  this.isFilling = false;

  if (result && result.targetRange) {
    this._executeFill(result);
  }
}

_executeFill({ sourceSelection, targetRange, fillDirection, reverse }) {
  // Get source data
  const sourceData = this._getSourceDataForFill(sourceSelection);

  // Generate fill values
  const fillData = FillPatternDetector.generateFillData({
    sourceRange: sourceData,
    targetRange,
    fillDirection,
    reverse
  });

  // Apply formula adjustments
  const cellUpdates = fillData.map(fill => {
    let value = fill.value;

    // Adjust formula references if needed
    if (value.startsWith('=')) {
      const rowOffset = fill.targetRow - fill.sourceRow;
      const colOffset = fill.targetCol - fill.sourceCol;
      value = FormulaAdjuster.adjustFormula(value, rowOffset, colOffset);
    }

    return {
      cellId: fill.cellId,
      newValue: value,
      oldValue: this.fileManager.getRawCellValue(fill.cellId),
      newStyle: fill.style,
      oldStyle: this.fileManager.getCellStyle(fill.cellId)
    };
  });

  // Execute command
  const command = new FillRangeCommand({
    cellUpdates,
    fileManager: this.fileManager,
    formulaWorker: this.formulaWorker,
    renderer: this.renderer
  });

  this.historyManager.execute(command);

  // Expand selection to include filled cells
  this.selectionManager.extendSelection(targetRange);
}
```

### 2.3 Update GridRenderer

**File**: `js/ui/GridRenderer.js`

**Add methods for fill preview**:
```javascript
showFillPreview(bounds) {
  let preview = document.getElementById('fill-preview');
  if (!preview) {
    preview = document.createElement('div');
    preview.id = 'fill-preview';
    this.container.appendChild(preview);
  }

  // Calculate position from cell bounds
  const startCell = this.getCellElementByCoords(bounds.minRow, bounds.minCol);
  const endCell = this.getCellElementByCoords(bounds.maxRow, bounds.maxCol);

  if (!startCell || !endCell) return;

  const containerRect = this.container.getBoundingClientRect();
  const startRect = startCell.getBoundingClientRect();
  const endRect = endCell.getBoundingClientRect();

  preview.style.left = `${startRect.left - containerRect.left}px`;
  preview.style.top = `${startRect.top - containerRect.top}px`;
  preview.style.width = `${endRect.right - startRect.left}px`;
  preview.style.height = `${endRect.bottom - startRect.top}px`;
  preview.style.display = 'block';
}

hideFillPreview() {
  const preview = document.getElementById('fill-preview');
  if (preview) {
    preview.style.display = 'none';
  }
}
```

---

## Phase 3: Styling

### 3.1 Update CSS

**File**: `css/spreadsheet.css`

Add at end:
```css
/* Fill Handle */
#fill-handle {
  position: absolute;
  width: 8px;
  height: 8px;
  background-color: #1a73e8;
  border: 2px solid #ffffff;
  border-radius: 50%;
  z-index: 5;
  cursor: crosshair;
  pointer-events: auto;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

#fill-handle:hover {
  transform: scale(1.2);
  transition: transform 0.1s ease;
}

/* Fill Preview */
#fill-preview {
  position: absolute;
  border: 2px dashed #1a73e8;
  background-color: rgba(26, 115, 232, 0.1);
  z-index: 10;
  pointer-events: none;
  display: none;
}
```

---

## Phase 4: Testing

### 4.1 Unit Tests

**File**: `tests/engine/utils/FillPatternDetector.test.js`

See `docs/test-scenarios/fill-handle.scenarios.md` for detailed test cases.

**File**: `tests/ui/FillHandle.test.js`

Test cases:
- Fill handle renders at correct position
- Fill handle hidden during edit mode
- Cursor detection works correctly
- Drag state management
- Preview updates during drag

### 4.2 E2E Tests

**File**: `e2e/fill-handle.spec.js`

See `docs/test-scenarios/fill-handle.scenarios.md` for comprehensive scenarios.

---

## Implementation Order

### Sprint 1: Core Logic
1. Create `FillPatternDetector.js` with unit tests
2. Create `FillRangeCommand.js`
3. Manual testing via console

### Sprint 2: UI & Rendering
4. Create `FillHandle.js` class
5. Add fill handle CSS styles
6. Update `SelectionManager.js` cursor detection
7. Update `GridRenderer.js` for preview

### Sprint 3: Integration
8. Update `Spreadsheet.js` with fill handlers
9. Wire up complete flow
10. Manual testing

### Sprint 4: Testing & Polish
11. Write E2E tests
12. Test undo/redo
13. Test edge cases
14. Performance testing with large ranges

---

## Edge Cases

### Boundary Limits
Fill should not exceed grid boundaries (row > 100, col >= 26).

### Empty Cells in Source
Empty cells are part of the pattern and copied cyclically.

### Single Value
A single numeric value copies the same value (slope = 0).

### All Same Values
If all numeric values are identical, fill continues with that value.

### Mixed Content
Each column/row is analyzed independently - numeric columns use linear regression, formula/text columns use cyclic copy.

### Style Preservation
Styles from source cells are copied to target cells.

---

## Success Criteria

- [ ] Fill handle dot appears at selection bottom-right corner
- [ ] Crosshair cursor when hovering over fill handle
- [ ] Preview overlay during drag operation
- [ ] Single cell fill works (copy with formula adjustment)
- [ ] Numeric sequence fill works (linear regression)
- [ ] Formula/text fill works (cyclic copy)
- [ ] Reverse direction fill works correctly
- [ ] Multi-column/row selection fills per-row/per-column
- [ ] Fill operation is undo-able and redo-able
- [ ] Styles are preserved during fill
- [ ] All E2E tests pass
- [ ] No performance degradation with large ranges

---

## Dependencies

### Required Before Implementation
- Epic 4: Advanced Copy/Paste (FormulaAdjuster)
- Epic 1: History Management (Command pattern)

### Uses Existing
- `FormulaAdjuster.adjustFormula()` for reference adjustment
- `UpdateCellsCommand` pattern for execution
- `StyleManager` for style handling

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Pattern detection edge cases | Medium | Medium | Comprehensive test coverage |
| Large range performance | Medium | Low | Batch updates, test with 100+ cells |
| Complex reverse fill logic | Medium | Medium | Thorough unit tests for reverse |
| Multi-direction confusion | Low | Low | Clear fill direction detection |
