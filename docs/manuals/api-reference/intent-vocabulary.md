# Intent Vocabulary Reference

This document defines the complete intent vocabulary used in v-sheet's mode system. Intents are **semantic actions** that decouple raw DOM events from user behavior.

**Flow**: `Raw Event → InputController → Intent + Context → ModeManager → Current Mode`

---

## Why Intents?

### Problem Without Intents
```javascript
// Without intents - tightly coupled to events
if (event.key === 'ArrowRight' && event.shiftKey && event.metaKey) {
  // What does this mean? Hard to understand
  jumpToEdge('right', true);
}
```

### Solution With Intents
```javascript
// With intents - semantic meaning clear
if (intent === 'NAVIGATE') {
  const { direction, shift, ctrl } = context;
  if (ctrl) {
    jumpToEdge(direction, shift);
  }
}
```

**Benefits**:
- Platform-agnostic (Cmd vs Ctrl normalized)
- Self-documenting (intent name explains purpose)
- Testable (can create intents without DOM events)
- Modes focus on behavior, not event details

---

## Intent Catalog

### Navigation Intents

#### NAVIGATE
**Purpose**: User wants to move selection or cursor

**Triggered by**:
- Arrow keys (↑ ↓ ← →)
- Arrow keys + Shift (selection extension)
- Arrow keys + Cmd/Ctrl (jump to edge)
- Arrow keys + Cmd/Ctrl + Shift (extend to edge)

**Context Object**:
```javascript
{
  direction: 'up' | 'down' | 'left' | 'right',
  shift: boolean,    // true if Shift held (extend selection)
  ctrl: boolean      // true if Cmd/Ctrl held (jump to edge)
}
```

**Mode Behaviors**:
| Mode | Behavior |
|------|----------|
| **Ready** | Moves grid selection (inherited from NavigationMode) |
| **Enter** | **Commits edit first**, then moves grid selection |
| **Edit** | Returns `false` (browser moves text cursor) |
| **Point** | Updates formula reference instead of moving selection |

**Examples**:
```javascript
// Arrow Right
{direction: 'right', shift: false, ctrl: false}

// Cmd+Shift+Down
{direction: 'down', shift: true, ctrl: true}
```

---

#### JUMP_TO_EDGE
**Purpose**: User wants to jump to edge of data region

**Note**: This intent is **deprecated** in favor of `NAVIGATE` with `ctrl: true`. InputController now creates a single NAVIGATE intent with modifiers, and NavigationMode checks the `ctrl` flag.

**Historical context**: Originally separate intent for Cmd+Arrow, now unified with NAVIGATE.

---

### Edit Intents

#### INPUT
**Purpose**: User is typing a character

**Triggered by**:
- Printable characters (letters, numbers, symbols)
- Backspace, Delete (character deletion)
- Special characters (=, +, -, *, /, etc.)

**Context Object**:
```javascript
{
  char: string,      // The character typed (e.g., "A", "=", "5")
  key: string        // Key name (e.g., "Backspace", "Delete")
}
```

**Mode Behaviors**:
| Mode | Behavior |
|------|----------|
| **Ready** | Triggers mode transition: "=" → Point, "A" → Enter |
| **Enter** | Appends character to editor content |
| **Edit** | Inserts character at cursor position |
| **Point** | Operators stay in Point, letters/numbers → Edit |

**Examples**:
```javascript
// Type "A"
{char: 'A', key: 'A'}

// Type "="
{char: '=', key: '='}

// Press Backspace
{char: '', key: 'Backspace'}
```

---

#### COMMIT
**Purpose**: User wants to save changes and exit editing

**Triggered by**:
- Enter key
- Tab key
- Sometimes: Arrow keys (in EnterMode)

**Context Object**:
```javascript
{
  direction: 'down' | 'right' | 'left' | null,  // Movement after commit
  key: 'Enter' | 'Tab' | 'Arrow...'
}
```

**Mode Behaviors**:
| Mode | Behavior |
|------|----------|
| **Ready** | N/A (not editing) |
| **Enter** | Saves value, moves in direction, → Ready |
| **Edit** | Saves value, moves in direction, → Ready |
| **Point** | Saves formula, calculates, moves, → Ready |

**Examples**:
```javascript
// Press Enter (move down)
{direction: 'down', key: 'Enter'}

// Press Tab (move right)
{direction: 'right', key: 'Tab'}
```

---

#### CANCEL
**Purpose**: User wants to discard changes and exit editing

**Triggered by**:
- Escape key

**Context Object**:
```javascript
{
  key: 'Escape'
}
```

