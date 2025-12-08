# Mode Behaviors: User Perspective

This document describes the four modes in v-sheet from the user's perspective. Each mode represents a different interaction context where the same keystrokes produce different behaviors.

---

## Mode Overview

v-sheet uses a **Finite State Machine (FSM)** with four primary modes:

```
        ┌─────────────────────────────────────────────────────────────┐
        │                        ReadyMode                            │
        │  (Default: Navigating, selecting, clipboard operations)     │
        └─────────────────────────────────────────────────────────────┘
         │                    │                    │
    Type '='              Type char            F2/DblClick/Enter
    Type '+'              (regular)            (on filled cell)
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  PointMode   │◄──►│  EnterMode   │◄──►│  EditMode    │
│  (Formula    │ F2 │  (Quick      │ F2 │  (Standard   │
│   building)  │    │   entry)     │    │   editing)   │
└──────────────┘    └──────────────┘    └──────────────┘
```

**Key Principle**: The same keystroke (e.g., Arrow Right) does different things depending on which mode you're in.

---

## ReadyMode (Default Navigation State)

### What the User Experiences

ReadyMode is the **default idle state** when you're navigating the spreadsheet. In this mode:
- **Arrow keys navigate** the grid (move selection)
- **Typing** starts data entry or formula building
- **Clipboard operations** work (Copy/Paste/Cut)
- **Undo/Redo** available
- **Delete/Backspace** clears selected cells

### Behavior Matrix

| User Input | Visual Result | System Action | Mode Transition |
|------------|---------------|---------------|-----------------|
| **Arrow Right** → | Selection border moves one cell right | `SelectionManager.moveSelection('right', false)` | Stay in Ready |
| **Shift + Arrow Right** → | Selection extends one cell right (highlighted range) | `SelectionManager.moveSelection('right', true)` | Stay in Ready |
| **Cmd + Arrow Right** →| Selection jumps to edge of data region | `SelectionManager.jumpToEdge('right', false)` | Stay in Ready |
| **Cmd+Shift+Arrow Right** → | Selection extends to edge of data | `SelectionManager.jumpToEdge('right', true)` | Stay in Ready |
| **Type "="** | Formula bar shows "=", cell shows "=" | EditorManager activates, mode switches | → **PointMode** |
| **Type "+"** | Formula bar shows "+", cell shows "+" | EditorManager activates, mode switches | → **PointMode** |
| **Type "-"** | Formula bar shows "-", cell shows "-" | EditorManager activates, mode switches | → **PointMode** |
| **Type "A"** (or any letter/number) | Cell shows "A", formula bar shows "A" | EditorManager activates, mode switches | → **EnterMode** |
| **F2** | Editor appears with current cell content | EditorManager activates with existing content | → **EditMode** |
| **Double-click cell** | Editor appears, text cursor visible | EditorManager activates | → **EditMode** |
| **Enter** (on filled cell) | Editor appears with content | Same as F2 | → **EditMode** |
| **Enter** (on empty cell) | Editor appears empty | N/A | → **EnterMode** |
| **Delete** or **Backspace** | Cell content clears | UpdateCellsCommand executes | Stay in Ready |
| **Cmd+C** | Marching ants border on selection | ClipboardManager stores content | Stay in Ready |
| **Cmd+V** | Content appears in active cell | Paste command executes | Stay in Ready |
| **Cmd+X** | Content disappears, marching ants | Cut command executes | Stay in Ready |
| **Cmd+Z** | Last action reverts | HistoryManager.undo() | Stay in Ready |
| **Cmd+Y** | Last undo re-applied | HistoryManager.redo() | Stay in Ready |
| **Click cell** | Selection moves to clicked cell | SelectionManager updates | Stay in Ready |
| **Shift+Click cell** | Range selection from anchor to clicked cell | SelectionManager creates range | Stay in Ready |

### Handled Intents

