# Input Controller Architecture

**Last Updated**: 2025-12-11

This document describes the InputController, which serves as the single point of contact for all DOM input events in v-sheet.

---

## Responsibility

The InputController acts as an **Event Gateway** that captures raw DOM events, normalizes platform differences, and translates them into semantic intents for the mode system.

**File**: `js/ui/InputController.js`

---

## What It Does

- Captures keyboard and mouse events from the container element
- Normalizes platform differences (Cmd on Mac = Ctrl on Windows)
- Maps raw events to semantic intents (ArrowRight → NAVIGATE)
- Creates context objects with relevant event data
- Delegates intents to ModeManager
- Allows browser default behavior when mode doesn't handle intent

## What It Doesn't Do

- Does NOT contain business logic for handling intents (modes do)
- Does NOT decide what action to take (modes decide)
- Does NOT know about specific modes or their behaviors
- Does NOT manipulate UI directly

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        DOM Events                           │
│  (keydown, mousedown on container and cell-editor)          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      InputController                         │
│  ┌─────────────────┐  ┌──────────────────────────────────┐  │
│  │ _handleKeyDown  │  │  _normalizeModifiers             │  │
│  │ _handleMouseDown│  │  ctrl = metaKey || ctrlKey       │  │
│  └─────────────────┘  └──────────────────────────────────┘  │
│                              │                               │
│                              ▼                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              _mapKeyToIntent(key, modifiers)           │  │
│  │  ArrowRight → NAVIGATE { direction: 'right' }          │  │
│  │  Ctrl+Z → UNDO                                         │  │
│  │  'a' → INPUT { char: 'a' }                             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│           ModeManager.handleIntent(intent, context)          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                     Mode handles or returns false
                              │
                              ▼
              If handled: event.preventDefault()
              If not handled: browser default behavior
