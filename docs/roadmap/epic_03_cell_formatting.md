Here is the PRD for Epic 3: Cell Formatting.

---

# PRD: Epic 3: Cell Formatting

- **Status:** Draft
- **Date:** November 15, 2025
- **Author:** v-sheet Team
- **Depends On:** Epic 1 (History Management), Epic 2 (Testing & Logging)

---

## 1. Overview

This document outlines the requirements for adding comprehensive cell formatting capabilities to v-sheet. This feature allows users to visually style their data, moving beyond raw values and formulas. Users will be able to control font styles, cell colors, alignment, and text behavior. This is a critical step in transforming the application from a "calculator" into a true "spreadsheet" tool, enabling the creation of professional, human-readable reports and models.

---

## 2. Problem Statement

- **Problem:** The application only stores and displays raw data. There is no way to emphasize important cells, create headers, or format data for readability.
- **Impact:** All spreadsheets, regardless of their content, look identical. It's difficult to distinguish headers from data, positive numbers from negative, or to create a visually appealing report. This severely limits the application's professional and practical use.
- **Current State:** The data structure in `file-manager.js` and `server/app.py` only accounts for `value` and `formula`. The rendering logic in `spreadsheet.js` is not equipped to apply any styling.

---

## 3. Goals & Objectives

- **User Goal:** To format my cells and data so I can create clean, professional, and easy-to-understand spreadsheets.
- **Product Goal:** To deliver a core set of visual formatting tools that meet user expectations for a modern spreadsheet, thereby increasing the application's utility and polish.
- **Technical Goal:** To extend the application's data model, rendering engine, and history system to support cell-specific styling in a performant and extensible way.

---

## 4. Scope

### In Scope

- **Data Model:** Updating the file data structure (on both client and server) to store a `style` object for each cell.
- **Formatting Features:**
  - **Font:** Bold, Italic, Underline, Strikethrough, Font Size, Font Color.
  - **Fill:** Cell background (fill) color.
  - **Alignment:** Horizontal (left, center, right, auto-detect for text/numbers), Vertical (top, middle, bottom).
  - **Text Wrap:** Toggling text wrapping for a cell.
