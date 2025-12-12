# v-sheet User Workflows

This document consolidates all user-facing workflow documentation for v-sheet.

**Last Updated**: 2025-12-11

---

## Workflow: Quick Data Entry (Tab Navigation)

**Goal**: User enters values quickly across multiple cells horizontally

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State | Mode |
|------|-------------|-----------------|--------------|------|
| 1 | User clicks cell B2 | Blue selection border appears on B2 | `SelectionManager.activeCell = B2`, `Mode = ReadyMode` | Ready |
| 2 | User types "100" | "100" appears in cell B2, formula bar shows "100" | `Mode = EnterMode`, `EditorManager.content = "100"`, editor is active in B2 | Enter |
| 3 | User presses Tab | Value "100" commits and stays visible in B2, selection border moves to C2 | Cell B2 value saved to FileManager, `Mode = ReadyMode`, `SelectionManager.activeCell = C2` | Ready |
| 4 | User types "200" and presses Tab | C2 shows "200", selection moves to D2 | `Cell C2 = "200"`, `activeCell = D2`, `Mode = Ready` | Ready |

**Key Behavior**: Tab moves selection right after committing the edit

---

## Workflow: Quick Data Entry (Enter Navigation)

**Goal**: User enters values quickly down a column

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State | Mode |
|------|-------------|-----------------|--------------|------|
| 1 | User clicks cell A1 | Selection border on A1 | `activeCell = A1`, `Mode = Ready` | Ready |
| 2 | User types "Apple" | "Apple" appears in A1, formula bar shows "Apple" | `Mode = Enter`, editor active | Enter |
| 3 | User presses Enter | "Apple" commits in A1, selection moves to A2 | `A1 = "Apple"`, `activeCell = A2`, `Mode = Ready` | Ready |
| 4 | User types "Banana" and presses Enter | A2 shows "Banana", selection moves to A3 | `A2 = "Banana"`, `activeCell = A3` | Ready |

**Key Behavior**: Enter moves selection down after committing

---

## Workflow: Arrow Key Commits in EnterMode

**Goal**: User types a value and uses arrow key to commit and move in one action

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State | Mode |
|------|-------------|-----------------|--------------|------|
| 1 | User is in cell C3, types "500" | "500" appears in cell, formula bar shows "500" | `Mode = Enter`, editor active with "500" | Enter |
| 2 | User presses Arrow Right | Value "500" commits in C3, selection immediately moves to D3 | `C3 = "500"` (saved), `Mode = Ready`, `activeCell = D3` | Ready |
| 3 | User presses Arrow Down | Selection moves to D4 | `activeCell = D4`, still in `ReadyMode` | Ready |

**Key Behavior**: In EnterMode, arrow keys commit THEN move (two actions in one keystroke)

---

## Workflow: Fine-Tuned Editing with F2

**Goal**: User wants to edit existing cell content with cursor control

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State | Mode |
|------|-------------|-----------------|--------------|------|
| 1 | User clicks cell B5 which contains "Hello World" | Selection on B5, formula bar shows "Hello World" | `activeCell = B5`, `Mode = Ready` | Ready |
| 2 | User presses F2 | Text cursor appears at end of "Hello World" in cell, cell border changes to editing state | `Mode = Edit`, editor active with content "Hello World" | Edit |
| 3 | User presses Home, then types "UPDATED: " | Cell now shows "UPDATED: Hello World" | Still `Mode = Edit`, content modified | Edit |
| 4 | User presses Arrow Right | Text cursor moves right one character (NOT cell selection) | Still `Mode = Edit` (arrows move cursor, not grid) | Edit |
| 5 | User presses Enter | Cell shows final content "UPDATED: Hello World", selection moves to B6 | `B5 = "UPDATED: Hello World"`, `Mode = Ready`, `activeCell = B6` | Ready |

**Key Behavior**: In EditMode, arrow keys move text cursor, not selection. Press Enter to commit.

---

## Workflow: Simple Formula Entry

