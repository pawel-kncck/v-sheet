# Navigation Flow

**Last Updated**: 2025-12-12

This document traces the complete flow of keyboard navigation in v-sheet.

---

## Overview

Navigation allows users to move around the spreadsheet using keyboard shortcuts. The navigation system is implemented in `NavigationMode`, which is extended by `ReadyMode`, `EnterMode`, and `PointMode`.

**Primary File**: `js/modes/NavigationMode.js`

---

## Navigation Types

| Navigation | Keys | Behavior |
|------------|------|----------|
| Single step | Arrow keys | Move one cell in direction |
| Jump to edge | Ctrl+Arrow | Jump to data region boundary |
| Extend selection | Shift+Arrow | Expand selection in direction |
| Extend to edge | Ctrl+Shift+Arrow | Expand selection to boundary |

---

## Complete Flow Diagram

```
                           NAVIGATION FLOW
                           ===============

User presses Arrow key
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    INPUT CONTROLLER                          │
│                                                              │
│   InputController._handleKeyDown(event)                     │
│     │                                                        │
│     ├─ Check: Is arrow key?                                 │
│     │                                                        │
│     ├─ Check modifiers:                                     │
│     │    • Ctrl/Cmd pressed? → JUMP_TO_EDGE                │
│     │    • Shift pressed?    → shift: true                 │
│     │                                                        │
│     └─ Create intent + context:                             │
│          intent: NAVIGATE or JUMP_TO_EDGE                   │
│          context: { direction: 'up'|'down'|'left'|'right',  │
│                    shift: boolean }                         │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    MODE MANAGER                              │
│                                                              │
│   ModeManager.handleIntent(intent, context)                 │
│     │                                                        │
│     └─ Delegate to current mode:                            │
│          currentMode.handleIntent(intent, context)          │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    NAVIGATION MODE                           │
│                                                              │
│   (ReadyMode, EnterMode, or PointMode)                      │
│                                                              │
│   handleIntent(intent, context) {                           │
│     switch (intent) {                                        │
│       case INTENTS.NAVIGATE:                                │
│         return this._handleNavigate(context);               │
│       case INTENTS.JUMP_TO_EDGE:                            │
│         return this._handleJumpToEdge(context);             │
│     }                                                        │
│   }                                                          │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
```

---

## Single Step Navigation

### `_handleNavigate(context)`

```javascript
_handleNavigate(context) {
  const { direction, shift } = context;

  if (shift) {
    // Extend selection (keeps active cell, expands range)
    this._selectionManager.extendSelection(direction);
  } else {
    // Move selection (moves active cell)
    this._selectionManager.moveSelection(direction);
  }

  return true;
}
```

### SelectionManager.moveSelection()

```javascript
moveSelection(direction, isShift = false) {
  if (!this.activeCell) return;

  // Determine starting point
  let { row, col } = (isShift && this.ranges.length > 0)
    ? this.ranges[this.ranges.length - 1].end  // Extend: move range end
    : this.activeCell;                          // Move: from active cell

  // Apply direction
  switch (direction) {
    case 'up':    row = Math.max(1, row - 1); break;
    case 'down':  row = Math.min(this.ROWS, row + 1); break;
    case 'left':  col = Math.max(0, col - 1); break;
    case 'right': col = Math.min(this.COLS - 1, col + 1); break;
  }

  const newCoords = { row, col };

  if (!isShift) {
    this.setActiveCell(newCoords);
  }

  this.selectCell(newCoords, isShift, false);

  // Scroll into view
  const cellElement = this.gridRenderer.getCellElementByCoords(row, col);
  if (cellElement) {
    this.gridRenderer.scrollCellIntoView(cellElement);
  }
}
```

---

## Jump to Edge Navigation

### `_handleJumpToEdge(context)`

```javascript
_handleJumpToEdge(context) {
  const { direction, shift } = context;

  // Function to check if a cell has data
  const hasValueFn = (cellId) => {
    const value = this._fileManager?.getRawCellValue(cellId);
    return value !== null && value !== undefined && value !== '';
  };

  if (shift) {
    this._selectionManager.extendSelectionToEdge(direction, hasValueFn);
  } else {
    this._selectionManager.jumpToEdge(direction, hasValueFn);
  }

  return true;
}
```

### Jump Logic

The jump algorithm follows Excel-like behavior:

```
                    JUMP TO EDGE ALGORITHM
                    ======================

Starting Position: Cell with or without data
Destination: Determined by these rules:

Case 1: On data, neighbor is data
  → Keep going until we hit empty or grid edge
  → Stop on last data cell

Case 2: On data, neighbor is empty
  → Keep going until we hit data or grid edge
  → Stop on first data cell found

Case 3: On empty cell
  → Keep going until we hit data or grid edge
  → Stop on first data cell found

                 Example Grid:
     A     B     C     D     E     F
  ┌─────┬─────┬─────┬─────┬─────┬─────┐
1 │  1  │  2  │  3  │     │  5  │     │
  └─────┴─────┴─────┴─────┴─────┴─────┘

From A1, Ctrl+Right:
  • A1 has data, B1 has data → Case 1
  • Continue through B1, C1 (both have data)
  • D1 is empty → Stop at C1

From C1, Ctrl+Right:
  • C1 has data, D1 is empty → Case 2
  • Continue through D1 (empty)
  • E1 has data → Stop at E1

From D1, Ctrl+Right:
  • D1 is empty → Case 3
  • E1 has data → Stop at E1
```