- **UI:** A new (basic) formatting toolbar for applying these styles to the selected cell(s).
- **Core Integrations:**
  - **Undo/Redo:** All formatting changes _must_ be undo-able via the History Management system (Epic 1).
  - **Copy/Paste:** Basic copy/paste (from Epic 2) will be extended. The "Paste" action will also paste styles. "Paste Special" will now be a requirement to paste _only_ values or _only_ formatting.
  - **Testing:** All new formatting logic _must_ be covered by unit and E2E tests (per Epic 2's policy).

### Out of Scope (For This Epic)

- **Advanced Number Formatting:** Custom number formatting (e.g., `#,##0.00`, "Currency," "Date," "Percentage") is a large, separate feature. Only the _visual_ styling is in scope.
- **Advanced Borders:** A full border-painting UI (all edges, styles, colors) is complex. This epic may include a simple "all borders" toggle, but a detailed border tool is out of scope.
- **Cell Merging:** This is a major structural change to the grid and formula engine and will be its own epic.
- **Conditional Formatting:** Automatically changing a cell's style based on its value is out of scope.
- **Font Family:** While font _color_ and _size_ are in scope, adding a full font-family picker is not, to avoid OS/font-loading complexities.

---

## 5. User Stories

- **As a user,** I want to make my header row (e.g., "A1:E1") **bold** and give it a grey background color so it stands out.
- **As a user,** I want to align my text labels to the **left** and my numbers to the **right** so my sheet is easy to read.
- **As a user,** I want to color a cell with a negative number **red** so it's immediately visible.
- **As a user,** I want to wrap long text in a cell so I can see all of it without it overflowing.
- **As a user,** I want to apply a vertical alignment of "top" to a tall row so my text stays with its header.
- **As a user,** I want to **undo** a color change I just made because I don't like it.
- **As a user,** when I copy a styled cell and paste it, I expect the formatting to come with it.

---

## 6. Functional Requirements

| ID        | Requirement             | Description                                                                                                                                                                                                                                         |
| :-------- | :---------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR1.1** | **Data Model (Client)** | `file-manager.js` must be updated. When saving cell data, if a cell has styling, it must be stored in a `style` object. Example: `"A1": { "value": "5", "formula": false, "style": { "font": { "bold": true }, "fill": { "color": "#FFFF00" } } }`. |
| **FR1.2** | **Data Model (Server)** | `server/app.py` must be updated to accept, store, and return this new `style` object within the JSON file for each cell.                                                                                                                            |
| **FR2.1** | **Rendering Engine**    | `spreadsheet.js` must be updated. When rendering cells, it must check for a `style` object and apply the corresponding CSS (e.g., `cell.style.fontWeight = 'bold'`, `cell.style.backgroundColor = '#FFFF00'`).                                      |
| **FR2.2** | **Performance**         | The rendering engine must be performant. It should not cause lag when scrolling over styled cells. A "virtual DOM" or cell-recycling approach should be considered if performance is an issue.                                                      |
| **FR3.1** | **Formatting Toolbar**  | A new HTML toolbar must be added to `index.html` containing buttons for: Bold, Italic, Underline, Strikethrough, Text Color, Fill Color, Horizontal Align, Vertical Align, Text Wrap.                                                               |
| **FR3.2** | **Toolbar State**       | The toolbar must update to reflect the formatting of the _currently active cell_. If the active cell is bold, the "Bold" button should appear "on".                                                                                                 |
| **FR4.1** | **History Integration** | All formatting changes must use the **Command Pattern** (from Epic 1). A `FormatRangeCommand` must be created. This command will store the `cellId(s)`, the `newStyle`, and the `oldStyle` for each cell.                                           |
| **FR4.2** | **Undo/Redo**           | Users must be able to undo and redo all formatting changes using `Ctrl+Z` / `Ctrl+Y`.                                                                                                                                                               |
| **FR5.1** | **Copy/Paste**          | The `_handleCopy` method must be updated to copy both `value` and `style` to the internal clipboard.                                                                                                                                                |
| **FR5.2** | **Paste Special**       | The `_handlePaste` logic must be extended. A "Paste Special" mechanism (e.g., `Ctrl+Shift+V`) must be added to allow pasting _only values_ or _only formatting_.                                                                                    |
| **FR6.1** | **Testing**             | All new functions (e.g., `FormatRangeCommand`, style application logic) must have corresponding unit tests. E2E tests must be created to verify "User clicks bold button, cell becomes bold, user reloads page, cell is still bold."                |

---

## 7. Non-Functional Requirements

| ID       | Type                   | Requirement                                                                                                                                         |
| :------- | :--------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NFR1** | **Performance**        | Applying a format to a large range (e.g., 1000 cells) should be near-instantaneous (< 500ms).                                                       |
| **NFR2** | **Data Integrity**     | Formatting data must _never_ corrupt or alter the underlying `value` or `formula` of a cell.                                                        |
| **NFR3** | **Storage Efficiency** | The system must be "sparse." If a cell has no special formatting, no `style` object should be saved for it, to keep JSON file sizes minimal.        |
| **NFR4** | **Extensibility**      | The `style` object schema should be easy to extend. Adding "Borders" or "NumberFormatting" later should not require a full refactor of this system. |

---

## 8. High-Level Implementation Plan

1.  **Phase 1: Data Model (Backend)**
    - Update `server/app.py` to accept, store, and return the new `style` object in the file's JSON.
2.  **Phase 2: Data Model (Client)**
    - Update `file-manager.js` to handle the `style` object. Create new methods like `updateCellFormat(cellId, newStyle)` that will manage this data and trigger autosave.
3.  **Phase 3: History & Command**
    - Create `js/commands/FormatRangeCommand.js`. This command will take a list of cells and a style modification. Its `execute()` and `undo()` methods will call the new `fileManager.updateCellFormat()` method.
4.  **Phase 4: UI & Rendering**
    - Add the new formatting toolbar to `index.html`.
    - Add event listeners for the toolbar in `spreadsheet.js` (or a new `Toolbar.js` class). Clicking a button (e.g., "Bold") will create a `FormatRangeCommand` for the current selection and execute it via the `HistoryManager`.
    - Modify the cell rendering logic in `spreadsheet.js` to read `style` data and apply it.
    - Update the `_handleCellSelection` method to read the active cell's style and update the toolbar's state.
5.  **Phase 5: Testing**
    - Add unit tests for `FormatRangeCommand`.
    - Add E2E tests for the full user flow (click button -> see style -> undo -> see style revert).

---

## 9. Success Metrics

- All user stories are demonstrable.
- **Undo/Redo:** All formatting changes are 100% reversible via the History Management system.
- **Persistence:** A user can apply formatting, reload the page, and see their formatting perfectly preserved (via `file-manager.js` and `server/app.py`).
- **Test Coverage:** The new formatting logic has >80% unit test coverage, and all E2E tests pass.

---

## 10. Open Questions & Risks

- **Risk: Performance.** Rendering thousands of cells, each with potentially unique style objects, could be slow.
  - **Mitigation:** We must be vigilant about performance from the start. We may need to ensure our rendering logic only applies styles _if they exist_ and doesn't add default overhead.
- **Question:** How do we handle "auto" alignment (text left, numbers right)?
  - **Decision (Proposal):** This should be the _default_ behavior. The "Align Left" button should add a `style: { align: 'left' }` override, but in its absence, `spreadsheet.js` should apply this auto-logic based on the cell's `value` type.
- **Question:** How do we store color?
  - **Decision (Proposal):** Store simple HEX strings (e.g., `#FF0000`). This is simple, standard, and requires no complex palette management for V1.
