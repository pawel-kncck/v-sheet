Here is the PRD for Epic 4: Advanced Copy/Paste.

-----

# PRD: Epic 4: Advanced Copy/Paste

  * **Status:** In Progress
  * **Date:** November 15, 2025
  * **Author:** v-sheet Team
  * **Depends On:** Epic 1 (History Management), Epic 2 (Testing & Logging), Epic 3 (Cell Formatting)

-----

## 1\. Overview

This document outlines the requirements for implementing an "Advanced Copy/Paste" system. This feature is a cornerstone of spreadsheet productivity. It moves beyond simply duplicating data, introducing two critical concepts: **relative formula adjustment** (the "magic" of spreadsheet pasting) and **"Paste Special"** (giving users control over *what* they paste). This epic will transform copy/paste from a simple text-dump into an intelligent data-aware operation.

-----

## 2\. Problem Statement

  * **Problem:** The application currently has placeholder functions for `_handleCopy` and `_handlePaste`. A "paste" operation, if implemented naively, would paste the literal text of a formula (e.g., pasting `=A1+B1` would result in `=A1+B1` in the new cell, not the desired relative adjustment).
  * **Impact:** This breaks user expectation and renders one of the most powerful spreadsheet features useless. Furthermore, without "Paste Special," users cannot perform common tasks like "paste as values" to finalize calculations or "paste formats" to quickly style new data.
  * **Current State:** The `_handlePaste` placeholder in `spreadsheet.js` is not implemented. The application has no concept of an internal clipboard or formula adjustment.

-----

## 3\. Goals & Objectives

  * **User Goal:** "I want to copy a cell or range, paste it elsewhere, and have its formulas, values, and formatting intelligently adapt to the new location."
  * **Product Goal:** To deliver a "best-in-class" copy/paste experience that matches user expectations from industry-standard tools, unlocking key data manipulation workflows.
  * **Technical Goal:** To implement a robust formula adjustment engine that correctly handles relative and absolute (`$`) references. All paste operations must be atomic and undo-able via the `UpdateRangeCommand` (from Epic 1).

-----

## 4\. Scope

### In Scope

  * **Internal Clipboard:** Creating a `this.clipboard` object in `spreadsheet.js` that stores the copied cells' values, formulas, and style objects.
  * **Relative Formula Adjustment:** The core logic to modify formulas on paste. For example, copying `=A1+A2` from cell `A3` and pasting into `B3` must result in the formula `=B1+B2`.
  * **Absolute Reference Handling:** Correctly preserving absolute references (e.g., `=$A$1+A2` becomes `=$A$1+B2`).
  * **"Paste Special" Functionality:**
      * Paste All (default `Ctrl+V`).
      * Paste Values Only.
      * Paste Formulas Only.
      * Paste Formats Only.
  * **Visual Feedback:** A "marching ants" animated border on the copied range (styles already exist in `spreadsheet.css`).
  * **History Integration:** All paste operations *must* be undo-able via the `UpdateRangeCommand`.
  * **System Clipboard (Basic):** Copying must also place a tab-delimited `text/plain` version of the data onto the system clipboard.

### Out of Scope (For This Epic)

  * **Cross-Sheet Pasting:** Pasting data copied from `Sheet1` to `Sheet2` is out of scope and dependent on the "Multi-Sheet Support" epic.
  * **Rich Clipboard Integration:** Copying/pasting to/from external applications (like Excel or Google Sheets) with full fidelity (HTML/rich text) is out of scope. This epic only targets `text/plain` for the system clipboard.
  * **Pasting non-cell data:** Copying/pasting charts, pivot tables, or other future objects.
  * **"Paste Special" (Advanced):** Transpose, Paste Column Widths, etc., are out of scope.

-----

## 5\. User Stories

  * **As a user,** I want to copy cell `A3` (with formula `=A1+A2`) and paste it into cell `B3`, and see the new formula `=B1+B2`.
  * **As a user,** I want to copy cell `A3` (with formula `=$A$1+A2`) and paste it into cell `B3`, and see the new formula `=$A$1+B2`.
  * **As a user,** I want to copy a range of calculated data, and "Paste Values" to lock in the results and remove the formulas.
  * **As a user,** I want to copy a beautifully formatted header cell, and "Paste Formats" onto my other headers to make them match.
  * **As a user,** I want to copy a range and see a "marching ants" border so I know what is on my clipboard.
  * **As a user,** I want to copy a table from v-sheet and paste it into a simple text editor and see the tab-delimited text.
  * **As a user,** I want to press `Ctrl+Z` to undo a paste operation that I performed by mistake.

-----

## 6\. Functional Requirements

