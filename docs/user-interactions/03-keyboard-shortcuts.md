# Keyboard Shortcuts Reference

Complete keyboard shortcut reference for v-sheet, organized by mode and function.

**Platform Note**: This document uses `Cmd` for macOS. On Windows/Linux, use `Ctrl` instead.

---

## Global Shortcuts (Available in All Modes)

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Cmd+Z** | Undo | Reverts the last command (up to 100 commands) |
| **Cmd+Y** or **Cmd+Shift+Z** | Redo | Re-applies the last undone command |
| **Escape** | Cancel/Exit | Exits current mode, discards edit, returns to ReadyMode |

---

## ReadyMode Shortcuts

ReadyMode is the default navigation state when no editing is occurring.

### Navigation

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Arrow Keys** (↑ ↓ ← →) | Move Selection | Moves selection one cell in arrow direction |
| **Tab** | Move Right | Moves selection one cell to the right |
| **Shift+Tab** | Move Left | Moves selection one cell to the left |
| **Enter** | Move Down or Edit | Moves down if empty, enters EditMode if filled |
| **Cmd+Arrow** | Jump to Edge | Jumps to edge of data region in arrow direction |
| **Cmd+Home** | Jump to A1 | Moves selection to cell A1 |
| **Cmd+End** | Jump to Last Cell | Moves to the last cell with data |

### Selection

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Shift+Arrow** | Extend Selection | Extends selection one cell in arrow direction |
| **Shift+Click** | Range Select | Selects range from active cell to clicked cell |
| **Cmd+Shift+Arrow** | Extend to Edge | Extends selection to edge of data region |
| **Cmd+Shift+Home** | Select to A1 | Selects range from active cell to A1 |
| **Cmd+Shift+End** | Select to Last Cell | Selects range from active cell to last cell |
| **Cmd+A** | Select All | Selects entire spreadsheet |
| **Click Column Header** | Select Column | Selects entire column |
| **Click Row Header** | Select Row | Selects entire row |

### Clipboard

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Cmd+C** | Copy | Copies selected cell(s) to clipboard |
| **Cmd+X** | Cut | Cuts selected cell(s) to clipboard |
| **Cmd+V** | Paste | Pastes clipboard content at active cell |

### Cell Operations

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Delete** or **Backspace** | Clear Cell | Immediately clears selected cell(s) content |
| **F2** | Edit Cell | Enters EditMode with current cell content |
| **Double-Click** | Edit Cell | Same as F2 - enters EditMode |
| **Type =, +, -** | Start Formula | Enters PointMode for formula building |
| **Type any character** | Start Entry | Enters EnterMode for quick data entry |

### Formatting

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Cmd+B** | Toggle Bold | Toggles bold formatting on selected cells |
| **Cmd+I** | Toggle Italic | Toggles italic formatting on selected cells |

---

## EnterMode Shortcuts

EnterMode activates when you start typing a regular character. Optimized for fast data entry.

### Data Entry

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Type characters** | Append Text | Adds characters to cell content |
| **Backspace** | Delete Previous Char | Removes character before cursor |
| **Delete** | Delete Next Char | Removes character after cursor |

### Commit and Move

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Tab** | Commit and Move Right | Saves value and moves selection right |
| **Shift+Tab** | Commit and Move Left | Saves value and moves selection left |
| **Enter** | Commit and Move Down | Saves value and moves selection down |
| **Arrow Keys** | Commit and Move | Saves value THEN moves in arrow direction |
| **Cmd+Arrow** | Commit and Jump | Saves value THEN jumps to edge |
| **Shift+Arrow** | Commit and Extend | Saves value THEN extends selection |

### Mode Transitions

| Shortcut | Action | Description |
|----------|--------|-------------|
| **F2** | Switch to EditMode | Enables fine-tuned text editing with cursor control |
| **Escape** | Cancel Entry | Discards changes, returns to ReadyMode |

**Key Feature**: Arrow keys commit the current value AND move - enabling rapid data entry without reaching for Tab/Enter.

---

## EditMode Shortcuts

EditMode provides fine-grained text editing control. Activates via F2, double-click, or Enter on filled cell.

### Text Editing

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Type characters** | Insert Text | Inserts characters at cursor position |
| **Backspace** | Delete Previous Char | Removes character before cursor |
| **Delete** | Delete Next Char | Removes character after cursor |
| **Cmd+A** | Select All Text | Selects all text in the editor |
| **Cmd+C** | Copy Text | Copies selected text within editor |
| **Cmd+X** | Cut Text | Cuts selected text within editor |
| **Cmd+V** | Paste Text | Pastes text at cursor position |

