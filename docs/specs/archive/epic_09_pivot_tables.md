Here is the final, updated PRD for Epic 9: Pivot Tables, now including Filtering and Calculated Fields as requested.

---

# PRD: Epic 9: Pivot Tables (Revised)

- **Status:** Final
- **Date:** November 15, 2025
- **Author:** v-sheet Team
- **Depends On:** Epic 1 (History), Epic 2 (Testing), Epic 5 (Multi-Sheet), Epic 8 (CSV Import)

---

## 1. Overview

This document outlines the requirements for "Pivot Tables," an advanced data summarization feature. This is a "killer feature" for any spreadsheet application. It allows users to take large, "flat" datasets (like an imported CSV) and dynamically aggregate, group, filter, and summarize them by different dimensions. This epic will introduce a pivot table creation wizard, an editor pane, a new aggregation engine, and a renderer to display the results in the grid.

---

## 2. Problem Statement

- **Problem:** The application has a way to _import_ data (Epic 8, CSV Import), but no efficient way to _analyze_ it. A user with 10,000 rows of sales data can only analyze it by writing complex, manual `SUMIF` or `COUNTIF` formulas.
- **Impact:** This creates a huge gap between "data-in" and "insights-out." The tool is a data store, not an analysis tool. This is a major blocker for any serious data-driven user, who will be forced to use another application (like Excel) to get their answer.
- **Current State:** The application has no concept of data aggregation beyond individual formula functions like `SUM`. There is no UI for this, and the data model cannot store a pivot table's configuration.

---

## 3. Goals & Objectives

- **User Goal:** "I want to take my 10,000-row sales report and, in a few clicks, create a summary table that shows me total sales by region and product, _for Q1 only_."
- **Product Goal:** To deliver the _most-requested_ data analysis feature, transforming v-sheet from a data-storage tool to a data-_analysis_ tool.
- **Technical Goal:** To implement a new pivot table "engine" for aggregation, a new complex UI component for configuration, and extend the data model to save, render, and refresh pivot table reports.

---

## 4. Scope

### In Scope

- **Data Model:** Extending the file JSON to store pivot table definitions (source range, target cell, row/col/value/filter configurations).
- **Creation UI:** A menu item ("Data" > "Pivot Table") that opens a modal to select the source data range (which must have headers).
- **Editor UI:** A new, persistent **sidebar/pane** (similar to Google Sheets) that shows a list of all source headers. This pane will have drag-and-drop targets for:
  - **Rows**
  - **Columns**
  - **Values**
  - **Filters**
- **Aggregation (Values):** V1 will support three aggregations: **SUM, COUNT, AVERAGE**.
- **Filtering:** A new "Filters" area in the editor. Users can drag a field (e.g., "Region") to Filters and select which values to _include_ (e.g., "North", "South").
- **Calculated Fields:** A new UI to create a calculated field (e.g., `Profit = Sales - Cost`). This new field will then be available to use in the Rows, Columns, or Values sections.
- **Rendering:** The resulting pivot table will be rendered as raw values into the grid at the target location. The output cells themselves are _not_ editable.
- **Grand Totals:** The pivot table will automatically calculate and display Grand Totals for both rows and columns.
- **Refresh:** V1 will be **manual-refresh only**. A "Refresh" button will be visible in the editor pane to re-run the aggregation on the source data.
- **History Integration:** All pivot table actions (Create, Configure, Delete, Refresh, Add Filter, Add Calculated Field) must be undo-able commands (Epic 1).

### Out of Scope (For This Epic)

- **Automatic Refresh:** Pivot tables will _not_ update automatically when source data changes.
- **Advanced Aggregations:** `MIN`, `MAX`, `STDEV`, `COUNTUNIQUE`, etc., are out of scope for V1.
- **Advanced Calculated Fields:** V1 will only support simple arithmetic (`+`, `-`, `*`, `/`) between _two_ fields. `IF` logic or complex formulas are out of scope.
- **Sorting:** (e.g., "sort rows descending by SUM of Sales").
- **Subtotals:** (e.g., grouping rows and showing sub-totals) are out of scope.
- **Formatting:** The pivot table will be rendered with no special formatting.
- **Pivot Charts:** No charts will be generated from the pivot table.

---

## 5. User Stories

