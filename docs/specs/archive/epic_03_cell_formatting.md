# PRD: Epic 3: Cell Formatting (Revised: Flyweight Architecture)

- **Status:** Complete
- **Completed:** December 2025
- **Author:** v-sheet Team
- **Depends On:** Epic 1 (History Management), Epic 2 (Testing & Logging)

> **Implementation Note**: This epic has been fully implemented. See the following for current documentation:
> - Architecture: [docs/architecture/00-system-overview.md](../architecture/00-system-overview.md) (Styling System, Formatting Flow)
> - UI Components: [docs/architecture/03-ui-components.md](../architecture/03-ui-components.md) (Toolbar section)
> - Test Scenarios: [docs/test-scenarios/formatting.scenarios.md](../test-scenarios/formatting.scenarios.md)

---

## 1. Overview

This document outlines the requirements for adding comprehensive cell formatting capabilities to v-sheet. This feature allows users to visually style their data (font, colors, alignment).

**Architectural Note:** To ensure performance and storage efficiency, this epic will implement the **Flyweight Pattern**. Instead of storing style objects in every cell (which causes massive duplication), we will create a central "Style Palette" (a dictionary of unique styles) and cells will simply reference a `styleId`. This ensures O(1) storage overhead per cell regardless of formatting complexity.

---

## 2. Problem Statement

- **Problem:** The application only stores and displays raw data. There is no way to emphasize important cells, create headers, or format data for readability.
- **Impact:** All spreadsheets look identical. It's difficult to distinguish headers from data or positive numbers from negative.
- **Current State:** The data structure in `file-manager.js` and `server/app.py` only accounts for `value` and `formula`. The rendering logic in `spreadsheet.js` applies no styling.
- **Scalability Risk:** A naive implementation (storing style objects on every cell) would bloat file sizes and slow down loading/saving significantly for large sheets.

---

## 3. Goals & Objectives

- **User Goal:** To format my cells and data so I can create clean, professional, and easy-to-understand spreadsheets.
- **Product Goal:** To deliver a core set of visual formatting tools that meet user expectations for a modern spreadsheet.
- **Technical Goal:** To implement a storage-efficient **Style Palette** system that deduplicates formatting data, keeping file sizes small and rendering fast.

---

## 4. Scope

### In Scope

- **Data Model (Flyweight):** - Updating `file-manager.js` and `server/app.py` to support a top-level `styles` dictionary.
  - Updating cell data to store a lightweight `styleId` string/integer.
- **Style Manager Logic:**
  - Logic to check if a requested style exists in the palette.
  - Logic to create new style entries only when necessary (deduplication).
- **Formatting Features:**
  - **Font:** Bold, Italic, Underline, Strikethrough, Font Size, Font Color.
  - **Fill:** Cell background (fill) color.
  - **Alignment:** Horizontal (left, center, right), Vertical (top, middle, bottom).
  - **Text Wrap:** Toggling text wrapping.
- **UI:** A formatting toolbar for applying these styles.
- **Core Integrations:**
  - **Undo/Redo:** Formatting changes must be undo-able via the History Management system.
  - **Copy/Paste:** Copy operations must resolve the style ID to a full object; Paste operations must re-canonicalize the object to an ID in the destination context.
  - **Testing:** Unit tests for the Style Palette logic (hashing/matching) are critical.

### Out of Scope (For This Epic)

- **Advanced Number Formatting:** (e.g., Currency, Date). This requires a separate formatting engine and will be a follow-up epic.
- **Borders:** Full border painting is complex and out of scope for V1.
- **Conditional Formatting:** Automatically changing styles based on value is out of scope.

---

## 5. User Stories

- **As a developer,** I want the file size to remain small even if I color 10,000 cells blue.
- **As a user,** I want to make my header row **bold** and give it a grey background color.
- **As a user,** I want to align my text labels to the **left** and my numbers to the **right**.
- **As a user,** I want to **undo** a color change I just made.
- **As a user,** when I copy a styled cell and paste it, I expect the formatting to come with it.

---

## 6. Functional Requirements

