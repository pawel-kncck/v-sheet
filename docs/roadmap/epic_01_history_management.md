Here is the complete Product Requirements Document (PRD) for the "History Management" epic, updated to include your feedback.

---

# PRD: Epic 1: History Management (Undo/Redo)

- **Status:** Draft
- **Date:** November 15, 2025
- **Author:** v-sheet Team

---

## 1\. Overview

This document outlines the requirements for implementing a "History Management" (Undo/Redo) system. This is a foundational feature, critical for user confidence and error recovery. Lacking this feature, any user mistake is permanent, leading to frustration and a high-stakes editing environment. This epic will introduce a robust, command-based history stack that allows users to undo and redo their actions seamlessly.

---

## 2\. Problem Statement

- **Problem:** Users have no "safety net." Any action—from a simple typo to accidentally deleting a complex formula or pasting incorrect data—is irreversible.
- **Impact:** This creates a high-anxiety user experience. Users are afraid to make changes and are severely punished for simple mistakes, which undermines the tool's utility as a flexible data editor.
- **Current State:** All actions in `spreadsheet.js` (like `_updateCell`, `_clearSelectedCells`, `_moveSelection`, and `_handlePaste`) are final and overwrite data permanently. The application has no state history.

---

## 3\. Goals & Objectives

- **User Goal:** To confidently edit, knowing any mistake can be instantly reversed with an "undo."
- **Product Goal:** To meet the absolute minimum usability standard for a modern editor, thereby reducing user frustration and increasing adoption.
- **Technical Goal:** To implement a scalable, extensible history system (the **Command Pattern**) that all future features (like formatting, cell merging, etc.) can integrate with.

---

## 4\. Scope

### In Scope

- **History Stacks:** Implementation of an `UndoStack` and a `RedoStack`.
- **Tracked Actions:** The following data-mutating actions _must_ be undo-able:
  - **Cell Edit:** Setting a new value or formula for a cell.
  - **Cell Clear:** Clearing the content of one or more cells.
  - **Cell Paste:** Pasting data into a range of cells.
  - **Cell Move:** Dragging and dropping a range to a new location.
  - **Column Resize:** Resizing one or more columns.
  - **Row Resize:** Resizing one or more rows.
- **UI Integration:**
  - Keyboard shortcuts: `Ctrl+Z` (or `Cmd+Z`) for Undo.
  - Keyboard shortcuts: `Ctrl+Y` (or `Cmd+Y` / `Cmd+Shift+Z`) for Redo.

### Out of Scope (For This Epic)

- **Formatting:** Undoing formatting changes (e.g., bold, color) will be part of the "Cell Formatting" epic.
- **File Operations:** This feature will _not_ track file-level actions (e.g., "Undo File Rename," "Undo File Deletion").
- **Copy Action:** The "Copy" (Ctrl+C) action is non-mutating and will not be tracked. Only "Paste" (Ctrl+V) will be.
- **UI State:** Non-data actions like selecting a cell or scrolling will _not_ be tracked.
- **Toolbar UI:** Adding visual Undo/Redo buttons to the menu is a follow-up task (though the shortcuts must work).

---

## 5\. User Stories

- **As a user,** I want to undo typing in a cell so that I can revert a simple mistake.
- **As a user,** I want to undo clearing a range of important data so that I can recover it instantly.
- **As a user,** I want to undo pasting a block of data so I can revert the change.
- **As a user,** I want to undo moving a table of data so that I can put it back where it was.
- **As a user,** I want to undo resizing a column so that I can restore my previous layout.
- **As a user,** I want to redo an action I just undid so that I can toggle between "before" and "after" states.
- **As a user,** I want to use `Ctrl+Z` and `Ctrl+Y` because they are universal, learned shortcuts.

---

## 6\. Functional Requirements

