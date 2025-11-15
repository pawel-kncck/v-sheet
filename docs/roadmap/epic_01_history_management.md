# PRD: Epic 1: History Management (Undo/Redo) - Technical Implementation Guide

- **Status:** Final - Ready for Implementation
- **Date:** November 15, 2025
- **Author:** v-sheet Team
- **Estimated Effort:** 35-40 hours

---

## 1. Overview

This document outlines the requirements and technical implementation for a "History Management" (Undo/Redo) system using the Command Pattern. This is a foundational feature critical for user confidence and error recovery. Without this feature, any user mistake is permanent, leading to frustration and a high-stakes editing environment.

---

## 2. Problem Statement

- **Problem:** Users have no "safety net." Any action—from a simple typo to accidentally deleting a complex formula or pasting incorrect data—is irreversible.
- **Impact:** This creates a high-anxiety user experience. Users are afraid to make changes and are severely punished for simple mistakes, which undermines the tool's utility as a flexible data editor.
- **Current State:** All actions in `spreadsheet.js` (like `_updateCell`, `_clearSelectedCells`, `_moveSelection`) are final and overwrite data permanently. The application has no state history.

---

## 3. Architecture Overview

### 3.1 Current State Management (3-Tier Architecture)

The application currently maintains state in three distinct layers:

```
┌─────────────────────────────────────────────────────────────┐
│                        USER ACTION                          │
│                   (click, type, paste)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   SPREADSHEET.JS                            │
│              (Event handlers & UI logic)                    │
└─────────────┬───────────────────────────┬───────────────────┘
              │                           │
              ▼                           ▼
┌─────────────────────────┐   ┌──────────────────────────────┐
│    FILE-MANAGER.JS      │   │    FORMULA-WORKER.JS         │
│  (Source of Truth for   │   │  (Calculation Engine)        │
│   raw values/formulas)  │   │  - Parsed ASTs               │
│  - cells: {}            │   │  - Calculated values         │
│  - columnWidths: []     │   │  - Dependency graph          │
│  - rowHeights: []       │   │                              │
└────────────┬────────────┘   └──────────────┬───────────────┘
             │                               │
             │ Autosave                      │ postMessage('updates')
             │ debounced                     │ async
             ▼                               ▼
┌─────────────────────────┐   ┌──────────────────────────────┐
│   SERVER/APP.PY         │   │         DOM (Grid)           │
│   (Persistent storage)  │   │  - Cell textContent          │
└─────────────────────────┘   │  - Visual rendering          │
                              └──────────────────────────────┘
```

**Critical Insight:** Any undo/redo system must keep all three layers synchronized:

1. **FileManager** - Raw data storage (source of truth)
2. **FormulaWorker** - Calculation state (async)
3. **DOM** - Visual representation

### 3.2 Command Pattern Integration

```
┌─────────────────────────────────────────────────────────────┐
│                     HISTORY MANAGER                         │
│  - undoStack: Command[]                                     │
│  - redoStack: Command[]                                     │
│  - execute(cmd), undo(), redo()                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      COMMANDS                               │
│  UpdateCellsCommand, ResizeCommand, MoveRangeCommand        │
│                                                             │
│  Each command knows how to:                                 │
│  1. Update fileManager (source of truth)                    │
│  2. Update formulaWorker (trigger recalc)                   │
│  3. Wait for worker response (async)                        │
│  4. Reverse the action (undo)                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Scope

### 4.1 In Scope

**Core Infrastructure:**

- `HistoryManager` class with undo/redo stacks
- Base `Command` interface
- Keyboard shortcuts: `Ctrl+Z` (undo), `Ctrl+Y` / `Cmd+Shift+Z` (redo)

**Tracked Actions (via Commands):**

1. **UpdateCellsCommand** - Handles all cell data mutations:
   - Single cell edit (`_commitEdit`)
   - Multi-cell clear (`_clearSelectedCells`)
   - Paste operations (`_handlePaste`)
2. **ResizeCommand** - Handles grid structure changes:
   - Column width adjustments
   - Row height adjustments
   - Multi-column/row resizing
3. **MoveRangeCommand** - Handles drag-to-move operations:
   - Moving a selection to a new location
   - Preserving overwritten data for undo

**Memory Management:**

- Stack size limit (100 commands)
- Memory-efficient state storage

### 4.2 Out of Scope (For This Epic)

- **Formatting:** Undoing formatting changes (Epic 3: Cell Formatting)
- **File Operations:** Undo file rename/delete
- **Copy Action:** Copy is non-mutating and doesn't need undo
- **UI State:** Selection, scroll position, zoom level
- **Toolbar UI:** Visual undo/redo buttons (shortcuts only for V1)
- **Command Coalescing:** Treating rapid actions as one (can add in V2 if needed)

### 4.3 Dependencies & Prerequisites

**⚠️ CRITICAL: Paste Implementation Required**

- The PRD references `_handlePaste` as in-scope
- **Current state:** `_handlePaste` is a stub (lines 1060-1090 in spreadsheet.js)
- **Decision:** Either implement basic paste first OR descope it from this epic
- **Recommendation:** Implement basic value-only paste as part of Phase 3

**Formula Worker Stability:**

- The async worker must reliably send `updates` messages
- Current implementation appears stable (tested in loadFromFile flow)

---

## 5. Functional Requirements

### 5.1 Core Infrastructure

| ID        | Requirement           | Implementation Details                                                                                       |
| :-------- | :-------------------- | :----------------------------------------------------------------------------------------------------------- |
| **FR1.1** | **History Manager**   | Create `js/history/HistoryManager.js` with `undoStack`, `redoStack`, `execute()`, `undo()`, `redo()` methods |
| **FR1.2** | **Stack Clearing**    | Executing a new command MUST clear the `redoStack` completely                                                |
| **FR1.3** | **Stack Size Limit**  | Implement `maxStackSize = 100`. When exceeded, remove oldest command from undo stack                         |
| **FR1.4** | **Command Interface** | Create base `js/history/Command.js` class with abstract `execute()` and `undo()` methods                     |

### 5.2 UpdateCellsCommand (Unified Cell Data Command)

| ID        | Requirement                | Implementation Details                                                                                                                                                                                                                                                   |
| :-------- | :------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR2.1** | **Command Structure**      | Create `js/history/commands/UpdateCellsCommand.js`                                                                                                                                                                                                                       |
| **FR2.2** | **State Capture**          | Command constructor receives: `cellUpdates: [{ cellId, newValue, oldValue }, ...]`                                                                                                                                                                                       |
| **FR2.3** | **Execute Logic**          | For each cell update:<br>1. Call `fileManager.updateCellData(cellId, newValue)`<br>2. Send appropriate message to `formulaWorker` (setFormula/setCellValue/clearCell)<br>3. Worker responds async with `updates` message<br>4. `spreadsheet._applyUpdates()` updates DOM |
| **FR2.4** | **Undo Logic**             | Same as execute, but use `oldValue` instead of `newValue`                                                                                                                                                                                                                |
| **FR2.5** | **Worker Message Routing** | If value is empty → `clearCell`<br>If starts with `=` → `setFormula`<br>Else → `setCellValue`                                                                                                                                                                            |

**State Synchronization Flow:**

```
Command.execute()
  ├─► fileManager.updateCellData(cellId, value)  [SYNC]
  │     └─► this.currentFile.data.cells[cellId] = value
  │     └─► Triggers autosave (debounced)
  │
  └─► formulaWorker.postMessage({ type, payload }) [ASYNC]
        └─► Worker processes
              └─► Worker sends back: { type: 'updates', payload: { updates } }
                    └─► spreadsheet._applyUpdates(updates)  [SYNC]
                          └─► Updates DOM: cell.textContent = value