ReadyMode handles these intents:
- **NAVIGATE** - Arrow keys with modifiers (shift, ctrl/cmd)
- **INPUT** - Triggers mode transition to Enter or Point
- **DELETE** - Clears cell content
- **COPY, PASTE, CUT** - Clipboard operations
- **UNDO, REDO** - History operations
- **CELL_SELECT** - Mouse clicks
- **EDIT_START** - F2, Double-click, Enter

---

## EnterMode (Quick Data Entry)

### What the User Experiences

EnterMode activates when you **start typing a regular character** (not a formula trigger). This mode is optimized for **fast data entry**:
- **Arrow keys commit THEN move** (two actions in one keystroke)
- **Tab/Enter commit and move** (right/down respectively)
- **F2** switches to EditMode for fine-tuning
- **Escape** cancels the entry

### Behavior Matrix

| User Input | Visual Result | System Action | Mode Transition |
|------------|---------------|---------------|-----------------|
| **Type "A"** (first character) | Cell shows "A", formula bar shows "A" | EditorManager activates with "A" | Ready → **Enter** |
| **Type "pple"** (continue typing) | Cell shows "Apple", formula bar shows "Apple" | EditorManager appends characters | Stay in Enter |
| **Backspace** | Last character removed | EditorManager removes character | Stay in Enter |
| **Delete** | Character at cursor removed | EditorManager removes character | Stay in Enter |
| **Arrow Right** → | "Apple" commits, selection moves to next cell right | UpdateCellsCommand, SelectionManager.moveSelection | Enter → **Ready** |
| **Arrow Down** ↓ | "Apple" commits, selection moves down | UpdateCellsCommand, SelectionManager.moveSelection | Enter → **Ready** |
| **Tab** → | "Apple" commits, selection moves right | UpdateCellsCommand, SelectionManager.moveSelection | Enter → **Ready** |
| **Enter** ↓ | "Apple" commits, selection moves down | UpdateCellsCommand, SelectionManager.moveSelection | Enter → **Ready** |
| **Escape** | "Apple" discarded, cell unchanged | EditorManager deactivates | Enter → **Ready** |
| **F2** | Editor switches to fine-tuning mode | Text cursor control enabled | Enter → **Edit** |
| **Cmd+Shift+Arrow** | Commits, then extends selection | Commit first, then navigation | Enter → **Ready** |

### Key Behavior: Arrow Keys Commit

The defining feature of EnterMode is that **arrow keys commit the current edit, then move**:

**Example Flow**:
1. User is in cell B2, types "100" → EnterMode
2. User presses Arrow Right → Two things happen:
   - Value "100" is committed to B2 (UpdateCellsCommand executes)
   - Selection moves to C2 (enters ReadyMode)
3. User can immediately type "200" → EnterMode again

This allows rapid horizontal or vertical data entry without reaching for Enter or Tab.

### Handled Intents

- **INPUT** - Appends characters to editor
- **COMMIT** - Tab/Enter commits and moves
- **CANCEL** - Escape discards
- **NAVIGATE** - Arrow keys commit then navigate
- **EDIT_START** - F2 switches to Edit mode
- **DELETE** - Backspace/Delete removes characters

---

## EditMode (Fine-Tuned Editing)

### What the User Experiences

EditMode provides **standard text editing** with full cursor control. This mode activates when:
- User presses **F2** in ReadyMode
- User **double-clicks** a cell
- User presses **Enter** on a filled cell

In this mode:
- **Arrow keys move the text cursor** (NOT grid navigation)
- **Home/End** work as expected for text editing
- **Enter/Tab commit** and return to ReadyMode
- **Escape cancels** the edit

### Behavior Matrix

