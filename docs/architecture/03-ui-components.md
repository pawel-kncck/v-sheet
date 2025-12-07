# UI Components Architecture

This document provides a high-level overview of the UI layer components in v-sheet, focusing on their responsibilities, interactions, and architectural patterns.

**Related Documentation**:
- **System Overview**: [docs/architecture/00-system-overview.md](./00-system-overview.md)
- **Mode System**: [docs/architecture/01-mode-system.md](./01-mode-system.md)
- **Test Scenarios**: [docs/test-scenarios/](../test-scenarios/)

---

## Component Overview

The UI layer consists of five primary components, each with a single, well-defined responsibility:

```
┌─────────────────────────────────────────────────────────┐
│                    Spreadsheet                          │
│              (Top-Level Coordinator)                    │
└───────────────────┬─────────────────────────────────────┘
                    │
        ┌───────────┼───────────┬───────────┬─────────────┐
        │           │           │           │             │
        ▼           ▼           ▼           ▼             ▼
  GridRenderer  SelectionMgr EditorMgr  ClipboardMgr  GridResizer
    (Display)    (Selection)  (Editing)  (Copy/Paste)  (Resize)
```

**Key Principle**: Each component is a **dumb controller** — it manages a specific aspect of the UI but doesn't contain business logic. The **Mode System** orchestrates their behavior.

---

## 1. GridRenderer

**File**: `js/ui/GridRenderer.js`

### Responsibility
Manages the **visual representation** of the spreadsheet grid, including DOM creation, rendering, and styling.

### Core Responsibilities
- Create and maintain grid structure (headers, cells)
- Render cell content and styles
- Apply column/row sizing
- Manage scroll synchronization
- Emit DOM events for user interactions

### Key Concepts

#### Event Emission Pattern
GridRenderer uses an **event emitter pattern** to decouple DOM events from business logic:

```javascript
// GridRenderer emits semantic events
this.emit('cellClick', { cellElement, event });
this.emit('cellDoubleClick', { cellElement, event });
this.emit('headerClick', { type, index, event });
```

**Benefit**: Spreadsheet coordinator can wire events to mode handlers without GridRenderer knowing about modes.

#### Styling System
- Cells styled via CSS Grid layout
- Dynamic column widths and row heights
- Cell formatting applied via inline styles (font, color, alignment)
- Selection borders rendered via overlay divs

#### DOM Structure
```html
<div id="spreadsheet-container">
  <div id="column-headers">  <!-- Column A, B, C... -->
  <div id="row-headers">     <!-- Row 1, 2, 3... -->
  <div id="cell-grid">       <!-- 100x26 cell grid -->
    <div class="cell" data-id="A1" data-row="1" data-col="0"></div>
    ...
  </div>
</div>
```

### Public API (Key Methods)

| Method | Purpose |
|--------|---------|
| `createGrid()` | Initialize grid structure |
| `updateCellContent(cellId, value)` | Set cell display value |
| `updateCellStyle(cellId, style)` | Apply formatting to cell |
| `getCellElement(cellId)` | DOM lookup by cell ID |
| `setColumnWidths(widths)` | Update column sizes |
| `setRowHeights(heights)` | Update row sizes |
| `applyGridStyles()` | Re-render CSS Grid layout |
| `highlightCells(cellIds, className)` | Visual feedback (copy/paste) |
| `clearAllHighlights()` | Remove all visual overlays |

### Interactions
- **Spreadsheet**: Receives initialization config, wires event listeners
- **SelectionManager**: Calls `highlightCells()` to render selection borders
- **EditorManager**: Positions editor overlay based on active cell
- **ClipboardManager**: Uses `highlightCells()` for copy-source feedback
- **GridResizer**: Calls `setColumnWidths()` / `setRowHeights()` after resize
- **FileManager**: Receives column/row sizes for persistence

**Important**: GridRenderer is **read-only** for cell data. It displays what FileManager provides but doesn't store values.

---

## 2. SelectionManager

**File**: `js/ui/SelectionManager.js`

### Responsibility
Manages **selection state** — which cells are selected, the active cell, and selection rendering.

### Core Responsibilities
- Track active cell and selection ranges
- Handle selection logic (single, range, multi-range)
- Render selection borders via GridRenderer
- Provide selection data to other components

### Key Concepts

#### Selection State
```javascript
{
  activeCell: { row: 2, col: 1 },        // Current focus (B2)
  selectionAnchor: { row: 2, col: 1 },   // Range start point
  ranges: [                               // Array of selected regions
    { start: { row: 2, col: 1 }, end: { row: 4, col: 3 } }
  ]
}
```

