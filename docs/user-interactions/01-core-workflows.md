# Core User Workflows

This document describes the fundamental user workflows in v-sheet. Each workflow shows:
- **User Action**: What the user does
- **Visual Feedback**: What the user sees
- **System State**: Internal state changes

---

## 1. Quick Data Entry (Tab Navigation)

**Goal**: User enters values quickly across multiple cells horizontally

### Step-by-Step Flow

1. **User clicks cell B2**
   - **Visual**: Blue selection border appears on B2
   - **State**: `SelectionManager.activeCell = B2`, `Mode = ReadyMode`

2. **User types "100"**
   - **Visual**: "100" appears in cell B2, formula bar shows "100"
   - **State**: `Mode = EnterMode`, `EditorManager.content = "100"`, editor is active in B2

3. **User presses Tab**
   - **Visual**:
     - Value "100" commits and stays visible in B2
     - Selection border moves to C2
     - Formula bar updates to show C2's content (or empty)
   - **State**:
     - Cell B2 value saved to FileManager
     - `Mode = ReadyMode`
     - `SelectionManager.activeCell = C2`

4. **User types "200" and presses Tab**
   - **Visual**: Same pattern - C2 shows "200", selection moves to D2
   - **State**: `Cell C2 = "200"`, `activeCell = D2`, `Mode = Ready`

**Key Behavior**: Tab moves selection right after committing the edit

---

## 2. Quick Data Entry (Enter Navigation)

**Goal**: User enters values quickly down a column

### Step-by-Step Flow

1. **User clicks cell A1**
   - **Visual**: Selection border on A1
   - **State**: `activeCell = A1`, `Mode = Ready`

2. **User types "Apple"**
   - **Visual**: "Apple" appears in A1, formula bar shows "Apple"
   - **State**: `Mode = Enter`, editor active

3. **User presses Enter**
   - **Visual**:
     - "Apple" commits in A1
     - Selection moves to A2
   - **State**: `A1 = "Apple"`, `activeCell = A2`, `Mode = Ready`

4. **User types "Banana" and presses Enter**
   - **Visual**: A2 shows "Banana", selection moves to A3
   - **State**: `A2 = "Banana"`, `activeCell = A3`

**Key Behavior**: Enter moves selection down after committing

---

## 3. Arrow Key Commits in EnterMode

**Goal**: User types a value and uses arrow key to commit and move in one action

### Step-by-Step Flow

1. **User is in cell C3, types "500"**
   - **Visual**: "500" appears in cell, formula bar shows "500"
   - **State**: `Mode = Enter`, editor active with "500"

2. **User presses Arrow Right (→)**
   - **Visual**:
     - Value "500" commits in C3
     - Selection immediately moves to D3
     - Formula bar updates to D3's content
   - **State**:
     - `C3 = "500"` (saved)
     - `Mode = Ready` (committed and exited Enter mode)
     - `activeCell = D3`

3. **User presses Arrow Down (↓)**
   - **Visual**: Selection moves to D4
   - **State**: `activeCell = D4`, still in `ReadyMode`

**Key Behavior**: In EnterMode, arrow keys commit THEN move (two actions in one keystroke)

---

## 4. Fine-Tuned Editing with F2

**Goal**: User wants to edit existing cell content with cursor control

### Step-by-Step Flow

1. **User clicks cell B5 which contains "Hello World"**
   - **Visual**: Selection on B5, formula bar shows "Hello World"
   - **State**: `activeCell = B5`, `Mode = Ready`

2. **User presses F2**
   - **Visual**:
     - Text cursor appears at end of "Hello World" in cell
     - Cell border changes to editing state
   - **State**: `Mode = Edit`, editor active with content "Hello World"

3. **User presses Home, then types "UPDATED: "**
   - **Visual**: Cell now shows "UPDATED: Hello World"
   - **State**: Still `Mode = Edit`, content modified

