# PRD: Epic 7: Formula-Building UX (Revised)

- **Status:** Final
- **Date:** November 15, 2025
- **Author:** v-sheet Team
- **Depends On:** Epic 1 (History), Epic 2 (Testing), Epic 5 (Multi-Sheet)

---

## 1\. Overview

This document outlines the requirements for the "Formula-Building User Experience," a high-impact feature that defines the _feel_ of the application. This epic will transform formula entry from a static, text-based activity into a dynamic, interactive, and visual process. It allows users to build formulas by pointing (with mouse or keyboard) to cells and ranges, with the application providing multi-colored visual feedback for each reference. This is the intuitive formula editing experience that users expect from a modern spreadsheet.

---

## 2\. Problem Statement

- **Problem:** Formula entry is currently "dumb." When a user types in a cell, the arrow keys either move the text cursor or commit the edit; they do not navigate the grid. Users must manually type every reference (e.S., `A1:B10`), which is slow, error-prone, and frustrating.
- **Impact:** This makes building any non-trivial formula a chore. It breaks user flow and fails to meet a universal expectation set by all major spreadsheet applications. The lack of visual feedback (e.g., colored borders) makes it hard to audit or debug formulas.
- **Current State:** The in-cell editor (`#cell-editor`) `keydown` listener is designed for text entry, not formula navigation. The formula bar (`#formula-input`) is a separate input that is not synchronized with the in-cell editor or the grid's visual feedback system.

---

## 3\. Goals & Objectives

- **User Goal:** "I want to type `=`, then use my mouse or arrow keys to click and select cells to build my formula, with visual guides showing me what I've selected, regardless of whether I'm typing in the cell or the top bar."
- **Product Goal:** To deliver a fast, fluid, and intuitive formula-building experience that makes the application feel modern, powerful, and easy to use.
- **Technical Goal:** To create a new "Formula Editing" application state, synchronize the in-cell and top formula bar editors, and implement a live "mini-parser" to drive multi-colored visual feedback on the grid.

---

## 4\. Scope

### In Scope

- **"Formula Editing" State:** A new `this.isFormulaEditing` state in `spreadsheet.js` that activates when a user types `=` into a cell.
- **In-Cell Navigation:** When this state is active, arrow keys (`Up`, `Down`, `Left`, `Right`) and their `Shift+` variants must navigate the grid to select references, not move the text cursor.
- **Reference Insertion:** The selected cell/range reference (e.g., `A1`, `B2:C10`) must be automatically inserted into the formula text.
- **Perfect 2-Way Sync:** The in-cell editor (`#cell-editor`) and the top formula bar (`#formula-input`) must be perfectly synchronized (2-way binding) during formula editing.
- **Live Visual Feedback (Editor Agnostic):**
  - This feedback _must_ work whether the user is typing in the `#cell-editor` OR the `#formula-input`.
  - **Multi-Colored Highlighting:** As the user types, the grid must render colored borders around _all_ cell/range references in the formula.
  - **Pre-defined Color Palette:** The colors used will come from a fixed, repeating list (e.g., 8-10 colors).
- **Cross-Sheet Selection:** While in formula-editing mode, clicking on another sheet tab (from Epic 5) must switch the view and allow the user to select a range, correctly inserting the `SheetName!A1` reference.

### Out of Scope (For This Epic)