| ID        | Requirement                       | Description                                                                                                                                                                                                                                                                                                                 |
| :-------- | :-------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR1.1** | **Data Model: Palette**           | The JSON file structure must be updated to include a top-level `styles` object mapping IDs to style definitions.<br>Example: `styles: { "1": { "font": { "bold": true } } }`                                                                                                                                                |
| **FR1.2** | **Data Model: Cells**             | Cell data must be updated to store a `styleId` reference instead of the style object.<br>Example: `"A1": { "value": "Text", "styleId": "1" }`                                                                                                                                                                               |
| **FR2.1** | **Style Manager: Logic**          | A `StyleManager` (or method within `FileManager`) must be implemented. When `setStyle(cellId, newStyleObject)` is called:<br>1. Generate a fingerprint/hash of `newStyleObject`.<br>2. Check `styles` palette for a match.<br>3. If found, return existing ID.<br>4. If not, create new ID, add to `styles`, return new ID. |
| **FR2.2** | **Garbage Collection (Optional)** | _Nice to have:_ When a style ID is no longer referenced by any cell, remove it from the `styles` palette to keep the file clean. (Can be done on Save or Load).                                                                                                                                                             |
| **FR3.1** | **Rendering Engine**              | `GridRenderer.js` must be updated. When rendering a cell, it must use `cell.styleId` to look up the actual style properties from the `styles` palette before applying CSS.                                                                                                                                                  |
| **FR4.1** | **Formatting Toolbar**            | A toolbar must be added to `index.html` with buttons for Bold, Italic, Colors, Alignments, etc.                                                                                                                                                                                                                             |
| **FR4.2** | **Toolbar State**                 | The toolbar must reflect the style of the _active cell_. This requires resolving `activeCell.styleId` -> `styleObject` -> Update UI buttons.                                                                                                                                                                                |
| **FR5.1** | **Copy (Clipboard)**              | When copying a cell, the system must resolve the `styleId` to the full `styleObject` and store _that_ in the clipboard. (Do not store the ID, as it is meaningless in a different file).                                                                                                                                    |
| **FR5.2** | **Paste (Canonicalization)**      | When pasting, the system must take the `styleObject` from the clipboard and pass it through the `StyleManager` logic (FR2.1) to get a valid `styleId` for the current file context.                                                                                                                                         |
| **FR6.1** | **History Integration**           | The `FormatRangeCommand` must store the `cellId` and the _resulting styleId_ (new) and _previous styleId_ (old) to support undo/redo efficiently.                                                                                                                                                                           |

---

## 7. Non-Functional Requirements

| ID       | Type                   | Requirement                                                                                                                                       |
| :------- | :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| **NFR1** | **Storage Efficiency** | The file size impact of formatting 10,000 cells with the _same_ style should be negligible (equivalent to storing 10,000 short strings/integers). |
| **NFR2** | **Performance**        | Style lookup during rendering must be extremely fast (O(1)).                                                                                      |
| **NFR3** | **De-duplication**     | The system must strictly prevent duplicate style definitions in the palette. Identical visual styles must share the same ID.                      |

---

## 8. High-Level Implementation Plan

1.  **Phase 1: Data Layer (Flyweight)**
    - Modify `server/app.py` to initialize/save the `styles` dictionary.
    - Implement `js/logic/StyleManager.js`.
    - Implement the `getStyleId(styleObject)` method with hashing/matching logic.
    - Write unit tests for `StyleManager` (e.g., ensure two identical styles return the same ID).
2.  **Phase 2: Integration**
    - Update `file-manager.js` to use `StyleManager`.
    - Create `FormatRangeCommand.js`.
3.  **Phase 3: Rendering**
    - Update `GridRenderer.js` to accept a `stylePalette` in its constructor (or fetch it from FileManager).
    - Apply CSS based on lookups.
4.  **Phase 4: UI & Interactions**
    - Build the Toolbar UI.
    - Connect Toolbar buttons to `FormatRangeCommand`.
    - Implement Copy/Paste logic (resolving/canonicalizing styles).
5.  **Phase 5: Testing**
    - E2E tests for applying styles, saving, reloading, and verifying persistence.
    - E2E test for Undo/Redo of formatting.

---

## 9. Success Metrics

- **Deduplication:** formatting 100 cells with "Bold" results in exactly **1** entry in the `styles` palette in the saved JSON.
- **Persistence:** Reloading the page restores all formatting correctly.
- **History:** Undo/Redo works perfectly for formatting changes.

---

## 10. Open Questions & Risks

- **Risk: Palette Bloat.** If users apply slightly different colors to every cell, the palette grows large.
  - **Mitigation:** This is acceptable user behavior. The optimization handles the _common_ case (duplicates).
- **Question:** How to handle "Partial" updates? (e.g., Cell is Bold, user adds Italic).
  - **Solution:**
    1. Resolve `styleId` -> `{ bold: true }`.
    2. Merge new style -> `{ bold: true, italic: true }`.
    3. Send merged object to `StyleManager` to get (or create) the new ID.
    4. Apply new ID to cell.
