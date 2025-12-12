Here is the PRD for Epic 8: Data I/O (CSV Import).

---

# PRD: Epic 8: Data I/O (CSV Import)

- **Status:** Draft
- **Date:** November 15, 2025
- **Author:** v-sheet Team
- **Depends On:** Epic 1 (History Management), Epic 5 (Multi-Sheet Support)

---

## 1\. Overview

This document outlines the requirements for implementing a CSV (Comma-Separated Values) import feature. This feature addresses a primary barrier to adoption: the inability to load external data. By allowing users to import data from the universally-supported CSV format, v-sheet transitions from a "write-only" tool to a viable platform for analyzing and modeling existing datasets, dramatically increasing its utility.

---

## 2\. Problem Statement

- **Problem:** The application is a "walled garden." All data must be manually entered. There is no functionality to import data from other applications or existing files.
- **Impact:** This is a critical adoption blocker. Users with existing datasets (e.g., bank statements, sales reports, exported data) cannot use v-sheet to work with them. This limits the tool's use to trivial, from-scratch projects and prevents its use for any serious data analysis.
- **Current State:** The application UI (`index.html`, `formula-bar.js`) has no "Import" or "Upload" functionality. The `file-manager.js` is designed to load its own JSON format, not external file types.

---

## 3\. Goals & Objectives

- **User Goal:** "I want to upload a CSV file from my computer and see its data in my sheet so I can start working with it."
- **Product Goal:** To break down the "walled garden" by providing a simple, robust data import path, making v-sheet a viable tool for analyzing existing datasets.
- **Technical Goal:** To implement a robust, client-side CSV parsing and data-ingestion workflow that correctly and performantly loads data into the application's data store and is fully compatible with the History Management system.

---

## 4\. Scope

### In Scope

- **UI:** An "Import CSV..." menu option and a file-picker dialog.
- **Import Options:** A simple modal dialog asking the user _where_ to import the data:
  1.  Create a new sheet (named after the file).
  2.  Replace the active sheet (pasting data at `A1`).
- **Client-Side Parsing:** The CSV file will be parsed _in the browser_ (client-side). The backend server will not be involved in parsing.
- **Standard CSV:** The parser will target standard, comma-delimited, UTF-8 CSVs. It must handle quoted fields (e.g., `"value, with, comma"`).
- **Data Ingestion:** The parsed data (a 2D array of strings) will be loaded into the `file-manager.js` data store and sent to the `formula-worker.js` in a single, bulk operation.
- **History Integration:** The entire import operation must be a single, atomic, and undo-able command via the History Management system (Epic 1).

### Out of Scope (For This Epic)

- **CSV Export:** This is the reverse flow and will be a separate epic.
- **Other Formats:** This epic does _not_ include support for `.xlsx`, `.ods`, `.tsv`, or any other format.
- **Backend Parsing:** The user will _not_ be "uploading" the file to the server.
- **Complex Import Options:** V1 will _not_ include a complex "wizard." We will not provide options for:
  - Choosing the delimiter (e.g., semi-colon, tab).
  - Choosing the text encoding (e.g., ASCII, UTF-16).
  - Auto-detecting data types (all data will be imported as strings).
  - Choosing the import destination range (it will always be `A1`).

---

## 5\. User Stories

- **As a user,** I want to click an "Import" button in the file menu and select a `.csv` file from my computer.
- **As a user,** after selecting a file, I want to be asked if I want to "Replace current sheet" or "Create new sheet."
- **As a user,** if I choose "Create new sheet," I want a new tab to appear, named after my CSV file, containing all the imported data.
- **As a user,** if I choose "Replace current sheet," I want the data in my active sheet to be replaced by the data from the CSV file.
- **As a user,** I want numbers (like `500`) and text (like `Hello`) from my CSV to be imported, so I can use them in formulas (e.g., `=B2+10`).
- **As a user,** I want to import a 20,000-row CSV file without my browser crashing or freezing.
- **As a user,** I want to press `Ctrl+Z` to undo a large import that I did by mistake.

---

## 6\. Functional Requirements

