# ADR 001: Finite State Machine for User Interaction Modes

**Status**: Accepted and Implemented

**Date**: 2024 (implementation), 2025-12-07 (documented)

**Deciders**: Product team, based on UX requirements and architectural review

---

## Context

v-sheet is a web-based spreadsheet application with complex user interaction requirements. The same keystrokes need to produce different behaviors depending on the user's current context:

### Problem Scenarios

1. **Arrow Keys Have Multiple Meanings**:
   - **Navigating grid**: Arrow Right should move cell selection right
   - **Editing text**: Arrow Right should move text cursor right
   - **Building formula**: Arrow Right should update the cell reference in the formula
   - **Quick entry mode**: Arrow Right should commit the value AND move selection

2. **Mode-Specific Behavior Requirements**:
   - During quick data entry, arrow keys should commit and move (for speed)
   - During fine-tuned editing, arrow keys should provide full cursor control (for precision)
   - During formula building, arrow keys should enable point-and-click references (for usability)
   - During idle navigation, arrow keys should move selection (standard behavior)

3. **Complexity of Conditional Logic**:
   Without structure, the code would become:
   ```javascript
   function handleArrowKey(direction) {
     if (isEditingText) {
       // Move cursor
       moveCursor(direction);
     } else if (isBuildingFormula) {
       // Update reference
       updateFormulaReference(direction);
     } else if (isQuickEntry) {
       // Commit then move
       commitValue();
       moveSelection(direction);
     } else {
       // Normal navigation
       moveSelection(direction);
     }
   }
   ```
   This becomes unmaintainable as more modes and interactions are added.

4. **Testing Difficulty**:
   With conditional logic scattered throughout the codebase, testing each scenario requires mocking numerous state flags and coordinating multiple modules.

5. **Extension Challenges**:
   Adding new interaction modes (e.g., formatting mode, pivot mode) would require modifying many existing conditionals, increasing risk of regressions.

---

## Decision

We will implement a **Finite State Machine (FSM)** architecture with the following components:

### Core FSM Components

1. **ModeManager** - Central state machine controller
   - Manages current mode state
   - Handles mode transitions
   - Delegates all intents to the current mode
   - Calls lifecycle hooks (onEnter, onExit)

2. **AbstractMode** - Base class for all modes
   - Defines mode interface (handleIntent, onEnter, onExit)
   - Provides access to shared services (SelectionManager, EditorManager, etc.)
   - Implements Strategy Pattern for mode-specific behavior

3. **Concrete Modes** - Four primary modes
   - **ReadyMode**: Default idle/navigation state
   - **EnterMode**: Quick data entry with arrow commit
   - **EditMode**: Fine-tuned text editing with cursor control
   - **PointMode**: Formula building with point-and-click

4. **Intent Vocabulary** - Semantic action layer
   - Decouples raw DOM events from user actions
   - Platform-agnostic (Cmd vs Ctrl normalized)
   - Self-documenting (intent names express purpose)

5. **InputController** - Event gateway
   - Single point of contact for all keyboard/mouse events
   - Maps raw events to intents + context
   - Delegates to ModeManager

6. **NavigationMode** - Base class for navigable modes
   - Implements shared grid navigation logic
   - Inherited by ReadyMode, EnterMode, PointMode
   - EditMode extends AbstractMode directly (no grid navigation)

### Architecture Diagram

```
User Input (Keyboard/Mouse)
  ↓
InputController (Event Gateway)
  ↓
Intent + Context (Semantic Layer)
  ↓
ModeManager (FSM Controller)
  ↓
Current Mode (Strategy)
  ↓
Service Managers (SelectionManager, EditorManager, etc.)
  ↓
UI Update
```

### Mode Transitions

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

---

## Rationale

### Why FSM Over Alternatives?

#### Alternative 1: Boolean Flags
```javascript
let isEditing = false;
let isBuildingFormula = false;
let isQuickEntry = false;

// Problem: Many combinations possible, hard to reason about
// What if isEditing && isBuildingFormula?
```
**Rejected**: State explosion, unclear which flags take precedence, hard to test

---

#### Alternative 2: Event Handler Branching
```javascript
function handleKeyboard(event) {
  if (editorActive) {
    if (event.key === 'Escape') { /* ... */ }
    else if (isFormula) { /* ... */ }
    else { /* ... */ }
  } else {
    // Different logic
  }
}
```
**Rejected**: Conditional spaghetti, hard to extend, tightly coupled

