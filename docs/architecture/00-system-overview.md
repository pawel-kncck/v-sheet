# v-sheet System Overview

**Last Updated**: 2025-12-07

This document provides a high-level overview of the v-sheet architecture. For detailed implementation, see the source code - this doc explains **what components do** and **how they interact**, not how they're implemented.

---

## Architecture at a Glance

v-sheet is built on three core architectural patterns:

1. **Finite State Machine (FSM)** for user interaction modes
2. **Web Worker** for non-blocking formula calculations
3. **Command Pattern** for undo/redo operations

```
┌─────────────────────────────────────────────────────────────┐
│                      Spreadsheet.js                         │
│                  (Top-level coordinator)                    │
│  - Wires together all modules                               │
│  - Manages file loading/persistence                         │
│  - Handles worker communication                             │
└─────────────────────────────────────────────────────────────┘
         │            │            │            │
         ▼            ▼            ▼            ▼
    ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
    │  Mode   │  │   UI    │  │ History │  │ Engine  │
    │ System  │  │ Modules │  │ Manager │  │ (Worker)│
    └─────────┘  └─────────┘  └─────────┘  └─────────┘
         │            │            │            │
    FSM with 4    Canvas       Command      Tokenizer
    modes:        rendering    pattern      → Parser
    Ready/Enter   Selection    Undo/redo    → Evaluator
    Edit/Point    Clipboard                 → DepGraph
```

---

## Component Responsibilities

### Core Coordinator

#### Spreadsheet.js
**Responsibility**: Top-level application coordinator - wires all modules together

**What it does**:
- Initializes all subsystems (ModeManager, SelectionManager, GridRenderer, etc.)
- Manages file lifecycle (load, save, autosave)
- Owns worker communication (main thread ↔ formula worker)
- Delegates intents to ModeManager
- Handles worker responses and updates UI

**What it doesn't do**:
- Business logic (delegated to modes)
- Direct DOM manipulation (delegated to UI modules)
- Formula parsing (delegated to worker)

---

### Mode System (FSM)

#### ModeManager
**Responsibility**: Central FSM controller - manages mode transitions and delegates intents

**What it does**:
- Registers mode instances (Ready, Enter, Edit, Point)
- Manages current mode state
- Delegates all intents to current mode
- Calls lifecycle hooks (onEnter, onExit) during transitions
- Lazy instantiation and caching of modes

**Data it owns**: Current mode name

**Files**: `js/modes/ModeManager.js`

---

#### AbstractMode
**Responsibility**: Base class for all modes - defines interface

**What it does**:
- Provides lifecycle hooks (onEnter, onExit)
- Defines handleIntent interface
- Gives modes access to services (SelectionManager, EditorManager, etc.)

**What subclasses implement**:
- `getName()` - Returns mode name
- `handleIntent(intent, context)` - Mode-specific behavior
- `onEnter()` / `onExit()` - Setup/cleanup (optional)

**Files**: `js/modes/AbstractMode.js`

---

#### NavigationMode
**Responsibility**: Base class for modes that need grid navigation

**What it does**:
- Implements shared navigation logic (arrow keys, jump to edge, extend selection)
- Provides `moveSelection(direction, shift)` and `jumpToEdge(direction, shift)`
- Delegates to SelectionManager for actual selection updates

**Subclasses**: ReadyMode, EnterMode, PointMode

**Files**: `js/modes/NavigationMode.js`

---

#### ReadyMode
**Responsibility**: Default idle/navigation state

**What it handles**:
- Grid navigation (arrow keys, Cmd+Arrow)
- Selection extension (Shift+Arrow, Cmd+Shift+Arrow)
- Clipboard operations (Cmd+C, Cmd+V, Cmd+X)
- Cell deletion (Delete, Backspace)
- Mode transitions (typing triggers Enter or Point)

**When active**: User is navigating spreadsheet, no editing in progress

**Files**: `js/modes/ReadyMode.js`

---