| User Input | Visual Result | System Action | Mode Transition |
|------------|---------------|---------------|-----------------|
| **F2** (in Ready, on cell with "Hello") | Editor appears, cursor at end of "Hello" | EditorManager activates with content | Ready → **Edit** |
| **Double-click** cell | Editor appears, cursor at click position | EditorManager activates | Ready → **Edit** |
| **Type characters** | Characters inserted at cursor | EditorManager inserts | Stay in Edit |
| **Arrow Left** ← | Cursor moves left one character | Browser default behavior | Stay in Edit |
| **Arrow Right** → | Cursor moves right one character | Browser default behavior | Stay in Edit |
| **Arrow Up** ↑ | Cursor moves to start of text (single line) | Browser default behavior | Stay in Edit |
| **Arrow Down** ↓ | Cursor moves to end of text (single line) | Browser default behavior | Stay in Edit |
| **Home** | Cursor jumps to start of text | Browser default behavior | Stay in Edit |
| **End** | Cursor jumps to end of text | Browser default behavior | Stay in Edit |
| **Cmd+A** | Selects all text in editor | Browser default behavior | Stay in Edit |
| **Backspace** | Deletes character before cursor | Browser default behavior | Stay in Edit |
| **Delete** | Deletes character after cursor | Browser default behavior | Stay in Edit |
| **F4** (on formula with reference) | Reference at cursor cycles format (A1 → $A$1 → A$1 → $A1) | FormulaAdjuster cycles reference | Stay in Edit |
| **Enter** | Content commits, selection moves down | UpdateCellsCommand executes | Edit → **Ready** |
| **Tab** | Content commits, selection moves right | UpdateCellsCommand executes | Edit → **Ready** |
| **Escape** | Edit cancelled, original content restored | EditorManager deactivates | Edit → **Ready** |
| **Type "=" or "+"** (in formula) | Formula continues | EditorManager appends | Stay in Edit |
| **Type operator in formula context** | May switch to PointMode | Depends on cursor position | Edit → **Point** (conditional) |

### Key Behavior: Text Cursor Control

EditMode delegates arrow key handling to the **browser's default text editing**:
- InputController sees arrow key → Creates NAVIGATE intent
- EditMode.handleIntent returns `false` (not handled)
- Browser's default behavior takes over → Text cursor moves

This means you get native text editing behavior "for free" without custom implementation.

### When EditMode Switches to PointMode

If you're editing a formula and type an operator (`+`, `-`, `*`, `/`) at the **end of a cell reference**, EditMode may switch to PointMode to enable pointing:

**Example**:
1. Cell contains `=A1`, user presses F2 → EditMode
2. Cursor at end: `=A1|`
3. User types `+` → `=A1+`
4. Mode switches → PointMode (now can click/arrow to add B1)

### Handled Intents

EditMode **intentionally does NOT handle**:
- **NAVIGATE** - Returns `false`, delegates to browser

EditMode **does handle**:
- **INPUT** - Typing characters
- **COMMIT** - Enter/Tab
- **CANCEL** - Escape
- **Operator detection** - May trigger PointMode transition

---

## PointMode (Formula Building)

### What the User Experiences