```

### 5.3 ResizeCommand

| ID        | Requirement           | Implementation Details                                                                                                                                                                                                    |
| :-------- | :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **FR3.1** | **Command Structure** | Create `js/history/commands/ResizeCommand.js`                                                                                                                                                                             |
| **FR3.2** | **State Capture**     | Constructor receives:<br>- `type`: 'col' or 'row'<br>- `indices`: [0, 1, 2] (array of affected columns/rows)<br>- `newSizes`: { 0: 120, 1: 150 } (map of index → size)<br>- `oldSizes`: { 0: 94, 1: 94 } (original sizes) |
| **FR3.3** | **Execute Logic**     | 1. Update `spreadsheet.columnWidths[]` or `spreadsheet.rowHeights[]`<br>2. Call `fileManager.updateColumnWidths()` or `updateRowHeights()`<br>3. Call `spreadsheet._applyGridStyles()` to re-render                       |
| **FR3.4** | **Undo Logic**        | Same as execute, but apply `oldSizes`                                                                                                                                                                                     |

### 5.4 MoveRangeCommand

| ID        | Requirement           | Implementation Details                                                                                                                                                                                                                                 |
| :-------- | :-------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR4.1** | **Command Structure** | Create `js/history/commands/MoveRangeCommand.js`                                                                                                                                                                                                       |
| **FR4.2** | **State Capture**     | Constructor receives:<br>- `sourceRange`: { minCol, maxCol, minRow, maxRow }<br>- `targetTopLeft`: { col, row }<br>- `movedData`: [{ cellId, value }, ...] (cells being moved)<br>- `overwrittenData`: [{ cellId, value }, ...] (cells at destination) |
| **FR4.3** | **Execute Logic**     | 1. Clear source cells (via UpdateCellsCommand pattern)<br>2. Write movedData to target location<br>3. Worker recalculates dependencies                                                                                                                 |
| **FR4.4** | **Undo Logic**        | 1. Restore movedData to source location<br>2. Restore overwrittenData to target location                                                                                                                                                               |

### 5.5 UI Integration

| ID        | Requirement            | Implementation Details                                                                                                                                                                                 |
| :-------- | :--------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR5.1** | **Keyboard Shortcuts** | In `spreadsheet.js` `_initEventListeners()`:<br>- `Ctrl+Z` / `Cmd+Z` → `historyManager.undo()`<br>- `Ctrl+Y` / `Cmd+Y` / `Cmd+Shift+Z` → `historyManager.redo()`<br>- Prevent default browser behavior |
| **FR5.2** | **State Indicators**   | Optional: Update UI to show undo/redo availability (disabled state)                                                                                                                                    |
| **FR5.3** | **Focus Management**   | Shortcuts should work when grid has focus, not during cell editing                                                                                                                                     |

---

## 6. Technical Implementation Guide

### 6.1 Phase 1: Core Infrastructure (4 hours)

**File:** `js/history/HistoryManager.js`

```javascript
/**
 * HistoryManager - Manages undo/redo stacks using the Command pattern
 */
export class HistoryManager {
  constructor(maxStackSize = 100) {
    this.undoStack = [];
    this.redoStack = [];
    this.maxStackSize = maxStackSize;
  }

  /**
   * Executes a command and adds it to the undo stack
   * Clears the redo stack (new action invalidates redo history)
   */
  execute(command) {
    command.execute();
    this.undoStack.push(command);
    this.redoStack = []; // Clear redo history

    // Enforce stack size limit
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
  }

  /**
   * Undoes the last command
   * @returns {boolean} True if undo was performed, false if stack empty
   */
  undo() {
    if (this.undoStack.length === 0) return false;

    const command = this.undoStack.pop();
    command.undo();
    this.redoStack.push(command);

    return true;
  }

  /**
   * Redoes the last undone command
   * @returns {boolean} True if redo was performed, false if stack empty
   */
  redo() {
    if (this.redoStack.length === 0) return false;

    const command = this.redoStack.pop();
    command.execute();
    this.undoStack.push(command);

    return true;
  }

  /**
   * Checks if undo is available
   */
  canUndo() {
    return this.undoStack.length > 0;
  }

  /**
   * Checks if redo is available
   */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * Clears all history (useful for file load)
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}
```

**File:** `js/history/Command.js`

```javascript
/**
 * Base Command class - All commands must extend this
 */
