# Feature Walkthrough: Cell Editing

**Primary Actor**: User
**Goal**: Enter or modify cell content

---

## Overview

Cell editing in v-sheet involves two distinct modes:

1. **EnterMode**: Quick data entry - arrow keys commit and move
2. **EditMode**: Fine-tuned editing - arrow keys move text cursor

This document traces the flow from initial keypress to committed value.

---

## 1. The Trigger (UI Layer)

### Scenario A: Quick Entry (Type a Character)

* **Event**: User presses a regular character key (e.g., "5", "a")
* **Handler**: `InputController.js` → `_handleKeyDown()`
* **Intent**: `INPUT` with context `{ char: '5' }`

### Scenario B: Fine-Tuned Edit (Press F2)

* **Event**: User presses F2 on a cell with existing content
* **Handler**: `InputController.js` → `_handleKeyDown()`
* **Intent**: `EDIT_START` with context `{ source: 'keyboard' }`

### Scenario C: Double-Click Edit

* **Event**: User double-clicks a cell
* **Handler**: `GridRenderer.js` → double-click handler
* **Intent**: `EDIT_START` with context `{ source: 'mouse' }`

---

## 2. Mode Transitions

### Quick Entry Flow (EnterMode)

```
ReadyMode
    │
    │ User types "5"
    │ Intent: INPUT { char: '5' }
    │
    ▼
ReadyMode._handleInput()
    │
    │ Detects regular character (not formula trigger)
    │ Calls editorManager.startEdit('A1', '5')
    │
    ▼
ModeManager.switchMode('enter')
    │
    │ ReadyMode.onExit()
    │ EnterMode.onEnter({ cellId: 'A1', triggerKey: '5' })
    │
    ▼
EnterMode
    │
    │ Editor shows "5"
    │ User can continue typing
    │ Arrow keys will COMMIT then MOVE
```

### Fine-Tuned Edit Flow (EditMode)

```
ReadyMode
    │
    │ User presses F2
    │ Intent: EDIT_START
    │
    ▼
ReadyMode._handleEditStart()
    │
    │ Gets current cell value from FileManager
    │ Calls editorManager.startEdit('A1', 'existing value')
    │
    ▼
ModeManager.switchMode('edit')
    │
    │ ReadyMode.onExit()
    │ EditMode.onEnter({ cellId: 'A1', initialValue: 'existing value' })
    │
    ▼
EditMode
    │
    │ Editor shows existing content
    │ Cursor at end of text
    │ Arrow keys move TEXT CURSOR (not grid selection)
```

---

## 3. Key Behavioral Differences

### EnterMode Behavior

```
EnterMode active, cell shows "123"
    │
    │ User presses ArrowRight
    │
    ▼
EnterMode._handleNavigateWithCommit()
    │
    ├─► 1. Commit: Save "123" to cell
    │       executeCellUpdate('A1', '123')
    │
    ├─► 2. Navigate: Move selection right
    │       selectionManager.moveSelection('right')
    │
    └─► 3. Switch to ReadyMode
            requestModeSwitch('ready')
```

**Key Feature**: Arrow keys perform TWO actions - commit AND move.

### EditMode Behavior

```
EditMode active, cell shows "Hello World"
                           cursor here: ^
    │
    │ User presses ArrowRight
    │
    ▼
EditMode.handleIntent(NAVIGATE)
    │
    │ Returns FALSE (not handled)
    │
    ▼
Browser handles ArrowRight
    │
    │ Text cursor moves right
    │ "Hello World"
    │          cursor now: ^
```

**Key Feature**: Arrow keys move text cursor, not grid selection.

---

## 4. The Commit Flow

When the user commits an edit (Enter, Tab, or arrow key in EnterMode):

