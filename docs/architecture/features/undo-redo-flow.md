# Feature Walkthrough: Undo/Redo

**Primary Actor**: User
**Goal**: Revert or reapply changes using undo/redo

---

## Overview

v-sheet uses the **Command Pattern** for undo/redo:
- Every state-changing operation is wrapped in a Command object
- Commands implement `execute()` and `undo()` methods
- HistoryManager maintains undo and redo stacks
- Up to 100 operations can be undone

---

## 1. The Trigger (UI Layer)

### Undo

* **Event**: User presses Ctrl+Z (Cmd+Z on Mac)
* **Handler**: `InputController.js` → `_handleKeyDown()`
* **Intent**: `UNDO`

### Redo

* **Event**: User presses Ctrl+Y or Ctrl+Shift+Z
* **Handler**: `InputController.js` → `_handleKeyDown()`
* **Intent**: `REDO`

---

## 2. Command Execution Flow (Initial Action)

Before understanding undo, we need to see how commands are created:

```
User types "Hello" in A1 and presses Enter
    │
    ▼
EnterMode._handleCommit()
    │
    ▼
context.executeCellUpdate('A1', 'Hello')
    │
    ▼
Creates UpdateCellsCommand:
    {
      cellUpdates: [{
        cellId: 'A1',
        newValue: 'Hello',
        oldValue: ''  // Captured for undo
      }]
    }
    │
    ▼
HistoryManager.execute(command)
    │
    ├─► 1. Call command.execute()
    │       ├─► FileManager.updateCell('A1', 'Hello')
    │       └─► FormulaWorker.postMessage(...)
    │
    ├─► 2. Push command to undoStack
    │       undoStack.push(command)
    │
    └─► 3. Clear redoStack
            redoStack = []  // New action clears redo
```

---

## 3. Undo Flow

```
User presses Ctrl+Z
    │
    ▼
InputController creates UNDO intent
    │
    ▼
ModeManager.handleIntent(UNDO)
    │
    ▼
ReadyMode._handleUndo() [via NavigationMode]
    │
    ▼
HistoryManager.undo()
    │
    ├─► 1. Check if undo is possible
    │       if (undoStack.length === 0) return false;
    │
    ├─► 2. Pop command from undoStack
    │       const command = undoStack.pop();
    │
    ├─► 3. Call command.undo()
    │       │
    │       ▼
    │   UpdateCellsCommand.undo()
    │       ├─► For each cellUpdate:
    │       │       FileManager.updateCell(cellId, oldValue)
    │       │       FormulaWorker.postMessage(...)
    │       │
    │       └─► GridRenderer.updateCellContent(cellId, oldValue)
    │
    └─► 4. Push command to redoStack
            redoStack.push(command);
```

---

## 4. Redo Flow

```
User presses Ctrl+Y
    │
    ▼
InputController creates REDO intent
    │
    ▼
ModeManager.handleIntent(REDO)
    │
    ▼
ReadyMode._handleRedo() [via NavigationMode]
    │
    ▼
HistoryManager.redo()
    │
    ├─► 1. Check if redo is possible
    │       if (redoStack.length === 0) return false;
    │
    ├─► 2. Pop command from redoStack
    │       const command = redoStack.pop();
    │
    ├─► 3. Call command.execute() again
    │       │
    │       ▼
    │   UpdateCellsCommand.execute()
    │       ├─► For each cellUpdate:
    │       │       FileManager.updateCell(cellId, newValue)
    │       │       FormulaWorker.postMessage(...)
    │       │
    │       └─► GridRenderer.updateCellContent(cellId, newValue)
    │
    └─► 4. Push command back to undoStack
            undoStack.push(command);
```

---

## 5. Stack Management

### State After Multiple Operations

```
User actions:
1. Type "A" in A1
2. Type "B" in B1
3. Type "C" in C1

Stack state:
undoStack: [Cmd(A1=A), Cmd(B1=B), Cmd(C1=C)]
redoStack: []

User presses Ctrl+Z twice:
undoStack: [Cmd(A1=A)]
redoStack: [Cmd(C1=C), Cmd(B1=B)]

Cell values: A1="A", B1="", C1=""

User presses Ctrl+Y once:
undoStack: [Cmd(A1=A), Cmd(B1=B)]
redoStack: [Cmd(C1=C)]

Cell values: A1="A", B1="B", C1=""

User types "D" in D1:
undoStack: [Cmd(A1=A), Cmd(B1=B), Cmd(D1=D)]
redoStack: []  // Cleared! C1 change is lost

Cell values: A1="A", B1="B", C1="", D1="D"
```

### Stack Limit

```javascript
// HistoryManager
const MAX_STACK_SIZE = 100;

execute(command) {
  command.execute();
  this.undoStack.push(command);

  // Limit stack size
  if (this.undoStack.length > MAX_STACK_SIZE) {
    this.undoStack.shift(); // Remove oldest
  }

  this.redoStack = []; // Clear redo on new action
}
```

---

## 6. Command Types

### UpdateCellsCommand

For cell value and style changes:

```javascript
class UpdateCellsCommand {
  constructor(cellUpdates, fileManager, formulaWorker, renderer) {
    this.cellUpdates = cellUpdates;
    // Each update: { cellId, newValue, oldValue, newStyle?, oldStyle? }
  }

  execute() {
    for (const update of this.cellUpdates) {
      this.fileManager.updateCell(update.cellId, update.newValue);
      if (update.newStyle) {
        this.fileManager.updateCellFormat(update.cellId, update.newStyleId);
      }
      // Notify worker...
    }
  }

  undo() {
    for (const update of this.cellUpdates) {
      this.fileManager.updateCell(update.cellId, update.oldValue);
      if (update.oldStyle !== undefined) {
        this.fileManager.updateCellFormat(update.cellId, update.oldStyleId);
      }
      // Notify worker...
    }
  }
}
```