| ID        | Requirement                | Description                                                                                                                                                                                        |
| :-------- | :------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR1.1** | **UI: Menu Item**          | An "Import CSV..." menu item must be added to the file dropdown menu in `formula-bar.js`.                                                                                                          |
| **FR1.2** | **UI: File Picker**        | Clicking "Import CSV..." must programmatically trigger a hidden `<input type="file" accept=".csv">` element.                                                                                       |
| **FR1.3** | **UI: Import Modal**       | On file selection, a modal dialog must appear, presenting the user with two choices: "Create new sheet" and "Replace active sheet".                                                                |
| **FR2.1** | **Parsing: Library**       | The system must use a robust, lightweight, client-side 3rd-party CSV parsing library (e.g., PapaParse) to handle file reading and parsing.                                                         |
| **FR2.2** | **Parsing: Configuration** | The parser will be configured to: <br> - Assume comma delimiter. <br> - Assume UTF-8 encoding. <br> - Handle quoted fields and escaped quotes. <br> - Output a 2D array of strings (`string[][]`). |
| **FR3.1** | **Data Ingestion**         | The parsed 2D array must be converted into the v-sheet cell data format (e.g., `{ "A1": { "value": "..." }, "B1": { "value": "..." } }`).                                                          |
| **FR3.2** | **Import: New Sheet**      | If the user selects "Create new sheet," the system must call `fileManager.addSheet()` (from Epic 5), using the CSV filename as the new sheet name.                                                 |
| **FR3.3** | **Import: Replace Sheet**  | If the user selects "Replace active sheet," the system must clear all existing `cells` data from the active sheet in `file-manager.js`.                                                            |
| **FR3.4** | **Engine Update**          | The new/updated cell data must be sent to the `formula-worker.js` in a _single_ bulk operation (e.g., `loadData`) for performance.                                                                 |
| **FR3.5** | **Data Type**              | All data will be imported as strings. The `FormulaEngine`'s existing `TypeCoercion` will handle converting text-based numbers (e.g., `"500"`) when they are used in formulas.                      |
| **FR4.1** | **History Integration**    | A new `ImportCommand` must be created. This command will be pushed to the `HistoryManager` (from Epic 1).                                                                                          |
| **FR4.2** | **Undo: Replace**          | `ImportCommand.undo()` for a "replace" operation must restore the _entire_ set of cell data that was overwritten.                                                                                  |
| **FR4.3** | **Undo: New Sheet**        | `ImportCommand.undo()` for a "new sheet" operation must call the `fileManager.deleteSheet()` (from Epic 5).                                                                                        |

---

## 7\. Non-Functional Requirements

| ID       | Type            | Requirement                                                                                                                                                    |
| :------- | :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NFR1** | **Performance** | Importing a 20,000-row, 10-column CSV (200,000 cells) must complete in an acceptable time (\< 15 seconds).                                                     |
| **NFR2** | **Memory**      | The parser must be memory-efficient and not crash the browser on large files (e.g., 50MB). Stream-parsing should be used if available in the chosen library.   |
| **NFR3** | **Robustness**  | The import must gracefully handle standard CSV variations (e.g., `CRLF` vs. `LF` line endings).                                                                |
| **NFR4** | **Testability** | The data-ingestion logic must be tested. E2E tests must be created for both import scenarios ("new sheet" and "replace") and their corresponding undo actions. |

---

## 8\. High-Level Implementation Plan

1.  **Phase 1: UI & Library**
    - Add the "Import CSV..." button to `formula-bar.js` and the hidden `<input type="file">` to `index.html`.
    - Create the simple import-options modal.
    - Research, select, and install a lightweight, stream-capable CSV parsing library (e.g., PapaParse).
2.  **Phase 2: `ImportCommand`**
    - Create `js/commands/ImportCommand.js`.
    - `constructor(file, options)`: Stores the file object and the user's choice ("new" or "replace").
    - `execute()`: This method will:
      1.  Store the _old_ sheet data (if replacing) for the undo stack.
      2.  Call the CSV library to parse the file.
      3.  On completion, call a new helper function (e.g., `fileManager.bulkLoadData(sheetId, data, options)`) that performs the data ingestion and sends the bulk update to the worker.
    - `undo()`: This method will either:
      1.  Call `fileManager.deleteSheet(...)` (if "new").
      2.  Call `fileManager.bulkLoadData(...)` with the _old_ data (if "replace").
3.  **Phase 3: Integration**
    - Wire the file input's `onchange` event to show the modal.
    - Wire the modal's "Import" button to create `new ImportCommand(...)` and pass it to the `HistoryManager`.
4.  **Phase 4: Testing**
    - Create unit tests for the data-transformation logic (2D array to cell map).
    - Create E2E tests for both import scenarios ("new sheet" and "replace sheet") and test the undo functionality for both.

---

## 9\. Success Metrics

- All user stories are demonstrable.
- **Performance:** A 20,000-row CSV can be successfully imported and rendered without crashing the browser.
- **Data Integrity:** Data with commas-in-quotes is imported into a single cell, not split.
- **Undo:** The import operation is a single action on the undo stack and is 100% reversible.
- **Formula Coercion:** A user can import a file with a column of `"500"`, `"600"`, and a formula `=SUM(A1:A2)` will correctly return `1100`.

---

## 10\. Open Questions & Risks

- **Risk: Parsing Complexity.** CSV is a "deceptively simple" format. Edge cases like un-escaped quotes, different line endings, or encoding issues can break simple parsers.
  - **Mitigation:** We **must** use a well-vetted, lightweight 3rd-party library (like PapaParse). Attempting to roll our own robust parser is a huge, unnecessary risk and is explicitly out of scope.
- **Risk: Performance & Memory.** Loading a massive file (e.g., 500,000 cells) into the `file-manager.js` data store could still be slow.
  - **Mitigation:** The `spreadsheet.js` renderer is already virtualized, which is good. The main bottleneck will be parsing and the bulk message to the worker. Using a _streaming_ parser (which processes the file chunk-by-chunk) is the correct mitigation. `FR3.4` (single bulk update) is critical to prevent 500,000 individual `setCell` messages.