---

#### Alternative 3: Separate Input Controllers per Context
```javascript
const gridNavigationController = new GridNavigationController();
const textEditController = new TextEditController();
const formulaController = new FormulaController();

// Problem: How to share logic? How to transition?
```
**Rejected**: Hard to share common logic (e.g., edge detection), awkward transitions

---

### Why FSM is Better

1. **Clear State Model**: At any time, the system is in exactly ONE mode
2. **Separation of Concerns**: Each mode handles only its own behavior
3. **Testability**: Modes can be tested in isolation with mock dependencies
4. **Extensibility**: Adding a new mode doesn't require modifying existing modes
5. **Shared Logic**: NavigationMode base class provides reusable grid navigation
6. **Self-Documenting**: Mode names express user context (Ready, Enter, Edit, Point)

---

## Consequences

### Positive

1. **Clean Architecture**
   - Each mode is a focused, single-responsibility class
   - No conditional logic scattered across the codebase
   - Clear boundaries between modes

2. **Easy to Test**
   - Unit test each mode independently
   - Mock SelectionManager, EditorManager, etc.
   - Verify mode transitions with simple assertions

3. **Easy to Extend**
   - Add new mode: Create class extending AbstractMode
   - Register in ModeManager
   - No changes to existing modes required

4. **Shared Logic Reuse**
   - NavigationMode provides edge detection, selection extension
   - ReadyMode, EnterMode, PointMode inherit this logic
   - EditMode opts out (no grid navigation)

5. **Intent Vocabulary Benefits**
   - Platform-agnostic (Cmd vs Ctrl normalized)
   - Self-documenting code (intent names explain purpose)
   - Testable without DOM events

6. **Lifecycle Hooks**
   - `onEnter()` for setup (e.g., activate editor)
   - `onExit()` for cleanup (e.g., deactivate editor)
   - Clear transition points

7. **Delegation Benefits**
   - EditorManager becomes "dumb" DOM controller
   - Business logic lives in modes
   - UI modules focus on rendering, not behavior

### Negative

1. **More Indirection**
   - Input → InputController → ModeManager → Mode → Manager
   - More layers than direct event handling
   - **Mitigation**: But each layer has clear responsibility

2. **Learning Curve**
   - New developers need to understand FSM concept
   - More classes to navigate than simple event handlers
   - **Mitigation**: Excellent documentation (this ADR, user-interactions docs)

3. **Potential for Mode Bloat**
   - Risk of creating too many modes for minor variations
   - **Mitigation**: Use mode subclassing (NavigationMode) to share logic

4. **State Transition Complexity**
   - Need to carefully manage mode lifecycle
   - Must ensure cleanup in `onExit()` always happens
   - **Mitigation**: ModeManager guarantees lifecycle hook calls

5. **Debugging Challenges**
   - More indirection can make debugging harder
   - Need to trace through intent creation and mode handling
   - **Mitigation**: Debug logging in SessionStorage (vsheet-debug flag)

---

## Implementation Details

### Mode Lifecycle

```javascript
// ModeManager.switchMode(newModeName)
if (this.currentMode) {
  this.currentMode.onExit();  // Cleanup old mode
}

this.currentMode = this.modes[newModeName];

if (this.currentMode) {
  this.currentMode.onEnter();  // Setup new mode
}
```

**Guarantee**: `onExit()` always called before `onEnter()` of next mode

---

### Intent Flow Example

```javascript
// 1. InputController receives event
handleKeyDown(event) {
  const intent = this.mapEventToIntent(event);
  const context = this.createContext(intent, event);
  this.modeManager.handleIntent(intent, context);
}

// 2. ModeManager delegates to current mode
handleIntent(intent, context) {
  return this.currentMode.handleIntent(intent, context);
}

// 3. Mode handles intent
// ReadyMode.js
handleIntent(intent, context) {
  if (intent === 'NAVIGATE') {
    this.selectionManager.moveSelection(context.direction, context.shift);
    return true;  // Handled
  }
  return false;  // Not handled
}
```

---

### Shared Logic via Inheritance