| ID | Requirement | Description |
| :--- | :--- | :--- |
| **FR1.1** | **Copy: Internal Clipboard** | `_handleCopy` must populate `this.clipboard` with an object containing: <br> 1. An array of copied cell data (raw value/formula from `fileManager.getRawCellValue`, style object from Epic 3). <br> 2. The coordinates of the source range (e.g., `minRow`, `minCol`). |
| **FR1.2** | **Copy: System Clipboard** | `_handleCopy` must also write a `text/plain`, tab-delimited version of the cell *values* to `navigator.clipboard`. |
| **FR1.3** | **Copy: Visual Feedback** | `_handleCopy` must apply the `.copy-source` class to the copied range. Any subsequent action (e.g., editing, pasting, `Esc` key) must clear this class. |
| **FR2.1** | **Paste: Default** | A standard paste (`Ctrl+V`) must paste *everything* (formulas, values, and formats). |
| **FR2.2** | **Paste: Formula Engine** | The paste logic must calculate the `rowOffset` and `colOffset` between the copy source and paste destination. It must then iterate through all copied formulas. |
| **FR2.3** | **Paste: Formula Parser** | For each formula, the system must use the `Tokenizer` to find all `CELL_REF` tokens. |
| **FR2.4** | **Paste: Formula Adjuster** | For each `CELL_REF` token, it must use `CellHelpers.parseCellRef` to determine if row/col is absolute (`$`). It will then apply the offset to non-absolute parts and rebuild the reference, then re-join all tokens to create the new formula. |
| **FR2.5** | **Paste: History** | The entire paste operation must be executed as a single `UpdateRangeCommand` (from Epic 1) and pushed to the `HistoryManager` so it can be undone. |
| **FR3.1** | **Paste Special: UI** | A mechanism for "Paste Special" must be implemented (e.g., a right-click context menu). |
| **FR3.2** | **Paste Special: Values** | This action must paste the *calculated values* of any copied formulas, not the formulas themselves. It must not paste any formatting. |
| **FR3.3** | **Paste Special: Formulas** | This action must paste the formulas (with relative adjustment per FR2.4) but must *not* paste any formatting. |
| **FR3.4** | **Paste Special: Formats** | This action must paste the *style objects* (from Epic 3) but must *not* paste any values or formulas. |

-----

## 7\. Non-Functional Requirements

| ID | Type | Requirement |
| :--- | :--- | :--- |
| **NFR1** | **Performance** | Pasting a 100-cell range with 100 unique formulas must complete in under 500ms. |
| **NFR2** | **Data Integrity** | The formula adjustment logic must be 100% accurate, including handling all edge cases (e.g., mixed `A$1`, `$A1` references). The paste must be atomic (all or nothing). |
| **NFR3** | **Testability** | The "Formula Adjuster" logic must be a pure, standalone function, separate from the `_handlePaste` event handler, and must have 100% unit test coverage for all reference types. |
| **NFR4** | **Extensibility** | The internal clipboard format must be an object that can be easily extended later to support copying/pasting column widths or charts. |

-----

## 8\. High-Level Implementation Plan

1.  **Phase 1: `_handleCopy` Implementation**
      * Refactor `_handleCopy` in `spreadsheet.js`.
      * Iterate the selected range, get raw data from `fileManager.getRawCellValue` and style data.
      * Store this in `this.clipboard`.
      * Generate a tab-delimited string and write to `navigator.clipboard`.
      * Apply the `.copy-source` CSS class.
2.  **Phase 2: The "Formula Adjuster" Utility**
      * Create a new utility class `FormulaAdjuster.js` in `js/engine/utils/`.
      * Implement `adjustFormula(formula, rowOffset, colOffset)` - adjusts all cell references by the given offset while respecting absolute ($) markers.
      * Implement `cycleReferenceFormat(ref)` - cycles through reference formats (A1 → $A$1 → A$1 → $A1 → A1) for F4 key support.
      * This function will use the `Tokenizer` to get tokens.
      * It will loop through tokens, and for `CELL_REF` types, it will use `CellHelpers.js` to parse, adjust, and rebuild the reference.
      * Update `CellHelpers.js` to add `buildCellRef(row, col, colAbs, rowAbs)` method for building references with absolute markers.
      * Update `CellHelpers.resolveRelativeRef()` to preserve absolute markers when adjusting references.
      * Write extensive unit tests for this utility.
3.  **Phase 3: `_handlePaste` Implementation**
      * Refactor `_handlePaste` in `spreadsheet.js`.
      * This function will be a "controller" that determines *what* to paste (all, values, formulas, formats) based on the paste type.
      * It will prepare a list of cell changes (cellId, new value, old value).
      * For formulas, it will call the new `FormulaAdjuster` utility.
      * It will then create a single `UpdateRangeCommand` (from Epic 1) with this list and execute it via the `HistoryManager`.
4.  **Phase 4: "Paste Special" UI**
      * Implement a basic right-click context menu (as a V1).
      * Add menu items for "Paste", "Paste Special -\> Values", "Paste Special -\> Formulas", "Paste Special -\> Formats".
      * Hook these menu items to the `_handlePaste` controller with different "paste type" flags.
5.  **Phase 5: Testing**
      * Add E2E tests for all User Stories (relative paste, absolute paste, paste values, paste formats, undo paste).

-----

## 9\. Success Metrics

  * All user stories are demonstrable.
  * **Formula Correctness:** All combinations of relative/absolute references (e.g., `A1`, `$A1`, `A$1`, `$A$1`) are adjusted correctly.
  * **Atomic Paste:** A paste operation of 100 cells is a single action on the undo stack.
  * **Test Coverage:** The new `FormulaAdjuster` utility has 100% unit test coverage. The overall "Copy/Paste" E2E test suite passes.

-----

## 10\. Open Questions & Risks

  * **Risk: Formula Adjustment Complexity.** This is the main technical risk. A formula like `=SUM($A1:B$10)` involves *two* references that must be parsed and adjusted correctly. The `Tokenizer` only gives `IDENTIFIER` for `SUM` and `CELL_REF` for `A1:B$10` is not a token type (it's `CELL_REF`, `COLON`, `CELL_REF`).
      * **Mitigation:** The `Tokenizer` *does* identify `CELL_REF` for `A1` and `B$10`. The `Parser` is what builds the `range` node. We must use the `Tokenizer`, not the `Parser`. The `FormulaAdjuster` will need to loop tokens and manually adjust `CELL_REF` tokens. This is complex but feasible.
  * **Question:** Where does the "Paste Special" UI live?
      * **Decision (Proposal):** A right-click context menu is the most common pattern and avoids cluttering the main toolbar. We will scope this as the V1 implementation.