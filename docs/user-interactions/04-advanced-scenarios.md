# Advanced Interaction Scenarios

This document covers complex, multi-step workflows that involve multiple mode transitions and demonstrate the power of v-sheet's FSM architecture.

---

## Scenario 1: Building Complex Formula with Point and Edit Modes

**User Goal**: Create formula `=SUM(A1:A10) + B1 * 2`

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State | Mode |
|------|-------------|-----------------|--------------|------|
| 1 | Click cell C1 | Selection on C1 | `activeCell = C1` | Ready |
| 2 | Type "=" | Cell and formula bar show "=" | Editor activates | **→ Point** |
| 3 | Type "SUM(" | Shows "=SUM(" | Typing letters | **→ Edit** |
| 4 | Click A1 | Shows "=SUM(A1" | Reference inserted | **→ Point** |
| 5 | Type ":" | Shows "=SUM(A1:" | Range operator | Stay Point |
| 6 | Click A10 | Shows "=SUM(A1:A10" | Range completed | Stay Point |
| 7 | Type ")" | Shows "=SUM(A1:A10)" | Function closed | **→ Edit** |
| 8 | Type "+" | Shows "=SUM(A1:A10)+" | Operator after function | Stay Edit |
| 9 | Click B1 | Shows "=SUM(A1:A10)+B1" | Reference inserted | **→ Point** |
| 10 | Type "*2" | Shows "=SUM(A1:A10)+B1*2" | Typing number | **→ Edit** |
| 11 | Press Enter | C1 shows calculated result (e.g., "57") | Formula saved, worker calculates | **→ Ready** |

### Mode Transitions

```
Ready → Point (type "=")
  → Edit (type "SUM(")
  → Point (click A1)
  → Edit (type ")")
  → Point (click B1)
  → Edit (type "*2")
  → Ready (press Enter)
```

### What This Tests
- Mode transitions between Point and Edit
- Mixed mouse and keyboard formula building
- Function syntax with ranges
- Operator precedence
- Formula calculation in worker

---

## Scenario 2: Point Mode with Range Extension

**User Goal**: Create `=SUM(A1:A50)` using keyboard, where A50 is at the data edge

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State | Mode |
|------|-------------|-----------------|--------------|------|
| 1 | Click cell B1 | Selection on B1 | `activeCell = B1` | Ready |
| 2 | Type "=" | Formula bar shows "=" | Editor activates | **→ Point** |
| 3 | Click A1 | Formula shows "=A1", A1 highlighted | Reference inserted | Stay Point |
| 4 | Press Cmd+Shift+Down | Formula shows "=A1:A50", range A1:A50 highlighted | Range extended to data edge | Stay Point |
| 5 | Left arrow, Type "SUM(" | Formula shows "=SUM(A1:A50" | Cursor moved, function wrapper added | **→ Edit** |
| 6 | Type ")" | Formula shows "=SUM(A1:A50)" | Function closed | Stay Edit |
| 7 | Press Enter | B1 shows sum result | Formula calculated | **→ Ready** |

### Key Behaviors
- **Cmd+Shift+Arrow in PointMode**: Creates range reference to data edge
- **Cursor movement in Edit**: Can wrap reference with function after creating it
- **Range highlighting**: Visual feedback shows what's included in formula

---

## Scenario 3: Rapid Horizontal Data Entry with Arrow Commits