```javascript
// NavigationMode.js (base class)
class NavigationMode extends AbstractMode {
  handleIntent(intent, context) {
    if (intent === 'NAVIGATE') {
      if (context.ctrl) {
        this.selectionManager.jumpToEdge(context.direction, context.shift);
      } else {
        this.selectionManager.moveSelection(context.direction, context.shift);
      }
      return true;
    }
    return false;
  }
}

// ReadyMode.js (inherits navigation)
class ReadyMode extends NavigationMode {
  // Gets jumpToEdge, moveSelection logic for free
}

// EditMode.js (no navigation)
class EditMode extends AbstractMode {
  // Does NOT inherit NavigationMode
  // Arrow keys return false → browser default
}
```

---

## Validation

### Stress Tests Passed

The FSM architecture handles complex scenarios elegantly:

**Scenario 1: Cmd+Shift+Right in PointMode**
- Intent: NAVIGATE with {direction: 'right', shift: true, ctrl: true}
- PointMode inherits NavigationMode.jumpToEdge()
- PointMode adds post-navigation hook to update formula reference
- Result: Formula updates to range (e.g., =A1:A50)

**Scenario 2: Arrow Right in EnterMode**
- Intent: NAVIGATE with {direction: 'right'}
- EnterMode.handleIntent() detects arrow → commit first
- Then calls super.handleIntent() for navigation
- Result: Value commits, selection moves right, mode switches to Ready

**Scenario 3: Escape in Any Editing Mode**
- Intent: CANCEL
- Each mode implements handleIntent(CANCEL) → discard changes, → Ready
- No command added to history
- Result: Clean cancellation without undo entry

---

## Metrics

### Code Quality Improvements

**Before FSM** (hypothetical):
- InputController: 1500 lines of conditional logic
- Event handlers scattered across 10+ files
- 50+ conditional branches for mode detection
- Difficult to test specific scenarios

**After FSM**:
- ModeManager: ~150 lines (clean coordinator)
- AbstractMode: ~50 lines (interface)
- Each mode: 100-200 lines (focused)
- InputController: ~300 lines (just event mapping)
- NavigationMode: ~150 lines (shared logic)

**Total**: More files, but each is focused and testable

---

### Testing Improvements

**Mode Tests** (Vitest):
```javascript
// Simple, isolated tests
test('ReadyMode handles NAVIGATE', () => {
  const mode = new ReadyMode(mockContext);
  const result = mode.handleIntent('NAVIGATE', {direction: 'right', ...});
  expect(result).toBe(true);
  expect(mockSelectionManager.moveSelection).toHaveBeenCalled();
});
```

**E2E Tests** (Playwright):
```javascript
// Test mode transitions
test('typing starts EnterMode', async ({ page }) => {
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('Test');
  await expect(page.locator('[data-testid="mode-indicator"]')).toHaveText('Enter');
});
```

---

## Related Decisions

- **ADR 002**: Web Worker for Formula Engine (complements FSM by isolating calculation)
- **ADR 003**: Command Pattern for History (provides undo/redo for mode actions)

---

## Future Considerations

### Potential New Modes

1. **FormatMode** (Epic 3)
   - Bulk formatting operations on selected cells
   - Paint format tool

2. **PivotMode** (Epic 9)
   - Interactive pivot table building
   - Drag-and-drop field configuration

3. **ChartMode** (Future)
   - Visual chart editor
   - Data range selection for charts

### Mode Composition

For complex features, consider **mode composition** instead of creating many modes:
- Base mode + strategy objects
- Mode stack (temporary modes that return to previous)

Example: "Insert Range" could be a temporary mode that returns to Ready after operation.

---

## References

- **Design Patterns**: Gang of Four, State Pattern
- **Inspiration**: Vim's modal editing (Normal, Insert, Visual modes)
- **Implementation**: `js/modes/` directory
- **Documentation**: `/docs/user-interactions/02-mode-behaviors.md`
- **Tests**: `/tests/modes/`, `/e2e/mode-bugs.spec.js`

---

## Conclusion

The FSM architecture successfully addresses the complex interaction requirements of v-sheet. While it introduces more indirection than direct event handling, the benefits in testability, extensibility, and code organization far outweigh the costs.

The stress test scenarios demonstrate that the architecture scales to handle complex, real-world user interactions. The intent vocabulary provides a clean semantic layer that decouples hardware events from user behavior.

This decision has proven successful in implementation and should be maintained as the core interaction architecture going forward.

---

**Status**: ✅ **ACCEPTED** and **FULLY IMPLEMENTED**

**Last Reviewed**: 2025-12-07