### Cursor Movement

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Arrow Left** ← | Move Cursor Left | Moves text cursor one character left |
| **Arrow Right** → | Move Cursor Right | Moves text cursor one character right |
| **Arrow Up** ↑ | Move to Start | Moves cursor to start of text (single line) |
| **Arrow Down** ↓ | Move to End | Moves cursor to end of text (single line) |
| **Home** | Jump to Start | Moves cursor to beginning of text |
| **End** | Jump to End | Moves cursor to end of text |
| **Cmd+Left** | Jump to Start | Same as Home |
| **Cmd+Right** | Jump to End | Same as End |

### Selection in Editor

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Shift+Arrow** | Select Text | Extends text selection in arrow direction |
| **Shift+Home** | Select to Start | Selects from cursor to start |
| **Shift+End** | Select to End | Selects from cursor to end |
| **Cmd+Shift+Left** | Select to Start | Same as Shift+Home |
| **Cmd+Shift+Right** | Select to End | Same as Shift+End |

### Commit and Exit

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Enter** | Commit and Move Down | Saves changes and moves selection down |
| **Tab** | Commit and Move Right | Saves changes and moves selection right |
| **Shift+Tab** | Commit and Move Left | Saves changes and moves selection left |
| **Escape** | Cancel Edit | Discards changes, returns to ReadyMode |

### Formula Editing

| Shortcut | Action | Description |
|----------|--------|-------------|
| **F4** | Toggle Absolute Reference | Cycles reference format at cursor (A1 → $A$1 → A$1 → $A1) |

**Key Feature**: Arrow keys move the **text cursor**, not cell selection. This enables precise editing control.

---

## PointMode Shortcuts

PointMode activates when you start a formula (type `=`, `+`, or `-`). Enables visual formula building.

### Reference Building

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Arrow Keys** | Update Reference | Updates formula reference in arrow direction |
| **Click Cell** | Insert/Update Ref | Inserts or updates cell reference in formula |
| **Cmd+Arrow** | Reference Edge | Updates reference to edge of data region |
| **Shift+Arrow** | Create Range | Creates or extends range reference (e.g., A1:A10) |
| **Cmd+Shift+Arrow** | Range to Edge | Creates range to edge of data |
| **Shift+Click** | Range Select | Creates range from last reference to clicked cell |
| **Drag Selection** | Create Range | Creates range reference by dragging |
| **F4** | Toggle Absolute Reference | Cycles reference format (A1 → $A$1 → A$1 → $A1) |

### Formula Editing

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Type operators** (+, -, *, /, etc.) | Add Operator | Locks current reference, prepares for next |
| **Type ":"** | Range Operator | Starts range definition (e.g., A1:) |
| **Type letters/numbers** | Switch to EditMode | Manually type formula (function names, constants) |
| **Backspace** | Delete Character | Removes last character from formula |
| **Delete** | Delete Character | Same as Backspace |

### Mode Transitions

| Shortcut | Action | Description |
|----------|--------|-------------|
| **F2** | Switch to EditMode | Enables manual formula editing with cursor |
| **Enter** | Commit Formula | Calculates result, saves formula, returns to ReadyMode |
| **Tab** | Commit and Move Right | Commits formula and moves selection right |
| **Escape** | Cancel Formula | Discards formula, returns to ReadyMode |

**Key Feature**: Arrow keys and clicks update the **formula reference**, not cell selection. This enables point-and-click formula building.

### PointMode Reference Logic

**Scenario A: Replace Reference**
- Formula: `=A1`
- Press Arrow Right → `=B1` (A1 replaced)

**Scenario B: Append Reference**
- Formula: `=A1+`
- Press Arrow Right → `=A1+B1` (B1 appended)

**Scenario C: Range Creation**
- Formula: `=`
- Click A1 → `=A1`
- Press Shift+Arrow Down (5 times) → `=A1:A6`

---

## Mode-Specific Shortcut Summary

### Arrow Keys Behavior by Mode

| Mode | Arrow Key Behavior | Example |
|------|-------------------|---------|
| **Ready** | Moves cell selection | A1 → (Press →) → B1 selected |
| **Enter** | **Commits THEN moves** | Type "100" → (Press →) → "100" saved, B1 selected |
| **Edit** | Moves text cursor | Editing "Hello" → (Press →) → Cursor moves in text |
| **Point** | Updates formula reference | `=A1` → (Press →) → `=B1` |

### Enter Key Behavior by Mode

| Mode | Enter Key Behavior | Example |
|------|-------------------|---------|
| **Ready** (empty cell) | Enters EnterMode | Cell is empty → (Press Enter) → Editor activates |
| **Ready** (filled cell) | Enters EditMode | Cell has "Test" → (Press Enter) → Editor shows "Test" |
| **Enter** | Commits and moves down | Type "100" → (Press Enter) → Saved, moved to cell below |
| **Edit** | Commits and moves down | Editing → (Press Enter) → Saved, moved down |
| **Point** | Commits formula | `=A1+B1` → (Press Enter) → Formula calculated and saved |

### Tab Key Behavior by Mode

