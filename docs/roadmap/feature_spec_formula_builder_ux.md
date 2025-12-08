Here is the final, revised Feature Specification for **Epic 7: Formula-Building UX**, incorporating the "Token Origin" logic and the refined state machine to match industry standards (Excel/Google Sheets).

---

# Feature Spec: Epic 7 - Formula-Building UX

- **Status:** Final
- **Epic:** 7
- **Depends On:** Epic 2 (Tokenizer), Epic 3 (Formatting - for UI layers)

## 1\. Overview

The goal is to transform the formula entry experience from a static text input into a dynamic, interactive mode. This feature introduces a robust **"Formula Building"** state machine that manages visual feedback, autocomplete, and reference navigation, mimicking the professional feel of Excel.

The core logic relies on distinguishing between **Typed References** (locked text) and **Pointed References** (live, replaceable selections).

---

## 2\. User Flow & States

The application transitions between a global **Ready Mode** and a **Formula Building Mode**. Inside Formula Building, the app toggles between two sub-states based on the cursor context.

### **2.1. Ready Mode (Idle)**

- **State:** The user is navigating the grid. No cell is being edited.
- **Indicator:** Standard active cell border.
- **Behavior:**
  - `Arrow Keys`: Move the active cell selection.
  - `Typing (=, +, -)`: Automatically switches to **Formula Building (Navigation Mode)**.
  - `Typing (Text/Numbers)`: Automatically switches to **Formula Building (Editing Mode)**.
  - `F2`: Enters **Editing Mode** (with cursor at end).

### **2.2. Formula Building Mode**

Active whenever a cell is being edited and the content starts with `=`. It has two internal sub-states:

#### **Sub-State A: Editing Mode (Text Input)**

