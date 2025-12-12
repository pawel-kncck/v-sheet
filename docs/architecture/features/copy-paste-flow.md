# Feature Walkthrough: Copy and Paste

**Primary Actor**: User
**Goal**: Copy cells and paste them to a new location, with formula references adjusted automatically

---

## Overview

Copy-paste in v-sheet:
1. Copies both **values and styles**
2. Adjusts **relative formula references** (A1 → A2 when pasting one row down)
3. Supports **fill-range behavior** (single cell pasted to selection fills the selection)
4. Integrates with **system clipboard** for external paste
5. Is **undo-able** via the command pattern

---

## 1. The Trigger (UI Layer)

### Copy

* **Event**: User presses Ctrl+C (Cmd+C on Mac)
* **Handler**: `InputController.js` → `_handleKeyDown()`
* **Intent**: `COPY`

### Paste

* **Event**: User presses Ctrl+V (Cmd+V on Mac)
* **Handler**: `InputController.js` → `_handleKeyDown()`
* **Intent**: `PASTE`

### Cut

* **Event**: User presses Ctrl+X (Cmd+X on Mac)
* **Handler**: `InputController.js` → `_handleKeyDown()`
* **Intent**: `CUT`

---

## 2. Copy Flow

```
User presses Ctrl+C
    │
    ▼
InputController creates COPY intent
    │
    ▼
ModeManager.handleIntent(COPY)
    │
    ▼
ReadyMode._handleCopy() [via NavigationMode]
    │
    ▼
ClipboardManager.copy(ranges)
    │
    ├─► 1. Clear previous copy visuals
    │       clearVisuals()
    │
    ├─► 2. Get selected ranges from SelectionManager
    │       Primary range: { start: {row: 0, col: 0}, end: {row: 1, col: 1} }
    │
    ├─► 3. For each cell in range:
    │       │
    │       ├─► dataGetter(cellId) → { value, style }
    │       │   // Gets both value AND resolved style object
    │       │
    │       └─► Store in clipboard.data:
    │           {
    │             originalCellId: 'A1',
    │             value: '=B1+C1',
    │             style: { font: { bold: true } },
    │             relativePos: { row: 0, col: 0 }
    │           }
    │
    ├─► 4. Store source range info
    │       clipboard.sourceRange = { minRow, maxRow, minCol, maxCol }
    │
    ├─► 5. Add visual highlight (marching ants)
    │       renderer.highlightCells(cellIds, 'copy-source')
    │
    └─► 6. Write to system clipboard
            navigator.clipboard.writeText(tabSeparatedValues)
```

### Clipboard Data Structure

```javascript
clipboard = {
  data: [
    { originalCellId: 'A1', value: '10', style: {...}, relativePos: {row:0, col:0} },
    { originalCellId: 'B1', value: '20', style: {...}, relativePos: {row:0, col:1} },
    { originalCellId: 'A2', value: '=A1*2', style: null, relativePos: {row:1, col:0} },
    { originalCellId: 'B2', value: '=B1*2', style: null, relativePos: {row:1, col:1} }
  ],
  sourceRange: { minRow: 0, maxRow: 1, minCol: 0, maxCol: 1 },
  copiedCellIds: Set(['A1', 'B1', 'A2', 'B2']),
  isCut: false
}
```

---

## 3. Paste Flow

```
User navigates to D5, presses Ctrl+V
    │
    ▼
InputController creates PASTE intent
    │
    ▼
ModeManager.handleIntent(PASTE)
    │
    ▼
ReadyMode._handlePaste() [via NavigationMode]
    │
    ▼
ClipboardManager.getPasteUpdates(targetCell, targetSelection)
    │
    ├─► 1. Calculate offset
    │       Source: A1 (row 0, col 0)
    │       Target: D5 (row 4, col 3)
    │       Offset: row +4, col +3
    │
    ├─► 2. For each copied cell:
    │       │
    │       ├─► Calculate destination
    │       │   A1 → D5 (relativePos 0,0 + target 4,3)
    │       │   B1 → E5
    │       │   A2 → D6
    │       │   B2 → E6
    │       │
    │       ├─► Adjust formula references
    │       │   '=A1*2' with offset (4,3)
    │       │   → FormulaAdjuster.adjustFormula('=A1*2', 4, 3)
    │       │   → '=D5*2'
    │       │
    │       └─► Create update object
    │           { cellId: 'D6', value: '=D5*2', style: {...} }
    │
    └─► Return updates array
            │
            ▼
Mode creates UpdateCellsCommand
    │
    ▼
HistoryManager.execute(command)
    │
    ├─► command.execute()
    │   ├─► FileManager.updateCell() for each cell
    │   ├─► FileManager.updateCellFormat() for styles
    │   └─► FormulaWorker.postMessage() for formulas
    │
    └─► ClipboardManager.clearVisuals()
            Removes marching ants from source cells
```

