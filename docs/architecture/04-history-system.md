# History System Architecture

This document explains the undo/redo system in v-sheet, built on the **Command Pattern** for reliable state management.

**Related Documentation**:
- **System Overview**: [docs/architecture/00-system-overview.md](./00-system-overview.md)
- **Test Scenarios**: [docs/test-scenarios/history.scenarios.md](../test-scenarios/history.scenarios.md)
- **ADR**: [docs/adr/003-command-pattern-history.md](../adr/003-command-pattern-history.md) (rationale for Command Pattern)

---

## Overview

The history system enables **undo/redo functionality** for all state-changing operations in v-sheet. Every user action that modifies data is encapsulated in a **Command** object, which knows how to execute and reverse itself.

**Key Components**:
- **HistoryManager** — Manages undo/redo stacks
- **Command** (base class) — Abstract interface for all commands
- **Concrete Commands** — UpdateCellsCommand, MoveRangeCommand, ResizeCommand, FormatRangeCommand

**Design Pattern**: [Command Pattern](https://refactoring.guru/design-patterns/command)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    User Action                          │
│              (Edit cell, resize column)                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   Mode / UI Layer     │
         │  Creates Command      │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   HistoryManager      │
         │   .execute(command)   │
         └───────────┬───────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
    command.execute()     Add to undoStack
          │               Clear redoStack
          │
          ▼
    ┌─────────────────────┐
    │  FileManager        │
    │  FormulaWorker      │
    │  GridRenderer       │
    └─────────────────────┘


When user presses Cmd+Z (Undo):

    HistoryManager.undo()
          │
          ▼
    Pop from undoStack
          │
          ▼
    command.undo()
          │
          ▼
    Reverse state changes
          │
          ▼
    Push to redoStack
```

---

## Core Components

### 1. HistoryManager

**File**: `js/history/HistoryManager.js`

**Responsibility**: Maintain undo/redo stacks and orchestrate command execution.

#### Stack Structure
```javascript
{
  undoStack: [Command, Command, Command],  // Commands that can be undone
  redoStack: [Command, Command],           // Commands that can be redone
  maxStackSize: 100                        // Limit to prevent memory overflow
}
```

**Stack Behavior**:
- **execute(command)**: Push to `undoStack`, clear `redoStack`
- **undo()**: Pop from `undoStack`, execute `command.undo()`, push to `redoStack`
- **redo()**: Pop from `redoStack`, execute `command.execute()`, push to `undoStack`

#### Key Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `execute(command)` | Execute command and add to undo stack | void |
| `undo()` | Undo last command | boolean (success) |
| `redo()` | Redo last undone command | boolean (success) |
| `canUndo()` | Check if undo available | boolean |
| `canRedo()` | Check if redo available | boolean |
| `clear()` | Clear all history (on file load) | void |

#### Stack Size Management
To prevent unbounded memory growth, the stack is limited to 100 commands:

```javascript
execute(command) {
  command.execute();
  this.undoStack.push(command);
  this.redoStack = [];  // New action invalidates redo

  if (this.undoStack.length > this.maxStackSize) {
    this.undoStack.shift();  // Remove oldest command
  }
}
```

**Trade-off**: Users can only undo last 100 actions, but memory usage is bounded.

---

### 2. Command (Base Class)

**File**: `js/history/Command.js`

**Responsibility**: Define the interface that all commands must implement.

#### Interface

```javascript
class Command {
  execute() {
    // Perform the action (forward)
    throw new Error('Must be implemented by subclass');
  }

  undo() {
    // Reverse the action (backward)
    throw new Error('Must be implemented by subclass');
  }
}
```

**Contract**:
- `execute()` and `undo()` must be **symmetric** — calling `undo()` after `execute()` should restore original state
- Commands must be **idempotent** — calling `execute()` multiple times should produce same result
- Commands store **old and new values** to enable undo

**Template Method Pattern**: Base class defines skeleton, subclasses implement specifics.

---

## Concrete Commands

### 1. UpdateCellsCommand

**File**: `js/history/commands/UpdateCellsCommand.js`

**Purpose**: Handle all cell data mutations (values, formulas, styles).

#### Constructor Parameters
```javascript
new UpdateCellsCommand({
  cellUpdates: [
    {
      cellId: 'B2',
      oldValue: 'Old',
      newValue: 'New',
      oldStyle: null,
      newStyle: { font: { bold: true } }
    },
    // ... more cells
  ],
  fileManager,
  formulaWorker,
  renderer
});
```

**Key Feature**: **Bulk Updates** — A single command can update multiple cells atomically (important for paste operations).

#### Execute Flow
```javascript
execute() {
  cellUpdates.forEach(update => {
    // 1. Update FileManager (source of truth)
    fileManager.updateCellData(cellId, newValue);
    fileManager.updateCellFormat(cellId, newStyle);

    // 2. Notify FormulaWorker (for recalculation)
    if (newValue.startsWith('=')) {
      worker.postMessage({ type: 'setFormula', ... });
    }

    // 3. Update Renderer (visual feedback)
    renderer.updateCellStyle(cellId, newStyle);
  });
}
```

#### Undo Flow
Same as execute, but uses `oldValue` and `oldStyle` instead of `newValue` and `newStyle`.

**Critical Detail**: Undo sends messages to FormulaWorker to recalculate dependents with old values.

---

### 2. MoveRangeCommand

**File**: `js/history/commands/MoveRangeCommand.js`

**Purpose**: Handle drag-and-drop range moves (Epic 6).

#### Concept
Moving a range involves:
1. Clearing source cells
2. Writing to destination cells
3. Handling overlapping ranges

#### Constructor Parameters
```javascript
new MoveRangeCommand({
  sourceRange: { start: { row: 2, col: 1 }, end: { row: 3, col: 2 } },
  destStart: { row: 5, col: 4 },
  oldSourceData: [...],  // Original data in source
  oldDestData: [...],    // Original data in destination (for overlap case)
  fileManager,
  formulaWorker,
  renderer
});
```

#### Execute Flow
```javascript
execute() {
  // 1. Copy source to destination
  // 2. Clear source cells
  // 3. Update formula references (formulas that pointed to B2 now point to E5)
}
```

#### Undo Flow
```javascript
undo() {
  // 1. Restore source cells
  // 2. Clear destination cells
  // 3. Restore original formula references
}
```

**Complexity**: Formula reference adjustment — if cell C1 referenced B2, and B2 moved to E5, C1's formula must update.

---

### 3. ResizeCommand

**File**: `js/history/commands/ResizeCommand.js`

**Purpose**: Handle column/row resize operations.

#### Constructor Parameters
```javascript
new ResizeCommand({
  type: 'col',  // or 'row'
  indices: [1, 2, 3],  // Which columns/rows (can resize multiple)
  oldSizes: { 1: 94, 2: 94, 3: 94 },
  newSizes: { 1: 150, 2: 150, 3: 150 },
  fileManager,
  renderer
});
```

#### Execute/Undo Flow
```javascript
execute() {
  renderer.setColumnWidths(newSizes);
  fileManager.updateColumnWidths(newSizes);
  renderer.applyGridStyles();  // Re-render CSS Grid
}

undo() {
  renderer.setColumnWidths(oldSizes);
  fileManager.updateColumnWidths(oldSizes);
  renderer.applyGridStyles();
}
```

**Simplicity**: Resize is straightforward — just swap old/new sizes.

---

### 4. FormatRangeCommand

**File**: `js/history/commands/FormatRangeCommand.js`

**Purpose**: Handle cell formatting changes (bold, colors, alignment).

#### Constructor Parameters
```javascript
new FormatRangeCommand({
  cellUpdates: [
    {
      cellId: 'B2',
      oldStyle: null,
      newStyle: { font: { bold: true }, fill: { color: '#FFFF00' } }
    },
    // ... more cells
  ],
  fileManager,
  renderer
});
```

**Key Features**:
- **Deep merge**: New style properties merge with existing cell styles
- **StyleManager integration**: Uses Flyweight pattern for style deduplication
- **Toggle support**: Handles both "set" and "toggle" modes for bold/italic

#### Execute Flow
```javascript
execute() {
  cellUpdates.forEach(({ cellId, newStyleId }) => {
    // 1. Get merged style object from StyleManager
    const styleObject = styleManager.getStyle(newStyleId);

    // 2. Update FileManager (sets cell.styleId)
    fileManager.updateCellFormat(cellId, styleObject);

    // 3. Update visual (applies CSS)
    renderer.updateCellStyle(cellId, styleObject);
  });
}
```

#### Undo Flow
Same pattern, but applies `oldStyleId` instead of `newStyleId`.

**Important**: Unlike UpdateCellsCommand, FormatRangeCommand does NOT involve the FormulaWorker — styles are presentation-only.

---

## Command Lifecycle

### Typical Flow: User Edits Cell

```
1. User types "Hello" in B2 and presses Enter
   ↓
2. EnterMode.handleCommit() called
   ↓
3. Mode creates UpdateCellsCommand:
   new UpdateCellsCommand({
     cellUpdates: [{
       cellId: 'B2',
       oldValue: '',      // Cell was empty
       newValue: 'Hello'
     }],
     fileManager,
     formulaWorker,
     renderer
   })
   ↓
4. Mode calls historyManager.execute(command)
   ↓
5. HistoryManager:
   - Calls command.execute()
   - Pushes command to undoStack
   - Clears redoStack
   ↓
6. UpdateCellsCommand.execute():
   - fileManager.updateCellData('B2', 'Hello')
   - worker.postMessage({ type: 'setCellValue', ... })
   ↓
7. User sees "Hello" in B2
   ↓
8. User presses Cmd+Z
   ↓
9. HistoryManager.undo():
   - Pops command from undoStack
   - Calls command.undo()
   - Pushes command to redoStack
   ↓
10. UpdateCellsCommand.undo():
    - fileManager.updateCellData('B2', '')
    - worker.postMessage({ type: 'clearCell', ... })
    ↓
11. User sees B2 is empty again
```

---

## Key Architectural Principles

### Principle 1: Commands are Self-Contained
Each command stores **all data needed** to execute and undo:

```javascript
// BAD: Relies on external state
class BadCommand {
  execute() {
    const value = someGlobalVariable;  // ❌ External dependency
  }
}

// GOOD: Self-contained
class GoodCommand {
  constructor({ oldValue, newValue }) {
    this.oldValue = oldValue;  // ✅ Stored in command
    this.newValue = newValue;
  }

  execute() {
    // Uses this.newValue
  }
}
```

**Benefit**: Commands can be executed/undone at any time, regardless of application state.

### Principle 2: New Actions Clear Redo Stack
When a new command is executed, the redo stack is **wiped**:

```javascript
execute(command) {
  command.execute();
  this.undoStack.push(command);
  this.redoStack = [];  // ← Prevents branching history
}
```

**Rationale**: Without this, users could create inconsistent states:
```
1. Type "A" in B2
2. Undo → B2 empty
3. Type "B" in B2
4. Redo → Should redo "B" or "A"? ← Ambiguous!
```

By clearing the redo stack, we enforce **linear history**.

### Principle 3: Commands are Atomic
A single command represents **one user action**, even if it affects multiple cells:

**Good**:
```javascript
// Paste 2x2 range → Single UpdateCellsCommand with 4 cell updates
new UpdateCellsCommand({
  cellUpdates: [
    { cellId: 'E5', oldValue: '', newValue: '100' },
    { cellId: 'F5', oldValue: '', newValue: '200' },
    { cellId: 'E6', oldValue: '', newValue: '300' },
    { cellId: 'F6', oldValue: '', newValue: '400' }
  ]
});
```

**Bad**:
```javascript
// Paste 2x2 range → 4 separate UpdateCellsCommands
// ❌ User would have to undo 4 times
```

**Benefit**: One undo reverses the entire paste operation.

### Principle 4: Symmetric Execute/Undo
`execute()` and `undo()` must be **exact inverses**:

```javascript
const initialState = getState();
command.execute();
const executedState = getState();
command.undo();
const undoneState = getState();

assert(initialState === undoneState);  // Must be true
```

**Testing Strategy**: Every command should have tests verifying symmetry.

---

## Integration with Other Systems

### Formula Worker Integration
When a cell is updated via command:
1. Command calls `fileManager.updateCellData()`
2. Command sends worker message: `{ type: 'setFormula' }` or `{ type: 'setCellValue' }`
3. Worker recalculates dependents
4. Worker sends back `{ type: 'updates' }` with new values
5. UI updates with calculated results

**On Undo**:
- Same process, but with `oldValue` instead of `newValue`
- Worker recalculates dependents based on old state
- Dependents revert to previous calculated values

### Mode System Integration
Modes are responsible for creating commands:

```javascript
// ReadyMode handles DELETE intent
handleIntent(intent, context) {
  if (intent === 'DELETE') {
    const cellIds = this.selectionManager.getSelectedCellIds();

    // Gather old values for undo
    const cellUpdates = cellIds.map(cellId => ({
      cellId,
      oldValue: fileManager.getRawCellValue(cellId),
      newValue: ''
    }));

    // Create and execute command
    const command = new UpdateCellsCommand({
      cellUpdates,
      fileManager,
      formulaWorker,
      renderer
    });

    historyManager.execute(command);
    return true;
  }
}
```

**All modes** (Ready, Edit, Enter, Point) delegate to HistoryManager via commands.

### File Loading Integration
When a file is loaded, history is **cleared**:

```javascript
loadFromFile(fileData) {
  historyManager.clear();  // Previous file's history no longer valid
  // ... load new file data
}
```

**Rationale**: Undo should only affect current file, not previous file.

---

## Memory and Performance Considerations

### Stack Size Limit
- **Default**: 100 commands
- **Memory per command**: ~1-10 KB (depends on affected cells)
- **Total memory**: ~100 KB - 1 MB

**Trade-off**: More history = more memory. 100 is a reasonable balance.

### Command Optimization
To reduce memory, commands only store **changed data**:

```javascript
// GOOD: Only store what changed
{
  cellUpdates: [
    { cellId: 'B2', oldValue: 'Old', newValue: 'New' }  // Just B2
  ]
}

// BAD: Store entire spreadsheet state
{
  allCells: { A1: '...', A2: '...', ... B2: 'New', ... }  // ❌ 10000+ cells
}
```

**Benefit**: Commands are lightweight, enabling deep undo history.

### Lazy Worker Messages
Commands don't wait for worker responses:

```javascript
execute() {
  worker.postMessage({ type: 'setFormula', ... });  // Fire and forget
  // Don't wait for worker to finish calculating
}
```

**Benefit**: Undo/redo is instant, recalculation happens asynchronously.

---

## Testing Strategy

### Unit Testing Commands

Each command should have tests for:
1. **Execute**: Verify state changes correctly
2. **Undo**: Verify state reverts correctly
3. **Symmetry**: `execute()` then `undo()` returns to original state
4. **Idempotence**: Multiple `execute()` calls produce same result

**Example**:
```javascript
test('UpdateCellsCommand execute/undo symmetry', () => {
  const fileManager = new FileManager();
  const command = new UpdateCellsCommand({
    cellUpdates: [{ cellId: 'B2', oldValue: '', newValue: 'Test' }],
    fileManager,
    formulaWorker: mockWorker,
    renderer: mockRenderer
  });

  // Initial state
  expect(fileManager.getRawCellValue('B2')).toBe('');

  // Execute
  command.execute();
  expect(fileManager.getRawCellValue('B2')).toBe('Test');

  // Undo
  command.undo();
  expect(fileManager.getRawCellValue('B2')).toBe('');
});
```

### Integration Testing HistoryManager

HistoryManager tests should verify:
1. **Stack management**: Push/pop behavior
2. **Redo clearing**: New actions clear redo stack
3. **Stack size limit**: Old commands removed after 100
4. **canUndo/canRedo**: Accurate state reporting

### E2E Testing

See [test-scenarios/history.scenarios.md](../test-scenarios/history.scenarios.md) for comprehensive E2E test scenarios.

---

## Extending the System

### Adding a New Command

1. **Create command class**:
   ```javascript
   // js/history/commands/MergeC ellsCommand.js
   import { Command } from '../Command.js';

   export class MergeCellsCommand extends Command {
     constructor({ range, oldCells, fileManager, renderer }) {
       super();
       this.range = range;
       this.oldCells = oldCells;
       this.fileManager = fileManager;
       this.renderer = renderer;
     }

     execute() {
       // Merge cells logic
     }

     undo() {
       // Unmerge cells logic
     }
   }
   ```

2. **Use in mode**:
   ```javascript
   handleIntent(intent, context) {
     if (intent === 'MERGE_CELLS') {
       const command = new MergeCellsCommand({ ... });
       this.historyManager.execute(command);
       return true;
     }
   }
   ```

3. **Test**:
   - Unit test: execute/undo symmetry
   - E2E test: User merges cells, undoes, redoes

### Adding Undo/Redo UI Indicators

To show undo/redo availability in UI:

```javascript
historyManager.on('stackChange', ({ canUndo, canRedo }) => {
  undoButton.disabled = !canUndo;
  redoButton.disabled = !canRedo;
});
```

Currently, HistoryManager doesn't emit events, but could be extended with EventEmitter pattern.

---

## Common Pitfalls

### ❌ Don't: Modify State Without Commands

```javascript
// BAD: Bypasses history
fileManager.updateCellData('B2', 'Direct');  // ❌ Not undoable
```

**Solution**: Always create a command:
```javascript
// GOOD
const command = new UpdateCellsCommand({ ... });
historyManager.execute(command);
```

### ❌ Don't: Store References to Mutable Objects

```javascript
// BAD: oldValue is a reference
class BadCommand {
  constructor({ cellData }) {
    this.oldData = cellData;  // ❌ If cellData mutates, undo breaks
  }
}
```

**Solution**: Deep copy or store primitives:
```javascript
// GOOD
class GoodCommand {
  constructor({ cellData }) {
    this.oldData = JSON.parse(JSON.stringify(cellData));  // ✅ Deep copy
  }
}
```

### ❌ Don't: Assume Synchronous Results

```javascript
// BAD: Worker is async
command.execute();
const calculatedValue = fileManager.getRawCellValue('B2');  // ❌ May not be calculated yet
```

**Solution**: Listen for worker `updates` message if you need calculated values.

---

## Future Enhancements

### Possible Improvements

1. **Compound Commands**: Group multiple commands as one undoable unit
   ```javascript
   class CompoundCommand extends Command {
     constructor(commands) {
       this.commands = commands;
     }
     execute() {
       this.commands.forEach(cmd => cmd.execute());
     }
     undo() {
       this.commands.reverse().forEach(cmd => cmd.undo());
     }
   }
   ```

2. **Undo History Viewer**: Show list of past actions with descriptions
   ```
   [Undo Stack]
   - Resize column B
   - Paste range B2:C3
   - Edit cell A1
   ```

3. **Selective Undo**: Undo specific command without undoing everything after it (complex!)

4. **Persistent History**: Save undo stack to file for cross-session undo (advanced)

---

## Summary

The history system provides:

- **Reliable Undo/Redo**: All state changes are reversible
- **Memory Efficient**: Only stores deltas, limited stack size
- **Extensible**: Easy to add new command types
- **Testable**: Commands can be tested in isolation
- **Mode-Agnostic**: Works across all interaction modes

**Key Benefits**:
1. **User Confidence**: Users can experiment knowing they can undo
2. **Data Integrity**: Commands ensure consistent state transitions
3. **Debugging**: Command history helps trace how state evolved

**Design Patterns Used**:
- **Command Pattern**: Encapsulate actions as objects
- **Template Method**: Base Command class defines structure
- **Memento Pattern** (implicit): Commands store old state for undo

---

## Related Files

- **HistoryManager**: `js/history/HistoryManager.js`
- **Command Base**: `js/history/Command.js`
- **UpdateCellsCommand**: `js/history/commands/UpdateCellsCommand.js`
- **MoveRangeCommand**: `js/history/commands/MoveRangeCommand.js`
- **ResizeCommand**: `js/history/commands/ResizeCommand.js`
- **FormatRangeCommand**: `js/history/commands/FormatRangeCommand.js`
- **NavigationMode**: `js/modes/NavigationMode.js` (handles undo/redo intents)