4. **User presses Arrow Right (→)**
   - **Visual**: Text cursor moves right one character (NOT cell selection)
   - **State**: Still `Mode = Edit` (arrows move cursor, not grid)

5. **User presses Enter**
   - **Visual**:
     - Cell shows final content "UPDATED: Hello World"
     - Selection moves to B6
   - **State**: `B5 = "UPDATED: Hello World"`, `Mode = Ready`, `activeCell = B6`

**Key Behavior**: In EditMode, arrow keys move text cursor, not selection. Press Enter to commit.

---

## 5. Simple Formula Entry

**Goal**: User creates a simple formula by typing

### Step-by-Step Flow

1. **User clicks cell D1**
   - **Visual**: Selection on D1
   - **State**: `activeCell = D1`, `Mode = Ready`

2. **User types "=A1+B1"**
   - **Visual**:
     - Formula bar shows "=A1+B1"
     - Cell shows "=A1+B1" while typing
   - **State**:
     - First character "=" triggers `Mode = Point`
     - But user continues typing, switches to `Mode = Edit`

3. **User presses Enter**
   - **Visual**:
     - Cell D1 shows calculated result (e.g., "30" if A1=10, B1=20)
     - Formula bar shows the formula when D1 is selected
     - Selection moves to D2
   - **State**:
     - `D1.formula = "=A1+B1"`, `D1.value = 30`
     - `Mode = Ready`
     - FormulaEngine calculated result in worker

**Key Behavior**: Formulas start with "=", and the result is displayed in the cell

---

## 6. Point Mode Formula Building

**Goal**: User builds a formula by clicking cells with the mouse/arrow keys

### Step-by-Step Flow

1. **User clicks cell E1**
   - **Visual**: Selection on E1
   - **State**: `activeCell = E1`, `Mode = Ready`

2. **User types "="**
   - **Visual**:
     - Formula bar shows "="
     - Cell shows "="
   - **State**: `Mode = Point` (activated by formula trigger)

3. **User clicks cell A1**
   - **Visual**:
     - Formula bar shows "=A1"
     - Cell E1 shows "=A1"
     - A1 gets a temporary highlight/border indicating it's referenced
   - **State**: Mode still `Point`, reference "A1" added to formula

4. **User types "+"**
   - **Visual**: Formula bar shows "=A1+"
   - **State**: Still `Mode = Point`, operator locks previous reference

