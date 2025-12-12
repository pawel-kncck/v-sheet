Here is the PRD for Epic 5: Multi-Sheet Support.

---

# PRD: Epic 5: Multi-Sheet Support

- **Status:** Draft
- **Date:** November 15, 2025
- **Author:** v-sheet Team
- **Depends On:** Epic 1 (History Management), Epic 2 (Testing & Logging)

---

## 1\. Overview

This document outlines the requirements for implementing "Multi-Sheet Support," a foundational architectural change that evolves the application from a single-page editor to a true "workbook." This feature allows users to create and manage multiple sheets (or "tabs") within a single file. Critically, it also introduces the ability for formulas in one sheet to reference data in another, enabling complex, organized, and scalable financial models and data reports.

---

## 2\. Problem Statement

- **Problem:** The application is fundamentally limited to a "one file, one sheet" model. The current backend and client-side data manager are designed to load and save a single grid of cells.
- **Impact:** Users cannot organize their data. A typical workflow (e.g., "Raw Data" in one sheet, "Assumptions" in a second, "Calculations" in a third) is impossible. This is the single largest feature-gap preventing v-sheet from being used for non-trivial tasks.
- **Current State:** The entire application, from the `FormulaEngine` to the `Spreadsheet` renderer, assumes a single, global set of cells.

---

## 3\. Goals & Objectives

- **User Goal:** "I want to organize my work into multiple tabs within one file, just like in Excel or Google Sheets, and build formulas that link them together."
- **Product Goal:** To deliver a multi-sheet, workbook-based experience that unlocks the application's potential for complex data organization and modeling.
- **Technical Goal:** To refactor the application's data model, formula engine, and rendering logic to be "sheet-aware" and to support cross-sheet dependencies.

---

## 4\. Scope

### In Scope

- **Data Model:** A complete overhaul of the JSON file structure to support an array of `sheet` objects (each with its own `cells`, `columnWidths`, etc.).
- **Sheet Tab UI:** A new UI bar at the bottom of the spreadsheet for managing sheets.
- **Sheet Management:** Core user actions must be implemented:
  - Add a new, blank sheet.
  - Delete an existing sheet.
  - Rename a sheet (by double-clicking the tab).
  - Re-order sheets (by dragging tabs).
  - Switch the active (visible) sheet.
- **Cross-Sheet Formulas:** The formula engine _must_ be upgraded to support `SheetName!A1` syntax.
  - **Parsing:** The `Tokenizer` and `Parser` must be updated to recognize this syntax.
  - **Evaluation:** The `Evaluator` must be able to fetch values from non-active sheets.
  - **Dependency:** The `DependencyGraph` must track dependencies _across sheets_ (e.g., `Sheet2!C1` depends on `Sheet1!A1`).
- **History Integration:** All sheet management actions (add, delete, rename, re-order) must be undo-able via the History Management system (Epic 1).

### Out of Scope (For This Epic)

- **Sheet Names with Spaces:** For V1, sheet names **must** be simple (e.g., alphanumeric, no spaces, no special characters other than `_`). This dramatically simplifies the parser. Supporting quoted names (e.g., `'My Data'!A1`) is out of scope.
- **Advanced Sheet Features:** Hiding sheets, protecting sheets, and coloring sheet tabs are out of scope.
- **Cross-Workbook References:** Referencing other files (e.g., `[file2.json]Sheet1!A1`) is out of scope.

---

## 5\. User Stories

- **As a user,** I want to click a "+" button to add a new, blank sheet (e.g., "Sheet2") to my file.
- **As a user,** I want to double-click the "Sheet1" tab and rename it to "Data".
- **As a user,** I want to drag my "Summary" tab to be the first sheet in the list.
- **As a user,** I want to right-click and delete a sheet I no longer need.
- **As a user,** while on my "Summary" sheet, I want to type `=Data!A1` in a cell to get the value of cell `A1` from my "Data" sheet.
- **As a user,** if I change the value in `Data!A1`, I expect my "Summary" sheet's formula to update instantly.
- **As a user,** I want to press `Ctrl+Z` to undo my "rename sheet" or "delete sheet" action.

---

## 6\. Functional Requirements

