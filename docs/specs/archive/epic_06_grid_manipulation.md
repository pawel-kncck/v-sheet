Here is the PRD for Epic 6: Grid Manipulation.

---

# PRD: Epic 6: Grid Manipulation

- **Status:** Draft
- **Date:** November 15, 2025
- **Author:** v-sheet Team
- **Depends On:** Epic 1 (History Management), Epic 2 (Testing & Logging), Epic 5 (Multi-Sheet Support)

---

## 1. Overview

This document outlines the requirements for "Grid Manipulation," a feature that allows users to insert and delete rows and columns from the spreadsheet. This is a critical feature that gives users control over their sheet's structure. This epic's core challenge is not just the visual change, but the **intelligent and automatic adjustment of all formulas** to reflect the new grid layout, including the expansion/contraction of ranges and the handling of deleted references.

---

## 2. Problem Statement

- **Problem:** The grid is static. Users cannot add a new row for "Total" at the bottom of their data, nor can they delete an extra column they don't need. The grid size is fixed at 100 rows and 26 columns.
- **Impact:** This makes the application incredibly rigid. Users must plan their entire sheet layout in advance and cannot adapt it as their model grows or changes. This is a major blocker for any real-world use case.
- **Current State:** There is no UI or engine logic for inserting or deleting rows/columns. The `spreadsheet.js` class has hardcoded `ROWS = 100, COLS = 26` constants that define the grid's boundaries.

---

## 3. Goals & Objectives

- **User Goal:** "I want to add new rows and columns (or delete them) and have my formulas _just work_ without me having to manually fix every reference."
- **Product Goal:** To make the grid structure flexible and dynamic, allowing users to intuitively evolve their spreadsheet layout over time.
- **Technical Goal:** To create a powerful "reference-shifting" engine that can programmatically rewrite all affected formulas and cell data in response to grid insertions or deletions, ensuring all data and references remain consistent.

---

## 4. Scope

### In Scope

- **Core Actions:**
  - Insert Row (above the selected row).
  - Insert Column (to the left of the selected column).
  - Delete Row (the selected row).
  - Delete Column (the selected column).
- **Formula Adjustment:** The core of the epic. The engine must intelligently update all formulas in the _entire workbook_ that are affected by the insertion/deletion.
  - **Shifting:** `A1+A3` must become `A1+A4` if a row is inserted at row 2.
  - **Range Expansion:** `SUM(A1:A10)` must become `SUM(A1:A11)` if a row is inserted inside that range.
  - **Range Contraction:** `SUM(A1:A10)` must become `SUM(A1:A9)` if a row is deleted inside that range.
  - **Reference Error:** Deleting a row/column _directly_ referenced by a formula (e.g., deleting row 2, which is used in `=A2`) must cause the formula to return a `#REF!` error.
- **UI:** A new right-click context menu on the row and column headers to trigger these actions.
- **Data Shifting:** When a row/col is inserted, all data (values, formulas, styles) below/right must be shifted down/right. When deleted, data must be shifted up/left.
- **History Integration:** All insert/delete actions must be single, atomic, and undo-able commands (from Epic 1).

### Out of Scope (For This Epic)

- **Dynamic Grid Size:** For V1, this epic will _shift_ data within the existing 100x26 grid. For example, inserting a row at row 100 is not allowed, and deleting row 100 simply clears it. Changing the _total_ number of rows/cols (e.g., to 101) is out of scope.
- **Moving Rows/Columns:** This feature is only for inserting and deleting, _not_ for re-ordering (e.g., "drag column B to be after column C").
- **Hiding Rows/Columns:** This is a separate formatting/visibility feature.

---

## 5. User Stories

- **As a user,** I want to right-click on the "Row 5" header and select "Insert 1 above" so I can add a new entry.
- **As a user,** when I insert a row above my `SUM(A1:A10)` formula, I expect my data in `A1:A10` to move to `A2:A11` and the formula to _automatically_ update to `=SUM(A2:A11)`.
- **As a user,** I want to delete "Column C" which is empty, and have my formula `SUM(B1:D1)` automatically become `SUM(B1:C1)`.
- **As a user,** I want to delete "Column C" which contains data referenced by `B1`, and I expect to see a `#REF!` error in `B1`.
- **As a user,** I want to press `Ctrl+Z` to undo my "delete column" action and see all my data and formulas restored perfectly.

---

## 6. Functional Requirements