export class Command {
  /**
   * Executes the command's action
   * Must be implemented by subclasses
   */
  execute() {
    throw new Error('Command.execute() must be implemented by subclass');
  }

  /**
   * Reverses the command's action
   * Must be implemented by subclasses
   */
  undo() {
    throw new Error('Command.undo() must be implemented by subclass');
  }
}
```

### 6.2 Phase 2: UpdateCellsCommand (6 hours)

**File:** `js/history/commands/UpdateCellsCommand.js`

```javascript
import { Command } from '../Command.js';

/**
 * UpdateCellsCommand - Handles all cell data mutations
 * Unified command for: cell edit, cell clear, paste
 */
export class UpdateCellsCommand extends Command {
  /**
   * @param {Object} params
   * @param {Array} params.cellUpdates - [{ cellId: 'A1', newValue: '=B1', oldValue: '5' }, ...]
   * @param {FileManager} params.fileManager - Reference to file manager
   * @param {Worker} params.formulaWorker - Reference to formula worker
   */
  constructor({ cellUpdates, fileManager, formulaWorker }) {
    super();
    this.cellUpdates = cellUpdates;
    this.fileManager = fileManager;
    this.formulaWorker = formulaWorker;
  }

  execute() {
    this._applyUpdates('newValue');
  }

  undo() {
    this._applyUpdates('oldValue');
  }

  /**
   * Applies updates to both fileManager and worker
   * @private
   */
  _applyUpdates(valueKey) {
    this.cellUpdates.forEach(({ cellId, [valueKey]: value }) => {
      // 1. Update fileManager (source of truth)
      this.fileManager.updateCellData(cellId, value);

      // 2. Update worker (calculation engine)
      this._updateWorker(cellId, value);
    });

    // Note: Worker will asynchronously send back 'updates' message
    // which triggers spreadsheet._applyUpdates() to update DOM
  }

  /**
   * Sends appropriate message to worker based on value type
   * @private
   */
  _updateWorker(cellId, value) {
    if (!value || value === '') {
      // Empty value - clear the cell
      this.formulaWorker.postMessage({
        type: 'clearCell',
        payload: { cellId },
      });
    } else if (String(value).startsWith('=')) {
      // Formula - parse and evaluate
      this.formulaWorker.postMessage({
        type: 'setFormula',
        payload: { cellId, formulaString: value },
      });
    } else {
      // Raw value - store directly
      this.formulaWorker.postMessage({
        type: 'setCellValue',
        payload: { cellId, value },
      });
    }
  }
}
```

### 6.3 Phase 3: Spreadsheet.js Integration (8 hours)

**Modifications to `spreadsheet.js`:**

```javascript
// 1. Add imports at top of file
import { HistoryManager } from './history/HistoryManager.js';
import { UpdateCellsCommand } from './history/commands/UpdateCellsCommand.js';

// 2. In constructor, initialize HistoryManager
constructor(containerId) {
  // ... existing code ...

  // Initialize history management
  this.historyManager = new HistoryManager(100); // Max 100 commands
}

// 3. Completely refactor _updateCell
_updateCell(cell, value) {
  if (!cell) return;

  const cellId = cell.dataset.id;

  // CRITICAL: Capture OLD state BEFORE creating command
  const oldValue = this.fileManager.getRawCellValue(cellId);

  // Create and execute command
  const command = new UpdateCellsCommand({
    cellUpdates: [{
      cellId,
      newValue: value,
      oldValue
    }],
    fileManager: this.fileManager,
    formulaWorker: this.formulaWorker
  });

  this.historyManager.execute(command);

  // IMPORTANT: Do NOT manually update anything here!
  // The command handles:
  // 1. fileManager.updateCellData() - updates source of truth
  // 2. worker.postMessage() - triggers calculation
  // 3. Worker sends 'updates' message back
  // 4. Our _applyUpdates() method updates the DOM
}

// 4. Refactor _clearSelectedCells to use commands
_clearSelectedCells() {
  // Build array of all cells to clear
  const cellUpdates = [];

  this.selections.forEach((selection) => {
    const { start, end } = selection;
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);

    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        const cell = this._getCellElement({ col, row });
        if (!cell) continue;

        const cellId = cell.dataset.id;
        const oldValue = this.fileManager.getRawCellValue(cellId);

        // Only add to updates if cell has content
        if (oldValue) {
          cellUpdates.push({
            cellId,
            newValue: '',
            oldValue
          });
        }
      }
    }
  });

  // Only execute command if there's something to clear
  if (cellUpdates.length > 0) {
    const command = new UpdateCellsCommand({
      cellUpdates,
      fileManager: this.fileManager,
      formulaWorker: this.formulaWorker
    });
    this.historyManager.execute(command);
  }
}

// 5. Add keyboard shortcuts in _initEventListeners
_initEventListeners() {
  // ... existing code ...

  this.cellGridContainer.addEventListener('keydown', (e) => {
    if (this.isEditing) return;

    const key = e.key;
    const isShift = e.shiftKey;
    const isCmd = e.metaKey || e.ctrlKey;

    // ... existing arrow key handling ...

    // ADD UNDO/REDO SHORTCUTS
    if (isCmd && key === 'z') {
      e.preventDefault();
      if (isShift) {
        // Cmd+Shift+Z = Redo (Mac style)
        this.historyManager.redo();
      } else {
        // Cmd+Z = Undo
        this.historyManager.undo();
      }
      return;
    }

    if (isCmd && key === 'y') {
      // Ctrl+Y = Redo (Windows style)
      e.preventDefault();
      this.historyManager.redo();
      return;
    }

    // ... rest of existing keydown handling ...
  });
}

// 6. Clear history when loading new file
loadFromFile(fileData) {
  if (!fileData) return;

  // Clear history when loading new file
  this.historyManager.clear();

  // ... rest of existing loadFromFile logic ...
}

