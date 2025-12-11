# Feature Walkthrough: Fill Handle (Drag Fill)

**Primary Actor**: User
**Goal**: Extend a pattern or copy values by dragging the fill handle

---

## Overview

The fill handle is the small blue square at the bottom-right corner of the selection. Dragging it:
- Copies values and formulas to adjacent cells
- Detects patterns (arithmetic sequences, dates) and continues them
- Adjusts relative formula references
- Copies cell styles

---

## 1. The Trigger (UI Layer)

### Visual Element

The fill handle appears when:
- A cell or range is selected
- The user is in ReadyMode (not editing)

```
┌─────────┐
│  Cell   │
│         ■ ← Fill handle (blue square)
└─────────┘
```

### Cursor Detection

* **Event**: User hovers over selection bottom-right corner
* **Handler**: `SelectionManager.getCursorForCell()`
* **Result**: Returns `'crosshair'` cursor when within 10px of corner

```javascript
getCursorForCell(cellElement, mouseX, mouseY) {
  const rect = cellElement.getBoundingClientRect();
  const handleSize = 10;

  // Check if mouse is near bottom-right corner
  if (mouseX > rect.right - handleSize &&
      mouseY > rect.bottom - handleSize) {
    return 'crosshair';  // Fill handle
  }

  return 'pointer';  // Normal cell
}
```

---

## 2. Drag Start

```
User mousedown on fill handle
    │
    ▼
FillHandle.startDrag(event)
    │
    ├─► 1. Capture source selection
    │       sourceSelection = selectionManager.ranges
    │
    ├─► 2. Record start position
    │       startCoords = { row, col }
    │
    ├─► 3. Set drag state
    │       isDragging = true
    │
    └─► 4. Begin preview rendering
            Add 'fill-preview' class to cells
```

---

## 3. Drag Update (Preview)

```
User moves mouse while dragging
    │
    ▼
FillHandle.updateDrag(event)
    │
    ├─► 1. Calculate current cell under mouse
    │       currentCoords = getCellFromPoint(mouseX, mouseY)
    │
    ├─► 2. Determine fill direction
    │       If mouse is below selection → DOWN
    │       If mouse is right of selection → RIGHT
    │       If mouse is above selection → UP
    │       If mouse is left of selection → LEFT
    │
    ├─► 3. Calculate fill range
    │       From selection edge to current position
    │
    └─► 4. Update preview highlighting
            Show which cells will be filled
```

### Fill Direction Detection

```javascript
determineFillDirection(sourceRange, currentCoords) {
  const { minRow, maxRow, minCol, maxCol } = sourceRange;

  // Horizontal priority (same row)
  if (currentCoords.row >= minRow && currentCoords.row <= maxRow) {
    if (currentCoords.col > maxCol) return 'right';
    if (currentCoords.col < minCol) return 'left';
  }

  // Vertical
  if (currentCoords.row > maxRow) return 'down';
  if (currentCoords.row < minRow) return 'up';

  return null;
}
```

---

## 4. Drag End (Apply Fill)

```
User releases mouse
    │
    ▼
FillHandle.endDrag(event)
    │
    ├─► 1. Calculate final fill range
    │
    ├─► 2. Get source data
    │       For each source cell: { value, style }
    │
    ├─► 3. Detect pattern (if applicable)
    │       FillPatternDetector.detectPattern(sourceValues)
    │
    ├─► 4. Generate fill data
    │       For each target cell: calculate value based on pattern
    │
    ├─► 5. Create FillRangeCommand
    │       command = new FillRangeCommand(cellUpdates)
    │
    ├─► 6. Execute command
    │       historyManager.execute(command)
    │
    └─► 7. Clean up
            Clear preview, reset drag state
```

---

## 5. Pattern Detection

### FillPatternDetector

The pattern detector analyzes source values to determine fill behavior:

```javascript
FillPatternDetector.detectPattern(values) {
  // 1. Check for arithmetic sequence
  if (isArithmeticSequence(values)) {
    return { type: 'arithmetic', step: calculateStep(values) };
  }

  // 2. Check for date sequence
  if (isDateSequence(values)) {
    return { type: 'date', step: calculateDateStep(values) };
  }

  // 3. Default: simple copy
  return { type: 'copy' };
}
```

### Pattern Types

**Arithmetic Sequence:**
```
Source: 1, 2, 3
Fill:   4, 5, 6, 7, ...

Source: 10, 20, 30
Fill:   40, 50, 60, ...

Source: 5, 3, 1
Fill:   -1, -3, -5, ...  (negative step)
```

**Simple Copy:**
```
Source: "Apple"
Fill:   "Apple", "Apple", "Apple", ...

Source: "Red", "Blue"
Fill:   "Red", "Blue", "Red", "Blue", ...  (cycle)
```