**Active Cell**: The cell with focus (shows in formula bar)
**Anchor**: Starting point for shift-click range extension
**Ranges**: Support for multi-selection (Cmd+Click)

#### Selection Types
1. **Single Cell**: Click → `ranges = [{ start: B2, end: B2 }]`
2. **Range**: Click B2, Shift+Click D4 → `ranges = [{ start: B2, end: D4 }]`
3. **Multi-Range**: Cmd+Click adds disconnected ranges → `ranges = [range1, range2]`
4. **Header Selection**: Click column/row header → full column/row range

#### Cursor Detection for Drag-and-Drop
SelectionManager provides `getCursorForCell()` to detect when user hovers near selection border (for drag initiation):

```javascript
getCursorForCell(coords, event, cellElement) {
  // Returns 'grab' if near selection edge, 'default' otherwise
}
```

**Used by**: Spreadsheet's mouseover handler to change cursor for drag affordance.

### Public API (Key Methods)

| Method | Purpose |
|--------|---------|
| `selectCell(coords, isShift, isCmd)` | Update selection based on modifiers |
| `selectHeader(type, index, isShift, isCmd)` | Select full column/row |
| `getActiveCellId()` | Returns "B2" format |
| `getSelectedCellIds()` | Array of all selected cell IDs |
| `clear()` | Reset all selection state |
| `render()` | Trigger visual update via GridRenderer |

### Event Callbacks
- `onActiveCellChange(cellId)` — Fired when active cell moves
- `onSelectionChange()` — Fired when ranges change

### Interactions
- **GridRenderer**: Calls `highlightCells()` with selection ranges
- **Spreadsheet**: Listens to callbacks to update formula bar
- **EditorManager**: Uses `activeCell` to position editor
- **ClipboardManager**: Uses `ranges` to determine copy area
- **Modes**: ReadyMode, EnterMode, PointMode all navigate via SelectionManager

**Important**: SelectionManager is **stateful** but doesn't persist. FileManager stores `metadata.lastActiveCell` for session restoration.

---

## 3. EditorManager

**File**: `js/ui/EditorManager.js`

### Responsibility
Manages the **in-cell editor overlay** — a `<textarea>` positioned over the active cell for editing.

### Core Responsibilities
- Position editor overlay above active cell
- Show/hide editor based on mode transitions
- Synchronize editor content with cell value
- Emit value change events for formula bar sync

### Key Concepts

#### "Dumb" Controller Pattern
EditorManager is intentionally simple:
- **No business logic**: Doesn't decide when to show/hide (modes do)
- **No commit logic**: Doesn't handle Enter/Escape (modes do)
- **Just DOM manipulation**: Position, show, hide, get/set value

**Example**:
```javascript
// Mode calls EditorManager
editorManager.startEdit('=SUM(A1:A10)');  // Show editor with formula
// Mode handles Enter key → calls editorManager.getValue() → commits
```

#### Editor Lifecycle
1. **Show**: Mode calls `startEdit(initialValue)` → editor positioned and focused
2. **Edit**: User types → `onValueChange` callback fires → formula bar syncs
3. **Hide**: Mode calls `cancelEdit()` or commits value → editor hidden

#### Positioning Algorithm
Editor positioned based on `SelectionManager.activeCell`:
```javascript
const cellElement = gridRenderer.getCellElement(activeCellId);
const rect = cellElement.getBoundingClientRect();
editorElement.style.left = rect.left + 'px';
editorElement.style.top = rect.top + 'px';
editorElement.style.width = rect.width + 'px';
editorElement.style.height = rect.height + 'px';
```

### Public API (Key Methods)

| Method | Purpose |
|--------|---------|
| `startEdit(initialValue)` | Show editor with text, focus |
| `getValue()` | Get current editor content |
| `setValue(value)` | Update editor content (e.g., formula update in PointMode) |
| `cancelEdit()` | Hide editor without committing |
| `isEditing` | Boolean property, true if editor visible |

### Event Callbacks
- `onValueChange(value)` — Fired on every keystroke (for formula bar sync)

### Interactions
- **Modes**: EditMode, EnterMode, PointMode call startEdit/getValue/cancelEdit
- **FormulaBar**: Syncs with editor via onValueChange callback
- **GridRenderer**: Uses cell positions for overlay placement

**Important**: EditorManager is **stateless** between edit sessions. It doesn't remember previous values.

---

## 4. ClipboardManager

