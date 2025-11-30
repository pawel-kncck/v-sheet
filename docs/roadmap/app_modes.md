### 1. Ready Mode

- **Trigger / Activation:** The default state when the application loads, or after a user commits or cancels an action in any other mode.
- **Primary Goal:** To navigate the grid, view data, and select cells for operations like formatting or copy/paste.
- **Visual Indicators:** A solid border surrounds the active cell. The status bar displays "Ready".
- **Arrow Key Behavior:** Moves the active cell selection box freely around the grid.
- **Mouse Interaction (Grid):** Clicking selects cells or ranges.
- **Exit Strategy / Commit Action:**
  - **Typing text/numbers:** Switches to **Enter Mode**.
  - **Typing `=`:** Switches to **Formula Building Mode** $\rightarrow$ **Point Mode** (if arrows used) or **Formula Edit Mode**.
  - **Double-click / `F2`:** Switches to **Standard Edit Mode** (if not a formula) or **Formula Building Mode** (if a formula).

---

### 2. Enter Mode

- **Trigger / Activation:** Typing any standard character (letters/numbers) on a selected cell _that does not start with `=`_.
- **Primary Goal:** To **overwrite** the cell's previous content with new raw data.
- **Visual Indicators:** The status bar displays "Enter". Content appears in the cell as it is typed.
- **Arrow Key Behavior:** **Commits the edit** immediately and moves the active selection to the adjacent cell (e.g., Down Arrow saves and moves focus down).
- **Mouse Interaction (Grid):** Clicking another cell commits the data and moves selection.
- **Exit Strategy / Commit Action:**
  - **`Enter` / `Tab`:** Commits data and returns to Ready Mode.
  - **`F2`:** Toggles instantly to **Standard Edit Mode**.
  - **`Esc`:** Cancels entry and returns to Ready Mode.

---

### 3. Standard Edit Mode

- **Trigger / Activation:** Double-clicking or pressing `F2` on a cell containing standard text/numbers (non-formula).
- **Primary Goal:** To **modify** existing text content (e.g., fixing a typo) without overwriting it.
- **Visual Indicators:** A blinking text cursor (caret) appears inside the cell. The status bar displays "Edit".
- **Arrow Key Behavior:** Moves the text cursor (caret) left or right _inside_ the text string. It does **not** leave the cell.
- **Mouse Interaction (Grid):** Clicking the grid typically commits the change.
- **Exit Strategy / Commit Action:**
  - **`Enter` / `Tab`:** Commits changes and returns to Ready Mode.
  - **`Esc`:** Cancels changes and returns to Ready Mode.

---

### 4. Formula Building Mode (Parent Mode)

- **Trigger / Activation:** Typing `=` in Ready Mode, or editing a cell that already contains a formula.
- **Distinct Features:**
  - **Reference Highlighting:** Cell references in the text (e.g., `A1`) are colored to match borders on the grid.
  - **Mode Switching:** Dynamically toggles between **Formula Edit** and **Point** sub-modes based on cursor context.

#### Sub-Mode A: Formula Edit Mode

- **Trigger / Activation:** The cursor is positioned after a literal, a number, or a manually typed reference.
- **Primary Goal:** To type function names or manually edit formula text.
- **Visual Indicators:** Blinking text cursor. Status bar displays "Edit". Colored text highlighting.
- **Arrow Key Behavior:** Moves the text cursor left or right within the formula string.
- **Mouse Interaction (Grid):** Clicking a cell forces a switch to **Point Mode**.
- **Sub-Features:** **Autocomplete** appears when typing letters (A-Z) to suggest functions.
- **Exit Strategy:**
  - **Typing Operators (`+`, `(`, `,`):** Switches to **Point Mode**.
  - **`Enter` / `Tab`:** Commits formula and returns to Ready Mode.

#### Sub-Mode B: Point Mode

- **Trigger / Activation:** The cursor is positioned after an operator (`=`, `+`, `-`, `*`, `(`, `,`).
- **Primary Goal:** To visually "point" to cells to insert their addresses into the formula.
- **Visual Indicators:** Status bar displays "Point". Referenced cells have a "dancing ants" (dashed) border and colored overlay.
- **Arrow Key Behavior:** Moves a "virtual" selection box on the grid. The address of the selected cell is automatically inserted/updated in the formula.
- **Mouse Interaction (Grid):** Clicking a cell inserts or replaces the reference at the cursor position.
- **Exit Strategy:**
  - **Typing Text / Numbers:** Commits the reference and switches back to **Formula Edit Mode**.
  - **`Enter` / `Tab`:** Commits the entire formula and returns to Ready Mode.