// 7. Clear history when creating new file
clear() {
  // ... existing clear logic ...

  // Clear history
  this.historyManager.clear();
}
```

**Implementation of Basic Paste (Required Dependency):**

```javascript
// Add to spreadsheet.js
_handlePaste() {
  if (!this.clipboard.data) return;

  const targetCell = this.activeCell;
  if (!targetCell) return;

  const targetCoords = this._getCellCoords(targetCell);
  const cellUpdates = [];

  // Build updates array
  this.clipboard.data.forEach((cellData) => {
    const newRow = targetCoords.row + cellData.relativePos.row;
    const newCol = targetCoords.col + cellData.relativePos.col;

    // Check bounds
    if (newRow <= this.ROWS && newCol < this.COLS && newRow > 0 && newCol >= 0) {
      const targetCellId = this._buildCellId(newRow, newCol);
      const oldValue = this.fileManager.getRawCellValue(targetCellId);

      cellUpdates.push({
        cellId: targetCellId,
        newValue: cellData.value,
        oldValue: oldValue
      });
    }
  });

  // Execute as single command
  if (cellUpdates.length > 0) {
    const command = new UpdateCellsCommand({
      cellUpdates,
      fileManager: this.fileManager,
      formulaWorker: this.formulaWorker
    });
    this.historyManager.execute(command);
  }

  // Clear copy indicators
  this._clearCopyIndicators();
}

// Helper method to build cell ID from coordinates
_buildCellId(row, col) {
  const colLetter = String.fromCharCode(65 + col);
  return `${colLetter}${row}`;
}
```

### 6.4 Phase 4: ResizeCommand (4 hours)

**File:** `js/history/commands/ResizeCommand.js`

```javascript
import { Command } from '../Command.js';

/**
 * ResizeCommand - Handles column/row resizing
 */
export class ResizeCommand extends Command {
  /**
   * @param {Object} params
   * @param {string} params.type - 'col' or 'row'
   * @param {Array<number>} params.indices - Indices of columns/rows being resized
   * @param {Object} params.newSizes - Map of index -> new size
   * @param {Object} params.oldSizes - Map of index -> old size
   * @param {FileManager} params.fileManager
   * @param {Spreadsheet} params.spreadsheet
   */
  constructor({ type, indices, newSizes, oldSizes, fileManager, spreadsheet }) {
    super();
    this.type = type;
    this.indices = indices;
    this.newSizes = newSizes;
    this.oldSizes = oldSizes;
    this.fileManager = fileManager;
    this.spreadsheet = spreadsheet;
  }

  execute() {
    this._applySizes(this.newSizes);
  }

  undo() {
    this._applySizes(this.oldSizes);
  }

  /**
   * Applies size changes to spreadsheet and fileManager
   * @private
   */
  _applySizes(sizes) {
    if (this.type === 'col') {
      // Update column widths
      this.indices.forEach((idx) => {
        this.spreadsheet.columnWidths[idx] = sizes[idx];
      });
      // Save to file manager
      this.fileManager.updateColumnWidths(this.spreadsheet.columnWidths);
    } else {
      // Update row heights
      this.indices.forEach((idx) => {
        this.spreadsheet.rowHeights[idx - 1] = sizes[idx];
      });
      // Save to file manager
      this.fileManager.updateRowHeights(this.spreadsheet.rowHeights);
    }

    // Re-render grid with new sizes
    this.spreadsheet._applyGridStyles();
  }
}
```

**Modifications to `spreadsheet.js` for resize:**

```javascript
// Add import
import { ResizeCommand } from './history/commands/ResizeCommand.js';

// Refactor _stopResize method
_stopResize() {
  if (!this.isResizing) return;

  const { type, indices, originalSizes } = this.resizeInfo;

  // Capture new sizes
  const newSizes = {};
  indices.forEach(idx => {
    if (type === 'col') {
      newSizes[idx] = this.columnWidths[idx];
    } else {
      newSizes[idx] = this.rowHeights[idx - 1];
    }
  });

  // Only create command if sizes actually changed
  const hasChanges = indices.some(idx =>
    newSizes[idx] !== originalSizes[idx]
  );

  if (hasChanges) {
    const command = new ResizeCommand({
      type,
      indices,
      newSizes,
      oldSizes: originalSizes,
      fileManager: this.fileManager,
      spreadsheet: this
    });

    this.historyManager.execute(command);
  }

  // Cleanup
  this.isResizing = false;
  this.resizeInfo = {};
  window.removeEventListener('mousemove', this._onResize);
}
```

### 6.5 Phase 5: MoveRangeCommand (5 hours)

**File:** `js/history/commands/MoveRangeCommand.js`

```javascript
import { Command } from '../Command.js';

/**
 * MoveRangeCommand - Handles drag-to-move operations
 */
export class MoveRangeCommand extends Command {
  /**
   * @param {Object} params
   * @param {Object} params.sourceRange - { minCol, maxCol, minRow, maxRow }
   * @param {Object} params.targetTopLeft - { col, row }
   * @param {Array} params.movedData - [{ cellId, value }, ...]
   * @param {Array} params.overwrittenData - [{ cellId, value }, ...]
   * @param {FileManager} params.fileManager
   * @param {Worker} params.formulaWorker
   * @param {Spreadsheet} params.spreadsheet
   */
  constructor({
    sourceRange,
    targetTopLeft,
    movedData,
    overwrittenData,
    fileManager,
    formulaWorker,
    spreadsheet,
  }) {
    super();
    this.sourceRange = sourceRange;
    this.targetTopLeft = targetTopLeft;
    this.movedData = movedData;
    this.overwrittenData = overwrittenData;
    this.fileManager = fileManager;
    this.formulaWorker = formulaWorker;
    this.spreadsheet = spreadsheet;
  }

