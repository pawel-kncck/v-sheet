# Mode System Architecture

**Last Updated**: 2025-12-07

This document describes the high-level architecture of v-sheet's mode system - a Finite State Machine (FSM) implementation for managing user interaction contexts.

**Related Documents**:
- User perspective: `/docs/user-interactions/02-mode-behaviors.md`
- Architecture decision: `/docs/adr/001-fsm-mode-system.md`
- System overview: `/docs/architecture/00-system-overview.md`

---

## Conceptual Model

The mode system is a **Finite State Machine** where each state represents a different user interaction context. At any given time, the application is in exactly ONE mode, and that mode determines how user input is interpreted.

```
┌─────────────────────────────────────────────────────────────┐
│                   ModeManager (FSM Controller)              │
│  - Owns current mode state                                  │
│  - Delegates all intents to current mode                    │
│  - Manages transitions with lifecycle hooks                 │
└─────────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┬─────────────┐
         ▼                 ▼                 ▼             ▼
    ┌─────────┐      ┌──────────┐     ┌──────────┐  ┌─────────┐
    │  Ready  │      │  Enter   │     │   Edit   │  │  Point  │
    │  Mode   │      │  Mode    │     │   Mode   │  │  Mode   │
    └─────────┘      └──────────┘     └──────────┘  └─────────┘
         ↑                ↑                 ↑             ↑
         └────────────────┴─────────────────┴─────────────┘
                   Inherit from AbstractMode
                 (or NavigationMode subclass)
```

---

## Core Components

### ModeManager (`js/modes/ModeManager.js`)

**Responsibility**: Central FSM controller that manages mode state and transitions

**What It Does**:
- Maintains reference to current mode instance
- Registers mode classes at initialization
- Delegates all intents to `currentMode.handleIntent()`
- Manages mode transitions via `switchMode(modeName)`
- Ensures lifecycle hooks are called (`onEnter`, `onExit`)
- Lazy instantiation of modes (created on first use)
- Caches mode instances (one instance per mode)

**What It Doesn't Do**:
- ❌ Handle user input directly (InputController does)
- ❌ Know about specific mode behaviors (modes handle their own intents)
- ❌ Update UI directly (modes delegate to managers)

**Key Methods**:
- `registerMode(modeName, ModeClass)` - Registers a mode class
- `switchMode(newModeName)` - Transitions to new mode
- `handleIntent(intent, context)` - Delegates to current mode
- `getCurrentModeName()` - Returns current mode name

**Data It Owns**:
- `currentMode` - Reference to active mode instance
- `modes` - Map of mode name → mode instance

---

### AbstractMode (`js/modes/AbstractMode.js`)

**Responsibility**: Base class defining the mode interface

**What It Provides**:
- Lifecycle hooks: `onEnter()`, `onExit()`
- Intent handling interface: `handleIntent(intent, context)`
- Access to shared services (via constructor injection)
- Mode name getter: `getName()`
- Mode switching helper: `requestModeSwitch(modeName)`

**What Subclasses Must Implement**:
- `getName()` - Returns unique mode name (e.g., "ready", "edit")
- `handleIntent(intent, context)` - Returns `true` if handled, `false` if not

**What Subclasses May Implement**:
- `onEnter()` - Setup when mode activates (optional)
- `onExit()` - Cleanup when mode deactivates (optional)

**Services Available to Modes** (via `this._context`):
- `selectionManager` - Selection state and rendering
- `editorManager` - Editor DOM control
- `clipboardManager` - Copy/paste operations
- `historyManager` - Undo/redo
- `fileManager` - File data and persistence

---

### NavigationMode (`js/modes/NavigationMode.js`)

**Responsibility**: Base class for modes that support grid navigation

**What It Provides**:
- Shared navigation logic for arrow keys
- Edge detection with `jumpToEdge(direction, shift)`
- Selection movement with `moveSelection(direction, shift)`
- Handles NAVIGATE intent with ctrl/shift modifiers

**Subclasses**: ReadyMode, EnterMode, PointMode

**Why It Exists**: Eliminates code duplication - navigation logic (including complex edge detection) is programmed once and reused by three modes.

**Key Methods**:
- `handleIntent(intent, context)` - Implements NAVIGATE intent handling
- Checks `context.ctrl` → calls `jumpToEdge()` or `moveSelection()`
- Passes `context.shift` to extend selection

