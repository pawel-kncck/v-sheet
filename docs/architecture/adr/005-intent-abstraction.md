# ADR 005: Intent Abstraction for User Input

**Status**: Accepted
**Date**: 2025-12-12
**Context**: User input handling architecture

---

## Context

Modern applications receive user input from multiple sources: keyboard, mouse, touch, voice commands, etc. Each input type has platform-specific variations (e.g., Cmd vs Ctrl on macOS vs Windows).

The challenge: How do we handle user input in a way that:
1. Separates "what the user pressed" from "what the user wants to do"
2. Works consistently across platforms
3. Allows easy remapping of shortcuts
4. Makes mode-specific behavior easy to implement

---

## Decision

We implemented an **Intent Abstraction Layer**:

1. **Raw Events** → **InputController** → **Intents + Context** → **Mode** → **Action**

2. Intents are semantic actions (e.g., `NAVIGATE`, `COMMIT`, `DELETE`)

3. Context objects carry the details (e.g., `{ direction: 'up', shift: true }`)

4. Modes handle intents without knowing about specific keys

---

## Implementation

### Intents Definition

```javascript
// js/modes/Intents.js

export const INTENTS = Object.freeze({
  // Navigation
  NAVIGATE: 'NAVIGATE',
  JUMP_TO_EDGE: 'JUMP_TO_EDGE',

  // Editing Lifecycle
  EDIT_START: 'EDIT_START',
  COMMIT: 'COMMIT',
  CANCEL: 'CANCEL',

  // Text Input
  INPUT: 'INPUT',

  // Deletion
  DELETE: 'DELETE',

  // History
  UNDO: 'UNDO',
  REDO: 'REDO',

  // Clipboard
  COPY: 'COPY',
  PASTE: 'PASTE',
  CUT: 'CUT',

  // Selection
  SELECT_ALL: 'SELECT_ALL',
  CELL_SELECT: 'CELL_SELECT',
  HEADER_SELECT: 'HEADER_SELECT',

  // Formatting
  FORMAT_BOLD: 'FORMAT_BOLD',
  FORMAT_ITALIC: 'FORMAT_ITALIC',

  // Formula Editing
  TOGGLE_REFERENCE: 'TOGGLE_REFERENCE',
});
```

### Context Factories

```javascript
// Strongly-typed context creation with validation

export function createNavigateContext(direction, shift = false) {
  if (!Object.values(DIRECTIONS).includes(direction)) {
    throw new Error(`Invalid direction: ${direction}`);
  }
  return Object.freeze({ direction, shift });
}

export function createCommitContext(moveDirection = COMMIT_MOVES.DOWN) {
  if (!Object.values(COMMIT_MOVES).includes(moveDirection)) {
    throw new Error(`Invalid moveDirection: ${moveDirection}`);
  }
  return Object.freeze({ moveDirection });
}

export function createCellSelectContext(coords, shift = false, ctrl = false) {
  if (!coords || typeof coords.row !== 'number') {
    throw new Error('Invalid coords');
  }
  return Object.freeze({
    coords: Object.freeze({ ...coords }),
    shift,
    ctrl,
  });
}
```

### InputController Mapping

```javascript
// js/ui/InputController.js

_handleKeyDown(event) {
  const key = event.key;
  const isModifier = this._isCmdOrCtrl(event);
  const isShift = event.shiftKey;

  // Map raw key to intent
  const mapping = this._mapKeyToIntent(key, isModifier, isShift);

  if (mapping) {
    event.preventDefault();
    this.modeManager.handleIntent(mapping.intent, mapping.context);
  }
}

_mapKeyToIntent(key, isModifier, isShift) {
  // Navigation
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
    const direction = key.replace('Arrow', '').toLowerCase();
    if (isModifier) {
      return {
        intent: INTENTS.JUMP_TO_EDGE,
        context: createJumpContext(direction, isShift)
      };
    }
    return {
      intent: INTENTS.NAVIGATE,
      context: createNavigateContext(direction, isShift)
    };
  }

  // Clipboard (platform-aware)
  if (isModifier) {
    if (key === 'c') return { intent: INTENTS.COPY, context: {} };
    if (key === 'v') return { intent: INTENTS.PASTE, context: {} };
    if (key === 'x') return { intent: INTENTS.CUT, context: {} };
    if (key === 'z') return { intent: INTENTS.UNDO, context: {} };
    if (key === 'y') return { intent: INTENTS.REDO, context: {} };
    if (key === 'b') return { intent: INTENTS.FORMAT_BOLD, context: {} };
    if (key === 'i') return { intent: INTENTS.FORMAT_ITALIC, context: {} };
  }

  // ... more mappings
}

// Platform-aware modifier check
_isCmdOrCtrl(event) {
  return navigator.platform.includes('Mac') ? event.metaKey : event.ctrlKey;
}
```