**File**: `js/ui/ClipboardManager.js`

### Responsibility
Manages **clipboard operations** — copy, cut, paste logic and state.

### Core Responsibilities
- Store copied/cut cell data (values and styles)
- Calculate paste target cells based on relative positions
- Write to system clipboard (for external paste)
- Provide visual feedback for copied cells

### Key Concepts

#### Clipboard State
```javascript
{
  data: [                          // Copied cell data
    {
      originalCellId: 'B2',
      value: '100',
      style: { font: { bold: true } },
      relativePos: { row: 0, col: 0 }
    },
    { originalCellId: 'C2', value: '200', relativePos: { row: 0, col: 1 } },
    ...
  ],
  sourceRange: { minRow: 2, maxRow: 3, minCol: 1, maxCol: 2 },
  copiedCellIds: new Set(['B2', 'C2', 'B3', 'C3']),
  isCut: false
}
```

**Key Property**: `relativePos` — Enables paste to arbitrary location with correct layout.

#### Copy Flow
1. User selects range B2:C3, presses Cmd+C
2. ClipboardManager.copy(ranges) called
3. Data extracted from FileManager via dataGetter callback
4. System clipboard written (tab-delimited text)
5. Visual feedback: `copiedCellIds` highlighted with dashed border

#### Paste Flow
1. User selects target cell E5, presses Cmd+V
2. ClipboardManager.getPasteUpdates(targetCell) called
3. Relative positions recalculated:
   ```
   B2 (rel: 0,0) → E5 (target + rel)
   C2 (rel: 0,1) → F5
   B3 (rel: 1,0) → E6
   C3 (rel: 1,1) → F6
   ```
4. Returns updates array: `[{ cellId: 'E5', value: '100', style: {...} }, ...]`
5. Mode creates UpdateCellsCommand and executes

#### Cut Behavior
Cut sets `isCut: true` flag. After paste, source cells are cleared via a compound command.

### Public API (Key Methods)

| Method | Purpose |
|--------|---------|
| `copy(ranges)` | Store cell data, highlight sources |
| `cut(ranges)` | Copy + mark for deletion |
| `paste()` | Return paste updates for active cell |
| `getPasteUpdates(targetCell)` | Calculate paste data for target |
| `clearVisuals()` | Remove copy-source highlighting |

### Interactions
- **FileManager**: dataGetter callback provides cell values and styles
- **SelectionManager**: Uses ranges to determine copy area
- **GridRenderer**: Calls `highlightCells()` for visual feedback
- **Modes**: NavigationMode base class handles copy/paste/cut intents
- **UpdateCellsCommand**: Executes paste changes

**Important**: ClipboardManager is **stateful** (retains clipboard until next copy). Clipboard survives mode transitions.

---

## 5. GridResizer

**File**: `js/ui/GridResizer.js`

### Responsibility
Manages **column and row resizing** via drag interactions on header borders.

### Core Responsibilities
- Detect resize handles on headers
- Track mouse drag for resize delta
- Calculate new sizes
- Emit resize events with new dimensions

### Key Concepts

#### Resize Handle Detection
When user hovers near a header border (within 5px), cursor changes to `col-resize` or `row-resize`:

```javascript
getCursorForHeader(headerElement, event) {
  const rect = headerElement.getBoundingClientRect();
  const distanceFromRightEdge = rect.right - event.clientX;
  return (distanceFromRightEdge <= 5) ? 'col-resize' : 'default';
}
```

#### Resize Flow
1. **Detect**: User hovers near column B's right edge
2. **Start**: Mouse down → `startResize('col', [1], currentWidths, event)`
3. **Drag**: Mouse move → calculate delta → emit `resizeUpdate` with delta
4. **End**: Mouse up → calculate final widths → emit `resizeEnd` with finalSizes
5. **Command**: Spreadsheet creates ResizeCommand and executes

#### Multi-Selection Resize
If multiple columns/rows selected, resize applies to all:
```javascript
startResize('col', [1, 2, 3], currentWidths, event);
// Dragging resizes columns B, C, D together
```

### Public API (Key Methods)

| Method | Purpose |
|--------|---------|
| `getCursorForHeader(element, event)` | Return resize cursor or default |
| `startResize(type, indices, currentSizes, event)` | Begin resize drag |
| `isResizing` | Boolean property, true during drag |
| `justFinishedResizing` | Debounce flag to prevent accidental clicks |

### Event Callbacks
- `onResizeStart({ type, index })` — Fired when drag begins
- `onResizeUpdate({ type, delta })` — Fired during drag (for preview guide)
- `onResizeEnd({ type, finalSizes })` — Fired when drag completes