- **As a user,** I want to select my "Data" sheet's range `A1:G1000` and create a pivot table from it on a new "Summary" sheet.
- **As a user,** I want to see a "Pivot Table Editor" sidebar that lists all my headers (e.g., "Region", "Product", "Sales").
- **As a user,** I want to drag "Region" to the "Rows" box and "Sales" to the "Values" box (defaulting to `SUM`) to see total sales by region.
- **As a user,** I want to also drag "Month" to the "Columns" box to see sales by region _and_ month, with Grand Totals at the end.
- **As a user,** I want to change the "Values" aggregation for "Sales" from `SUM` to `AVERAGE`.
- **As a user,** I want to drag "Region" to the "Filters" box and un-check "East" to exclude it from my results.
- **As a user,** I want to create a new "Calculated Field" named "Profit" defined as `Sales - Cost`, and then drag "Profit" into the "Values" box.
- **As a user,** after I update my "Data" sheet, I want to click a "Refresh" button on my pivot table to see the new totals.
- **As a user,** I want to press `Ctrl+Z` to undo my action of adding a Filter.

---

## 6. Functional Requirements

| ID        | Requirement                  | Description                                                                                                                                                                                                                                                    |
| :-------- | :--------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR1.1** | **Data Model (Client)**      | `file-manager.js` must be updated to store an array of `pivotTables` in the file data.                                                                                                                                                                         |
| **FR1.2** | **Data Model (Object)**      | A pivot table object will define: `id`, `sourceSheetId`, `sourceRange`, `targetSheetId`, `targetCell`, `config: { rows: [], cols: [], values: [{field, agg}, ...], filters: [{field, values}], calculatedFields: [{name, formula}] }`.                         |
| **FR1.3** | **Data Model (Server)**      | `server/app.py` must be updated to save and load this new `pivotTables` array in the file's JSON.                                                                                                                                                              |
| **FR2.1** | **UI: Creation**             | A "Data > Pivot Table" menu item must be added. This will trigger a modal asking for the source data range (e.g., `Data!A1:G1000`) and the target (e.g., `New Sheet` or `Existing sheet!A1`).                                                                  |
| **FR2.2** | **UI: Editor Pane**          | A new, complex HTML/CSS/JS component (the "Pivot Table Editor") must be built and added to `index.html`. This pane is hidden by default.                                                                                                                       |
| **FR2.3** | **UI: Context**              | Clicking any cell within a rendered pivot table's bounds must show the "Pivot Table Editor" pane, populated with that table's configuration.                                                                                                                   |
| **FR2.4** | **UI: Drag-and-Drop**        | The Editor Pane must allow users to drag headers into "Rows," "Columns," "Values," and "Filters" boxes.                                                                                                                                                        |
| **FR2.5** | **UI: Filter**               | The "Filters" box in the pane must allow a user to click a field to open a checklist of its unique values to include.                                                                                                                                          |
| **FR2.6** | **UI: Calculated Field**     | A button "Add Calculated Field" must open a modal prompting for a `Name` (e.g., "Profit") and a `Formula` (e.g., `Sales - Cost`).                                                                                                                              |
| **FR3.1** | **Engine: Aggregation**      | A new `PivotTableEngine.js` must be created. Its core method `(sourceData, config)` will process the flat data and return a 2D array of the aggregated results, including Grand Totals.                                                                        |
| **FR3.2** | **Engine: Aggregators**      | The engine must support `SUM`, `COUNT`, and `AVERAGE` aggregations.                                                                                                                                                                                            |
| **FR3.3** | **Engine: Refresh**          | A "Refresh" button in the Editor Pane will re-fetch the `sourceData` from `file-manager.js` and re-run the `PivotTableEngine` aggregation.                                                                                                                     |
| **FR3.4** | **Renderer**                 | `spreadsheet.js` must be taught to render the 2D array output from the engine. It must also _clear_ the old table area before rendering a new one (as the size may change).                                                                                    |
| **FR3.5** | **Formula Integration**      | The rendered pivot table cells must be plain values (strings/numbers). They _must_ be reference-able by standard formulas (e.g., `Sheet2!A1` can reference a pivot table cell `Summary!B5`).                                                                   |
| **FR3.6** | **Engine: Filter**           | The `PivotTableEngine` must first pre-process the `sourceData`, removing any rows that do not match the `config.filters`.                                                                                                                                      |
| **FR3.7** | **Engine: Calculated Field** | The `PivotTableEngine` must pre-process the `sourceData` _after filtering_, adding new columns for each calculated field. This computed field can then be used in aggregations.                                                                                |
| **FR4.1** | **History Integration**      | New commands must be created: `CreatePivotTableCommand`, `ConfigurePivotTableCommand` (this command will store `newConfig` and `oldConfig`), `DeletePivotTableCommand`, and `RefreshPivotTableCommand` (this must store the _old table data_ to be undo-able). |

---

## 7. Non-Functional Requirements