  execute() {
    const updates = [];

    // 1. Clear source cells
    this.movedData.forEach(({ cellId }) => {
      updates.push({
        cellId,
        newValue: '',
        oldValue: this.fileManager.getRawCellValue(cellId),
      });
    });

    // 2. Write to target cells
    const { col: targetCol, row: targetRow } = this.targetTopLeft;
    const { minCol, minRow } = this.sourceRange;

    this.movedData.forEach(({ cellId, value }) => {
      // Parse source cell coordinates
      const match = cellId.match(/([A-Z]+)(\d+)/);
      if (!match) return;

      const sourceCol = match[1].charCodeAt(0) - 65;
      const sourceRow = parseInt(match[2]);

      // Calculate target position
      const offsetCol = sourceCol - minCol;
      const offsetRow = sourceRow - minRow;
      const newCol = targetCol + offsetCol;
      const newRow = targetRow + offsetRow;

      const targetCellId = this.spreadsheet._buildCellId(newRow, newCol);

      updates.push({
        cellId: targetCellId,
        newValue: value,
        oldValue: this.fileManager.getRawCellValue(targetCellId),
      });
    });

    // Apply all updates
    this._applyUpdates(updates);
  }

  undo() {
    const updates = [];

    // 1. Restore source cells
    this.movedData.forEach(({ cellId, value }) => {
      updates.push({
        cellId,
        newValue: value,
        oldValue: '',
      });
    });

    // 2. Restore overwritten target cells
    this.overwrittenData.forEach(({ cellId, value }) => {
      updates.push({
        cellId,
        newValue: value,
        oldValue: this.fileManager.getRawCellValue(cellId),
      });
    });

    // Apply all updates
    this._applyUpdates(updates);
  }

  /**
   * Helper to apply cell updates
   * @private
   */
  _applyUpdates(updates) {
    updates.forEach(({ cellId, newValue }) => {
      // Update file manager
      this.fileManager.updateCellData(cellId, newValue);

      // Update worker
      if (!newValue || newValue === '') {
        this.formulaWorker.postMessage({
          type: 'clearCell',
          payload: { cellId },
        });
      } else if (String(newValue).startsWith('=')) {
        this.formulaWorker.postMessage({
          type: 'setFormula',
          payload: { cellId, formulaString: newValue },
        });
      } else {
        this.formulaWorker.postMessage({
          type: 'setCellValue',
          payload: { cellId, value: newValue },
        });
      }
    });
  }
}
```

**Modifications to `spreadsheet.js` for move:**

```javascript
// Add import
import { MoveRangeCommand } from './history/commands/MoveRangeCommand.js';

// Refactor _stopDrag method
_stopDrag() {
  if (!this.isDraggingCells) return;

  const ghostRect = this.ghostElement.getBoundingClientRect();
  const dropTarget = document
    .elementFromPoint(ghostRect.left + 2, ghostRect.top + 2)
    .closest('.cell');

  if (dropTarget) {
    const dropCoords = this._getCellCoords(dropTarget);
    const { dragStartCoords, selection } = this.dragInfo;

    const rowOffset = dropCoords.row - dragStartCoords.row;
    const colOffset = dropCoords.col - dragStartCoords.col;

    // Only execute move if there's actual movement
    if (rowOffset !== 0 || colOffset !== 0) {
      this._executeMoveCommand(selection, colOffset, rowOffset, dropCoords);
    }
  }

  // Cleanup
  this.ghostElement.remove();
  this.ghostElement = null;
  this.isDraggingCells = false;
  this.dragInfo = {};
  this.cellGridContainer.style.cursor = 'default';
  window.removeEventListener('mousemove', this._onDrag);
}

// New method to create and execute move command
_executeMoveCommand(selection, colOffset, rowOffset, targetTopLeft) {
  const { start, end } = selection;
  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);
  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);

  // Collect data being moved
  const movedData = [];
  for (let col = minCol; col <= maxCol; col++) {
    for (let row = minRow; row <= maxRow; row++) {
      const cellId = this._buildCellId(row, col);
      const value = this.fileManager.getRawCellValue(cellId);
      if (value) {
        movedData.push({ cellId, value });
      }
    }
  }

  // Collect data being overwritten at destination
  const overwrittenData = [];
  const targetMinCol = targetTopLeft.col;
  const targetMinRow = targetTopLeft.row;
  const targetMaxCol = targetMinCol + (maxCol - minCol);
  const targetMaxRow = targetMinRow + (maxRow - minRow);

  for (let col = targetMinCol; col <= targetMaxCol; col++) {
    for (let row = targetMinRow; row <= targetMaxRow; row++) {
      const cellId = this._buildCellId(row, col);
      const value = this.fileManager.getRawCellValue(cellId);
      if (value) {
        overwrittenData.push({ cellId, value });
      }
    }
  }

  // Create and execute command
  const command = new MoveRangeCommand({
    sourceRange: { minCol, maxCol, minRow, maxRow },
    targetTopLeft,
    movedData,
    overwrittenData,
    fileManager: this.fileManager,
    formulaWorker: this.formulaWorker,
    spreadsheet: this
  });

  this.historyManager.execute(command);

  // Update selection to new location
  const newStart = {
    col: start.col + colOffset,
    row: start.row + rowOffset
  };
  const newEnd = {
    col: end.col + colOffset,
    row: end.row + rowOffset
  };
  this.selections = [{ start: newStart, end: newEnd }];
  this.selectionAnchor = newStart;
  this._setActiveCell(this._getCellElement(newStart));
  this._renderSelections();
}
```

---

## 7. Non-Functional Requirements

| ID       | Type                  | Requirement                                                            | Verification                                                 |
| :------- | :-------------------- | :--------------------------------------------------------------------- | :----------------------------------------------------------- |
| **NFR1** | **Performance**       | Command execution (edit/clear) must complete in <100ms for <1000 cells | Unit test with timer                                         |
| **NFR2** | **Data Integrity**    | State must be 100% consistent after any undo/redo sequence             | E2E test: 20 operations → undo all → redo all → verify state |
| **NFR3** | **Async Safety**      | Commands must work correctly despite async worker responses            | Integration test with intentional worker delay               |
| **NFR4** | **Memory Efficiency** | Stack of 100 commands with 1000 cells each must use <50MB RAM          | Manual profiling with Chrome DevTools                        |
| **NFR5** | **Extensibility**     | Adding new command types must not require modifying HistoryManager     | Code review checklist                                        |

---

## 8. Testing Strategy (Per Epic 2)

### 8.1 Unit Tests (Vitest)

**File:** `tests/history/HistoryManager.test.js`

```javascript
import { describe, it, expect, vi } from 'vitest';
import { HistoryManager } from '../../js/history/HistoryManager.js';