**Mode Behaviors**:
| Mode | Behavior |
|------|----------|
| **Ready** | No effect |
| **Enter** | Discards changes, → Ready |
| **Edit** | Discards changes, → Ready |
| **Point** | Discards formula, → Ready |

**Note**: Cancel does NOT create a history command (no undo entry)

---

#### EDIT_START
**Purpose**: User wants to enter editing mode

**Triggered by**:
- F2 key
- Double-click on cell
- Enter key (on filled cell in Ready mode)

**Context Object**:
```javascript
{
  trigger: 'f2' | 'doubleclick' | 'enter',
  address: string  // Cell being edited (e.g., "A1")
}
```

**Mode Behaviors**:
| Mode | Behavior |
|------|----------|
| **Ready** | Activates editor, → Edit |
| **Enter** | Switches to Edit (F2 only) |
| **Edit** | Already editing (no effect) |
| **Point** | Switches to Edit for manual formula entry (F2) |

---

#### TOGGLE_REFERENCE
**Purpose**: User wants to cycle absolute/relative reference format

**Triggered by**:
- F4 key (in EditMode or PointMode while editing formula)

**Context Object**:
```javascript
{
  // No additional context needed - operates on current editor state
}
```

**Mode Behaviors**:
| Mode | Behavior |
|------|----------|
| **Ready** | No effect (not editing) |
| **Enter** | No effect (not in formula) |
| **Edit** | Cycles reference at cursor position (A1 → $A$1 → A$1 → $A1 → A1) |
| **Point** | Cycles current reference in formula |

**Cycle Sequence**:
1. `A1` (Relative) → both column and row adjust when copied
2. `$A$1` (Fully absolute) → neither column nor row adjust
3. `A$1` (Row absolute) → only column adjusts
4. `$A1` (Column absolute) → only row adjusts
5. Back to `A1` (loops)

---

### Selection Intents

#### CELL_SELECT
**Purpose**: User wants to select a cell with mouse

**Triggered by**:
- Mouse click on cell
- Shift+Click for range selection
- Ctrl+Click for multi-selection (future)

**Context Object**:
```javascript
{
  address: string,       // Cell address (e.g., "B2")
  shift: boolean,        // Range selection
  ctrl: boolean,         // Multi-selection (future)
  coords: {x, y}         // Grid coordinates
}
```

**Mode Behaviors**:
| Mode | Behavior |
|------|----------|
| **Ready** | Sets active cell or extends selection |
| **Enter** | N/A (click outside editor cancels) |
| **Edit** | N/A (click outside editor cancels) |
| **Point** | Inserts/updates cell reference in formula |

**Examples**:
```javascript
// Click cell B2
{address: 'B2', shift: false, ctrl: false, coords: {x: 1, y: 1}}

// Shift+Click C5 (extend range from active cell to C5)
{address: 'C5', shift: true, ctrl: false, coords: {x: 2, y: 4}}
```

---

#### HEADER_SELECT
**Purpose**: User wants to select entire column or row

**Triggered by**:
- Click column header (e.g., "A", "B", "C")
- Click row header (e.g., "1", "2", "3")

**Context Object**:
```javascript
{
  type: 'column' | 'row',
  index: number,         // Column index (0 = A) or row index
  shift: boolean         // Extend selection
}
```

**Mode Behaviors**:
| Mode | Behavior |
|------|----------|
| **Ready** | Selects entire column or row |
| Others | N/A (not implemented yet) |

**Examples**:
```javascript
// Click column header "B"
{type: 'column', index: 1, shift: false}

// Click row header "5"
{type: 'row', index: 4, shift: false}
```

---

### Clipboard Intents

#### COPY
**Purpose**: User wants to copy selected cells

**Triggered by**:
- Cmd+C / Ctrl+C

**Context Object**:
```javascript
{
  selection: {
    activeCell: string,
    ranges: Array<{start: string, end: string}>
  }
}
```

**Mode Behaviors**:
| Mode | Behavior |
|------|----------|
| **Ready** | Copies selection to ClipboardManager |
| **Edit** | May copy text within editor (browser default) |
| Others | Delegates to Ready behavior |

---

#### PASTE
**Purpose**: User wants to paste clipboard content

**Triggered by**:
- Cmd+V / Ctrl+V

**Context Object**:
```javascript
{
  targetCell: string  // Where to paste (active cell)
}
```

**Mode Behaviors**:
| Mode | Behavior |
|------|----------|
| **Ready** | Pastes clipboard data, creates UpdateCellsCommand |
| **Edit** | May paste text within editor (browser default) |
| Others | Delegates to Ready behavior |

---