**Goal**: User creates a simple formula by typing

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State | Mode |
|------|-------------|-----------------|--------------|------|
| 1 | User clicks cell D1 | Selection on D1 | `activeCell = D1`, `Mode = Ready` | Ready |
| 2 | User types "=A1+B1" | Formula bar shows "=A1+B1", cell shows "=A1+B1" while typing | First character "=" triggers `Mode = Point`, but user continues typing, switches to `Mode = Edit` | Edit |
| 3 | User presses Enter | Cell D1 shows calculated result (e.g., "30" if A1=10, B1=20), formula bar shows the formula when D1 is selected, selection moves to D2 | `D1.formula = "=A1+B1"`, `D1.value = 30`, `Mode = Ready`, FormulaEngine calculated result in worker | Ready |

**Key Behavior**: Formulas start with "=", and the result is displayed in the cell

---

## Workflow: Point Mode Formula Building

**Goal**: User builds a formula by clicking cells with the mouse/arrow keys

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State | Mode |
|------|-------------|-----------------|--------------|------|
| 1 | User clicks cell E1 | Selection on E1 | `activeCell = E1`, `Mode = Ready` | Ready |
| 2 | User types "=" | Formula bar shows "=", cell shows "=" | `Mode = Point` (activated by formula trigger) | Point |
| 3 | User clicks cell A1 | Formula bar shows "=A1", cell E1 shows "=A1", A1 gets a temporary highlight/border indicating it's referenced | Mode still `Point`, reference "A1" added to formula | Point |
| 4 | User types "+" | Formula bar shows "=A1+" | Still `Mode = Point`, operator locks previous reference | Point |
| 5 | User presses Arrow Right | Formula bar shows "=A1+B1", B1 gets reference highlight | `Mode = Point`, arrow key updated reference (didn't move selection) | Point |
| 6 | User presses Enter | E1 shows calculated result, selection moves to E2 | `E1.formula = "=A1+B1"`, result calculated, `Mode = Ready` | Ready |

**Key Behavior**: In PointMode, arrow keys and clicks update formula references (not grid navigation)

---

## Workflow: Range Selection and SUM Formula

**Goal**: User creates a SUM formula with a range

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State | Mode |
|------|-------------|-----------------|--------------|------|
| 1 | User clicks cell A10 | Selection on A10 | `activeCell = A10`, `Mode = Ready` | Ready |
| 2 | User types "=SUM(" | Formula bar shows "=SUM(", cell shows "=SUM(" | `Mode = Point` | Point |
| 3 | User clicks A1 and drags to A9 (or clicks A1, Shift+clicks A9) | Range A1:A9 gets selection highlight, formula bar shows "=SUM(A1:A9" | Range reference added to formula | Point |
| 4 | User types ")" | Formula bar shows "=SUM(A1:A9)" | Function call completed | Edit |
| 5 | User presses Enter | A10 shows sum of A1:A9 (e.g., "450") | Formula saved, result calculated, `Mode = Ready` | Ready |

**Key Behavior**: Ranges are created by drag-selecting or Shift+clicking

---

## Workflow: Copy and Paste

**Goal**: User copies a cell and pastes to another location

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State | Mode |
|------|-------------|-----------------|--------------|------|
| 1 | User clicks cell B2 (contains "100") | Selection on B2 | `activeCell = B2`, `Mode = Ready` | Ready |
| 2 | User presses Cmd+C (or Ctrl+C) | B2 gets a dashed "marching ants" border indicating copied | `ClipboardManager` stores B2 content | Ready |
| 3 | User clicks cell D5 | Selection moves to D5 | `activeCell = D5` | Ready |
| 4 | User presses Cmd+V (or Ctrl+V) | D5 now shows "100", marching ants border disappears from B2 | `D5 = "100"` (value copied), clipboard cleared, command added to history (undo-able) | Ready |

**Key Behavior**: Copy stores content, paste inserts at active cell

---

## Workflow: Undo/Redo

**Goal**: User makes a mistake and wants to undo it

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State | Mode |
|------|-------------|-----------------|--------------|------|
| 1 | User has cell A1 = "10", changes it to "20" | A1 shows "20" | `A1 = "20"`, UpdateCellsCommand in history stack | Ready |
| 2 | User presses Cmd+Z (Undo) | A1 reverts to showing "10" | Command.undo() executed: `A1 = "10"`, command moved to redo stack | Ready |
| 3 | User presses Cmd+Y (Redo) | A1 shows "20" again | Command.execute() called again: `A1 = "20"`, command back in undo stack | Ready |

**Key Behavior**: Undo/redo work through command history, up to 100 commands

---

## Workflow: Delete Cell Content

**Goal**: User clears cell content

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State | Mode |
|------|-------------|-----------------|--------------|------|
| 1 | User clicks cell C3 (contains "Hello") | Selection on C3 | `activeCell = C3`, `Mode = Ready` | Ready |
| 2 | User presses Delete (or Backspace) | Cell C3 becomes empty, formula bar shows empty | `C3 = ""` (empty string), UpdateCellsCommand in history (undo-able), `Mode = Ready` (stays in Ready, doesn't enter Edit) | Ready |

**Key Behavior**: Delete/Backspace in ReadyMode clears cell content immediately

---

## Workflow: Range Selection with Shift+Click

**Goal**: User selects a range of cells for copying or formatting

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State | Mode |
|------|-------------|-----------------|--------------|------|
| 1 | User clicks cell B2 | Selection border on B2 | `activeCell = B2`, `SelectionManager.ranges = []` | Ready |
| 2 | User holds Shift and clicks cell D5 | Range B2:D5 is highlighted with blue background, B2 remains the active cell (darker border) | `activeCell = B2` (anchor), `SelectionManager.ranges = [{start: B2, end: D5}]` | Ready |
| 3 | User presses Cmd+C to copy | Marching ants border around B2:D5 | ClipboardManager stores entire range | Ready |
| 4 | User clicks F10, presses Cmd+V | Range B2:D5 content appears starting at F10 (F10:H13) | Paste command executed, values copied to new location | Ready |

**Key Behavior**: Shift+Click creates ranges, operations apply to entire range

---

## Workflow: Jump to Edge of Data

**Goal**: User navigates quickly to edge of data region

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State | Mode |
|------|-------------|-----------------|--------------|------|
| 1 | User has data in A1:A100, is at A1 | Selection on A1 | `activeCell = A1` | Ready |
| 2 | User presses Cmd+Down (Ctrl+Down on Windows) | Selection jumps to A100 (last filled cell in column) | `activeCell = A100`, `SelectionManager` detected edge using `findEdge()` algorithm | Ready |
| 3 | User presses Cmd+Down again | Selection jumps to last row (e.g., A1000 if that's the limit) | `activeCell` at edge of spreadsheet | Ready |

**Key Behavior**: Cmd+Arrow jumps to data edges, useful for large datasets

---

## Workflow: Extend Selection to Edge

**Goal**: User selects from current cell to edge of data

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State | Mode |
|------|-------------|-----------------|--------------|------|
| 1 | User is at A1 (data in A1:A50) | Selection on A1 | `activeCell = A1` | Ready |
| 2 | User presses Cmd+Shift+Down | Range A1:A50 is selected (highlighted) | `activeCell = A1` (anchor), `ranges = [{start: A1, end: A50}]` | Ready |

**Key Behavior**: Cmd+Shift+Arrow extends selection to data edge

---

## Workflow: Cancel Edit with Escape

**Goal**: User starts editing but wants to discard changes

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State | Mode |
|------|-------------|-----------------|--------------|------|
| 1 | User clicks cell A1 (contains "Original") | Selection on A1 | `activeCell = A1`, `Mode = Ready` | Ready |
| 2 | User presses F2 to edit | Editor appears with "Original" | `Mode = Edit` | Edit |
| 3 | User types " MODIFIED" | Cell shows "Original MODIFIED" | Editor content = "Original MODIFIED" (not yet saved) | Edit |
| 4 | User presses Escape | Cell reverts to showing "Original", editor disappears | `Mode = Ready`, `A1 = "Original"` (unchanged), no command added to history | Ready |

**Key Behavior**: Escape cancels edit and discards changes

---

## Workflow: Double-Click to Edit

**Goal**: User double-clicks a cell to edit it

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State | Mode |
|------|-------------|-----------------|--------------|------|
| 1 | User double-clicks cell B3 (contains "Test") | Editor appears in cell with "Test", text cursor at end of "Test" | `Mode = Edit`, `activeCell = B3` | Edit |
| 2 | User edits and presses Enter | Edit commits, selection moves down | `Mode = Ready` | Ready |

**Key Behavior**: Double-click is shortcut to enter EditMode

---

## Workflow: Apply Bold Formatting

**Goal**: User makes selected cells bold

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State | Mode |
|------|-------------|-----------------|--------------|------|
| 1 | User selects cells B2:B5 | Blue selection highlight on B2:B5 | `SelectionManager.ranges = [{start: B2, end: B5}]`, `Mode = Ready` | Ready |
| 2 | User presses Ctrl+B (or clicks Bold button in toolbar) | Text in B2:B5 becomes bold, bold button in toolbar appears pressed/active | FormatRangeCommand created with `{ font: { bold: true } }`, StyleManager creates/retrieves styleId for bold style, each cell's `styleId` updated in FileManager, GridRenderer.updateCellStyle() applies CSS | Ready |
| 3 | User presses Ctrl+B again (toggle off) | Text in B2:B5 returns to normal weight, bold button appears unpressed | New FormatRangeCommand with `{ font: { bold: false } }` | Ready |

**Key Behavior**: Bold is a toggle - pressing Ctrl+B when already bold removes bold

---

## Workflow: Apply Background Color

**Goal**: User sets a background color on cells

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State | Mode |
|------|-------------|-----------------|--------------|------|
| 1 | User selects cells C3:D4 | Blue selection on C3:D4 | `SelectionManager.ranges = [{start: C3, end: D4}]` | Ready |
| 2 | User clicks Fill Color picker in toolbar, selects yellow (#FFFF00) | Background of C3, C4, D3, D4 turns yellow, fill color picker shows yellow as selected | FormatRangeCommand created with `{ fill: { color: '#FFFF00' } }`, StyleManager deduplicates: if another cell had same yellow, shares styleId, command added to history (undo-able) | Ready |
| 3 | User presses Ctrl+Z (undo) | Cells return to white background | FormatRangeCommand.undo() restores old styleIds | Ready |

**Key Behavior**: Colors are "set" mode (not toggle) - selecting a color always applies it

---

## Workflow: Copy and Paste with Styles

**Goal**: User copies formatted cells and pastes both values and formatting

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State | Mode |
|------|-------------|-----------------|--------------|------|
| 1 | User has cell A1 with value "Total" and bold + blue background | A1 shows bold "Total" with blue fill | `A1.styleId` points to style with `{ font: { bold: true }, fill: { color: '#0000FF' } }` | Ready |
| 2 | User selects A1, presses Cmd+C | Marching ants border on A1 | ClipboardManager stores `{ value: "Total", style: {...} }` | Ready |
| 3 | User selects E5, presses Cmd+V | E5 shows bold "Total" with blue background (same as A1), marching ants disappear | UpdateCellsCommand created with both `newValue` and `newStyle`, StyleManager may reuse existing styleId or create new one, E5 has same visual appearance as A1 | Ready |

**Key Behavior**: Paste copies both value AND style - cells get identical formatting

---

## Mode Behaviors

v-sheet uses a **Finite State Machine (FSM)** with four primary modes:

### ReadyMode (Default Navigation State)

**What the User Experiences**:
- Arrow keys navigate the grid (move selection)
- Typing starts data entry or formula building
- Clipboard operations work (Copy/Paste/Cut)
- Undo/Redo available
- Delete/Backspace clears selected cells

**Mode Transitions FROM Ready**:
- Type `=`, `+`, `-` -> PointMode (formula triggers)
- Type regular character -> EnterMode (quick entry)
- F2, Double-click, Enter on filled cell -> EditMode

### EnterMode (Quick Data Entry)

**What the User Experiences**:
- Arrow keys commit THEN move (two actions in one keystroke)
- Tab/Enter commit and move (right/down respectively)
- F2 switches to EditMode for fine-tuning
- Escape cancels the entry

**Mode Transitions FROM Enter**:
- Arrow keys -> ReadyMode (after commit)
- Tab/Enter -> ReadyMode (after commit)
- F2 -> EditMode (for fine-tuning)
- Escape -> ReadyMode (cancel)

### EditMode (Fine-Tuned Editing)

**What the User Experiences**:
- Arrow keys move the text cursor (NOT grid navigation)
- Home/End work as expected for text editing
- Enter/Tab commit and return to ReadyMode
- Escape cancels the edit

**Mode Transitions FROM Edit**:
- Enter/Tab -> ReadyMode (commit)
- Escape -> ReadyMode (cancel)
- Type operator in formula -> PointMode (conditional)

### PointMode (Formula Building)

**What the User Experiences**:
- Arrow keys update the formula reference (don't navigate grid)
- Mouse clicks insert/update references
- Typing operators locks the current reference and prepares for next reference
- Typing letters/numbers switches to EditMode for manual entry

**Mode Transitions FROM Point**:
- Enter/Tab -> ReadyMode (commit formula)
- Escape -> ReadyMode (cancel)
- F2 -> EditMode (manual formula editing)
- Type letter/number -> EditMode (typing function name or constant)

---

## Keyboard Shortcuts Reference

### Global Shortcuts (Available in All Modes)

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Cmd+Z** | Undo | Reverts the last command (up to 100 commands) |
| **Cmd+Y** or **Cmd+Shift+Z** | Redo | Re-applies the last undone command |
| **Escape** | Cancel/Exit | Exits current mode, discards edit, returns to ReadyMode |

### ReadyMode Shortcuts

| Shortcut | Action |
|----------|--------|
| Arrow Keys | Move Selection |
| Tab | Move Right |
| Shift+Tab | Move Left |
| Enter | Move Down or Edit |
| Cmd+Arrow | Jump to Edge |
| Shift+Arrow | Extend Selection |
| Cmd+Shift+Arrow | Extend to Edge |
| Cmd+C | Copy |
| Cmd+V | Paste |
| Cmd+X | Cut |
| Delete/Backspace | Clear Cell |
| F2 | Edit Cell |
| Cmd+B | Toggle Bold |
| Cmd+I | Toggle Italic |

### EnterMode Shortcuts

| Shortcut | Action |
|----------|--------|
| Type characters | Append Text |
| Arrow Keys | Commit and Move |
| Tab | Commit and Move Right |
| Enter | Commit and Move Down |
| F2 | Switch to EditMode |
| Escape | Cancel Entry |

### EditMode Shortcuts

| Shortcut | Action |
|----------|--------|
| Type characters | Insert Text |
| Arrow Keys | Move Text Cursor |
| Home/End | Jump to Start/End |
| Enter | Commit and Move Down |
| Tab | Commit and Move Right |
| Escape | Cancel Edit |
| F4 | Toggle Absolute Reference |

### PointMode Shortcuts

| Shortcut | Action |
|----------|--------|
| Arrow Keys | Update Reference |
| Click Cell | Insert/Update Reference |
| Shift+Arrow | Create Range |
| Type operators | Add Operator |
| Enter | Commit Formula |
| Tab | Commit and Move Right |
| Escape | Cancel Formula |
| F4 | Toggle Absolute Reference |

---

## Platform Differences

| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| Undo | Cmd+Z | Ctrl+Z |
| Redo | Cmd+Y | Ctrl+Y |
| Copy | Cmd+C | Ctrl+C |
| Paste | Cmd+V | Ctrl+V |
| Cut | Cmd+X | Ctrl+X |
| Jump to Edge | Cmd+Arrow | Ctrl+Arrow |
| Toggle Bold | Cmd+B | Ctrl+B |
| Toggle Italic | Cmd+I | Ctrl+I |

---

## See Also

- Technical architecture: `/docs/architecture/01-mode-system.md`
- Test scenarios: `/docs/manuals/test-scenarios/`
- API reference: `/docs/manuals/api-reference/`