---

## 4. Formula Reference Adjustment

### The FormulaAdjuster

When a formula is pasted, relative references are adjusted based on the offset:

```javascript
// Original formula in A1: =B1+C1
// Paste target: D5 (offset: row +4, col +3)

FormulaAdjuster.adjustFormula('=B1+C1', 4, 3)

// Process:
// B1 → column B (1) + 3 = E, row 1 + 4 = 5 → E5
// C1 → column C (2) + 3 = F, row 1 + 4 = 5 → F5

// Result: =E5+F5
```

### Absolute References

Absolute references (with `$`) are NOT adjusted:

```javascript
// Original: =$A$1+B1
// Paste with offset (4, 3)

// $A$1 → $A$1 (unchanged - both row and col are absolute)
// B1 → E5 (adjusted - both are relative)

// Result: =$A$1+E5
```

### Mixed References

```javascript
// Original: =$A1+B$1
// Paste with offset (4, 3)

// $A1 → $A5 (column absolute, row relative)
// B$1 → E$1 (column relative, row absolute)

// Result: =$A5+E$1
```

---

## 5. Fill-Range Behavior

When a **single cell** is copied and pasted to a **multi-cell selection**, it fills the entire selection:

```
User copies A1 (contains "=A1*2")
User selects D1:D5
User presses Ctrl+V
    │
    ▼
ClipboardManager.getPasteUpdates()
    │
    ├─► Detects: single cell copied, multi-cell target
    │
    └─► For each cell in target selection:
            D1: =D1*2 (offset 0)
            D2: =D2*2 (offset 1)
            D3: =D3*2 (offset 2)
            D4: =D4*2 (offset 3)
            D5: =D5*2 (offset 4)
```

---

## 6. Cut Operation

Cut is Copy + mark for deletion:

```
User presses Ctrl+X
    │
    ▼
ClipboardManager.cut(ranges)
    │
    ├─► 1. Perform copy()
    │
    └─► 2. Set clipboard.isCut = true
```

After paste with cut:
- Source cells are cleared
- Paste operation includes clearing source

---

## 7. Style Copying

Styles are copied along with values:

```javascript
// Source cell A1:
// - Value: "Hello"
// - Style: { font: { bold: true }, fill: { color: '#FFFF00' } }

// After paste to B2:
// - B2 value: "Hello"
// - B2 style: { font: { bold: true }, fill: { color: '#FFFF00' } }
```

The StyleManager may reuse existing styleIds or create new ones based on deduplication.

---

## 8. System Clipboard Integration

### Writing to System Clipboard

When copying, values are written as tab-separated text:

```javascript
// Copied range A1:B2:
// A1: "10", B1: "20"
// A2: "30", B2: "40"

// System clipboard text:
"10\t20\n30\t40"
```

### Reading from System Clipboard

External paste (from other applications) uses the system clipboard text, parsed as tab-separated values.

---

## Key Files

| Layer | File | Responsibility |
|-------|------|----------------|
| Trigger | `js/ui/InputController.js` | Captures Ctrl+C/V/X |
| Mode | `js/modes/NavigationMode.js` | Handles COPY/PASTE/CUT intents |
| Clipboard | `js/ui/ClipboardManager.js` | Copy/paste logic, formula adjustment |
| Formula | `js/engine/utils/FormulaAdjuster.js` | Reference adjustment |
| History | `js/history/commands/UpdateCellsCommand.js` | Undo-able paste |
| View | `js/ui/GridRenderer.js` | Visual highlights (marching ants) |

---

## Visual Feedback

### Copy Source Highlight

After copying, source cells get a dashed border ("marching ants"):

```css
.copy-source {
  border: 2px dashed #4a90d9;
  animation: marching-ants 1s linear infinite;
}
```

### Clear on Paste

The highlight is removed when:
- User pastes (after paste completes)
- User copies different cells
- User presses Escape

---

## Error Handling

### Out of Bounds

Paste is clipped if it would exceed grid boundaries:

```javascript
// Pasting 5x5 range starting at column X (25th column)
// Only columns X, Y, Z get pasted (columns beyond Z are skipped)
if (destCol >= 26) return; // Skip this cell
```

---

## See Also

- Mode system: `/docs/architecture/01-mode-system.md`
- Formula adjustment: `/docs/architecture/02-formula-engine.md`
- Styling system: `/docs/architecture/06-styling-system.md`
- User workflows: `/docs/manuals/user-workflows.md` (Copy and Paste)
- Test scenarios: `/docs/manuals/test-scenarios/selection-clipboard.scenarios.md`
