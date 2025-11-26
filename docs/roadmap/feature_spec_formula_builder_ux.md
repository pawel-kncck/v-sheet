Based on the user's detailed notes and the existing codebase analysis, here is the Feature Specification for **Epic 7: Formula-Building UX**.

This specification bridges the gap between the current simple text input and the interactive, visual experience described (similar to Google Sheets/Excel).

---

# Feature Spec: Formula-Building UX

- **Epic:** 7 (Enhanced)
- **Depends On:** Epic 2 (Tokenizer), Epic 3 (Formatting - for UI layers)
- **Status:** Ready for Development

## 1. Overview

The goal is to transform the formula entry experience from a static text input into a dynamic, interactive mode. This involves a "Formula Building" state machine that manages autocomplete, visual grid feedback (colored borders/overlays), live reference parsing, and keyboard navigation context switching.

## 2. User Flow & States

The application must switch between three internal states during cell editing:

1.  **Text Edit Mode:** Standard typing (e.g., typing "Apple").
2.  **Formula Navigation Mode:** Activated after `=`, `+`, `-`, `(`, `,`. Arrow keys move a "selection reticle" on the grid, inserting references into the formula.
3.  **Formula Autocomplete Mode:** Activated after typing a letter (e.g., `S`). Arrow keys navigate a dropdown list of functions.

## 3. Functional Requirements

### 3.1. Formula Building State Machine

- **Activation:** Triggered when the cell content starts with `=`.
- **Context Switching:**
  - **Input:** `=`, `Operator`, `(`, `,` $\rightarrow$ **Switch to Navigation Mode**.
  - **Input:** `Letter` (A-Z) $\rightarrow$ **Switch to Autocomplete Mode**.
  - **Input:** `Enter` $\rightarrow$ Commit formula.
  - **Input:** `Esc` $\rightarrow$ Cancel formula.

### 3.2. Function Autocomplete (The Popup)

- **UI:** A popup list appears below the active cell/formula bar when the user types a letter (e.g., "S").
- **Filtering:** List shows functions matching the current token (e.g., "S" -> `SUM`, `SUMIF`, `SUMPRODUCT`).
- **Navigation:**
  - `ArrowUp`/`ArrowDown`: Cycle through the list (Looping: Last $\leftrightarrow$ First).
  - `Tab`: Accepts the highlighted function.
- **Acceptance Action:**
  - Inserts function name + opening bracket (e.g., `SUM(`).
  - Switches state to **Navigation Mode**.

### 3.3. Live Visual Feedback (The "Mini-Parser")

- **Tokenization:** On every keystroke, the text must be tokenized to identify:
  - Cell References (`C3`)
  - Range References (`C7:C9`)
  - Open-ended Ranges (`C7:C`)
  - Functions / Brackets.
- **Color Palette:** A fixed palette of 12 distinct colors must be used.
  - Colors are assigned sequentially to unique references found in the formula string.
  - Example: `=A1 + B2 + A1` -> A1 (Color 1), B2 (Color 2), A1 (Color 1).
- **Text Highlighting:** The references inside the input box/formula bar must be colored matching the palette.
- **Grid Highlighting:**
  - **Border:** Dashed border in the assigned color.
  - **Overlay:** Semi-transparent fill (approx 30% opacity) in the assigned color.
  - **Focus:** The overlay only appears while the reference is being "actively created/edited". Once an operator is typed, the overlay may persist or diminish, but the border remains.
- **Focus Dimming (Optional V1.5):** When inside a function context (e.g., typing inside `SUM(...)`), external parts of the formula (`=C3+C4+`) fade out/increase opacity to emphasize the active function.

### 3.4. Grid Interaction (Keyboard & Mouse)

- **Mouse Click:** Clicking a cell while in **Formula Mode** inserts that cell's reference at the cursor position.
- **Mouse Drag:** Dragging creates a range reference (e.g., `A1:B5`).
- **Keyboard Navigation:**
  - In **Navigation Mode**, arrow keys move a "formula cursor" on the grid.
  - The address of the "formula cursor" replaces the reference currently being typed.
  - `Shift + Arrow`: Creates/expands a range selection.

### 3.5. Absolute References (F4)

- **Trigger:** Pressing `F4` when the text cursor is on a reference.
- **Cycling:** Cycles through 4 states:
  1.  Relative: `C3`
  2.  Absolute: `$C$3`
  3.  Mixed Row: `C$3`
  4.  Mixed Col: `$C3`

### 3.6. Open-Ended Ranges

- **Syntax:** `C7:C`
- **Interpretation:** Expands to the range from C7 to the last row of column C.
- **Visuals:** Highlights the column from C7 downwards.

---

## 4. Technical Architecture Refactoring

To implement this without creating a mess in `spreadsheet.js`, we need to introduce specific modules.

### 4.1. New Module: `FormulaBuilder.js`

A new UI controller responsible for the formula editing lifecycle.

- **Responsibilities:**
  - Listens to `EditorManager` input events.
  - Maintains the state (Navigation vs. Autocomplete).
  - Parses the current input to identify references.
  - Manages the color map (Ref -> Color).
  - Directs `GridRenderer` to draw formula highlights.

### 4.2. New Module: `FunctionAutocomplete.js`

- **Responsibilities:**
  - Renders the DOM popup list.
  - Filters `FunctionRegistry.list()` based on input.
  - Handles keyboard selection events.

### 4.3. Updates to `GridRenderer.js`

- **New Method:** `renderFormulaHighlights(highlights)`
  - `highlights` structure: `[{ range: {minRow, maxRow...}, color: string, isFocus: boolean }]`
  - Draws the colored dashed borders and overlay fills. This is a separate layer _above_ standard selection but _below_ the cell editor.

### 4.4. Updates to `Tokenizer.js` / `CellHelpers.js`

- **Enhanced Tokenization:** The current tokenizer is strict. We need a "loose" tokenizer or regex helper in `CellHelpers` that can identify "partial" references (e.g., `Sheet1!`) or open-ended ranges (`A:A`) specifically for the UI highlighting.

---

## 5. Implementation Plan

### Phase 1: The Visual Layer (Grid Highlighting)

1.  Define the 12-color palette in CSS/JS.
2.  Implement `GridRenderer.renderFormulaHighlights`.
3.  Create `FormulaBuilder` class that hooks into `EditorManager`.
4.  Implement basic regex parsing to extract `A1` or `A1:B2` from the input string.
5.  Feed these references to the renderer with colors.

### Phase 2: Interactive Selection (Navigation Mode)

1.  Modify `spreadsheet.js` keydown handler. If `FormulaBuilder.isActive()`:
    - Intercept arrow keys.
    - Move a virtual selection.
    - Update the `EditorManager` input value by splicing in the new reference.

### Phase 3: Autocomplete

1.  Implement `FunctionAutocomplete` class.
2.  Wire it into `FormulaBuilder`.
3.  Handle `Tab` key to insert function templates.

### Phase 4: Advanced References

1.  Implement `F4` cycling logic (string manipulation at cursor index).
2.  Implement `C7:C` open-ended range expansion logic in `CellHelpers`.

## 6. Corner Cases & Risks

- **Performance:** Parsing and rendering highlights on _every_ keystroke. Mitigation: Use a lightweight regex parser for UI feedback, not the full AST parser.
- **Z-Index:** Ensure formula highlights don't obscure the active cell editor text.
- **Scrolling:** Autocomplete popup must stay visible even if the cell is near the bottom edge (pop up instead of down).