- **Autocomplete:** A "dropdown" of matching function names (e.g., "SUM", "SUMIF") is not in scope for this epic.
- **Argument Tooltips:** Pop-up help for function arguments (e.g., `SUM(number1, [number2], ...)` is out of scope.
- **Error Highlighting:** Live syntax error highlighting (e.g., red underline for `=(1+`) is out of scope.
- **Text-to-Color Matching:** Coloring the _text_ (e.g., `A1:B2`) in the input box to match the grid border is out of scope for V1.

---

## 5\. User Stories

- **As a user,** I want to type `=A1+` _in the cell_, then use the arrow keys to move the cursor from `A2` to `B2`, and have the formula update to `=A1+B2`.
- **As a user,** I want to type `=SUM(` _in the cell_, then use my mouse to drag-select the range `A1:A10`, and have the formula automatically become `=SUM(A1:A10)`.
- **As a user,** I want to type `=SUM(A1:B2, C3:D4)` _in the top formula bar_ and instantly see a **blue border** around `A1:B2` and a **green border** around `C3:D4` on the grid.
- **As a user,** while typing a formula in `Sheet1`, I want to click the "Data" sheet tab, click cell `A1`, and have `Data!A1` appear in my formula.
- **As a user,** when I am editing a formula, I want to be able to type in _either_ the in-cell editor or the top formula bar and have the other one update instantly.
- **As a user,** when I press `Enter` or `Tab`, the formula editing mode should end and the formula should be committed.
- **As a user,** when I press `Escape`, the formula editing mode should end and my changes should be canceled.

---

## 6\. Functional Requirements

| ID        | Requirement                           | Description                                                                                                                                                                                                                                                                                                                                 |
| :-------- | :------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **FR1.1** | **Formula Edit State**                | `spreadsheet.js` must enter an `isFormulaEditing` state when `_startEditing` is called with `=` as the initial character, or when a user edits a cell that already contains a formula.                                                                                                                                                      |
| **FR1.2** | **Editor Keydown Override**           | When `isFormulaEditing` is true, the `keydown` listener for `#cell-editor` must be overridden: <br> - **Arrow Keys:** Must move a "formula pointer" on the grid. <br> - **Enter/Tab:** Must commit the formula. <br> - **Escape:** Must cancel the edit. <br> - **Other keys (e.g., `+`, `*`, `(`):** Must be handled as normal text input. |
| **FR1.3** | **Perfect 2-Way Sync**                | An `oninput` listener must be added to both `#cell-editor` and `#formula-input`. A change in one must immediately update the `.value` of the other.                                                                                                                                                                                         |
| **FR2.1** | **Live Tokenizer (Agnostic)**         | The `oninput` listener for _whichever editor is active_ (in-cell or formula bar) must send the current formula text to a "live" `FormulaRefParser` utility.                                                                                                                                                                                 |
| **FR2.2** | **Reference Extraction**              | This `FormulaRefParser` must extract all `CELL_REF` and `RANGE` strings (e.g., `A1:B2`, `Data!C3`) from the formula.                                                                                                                                                                                                                        |
| **FR2.3** | **Multi-Color Rendering**             | `spreadsheet.js` must be modified. It needs to store a list of "formula highlights" (e.g., `[ { range: 'A1:B2', color: 'blue' }, { range: 'C3', color: 'green' } ]`) and render these _in addition_ to the main selection borders.                                                                                                          |
| **FR2.4** | **Pre-defined Color Palette**         | The system must use a pre-defined, repeating array of 8-10 colors (e.g., `['#4285F4', '#DB4437', '#F4B400', ...]`) for the visual highlights.                                                                                                                                                                                               |
| **FR3.1** | **Reference Insertion (Keyboard)**    | Moving the "formula pointer" with arrow keys must update the _last_ reference in the formula text.                                                                                                                                                                                                                                          |
| **FR3.2** | **Reference Insertion (Mouse)**       | Clicking/dragging on the grid must insert a new reference at the cursor's position in the formula text.                                                                                                                                                                                                                                     |
| **FR3.3** | **Reference Insertion (Cross-Sheet)** | Clicking a sheet tab must prefix the _next_ inserted reference with the sheet name (e.g., `Data!`).                                                                                                                                                                                                                                         |
| **FR4.1** | **State Termination**                 | `_commitEdit` and `_cancelEdit` must be updated to set `isFormulaEditing = false` and clear all multi-colored formula highlights from the grid.                                                                                                                                                                                             |
| **FR5.1** | **Testing**                           | E2E tests must be created for all user stories. Unit tests must be created for the new `FormulaRefParser`.                                                                                                                                                                                                                                  |

---

## 7\. Non-Functional Requirements

| ID       | Type              | Requirement                                                                                                                                                                                 |
| :------- | :---------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **NFR1** | **Performance**   | The live parsing and multi-color rendering must be near-instantaneous (\< 50ms) on _every keystroke_ to avoid a laggy typing experience.                                                    |
| **NFR2** | **Accuracy**      | The "live" parser must be 100% accurate in finding all valid references. It must correctly handle sheet names (e.g., `Data!A1`), absolute refs (e.g., `$A$1`), and ranges.                  |
| **NFR3** | **Robustness**    | The system must not crash or behave erratically if the user types a syntactically invalid formula (e.g., `=SUM(A1:`).                                                                       |
| **NFR4** | **Intuitiveness** | The rules for when arrow keys navigate vs. type must be simple. (Proposal: Arrow keys _always_ navigate _unless_ the text cursor is inside a string `""` or manually moved with the mouse). |

---

## 8\. High-Level Implementation Plan

1.  **Phase 1: State & Synchronization**
    - Add `isFormulaEditing` state to `spreadsheet.js`.
    - Implement the `oninput` listeners to synchronize `#cell-editor` and `#formula-input`.
    - Update `_startEditing`, `_commitEdit`, and `_cancelEdit` to manage the new state.
2.  **Phase 2: Live Reference Parser**
    - Create a new utility, `FormulaRefParser.js`. Its function `extract(formulaString)` will return an array of reference objects (`{ refString: 'A1:B2', sheet: null }`, `{ refString: 'C3', sheet: 'Data' }`).
    - This will likely use a regex-based approach for speed, _not_ the full `Tokenizer`.
    - Write extensive unit tests for this parser.
3.  **Phase 3: Multi-Color Renderer**
    - In `spreadsheet.js`, create a `this.formulaHighlights = []` array.
    - Implement the pre-defined color palette (FR2.4).
    - When the formula changes (from _either_ input), call the `FormulaRefParser`, assign colors from the palette, and populate this array.
    - Modify the main render loop (`_renderSelections`) to draw these new borders.
4.  **Phase 4: Keydown Override Logic**
    - Refactor the `#cell-editor` `keydown` listener in `spreadsheet.js`.
    - Add the `if (this.isFormulaEditing)` block.
    - Inside, handle `ArrowUp`, `ArrowDown`, etc., by `preventDefault()`-ing and creating a new "formula pointer" selection.
    - Implement the logic to update the `.value` of the editor with the new reference.
5.  **Phase 5: Cross-Sheet Integration**
    - Add event listeners to the sheet tabs (from Epic 5). When `isFormulaEditing` is true, clicking a tab will _not_ switch the active sheet, but will instead set a "prefix" (e.g., `Data!`) for the next mouse selection.
6.  **Phase 6: E2E Testing**
    - Create E2E tests for all user stories.

---

## 9\. Success Metrics

- All user stories are demonstrable.
- **Typing Performance:** The user can type a complex formula (e.g., `=SUM(A1:C10) * AVG(Data!B1:B50)`) in _either_ input box with no perceptible input lag.
- **Accuracy:** The multi-colored borders _always_ match the references in the formula bar, even with complex, overlapping, or cross-sheet references, regardless of which input was used.
- **Robustness:** The feature correctly handles syntax errors, sheet renames, and `Esc` / `Enter` / `Tab` from all states.

---

## 10\. Open Questions & Risks

- **Risk: Performance.** (NFR1) The "live parse on every keystroke" is the main risk.
  - **Mitigation:** The "live" parser _must_ be a lightweight regex, not the full `Tokenizer`/`Parser`. We must also debounce this listener (e.g., run 20ms _after_ the last keystroke).
- **Risk: Logic Complexity.** (FR1.2, FR3.1) The logic to "intelligently insert" a reference at the cursor is very complex.
  - **Mitigation (V1 Simplification):** For V1, we can decree that keyboard/mouse navigation _always_ replaces or appends the _last_ reference in the formula, or appends at the end if the last token is an operator. Trying to insert at the cursor is a V2 improvement.
- **Risk: Focus Management.** We now have two inputs.
  - **Mitigation:** We need clear rules. e.g., starting an in-cell edit _also_ `focuses` the top bar. Committing the edit `blurs` both.