```
Mode._handleCommit()
    │
    ├─► 1. Get value from EditorManager
    │       const newValue = editorManager.getValue()
    │       // "123"
    │
    ├─► 2. Execute cell update
    │       context.executeCellUpdate('A1', '123')
    │           │
    │           ▼
    │       Creates UpdateCellsCommand
    │           │
    │           ▼
    │       HistoryManager.execute(command)
    │           │
    │           ▼
    │       command.execute()
    │           ├─► FileManager.updateCell('A1', '123')
    │           └─► FormulaWorker.postMessage({ type: 'setValue', ... })
    │
    ├─► 3. Hide editor
    │       editorManager.hide()
    │
    ├─► 4. Move selection (if Enter/Tab)
    │       selectionManager.moveSelection('down') // or 'right' for Tab
    │
    └─► 5. Switch to ReadyMode
            requestModeSwitch('ready')
```

---

## 5. Formula Worker Processing

If the value is a formula (starts with "="):

```
FormulaWorker receives: { type: 'setValue', cellId: 'A1', value: '=B1+C1' }
    │
    ├─► 1. Tokenize
    │       "=B1+C1" → [CELL_REF(B1), OPERATOR(+), CELL_REF(C1)]
    │
    ├─► 2. Parse
    │       Tokens → AST: { type: 'operator', op: '+', left: B1, right: C1 }
    │
    ├─► 3. Update Dependencies
    │       DependencyGraph: A1 depends on [B1, C1]
    │
    ├─► 4. Evaluate
    │       B1=10, C1=20 → Result: 30
    │
    └─► 5. Return updates
            postMessage({ type: 'updates', cells: { A1: 30 } })
```

---

## 6. Visual Rendering

```
Main thread receives worker response
    │
    ├─► FileManager.updateCells({ A1: 30 })
    │       Updates internal cell data
    │
    └─► GridRenderer.updateCellContent('A1', '30')
            Updates DOM: cell element text = "30"
```

---

## 7. Cancel Flow

When user presses Escape:

```
Mode._handleCancel()
    │
    ├─► 1. Restore original value (EditMode only)
    │       editorManager.setValue(originalValue)
    │
    ├─► 2. Hide editor
    │       editorManager.hide()
    │
    └─► 3. Switch to ReadyMode
            requestModeSwitch('ready')
            // No commit, no history entry
```

---

## 8. F2: EnterMode → EditMode

User can switch from quick entry to fine-tuned editing:

```
EnterMode active, user typed "Helo"
    │
    │ User presses F2 (to fix typo)
    │
    ▼
EnterMode._handleSwitchToEdit()
    │
    ├─► Get current editor value: "Helo"
    ├─► Get cursor position: 4 (end)
    │
    └─► requestModeSwitch('edit', {
            cellId: 'A1',
            initialValue: 'Helo',
            cursorPosition: 4
        })
            │
            ▼
        EditMode.onEnter()
            │
            │ Editor still shows "Helo"
            │ Cursor at position 4
            │ User can now use arrow keys to move cursor
            │ and fix the typo
```

---

## Key Files

| Layer | File | Responsibility |
|-------|------|----------------|
| Trigger | `js/ui/InputController.js` | Captures key events, creates intents |
| Mode | `js/modes/EnterMode.js` | Quick entry, commit-then-move |
| Mode | `js/modes/EditMode.js` | Fine-tuned editing, cursor control |
| Mode | `js/modes/ReadyMode.js` | Detects entry triggers |
| Editor | `js/ui/EditorManager.js` | DOM control for editor element |
| History | `js/history/commands/UpdateCellsCommand.js` | Undo-able cell update |
| Engine | `js/engine/formula-worker.js` | Formula evaluation |

---

## EditorManager: The "Dumb" Controller

EditorManager has NO business logic. It only:

- Shows/hides the editor element
- Positions editor over the active cell
- Gets/sets editor content
- Manages focus

All decisions (when to commit, what mode to switch to) are made by modes.

```javascript
// EditorManager methods
editorManager.startEdit(cellId, initialValue);  // Position and show
editorManager.getValue();                        // Get current text
editorManager.setValue(text);                    // Set text
editorManager.hide();                            // Hide editor
editorManager.focus();                           // Focus for typing
```

---

## See Also

- Mode system: `/docs/architecture/01-mode-system.md`
- Formula building: `/docs/architecture/features/formula-building.md`
- User workflows: `/docs/manuals/user-workflows.md`
- Test scenarios: `/docs/manuals/test-scenarios/data-entry.scenarios.md`