#### EnterMode
**Responsibility**: Quick data entry mode

**What it handles**:
- Appending characters to editor
- **Arrow keys commit THEN move** (key feature)
- Tab/Enter commit and move
- F2 switches to EditMode
- Escape cancels

**When active**: User types a regular character (not formula trigger)

**Files**: `js/modes/EnterMode.js`

---

#### EditMode
**Responsibility**: Fine-grained text editing with cursor control

**What it handles**:
- Text input (delegates to browser for cursor movement)
- Commit on Enter/Tab
- Cancel on Escape
- Mode switches (type operator → PointMode in formula context)

**What it doesn't handle**:
- Arrow key navigation (returns `false`, delegates to browser)

**When active**: User presses F2, double-clicks, or Enter on filled cell

**Files**: `js/modes/EditMode.js`

---

#### PointMode
**Responsibility**: Visual formula building with point-and-click

**What it handles**:
- Arrow keys update formula references (don't navigate grid)
- Mouse clicks insert/update references
- Reference vs append logic (after operator = append, otherwise = replace)
- Range creation (Shift+Arrow, Shift+Click)
- Switch to Edit when typing letters/numbers

**When active**: User types formula trigger (=, +, -)

**Files**: `js/modes/PointMode.js`

---

#### InputController
**Responsibility**: Event gateway - converts DOM events to intents

**What it does**:
- Listens to keyboard and mouse events
- Normalizes platform differences (Cmd vs Ctrl)
- Creates intent + context objects
- Delegates to ModeManager
- Allows browser default if mode returns `false`

**Key principle**: Single point of contact for all input events

**Files**: `js/ui/InputController.js`

---

#### Intents.js
**Responsibility**: Semantic vocabulary for user actions

**What it provides**:
- Intent constants (NAVIGATE, INPUT, COMMIT, CANCEL, etc.)
- Context factory functions for each intent type
- Platform-agnostic action definitions

**Why it exists**: Decouples hardware events from semantic meaning

**Files**: `js/modes/Intents.js`

---

### UI Modules

#### GridRenderer
**Responsibility**: Canvas-based rendering and DOM management

**What it does**:
- Renders grid on HTML canvas
- Draws cell values, borders, gridlines
- Updates display when data changes
- Manages virtual scrolling for large datasets

**Data it doesn't own**: Cell values (owned by FileManager)

**Files**: `js/ui/GridRenderer.js`

---

#### SelectionManager
**Responsibility**: Tracks and renders cell selection state

**What it does**:
- Maintains active cell and selection ranges
- Renders selection borders and highlights
- Provides selection queries (getActiveCell, getRanges)
- Handles edge detection for jump navigation

**Data it owns**:
- Active cell (anchor)
- Selection ranges (array of {start, end})

**Files**: `js/ui/SelectionManager.js`

---

#### EditorManager
**Responsibility**: "Dumb" DOM controller for in-cell editor

**What it does**:
- Shows/hides editor overlay
- Positions editor over active cell
- Gets/sets editor content
- Manages editor DOM element

**What it doesn't do**:
- Business logic (delegated to modes)
- Decide when to commit (modes decide)

**Files**: `js/ui/EditorManager.js`

---

#### ClipboardManager
**Responsibility**: Copy/paste/cut operations

**What it does**:
- Stores copied cell data
- Applies paste to target cells
- Handles clipboard formatting (marching ants)
- Adjusts relative references on paste

**Commands it creates**:
- UpdateCellsCommand (for paste)
- CutCommand (for cut operations)

**Files**: `js/ui/ClipboardManager.js`

---

#### GridResizer
**Responsibility**: Column and row resize interactions

**What it does**:
- Detects resize handle hovers
- Handles drag interactions for resizing
- Creates ResizeCommand for undo/redo
- Updates visual display

**Files**: `js/ui/GridResizer.js`

---

### History System (Command Pattern)

#### HistoryManager
**Responsibility**: Undo/redo stack manager

**What it does**:
- Executes commands via `execute(command)`
- Maintains undo stack (up to 100 commands)
- Maintains redo stack (cleared on new action)
- Provides `undo()` and `redo()` methods

**Data it owns**:
- Undo stack (array of commands)
- Redo stack (array of commands)

**Files**: `js/history/HistoryManager.js`

---

#### Command (Base Class)
**Responsibility**: Interface for undo-able operations

**What subclasses implement**:
- `execute()` - Perform the action
- `undo()` - Revert the action

**Concrete commands**:
- UpdateCellsCommand - Cell data changes
- ResizeCommand - Column/row resizing
- MoveRangeCommand - Drag-to-move cells
- FormatRangeCommand - Cell formatting (planned)

**Files**: `js/history/Command.js`, `js/history/commands/`

---

### Formula Engine (Web Worker)

#### FormulaEngine
**Responsibility**: Main facade coordinating formula subsystems

**What it does**:
- Coordinates tokenizer, parser, evaluator, dependency graph
- Provides high-level API (setValue, deleteCell, loadData)
- Manages cell state and formula storage
- Triggers recalculation on dependency changes

**Files**: `js/engine/FormulaEngine.js`

---

#### Tokenizer
**Responsibility**: Lexical analysis - converts formula string to tokens

**What it does**:
- Scans formula character by character
- Identifies token types (NUMBER, STRING, IDENTIFIER, OPERATOR, etc.)
- Handles cell references (A1, B2:C5)
- Returns token stream

**Example**: `"=SUM(A1:A10)+5"` → `[EQUALS, IDENTIFIER("SUM"), LPAREN, CELL_REFERENCE("A1:A10"), RPAREN, PLUS, NUMBER(5)]`

**Files**: `js/engine/parser/Tokenizer.js`

---

#### Parser
**Responsibility**: Syntactic analysis - converts tokens to Abstract Syntax Tree (AST)

**What it does**:
- Recursive descent parsing with operator precedence
- Grammar: Primary → Unary → Power → Multiplication → Addition → Concatenation → Comparison
- Builds AST representing formula structure
- Handles function calls, references, ranges

**Example AST**:
```
=A1+B1
    +
   / \
  A1  B1
```

**Files**: `js/engine/parser/Parser.js`

---

#### Evaluator
**Responsibility**: Walks AST and computes results

**What it does**:
- Traverses AST nodes
- Looks up cell values
- Calls functions via FunctionRegistry
- Handles type coercion
- Returns computed result or error

**Files**: `js/engine/Evaluator.js`

---

#### DependencyGraph
**Responsibility**: Tracks cell relationships and ensures correct calculation order

**What it does**:
- Maintains directed graph of cell dependencies
- Detects circular references
- Provides topological sort for recalculation order
- Invalidates dependent cells when source changes

**Example**:
```
A1 = 10
B1 = =A1*2
C1 = =B1+5

Graph: A1 → B1 → C1
Order: Calculate A1, then B1, then C1
```

**Files**: `js/engine/DependencyGraph.js`

---

#### FunctionRegistry
**Responsibility**: Dynamic function lookup and execution

**What it does**:
- Stores function implementations (SUM, AVERAGE, IF, etc.)
- Provides `getFunction(name)` for evaluator
- Allows adding functions without parser changes

**Why it exists**: Universal parser doesn't hardcode function names

**Files**: `js/engine/FunctionRegistry.js`, `js/engine/functions/`

---

### File Management

#### file-manager.js (Client)
**Responsibility**: Client-side file state and API wrapper

**What it does**:
- Stores current file state (cells, columnWidths, rowHeights)
- Provides CRUD operations (load, save, create, delete)
- Debounced autosave (500ms after changes)
- Communicates with Flask backend via fetch()

**Data it owns**:
- Current file data (cells, metadata)
- Autosave timer state

**Files**: `js/file-manager.js`

---

#### server/app.py (Flask Backend)
**Responsibility**: REST API for file persistence

**What it provides**:
- `GET /api/files` - List all files
- `POST /api/files` - Create new file
- `GET /api/files/<id>` - Load file data
- `PUT /api/files/<id>` - Update file
- `DELETE /api/files/<id>` - Delete file
- `GET /api/recent` - Get most recent file

**Data storage**: JSON files in `data/files/`

**Files**: `server/app.py`

---

## Data Flow Patterns

### 1. Cell Update Flow

```
User Edit → Mode.handleCommit
  → UpdateCellsCommand.execute()
  → HistoryManager.execute(command)
  → FileManager.updateCell(address, value)
  → Worker.postMessage({type: 'setValue', address, value})
  ─┐
   └→ [Web Worker Thread]
      → FormulaEngine.setValue()
      → Tokenizer → Parser → AST
      → DependencyGraph.addDependency()
      → DependencyGraph.getAffectedCells()
      → Evaluator.evaluate(AST) for each affected cell
      → Worker.postMessage({type: 'updates', cells: {...}})
  ←─┘
  → Spreadsheet.handleWorkerMessage()
  → FileManager.updateCells(updates)
  → GridRenderer.updateCells(updates)
  → Autosave triggered (debounced)
  → FileManager.save() → Flask API
```

**Key Points**:
- Cell updates are **commands** (undo-able)
- Formula evaluation happens in **worker** (non-blocking)
- **Dependency graph** ensures correct recalculation order
- **Autosave** is debounced to avoid excessive API calls

---

### 2. Mode Transition Flow

```
User Input (e.g., type "=")
  → InputController.handleKeyDown(event)
  → InputController.createIntent('INPUT', {char: '='})
  → ModeManager.handleIntent(INPUT, context)
  → ModeManager.currentMode.handleIntent(INPUT, context)
  → ReadyMode.handleIntent() detects formula trigger
  → ReadyMode.requestModeSwitch('point')
  → ModeManager.switchMode('point')
  → ReadyMode.onExit() [cleanup]
  → PointMode.onEnter() [setup]
  → ModeManager.currentMode = PointMode
```

**Key Points**:
- Intents are **semantic** (not raw events)
- Modes **request** transitions (via `requestModeSwitch`)
- **Lifecycle hooks** (onEnter/onExit) for setup/cleanup
- ModeManager **owns** current mode state

---

### 3. Selection Flow

```
User Clicks Cell
  → GridRenderer.handleClick(event)
  → Get cell coordinates from click position
  → InputController creates CELL_SELECT intent
  → ModeManager.handleIntent(CELL_SELECT, {address: 'B2'})
  → ReadyMode.handleIntent() → SelectionManager.setActiveCell('B2')
  → SelectionManager.updateState(activeCell = 'B2', ranges = [])
  → SelectionManager.render() → Updates DOM selection borders
  → GridRenderer.drawSelection()
```

**Key Points**:
- Click coordinates → Cell address conversion
- Intent-based architecture (even for mouse)
- SelectionManager **owns** selection state
- Rendering is separate from state updates

---

### 4. Undo/Redo Flow

```
User Presses Cmd+Z
  → InputController.handleKeyDown()
  → Intent: UNDO
  → ModeManager.handleIntent(UNDO)
  → ReadyMode.handleIntent(UNDO)
  → HistoryManager.undo()
  → Pop command from undo stack
  → Command.undo() [e.g., UpdateCellsCommand.undo()]
  → FileManager.updateCells(oldValues)
  → Worker.postMessage({type: 'setValue', ...}) for each cell
  → Worker calculates, returns updates
  → GridRenderer.updateCells()
  → Push command to redo stack
```

**Key Points**:
- Commands are **reversible** (implement undo)
- Undo/redo work through **command stack**
- Worker is involved (formulas recalculated)
- UI updates reflect undone state

---

## Key Architectural Decisions

### 1. Why FSM for Modes?

**Problem**: Same keystrokes need different behaviors in different contexts (e.g., Arrow keys navigate vs move cursor vs update formula).

**Solution**: Finite State Machine with mode-specific intent handling.

**Benefits**:
- Clear separation of concerns
- Easy to add new modes
- Testable in isolation
- No conditional spaghetti (no `if (editing) { ... } else { ... }`)

**Trade-off**: More indirection than direct event handlers

See: `/docs/adr/001-fsm-mode-system.md`

---

### 2. Why Web Worker for Formulas?

**Problem**: Complex formulas or large dependency chains block UI thread.

**Solution**: Run formula engine in separate Web Worker thread.

**Benefits**:
- UI remains responsive during calculations
- Can use full CPU for parsing/evaluating
- Natural isolation of formula logic

**Trade-off**: Asynchronous communication (message passing), can't access DOM

See: `/docs/adr/002-web-worker-engine.md`

---

### 3. Why Command Pattern for History?

**Problem**: Need undo/redo for all state-changing operations.

**Solution**: All mutations go through Command objects with execute/undo methods.

**Benefits**:
- Consistent undo/redo for all operations
- Commands are testable units
- Easy to implement macro commands (batching)

**Trade-off**: More boilerplate (every operation needs a command class)

See: `/docs/adr/003-command-pattern-history.md`

---

### 4. Why Universal Parser?

**Problem**: Adding new functions shouldn't require parser changes.

**Design**: Parser recognizes `IDENTIFIER` tokens as potential function names, FunctionRegistry provides implementation at evaluation time.

**Benefits**:
- Add functions by registering them (no parser changes)
- Parser is simpler and more maintainable
- Extensible architecture

---

## Module Boundaries

### What Modules Don't Do

#### ModeManager
- ❌ Doesn't handle events directly (InputController does)
- ❌ Doesn't know about specific modes' logic (modes handle their own intents)
- ❌ Doesn't update UI (delegates to modes, which delegate to managers)

#### EditorManager
- ❌ Doesn't contain business logic (modes decide when to show/hide)
- ❌ Doesn't handle keyboard events (InputController does)
- ❌ Doesn't commit edits (modes call HistoryManager)

#### SelectionManager
- ❌ Doesn't handle input events (modes call its methods)
- ❌ Doesn't know about modes (is called by modes)

#### FormulaEngine (Worker)
- ❌ Doesn't update UI (can't access DOM, sends results via postMessage)
- ❌ Doesn't handle file persistence (main thread does)