### Interactions
- **GridRenderer**: Listens for resize events, calls `setColumnWidths()` / `setRowHeights()`
- **ResizeCommand**: Created by Spreadsheet on resizeEnd with old/new sizes (for undo)
- **FileManager**: Persists new sizes via `updateColumnWidths()` / `updateRowHeights()`

**Important**: GridResizer is **stateless** between resize operations. Resize state exists only during active drag.

---

## Component Interaction Patterns

### Pattern 1: Event-Driven Communication
Components communicate via **callbacks and events**, not direct method calls:

```javascript
// GridRenderer emits events
gridRenderer.on('cellClick', ({ cellElement, event }) => {
  const coords = getCoordsFromElement(cellElement);
  selectionManager.selectCell(coords);
});

// SelectionManager emits events
selectionManager.on('activeCellChange', (cellId) => {
  updateFormulaBar(cellId);
});
```

**Benefit**: Loose coupling — components don't know about each other directly.

### Pattern 2: Dependency Injection
Components receive dependencies via constructor:

```javascript
const clipboardManager = new ClipboardManager(
  gridRenderer,        // Dependency 1: For highlighting
  dataGetter,          // Dependency 2: Callback to get cell data
  selectionManager     // Dependency 3: For active cell
);
```

**Benefit**: Easy to test with mocks, clear dependencies.

### Pattern 3: Single Responsibility
Each component has **one job**:
- GridRenderer: Display
- SelectionManager: Track selections
- EditorManager: In-cell editing UI
- ClipboardManager: Clipboard state
- GridResizer: Resize interactions

**Benefit**: Easy to reason about, changes isolated.

### Pattern 4: Dumb Controllers
UI components are **"dumb"** — they don't contain business logic:
- No mode awareness (mode system orchestrates)
- No file operations (FileManager handles persistence)
- No formula calculations (FormulaWorker handles)
- Just UI state and rendering

**Benefit**: Business logic centralized in modes and commands.

---

## Data Flow Examples

### Example 1: Cell Selection Flow
```
User clicks cell B2
  ↓
GridRenderer emits 'cellClick' event
  ↓
Spreadsheet receives event
  ↓
Spreadsheet calls SelectionManager.selectCell({ row: 2, col: 1 })
  ↓
SelectionManager updates internal state (activeCell, ranges)
  ↓
SelectionManager calls GridRenderer.highlightCells(['B2'], 'selection')
  ↓
GridRenderer adds blue border to B2 cell
  ↓
SelectionManager emits 'activeCellChange' event
  ↓
Spreadsheet updates formula bar with B2's content
```

### Example 2: Copy-Paste Flow
```
User selects B2:C3, presses Cmd+C
  ↓
ModeManager delegates COPY intent to ReadyMode
  ↓
ReadyMode calls ClipboardManager.copy(selectionManager.ranges)
  ↓
ClipboardManager:
  - Gets cell data from FileManager via dataGetter
  - Stores in clipboard.data with relative positions
  - Writes to system clipboard (tab-delimited)
  - Calls GridRenderer.highlightCells(['B2', 'C2', 'B3', 'C3'], 'copy-source')
  ↓
User selects E5, presses Cmd+V
  ↓
ModeManager delegates PASTE intent to ReadyMode
  ↓
ReadyMode calls ClipboardManager.paste()
  ↓
ClipboardManager:
  - Calculates target cells (E5, F5, E6, F6) using relative positions
  - Returns updates array
  ↓
ReadyMode creates UpdateCellsCommand with updates
  ↓
HistoryManager.execute(command)
  ↓
UpdateCellsCommand:
  - Updates FileManager
  - Posts message to FormulaWorker
  - Calls GridRenderer.updateCellContent() for each cell
  ↓
ClipboardManager.clearVisuals() removes copy-source border
```

### Example 3: Column Resize Flow
```
User hovers near column B's right edge
  ↓
GridRenderer emits 'headerMouseMove' event
  ↓
Spreadsheet calls GridResizer.getCursorForHeader(headerElement, event)
  ↓
GridResizer returns 'col-resize'
  ↓
Spreadsheet sets headerElement.style.cursor = 'col-resize'
  ↓
User drags (mouse down → move → up)
  ↓
Spreadsheet calls GridResizer.startResize('col', [1], currentWidths, event)
  ↓
GridResizer emits 'resizeStart' → Spreadsheet shows resize guide
  ↓
GridResizer emits 'resizeUpdate' with delta → Guide updates
  ↓
GridResizer emits 'resizeEnd' with finalSizes
  ↓
Spreadsheet creates ResizeCommand({ type: 'col', newSizes, oldSizes })
  ↓
HistoryManager.execute(command)
  ↓
ResizeCommand:
  - Calls GridRenderer.setColumnWidths(newSizes)
  - Calls FileManager.updateColumnWidths(newSizes)
  ↓
GridRenderer.applyGridStyles() re-renders CSS Grid
```