describe('HistoryManager', () => {
  it('executes command and adds to undo stack', () => {
    const manager = new HistoryManager();
    const mockCommand = {
      execute: vi.fn(),
      undo: vi.fn(),
    };

    manager.execute(mockCommand);

    expect(mockCommand.execute).toHaveBeenCalledTimes(1);
    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(false);
  });

  it('clears redo stack on new command', () => {
    const manager = new HistoryManager();
    const cmd1 = { execute: vi.fn(), undo: vi.fn() };
    const cmd2 = { execute: vi.fn(), undo: vi.fn() };

    manager.execute(cmd1);
    manager.undo();
    expect(manager.canRedo()).toBe(true);

    manager.execute(cmd2);
    expect(manager.canRedo()).toBe(false);
  });

  it('enforces max stack size', () => {
    const manager = new HistoryManager(3);
    const commands = [
      { execute: vi.fn(), undo: vi.fn() },
      { execute: vi.fn(), undo: vi.fn() },
      { execute: vi.fn(), undo: vi.fn() },
      { execute: vi.fn(), undo: vi.fn() },
    ];

    commands.forEach((cmd) => manager.execute(cmd));

    // Should only have last 3 commands
    expect(manager.undoStack.length).toBe(3);
    expect(manager.undoStack[0]).toBe(commands[1]); // First command removed
  });

  it('handles undo/redo correctly', () => {
    const manager = new HistoryManager();
    const command = {
      execute: vi.fn(),
      undo: vi.fn(),
    };

    manager.execute(command);
    expect(command.execute).toHaveBeenCalledTimes(1);

    manager.undo();
    expect(command.undo).toHaveBeenCalledTimes(1);

    manager.redo();
    expect(command.execute).toHaveBeenCalledTimes(2);
  });
});
```

**File:** `tests/history/UpdateCellsCommand.test.js`

```javascript
import { describe, it, expect, vi } from 'vitest';
import { UpdateCellsCommand } from '../../js/history/commands/UpdateCellsCommand.js';

describe('UpdateCellsCommand', () => {
  it('updates fileManager and worker on execute', () => {
    const mockFileManager = {
      updateCellData: vi.fn(),
    };
    const mockWorker = {
      postMessage: vi.fn(),
    };

    const command = new UpdateCellsCommand({
      cellUpdates: [{ cellId: 'A1', newValue: '5', oldValue: '' }],
      fileManager: mockFileManager,
      formulaWorker: mockWorker,
    });

    command.execute();

    expect(mockFileManager.updateCellData).toHaveBeenCalledWith('A1', '5');
    expect(mockWorker.postMessage).toHaveBeenCalledWith({
      type: 'setCellValue',
      payload: { cellId: 'A1', value: '5' },
    });
  });

  it('handles formula values correctly', () => {
    const mockFileManager = { updateCellData: vi.fn() };
    const mockWorker = { postMessage: vi.fn() };

    const command = new UpdateCellsCommand({
      cellUpdates: [{ cellId: 'B1', newValue: '=A1+10', oldValue: '5' }],
      fileManager: mockFileManager,
      formulaWorker: mockWorker,
    });

    command.execute();

    expect(mockWorker.postMessage).toHaveBeenCalledWith({
      type: 'setFormula',
      payload: { cellId: 'B1', formulaString: '=A1+10' },
    });
  });

  it('handles empty values (clear) correctly', () => {
    const mockFileManager = { updateCellData: vi.fn() };
    const mockWorker = { postMessage: vi.fn() };

    const command = new UpdateCellsCommand({
      cellUpdates: [{ cellId: 'C1', newValue: '', oldValue: '100' }],
      fileManager: mockFileManager,
      formulaWorker: mockWorker,
    });

    command.execute();

    expect(mockWorker.postMessage).toHaveBeenCalledWith({
      type: 'clearCell',
      payload: { cellId: 'C1' },
    });
  });

  it('restores old values on undo', () => {
    const mockFileManager = { updateCellData: vi.fn() };
    const mockWorker = { postMessage: vi.fn() };

    const command = new UpdateCellsCommand({
      cellUpdates: [{ cellId: 'A1', newValue: '10', oldValue: '5' }],
      fileManager: mockFileManager,
      formulaWorker: mockWorker,
    });

    command.execute();
    mockFileManager.updateCellData.mockClear();
    mockWorker.postMessage.mockClear();

    command.undo();

    expect(mockFileManager.updateCellData).toHaveBeenCalledWith('A1', '5');
  });

  it('handles multiple cells in one command', () => {
    const mockFileManager = { updateCellData: vi.fn() };
    const mockWorker = { postMessage: vi.fn() };

    const command = new UpdateCellsCommand({
      cellUpdates: [
        { cellId: 'A1', newValue: '1', oldValue: '' },
        { cellId: 'A2', newValue: '2', oldValue: '' },
        { cellId: 'A3', newValue: '3', oldValue: '' },
      ],
      fileManager: mockFileManager,
      formulaWorker: mockWorker,
    });

    command.execute();

    expect(mockFileManager.updateCellData).toHaveBeenCalledTimes(3);
    expect(mockWorker.postMessage).toHaveBeenCalledTimes(3);
  });
});
```

### 8.2 E2E Tests (Playwright)

**File:** `tests/e2e/history.spec.js`

```javascript
import { test, expect } from '@playwright/test';