| ID        | Requirement              | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| :-------- | :----------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR1.1** | **History Stack**        | The system must maintain an `UndoStack` and a `RedoStack`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **FR1.2** | **Redo Stack Clearing**  | Executing any new action (a new command) must clear the `RedoStack`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **FR2.1** | **Command Interface**    | All "Commands" must implement an `execute()` method and an `undo()` method.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **FR2.2** | **Command: UpdateRange** | A robust command to handle any batch-update of cell values. The command must store a _list_ of cell changes, where each change includes the `cellId`, its `newValue`, and its `oldValue`. <br> This single command will be created and executed by: <br> 1. **Single Cell Edit** (from `_commitEdit`) <br> 2. **Cell Clear** (from `_clearSelectedCells`) <br> 3. **Cell Paste** (from `_handlePaste`) <br> Its `execute()` and `undo()` methods must correctly update the `file-manager.js` data and send the corresponding `setFormula` or `setCellValue` messages to the `formula-worker.js`. |
| **FR2.3** | **Command: Cell Move**   | A `MoveRangeCommand` must be created. It must store the source range, destination range, and all cell data that was overwritten at the destination. Its `undo()` method must restore the data to its original location and restore the overwritten data.                                                                                                                                                                                                                                                                                                                                         |
| **FR2.4** | **Command: Resize**      | `ResizeColumnCommand` and `ResizeRowCommand` must be created. They must store the column/row indices, `newSize`, and `oldSize`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **FR3.1** | **Undo Shortcut**        | Pressing `Ctrl+Z` (or `Cmd+Z`) must pop a command from the `UndoStack`, call its `undo()` method, and push the command to the `RedoStack`.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **FR3.2** | **Redo Shortcut**        | Pressing `Ctrl+Y` (or `Cmd+Y` / `Cmd+Shift+Z`) must pop a command from the `RedoStack`, call its `execute()` method, and push the command to the `UndoStack`.                                                                                                                                                                                                                                                                                                                                                                                                                                    |

---

## 7\. Non-Functional Requirements

| ID       | Type               | Requirement                                                                                                                                                                                                                                                       |
| :------- | :----------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NFR1** | **Performance**    | All `execute()` and `undo()` operations for common actions (cell edits) must complete in under 100ms.                                                                                                                                                             |
| **NFR2** | **Data Integrity** | The application state must be 100% consistent after any number of undo/redo operations. There must be no "desynchronization" between the `file-manager.js` (source of truth) and the `FormulaEngine.js` (calculated state).                                       |
| **NFR3** | **Extensibility**  | The `HistoryManager` must be decoupled from the commands. It should not know _what_ a command does, only that it _has_ an `execute()` and `undo()` method. This will allow the "Cell Formatting" epic to add a `FormatCellCommand` without modifying the manager. |

---

## 8\. High-Level Implementation Plan

1.  **Create `HistoryManager.js`:** This class will contain the `undoStack`, `redoStack`, and the public `execute()`, `undo()`, and `redo()` methods.
2.  **Create `js/commands/` Directory:** A new directory will house all command classes (e.g., `UpdateRangeCommand.js`, `MoveRangeCommand.js`, `ResizeColumnCommand.js`).
3.  **Refactor `spreadsheet.js`:**
    - All event-driven action logic (e.g., in `_commitEdit`, `_stopResize`, `_stopDrag`, `_clearSelectedCells`, `_handlePaste`) will be refactored.
    - Instead of performing the action directly, these methods will now **instantiate** the appropriate command (e.g., `new UpdateRangeCommand(...)`).
    - They will then pass this command to `historyManager.execute(myCommand)`.
4.  **Integrate `formula-worker.js`:** The `execute()` and `undo()` methods within the commands will be responsible for `postMessage`-ing the correct payload (e.g., `setFormula`, `setCellValue`) to the formula worker.
5.  **Add Key Listeners:** Add the global keyboard listeners for Undo/Redo shortcuts.

---

## 9\. Success Metrics

- All user stories are demonstrable and pass E2E testing.
- **Stress Test:** A user can perform 20+ actions (a mix of all "In Scope" actions), undo all of them, and then redo all of them, arriving back at the identical, correct application state.
- **No Regressions:** All existing functionality (formula calculation, dependency tracking, file saving) works perfectly with the new history system.

---

## 10\. Open Questions & Risks

- **Command Coalescing:** How should rapid-fire, identical actions be handled?
  - **Example:** A user typing "Hello" in a cell. Should this be 5 undo-able actions (`H`, `e`, `l`, `l`, `o`) or one?
  - **Decision:** For typing, the action should be coalesced. The `UpdateRangeCommand` should only be created and executed once, in the `_commitEdit` function, not on every keypress.
- **Stack Size:** Is there a limit to the undo stack?
  - **Decision:** For V1, no limit will be imposed. We can add a limit (e.g., 100 actions) later if memory becomes a concern.