```

---

## Key Methods

### `constructor(container, modeManager)`

Creates a new InputController.

```javascript
const inputController = new InputController(
  document.getElementById('grid-container'),
  modeManager
);
```

### `attach()`

Attaches all DOM event listeners. Called during application initialization.

```javascript
inputController.attach();
// Now listening for keydown on container and cell-editor
// Now listening for mousedown on container
```

### `detach()`

Removes all DOM event listeners. Used for cleanup.

```javascript
inputController.detach();
```

### `_normalizeModifiers(event)`

Normalizes modifier keys across platforms.

```javascript
// On Mac: event.metaKey = true (Cmd pressed)
// On Windows: event.ctrlKey = true (Ctrl pressed)
// Both normalize to: { ctrl: true, shift: false, alt: false }
```

### `_mapKeyToIntent(key, modifiers, event)`

Maps a key + modifiers combination to an intent and context.

Returns `null` if no intent is mapped (allows browser default).

---

## Intent Mappings

### Navigation

| Key | Modifiers | Intent | Context |
|-----|-----------|--------|---------|
| ArrowUp/Down/Left/Right | None | `NAVIGATE` | `{ direction, shift: false }` |
| Arrow keys | Shift | `NAVIGATE` | `{ direction, shift: true }` |
| Arrow keys | Ctrl/Cmd | `JUMP_TO_EDGE` | `{ direction, shift: false }` |
| Arrow keys | Ctrl+Shift | `JUMP_TO_EDGE` | `{ direction, shift: true }` |

### Commit/Cancel

| Key | Intent | Context |
|-----|--------|---------|
| Enter | `COMMIT` | `{ moveDirection: 'down' }` |
| Tab | `COMMIT` | `{ moveDirection: 'right' }` |
| Escape | `CANCEL` | `null` |

### Editing

| Key | Intent | Context |
|-----|--------|---------|
| F2 | `EDIT_START` | `{ source: 'keyboard' }` |
| F4 | `TOGGLE_REFERENCE` | `null` |
| Delete/Backspace | `DELETE` | `{ key: 'delete' or 'backspace' }` |
| Any single char | `INPUT` | `{ char: 'a' }` |

### Clipboard

| Key | Modifiers | Intent |
|-----|-----------|--------|
| C | Ctrl/Cmd | `COPY` |
| V | Ctrl/Cmd | `PASTE` |
| X | Ctrl/Cmd | `CUT` |
| A | Ctrl/Cmd | `SELECT_ALL` |

### History

| Key | Modifiers | Intent |
|-----|-----------|--------|
| Z | Ctrl/Cmd | `UNDO` |
| Y | Ctrl/Cmd | `REDO` |
| Z | Ctrl/Cmd+Shift | `REDO` |

### Formatting

| Key | Modifiers | Intent |
|-----|-----------|--------|
| B | Ctrl/Cmd | `FORMAT_BOLD` |
| I | Ctrl/Cmd | `FORMAT_ITALIC` |

### Mouse

| Event | Intent | Context |
|-------|--------|---------|
| mousedown on cell | `CELL_SELECT` | `{ coords: {row, col}, shift, ctrl }` |

---

## Event Handling Flow

### Keyboard Event

```javascript
_handleKeyDown(event) {
  // 1. Normalize modifiers
  const modifiers = this._normalizeModifiers(event);
  // { ctrl: true, shift: false, alt: false }

  // 2. Map to intent
  const intentData = this._mapKeyToIntent(event.key, modifiers, event);
  // { intent: 'COPY', context: null }

  if (!intentData) {
    return; // No mapping, allow browser default
  }

  // 3. Delegate to ModeManager
  const handled = this._modeManager.handleIntent(
    intentData.intent,
    intentData.context
  );

  // 4. Prevent default if handled
  if (handled) {
    event.preventDefault();
    event.stopPropagation();
  }
}
```

### Mouse Event

```javascript
_handleMouseDown(event) {
  // 1. Find clicked cell
  const cellElement = event.target.closest('.cell');
  if (!cellElement) return;

  // 2. Extract coordinates
  const row = parseInt(cellElement.dataset.row, 10);
  const col = parseInt(cellElement.dataset.col, 10);

  // 3. Create CELL_SELECT intent
  const handled = this._modeManager.handleIntent(
    INTENTS.CELL_SELECT,
    createCellSelectContext({ row, col }, shift, ctrl)
  );

  if (handled) {
    event.preventDefault();
  }
}
```

---

## Platform Normalization

The InputController treats Cmd (Mac) and Ctrl (Windows/Linux) as equivalent:

```javascript
_normalizeModifiers(event) {
  return {
    ctrl: event.ctrlKey || event.metaKey,  // Cmd = Ctrl
    shift: event.shiftKey,
    alt: event.altKey,
    meta: event.metaKey
  };
}
```

This allows mode code to be platform-agnostic:

```javascript
// In mode:
if (context.ctrl) {
  // Works on both Mac (Cmd pressed) and Windows (Ctrl pressed)
}
```

---

## Dual Event Listeners

The InputController attaches listeners to two elements:

1. **Container** (`#grid-container`): For grid-level events
2. **Cell Editor** (`#cell-editor`): For events during editing

This ensures keyboard events are captured whether the grid or editor has focus.

```javascript
attach() {
  this._container.addEventListener('keydown', this._boundHandleKeyDown);
  this._container.addEventListener('mousedown', this._boundHandleMouseDown);

  if (this._cellEditor) {
    this._cellEditor.addEventListener('keydown', this._boundHandleKeyDown);
  }
}
```

---

## Allowing Browser Defaults

When a mode returns `false` from `handleIntent()`, the InputController does NOT call `event.preventDefault()`. This allows browser default behavior.

**Example**: In EditMode, arrow keys should move the text cursor:

```javascript
// EditMode.handleIntent()
case INTENTS.NAVIGATE:
  return false; // Don't handle - let browser move cursor
```

---

## Debug Logging

Enable debug mode to see intent mappings:

```javascript
sessionStorage.setItem('vsheet-debug', 'true');
```

Output:
```
[InputController] Key "ArrowRight" → Intent "NAVIGATE"
[InputController] Intent handled: true
```

---

## See Also

- Intent vocabulary: `/docs/manuals/api-reference/intent-vocabulary.md`
- Mode system: `/docs/architecture/01-mode-system.md`
- User workflows: `/docs/manuals/user-workflows.md`