5. **User presses Arrow Right (→)**
   - **Visual**:
     - Formula bar shows "=A1+B1" (reference updated from click position)
     - B1 gets reference highlight
   - **State**: `Mode = Point`, arrow key updated reference (didn't move selection)

6. **User presses Enter**
   - **Visual**:
     - E1 shows calculated result
     - Selection moves to E2
   - **State**:
     - `E1.formula = "=A1+B1"`, result calculated
     - `Mode = Ready`

**Key Behavior**: In PointMode, arrow keys and clicks update formula references (not grid navigation)

---

## 7. Range Selection and SUM Formula

**Goal**: User creates a SUM formula with a range

### Step-by-Step Flow

1. **User clicks cell A10**
   - **State**: `activeCell = A10`, `Mode = Ready`

2. **User types "=SUM("**
   - **Visual**: Formula bar shows "=SUM(", cell shows "=SUM("
   - **State**: `Mode = Point`

3. **User clicks A1 and drags to A9 (or clicks A1, Shift+clicks A9)**
   - **Visual**:
     - Range A1:A9 gets selection highlight
     - Formula bar shows "=SUM(A1:A9"
   - **State**: Range reference added to formula

4. **User types ")"**
   - **Visual**: Formula bar shows "=SUM(A1:A9)"
   - **State**: Function call completed

5. **User presses Enter**
   - **Visual**: A10 shows sum of A1:A9 (e.g., "450")
   - **State**: Formula saved, result calculated, `Mode = Ready`

**Key Behavior**: Ranges are created by drag-selecting or Shift+clicking

---

## 8. Copy and Paste

**Goal**: User copies a cell and pastes to another location

### Step-by-Step Flow

1. **User clicks cell B2 (contains "100")**
   - **State**: `activeCell = B2`, `Mode = Ready`

2. **User presses Cmd+C (or Ctrl+C)**
   - **Visual**:
     - B2 gets a dashed "marching ants" border indicating copied
     - Status bar might show "Copied"
   - **State**: `ClipboardManager` stores B2 content

3. **User clicks cell D5**
   - **Visual**: Selection moves to D5
   - **State**: `activeCell = D5`

4. **User presses Cmd+V (or Ctrl+V)**
   - **Visual**:
     - D5 now shows "100"
     - Marching ants border disappears from B2
   - **State**:
     - `D5 = "100"` (value copied)
     - Clipboard cleared
     - Command added to history (undo-able)

**Key Behavior**: Copy stores content, paste inserts at active cell

---

## 9. Undo/Redo

**Goal**: User makes a mistake and wants to undo it

### Step-by-Step Flow

1. **User has cell A1 = "10", changes it to "20"**
   - **State**: `A1 = "20"`, UpdateCellsCommand in history stack

2. **User presses Cmd+Z (Undo)**
   - **Visual**: A1 reverts to showing "10"
   - **State**:
     - Command.undo() executed: `A1 = "10"`
     - Command moved to redo stack

3. **User presses Cmd+Y (Redo)**
   - **Visual**: A1 shows "20" again
   - **State**:
     - Command.execute() called again: `A1 = "20"`
     - Command back in undo stack

**Key Behavior**: Undo/redo work through command history, up to 100 commands

---

## 10. Delete Cell Content

**Goal**: User clears cell content

### Step-by-Step Flow

1. **User clicks cell C3 (contains "Hello")**
   - **State**: `activeCell = C3`, `Mode = Ready`

2. **User presses Delete (or Backspace)**
   - **Visual**:
     - Cell C3 becomes empty
     - Formula bar shows empty
   - **State**:
     - `C3 = ""` (empty string)
     - UpdateCellsCommand in history (undo-able)
     - `Mode = Ready` (stays in Ready, doesn't enter Edit)

**Key Behavior**: Delete/Backspace in ReadyMode clears cell content immediately

---

## 11. Range Selection with Shift+Click

**Goal**: User selects a range of cells for copying or formatting

### Step-by-Step Flow

1. **User clicks cell B2**
   - **Visual**: Selection border on B2
   - **State**: `activeCell = B2`, `SelectionManager.ranges = []`

2. **User holds Shift and clicks cell D5**
   - **Visual**:
     - Range B2:D5 is highlighted with blue background
     - B2 remains the active cell (darker border)
   - **State**:
     - `activeCell = B2` (anchor)
     - `SelectionManager.ranges = [{start: B2, end: D5}]`

3. **User presses Cmd+C to copy**
   - **Visual**: Marching ants border around B2:D5
   - **State**: ClipboardManager stores entire range

4. **User clicks F10, presses Cmd+V**
   - **Visual**: Range B2:D5 content appears starting at F10 (F10:H13)
   - **State**: Paste command executed, values copied to new location

**Key Behavior**: Shift+Click creates ranges, operations apply to entire range

---

## 12. Jump to Edge of Data

**Goal**: User navigates quickly to edge of data region

### Step-by-Step Flow

1. **User has data in A1:A100, is at A1**
   - **State**: `activeCell = A1`

2. **User presses Cmd+Down (Ctrl+Down on Windows)**
   - **Visual**: Selection jumps to A100 (last filled cell in column)
   - **State**:
     - `activeCell = A100`
     - `SelectionManager` detected edge using `findEdge()` algorithm

3. **User presses Cmd+Down again**
   - **Visual**: Selection jumps to last row (e.g., A1000 if that's the limit)
   - **State**: `activeCell` at edge of spreadsheet

**Key Behavior**: Cmd+Arrow jumps to data edges, useful for large datasets

---

## 13. Extend Selection to Edge

**Goal**: User selects from current cell to edge of data

### Step-by-Step Flow

1. **User is at A1 (data in A1:A50)**
   - **State**: `activeCell = A1`

2. **User presses Cmd+Shift+Down**
   - **Visual**: Range A1:A50 is selected (highlighted)
   - **State**:
     - `activeCell = A1` (anchor)
     - `ranges = [{start: A1, end: A50}]`

**Key Behavior**: Cmd+Shift+Arrow extends selection to data edge

---

## 14. Cancel Edit with Escape

**Goal**: User starts editing but wants to discard changes

### Step-by-Step Flow

1. **User clicks cell A1 (contains "Original")**
   - **State**: `activeCell = A1`, `Mode = Ready`

2. **User presses F2 to edit**
   - **Visual**: Editor appears with "Original"
   - **State**: `Mode = Edit`

3. **User types " MODIFIED"**
   - **Visual**: Cell shows "Original MODIFIED"
   - **State**: Editor content = "Original MODIFIED" (not yet saved)

4. **User presses Escape**
   - **Visual**:
     - Cell reverts to showing "Original"
     - Editor disappears
   - **State**:
     - `Mode = Ready`
     - `A1 = "Original"` (unchanged)
     - No command added to history

**Key Behavior**: Escape cancels edit and discards changes

---

## 15. Double-Click to Edit

**Goal**: User double-clicks a cell to edit it

### Step-by-Step Flow

1. **User double-clicks cell B3 (contains "Test")**
   - **Visual**:
     - Editor appears in cell with "Test"
     - Text cursor at end of "Test"
   - **State**: `Mode = Edit`, `activeCell = B3`

2. **User edits and presses Enter**
   - **Visual**: Edit commits, selection moves down
   - **State**: `Mode = Ready`

**Key Behavior**: Double-click is shortcut to enter EditMode

---

## Summary of Key Workflows

| Workflow | Mode Involved | Key Shortcut | Result |
|----------|---------------|--------------|--------|
| Quick entry (horizontal) | Enter | Type + Tab | Commits and moves right |
| Quick entry (vertical) | Enter | Type + Enter | Commits and moves down |
| Arrow commits | Enter | Type + Arrow | Commits and moves in arrow direction |
| Fine-tuned editing | Edit | F2, then edit | Text cursor control |
| Formula typing | Point → Edit | Type "=..." | Create formula by typing |
| Formula pointing | Point | "=" + Click/Arrow | Build formula with clicks |
| Copy/Paste | Ready | Cmd+C, Cmd+V | Duplicate content |
| Undo/Redo | Ready | Cmd+Z, Cmd+Y | Revert/reapply changes |
| Delete content | Ready | Delete/Backspace | Clear cell |
| Range selection | Ready | Shift+Click | Select multiple cells |
| Jump to edge | Ready | Cmd+Arrow | Navigate to data boundary |
| Extend to edge | Ready | Cmd+Shift+Arrow | Select to data boundary |
| Cancel edit | Edit/Enter | Escape | Discard changes |
| Double-click edit | Edit | Double-click | Enter edit mode |

---

## Workflow Patterns

### Commit and Move Pattern
EnterMode enables fast data entry by combining commit + move into one keystroke:
- Arrow keys: Commit current cell, move in arrow direction
- Tab: Commit and move right
- Enter: Commit and move down

### Edit Mode Pattern
EditMode provides fine-grained control:
- Arrow keys move text cursor (not grid selection)
- Home/End work within text
- Enter/Escape exits mode

### Point Mode Pattern
PointMode enables visual formula building:
- Arrow keys update formula reference
- Click updates/appends reference depending on context
- Operators lock previous reference, enable next reference

---

## Next Steps

For detailed mode-specific behaviors and edge cases, see:
- `02-mode-behaviors.md` - Comprehensive mode behavior matrices
- `03-keyboard-shortcuts.md` - Complete shortcut reference
- `04-advanced-scenarios.md` - Complex multi-step workflows