---

## Testing Strategy

### Unit Testing UI Components

Each component should be testable in isolation:

**GridRenderer Tests**:
- createGrid() builds correct DOM structure
- updateCellContent() sets cell text
- updateCellStyle() applies CSS correctly
- Event emission works (cellClick, cellDoubleClick)

**SelectionManager Tests**:
- selectCell() updates ranges correctly
- Shift+click extends selection
- Cmd+click adds disconnected range
- getSelectedCellIds() returns correct cells

**EditorManager Tests**:
- startEdit() shows editor and focuses
- getValue() returns current text
- setValue() updates content
- isEditing flag works

**ClipboardManager Tests**:
- copy() stores correct data with relative positions
- paste() calculates correct target cells
- cut() sets isCut flag
- System clipboard integration

**GridResizer Tests**:
- getCursorForHeader() detects resize zone
- Resize delta calculation correct
- Multi-column resize works

### Integration Testing

E2E tests verify component interactions:
- See [test-scenarios/navigation.scenarios.md](../test-scenarios/navigation.scenarios.md)
- See [test-scenarios/selection-clipboard.scenarios.md](../test-scenarios/selection-clipboard.scenarios.md)

---

## Extension Points

### Adding New Visual Feedback
To add new cell highlighting (e.g., search results):
1. Add CSS class to `styles.css`
2. Call `GridRenderer.highlightCells(cellIds, 'search-result')`
3. Use `GridRenderer.clearHighlights('search-result')` to remove

### Adding New Selection Types
To support formula range highlighting:
1. Add range type to SelectionManager
2. Render with different color via `highlightCells()`
3. Mode system decides when to activate

### Adding Editor Features
To add autocomplete to editor:
1. Extend EditorManager with autocomplete logic
2. Add event listeners for arrow keys
3. Emit selection events for mode handling

**Principle**: Keep UI components focused on UI concerns. Business logic goes in modes/commands.

---

## Common Pitfalls

### ❌ Don't: Put Business Logic in UI Components
```javascript
// BAD: EditorManager shouldn't know about formulas
class EditorManager {
  handleEnter() {
    if (this.value.startsWith('=')) {
      // Parse formula, send to worker... NO!
    }
  }
}
```

**Solution**: Modes handle Enter key, decide what to do with editor value.

### ❌ Don't: Bypass Event System
```javascript
// BAD: Direct coupling
gridRenderer.cellClickHandler = () => {
  selectionManager.selectCell(...);  // GridRenderer knows about SelectionManager
};
```

**Solution**: Emit events, let Spreadsheet coordinator wire them.

### ❌ Don't: Store Persistent State in UI
```javascript
// BAD: ClipboardManager shouldn't store cell values permanently
class ClipboardManager {
  permanentStorage = {};  // This should be in FileManager
}
```

**Solution**: UI components have **ephemeral state** (clipboard, selection). FileManager has **persistent state**.

---

## Summary

The UI layer follows these principles:

1. **Single Responsibility**: Each component has one job
2. **Dumb Controllers**: No business logic, just UI state
3. **Event-Driven**: Loose coupling via callbacks
4. **Dependency Injection**: Clear dependencies
5. **Stateless Where Possible**: GridRenderer, EditorManager, GridResizer are stateless
6. **Ephemeral State**: SelectionManager, ClipboardManager have transient state
7. **Mode Orchestration**: Modes decide when to use UI components

This architecture makes the system:
- **Testable**: Components can be tested in isolation
- **Maintainable**: Changes localized to single components
- **Extensible**: New features added without breaking existing code
- **Debuggable**: Clear data flow, easy to trace bugs

---

## Related Files

- **GridRenderer**: `js/ui/GridRenderer.js`
- **SelectionManager**: `js/ui/SelectionManager.js`
- **EditorManager**: `js/ui/EditorManager.js`
- **ClipboardManager**: `js/ui/ClipboardManager.js`
- **GridResizer**: `js/ui/GridResizer.js`
- **Spreadsheet Coordinator**: `js/spreadsheet.js`