- **Trigger:** Active when the cursor is positioned after a literal (text, number, function name) or a **Typed Reference**.
- **Behavior:**
  - `Arrow Keys`: Move the text cursor left/right within the formula string.
  - `Grid Interaction`: The grid is "locked" from keyboard navigation (arrows don't move selection).
  - `Autocomplete`: Active if typing a function name.

#### **Sub-State B: Navigation Mode (aka "Point Mode")**

- **Trigger:** Active when the cursor is positioned immediately after an **Operator** (`=`, `+`, `(`, `,`, etc.) or while a **Pointed Reference** is active.
- **Behavior:**
  - `Arrow Keys`: Move a "Virtual Selection" reticle on the grid.
  - `Typing`: Commits the selection and switches back to Editing Mode.

---

## 3\. Functional Requirements

### 3.1. State Machine Triggers

The system must evaluate the token _immediately preceding the text cursor_ to determine the sub-state.

- **Switch to Navigation Mode:**
  - Input: Operators (`=`, `+`, `-`, `*`, `/`, `^`, `&`, `(`, `,`, `<`, `>`, `<>`).
  - Action: Clicking any cell on the grid with the mouse (forces Navigation Mode).
  - Action: Pressing `F2` while in Editing Mode (Standard Toggle).
- **Switch to Editing Mode:**
  - Input: Letters, Numbers, `$`, `"` (Quotes).
  - Action: Pressing `F2` while in Navigation Mode.
  - Action: Clicking inside the formula input box/bar.
- **Exit Strategy:**
  - `Enter` / `Tab`: Commit formula and return to Ready Mode.
  - `Esc`: Cancel changes and return to Ready Mode.
  - `Backspace` on empty `=`: Return to Ready Mode.

### 3.2. Reference Origin Logic (The "Secret Sauce")

To replicate Excel's feel, the Formula Builder must track the **Origin** of the current reference token being edited.

| Origin Type | Definition                                   | Visual Cue                                   | Behavior on Click/Navigate                                                                                       |
| :---------- | :------------------------------------------- | :------------------------------------------- | :--------------------------------------------------------------------------------------------------------------- |
| **POINTED** | Created via Mouse Click or Arrow Navigation. | **"Dancing Ants"** (Animated dashed border). | **REPLACE:** Clicking another cell replaces this reference (e.g., `=A1` becomes `=B1`).                          |
| **TYPED**   | Manually typed by the user (e.g., "A", "1"). | **Solid Line** (Colored border).             | **COMMIT:** Clicking another cell _commits_ this text and moves selection away (unless an operator is appended). |

- **Lifecycle:** A `POINTED` reference becomes `TYPED` (Locked) the moment the user types an operator (e.g., `+`) after it.

### 3.3. Live Visual Feedback (Refined)

- **Tokenization:** On every keystroke, the input string is parsed to identify all references.
- **Color Palette:** A fixed 12-color palette is assigned sequentially to unique references (e.g., `A1` is Blue, `B2` is Red).
- **Rendering Layers:**
  1.  **Text Color:** References inside the editor/formula bar text are colored.
  2.  **Grid Border:**
      - If `POINTED`: Animated "Dancing Ants" border in assigned color.
      - If `TYPED`: Solid colored border.
  3.  **Grid Overlay:** A semi-transparent fill (30% opacity) matches the border color.
      - _Focus Logic:_ The overlay appears _only_ for the reference currently under the cursor (or being created). Other references show borders only.
- **Function Context Dimming:** (Optional V1) When typing inside `SUM(...)`, parts of the formula outside the parentheses fade slightly to emphasize the active function context.

### 3.4. Autocomplete (Sub-Feature of Editing Mode)

- **Trigger:** Typing a letter (A-Z).
- **UI:** A popup list appears anchored to the cell or formula bar.
- **Keyboard Override:**
  - `Up`/`Down`: Cycle selection (Looping).
  - `Tab`: Inserts function name + `(`, switches to Navigation Mode.
  - `Left`/`Right`: Still move text cursor (closes popup).

### 3.5. Mouse & Keyboard Interactions

- **Mouse Click (Grid):**
  - Always forces **Navigation Mode**.
  - Inserts a `POINTED` reference at the cursor position.
  - If the cursor was on a `POINTED` reference, it **replaces** it.
  - If the cursor was on a `TYPED` reference (with no trailing operator), it behaves as a **Commit** (saves cell, moves selection).
- **Mouse Drag:** Creates a Range Reference (`A1:B5`). The token origin is `POINTED`.
- **Shift + Arrows:** Expands the current `POINTED` selection into a range.

### 3.6. Advanced References

#### F4 Toggle (Absolute Reference Cycling)

The F4 key cycles a cell reference through four formats that control how references adjust when formulas are copied:

- **Cycle Sequence:** `A1` → `$A$1` → `A$1` → `$A1` → `A1` (loops back)
- **Format Meanings:**
  - `A1`: Relative - both column and row adjust when copied
  - `$A$1`: Fully absolute - neither column nor row adjust
  - `A$1`: Row absolute - only column adjusts
  - `$A1`: Column absolute - only row adjusts

**Behavior in PointMode (Navigation Mode):**
- When the cursor is at the end of a formula with a `POINTED` reference, pressing F4 cycles that reference
- The visual feedback (dancing ants border) remains active
- The baseFormula is updated to reflect the new reference format
- Multiple F4 presses continue cycling through all four formats

**Behavior in EditMode (Text Input Mode):**
- F4 cycles the reference at or before the current cursor position
- Works on both `POINTED` and `TYPED` references
- If the cursor is within a range (e.g., `A1:B2`), F4 cycles both parts of the range independently on subsequent presses (Excel behavior)
- If no reference is found at the cursor, F4 has no effect

**Implementation Notes:**
- Uses `FormulaAdjuster.cycleReferenceFormat(ref)` utility method
- The parser must preserve `$` markers during tokenization
- Visual highlighting updates to show the new reference format immediately

#### Open-Ended Ranges

- **Support for `A1:A`:** Range to bottom of column
  - Visuals: Highlight the entire column starting from A1

---

## 4\. Technical Architecture Updates

### 4.1. `FormulaBuilder.js` (New Controller)

This class manages the complex state machine.

```javascript
class FormulaBuilder {
  constructor(editorManager, gridRenderer) {
    this.state = {
      mode: 'EDITING', // or 'NAVIGATION'
      activeToken: null, // { type: 'REF', value: 'A1', origin: 'POINTED' }
      autocompleteVisible: false,
    };
  }
  // Handles input events, parses tokens, manages colors
}
```

### 4.2. `FormulaTokenizer` (Lightweight)

A dedicated, lightweight tokenizer (regex-based) is needed for the UI thread. The full Engine Tokenizer is too heavy/async for keystroke-level visuals.

- **Responsibility:** Extract references, ranges, and operators efficiently for highlighting.

### 4.3. `GridRenderer` Updates

- **`renderFormulaHighlights(highlights)`**:
  - `highlights`: Array of `{ range, color, style: 'SOLID' | 'DASHED' | 'ANTS', showOverlay: boolean }`.
  - This method draws the visual layer above the grid but below the editor.

---

## 5\. Implementation Plan

1.  **Visual Layer:** Implement the 12-color palette and `renderFormulaHighlights` in `GridRenderer`.
2.  **State Controller:** Build `FormulaBuilder.js` to hook into `EditorManager` events (`input`, `keydown`).
3.  **Parsing:** Implement the lightweight regex parser to drive colors.
4.  **Navigation Logic:** Implement the `Arrow Key` interception logic in `FormulaBuilder`.
5.  **Origin Logic:** Implement the `POINTED` vs `TYPED` distinction to handle the "Replace vs. Append" behavior correctly.
6.  **Autocomplete:** Build the `FunctionAutocomplete` UI module.
