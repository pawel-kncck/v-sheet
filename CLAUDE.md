# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

v-sheet is a modern web spreadsheet application built with vanilla JavaScript and Flask. It features a multi-threaded formula engine, persistent file management, and a sophisticated finite state machine architecture for managing user interactions.

## Development Commands

### Running the Application

```bash
# Start the Flask server (serves both backend API and frontend)
python server/app.py
```

The application will be available at `http://localhost:5000`. The Flask server automatically serves static files and provides the REST API.

### Testing

```bash
# Run unit tests (Vitest)
npm test

# Run unit tests with UI
npm run test:ui

# Run unit tests with coverage
npm run test:coverage

# Run E2E tests (Playwright - automatically starts Flask server)
npm run e2e
```

### Debugging

Enable verbose debug logs in the browser console:
```javascript
sessionStorage.setItem('vsheet-debug', 'true');
```

Disable with: `sessionStorage.removeItem('vsheet-debug')`

## High-Level Architecture

### 1. Mode System (Finite State Machine) - FULLY IMPLEMENTED

The application uses a **Mode-based FSM** to manage different interaction states. This is the core architectural pattern:

- **ModeManager** (`js/modes/ModeManager.js`) - Central FSM controller that:
  - Registers mode classes
  - Manages mode transitions with lifecycle hooks (`onEnter`, `onExit`)
  - Delegates all intent handling to the current mode
  - Caches mode instances (lazy instantiation)

- **AbstractMode** (`js/modes/AbstractMode.js`) - Base class implementing the Strategy Pattern
  - All modes inherit from this
  - Provides lifecycle hooks and intent handling interface
  - Access to shared services (SelectionManager, EditorManager, etc.)

- **Intent System** (`js/modes/Intents.js`) - Semantic vocabulary layer
  - Decouples raw DOM events from semantic user actions
  - Enables platform-agnostic behavior (e.g., Cmd vs Ctrl)
  - Factory functions create strongly-typed context objects

- **InputController** (`js/ui/InputController.js`) - Event Gateway
  - Single point of contact for DOM keyboard/mouse events
  - Normalizes platform differences (Cmd vs Ctrl)
  - Maps raw events to intents
  - Delegates to ModeManager

- **NavigationMode** (`js/modes/NavigationMode.js`) - Base class for navigable modes
  - Extends AbstractMode
  - Provides common navigation logic (arrow keys, jump to edge, etc.)
  - Handles clipboard operations (copy/paste/cut)
  - Handles undo/redo
  - ReadyMode, EnterMode, and PointMode extend this

**Implemented Modes:**
- **ReadyMode** (`js/modes/ReadyMode.js`) - Default idle/navigation state
- **EditMode** (`js/modes/EditMode.js`) - In-cell editing with text cursor movement
- **EnterMode** (`js/modes/EnterMode.js`) - Quick entry mode (arrow keys commit and move)
- **PointMode** (`js/modes/PointMode.js`) - Formula building mode (arrow keys update references)

**Key principle**: User interactions flow as: `Raw Event → InputController → Intent + Context → ModeManager → Current Mode → Action`

**Important**: EditorManager is now a "dumb" DOM controller - it only positions and shows/hides the editor. All business logic is handled by modes.

### 2. Formula Engine Architecture

The formula engine runs in a **Web Worker** (`js/engine/formula-worker.js`) for non-blocking calculations:

- **FormulaEngine** (`js/engine/FormulaEngine.js`) - Main facade coordinating all subsystems
- **Tokenizer** (`js/engine/parser/Tokenizer.js`) - Lexical analysis (string → tokens)
- **Parser** (`js/engine/parser/Parser.js`) - Syntactic analysis (tokens → AST)
  - Uses recursive descent for operator precedence
  - Grammar: `parsePrimary → parseUnary → parsePower → parseMultiplication → parseAddition → parseConcatenation → parseComparison`