**User Goal**: Enter "Jan", "Feb", "Mar", "Apr" across B2:E2 quickly

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State | Mode |
|------|-------------|-----------------|--------------|------|
| 1 | Click B2 | Selection on B2 | `activeCell = B2` | Ready |
| 2 | Type "Jan" | Cell shows "Jan" | Editor content = "Jan" | **→ Enter** |
| 3 | Press → | "Jan" commits to B2, selection moves to C2 | `B2 = "Jan"`, `activeCell = C2` | **→ Ready** |
| 4 | Type "Feb" | Cell shows "Feb" | Editor content = "Feb" | **→ Enter** |
| 5 | Press → | "Feb" commits to C2, selection moves to D2 | `C2 = "Feb"`, `activeCell = D2` | **→ Ready** |
| 6 | Type "Mar" | Cell shows "Mar" | Editor content = "Mar" | **→ Enter** |
| 7 | Press → | "Mar" commits to D2, selection moves to E2 | `D2 = "Mar"`, `activeCell = E2` | **→ Ready** |
| 8 | Type "Apr" | Cell shows "Apr" | Editor content = "Apr" | **→ Enter** |
| 9 | Press Enter | "Apr" commits to E2, selection moves to E3 | `E2 = "Apr"`, `activeCell = E3` | **→ Ready** |

### Total Keystrokes
- **Traditional** (using Tab): Type + Tab = 2 actions per cell × 4 = 8 key actions + 12 character keys = 20 total
- **EnterMode** (using Arrow): Type + Arrow = same, but arrow is more ergonomic and directional

### Key Benefit
Arrow keys provide **directional data entry** - can go up, down, left, or right after each entry without changing keystroke.

---

## Scenario 4: Edit Existing Formula with F2

**User Goal**: Change `=A1+B1` to `=A1+B1+C1`

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State | Mode |
|------|-------------|-----------------|--------------|------|
| 1 | Click cell with formula `=A1+B1` | Cell shows result (e.g., "30"), formula bar shows `=A1+B1` | `activeCell` set | Ready |
| 2 | Press F2 | Editor appears with `=A1+B1`, cursor at end | Editor activates | **→ Edit** |
| 3 | Type "+C1" | Editor shows `=A1+B1+C1` | Content updated | Stay Edit |
| 4 | Press Enter | Cell shows new result (e.g., "45") | Formula recalculated | **→ Ready** |

### Alternative: Using PointMode

| Step | User Action | Visual Feedback | System State | Mode |
|------|-------------|-----------------|--------------|------|
| 1 | Click cell with formula `=A1+B1` | Same as above | Same | Ready |
| 2 | Press F2 | Editor with `=A1+B1|`, cursor at end | Editor activates | **→ Edit** |
| 3 | Type "+" | Shows `=A1+B1+` | Operator added | **→ Point** (if at end of ref) |
| 4 | Click C1 | Shows `=A1+B1+C1`, C1 highlighted | Reference inserted | Stay Point |
| 5 | Press Enter | Cell shows result | Formula saved | **→ Ready** |

### Comparison
- **Edit method**: Manual typing, fast if you know the reference
- **Point method**: Visual selection, better for unfamiliar data layout

---

## Scenario 5: Copy Formula with Relative References

**User Goal**: Copy `=A1+B1` from C1 to C2, expecting it to adjust to `=A2+B2`

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State | Mode |
|------|-------------|-----------------|--------------|------|
| 1 | Click C1 (contains `=A1+B1`) | Selection on C1, shows result | `activeCell = C1` | Ready |
| 2 | Press Cmd+C | Marching ants border on C1 | Clipboard stores formula | Stay Ready |
| 3 | Click C2 | Selection moves to C2 | `activeCell = C2` | Stay Ready |
| 4 | Press Cmd+V | C2 shows result of `=A2+B2` (references adjusted) | Formula pasted with updated refs | Stay Ready |
| 5 | Click C2, check formula bar | Formula bar shows `=A2+B2` | Relative references adjusted | Stay Ready |

### Reference Adjustment Logic
When pasting formulas:
- **Relative references** (e.g., `A1`) adjust based on paste offset
- Copy from C1 to C2 = 1 row down → `A1` becomes `A2`, `B1` becomes `B2`
- **Future**: Absolute references (e.g., `$A$1`) would stay fixed (Epic 7)

---

## Scenario 6: Undo Multi-Step Formula Entry