| ID        | Requirement             | Description                                                                                                                                                                                                                                                                         |
| :-------- | :---------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR1.1** | **Data Model (Server)** | `server/app.py` must be modified. The JSON structure will now be: <br> `data: { activeSheetId: "id1", sheets: [ { id: "id1", name: "Sheet1", cells: {...}, columnWidths: [...], ... } ] }`                                                                                          |
| **FR1.2** | **Data Model (Client)** | `file-manager.js` must be refactored to manage this new data structure. It will provide methods like `getActiveSheet()`, `getSheetByName()`, `addSheet()`, `deleteSheet()`, etc.                                                                                                    |
| **FR1.3** | **Data Migration**      | The `file-manager.js` `load` logic must detect the _old_ (single-sheet) data format and automatically migrate it to the new multi-sheet format upon loading.                                                                                                                        |
| **FR2.1** | **Sheet Tab UI**        | A new "sheet-bar" component must be added to `index.html`, below the main grid.                                                                                                                                                                                                     |
| **FR2.2** | **Sheet Tab Rendering** | `spreadsheet.js` must render the list of sheet tabs from `file-manager.js` into this bar and highlight the active tab.                                                                                                                                                              |
| **FR2.3** | **Sheet Switching**     | Clicking a tab must call `fileManager.setActiveSheet()`. This must trigger `spreadsheet.js` to completely re-render its grid (cells, headers, widths, heights) with the new active sheet's data.                                                                                    |
| **FR3.1** | **Engine: Parser**      | `Tokenizer.js` must be updated to treat `!` as a `BANG` token. `Parser.js` must be updated to handle a grammar rule for `IDENTIFIER BANG CELL_REF` (e.g., `Data!A1`). This will create a new AST node, e.g., `{ type: 'remote_cell', sheet: 'Data', ref: 'A1' }`.                   |
| **FR3.2** | **Engine: Evaluator**   | `Evaluator.js` must be updated. When it encounters a `remote_cell` node, it must call a modified `this.getCellValue` callback (e.g., `this.getCellValue(node.sheet, node.ref)`).                                                                                                    |
| **FR3.3** | **Engine: Facade**      | `FormulaEngine.js` must be refactored. The `getCellValue` function it provides to the Evaluator must now accept a sheet name and fetch data from the correct sheet in `file-manager.js`.                                                                                            |
| **FR3.4** | **Engine: Graph**       | `DependencyGraph.js` must be updated. All node IDs must be globally unique, incorporating the sheet name (e.g., `"Data!A1"`). All dependency-tracking methods (`updateDependencies`, `getRecalculationOrder`, `checkForCircularReference`) must be updated to use these global IDs. |
| **FR4.1** | **Error Handling**      | Deleting a sheet (e.g., "Data") that is referenced in a formula (`=Data!A1`) must cause that formula to return a `#REF!` error.                                                                                                                                                     |
| **FR4.2** | **History Integration** | New commands (`AddSheetCommand`, `DeleteSheetCommand`, `RenameSheetCommand`, `ReorderSheetCommand`) must be created and integrated with the History Management system (Epic 1).                                                                                                     |

---

## 7\. Non-Functional Requirements

| ID       | Type               | Requirement                                                                                                                                                                                                |
| :------- | :----------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NFR1** | **Performance**    | Switching between two large sheets (e.g., 5,000 cells each) must feel instantaneous (\< 500ms).                                                                                                            |
| **NFR2** | **Data Integrity** | A calculation on `Sheet1` that depends on 10 cells in `Sheet2` must be 100% accurate. A circular reference _across sheets_ (e.g., `Sheet1!A1` -\> `Sheet2!A1` -\> `Sheet1!A1`) must be correctly detected. |
| **NFR3** | **Scalability**    | The backend and engine must support a reasonable number of sheets (e.g., 20) without performance degradation.                                                                                              |
| **NFR4** | **Testability**    | The new parser logic and dependency graph logic must be fully unit-tested. E2E tests must be created for all cross-sheet User Stories.                                                                     |

---

## 8\. High-Level Implementation Plan

1.  **Phase 1: Data Model (Backend & Client)**
    - Refactor `server/app.py` to store the new JSON structure.
    - Refactor `file-manager.js` to manage the new `sheets` array, active sheet, and add methods for sheet manipulation (add/delete/rename).
    - Implement the "on-the-fly" data migration (FR1.3).
2.  **Phase 2: Engine Refactor (Headless)**
    - Update `Tokenizer.js`, `Parser.js`, `Evaluator.js`, and `DependencyGraph.js` to support the `SheetName!A1` syntax and global IDs.
    - Write extensive unit tests to prove this new engine logic works _before_ any UI is built.
3.  **Phase 3: UI Implementation**
    - Add the "sheet-bar" div to `index.html`.
    - In `spreadsheet.js`, build the logic to render the sheet tabs.
    - Implement the `spreadsheet.js` re-rendering logic to draw the active sheet's grid when a tab is clicked.
4.  **Phase 4: Integration & History**
    - Connect the UI. Clicking "Add Sheet" in the UI should call `fileManager.addSheet()`.
    - Create the new `...SheetCommand` classes (e.g., `DeleteSheetCommand`) and wire them into the HistoryManager (Epic 1) and the UI event listeners.
    - Implement the `#REF!` error logic for broken cross-sheet references.
5.  **Phase 5: Testing**
    - Add E2E tests for all User Stories (add sheet, rename, delete, re-order, create cross-sheet formula, test auto-recalc, test `#REF!` on sheet delete).

---

## 9\. Success Metrics

- All user stories are demonstrable.
- **Cross-Sheet Recalc:** A formula in `Sheet1` that references `Sheet2!A1` updates instantly when `Sheet2!A1` is changed.
- **Ref Error:** Deleting `Sheet2` correctly causes the formula in `Sheet1` to display `#REF!`.
- **Persistence:** All sheet management actions (add, delete, rename, re-order) are correctly saved and restored on page reload.
- **Undo:** All sheet management actions are fully undo-able and redo-able.

---

## 10\. Open Questions & Risks

- **Risk: Sheet Name Complexity.**
  - **Decision:** We have explicitly de-scoped this for V1 (FR3.1). Sheet names must be simple `IDENTIFIER` tokens (e.g., `Data`, `My_Data`, `Sheet2`). This is a critical simplification.
- **Risk: Data Model Migration.**
  - **Mitigation:** This must be the first thing implemented in `file-manager.js` and tested. If this fails, users cannot open their old files.
- **Risk: Performance.**
  - **Mitigation:** The `formula-worker.js` will now need access to the _entire_ file data (all sheets) to resolve cross-sheet dependencies, not just the data for one sheet. This is a significant change to its data-loading process. We must ensure this handoff is efficient.
- **Risk: Formula Building UX (from roadmap).**
  - **Note:** This epic complicates the "Formula Building UX" (Phase 3). When a user is in "formula editing mode" and clicks a tab for another sheet, the formula editor must correctly append `SheetName!` to the formula. This inter-epic dependency must be tracked.
