# Feature Walkthrough: Cell Selection

**Primary Actor**: User
**Goal**: Select cells for editing, formatting, or copying

---

## Overview

v-sheet supports multiple selection patterns:
- Single cell selection (click)
- Range selection (Shift+click or drag)
- Multi-range selection (Ctrl+click)
- Row/column selection (header click)
- Keyboard selection (arrow keys with/without Shift)
- Jump to edge (Ctrl+Arrow)
- Select all (Ctrl+A)

---

## 1. Single Cell Selection

### Trigger

* **Event**: User clicks a cell
* **Handler**: `InputController.js` → `_handleMouseDown()`
* **Intent**: `CELL_SELECT` with context `{ coords, shift: false, ctrl: false }`

### Flow

```
User clicks cell B3
    │
    ▼
InputController._handleMouseDown(event)
    │
    ├─► Find cell element: event.target.closest('.cell')
    ├─► Extract coords: { row: 2, col: 1 }
    │
    ▼
ModeManager.handleIntent(CELL_SELECT, { coords, shift: false, ctrl: false })
    │
    ▼
ReadyMode._handleCellSelect(context) [or current mode]
    │
    ▼
SelectionManager.selectCell(coords, false, false)
    │
    ├─► 1. Set activeCell = { row: 2, col: 1 }
    ├─► 2. Clear existing ranges
    ├─► 3. Set ranges = [{ start: B3, end: B3 }]
    ├─► 4. Set selectionAnchor = { row: 2, col: 1 }
    │
    ▼
SelectionManager.render()
    │
    └─► Draw selection border around B3
```

---

## 2. Range Selection (Shift+Click)

### Trigger

* **Event**: User Shift+clicks a cell
* **Intent**: `CELL_SELECT` with context `{ coords, shift: true, ctrl: false }`

### Flow

```
Selection is at B3, user Shift+clicks D5
    │
    ▼
SelectionManager.selectCell({ row: 4, col: 3 }, true, false)
    │
    ├─► 1. Keep activeCell = B3 (anchor)
    ├─► 2. Update ranges to include B3:D5
    │       ranges = [{ start: {row:2, col:1}, end: {row:4, col:3} }]
    │
    ▼
SelectionManager.render()
    │
    └─► Draw selection rectangle from B3 to D5
        B3 has "active cell" styling
        B3:D5 range has "selected" styling
```

### Visual Result

```
    A    B    C    D    E
1
2        ┌────────────┐
3        │ B3 │    │    │
4        │    │    │    │
5        │    │    │ D5 │
         └────────────┘
```

---

## 3. Multi-Range Selection (Ctrl+Click)

### Trigger

* **Event**: User Ctrl+clicks a cell
* **Intent**: `CELL_SELECT` with context `{ coords, shift: false, ctrl: true }`

### Flow

```
Selection is B3:D5, user Ctrl+clicks G2
    │
    ▼
SelectionManager.selectCell({ row: 1, col: 6 }, false, true)
    │
    ├─► 1. Set activeCell = G2 (new anchor)
    ├─► 2. Keep existing ranges, ADD new range
    │       ranges = [
    │         { start: B3, end: D5 },
    │         { start: G2, end: G2 }  // New
    │       ]
    │
    ▼
SelectionManager.render()
    │
    └─► Draw both selection rectangles
```

---

## 4. Keyboard Navigation

### Arrow Key Movement

```
User presses ArrowRight (no modifiers)
    │
    ▼
InputController creates NAVIGATE intent
    { direction: 'right', shift: false }
    │
    ▼
ReadyMode delegates to NavigationMode._handleNavigate()
    │
    ▼
SelectionManager.moveSelection('right', false)
    │
    ├─► Calculate new position: current + direction
    │   activeCell was B3, new = C3
    │
    ├─► Update activeCell = C3
    ├─► Clear ranges, set to single cell
    │
    ▼
SelectionManager.render()
```

### Extend Selection (Shift+Arrow)

```
User presses Shift+ArrowRight
    │
    ▼
InputController creates NAVIGATE intent
    { direction: 'right', shift: true }
    │
    ▼
SelectionManager.moveSelection('right', true)
    │
    ├─► Keep anchor at original position
    ├─► Extend range end in direction
    │   Original: B3:B3
    │   New: B3:C3
    │
    ▼
SelectionManager.render()
```

### Jump to Edge (Ctrl+Arrow)

```
User presses Ctrl+ArrowDown
    │
    ▼
InputController creates JUMP_TO_EDGE intent
    { direction: 'down', shift: false }
    │
    ▼
NavigationMode._handleJumpToEdge()
    │
    ▼
SelectionManager.jumpToEdge('down', false)
    │
    ├─► Find edge using data boundary detection
    │   If current cell is empty: jump to first non-empty
    │   If current cell has data: jump to last before empty
    │
    └─► Update selection to new position
```

---

## 5. Row/Column Header Selection

