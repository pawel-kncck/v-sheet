# Fill Handle Feature Specification

## Overview

The fill handle is a blue dot displayed in the bottom-right corner of the active selection. Users can drag this handle to fill adjacent cells with values derived from the selected range. This is a core spreadsheet feature that enables quick data entry through pattern continuation and copy/paste operations.

## User Experience

### Visual Indicator
- A small blue dot (8x8px) appears at the bottom-right corner of the current selection
- The dot is positioned on the outer edge of the selection border
- Cursor changes to `crosshair` when hovering over the fill handle
- The fill handle is visible in ReadyMode only (not during editing)

### Drag Interaction
1. User hovers over the fill handle → cursor becomes crosshair
2. User clicks and drags in any direction (up, down, left, right)
3. During drag, a preview overlay shows the target fill range
4. On mouse release, cells are filled according to the fill logic below

### Supported Drag Directions
- **Down**: Extend selection downward
- **Up**: Extend selection upward (values decrease or cycle backwards)
- **Right**: Extend selection rightward
- **Left**: Extend selection leftward (values decrease or cycle backwards)

---

## Fill Logic

### 1. Single Cell Selection

When the source selection is a single cell, the fill handle performs a **simple copy/paste**:
- The cell's value and style are copied to all target cells
- If the cell contains a formula, references are adjusted relative to each target cell

**Example:**
- A1 = `=B1+1`, drag to A3
- Result: A2 = `=B2+1`, A3 = `=B3+1`

### 2. Range Selection with Numeric Values

When the source selection contains numeric values, the fill handle applies **linear regression** to continue the pattern:

**Example (column extension):**
- A1 = 1, A2 = 2, A3 = 3
- User drags fill handle to A6
- Result: A4 = 4, A5 = 5, A6 = 6

**Example (reverse direction):**
- B4 = 1, B5 = 2, B6 = 3
- User drags fill handle to B2
- Result: B3 = 0, B2 = -1

**Linear regression calculation:**
- Calculate slope: `(lastValue - firstValue) / (rangeLength - 1)`
- For each target cell: `value = lastValue + slope * positionFromEnd`
- For reverse direction: values continue the pattern backwards

### 3. Range Selection with Formulas

When the source selection contains formulas, the fill handle performs **cyclic copy/paste**:
- Formulas are copied in order, cycling back to the start when the pattern is exhausted
- Formula references are adjusted based on the offset from the source cell

**Example (forward direction):**
- A1 = `=2+1`, A2 = `=2+2`, A3 = `=2+3`
- User drags to A7
- Result:
  - A4 = `=2+1` (from A1)
  - A5 = `=2+2` (from A2)
  - A6 = `=2+3` (from A3)
  - A7 = `=2+1` (from A1, cycled)

**Example (reverse direction):**
- B4 = `=X1`, B5 = `=X2`, B6 = `=X3`
- User drags to B2
- Result:
  - B3 = `=X3` (from B6)
  - B2 = `=X2` (from B5)

### 4. Range Selection with Text

Text values are treated the same as formulas - **cyclic copy/paste**:
- Text is copied in order, cycling when the pattern is exhausted
- No value transformation occurs

### 5. Multi-Column/Row Selection

When extending a selection that spans multiple rows or columns, the fill logic applies **per-row or per-column**:

**Example (horizontal extension):**
- A1 = 1, B1 = 2 | A2 = 2, B2 = 4 | A3 = 3, B3 = 6
- User drags right to column C
- Result:
  - C1 = 3 (linear regression of A1:B1)
  - C2 = 6 (linear regression of A2:B2)
  - C3 = 9 (linear regression of A3:B3)

**Example (vertical extension):**
- A1 = 1, B1 = 2 | A2 = 2, B2 = 4 | A3 = 3, B3 = 6
- User drags down to row 4
- Result:
  - A4 = 4 (linear regression of A1:A3)
  - B4 = 8 (linear regression of B1:B3)

### 6. Mixed Content Ranges

When a range contains a mix of numbers, formulas, and text:
- Each column/row is processed independently
- Numeric-only sequences use linear regression
- Sequences containing any formula or text use cyclic copy

---

## Technical Design

### Architecture Decision

Following the existing codebase patterns, the fill handle will be implemented **outside the mode system**, similar to:
- Cell drag-to-move (`Spreadsheet.js` - `isDraggingCells`)
- Column/row resizing (`GridResizer.js` - `isResizing`)

This approach is consistent with how other drag operations work in the codebase.

### New Files