| ID        | Requirement                    | Description                                                                                                                                                                                                                                                                                               |
| :-------- | :----------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR1.1** | **UI: Context Menu**           | Right-clicking a column header (e.g., 'A') or row header (e.g., '5') must show a context menu with options: "Insert 1 left/above" and "Delete column/row".                                                                                                                                                |
| **FR2.1** | **Engine: "Shifter" Utility**  | A new, high-level utility (e.g., `GridShifter.js`) must be created. This utility will be responsible for the entire operation.                                                                                                                                                                            |
| **FR2.2** | **Shifter: Data Shifting**     | The `GridShifter` must iterate _all_ cells in the affected sheet(s) and programmatically change their `cellId` in the `file-manager.js` data. (e.g., on inserting at row 2, `A2` data is moved to `A3`, `A3` to `A4`, etc.).                                                                              |
| **FR2.3** | **Shifter: Formula Rewriting** | The `GridShifter` must iterate _all_ formulas in the _entire workbook_ (all sheets, using logic from Epic 5). It must parse them (using `Tokenizer`) and intelligently rewrite all `CELL_REF` and `RANGE` references based on the insertion/deletion.                                                     |
| **FR2.4** | **Engine: `#REF!` Generation** | The "Shifter" must detect when a deletion _invalidates_ a reference. It must replace the formula with one that explicitly returns `#REF!` (e.g., `A1+A2` becomes `A1+#REF!` if row 2 is deleted).                                                                                                         |
| **FR2.5** | **Engine: Graph Update**       | After all formulas are rewritten, the `DependencyGraph` must be completely rebuilt for the affected sheet(s) to reflect the new dependencies.                                                                                                                                                             |
| **FR3.1** | **History Integration**        | New commands (`InsertRowCommand`, `DeleteRowCommand`, `InsertColumnCommand`, `DeleteColumnCommand`) must be created.                                                                                                                                                                                      |
| **FR3.2** | **Command Atomicity**          | These commands must be atomic. Their `execute()` method will call the `GridShifter`. The `undo()` method must call the `GridShifter` with the _opposite_ operation (e.g., `DeleteRowCommand.undo()` calls the `GridShifter`'s `insertRow` function) and must also restore any cell data that was deleted. |
| **FR4.1** | **Testing**                    | A comprehensive unit test suite must be built for the `GridShifter` logic, covering all formula-shifting edge cases (e.g., inserting at `A1`, deleting last row, complex ranges). E2E tests must verify all user stories.                                                                                 |

---

## 7. Non-Functional Requirements

| ID       | Type               | Requirement                                                                                                                                                                                      |
| :------- | :----------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NFR1** | **Performance**    | An insert/delete operation on a sheet with 5,000 formulas must complete in an acceptable time (e.g., < 3 seconds). This is a heavy-duty operation.                                               |
| **NFR2** | **Data Integrity** | This is the most critical NFR. **No data or formulas may be lost or corrupted.** The formula-shifting logic must be 100% accurate and handle all cases (relative, absolute, mixed, cross-sheet). |
| **NFR3** | **Atomicity**      | The entire operation must be atomic. If the formula-shifting fails, the entire operation should roll back, leaving the sheet in its original state.                                              |
| **NFA4** | **Dependency**     | This feature _must_ be built _after_ Epic 5 (Multi-Sheet Support) is complete. The logic relies on the global `SheetName!A1` identifiers and cross-sheet dependency engine from that epic.       |

---

## 8. High-Level Implementation Plan

1.  **Phase 1: `GridShifter` Utility (Headless)**
    - Create `GridShifter.js`.
    - Build the core `shift(action, type, index)` function.
    - Build the **formula rewriting** logic. This is the hardest part. It will iterate every formula, tokenize it, find references, and use `CellHelpers` to check/adjust them.
    - Build the **data-shifting** logic to move data within the `file-manager.js` `sheets` object.
    - Build the logic to generate `#REF!` errors.
2.  **Phase 2: Unit Testing**
    - Write extensive unit tests for the `GridShifter`, covering dozens of edge cases.
3.  **Phase 3: History Integration**
    - Create the four new command classes (e.g., `InsertRowCommand`).
    - Their `execute()` methods will call `GridShifter.shift(...)` and store a copy of any deleted data.
    - Their `undo()` methods will call `GridShifter.shift(...)` with the inverse operation and re-insert the deleted data.
4.  **Phase 4: UI Implementation**
    - Create the right-click context menu on the row/column headers in `spreadsheet.js`.
    - Hook the menu buttons to create and execute the new commands via the `HistoryManager`.
    - The grid must then be completely re-rendered.
5.  **Phase 5: E2E Testing**
    - Create E2E tests for all user stories.

---

## 9. Success Metrics

- All user stories are demonstrable.
- **Formula Integrity:** A test sheet with 100+ formulas of varying complexity (relative, absolute, mixed, cross-sheet, ranges) can have rows/cols inserted and deleted and all formulas that _should_ shift, shift correctly.
- **Error Correctness:** Deleting a referenced cell correctly and immediately produces a `#REF!` error.
- **Undo Integrity:** Undoing an "insert row" or "delete row" action 100% restores the sheet to its previous state, including all data, formulas, and styles.

---

## 10. Open Questions & Risks

- **Risk: Performance.** This is a _massive_ operation. Deleting row 1 on a workbook with 10 sheets, each with 1000 formulas, requires rewriting _all_ of them.
  - **Mitigation:** This operation _must_ be blocking, and a "Loading..." or "Working..." spinner must be shown. The performance NFR of `< 3s` is a target, but data integrity is more important.
- **Risk: Logic Complexity.** The formula-rewriting logic is the most complex piece of code in the _entire project_, even more so than the dependency graph. It has countless edge cases.
  - **Mitigation:** This risk is why **Epic 2 (Testing)** is a prerequisite. This feature _cannot_ be built without a comprehensive unit testing harness. The `GridShifter` utility must be developed in a "test-driven development" (TDD) style.
- **Risk: Grid Size Limit.**
  - **Mitigation:** We are explicitly de-scoping a dynamic grid size. This simplifies the problem immensely. We are only _shifting_ data within a fixed 100x26 boundary. This is the correct V1 approach.