### FormatRangeCommand

For formatting changes:

```javascript
class FormatRangeCommand {
  constructor(cellIds, styleChanges, ...) {
    this.cellIds = cellIds;
    this.styleChanges = styleChanges;
    this.previousStyles = {}; // Captured in execute()
  }

  execute() {
    for (const cellId of this.cellIds) {
      // Capture old style for undo
      this.previousStyles[cellId] = this.fileManager.getCellStyleId(cellId);

      // Apply new style (deep merge with existing)
      const existingStyle = this.styleManager.getStyle(this.previousStyles[cellId]);
      const mergedStyle = deepMerge(existingStyle, this.styleChanges);
      const newStyleId = this.styleManager.addStyle(mergedStyle);

      this.fileManager.updateCellFormat(cellId, newStyleId);
      this.renderer.updateCellStyle(cellId, mergedStyle);
    }
  }

  undo() {
    for (const cellId of this.cellIds) {
      const oldStyleId = this.previousStyles[cellId];
      this.fileManager.updateCellFormat(cellId, oldStyleId);
      this.renderer.updateCellStyle(cellId, this.styleManager.getStyle(oldStyleId));
    }
  }
}
```

### ResizeCommand

For column/row resizing:

```javascript
class ResizeCommand {
  constructor(type, indices, newSizes, oldSizes, ...) {
    this.type = type; // 'col' or 'row'
    this.indices = indices;
    this.newSizes = newSizes;
    this.oldSizes = oldSizes;
  }

  execute() {
    this.applySizes(this.newSizes);
  }

  undo() {
    this.applySizes(this.oldSizes);
  }
}
```

### MoveRangeCommand

For drag-to-move operations:

```javascript
class MoveRangeCommand {
  constructor(sourceRange, targetTopLeft, movedData, overwrittenData, ...) {
    this.sourceRange = sourceRange;
    this.targetTopLeft = targetTopLeft;
    this.movedData = movedData;        // What was moved
    this.overwrittenData = overwrittenData; // What was at target
  }

  execute() {
    // Clear source cells
    // Place movedData at target
  }

  undo() {
    // Restore overwrittenData to target
    // Restore movedData to source
  }
}
```

### FillRangeCommand

For fill handle operations:

```javascript
class FillRangeCommand {
  constructor(cellUpdates, ...) {
    this.cellUpdates = cellUpdates;
    // Each: { cellId, newValue, oldValue, newStyle?, oldStyle? }
  }

  // Similar to UpdateCellsCommand
}
```

### BorderFormatCommand

For border formatting:

```javascript
class BorderFormatCommand {
  constructor(cellBorderChanges, ...) {
    this.cellBorderChanges = cellBorderChanges;
    // Each: { cellId, newBorders, oldBorders }
  }
}
```

---

## 7. Formula Recalculation on Undo/Redo

When undoing/redoing formula changes, the worker recalculates:

```
Undo changes A1 from "=B1+C1" to "10"
    │
    ▼
UpdateCellsCommand.undo()
    │
    ├─► FileManager.updateCell('A1', '10')
    │
    └─► FormulaWorker.postMessage({ type: 'setValue', cellId: 'A1', value: '10' })
            │
            ▼
        Worker removes A1 from dependency graph
        Worker recalculates any cells that depended on A1
            │
            ▼
        Worker returns: { type: 'updates', cells: { ... } }
            │
            ▼
        GridRenderer updates affected cells
```

---

## Key Files

| Layer | File | Responsibility |
|-------|------|----------------|
| Trigger | `js/ui/InputController.js` | Captures Ctrl+Z/Y |
| Mode | `js/modes/NavigationMode.js` | Handles UNDO/REDO intents |
| History | `js/history/HistoryManager.js` | Stack management |
| History | `js/history/Command.js` | Base command class |
| Commands | `js/history/commands/UpdateCellsCommand.js` | Cell changes |
| Commands | `js/history/commands/FormatRangeCommand.js` | Formatting |
| Commands | `js/history/commands/ResizeCommand.js` | Resize |
| Commands | `js/history/commands/MoveRangeCommand.js` | Move cells |
| Commands | `js/history/commands/FillRangeCommand.js` | Fill handle |
| Commands | `js/history/commands/BorderFormatCommand.js` | Borders |

---

## HistoryManager API

```javascript
class HistoryManager {
  execute(command)  // Execute and add to undo stack
  undo()            // Undo last command
  redo()            // Redo last undone command
  canUndo()         // Check if undo is available
  canRedo()         // Check if redo is available
  clear()           // Clear both stacks
}
```

---

## Important Rules

1. **All state changes must use commands** - Direct state modification breaks undo
2. **Commands capture old state on construction** - Before execute() is called
3. **New actions clear redo stack** - Can't redo after new action
4. **Commands are atomic** - Multi-cell changes are one command
5. **Worker is notified** - Formulas are recalculated on undo/redo

---

## See Also

- History system: `/docs/architecture/04-history-system.md`
- ADR: `/docs/architecture/adr/003-command-pattern-history.md`
- User workflows: `/docs/manuals/user-workflows.md` (Undo/Redo)
- Test scenarios: `/docs/manuals/test-scenarios/history.scenarios.md`