**Formula (with reference adjustment):**
```
Source: =A1*2
Fill:   =A2*2, =A3*2, =A4*2, ...  (relative refs adjusted)
```

---

## 6. Fill Data Generation

```javascript
generateFillData(sourceData, targetRange, direction) {
  const pattern = this.detectPattern(sourceData.map(d => d.value));
  const updates = [];

  let index = 0;
  for (const targetCell of targetRange) {
    const sourceIndex = index % sourceData.length;
    const source = sourceData[sourceIndex];

    let value;
    if (pattern.type === 'arithmetic') {
      value = calculateArithmeticValue(sourceData, index + sourceData.length, pattern.step);
    } else if (source.value.startsWith('=')) {
      // Formula - adjust references
      const offset = calculateOffset(source.cellId, targetCell.cellId);
      value = FormulaAdjuster.adjustFormula(source.value, offset.row, offset.col);
    } else {
      // Simple copy
      value = source.value;
    }

    updates.push({
      cellId: targetCell.cellId,
      newValue: value,
      oldValue: existingValue(targetCell.cellId),
      newStyle: source.style,
      oldStyle: existingStyle(targetCell.cellId)
    });

    index++;
  }

  return updates;
}
```

---

## 7. Fill Examples

### Example 1: Number Sequence

```
Source:  A1=1, A2=2, A3=3
Drag:    Down to A6

Pattern detected: arithmetic, step=1

Result:
A1=1  (source)
A2=2  (source)
A3=3  (source)
A4=4  (filled)
A5=5  (filled)
A6=6  (filled)
```

### Example 2: Formula Fill

```
Source:  B1=A1*2, B2=A2*2
Drag:    Down to B5

Result (with reference adjustment):
B1=A1*2  (source)
B2=A2*2  (source)
B3=A3*2  (filled, refs adjusted +2 rows from B1)
B4=A4*2  (filled)
B5=A5*2  (filled)
```

### Example 3: Text Copy

```
Source:  C1="Label"
Drag:    Down to C5

Result (simple copy):
C1="Label"  (source)
C2="Label"  (filled)
C3="Label"  (filled)
C4="Label"  (filled)
C5="Label"  (filled)
```

### Example 4: Alternating Pattern

```
Source:  D1="Yes", D2="No"
Drag:    Down to D6

Result (cycling pattern):
D1="Yes"  (source)
D2="No"   (source)
D3="Yes"  (filled, cycles)
D4="No"   (filled)
D5="Yes"  (filled)
D6="No"   (filled)
```

---

## 8. Key Files

| Layer | File | Responsibility |
|-------|------|----------------|
| UI | `js/ui/FillHandle.js` | Renders handle, manages drag |
| UI | `js/ui/SelectionManager.js` | Cursor detection, handle visibility |
| Pattern | `js/engine/utils/FillPatternDetector.js` | Pattern analysis |
| Formula | `js/engine/utils/FormulaAdjuster.js` | Reference adjustment |
| History | `js/history/commands/FillRangeCommand.js` | Undo-able fill |

---

## 9. FillHandle API

```javascript
class FillHandle {
  render()              // Draw handle at selection corner
  hide()                // Hide handle (during editing)
  startDrag(event)      // Begin fill operation
  updateDrag(event)     // Update preview
  endDrag(event)        // Apply fill
}
```

---

## 10. Fill Handle Visibility

The fill handle is hidden during:
- Cell editing (EnterMode, EditMode, PointMode)
- Drag operations

```javascript
// In EditMode.onEnter()
if (this._selectionManager._fillHandle) {
  this._selectionManager._fillHandle.hide();
}

// In EditMode.onExit()
if (this._selectionManager._fillHandle) {
  this._selectionManager._fillHandle.render();
}
```

---

## 11. Undo Support

Fill operations are undo-able via FillRangeCommand:

```javascript
class FillRangeCommand {
  constructor(cellUpdates) {
    this.cellUpdates = cellUpdates;
    // Each: { cellId, newValue, oldValue, newStyle, oldStyle }
  }

  execute() {
    for (const update of this.cellUpdates) {
      this.fileManager.updateCell(update.cellId, update.newValue);
      if (update.newStyle) {
        this.fileManager.updateCellFormat(update.cellId, update.newStyleId);
      }
    }
  }

  undo() {
    for (const update of this.cellUpdates) {
      this.fileManager.updateCell(update.cellId, update.oldValue);
      if (update.oldStyle !== undefined) {
        this.fileManager.updateCellFormat(update.cellId, update.oldStyleId);
      }
    }
  }
}
```

---

## See Also

- Selection system: `/docs/architecture/features/selection-flow.md`
- Formula adjustment: `/docs/architecture/02-formula-engine.md`
- Feature docs: `/docs/features/fill-handle.md`
- Test scenarios: `/docs/manuals/test-scenarios/fill-handle.scenarios.md`