test.describe('History Management (Undo/Redo)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5000');
    await page.waitForSelector('[data-id="A1"]');
  });

  test('undo single cell edit', async ({ page }) => {
    // Edit cell A1
    await page.click('[data-id="A1"]');
    await page.keyboard.type('Hello');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-id="A1"]')).toHaveText('Hello');

    // Undo
    await page.keyboard.press('Control+Z');
    await expect(page.locator('[data-id="A1"]')).toHaveText('');
  });

  test('redo after undo', async ({ page }) => {
    // Edit
    await page.click('[data-id="A1"]');
    await page.keyboard.type('Test');
    await page.keyboard.press('Enter');

    // Undo
    await page.keyboard.press('Control+Z');
    await expect(page.locator('[data-id="A1"]')).toHaveText('');

    // Redo
    await page.keyboard.press('Control+Y');
    await expect(page.locator('[data-id="A1"]')).toHaveText('Test');
  });

  test('undo clears multiple cells', async ({ page }) => {
    // Enter values in A1, A2, A3
    await page.click('[data-id="A1"]');
    await page.keyboard.type('1');
    await page.keyboard.press('Enter');
    await page.keyboard.type('2');
    await page.keyboard.press('Enter');
    await page.keyboard.type('3');
    await page.keyboard.press('Enter');

    // Select A1:A3 and delete
    await page.click('[data-id="A1"]');
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Delete');

    await expect(page.locator('[data-id="A1"]')).toHaveText('');
    await expect(page.locator('[data-id="A2"]')).toHaveText('');
    await expect(page.locator('[data-id="A3"]')).toHaveText('');

    // Undo
    await page.keyboard.press('Control+Z');
    await expect(page.locator('[data-id="A1"]')).toHaveText('1');
    await expect(page.locator('[data-id="A2"]')).toHaveText('2');
    await expect(page.locator('[data-id="A3"]')).toHaveText('3');
  });

  test('undo formula recalculation', async ({ page }) => {
    // Set A1 = 5
    await page.click('[data-id="A1"]');
    await page.keyboard.type('5');
    await page.keyboard.press('Enter');

    // Set B1 = =A1*2
    await page.click('[data-id="B1"]');
    await page.keyboard.type('=A1*2');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-id="B1"]')).toHaveText('10');

    // Undo formula
    await page.keyboard.press('Control+Z');
    await expect(page.locator('[data-id="B1"]')).toHaveText('');

    // Redo formula
    await page.keyboard.press('Control+Y');
    await expect(page.locator('[data-id="B1"]')).toHaveText('10');
  });

  test('stress test: 20 operations undo/redo cycle', async ({ page }) => {
    // Perform 20 edits
    for (let i = 1; i <= 20; i++) {
      await page.click(`[data-id="A${i}"]`);
      await page.keyboard.type(`Value${i}`);
      await page.keyboard.press('Enter');
    }

    // Verify all values present
    for (let i = 1; i <= 20; i++) {
      await expect(page.locator(`[data-id="A${i}"]`)).toHaveText(`Value${i}`);
    }

    // Undo all 20
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Control+Z');
    }

    // Verify all cleared
    for (let i = 1; i <= 20; i++) {
      await expect(page.locator(`[data-id="A${i}"]`)).toHaveText('');
    }

    // Redo all 20
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Control+Y');
    }

    // Verify all restored
    for (let i = 1; i <= 20; i++) {
      await expect(page.locator(`[data-id="A${i}"]`)).toHaveText(`Value${i}`);
    }
  });

  test('new action clears redo stack', async ({ page }) => {
    // Edit A1
    await page.click('[data-id="A1"]');
    await page.keyboard.type('First');
    await page.keyboard.press('Enter');

    // Undo
    await page.keyboard.press('Control+Z');

    // Make new edit
    await page.click('[data-id="A1"]');
    await page.keyboard.type('Second');
    await page.keyboard.press('Enter');

    // Try to redo - should do nothing
    await page.keyboard.press('Control+Y');
    await expect(page.locator('[data-id="A1"]')).toHaveText('Second');
  });

  test('undo column resize', async ({ page }) => {
    // Get initial width
    const initialWidth = await page
      .locator('[data-col="0"]')
      .evaluate((el) => window.getComputedStyle(el).width);

    // Resize column A (implementation depends on UI)
    // This is a placeholder - actual implementation will vary

    // Undo resize
    await page.keyboard.press('Control+Z');

    // Verify width restored
    const restoredWidth = await page
      .locator('[data-col="0"]')
      .evaluate((el) => window.getComputedStyle(el).width);
    expect(restoredWidth).toBe(initialWidth);
  });
});
```

### 8.3 Integration Tests

**Test Worker Synchronization:**

```javascript
test('commands work correctly with async worker', async ({ page }) => {
  // Set formula that depends on A1
  await page.click('[data-id="B1"]');
  await page.keyboard.type('=A1*2');
  await page.keyboard.press('Enter');

  // Rapidly edit A1 and undo
  await page.click('[data-id="A1"]');
  await page.keyboard.type('5');
  await page.keyboard.press('Enter');

  // Wait for worker to calculate
  await expect(page.locator('[data-id="B1"]')).toHaveText('10');

  // Immediately undo
  await page.keyboard.press('Control+Z');

  // Both cells should be empty after worker processes
  await expect(page.locator('[data-id="A1"]')).toHaveText('');
  await expect(page.locator('[data-id="B1"]')).toHaveText('0');
});
```

---

## 9. Implementation Timeline

| Phase       | Tasks                   | Deliverables                                                                                                                                                   | Hours        |
| :---------- | :---------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------- |
| **Phase 1** | Core Infrastructure     | - HistoryManager.js<br>- Command.js<br>- Unit tests for both                                                                                                   | 4            |
| **Phase 2** | UpdateCellsCommand      | - UpdateCellsCommand.js<br>- Unit tests<br>- Integration with worker                                                                                           | 6            |
| **Phase 3** | Spreadsheet Integration | - Refactor \_updateCell()<br>- Refactor \_clearSelectedCells()<br>- Implement basic \_handlePaste()<br>- Add keyboard shortcuts<br>- Update loadFromFile/clear | 8            |
| **Phase 4** | ResizeCommand           | - ResizeCommand.js<br>- Refactor \_stopResize()<br>- Unit tests                                                                                                | 4            |
| **Phase 5** | MoveRangeCommand        | - MoveRangeCommand.js<br>- Refactor \_stopDrag()<br>- Unit tests                                                                                               | 5            |
| **Phase 6** | E2E Testing             | - All E2E test scenarios<br>- Stress testing<br>- Integration tests                                                                                            | 6            |
| **Phase 7** | Edge Cases & Polish     | - Handle edge cases<br>- Memory profiling<br>- Performance optimization                                                                                        | 4            |
| **Phase 8** | Documentation           | - Update README<br>- Code comments<br>- Developer guide                                                                                                        | 3            |
| **Total**   |                         | **Epic Complete**                                                                                                                                              | **40 hours** |

---

## 10. Critical Implementation Notes

### 10.1 Async Worker Considerations

**The Challenge:**

- Commands execute synchronously: `command.execute()`
- Worker updates are asynchronous: `postMessage` → [processing] → `onmessage`
- DOM updates happen after worker response

**The Solution:**

```
Command Pattern handles this correctly:

1. command.execute() called
   ├─► fileManager.updateCellData() [SYNC - source of truth updated]
   └─► worker.postMessage()          [ASYNC - calculation triggered]

2. User sees immediate feedback from fileManager
3. Worker sends 'updates' message (10-50ms later)
4. _applyUpdates() updates DOM with calculated value

Result: State is always consistent, even during rapid undo/redo
```

### 10.2 Memory Management Strategy

**Per-Command Memory Estimate:**

```javascript
// Small edit (1 cell):
{ cellId: 'A1', newValue: '5', oldValue: '' }
// ~80 bytes

// Large clear (100 cells):
100 * { cellId: 'A1', newValue: '', oldValue: 'some value' }
// ~8KB

// Stack of 100 commands (worst case):
100 commands * 8KB = 800KB (acceptable)
```

**Memory Limit Enforcement:**

```javascript
// In HistoryManager.execute()
if (this.undoStack.length > this.maxStackSize) {
  this.undoStack.shift(); // Remove oldest command
}
```

### 10.3 Command Coalescing Decision

**NOT implementing in V1:**

- Simpler code
- Clearer UX
- Can add later if users request it

**If implementing later:**

```javascript
// Example: Coalesce rapid edits to same cell
class HistoryManager {
  execute(command) {
    const lastCommand = this.undoStack[this.undoStack.length - 1];

    // If same cell edited within 500ms, merge commands
    if (
      lastCommand &&
      lastCommand.canMergeWith &&
      lastCommand.canMergeWith(command)
    ) {
      lastCommand.merge(command);
    } else {
      command.execute();
      this.undoStack.push(command);
    }

    this.redoStack = [];
  }
}
```

### 10.4 FileManager Autosave Interaction

**Current behavior:**

```javascript
// In fileManager.updateCellData():
this.markAsModified();
this.queueAutosave(); // Debounced 500ms
```

**With commands:**

- Each command execution triggers autosave (correct!)
- Undo/redo also trigger autosave (correct!)
- User sees "saving..." indicator during undo/redo (expected)

**No changes needed - this is the correct behavior.**

---

## 11. Success Criteria

### 11.1 Functional Success

✅ All user stories demonstrable
✅ Undo works for: edit, clear, paste, resize, move
✅ Redo works for all undone actions
✅ New action clears redo stack
✅ Keyboard shortcuts work reliably

### 11.2 Technical Success

✅ All unit tests pass (>90% coverage for new code)
✅ All E2E tests pass
✅ Stress test: 20+ operations → undo all → redo all → state correct
✅ No memory leaks (profiled in Chrome DevTools)
✅ No race conditions with async worker
✅ Code follows existing patterns and conventions

### 11.3 Performance Success

✅ Single cell edit: <50ms execution time
✅ 100-cell clear: <200ms execution time
✅ Undo/redo: <100ms execution time
✅ No noticeable UI lag during operations

---

## 12. Risks & Mitigations

| Risk                                 | Impact | Probability | Mitigation                                                    |
| :----------------------------------- | :----- | :---------- | :------------------------------------------------------------ |
| **Worker async timing issues**       | High   | Medium      | Extensive integration testing; fileManager is source of truth |
| **Memory usage with large commands** | Medium | Medium      | Enforce stack size limit; profile with DevTools               |
| **Paste not implemented**            | High   | High        | Implement basic paste in Phase 3 OR descope from epic         |
| **Complex formula dependencies**     | Medium | Low         | Worker handles this; command just triggers recalc             |
| **Performance on large operations**  | Medium | Medium      | Test with 1000+ cell operations; optimize if needed           |

---

## 13. Open Questions & Decisions

### 13.1 Resolved Decisions

✅ **Command Coalescing:** Not implementing in V1
✅ **Stack Size:** 100 commands maximum
✅ **Paste Implementation:** Will implement basic paste in Phase 3
✅ **UpdateCellsCommand Scope:** Single command handles edit/clear/paste

### 13.2 Deferred Decisions

⏸ **Formatting undo:** Wait for Epic 3 (Cell Formatting)
⏸ **Toolbar buttons:** Wait for UI polish phase
⏸ **Command descriptions:** Could add `command.description()` for UI display

---

## 14. Developer Checklist

Before starting implementation:

- [ ] Read Epic 2 (Testing & Logging) to understand test requirements
- [ ] Review current `spreadsheet.js` code (lines 1-1100)
- [ ] Understand `fileManager.js` API
- [ ] Review `formula-worker.js` message protocol
- [ ] Set up Vitest for unit testing
- [ ] Set up Playwright for E2E testing

Phase completion checklist:

- [ ] Phase 1: Core infrastructure tested and working
- [ ] Phase 2: UpdateCellsCommand tested with mocks
- [ ] Phase 3: Integration complete, basic undo/redo working
- [ ] Phase 4: Resize undo/redo working
- [ ] Phase 5: Move undo/redo working
- [ ] Phase 6: All E2E tests passing
- [ ] Phase 7: Edge cases handled, performance verified
- [ ] Phase 8: Documentation updated

---

**This epic is ready for implementation. Begin with Phase 1 and proceed sequentially.**