- **Evaluator** (`js/engine/Evaluator.js`) - Walks AST and computes results
- **DependencyGraph** (`js/engine/DependencyGraph.js`) - Tracks cell relationships and ensures correct recalculation order
- **FunctionRegistry** (`js/engine/FunctionRegistry.js`) - Dynamic function lookup (universal parser doesn't hardcode function names)

**Key principle**: The parser is universal - it recognizes `IDENTIFIER` tokens as potential function names without knowing what they are. The FunctionRegistry provides the implementation at evaluation time.

### 3. Module Structure

- **Spreadsheet** (`js/spreadsheet.js`) - Top-level coordinator
  - Wires together all UI modules
  - Manages file loading/persistence
  - Handles worker communication
  - Entry point for the application

- **UI Modules** (`js/ui/`)
  - `GridRenderer` - Canvas rendering and DOM management
  - `SelectionManager` - Cell/range selection state and rendering
  - `EditorManager` - In-cell editing lifecycle
  - `GridResizer` - Column/row resize interactions
  - `ClipboardManager` - Copy/paste operations

- **History** (`js/history/`)
  - `HistoryManager` - Undo/redo stack
  - `Command` - Base class using Command Pattern
  - `commands/` - Concrete commands (UpdateCellsCommand, MoveRangeCommand, etc.)

- **File Management**
  - `js/file-manager.js` - Client-side API wrapper and state
  - `server/app.py` - Flask REST API for persistence
  - Data stored as JSON in `data/files/`

### 4. Data Flow

**Cell Update Flow**:
1. User edits cell → Mode handles commit intent
2. UpdateCellsCommand created and executed
3. Command updates FileManager state
4. FileManager posts message to FormulaWorker
5. Worker parses, evaluates, updates dependency graph
6. Worker posts results back to main thread
7. UI updates with new values
8. Autosave triggers (debounced) → Flask API

**Selection Flow**:
1. User clicks cell → InputController creates CELL_SELECT intent
2. ModeManager delegates to current mode
3. Mode calls SelectionManager methods
4. SelectionManager updates state and triggers render
5. GridRenderer draws selection borders

## Testing Philosophy

- **Unit tests** (`tests/`) use Vitest with jsdom
  - Test individual modules in isolation
  - Mock dependencies where needed
  - Focus on parser, evaluator, and utility logic

- **E2E tests** (`e2e/`) use Playwright
  - Test full user workflows
  - Playwright config automatically starts/stops Flask server
  - Test cross-component interactions

## Important Implementation Notes

### Mode System and State Transitions

**Mode Transitions:**
```
Ready → Enter: User types regular character
Ready → Point: User types formula trigger (=, +, -)
Ready → Edit: User presses F2 or double-clicks cell

Enter → Ready: User commits with Enter/Tab
Enter → Edit: User presses F2 for fine-tuning
Enter → Ready (via navigation): Arrow keys commit then move

Edit → Ready: User commits with Enter/Tab or Escape

Point → Edit: User types letters/numbers (for fine-tuning)
Point → Ready: User commits with Enter/Tab or Escape
Point → Point: Arrow keys/mouse update formula references
```

**When adding new interaction behaviors:**
1. Check if it fits an existing mode or requires a new mode
2. Define new intents in `Intents.js` if needed
3. Update mode's `handleIntent()` method
4. Follow lifecycle: `onEnter()` for setup, `onExit()` for cleanup
5. Modes access services through `this._context` (selectionManager, editorManager, etc.)

**Important architectural rules:**
- InputController handles ALL keyboard events - don't add event listeners elsewhere
- EditorManager is a "dumb" DOM controller - no business logic
- Modes are stateless between activations (state is in EditorManager, SelectionManager, etc.)
- Always use `this._requestModeSwitch()` to change modes, never set state directly

### Formula Parsing
The tokenizer/parser system is designed to be the foundation for future features like:
- Live formula preview (Epic 7 - Formula Building UX)
- Syntax highlighting
- Reference highlighting with colored borders

When working with formulas, always use the Web Worker API - never parse formulas on the main thread.

### Commands and History
All state-changing operations MUST use the Command Pattern:
1. Create a Command subclass implementing `execute()` and `undo()`
2. Execute via `HistoryManager.execute(command)`
3. Never modify state directly outside commands

### Web Worker Communication
The FormulaWorker uses a message-passing protocol:
- Main thread → Worker: `{ type: 'setValue' | 'deleteCell' | 'loadData', ... }`
- Worker → Main thread: `{ type: 'updates', cells: {...} }`

Always handle worker responses asynchronously.

## File API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/files` | List all spreadsheets |
| POST | `/api/files` | Create new spreadsheet |
| GET | `/api/files/<id>` | Load spreadsheet data |
| PUT | `/api/files/<id>` | Update spreadsheet (autosave) |
| DELETE | `/api/files/<id>` | Delete spreadsheet |
| GET | `/api/recent` | Get most recently modified file |
| GET | `/health` | Health check for E2E tests |

## Common Development Workflows

### Running a Single Test

```bash
# Unit test - Vitest allows filtering by file or test name
npm test -- Tokenizer.test.js

# E2E test - Playwright supports --grep
npm run e2e -- --grep "formula calculation"
```

### Adding a New Formula Function

1. Add implementation in `js/engine/functions/math.js` or `logical.js`
2. Register in `js/engine/functions/register.js`
3. Add tests in `tests/engine/functions/`
4. No parser changes needed (universal parser)

### Adding a New Mode

1. Create class extending `AbstractMode` (or `NavigationMode` if navigation is needed) in `js/modes/`
2. Implement `getName()` and `handleIntent()`
3. Implement `onEnter()` and `onExit()` if setup/cleanup is needed
4. Register in ModeManager initialization in `Spreadsheet.js` constructor
5. Add tests in `tests/modes/`

### Debugging the Mode System

Enable debug logging to see mode transitions and intent handling:
```javascript
sessionStorage.setItem('vsheet-debug', 'true');
```

This will show:
- Mode transitions: "Entering mode", "Exiting mode"
- Intent handling: Key presses → Intent names → Mode responses
- Formula updates in PointMode
- Selection changes

The ModeManager also exposes `getCurrentModeName()` which can be called from the console to check the current state.