| File | Purpose |
|------|---------|
| `js/ui/FillHandle.js` | Fill handle rendering, hit detection, and drag state management |
| `js/engine/utils/FillPatternDetector.js` | Pattern detection (numeric vs text/formula) and value calculation |
| `js/history/commands/FillRangeCommand.js` | Command for undo/redo support |
| `tests/ui/FillHandle.test.js` | Unit tests for fill handle logic |
| `tests/engine/utils/FillPatternDetector.test.js` | Unit tests for pattern detection |

### Modified Files

| File | Changes |
|------|---------|
| `js/spreadsheet.js` | Wire up FillHandle, add fill drag handlers |
| `js/ui/SelectionManager.js` | Add fill handle cursor detection in `getCursorForCell()` |
| `js/ui/GridRenderer.js` | Add methods for fill handle element and preview overlay |
| `css/spreadsheet.css` | Add fill handle and fill preview styles |

### Key Components

#### 1. FillHandle Class
```
Responsibilities:
- Create and position the fill handle DOM element
- Detect hover state for cursor change
- Manage drag state (isFilling, fillInfo)
- Calculate fill target range based on drag position
- Render fill preview overlay during drag
```

#### 2. FillPatternDetector Utility
```
Responsibilities:
- Determine if a cell sequence is numeric-only
- Calculate linear regression parameters (slope)
- Generate fill values for numeric sequences
- Handle cyclic copy for formula/text sequences
```

#### 3. FillRangeCommand
```
Responsibilities:
- Store source range and target range
- Store old values for undo
- Execute fill operation via UpdateCellsCommand pattern
- Support undo/redo
```

### Integration Points

1. **SelectionManager.getCursorForCell()**: Add crosshair cursor detection for fill handle position
2. **SelectionManager.render()**: Call FillHandle.render() after selection rendering
3. **Spreadsheet._setupEventWiring()**: Add fill drag event handlers
4. **FormulaAdjuster**: Reuse for formula reference adjustment during fill

### Data Flow

```
User drags fill handle
       ↓
Spreadsheet detects cursor === 'crosshair' on mousedown
       ↓
Sets isFilling = true, stores fillInfo
       ↓
mousemove: Update fill preview overlay
       ↓
mouseup: Calculate fill range
       ↓
FillPatternDetector determines fill type (numeric/cyclic)
       ↓
Generate cell updates with FormulaAdjuster
       ↓
Create FillRangeCommand
       ↓
Execute via HistoryManager
       ↓
UI updates, formula worker recalculates
```

### CSS Styles

```css
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
  transform: translate(50%, 50%);
}

#fill-preview {
  position: absolute;
  border: 2px dashed #1a73e8;
  background-color: rgba(26, 115, 232, 0.1);
  z-index: 10;
  pointer-events: none;
}
```

---

## Edge Cases

1. **Single row/column detection**: When source is 1xN or Nx1, extend in the perpendicular direction uses the full range; extending in the same direction uses linear regression or cyclic copy.

2. **Boundary limits**: Fill should not exceed grid boundaries (row > 100, col >= 26 based on current limits).

3. **Empty cells in source range**: Empty cells are treated as part of the pattern and copied cyclically.

4. **Style preservation**: Cell styles from source cells are copied to target cells (same as copy/paste).

5. **All-same values**: If all numeric values are identical (e.g., 5, 5, 5), fill continues with that same value (slope = 0).

6. **Single numeric value**: A single numeric cell copies the same value (no regression possible).

---

## Test Scenarios

### Numeric Patterns
- [ ] Single cell numeric → fills with same value
- [ ] Ascending sequence (1,2,3) → continues (4,5,6)
- [ ] Descending sequence (3,2,1) → continues (0,-1,-2)
- [ ] Constant values (5,5,5) → continues (5,5,5)
- [ ] Non-integer slope (1,3,5) → continues (7,9,11)
- [ ] Reverse direction drag → pattern continues backward

### Formula Patterns
- [ ] Single formula → adjusts references for each target
- [ ] Multiple formulas → cyclic copy with reference adjustment
- [ ] Mixed absolute/relative refs → respects $ markers
- [ ] Reverse direction → cycles from end of range

### Text Patterns
- [ ] Single text → copies to all targets
- [ ] Multiple text values → cyclic copy
- [ ] Reverse direction → cycles from end

### Multi-dimensional
- [ ] Horizontal extension of multi-row selection
- [ ] Vertical extension of multi-column selection
- [ ] Each row/column extends independently

### Edge Cases
- [ ] Fill up to grid boundary
- [ ] Empty cells in source range
- [ ] Style preservation during fill
- [ ] Undo/redo after fill operation

---

## Future Enhancements (Out of Scope)

These features are common in Excel but not included in this initial implementation:
- Smart fill patterns (dates, days of week, months)
- Fill with series dialog (custom step values)
- Fill with formatting only / values only
- Double-click fill handle to auto-fill to adjacent data