#### CUT
**Purpose**: User wants to cut selected cells

**Triggered by**:
- Cmd+X / Ctrl+X

**Context Object**:
```javascript
{
  selection: {
    activeCell: string,
    ranges: Array<{start: string, end: string}>
  }
}
```

**Mode Behaviors**:
| Mode | Behavior |
|------|----------|
| **Ready** | Copies to clipboard AND clears cells |
| **Edit** | May cut text within editor (browser default) |
| Others | Delegates to Ready behavior |

---

### History Intents

#### UNDO
**Purpose**: User wants to undo last action

**Triggered by**:
- Cmd+Z / Ctrl+Z

**Context Object**:
```javascript
{} // No context needed
```

**Mode Behaviors**:
| Mode | Behavior |
|------|----------|
| **All modes** | Delegates to HistoryManager.undo() |

---

#### REDO
**Purpose**: User wants to redo last undone action

**Triggered by**:
- Cmd+Y / Ctrl+Y
- Cmd+Shift+Z / Ctrl+Shift+Z

**Context Object**:
```javascript
{} // No context needed
```

**Mode Behaviors**:
| Mode | Behavior |
|------|----------|
| **All modes** | Delegates to HistoryManager.redo() |

---

### Delete Intent

#### DELETE
**Purpose**: User wants to delete/clear content

**Triggered by**:
- Delete key
- Backspace key (in Ready mode)

**Context Object**:
```javascript
{
  key: 'Delete' | 'Backspace'
}
```

**Mode Behaviors**:
| Mode | Behavior |
|------|----------|
| **Ready** | Clears selected cells, creates UpdateCellsCommand |
| **Enter** | Removes character (handled as INPUT intent) |
| **Edit** | Removes character at cursor (browser default) |
| **Point** | Removes character from formula |

---

### Formatting Intents (Planned - Epic 3)

#### FORMAT_BOLD
**Purpose**: User wants to toggle bold formatting

**Triggered by**:
- Cmd+B / Ctrl+B

**Status**: Not yet implemented

---

#### FORMAT_ITALIC
**Purpose**: User wants to toggle italic formatting

**Triggered by**:
- Cmd+I / Ctrl+I

**Status**: Not yet implemented

---

## Intent Flow Examples

### Example 1: Arrow Right in ReadyMode

```
User presses Arrow Right
  ↓
InputController.handleKeyDown(event)
  ↓
Detects: event.key === 'ArrowRight', no modifiers
  ↓
Creates intent:
  {
    type: 'NAVIGATE',
    context: {direction: 'right', shift: false, ctrl: false}
  }
  ↓
ModeManager.handleIntent('NAVIGATE', context)
  ↓
ReadyMode.handleIntent('NAVIGATE', context)
  ↓
NavigationMode.handleIntent() [inherited]
  ↓
Checks: ctrl? No → moveSelection('right', false)
  ↓
SelectionManager.moveSelection('right', false)
  ↓
Selection moves one cell to the right
```

---

### Example 2: Type "=" in ReadyMode

```
User types "="
  ↓
InputController.handleKeyDown(event)
  ↓
Detects: event.key === '=', is printable character
  ↓
Creates intent:
  {
    type: 'INPUT',
    context: {char: '=', key: '='}
  }
  ↓
ModeManager.handleIntent('INPUT', context)
  ↓
ReadyMode.handleIntent('INPUT', context)
  ↓
Checks: char === '=' → Formula trigger!
  ↓
ReadyMode.requestModeSwitch('point')
  ↓
ModeManager.switchMode('point')
  ↓
ReadyMode.onExit()
PointMode.onEnter()
  ↓
EditorManager activates with "="
  ↓
Mode is now PointMode
```

---

### Example 3: Arrow Right in EnterMode

```
User types "100" then presses Arrow Right
  ↓
Current state: EnterMode, editor content = "100"
  ↓
InputController.handleKeyDown(event)
  ↓
Creates intent:
  {
    type: 'NAVIGATE',
    context: {direction: 'right', shift: false, ctrl: false}
  }
  ↓
ModeManager.handleIntent('NAVIGATE', context)
  ↓
EnterMode.handleIntent('NAVIGATE', context)
  ↓
EnterMode detects arrow key → Commit first!
  ↓
this.commitEdit()
  ↓
UpdateCellsCommand.execute({activeCell: "100"})
  ↓
HistoryManager.execute(command)
  ↓
FileManager.updateCell(activeCell, "100")
  ↓
Then: super.handleIntent('NAVIGATE', context)
  ↓
NavigationMode.handleIntent() [inherited]
  ↓
SelectionManager.moveSelection('right', false)
  ↓
this.requestModeSwitch('ready')
  ↓
Mode is now ReadyMode, selection moved right
```