---

## Extension Points

### Adding a New Mode

1. Create class extending `AbstractMode` or `NavigationMode`
2. Implement `getName()` and `handleIntent()`
3. Register in ModeManager initialization
4. Add transitions from existing modes

Example: Adding "FormatMode" for bulk formatting operations

---

### Adding a New Formula Function

1. Implement function in `js/engine/functions/math.js` (or appropriate category)
2. Register in `js/engine/functions/register.js`
3. Add tests in `tests/engine/functions/`
4. No parser changes needed!

---

### Adding a New Command

1. Create class extending `Command`
2. Implement `execute()` and `undo()`
3. Use via `HistoryManager.execute(new YourCommand(...))`

Example: FormatRangeCommand for cell formatting (Epic 3)

---

## Testing Strategy

### Unit Tests (Vitest)
- Test modules in isolation
- Mock dependencies
- Focus on: Parser, Evaluator, Modes, Commands, Utils

**Location**: `/tests/`

---

### E2E Tests (Playwright)
- Test full user workflows
- Real browser environment
- Focus on: Mode transitions, Formula calculations, User interactions

**Location**: `/e2e/`

**Test specification**: `/docs/test-scenarios/`

---

## See Also

- **Mode System**: `/docs/architecture/01-mode-system.md`
- **Formula Engine**: `/docs/architecture/02-formula-engine.md`
- **User Workflows**: `/docs/user-interactions/01-core-workflows.md`
- **API Reference**: `/docs/api-reference/`
- **Architecture Decisions**: `/docs/adr/`