PointMode activates when you **start a formula** by typing `=`, `+`, or `-`. This mode enables **visual formula building**:
- **Arrow keys update the formula reference** (don't navigate grid)
- **Mouse clicks insert/update references**
- **Typing operators** locks the current reference and prepares for next reference
- **Typing letters/numbers** switches to EditMode for manual entry

### Behavior Matrix

| User Input | Visual Result | System Action | Mode Transition |
|------------|---------------|---------------|-----------------|
| **Type "="** (in Ready) | Formula bar shows "=", cell shows "=" | EditorManager activates | Ready → **Point** |
| **Arrow Right** → | Formula updates to "=B1" (from A1 context) | Reference updated in formula | Stay in Point |
| **Arrow Down** ↓ | Formula updates to "=B2" | Reference updated in formula | Stay in Point |
| **Click cell C3** | Formula shows "=C3" | Reference replaced with clicked cell | Stay in Point |
| **Type "+"** | Formula shows "=C3+" | Operator locks C3 reference | Stay in Point |
| **Arrow Right** → (after +) | Formula shows "=C3+D3" | NEW reference appended | Stay in Point |
| **Click cell E5** | Formula shows "=C3+E5" | D3 replaced with E5 | Stay in Point |
| **Type "*2"** | Formula shows "=C3+E5*2" | Switches to manual entry | Point → **Edit** |
| **Type "SUM("** | Formula shows "=SUM(" | Function name entered manually | Point → **Edit** |
| **Shift+Arrow** or **Drag** | Formula shows range like "=A1:A10" | Range reference created | Stay in Point |
| **Cmd+Shift+Arrow** | Formula shows extended range | Range extends to data edge | Stay in Point |
| **Type ":"** | Formula shows "=A1:" | Range operator, ready for end cell | Stay in Point |
| **Enter** | Formula commits, result calculated | UpdateCellsCommand, worker calculates | Point → **Ready** |
| **Tab** | Formula commits, selection moves right | UpdateCellsCommand executes | Point → **Ready** |
| **Escape** | Formula cancelled, cell unchanged | EditorManager deactivates | Point → **Ready** |
| **F4** | Reference cycles format (A1 → $A$1 → A$1 → $A1) | FormulaAdjuster cycles reference | Stay in Point |
| **F2** | Switches to manual formula editing | Enable text cursor | Point → **Edit** |

### Key Behavior: Reference Updating vs Appending

PointMode has intelligent logic for when to **replace** a reference vs **append** a new one:

**Scenario 1: Replace Reference**
```
Formula: "=A1|"  (cursor at end, no operator after)
User presses Arrow Right
Result: "=B1|"  (A1 REPLACED with B1)
```

**Scenario 2: Append Reference**
```
Formula: "=A1+|"  (operator just typed)
User presses Arrow Right
Result: "=A1+B1|"  (B1 APPENDED after +)
```

**Scenario 3: Multiple Arrow Presses**
```
Formula: "=A1|"
User presses Arrow Right → "=B1|"
User presses Arrow Right again → "=C1|"  (B1 replaced, NOT appended)
```

**Scenario 4: Operator Locks Reference**
```
Formula: "=A1|"
User types "+" → "=A1+|"
User presses Arrow Right → "=A1+B1|"  (A1 locked, B1 appended)
User presses Arrow Right again → "=A1+C1|"  (B1 replaced, A1 still locked)
```

### Range Selection in PointMode

Ranges can be created in two ways:

**Method 1: Shift+Arrow or Shift+Click**
```
Formula: "=|"
User clicks A1 → "=A1|"
User Shift+Clicks A10 → "=A1:A10|"
```

**Method 2: Type ":" Range Operator**
```
Formula: "=|"
User clicks A1 → "=A1|"
User types ":" → "=A1:|"
User clicks A10 → "=A1:A10|"
```

**Method 3: Drag Selection**
```
Formula: "=SUM(|"
User clicks A1 and drags to A10 → "=SUM(A1:A10|"
```

### When PointMode Switches to EditMode

PointMode switches to EditMode when the user types **non-operator characters**:

**Triggers for Point → Edit**:
- Typing letters (function names, manual references)
- Typing numbers (constants)
- Typing "(" for function calls

**Example**:
```
Formula: "=|"
User types "S" → EditMode (typing function name "SUM")
Formula: "=A1+|"
User types "5" → EditMode (adding constant)
```

### Handled Intents

- **NAVIGATE** - Arrow keys update references
- **CELL_SELECT** - Mouse clicks update references
- **INPUT** - Operators stay in Point, letters/numbers → Edit
- **COMMIT** - Enter/Tab commits formula
- **CANCEL** - Escape discards formula
- **EDIT_START** - F2 switches to Edit

---

## Stress Test Scenarios

These scenarios demonstrate how the mode system handles complex interactions.

### Scenario 1: Cmd+Shift+Right in ReadyMode

**User Context**: Navigating grid, wants to select range to edge of data

**Input**: Cmd+Shift+Right (or Ctrl+Shift+Right on Windows)

**Expected Behavior**:
- Selection extends from active cell to the edge of the data region (rightward)
- Visual: Blue highlight from anchor cell to edge cell
- State: Range added to SelectionManager

**Technical Flow**:
```
User Input → InputController.handleKeyDown
  → Intent: NAVIGATE, Context: {direction: 'right', shift: true, ctrl: true}
  → ModeManager.handleIntent(NAVIGATE, context)
  → ReadyMode.handleIntent (inherited from NavigationMode)
  → NavigationMode checks ctrl: true, shift: true
  → Calls SelectionManager.jumpToEdge('right', true)
  → SelectionManager.findEdge() calculates edge
  → SelectionManager extends selection with shift=true
  → GridRenderer updates visual selection
```

---

### Scenario 2: Cmd+Shift+Right in PointMode

**User Context**: Building formula, wants to extend reference to data edge

**Input**: Cmd+Shift+Right while formula shows "=A1"

**Expected Behavior**:
- Formula reference updates from "A1" to "A1:A50" (if A50 is edge)
- Visual: Formula bar shows "=A1:A50", range A1:A50 highlighted
- State: Formula in EditorManager updated

**Technical Flow**:
```
User Input → InputController.handleKeyDown
  → Intent: NAVIGATE, Context: {direction: 'right', shift: true, ctrl: true}
  → ModeManager.handleIntent(NAVIGATE, context)
  → PointMode.handleIntent (inherited from NavigationMode)
  → NavigationMode.jumpToEdge('right', true) still called
  → BUT PointMode overrides post-navigation hook
  → PointMode.updateFormulaReference() detects shift=true (range)
  → Formula updated to "=A1:A50"
  → EditorManager content updated
  → GridRenderer shows range highlight
```

**Key Insight**: PointMode **reuses** NavigationMode's edge detection logic but **extends** it with formula update behavior.

---

### Scenario 3: Arrow Right in EnterMode

**User Context**: Typing value "100" quickly, wants to move to next cell

**Input**: Arrow Right while in EnterMode with content "100"

**Expected Behavior**:
- Value "100" commits to current cell
- Selection moves one cell right
- Mode returns to ReadyMode
- Next cell ready for input

**Technical Flow**:
```
User Input → InputController.handleKeyDown
  → Intent: NAVIGATE, Context: {direction: 'right', shift: false, ctrl: false}
  → ModeManager.handleIntent(NAVIGATE, context)
  → EnterMode.handleIntent
  → EnterMode detects arrow key → Commit first!
  → Calls this.commitEdit() → UpdateCellsCommand
  → Then calls super.handleIntent(NAVIGATE, context)
  → NavigationMode.handleIntent moves selection
  → ModeManager.switchMode('ready')
  → Selection now on next cell, ready for typing
```

---

### Scenario 4: Arrow Right in EditMode

**User Context**: Fine-tuning text "Hello World", cursor after "Hello"

**Input**: Arrow Right

**Expected Behavior**:
- Text cursor moves right one character (to space after "Hello")
- Cell selection does NOT move
- Mode stays in EditMode

**Technical Flow**:
```
User Input → InputController.handleKeyDown
  → Intent: NAVIGATE, Context: {direction: 'right', shift: false, ctrl: false}
  → ModeManager.handleIntent(NAVIGATE, context)
  → EditMode.handleIntent
  → EditMode checks if it should handle NAVIGATE → NO
  → Returns false (not handled)
  → InputController sees false → Allows browser default
  → Browser moves text cursor right
  → No grid navigation occurs
```

**Key Insight**: EditMode explicitly opts out of grid navigation by returning `false`, delegating to browser behavior.

---

### Scenario 5: Backspace in ReadyMode vs EnterMode

**Context**: Same key, different modes, different behaviors

**Scenario A: ReadyMode**
- User selects cell with content "Hello"
- User presses Backspace
- Expected: Cell content clears to empty (immediate deletion)

**Scenario B: EnterMode**
- User types "Hello" (now in EnterMode)
- User presses Backspace
- Expected: Last character "o" removed, shows "Hell"

**Why Different?**
- **ReadyMode**: No editor active, Backspace means "delete cell content"
- **EnterMode**: Editor active, Backspace means "remove character"

**Technical Flow (ReadyMode)**:
```
Intent: DELETE
→ ReadyMode.handleIntent(DELETE)
→ UpdateCellsCommand.execute({[activeCell]: ""})
→ Cell cleared
```

**Technical Flow (EnterMode)**:
```
Intent: INPUT (Backspace is special input)
→ EnterMode.handleIntent(INPUT, {key: 'Backspace'})
→ EditorManager.handleBackspace()
→ Character removed from editor content
→ Cell still shows modified content
```

---

## Mode Transition Rules

### Entry Conditions

| From Mode | To Mode | Trigger | User Action |
|-----------|---------|---------|-------------|
| **Ready** | **Enter** | Type regular character | User starts typing value |
| **Ready** | **Edit** | F2, Double-click, Enter on filled cell | User wants to edit existing |
| **Ready** | **Point** | Type "=", "+", "-" | User starts formula |
| **Enter** | **Ready** | Arrow, Tab, Enter, Escape | User commits or cancels |
| **Enter** | **Edit** | F2 | User wants fine-tuning |
| **Edit** | **Ready** | Enter, Tab, Escape | User commits or cancels |
| **Edit** | **Point** | Type operator at end of reference | User continues formula |
| **Point** | **Ready** | Enter, Tab, Escape | User commits or cancels formula |
| **Point** | **Edit** | Type letter/number | User manually types formula |

### Mode Lifecycle Hooks

Each mode has lifecycle methods:
- **onEnter()**: Setup when mode activates
- **onExit()**: Cleanup when mode deactivates

**Example: PointMode.onEnter()**
```javascript
onEnter() {
  // Highlight referenced cells
  this.updateReferenceHighlights();
}
```

**Example: EditMode.onExit()**
```javascript
onExit() {
  // Deactivate editor
  this.editorManager.deactivate();
}
```

---

## Summary: Quick Reference

| Mode | Primary Use | Arrow Keys Behavior | Exit Condition |
|------|-------------|---------------------|----------------|
| **Ready** | Navigation, selection | Move grid selection | Enter Edit/Enter/Point mode |
| **Enter** | Quick data entry | **Commit then move** | Arrow/Tab/Enter/Escape |
| **Edit** | Fine-tuned text editing | Move text cursor | Enter/Tab/Escape |
| **Point** | Formula building | Update formula reference | Enter/Tab/Escape |

| Mode | F2 Behavior | Escape Behavior | Enter Behavior |
|------|-------------|-----------------|----------------|
| **Ready** | → Edit | N/A | → Edit (filled) or Enter (empty) |
| **Enter** | → Edit | Cancel, → Ready | Commit, move down, → Ready |
| **Edit** | N/A | Cancel, → Ready | Commit, move down, → Ready |
| **Point** | → Edit | Cancel, → Ready | Commit formula, → Ready |

---

## Design Principles

### 1. Single Responsibility per Mode
Each mode has a clear purpose:
- **Ready**: Grid navigation and selection
- **Enter**: Fast data entry
- **Edit**: Fine-grained text control
- **Point**: Visual formula building

### 2. Shared Logic Through Inheritance
Common navigation logic lives in `NavigationMode` base class:
- ReadyMode, EnterMode, PointMode all inherit from NavigationMode
- EditMode extends AbstractMode directly (no grid navigation)

### 3. Browser Delegation Where Possible
EditMode doesn't implement text cursor movement - it delegates to browser default behavior. This reduces code complexity and ensures native text editing feel.

### 4. Modes Are Stateless Between Activations
Modes don't store state between activations. State lives in:
- **SelectionManager** - Active cell, ranges
- **EditorManager** - Editor content, cursor position
- **FileManager** - Cell data

Modes are lightweight strategy objects that coordinate these managers.

---

## Next Steps

For complete keyboard shortcut reference, see:
- `03-keyboard-shortcuts.md` - Organized by mode

For complex multi-mode scenarios, see:
- `04-advanced-scenarios.md` - Edge cases and advanced workflows

For implementation details, see:
- `/docs/architecture/01-mode-system.md` - Technical architecture