### SelectionManager.jumpToEdge()

```javascript
jumpToEdge(direction, hasValue, shift = false) {
  if (!this.activeCell) return;

  let { row, col } = this.activeCell;
  const startHasValue = hasValue(this._coordsToCellId({ row, col }));

  // Direction step
  const step = {
    up: { r: -1, c: 0 },
    down: { r: 1, c: 0 },
    left: { r: 0, c: -1 },
    right: { r: 0, c: 1 }
  }[direction];

  // Bounds check helper
  const isValid = (r, c) => r >= 1 && r <= this.ROWS && c >= 0 && c < this.COLS;

  // Check immediate neighbor
  let nextR = row + step.r;
  let nextC = col + step.c;

  if (!isValid(nextR, nextC)) return; // Already at edge

  const neighborHasValue = hasValue(this._coordsToCellId({ row: nextR, col: nextC }));

  // Traverse based on case
  while (isValid(nextR, nextC)) {
    const currentIsValue = hasValue(this._coordsToCellId({ row: nextR, col: nextC }));

    if (startHasValue) {
      if (neighborHasValue) {
        // Case 1: Stop when we hit empty
        if (!currentIsValue) {
          nextR -= step.r;
          nextC -= step.c;
          break;
        }
      } else {
        // Case 2: Stop when we hit data
        if (currentIsValue) break;
      }
    } else {
      // Case 3: Stop when we hit data
      if (currentIsValue) break;
    }

    // Check if at grid edge
    if (!isValid(nextR + step.r, nextC + step.c)) break;

    nextR += step.r;
    nextC += step.c;
  }

  // Update selection
  const newCoords = { row: nextR, col: nextC };
  if (shift) {
    this.selectCell(newCoords, true, false);
  } else {
    this.setActiveCell(newCoords);
    this.selectCell(newCoords, false, false);
  }

  // Scroll into view
  const cellElement = this.gridRenderer.getCellElementByCoords(nextR, nextC);
  if (cellElement) {
    this.gridRenderer.scrollCellIntoView(cellElement);
  }
}
```

---

## Selection Extension

When Shift is held, selection extends rather than moves:

### Without Shift (Move)
```
Before: A1 selected (active)
Action: Press Down
After:  A2 selected (active), A1 deselected
```

### With Shift (Extend)
```
Before: A1 selected (active)
Action: Press Shift+Down
After:  A1:A2 selected, A1 is active cell
```

```javascript
extendSelection(direction) {
  this.moveSelection(direction, true);  // Pass shift=true
}
```

---

## Mode-Specific Behavior

### EnterMode Navigation

In EnterMode, arrow keys commit the current edit and move:

```javascript
// EnterMode overrides navigation to commit first
handleIntent(intent, context) {
  if (intent === INTENTS.NAVIGATE) {
    // Commit current edit
    this._commitEdit();
    // Then navigate
    return this._handleNavigate(context);
  }
  return super.handleIntent(intent, context);
}
```

### PointMode Navigation

In PointMode (formula building), arrow keys update the formula reference:

```javascript
// PointMode handles navigation differently
handleIntent(intent, context) {
  if (intent === INTENTS.NAVIGATE) {
    // Update formula with new cell reference
    this._updateFormulaReference(context.direction);
    return true;
  }
  return super.handleIntent(intent, context);
}
```

---

## Intent Definitions

```javascript
// js/modes/Intents.js

export const INTENTS = Object.freeze({
  NAVIGATE: 'NAVIGATE',
  JUMP_TO_EDGE: 'JUMP_TO_EDGE',
  // ...
});

export const DIRECTIONS = Object.freeze({
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
});

// Context factory
export function createNavigateContext(direction, shift = false) {
  if (!Object.values(DIRECTIONS).includes(direction)) {
    throw new Error(`Invalid direction: ${direction}`);
  }
  return Object.freeze({ direction, shift });
}
```

---

## Scrolling

When navigation moves the active cell out of view:

```javascript
// GridRenderer.scrollCellIntoView()
scrollCellIntoView(cellElement) {
  cellElement.scrollIntoView({
    block: 'nearest',
    inline: 'nearest',
    behavior: 'auto'  // Instant scroll
  });
}
```

---

## See Also

- Input controller: `/docs/architecture/07-input-controller.md`
- Selection system: `/docs/architecture/08-selection-system.md`
- Mode system: `/docs/architecture/04-mode-system.md`