| ID       | Type               | Requirement                                                                                                                                                                                             |
| :------- | :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **NFR1** | **Performance**    | Aggregating a 50,000-row source dataset should complete in an acceptable time (< 10 seconds).                                                                                                           |
| **NFR2** | **Data Integrity** | Aggregation logic for `SUM`, `COUNT`, and `AVERAGE` must be 100% accurate and verified against external tools (Excel/GSheets). Filter and Calculated Field logic must also be correct.                  |
| **NFR3** | **Scalability**    | The UI must not crash or freeze when loading the Editor Pane for a source range with many (e.g., 200+) columns/headers.                                                                                 |
| **NFR4** | **Testability**    | The `PivotTableEngine.js` must be developed TDD-style (Test-Driven Development) and be 100% headless, with a comprehensive unit test suite covering all logic, including filters and calculated fields. |
| **NFR5** | **UI/UX**          | The drag-and-drop editor, being the most complex UI component in the app, must be smooth and intuitive.                                                                                                 |

---

## 8. High-Level Implementation Plan

1.  **Phase 1: Data Model & Engine (Headless)**
    - Update `server/app.py` and `file-manager.js` to support the new `pivotTables` array in the file.
    - Build `PivotTableEngine.js`. This is a pure-logic task.
    - Write extensive unit tests for the engine (e.g., `(data, config) => expected_output`). **Crucially, test the new Filter and Calculated Field logic here.**
2.  **Phase 2: UI - Editor Pane**
    - This is the largest work item. Build the new HTML/CSS/JS component for the "Pivot Table Editor" sidebar.
    - Implement the drag-and-drop functionality for headers into "Rows," "Columns," "Values," and **"Filters"**.
    - Add the UI for "Add Calculated Field" and the filter-value selection.
3.  **Phase 3: Integration & Commands**
    - Add the "Data > Pivot Table" menu.
    - Create the `CreatePivotTableCommand`. This command will create the config object and call the `PivotTableEngine` for the first run.
    - Create the `ConfigurePivotTableCommand`. Any config change in the Editor Pane (drag-drop, add filter, add calculated field) will execute this command (which stores old/new config).
    - Hook the "Refresh" button to a `RefreshPivotTableCommand`.
    - All commands must be integrated with the History Manager (Epic 1).
4.  **Phase 4: Rendering**
    - Modify `spreadsheet.js` to:
      1.  Render all pivot tables on sheet load.
      2.  Re-render a pivot table after a `Configure` or `Refresh` command.
      3.  Show the Editor Pane when a pivot table cell is selected.
5.  **Phase 5: E2E Testing**
    - Create E2E tests for the full user flow (create -> add filter -> add calculated field -> configure -> refresh -> validate data -> undo).

---

## 9. Success Metrics

- All user stories are demonstrable.
- **Accuracy:** A pivot table created in v-sheet with `SUM`, `COUNT`, `AVERAGE`, Filters, and Calculated Fields produces the _exact same results_ as one created in Google Sheets with the same source data.
- **Undo:** A user can successfully undo a complex configuration change (e.g., adding a filter).
- **Persistence:** A saved file, when reloaded, restores the pivot table _and_ its editor configuration, including filters and calculated fields.
- **Performance:** The "Refresh" action on a 50,000-row dataset completes successfully.

---

## 10. Open Questions & Risks

- **Risk: UI Complexity.** This is the #1 risk. Building a high-quality, vanilla JS drag-and-drop UI, _now with filter popups and calculated field modals_, is extremely difficult and time-consuming.
  - **Mitigation:** Start with a simpler, non-drag-and-drop "V0" if needed (e.g., using dropdowns and "+" buttons). However, the PRD, as written, assumes drag-and-drop.
- **Risk: Performance.** Aggregating 100k+ rows in JavaScript, now with pre-filtering and calculated field computation, can be slow.
  - **Mitigation:** The `PivotTableEngine` must be highly optimized. The "Manual Refresh" (FR3.3) is the primary mitigation, as it prevents this heavy operation from running on every keystroke.
- **Risk: Scope Creep.**
  - **Mitigation:** We must be _ruthless_ in rejecting requests for "just one more feature" (like Sorting or Subtotals). Those are separate epics. We must stick to the V1 scope: Rows, Cols, Values (SUM/COUNT/AVG), Grand Totals, Filters, and _simple_ Calculated Fields.
- **Risk: Calculated Field Parser.**
  - **Mitigation:** This parser must be _extremely_ simple (V1). It should only handle `field_a [op] field_b`. Do _not_ try to re-use the full `FormulaEngine`'s parser here, as it's not designed for this context. A simple regex or string split is sufficient.
