This documentation describes the desired **end state** of the application modes. Where the current implementation differs, a _Note on Implementation_ has been added.

### **App Modes Documentation**

The application uses a **Finite State Machine (FSM)** architecture. At any given time, the application is in exactly one "Mode," which dictates how inputs are interpreted and how data is displayed.

**General Display Rules:**

- **Formula Bar:** Always displays the _content_ of the active cell.
  - If the cell has a formula, it shows the formula text (e.g., `=A1+B2`).
  - If the cell has a value, it shows the value (e.g., `150`).
- **Grid Cells:** generally display the _result_ of formulas.
  - **Exception:** When a cell is **Active** and the app is in **Edit Mode** or **Point Mode**, that specific cell displays its raw formula/content to allow editing. All other (inactive) cells continue to show results.

---

### **1. Ready Mode**

**Default Navigation State**
The idle state for navigation, selection, and viewing results.

#### **Visual Indicators**

- **Status Bar:** Displays `Ready`.
- **Grid:** Active cell displays the _result_ of its formula (if any). Solid selection border.
- **Formula Bar:** Displays the _formula_ or raw content of the active cell.

#### **How to Enter**

- Initial app load.
- Committing/Canceling from any other mode.

#### **Actions & Behaviors**

- **Navigation:** Arrow keys move the selection box (Up, Down, Left, Right).
- **Mouse Interaction:**
  - **Click:** Selects a single cell.
  - **Drag:** Selects a range of cells.
  - **Ctrl+Click:** Adds non-contiguous cells to selection.
  - **Shift+Click:** Extends selection from anchor.
- **Shortcuts:**
  - `Ctrl+C` / `Ctrl+V` / `Ctrl+X` (Clipboard operations).
  - `Ctrl+B` (Toggle Bold), `Ctrl+I` (Toggle Italic).
  - `Delete` / `Backspace` (Clear content).

#### **Transitions**

| User Action             | Target Mode    | Description                                                        |
| :---------------------- | :------------- | :----------------------------------------------------------------- |
| **Type `=` or `+`**     | **Point Mode** | Starts formula building immediately.                               |
| **Type Character**      | **Enter Mode** | Overwrites cell content with the typed character.                  |
| **Press `Enter`**       | **Edit Mode**  | Switches to deep editing, regardless of whether the cell is empty. |
| **Double Click** / `F2` | **Edit Mode**  | Switches to deep editing.                                          |

> **Note on Implementation:**
>
> - Current code allows `-` to trigger Point Mode; spec restricts this to `=` and `+`.
> - Current code only enters Edit Mode via `Enter` key if the cell has content; spec requires it to enter Edit Mode even on empty cells.

---

### **2. Enter Mode**

**Quick Data Entry**
Triggered by typing over a cell. It overwrites previous content and favors speed.

#### **Visual Indicators**

- **Status Bar:** Displays `Enter`.
- **Grid & Formula Bar:** Synced. Both show the value being typed in real-time.

#### **How to Enter**

- From **Ready Mode**: Type any character _except_ `=`, `+`.

#### **Actions & Behaviors**

- **Typing:** Updates cell content directly.
- **Navigation:** Pressing **Arrow Keys** commits the data immediately and moves the selection to the adjacent cell.

#### **Transitions**

| User Action         | Target Mode    | Description                                    |
| :------------------ | :------------- | :--------------------------------------------- |
| **Arrow Keys**      | **Ready Mode** | Commits and moves selection.                   |
| **`Enter` / `Tab`** | **Ready Mode** | Commits and moves selection (Down/Right).      |
| **`Esc`**           | **Ready Mode** | Cancels entry, restores old value.             |
| **`F2`**            | **Edit Mode**  | Switches to standard editing (cursor control). |

---

### **3. Edit Mode**

**Standard Text Editing**
Used for modifying existing content or complex formula writing without pointing.

#### **Visual Indicators**

- **Status Bar:** Displays `Edit`.
- **Grid:** The active cell shows the _raw formula/text_ (not result). An input box is active with a blinking cursor.
- **Formula Bar:** Synced exactly with the cell input.

#### **How to Enter**

- **From Ready:** Press `Enter` (on any cell), `F2`, or Double Click.
- **From Formula Building:** Type a letter or number (e.g., typing function name `SUM`).

#### **Actions & Behaviors**

- **Browser Default:** Keyboard events act natively (Left/Right moves cursor inside text, Home/End moves to start/end).
- **No Pointing:** Arrow keys do _not_ select other cells; they move the text caret.

#### **Transitions**

| User Action         | Target Mode    | Description                                                               |
| :------------------ | :------------- | :------------------------------------------------------------------------ |
| **Type Operator**   | **Point Mode** | Typing `+`, `-`, `*`, `/`, etc. switches context to allow cell selection. |
| **`Enter` / `Tab`** | **Ready Mode** | Commits changes.                                                          |
| **`Esc`**           | **Ready Mode** | Cancels changes.                                                          |

---

### **4. Point Mode**

**Formula Selection**
A transient state specifically for selecting cells to add their references to a formula.

#### **Visual Indicators**

- **Status Bar:** Displays `Point`.
- **Grid:** Active cell shows formula. Referenced cell has "dancing ants" border.
- **Formula Bar:** Synced with active cell.

#### **How to Enter**

- **From Ready:** Type `=` or `+`. (Note: `-` does not trigger this).
- **From Edit:** Type an operator (e.g., `=A1+`).

#### **Actions & Behaviors**

- **Selection:** Arrow keys or Mouse Click move a "virtual" selection.
- **Reference Injection:**
  - **Replace:** If the cursor is immediately after a reference (e.g., `=A1`), moving the selection _replaces_ `A1` with the new cell (e.g., `=B2`).
  - **Append:** If the cursor is after an operator (e.g., `=A1+`), selecting a cell _appends_ it (e.g., `=A1+B2`).
- **Mouse:** Clicking a cell inserts/replaces the reference based on the rules above.

#### **Transitions**

| User Action            | Target Mode    | Description                                                                                |
| :--------------------- | :------------- | :----------------------------------------------------------------------------------------- |
| **Type Letter/Number** | **Edit Mode**  | User starts typing (e.g., manual reference or function name). Locks the current reference. |
| **Type Operator**      | **Point Mode** | (Stays in Point) Appends operator, locks previous reference, readies for next selection.   |
| **`Enter` / `Tab`**    | **Ready Mode** | Commits the formula.                                                                       |

> **Note on Implementation:**
>
> - Current implementation may simply append references during navigation; logic must be updated to support the "Replace vs Append" behavior based on cursor position/token type.

---

### **Example: Formula Building Lifecycle**

1.  **Ready Mode:** User types `=`.
    - _App enters Point Mode._
2.  **Point Mode:** User clicks Cell `B2`.
    - Formula: `=B2`.
    - _App stays in Point Mode._
3.  **Point Mode:** User changes mind, clicks Cell `C5`.
    - Formula updates: `=C5` (Replaces `B2`).
4.  **Point Mode:** User types `+`.
    - Formula: `=C5+`.
    - _App stays in Point Mode (or toggles quickly through Edit back to Point)._
5.  **Point Mode:** User types `S`.
    - _App switches to Edit Mode._
    - Formula: `=C5+S`.
6.  **Edit Mode:** User types `UM(`.
    - Formula: `=C5+SUM(`.
    - _App switches to Point Mode (triggered by `(` operator)._
7.  **Point Mode:** User selects range `D1:D10`.
    - Formula: `=C5+SUM(D1:D10`.
8.  **Point Mode:** User presses `Enter`.
    - _App switches to Ready Mode._
    - Result displayed.