---

## Platform Normalization

InputController normalizes platform-specific modifiers:

| Platform | Key | Normalized in Context |
|----------|-----|----------------------|
| macOS | Cmd+Arrow | `ctrl: true` |
| Windows | Ctrl+Arrow | `ctrl: true` |
| macOS | Option+Something | `alt: true` |
| Windows | Alt+Something | `alt: true` |

**Implementation**:
```javascript
const ctrl = event.metaKey || event.ctrlKey;  // Cmd on Mac, Ctrl on Win
const shift = event.shiftKey;
const alt = event.altKey;
```

This ensures modes don't need platform-specific logic.

---

## Creating Custom Intents (Extension)

If adding a new intent:

1. **Define Intent Constant** in `Intents.js`:
```javascript
export const MY_NEW_INTENT = 'MY_NEW_INTENT';
```

2. **Create Context Factory** in `Intents.js`:
```javascript
export function createMyNewIntentContext(param1, param2) {
  return {
    param1,
    param2,
    timestamp: Date.now()  // Optional metadata
  };
}
```

3. **Map Event to Intent** in `InputController.js`:
```javascript
if (event.key === 'SomeKey') {
  const context = createMyNewIntentContext(value1, value2);
  this.modeManager.handleIntent(MY_NEW_INTENT, context);
}
```

4. **Handle in Mode(s)**:
```javascript
// In ReadyMode.js (or appropriate mode)
handleIntent(intent, context) {
  if (intent === MY_NEW_INTENT) {
    // Handle it
    return true;
  }
  return super.handleIntent(intent, context);
}
```

---

## Intent Handling Contract

Every mode must implement:
```javascript
handleIntent(intent, context) {
  // Returns:  true if handled, false if not handled
  //
  // If false, InputController allows browser default behavior
}
```

**Important**: Returning `false` is intentional for EditMode, which delegates text editing to the browser.

---

## Testing Intents

Intents are easy to test without DOM events:

```javascript
// tests/modes/ReadyMode.test.js
import { NAVIGATE, createNavigateContext } from '../js/modes/Intents.js';

test('ReadyMode handles NAVIGATE intent', () => {
  const mode = new ReadyMode(mockContext);
  const context = createNavigateContext('right', false, false);

  const handled = mode.handleIntent(NAVIGATE, context);

  expect(handled).toBe(true);
  expect(mockSelectionManager.moveSelection).toHaveBeenCalledWith('right', false);
});
```

---

## Summary: Complete Intent List

| Intent | Purpose | Triggered By | Status |
|--------|---------|--------------|--------|
| **NAVIGATE** | Move selection/cursor | Arrow keys (+ modifiers) | ✅ Implemented |
| **INPUT** | Type character | Keyboard input | ✅ Implemented |
| **COMMIT** | Save and exit | Enter, Tab | ✅ Implemented |
| **CANCEL** | Discard and exit | Escape | ✅ Implemented |
| **EDIT_START** | Enter edit mode | F2, Double-click, Enter | ✅ Implemented |
| **TOGGLE_REFERENCE** | Cycle absolute/relative | F4 | ✅ Implemented |
| **CELL_SELECT** | Select cell | Mouse click | ✅ Implemented |
| **HEADER_SELECT** | Select column/row | Header click | ✅ Implemented |
| **COPY** | Copy selection | Cmd+C | ✅ Implemented |
| **PASTE** | Paste clipboard | Cmd+V | ✅ Implemented |
| **CUT** | Cut selection | Cmd+X | ✅ Implemented |
| **UNDO** | Undo last action | Cmd+Z | ✅ Implemented |
| **REDO** | Redo action | Cmd+Y | ✅ Implemented |
| **DELETE** | Delete content | Delete, Backspace | ✅ Implemented |
| **FORMAT_BOLD** | Toggle bold | Cmd+B | ⏳ Planned (Epic 3) |
| **FORMAT_ITALIC** | Toggle italic | Cmd+I | ⏳ Planned (Epic 3) |
| **SELECT_ALL** | Select all cells | Cmd+A | ⏳ Planned |

---

## See Also

- **Mode System**: `/docs/architecture/01-mode-system.md`
- **Mode Behaviors**: `/docs/user-interactions/02-mode-behaviors.md`
- **Keyboard Shortcuts**: `/docs/user-interactions/03-keyboard-shortcuts.md`
- **Source Code**: `js/modes/Intents.js`, `js/ui/InputController.js`