---

### InputController (`js/ui/InputController.js`)

**Responsibility**: Event gateway that converts DOM events to intents

**What It Does**:
- Listens to keyboard and mouse events on the grid
- Normalizes platform differences (Cmd vs Ctrl)
- Maps raw events to semantic intents
- Creates intent context objects
- Delegates to `ModeManager.handleIntent()`
- Allows browser default if mode returns `false`

**Key Flow**:
```
DOM Event → InputController.handleKeyDown()
  → Normalize (Cmd → ctrl flag)
  → Map to intent (ArrowRight → NAVIGATE)
  → Create context {direction: 'right', shift: false, ctrl: false}
  → ModeManager.handleIntent(NAVIGATE, context)
  → If returns false → event.preventDefault() NOT called (browser handles)
```

**Platform Normalization**:
```javascript
const ctrl = event.metaKey || event.ctrlKey;  // Cmd on Mac, Ctrl on Windows
const shift = event.shiftKey;
const alt = event.altKey;
```

---

### Intent Vocabulary (`js/modes/Intents.js`)

**Responsibility**: Defines semantic action vocabulary

**What It Provides**:
- Intent constants (`NAVIGATE`, `INPUT`, `COMMIT`, `CANCEL`, etc.)
- Context factory functions for each intent type
- Type safety for intent context objects

**Why It Exists**: Decouples hardware events from semantic meaning. Modes understand "user wants to navigate right" not "ArrowRight key pressed".

**Key Intents**:
- `NAVIGATE` - Arrow keys (with direction, shift, ctrl modifiers)
- `INPUT` - Character typed
- `COMMIT` - Enter/Tab (save and exit)
- `CANCEL` - Escape (discard and exit)
- `EDIT_START` - F2/Double-click (enter edit mode)
- `CELL_SELECT` - Mouse click on cell
- `COPY`, `PASTE`, `CUT` - Clipboard operations
- `UNDO`, `REDO` - History operations
- `DELETE` - Delete/Backspace key
- `TOGGLE_REFERENCE` - F4 key (cycle absolute/relative references)

See `/docs/api-reference/intent-vocabulary.md` for complete reference.

---

## Mode Lifecycle

### Initialization

```
Spreadsheet constructor
  → Creates ModeManager instance
  → Registers all mode classes:
      - modeManager.registerMode('ready', ReadyMode)
      - modeManager.registerMode('enter', EnterMode)
      - modeManager.registerMode('edit', EditMode)
      - modeManager.registerMode('point', PointMode)
  → Switches to 'ready' mode (initial state)
  → ReadyMode.onEnter() called
```

### Mode Transition Flow

```javascript
// Example: User types "=" in ReadyMode

1. InputController detects keydown event
   → event.key === '='

2. InputController creates INPUT intent
   → intent = 'INPUT'
   → context = {char: '=', key: '='}

3. ModeManager.handleIntent('INPUT', context)
   → Delegates to currentMode (ReadyMode)

4. ReadyMode.handleIntent('INPUT', context)
   → Detects '=' is formula trigger
   → Calls this.requestModeSwitch('point')

5. ModeManager.switchMode('point')
   → Calls ReadyMode.onExit() [cleanup]
   → Sets currentMode = PointMode instance
   → Calls PointMode.onEnter() [setup]

6. PointMode is now active
   → Future intents handled by PointMode
```

### Lifecycle Hooks

**`onEnter()`** - Called when mode becomes active
- Setup editor if needed
- Initialize mode-specific state
- Update UI (mode indicator, cursor style, etc.)

**`onExit()`** - Called when mode is deactivated
- Cleanup mode-specific state
- Deactivate editor if needed
- Remove event listeners

**Important**: ModeManager guarantees `onExit()` is called before next mode's `onEnter()`.

---

## Concrete Modes

### ReadyMode (`js/modes/ReadyMode.js`)

**User Context**: Idle, navigating spreadsheet, no editing in progress

**Extends**: NavigationMode

**Handled Intents**:
- `NAVIGATE` - Arrow keys (inherited from NavigationMode)
- `INPUT` - Triggers mode transitions (= → Point, A → Enter)
- `DELETE` - Clears selected cells
- `COPY`, `PASTE`, `CUT` - Clipboard operations
- `UNDO`, `REDO` - History operations
- `CELL_SELECT` - Mouse clicks
- `EDIT_START` - F2/Double-click