### Mode Handling

```javascript
// js/modes/NavigationMode.js

handleIntent(intent, context) {
  switch (intent) {
    case INTENTS.NAVIGATE:
      return this._handleNavigate(context);

    case INTENTS.JUMP_TO_EDGE:
      return this._handleJumpToEdge(context);

    case INTENTS.COPY:
      return this._handleCopy();

    // ... handlers know nothing about keys
  }
}
```

---

## Alternatives Considered

### 1. Direct Event Handling in Modes

Handle raw DOM events directly in mode classes.

**Pros**:
- Simpler initial implementation
- No abstraction overhead

**Cons**:
- Platform differences scattered across codebase
- Key mapping logic duplicated
- Hard to test without DOM

**Decision**: Rejected due to lack of separation of concerns.

### 2. Event Delegation with Key Maps

Use configurable key maps per mode.

**Pros**:
- Configurable shortcuts
- Mode-specific mappings

**Cons**:
- Still couples modes to key concepts
- Harder to share common mappings

**Decision**: Partially adopted - InputController serves as single key map.

### 3. Command Pattern Only

Use Command objects for all actions.

**Pros**:
- Already using for history
- Consistent pattern

**Cons**:
- Overkill for navigation (no undo needed)
- Higher overhead for simple actions

**Decision**: Use Commands for state changes, Intents for input handling.

---

## Consequences

### Positive

1. **Platform Abstraction**: Cmd vs Ctrl handled in one place
2. **Testability**: Modes can be tested by sending intents directly
3. **Remappability**: Future keyboard customization is straightforward
4. **Consistency**: All input flows through the same pipeline
5. **Debuggability**: Intent log shows semantic actions, not raw keys

### Negative

1. **Extra Layer**: More code between event and action
2. **Learning Curve**: Developers must understand intent system
3. **Context Overhead**: Creating context objects for every keypress

### Mitigation

- **Extra Layer**: The abstraction pays off when adding new input methods
- **Learning Curve**: Well-documented intent catalog in `Intents.js`
- **Context Overhead**: `Object.freeze()` prevents mutations, contexts are small

---

## Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        User Input                             │
│                                                               │
│     Keyboard          Mouse            Touch (future)         │
│        │                │                   │                 │
└────────┼────────────────┼───────────────────┼─────────────────┘
         │                │                   │
         ▼                ▼                   ▼
┌──────────────────────────────────────────────────────────────┐
│                    InputController                            │
│                                                               │
│   • Normalizes platform differences                          │
│   • Maps raw events to intents                               │
│   • Creates typed context objects                            │
│                                                               │
└─────────────────────────┬────────────────────────────────────┘
                          │
                          │ (intent, context)
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                     ModeManager                               │
│                                                               │
│   • Delegates to current mode                                │
│   • Handles mode transitions                                 │
│                                                               │
└─────────────────────────┬────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                    Current Mode                               │
│                                                               │
│   ReadyMode: Navigation, start editing, clipboard            │
│   EditMode:  Text cursor, text operations                    │
│   EnterMode: Quick entry, commit on navigation              │
│   PointMode: Formula building, reference insertion          │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Related Decisions

- **ADR 001**: Mode System Architecture
- **ADR 003**: Command Pattern for History

---

## References

- Intent pattern inspiration: Game engines (input action maps)
- Context factory pattern: React context, Redux action creators
- Implementation: `js/modes/Intents.js`, `js/ui/InputController.js`