### Trigger

* **Event**: User clicks row number or column letter
* **Intent**: `HEADER_SELECT` with context `{ type: 'row'|'col', index }`

### Flow

```
User clicks row header "3"
    │
    ▼
ModeManager.handleIntent(HEADER_SELECT, { type: 'row', index: 2 })
    │
    ▼
ReadyMode._handleHeaderSelect()
    │
    ▼
SelectionManager.selectHeader('row', 2)
    │
    ├─► Set activeCell = { row: 2, col: 0 }  (first cell in row)
    ├─► Set ranges to cover entire row
    │       { start: {row:2, col:0}, end: {row:2, col:25} }
    │
    ▼
SelectionManager.render()
    │
    └─► Highlight entire row 3
```

---

## 6. Select All (Ctrl+A)

```
User presses Ctrl+A
    │
    ▼
ModeManager.handleIntent(SELECT_ALL)
    │
    ▼
NavigationMode._handleSelectAll()
    │
    ▼
SelectionManager.selectAll()
    │
    ├─► Set activeCell = A1
    ├─► Set ranges to cover all cells
    │       { start: {row:0, col:0}, end: {row:99, col:25} }
    │
    ▼
SelectionManager.render()
```

---

## 7. Selection State

### SelectionManager Properties

```javascript
class SelectionManager {
  activeCell: { row: number, col: number }  // Current "cursor"
  selectionAnchor: { row: number, col: number }  // Start of range
  ranges: Array<{
    start: { row: number, col: number },
    end: { row: number, col: number }
  }>
}
```

### State Examples

**Single cell B3 selected:**
```javascript
activeCell: { row: 2, col: 1 }
selectionAnchor: { row: 2, col: 1 }
ranges: [{ start: {row:2, col:1}, end: {row:2, col:1} }]
```

**Range B3:D5 selected:**
```javascript
activeCell: { row: 2, col: 1 }  // Still at anchor
selectionAnchor: { row: 2, col: 1 }
ranges: [{ start: {row:2, col:1}, end: {row:4, col:3} }]
```

**Multi-range B3:D5 and G2 selected:**
```javascript
activeCell: { row: 1, col: 6 }  // At G2 (most recent)
selectionAnchor: { row: 1, col: 6 }
ranges: [
  { start: {row:2, col:1}, end: {row:4, col:3} },
  { start: {row:1, col:6}, end: {row:1, col:6} }
]
```

---

## 8. Edge Detection Algorithm

For Ctrl+Arrow "jump to edge":

```javascript
findEdge(direction) {
  let current = this.activeCell;
  let currentValue = this.getCellValue(current);

  // Case 1: Current cell is empty → find first non-empty
  if (isEmpty(currentValue)) {
    while (inBounds(next(current, direction))) {
      current = next(current, direction);
      if (!isEmpty(this.getCellValue(current))) {
        return current;
      }
    }
    return current; // Hit grid boundary
  }

  // Case 2: Current cell has data → find last before empty
  while (inBounds(next(current, direction))) {
    const nextCell = next(current, direction);
    if (isEmpty(this.getCellValue(nextCell))) {
      return current; // Stop at last filled cell
    }
    current = nextCell;
  }
  return current; // Hit grid boundary
}
```

---

## 9. Visual Rendering

### Selection Border

```css
.cell.selected {
  background-color: rgba(0, 102, 204, 0.1);
}

.cell.active-cell {
  outline: 2px solid #0066cc;
}
```

### Selection Overlay

SelectionManager creates overlay elements for selection borders:

```javascript
render() {
  // Clear previous overlays
  this.clearOverlays();

  // Draw selection rectangle for each range
  for (const range of this.ranges) {
    const bounds = this.calculateBounds(range);
    this.drawSelectionBorder(bounds);
  }

  // Draw active cell indicator
  this.drawActiveCellBorder(this.activeCell);
}
```

---

## Key Files

| Layer | File | Responsibility |
|-------|------|----------------|
| Trigger | `js/ui/InputController.js` | Mouse click handling |
| Mode | `js/modes/NavigationMode.js` | Navigation handlers |
| Mode | `js/modes/ReadyMode.js` | Cell selection handler |
| Selection | `js/ui/SelectionManager.js` | Selection state and rendering |

---

## Selection Callbacks

SelectionManager notifies listeners of selection changes:

```javascript
selectionManager.onSelectionChange = (ranges) => {
  // Update toolbar button states
  toolbar.updateForSelection(ranges);
};

selectionManager.onActiveCellChange = (cellId) => {
  // Update formula bar
  formulaBar.displayCell(cellId);
};
```

---

## See Also

- Mode system: `/docs/architecture/01-mode-system.md`
- UI components: `/docs/architecture/03-ui-components.md`
- User workflows: `/docs/manuals/user-workflows.md` (Range Selection)
- Test scenarios: `/docs/manuals/test-scenarios/navigation.scenarios.md`