**User Goal**: User builds complex formula but makes mistake, wants to undo

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State | Mode |
|------|-------------|-----------------|--------------|------|
| 1 | Type `=A1+B1`, press Enter | Formula commits, result shown | Command in history stack | Ready |
| 2 | Realize mistake (should be `*` not `+`) | - | - | Ready |
| 3 | Press Cmd+Z | Cell reverts to previous value (empty or old value) | Undo command executed | Stay Ready |
| 4 | Type `=A1*B1`, press Enter | New formula commits | New command in stack | Ready |

### History Stack
```
Before Undo:
  Stack: [UpdateCells: C1 = "=A1+B1"]

After Undo:
  Stack: []
  Redo Stack: [UpdateCells: C1 = "=A1+B1"]

After New Entry:
  Stack: [UpdateCells: C1 = "=A1*B1"]
  Redo Stack: [] (cleared)
```

### Key Behavior
- Undo reverts the entire formula entry as one atomic command
- New edit clears redo stack (can't redo after new action)

---

## Scenario 7: Range Selection with Shift+Click for SUM

**User Goal**: Create `=SUM(A1:A100)` using mouse selection

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State | Mode |
|------|-------------|-----------------|--------------|------|
| 1 | Click A101 | Selection on A101 | `activeCell = A101` | Ready |
| 2 | Type "=SUM(" | Formula bar shows "=SUM(" | Editor activates | **→ Point** |
| 3 | Click A1 | Formula shows "=SUM(A1", A1 highlighted | First reference | Stay Point |
| 4 | Shift+Click A100 | Formula shows "=SUM(A1:A100", range highlighted | Range created | Stay Point |
| 5 | Type ")" | Formula shows "=SUM(A1:A100)" | Function closed | **→ Edit** |
| 6 | Press Enter | A101 shows sum result | Formula calculated | **→ Ready** |

### Alternative: Drag Selection

| Step 3-4 | Alternative Action | Result |
|----------|-------------------|--------|
| 3 | Click A1 and drag to A100 | Formula shows "=SUM(A1:A100" |

Both methods create the same range reference.

---

## Scenario 8: Cancel Mid-Formula with Escape

**User Goal**: User starts building formula, changes mind, wants to abandon

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State | Mode |
|------|-------------|-----------------|--------------|------|
| 1 | Click C1 (empty) | Selection on C1 | `activeCell = C1` | Ready |
| 2 | Type "=A1+" | Formula bar shows "=A1+" | Editor active | Point |
| 3 | Click B1 | Formula shows "=A1+B1" | Reference added | Stay Point |
| 4 | User realizes this is wrong cell | - | - | Stay Point |
| 5 | Press Escape | C1 remains empty, formula bar clears | Editor deactivates, no save | **→ Ready** |
| 6 | Click correct cell D1 | Selection on D1 | Can start over | Ready |

### Key Behavior
- **Escape** in any editing mode (Enter, Edit, Point) **discards changes**
- No command added to history
- Cell reverts to original state (empty or previous value)

---

## Scenario 9: Mixed Mode Data Entry (Numbers and Formulas)

**User Goal**: Enter budget data with formulas

| Cell | Desired Content | Mode Path |
|------|-----------------|-----------|
| A1 | "Revenue" | Enter → Ready |
| A2 | "Expenses" | Enter → Ready |
| A3 | "Profit" | Enter → Ready |
| B1 | 10000 | Enter → Ready |
| B2 | 7500 | Enter → Ready |
| B3 | `=B1-B2` | Point → Ready |

### Step-by-Step Flow

| Step | User Action | Mode Transitions | Result |
|------|-------------|------------------|--------|
| 1 | Click A1, type "Revenue", press ↓ | Ready → Enter → Ready | A1 = "Revenue", now at A2 |
| 2 | Type "Expenses", press ↓ | Ready → Enter → Ready | A2 = "Expenses", now at A3 |
| 3 | Type "Profit", press Tab | Ready → Enter → Ready | A3 = "Profit", now at B3 |
| 4 | Press ↑ twice | Ready (navigation) | Now at B1 |
| 5 | Type "10000", press ↓ | Ready → Enter → Ready | B1 = 10000, now at B2 |
| 6 | Type "7500", press ↓ | Ready → Enter → Ready | B2 = 7500, now at B3 |
| 7 | Type "=", click B1 | Ready → Point | Formula shows "=B1" |
| 8 | Type "-", click B2 | Stay Point | Formula shows "=B1-B2" |
| 9 | Press Enter | Point → Ready | B3 shows "2500" (calculated) |

**Total time**: ~30 seconds for experienced user, demonstrating fast data entry

---

## Scenario 10: Extending Formula Down After Entry

**User Goal**: Enter `=A1*2` in B1, then copy down to B10

### Method 1: Copy-Paste

| Step | User Action | Result |
|------|-------------|--------|
| 1 | Enter `=A1*2` in B1, press Enter | B1 has formula |
| 2 | Click B1 | Select B1 |
| 3 | Cmd+C | Copy |
| 4 | Click B2, Shift+Click B10 | Select range B2:B10 |
| 5 | Cmd+V | Formulas pasted: B2=`=A2*2`, B3=`=A3*2`, etc. |

### Method 2: Fill Down (Future Feature)

| Step | User Action | Result |
|------|-------------|--------|
| 1 | Select B1:B10 | Range selected |
| 2 | Press Cmd+D | Fills formula down (not yet implemented) |

---

## Scenario 11: Circular Reference Detection

**User Goal**: Accidentally create circular reference, system prevents infinite loop

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State |
|------|-------------|-----------------|--------------|
| 1 | A1 contains `=B1+10` | A1 shows result | Dependency: A1 → B1 |
| 2 | Click B1, type `=A1*2` | Formula bar shows `=A1*2` | Typing formula |
| 3 | Press Enter | B1 shows `#CIRCULAR!` error | FormulaEngine detects cycle |
| 4 | A1 also shows `#CIRCULAR!` | Both cells in error state | Dependency graph marks cycle |

### Dependency Graph

```
Before:
  A1 → B1 (A1 depends on B1)

After B1 = `=A1*2`:
  A1 → B1
  B1 → A1  ← CIRCULAR!
```

### Resolution

User must break the cycle:
- Delete B1 formula, or
- Change B1 to reference different cell

---

## Scenario 12: Jump to Edge in Large Dataset

**User Goal**: Navigate quickly in dataset with 1000 rows

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State |
|------|-------------|-----------------|--------------|
| 1 | User at A1 | Selection on A1 | `activeCell = A1` |
| 2 | Data in A1:A1000 (continuous) | - | - |
| 3 | Press Cmd+Down | Selection jumps to A1000 | `activeCell = A1000` |
| 4 | Press Cmd+Down again | Selection jumps to last row (e.g., A10000 if that's limit) | At edge of sheet |
| 5 | Press Cmd+Up | Selection jumps to A1000 (last filled cell) | Back to data edge |
| 6 | Press Cmd+Home | Selection jumps to A1 | `activeCell = A1` |

### Edge Detection Algorithm

```
From A1, Cmd+Down:
  → Scan downward until empty cell found
  → Jump to last filled cell (A1000)

From A1000 (edge of data), Cmd+Down:
  → Already at data edge
  → Jump to sheet boundary (e.g., A10000)
```

---

## Scenario 13: Multi-Cell Delete with Range Selection

**User Goal**: Clear multiple cells at once

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State |
|------|-------------|-----------------|--------------|
| 1 | Click A1 | Selection on A1 | - |
| 2 | Cmd+Shift+Down | Range A1:A50 selected (to data edge) | `ranges = [{start: A1, end: A50}]` |
| 3 | Press Delete | All cells in A1:A50 clear | UpdateCellsCommand with 50 cells |
| 4 | Press Cmd+Z | All cells restore previous values | Undo command executed |

### Command Pattern
- Single UpdateCellsCommand contains all 50 cell changes
- Undo restores all 50 cells in one operation
- Efficient for bulk operations

---

## Scenario 14: Formula Error Handling

**User Goal**: Enter invalid formula, see error, fix it

### Step-by-Step Flow

| Step | User Action | Visual Feedback | System State |
|------|-------------|-----------------|--------------|
| 1 | Type `=A1/0` in B1, press Enter | B1 shows `#DIV/0!` | Division by zero error |
| 2 | Type `=SUM(Z999999)` in C1, press Enter | C1 shows `#REF!` | Invalid reference error |
| 3 | Type `=A1+` in D1, press Enter | D1 shows `#ERROR!` | Syntax error (incomplete formula) |
| 4 | Click B1, press F2 | Editor shows `=A1/0` | Edit mode |
| 5 | Change to `=A1/2`, press Enter | B1 shows correct result | Error resolved |

### Error Types
- `#DIV/0!` - Division by zero
- `#REF!` - Invalid cell reference
- `#VALUE!` - Type error (e.g., `=A1+` "text")
- `#ERROR!` - General syntax or evaluation error
- `#CIRCULAR!` - Circular dependency

---

## Scenario 15: Cross-Navigation During Formula Entry

**User Goal**: While building formula, navigate grid to check values

### Traditional Problem
In many spreadsheets, pressing arrow keys while editing moves the grid selection, losing your formula.

### v-sheet Solution: Mode System

| Step | User Action | Visual Feedback | Mode | Behavior |
|------|-------------|-----------------|------|----------|
| 1 | Type `=A1+` | Formula bar shows `=A1+` | **Point** | Arrow keys update reference |
| 2 | Need to check what's in D5 | - | Point | - |
| 3 | Press F2 | Editor switches to text mode | **Edit** | Arrow keys now move cursor |
| 4 | Press Escape | Formula preserved, back to grid nav | **Ready** | Can navigate freely |
| 5 | Navigate to D5, check value | See value | Ready | Grid navigation |
| 6 | Navigate back to original cell | - | Ready | - |
| 7 | Press F2 | Editor shows `=A1+` | **Edit** | Can continue editing |
| 8 | Type "B1", press Enter | Formula completes | Ready | Formula saved |

**Key Insight**: Mode system allows switching between formula building, text editing, and grid navigation without losing work.

---

## Summary of Advanced Patterns

### Pattern 1: Point ↔ Edit Switching
Complex formulas often require switching:
- **Point mode**: Click/arrow to insert references
- **Edit mode**: Type function names, constants, operators manually
- **F2**: Toggle between modes

### Pattern 2: Arrow Commit in EnterMode
Fast data entry by using arrows instead of Tab/Enter:
- Type value
- Press arrow in any direction
- Value commits AND selection moves
- Immediately ready for next entry

### Pattern 3: Range Creation Methods
Three ways to create ranges:
1. **Shift+Click**: Click start, Shift+Click end
2. **Shift+Arrow**: Click start, Shift+Arrow to extend
3. **Cmd+Shift+Arrow**: Extend to data edge
4. **Drag**: Click and drag (traditional)

### Pattern 4: Escape for Safe Abandonment
At any point in editing:
- Press Escape
- Changes discarded
- No command in history
- Returns to ReadyMode

### Pattern 5: Undo/Redo for Experimentation
Try different formulas without fear:
- Enter formula
- See result
- Press Cmd+Z if wrong
- Try different approach

---

## See Also

- **01-core-workflows.md** - Basic workflows
- **02-mode-behaviors.md** - Mode-specific behaviors
- **03-keyboard-shortcuts.md** - Complete shortcut reference
- **/docs/test-scenarios/** - Test cases for these scenarios