**Mode Transitions FROM Ready**:
- Type `=`, `+`, `-` → PointMode (formula triggers)
- Type regular character → EnterMode (quick entry)
- F2, Double-click, Enter on filled cell → EditMode

**Lifecycle**:
- `onEnter()`: Deactivate editor, update mode indicator
- `onExit()`: N/A (minimal cleanup)

---

### EnterMode (`js/modes/EnterMode.js`)

**User Context**: Quick data entry, typing value

**Extends**: NavigationMode

**Key Feature**: Arrow keys commit THEN move (two actions in one keystroke)

**Handled Intents**:
- `INPUT` - Appends characters to editor
- `NAVIGATE` - **Commits edit first**, then navigates (key behavior)
- `COMMIT` - Tab/Enter commits and moves
- `CANCEL` - Escape discards changes
- `EDIT_START` - F2 switches to EditMode
- `DELETE` - Backspace removes characters

**Mode Transitions FROM Enter**:
- Arrow keys → ReadyMode (after commit)
- Tab/Enter → ReadyMode (after commit)
- F2 → EditMode (for fine-tuning)
- Escape → ReadyMode (cancel)

**Lifecycle**:
- `onEnter()`: Activate editor with typed character
- `onExit()`: Deactivate editor

**Special Logic**:
```javascript
handleIntent(intent, context) {
  if (intent === 'NAVIGATE') {
    this.commitEdit();  // Commit first!
    super.handleIntent(intent, context);  // Then navigate
    this.requestModeSwitch('ready');
    return true;
  }
  // ... other intents
}
```

---

### EditMode (`js/modes/EditMode.js`)

**User Context**: Fine-tuned text editing with cursor control

**Extends**: AbstractMode (NOT NavigationMode - no grid navigation)

**Key Feature**: Arrow keys move text cursor, not grid selection

**Handled Intents**:
- `INPUT` - Inserts characters at cursor
- `COMMIT` - Enter/Tab saves and exits
- `CANCEL` - Escape discards changes
- `NAVIGATE` - Returns `false` → browser handles text cursor movement
- `TOGGLE_REFERENCE` - F4 cycles reference at cursor position

**Mode Transitions FROM Edit**:
- Enter/Tab → ReadyMode (commit)
- Escape → ReadyMode (cancel)
- Type operator in formula → PointMode (conditional)

**Lifecycle**:
- `onEnter()`: Activate editor with existing cell content
- `onExit()`: Deactivate editor

**Special Logic** (delegating to browser):
```javascript
handleIntent(intent, context) {
  if (intent === 'NAVIGATE') {
    return false;  // Not handled - browser moves text cursor
  }
  // ... other intents
}
```

---

### PointMode (`js/modes/PointMode.js`)

**User Context**: Building formula with point-and-click

**Extends**: NavigationMode

**Key Feature**: Arrow keys and clicks update formula references, not grid selection