| Mode | Tab Key Behavior | Example |
|------|-------------------|---------|
| **Ready** | Moves selection right | A1 → (Press Tab) → B1 selected |
| **Enter** | Commits and moves right | Type "100" → (Press Tab) → Saved, B1 selected |
| **Edit** | Commits and moves right | Editing → (Press Tab) → Saved, moved right |
| **Point** | Commits formula and moves | `=A1` → (Press Tab) → Calculated, moved right |

### Escape Key Behavior (All Modes)

| Mode | Escape Key Behavior |
|------|-------------------|
| **Ready** | No effect |
| **Enter** | Cancel entry, return to Ready |
| **Edit** | Cancel edit, return to Ready |
| **Point** | Cancel formula, return to Ready |

### F2 Key Behavior by Mode

| Mode | F2 Key Behavior |
|------|-------------------|
| **Ready** | Enter EditMode with cell content |
| **Enter** | Switch to EditMode (fine-tuning) |
| **Edit** | No effect (already in Edit) |
| **Point** | Switch to EditMode (manual formula entry) |

---

## Shortcut Patterns

### Fast Data Entry Pattern

For entering data across multiple cells quickly:

**Horizontal Entry**:
```
Type value → Tab → Type value → Tab → ...
```

**Vertical Entry**:
```
Type value → Enter → Type value → Enter → ...
```

**Mixed Direction Entry** (using arrow keys):
```
Type value → Arrow Right → Type value → Arrow Down → Type value → Arrow Left → ...
```

**Why it's fast**: In EnterMode, arrow keys commit AND move in one keystroke.

---

### Formula Building Pattern

**Visual Formula (PointMode)**:
```
Type "=" → Click/Arrow to cells → Type operators → Enter
```

**Manual Formula (EditMode)**:
```
Type "=" → Type "SUM(" → Select range → Type ")" → Enter
```

**Mixed Approach**:
```
Type "=" → Click A1 → Type "+" → Click B1 → Type "*2" → Enter
```

---

### Selection Patterns

**Range Selection for Copy**:
```
Click start cell → Shift+Click end cell → Cmd+C
```

**Select to Data Edge**:
```
Click cell → Cmd+Shift+Arrow → Cmd+C
```

**Select Column/Row**:
```
Click column/row header → Cmd+C
```

---

## Platform Differences

### macOS vs Windows/Linux

| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| Undo | Cmd+Z | Ctrl+Z |
| Redo | Cmd+Y or Cmd+Shift+Z | Ctrl+Y or Ctrl+Shift+Z |
| Copy | Cmd+C | Ctrl+C |
| Paste | Cmd+V | Ctrl+V |
| Cut | Cmd+X | Ctrl+X |
| Jump to Edge | Cmd+Arrow | Ctrl+Arrow |
| Select to Edge | Cmd+Shift+Arrow | Ctrl+Shift+Arrow |
| Jump to Start | Cmd+Home | Ctrl+Home |
| Select All | Cmd+A | Ctrl+A |
| Toggle Bold | Cmd+B | Ctrl+B |
| Toggle Italic | Cmd+I | Ctrl+I |

**Note**: The v-sheet InputController automatically normalizes Cmd (macOS) and Ctrl (Windows/Linux) so the same logic handles both platforms.

---

## Shortcuts Not Yet Implemented

The following are common spreadsheet shortcuts that may be added in future versions:

| Shortcut | Typical Action | Status |
|----------|----------------|--------|
| **Cmd+U** | Underline | Not implemented |
| **Cmd+D** | Fill Down | Not planned |
| **Cmd+R** | Fill Right | Not planned |
| **Cmd+;** | Insert Date | Not planned |
| **Cmd+:** | Insert Time | Not planned |
| **Cmd+K** | Insert Link | Not planned |

---

## Tips and Tricks

### Rapid Data Entry
1. Click first cell
2. Type value
3. Press Tab (moves right) or Enter (moves down)
4. Repeat steps 2-3
5. **Pro tip**: Use arrow keys to move in any direction while entering data

### Formula Building Without Mouse
1. Type `=`
2. Use arrow keys to navigate to first cell
3. Type operator (e.g., `+`)
4. Use arrow keys to navigate to next cell
5. Press Enter to commit

### Selecting Large Ranges
Instead of dragging:
1. Click start cell
2. Press Cmd+Shift+Arrow to select to data edge
3. Or type the range manually: `=SUM(A1:A1000)`

### Editing Part of a Formula
1. Select cell with formula
2. Press F2 (enters EditMode)
3. Use arrow keys to position cursor
4. Make changes
5. Press Enter

### Quickly Clear Multiple Cells
1. Select range (Shift+Click or Cmd+Shift+Arrow)
2. Press Delete
3. All cells in range cleared at once

---

## See Also

- **01-core-workflows.md** - Detailed user workflows
- **02-mode-behaviors.md** - Mode-specific behaviors
- **04-advanced-scenarios.md** - Complex multi-step scenarios
- **/docs/api-reference/intent-vocabulary.md** - Technical intent mapping