**Handled Intents**:
- `NAVIGATE` - Updates formula reference (doesn't navigate grid)
- `CELL_SELECT` - Inserts/updates cell reference in formula
- `INPUT` - Operators stay in Point, letters/numbers → Edit
- `COMMIT` - Enter/Tab saves formula
- `CANCEL` - Escape discards formula
- `EDIT_START` - F2 switches to EditMode
- `TOGGLE_REFERENCE` - F4 cycles reference format (A1 → $A$1 → A$1 → $A1)

**Mode Transitions FROM Point**:
- Enter/Tab → ReadyMode (commit formula)
- Escape → ReadyMode (cancel)
- F2 → EditMode (manual formula editing)
- Type letter/number → EditMode (typing function name or constant)

**Lifecycle**:
- `onEnter()`: Activate editor with "=" or formula trigger
- `onExit()`: Deactivate editor, remove reference highlights

**Reference Logic**:
```javascript
// Scenario 1: No operator after reference → REPLACE
Formula: "=A1"
User presses Arrow Right
Result: "=B1" (A1 replaced with B1)

// Scenario 2: Operator just typed → APPEND
Formula: "=A1+"
User presses Arrow Right
Result: "=A1+B1" (B1 appended after +)
```

**Special Logic**:
```javascript
handleIntent(intent, context) {
  if (intent === 'NAVIGATE') {
    // Still call navigation (inherited)
    super.handleIntent(intent, context);

    // But ALSO update formula reference
    this.updateFormulaReference(context);

    return true;
  }
  // ... other intents
}
```

---

## Intent Handling Flow

### Single Intent Flow

```
User Input
  ↓
InputController.handleKeyDown(event)
  ↓
Create intent + context
  ↓
ModeManager.handleIntent(intent, context)
  ↓
currentMode.handleIntent(intent, context)
  ↓
Mode-specific logic
  ↓
Returns true (handled) or false (not handled)
  ↓
If false: InputController allows browser default
```

### Intent Delegation Chain

```
Mode.handleIntent(intent, context)
  ↓
Check if mode handles this intent
  ↓
  Yes: Execute mode-specific logic
       Call service managers
       Return true
  ↓
  No: Call super.handleIntent(intent, context)
      (delegate to parent class)
      If still not handled → return false
```

**Example** (EnterMode handling NAVIGATE):
```javascript
// EnterMode.handleIntent()
if (intent === 'NAVIGATE') {
  this.commitEdit();  // EnterMode-specific
  super.handleIntent(intent, context);  // Delegate to NavigationMode
  this.requestModeSwitch('ready');
  return true;
}
```

---

## Mode State vs Application State

**Important Distinction**:

**Mode State** (transient):
- Current mode name (e.g., "edit", "point")
- Managed by ModeManager
- Changes frequently as user interacts

**Application State** (persistent):
- Cell data (FileManager)
- Active cell and selection (SelectionManager)
- Editor content (EditorManager)
- History stack (HistoryManager)

**Modes are stateless** between activations:
- Don't store user data
- Access app state via injected services
- Are lightweight strategy objects

---

## Design Patterns Used

### 1. Finite State Machine (FSM)
- System is in exactly one mode at a time
- Transitions are explicit and controlled
- Each state (mode) has well-defined behavior

### 2. Strategy Pattern
- Each mode is a strategy for handling user input
- Modes are interchangeable (same interface)
- Strategy is selected at runtime (current mode)

### 3. Template Method
- AbstractMode defines skeleton (`handleIntent`)
- Subclasses fill in specific behavior
- Lifecycle hooks (`onEnter`, `onExit`) are template methods

### 4. Chain of Responsibility
- Intent handling can delegate to parent class
- `super.handleIntent()` passes to next handler
- Falls through to browser default if no handler

---

## Testing Strategy

### Unit Tests (`tests/modes/`)

**Test Each Mode in Isolation**:
```javascript
import { NAVIGATE } from '../js/modes/Intents.js';
import ReadyMode from '../js/modes/ReadyMode.js';

test('ReadyMode handles NAVIGATE intent', () => {
  const mockContext = {
    selectionManager: mockSelectionManager,
    editorManager: mockEditorManager,
    // ...
  };

  const mode = new ReadyMode(mockContext);
  const context = {direction: 'right', shift: false, ctrl: false};

  const handled = mode.handleIntent(NAVIGATE, context);

  expect(handled).toBe(true);
  expect(mockSelectionManager.moveSelection).toHaveBeenCalledWith('right', false);
});
```

**Test Mode Transitions**:
```javascript
test('ModeManager transitions from Ready to Point on "=" input', () => {
  const manager = new ModeManager(context);

  expect(manager.getCurrentModeName()).toBe('ready');

  manager.handleIntent('INPUT', {char: '=', key: '='});

  expect(manager.getCurrentModeName()).toBe('point');
});
```

### E2E Tests (`e2e/mode-bugs.spec.js`)

**Test User Workflows Across Modes**:
```javascript
test('typing starts EnterMode, arrow commits and returns to Ready', async ({ page }) => {
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('Test');

  await expect(page.locator('[data-testid="mode-indicator"]')).toHaveText('Enter');

  await page.keyboard.press('ArrowRight');

  await expect(page.locator('[data-cell="A1"]')).toHaveText('Test');
  await expect(page.locator('[data-cell="B1"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-testid="mode-indicator"]')).toHaveText('Ready');
});
```

---

## Extension Points

### Adding a New Mode

1. **Create Mode Class**:
```javascript
// js/modes/MyNewMode.js
import AbstractMode from './AbstractMode.js';

export default class MyNewMode extends AbstractMode {
  getName() {
    return 'mynew';
  }

  handleIntent(intent, context) {
    if (intent === 'SOME_INTENT') {
      // Handle it
      return true;
    }
    return super.handleIntent(intent, context);
  }

  onEnter() {
    // Setup
  }

  onExit() {
    // Cleanup
  }
}
```

2. **Register in ModeManager**:
```javascript
// js/spreadsheet.js
import MyNewMode from './modes/MyNewMode.js';

this.modeManager.registerMode('mynew', MyNewMode);
```

3. **Add Transitions**:
```javascript
// In existing mode, trigger new mode:
this.requestModeSwitch('mynew');
```

4. **Add Tests**:
```javascript
// tests/modes/MyNewMode.test.js
import MyNewMode from '../js/modes/MyNewMode.js';
// ... tests
```

---

### Adding a New Intent

1. **Define Intent** (`js/modes/Intents.js`):
```javascript
export const MY_NEW_INTENT = 'MY_NEW_INTENT';

export function createMyNewIntentContext(param) {
  return { param };
}
```

2. **Map Event to Intent** (`js/ui/InputController.js`):
```javascript
if (event.key === 'SomeKey') {
  const context = createMyNewIntentContext(value);
  this.modeManager.handleIntent(MY_NEW_INTENT, context);
}
```

3. **Handle in Modes**:
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

## Common Patterns

### Pattern 1: Mode-Specific Action + Shared Navigation

```javascript
// EnterMode: Commit then navigate
handleIntent(intent, context) {
  if (intent === 'NAVIGATE') {
    this.commitEdit();  // Mode-specific action
    super.handleIntent(intent, context);  // Shared navigation
    this.requestModeSwitch('ready');
    return true;
  }
}
```

### Pattern 2: Conditional Mode Switching

```javascript
// ReadyMode: Switch based on input character
handleIntent(intent, context) {
  if (intent === 'INPUT') {
    if (context.char === '=' || context.char === '+') {
      this.requestModeSwitch('point');
    } else {
      this.requestModeSwitch('enter');
    }
    return true;
  }
}
```

### Pattern 3: Delegating to Browser

```javascript
// EditMode: Let browser handle text cursor
handleIntent(intent, context) {
  if (intent === 'NAVIGATE') {
    return false;  // Browser handles arrow keys
  }
}
```

---

## Performance Considerations

### Mode Instance Caching
- Modes are created once and reused
- No performance penalty for mode switching
- Lazy instantiation (created on first use)

### Intent Handling Performance
- Intent delegation is fast (single function call)
- No conditional spaghetti (O(1) mode lookup)
- Browser defaults when mode returns `false`

### Memory Footprint
- 4 mode instances (lightweight)
- No state stored in modes
- State lives in managers (would exist anyway)

---

## Debugging

### Debug Logging

Enable debug mode in browser console:
```javascript
sessionStorage.setItem('vsheet-debug', 'true');
```

Logs show:
- Mode transitions: "Entering mode: edit", "Exiting mode: ready"
- Intent handling: "Handling intent: NAVIGATE {direction: 'right'}"
- Mode decisions: "Formula trigger detected, switching to Point mode"

### Mode Indicator

Status bar shows current mode:
- "Ready" - ReadyMode
- "Enter" - EnterMode
- "Edit" - EditMode
- "Point" - PointMode

### Common Issues

**Issue**: Arrow keys not working in edit
**Cause**: EditMode returns `false` for NAVIGATE (correct behavior)
**Fix**: Press Enter to commit, or use F2 to switch modes

**Issue**: Formula reference not updating
**Cause**: In EditMode, not PointMode
**Fix**: Press F2 to switch to PointMode for point-and-click

**Issue**: Mode stuck in wrong state
**Cause**: Lifecycle hook not called, or transition logic error
**Fix**: Check `onExit()` is called, verify transition conditions

---

## See Also

- **User Perspective**: `/docs/user-interactions/02-mode-behaviors.md`
- **Architecture Decision**: `/docs/adr/001-fsm-mode-system.md`
- **Intent Reference**: `/docs/api-reference/intent-vocabulary.md`
- **Test Scenarios**: `/docs/test-scenarios/data-entry.scenarios.md`, `/docs/test-scenarios/formula-building.scenarios.md`
- **Source Code**: `js/modes/` directory
