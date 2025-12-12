# Implementation Plan: Centralized Input & State Management Refactor

## Executive Summary

This plan breaks down the architectural refactor into **5 phases** with **18 discrete implementation chunks**. Each chunk is designed to be independently testable and deployable without breaking existing functionality. The strategy is "wrap, then replace" – we build the new system alongside the old, then migrate incrementally.

---

## Phase 1: Infrastructure Foundation

**Goal:** Create the skeleton of the new architecture without breaking anything. These classes will exist but won't be connected to the live application yet.

---

### Chunk 1.1: Intent Constants & Types

**New File:** `js/modes/Intents.js`

This establishes the vocabulary for the entire system. All subsequent code will reference these constants.

| Export                                          | Type           | Description                                                                                                                                         | Rationale                                                                                                                                                          |
| ----------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `INTENTS`                                       | Object (const) | Enum of all semantic intents: `NAVIGATE`, `EDIT_START`, `COMMIT`, `CANCEL`, `INPUT`, `DELETE`, `UNDO`, `REDO`, `SELECT_ALL`, `COPY`, `PASTE`, `CUT` | Currently, keydown handlers use raw key strings. Centralizing intent definitions ensures consistent naming across all modes and makes the system self-documenting. |
| `createNavigateContext(direction, shift, ctrl)` | Function       | Factory for navigation intent payloads                                                                                                              | Ensures consistent structure for navigation context objects across InputController and all modes.                                                                  |
| `createInputContext(char, isFormulaTrigger)`    | Function       | Factory for input intent payloads                                                                                                                   | Distinguishes between formula-starting characters (`=`, `+`, `-`) and regular text input.                                                                          |

**Testing:** Unit tests validating that factory functions produce correctly shaped objects.

---

### Chunk 1.2: AbstractMode Base Class

**New File:** `js/modes/AbstractMode.js`

Defines the interface contract that all concrete modes must fulfill.

| Method                          | Signature                                                                                      | Description                                        | Rationale                                                                                                                            |
| ------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `constructor(context)`          | `{ spreadsheet, selectionManager, editorManager, historyManager, fileManager, formulaWorker }` | Receives all dependencies via dependency injection | Modes need access to application services but shouldn't instantiate them. This follows Dependency Inversion principle.               |
| `onEnter(payload)`              | `payload: any → void`                                                                          | Lifecycle hook called when mode becomes active     | Allows modes to perform setup (e.g., EditMode showing the cell editor). Currently this setup is scattered in `_handleGlobalKeydown`. |
| `onExit()`                      | `() → void`                                                                                    | Lifecycle hook called when mode is deactivated     | Allows cleanup (e.g., EditMode committing changes). Currently handled inconsistently.                                                |
| `handleIntent(intent, context)` | `(string, object) → boolean`                                                                   | Process an intent, return true if handled          | The core dispatch method. Returning `false` allows the event to bubble or be handled by the browser.                                 |
| `getName()`                     | `() → string`                                                                                  | Returns mode identifier                            | Useful for debugging, logging, and UI status display.                                                                                |

**Testing:** Create a `TestMode extends AbstractMode` to verify the interface works correctly.

---

### Chunk 1.3: ModeManager (State Container)

**New File:** `js/modes/ModeManager.js`

The FSM controller. Holds current mode reference and handles transitions.

| Method                          | Signature                    | Description                               | Rationale                                                                                                                                                                            |
| ------------------------------- | ---------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `constructor(context)`          | Same as AbstractMode         | Stores references to all services         | ModeManager creates mode instances, so it needs all dependencies to pass through.                                                                                                    |
| `registerMode(name, ModeClass)` | `(string, class) → void`     | Registers a mode class by name            | Allows lazy instantiation and makes the system extensible. New modes can be added without modifying ModeManager.                                                                     |
| `switchMode(modeName, payload)` | `(string, any) → void`       | Transitions to a new mode                 | Calls `onExit()` on current mode, instantiates/retrieves new mode, calls `onEnter(payload)`. This is the "single point of state change" that eliminates scattered flag manipulation. |
| `handleIntent(intent, context)` | `(string, object) → boolean` | Delegates to `currentMode.handleIntent()` | Simple delegation pattern. ModeManager doesn't contain business logic.                                                                                                               |
| `getCurrentMode()`              | `() → AbstractMode`          | Returns current mode instance             | For debugging and UI status bar updates.                                                                                                                                             |
| `getCurrentModeName()`          | `() → string`                | Returns current mode name                 | Used by `FormulaBar` to display status ("Ready", "Edit", "Point").                                                                                                                   |

**Internal State:**

- `_modes: Map<string, AbstractMode>` - Cache of instantiated modes
- `_currentMode: AbstractMode` - Active mode reference
- `_currentModeName: string` - Active mode name

**Testing:** Unit tests for mode registration, switching, and lifecycle hook invocation order.

---

### Chunk 1.4: InputController (Event Gateway)

**New File:** `js/ui/InputController.js`

The single point of contact with the DOM for keyboard/mouse events.

| Method                                | Signature                                | Description                             | Rationale                                                                                                                              |
| ------------------------------------- | ---------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --- | ------------ |
| `constructor(container, modeManager)` | DOM element, ModeManager                 | Binds to a container element            | Currently, `Spreadsheet.js` has `cellGridContainer.addEventListener('keydown', ...)`. This extracts that responsibility.               |
| `attach()`                            | `() → void`                              | Attaches all DOM event listeners        | Called during initialization. Separating attachment allows for easier testing and controlled startup.                                  |
| `detach()`                            | `() → void`                              | Removes all DOM event listeners         | For cleanup and testing scenarios.                                                                                                     |
| `_handleKeyDown(event)`               | `(KeyboardEvent) → void`                 | Normalizes keyboard events into intents | **This replaces the massive `_handleGlobalKeydown` in Spreadsheet.js**. Instead of containing logic, it just translates and delegates. |
| `_handleMouseDown(event)`             | `(MouseEvent) → void`                    | Normalizes mouse events into intents    | Grid clicks become `CELL_SELECT` intents. Currently handled by GridRenderer callbacks.                                                 |
| `_normalizeModifiers(event)`          | `(Event) → { ctrl, shift, alt }`         | Unifies Cmd (Mac) and Ctrl (Windows)    | Currently duplicated in multiple places (`e.metaKey                                                                                    |     | e.ctrlKey`). |
| `_mapKeyToIntent(key, modifiers)`     | `(string, object) → { intent, context }` | Core mapping logic                      | Contains the key-to-intent mapping table. Easy to unit test in isolation.                                                              |

**Key Mapping Table (internal):**

| Key/Combo                 | Intent                   | Context                      |
| ------------------------- | ------------------------ | ---------------------------- |
| `ArrowUp/Down/Left/Right` | `NAVIGATE`               | `{ direction, shift, ctrl }` |
| `Enter`                   | `COMMIT` or `EDIT_START` | Depends on current mode      |
| `Escape`                  | `CANCEL`                 | —                            |
| `Tab`                     | `COMMIT`                 | `{ moveDirection: 'right' }` |
| `Backspace/Delete`        | `DELETE`                 | —                            |
| `Ctrl+Z`                  | `UNDO`                   | —                            |
| `Ctrl+Y` / `Ctrl+Shift+Z` | `REDO`                   | —                            |
| `Ctrl+C/V/X`              | `COPY/PASTE/CUT`         | —                            |
| `A-Z, 0-9, =`             | `INPUT`                  | `{ char, isFormulaTrigger }` |
| `F2`                      | `EDIT_START`             | —                            |

**Testing:** Unit tests with mock events verifying correct intent/context output for all key combinations.

---

## Phase 2: Navigation Logic Layer

**Goal:** Extract and centralize all grid navigation logic into a reusable base class.

---

### Chunk 2.1: NavigationMode Base Class

**New File:** `js/modes/NavigationMode.js`

This is the "secret sauce" – complex navigation logic written once, inherited by Ready, Point, and Enter modes.

| Method                          | Signature                                | Description                | Rationale                                                                                                                                                              |
| ------------------------------- | ---------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `handleIntent(intent, context)` | Override                                 | Handles `NAVIGATE` intent  | Contains the `if (ctrl) jumpToEdge() else moveSelection()` logic. **Currently this logic is in `Spreadsheet._handleGlobalKeydown`** in the arrow key handling section. |
| `_handleNavigate(context)`      | `({ direction, shift, ctrl }) → boolean` | Core navigation dispatcher | Delegates to SelectionManager methods. This method is protected – subclasses can call `super._handleNavigate()` after their own logic.                                 |
| `_handleDelete()`               | `() → boolean`                           | Handles DELETE intent      | Calls the clear selection logic. **Currently in `Spreadsheet._clearSelection`**.                                                                                       |
| `_handleSelectAll()`            | `() → boolean`                           | Handles SELECT_ALL intent  | Selects entire grid. Currently not implemented but needed.                                                                                                             |
| `_handleCopy()`                 | `() → boolean`                           | Handles COPY intent        | Delegates to ClipboardManager. **Currently in `Spreadsheet._handleGlobalKeydown` under `isCmd && key === 'c'`**.                                                       |
| `_handlePaste()`                | `() → boolean`                           | Handles PASTE intent       | **Currently `Spreadsheet._handlePaste`**. Will be moved here.                                                                                                          |
| `_handleUndo()`                 | `() → boolean`                           | Handles UNDO intent        | Delegates to HistoryManager. **Currently scattered in keydown handler**.                                                                                               |
| `_handleRedo()`                 | `() → boolean`                           | Handles REDO intent        | Same as above.                                                                                                                                                         |

**Testing:** Unit tests with mock SelectionManager verifying correct method calls for each navigation scenario (the 4 stress tests from the documents).

---

### Chunk 2.2: SelectionManager Enhancements

**Modified File:** `js/ui/SelectionManager.js`

Minor additions to support the new architecture. These are additive changes that don't break existing code.

| Method                                         | Change Type | Description                                        | Rationale                                                                                                         |
| ---------------------------------------------- | ----------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `jumpToEdge(direction, shift, hasValueFn)`     | **Modify**  | Add optional `shift` parameter for range extension | Currently `jumpToEdge` doesn't support shift-selection. The stress test scenario "Cmd+Shift+Right" requires this. |
| `extendSelectionToEdge(direction, hasValueFn)` | **New**     | Extends current selection to edge                  | Called when `jumpToEdge` is invoked with `shift=true`. Reuses edge-finding logic but extends rather than moves.   |
| `getSelectionBounds()`                         | **New**     | Returns `{ minRow, maxRow, minCol, maxCol }`       | Useful for clipboard operations and mode logic. Currently calculated ad-hoc in multiple places.                   |

**Testing:** Extend existing SelectionManager tests with shift+jump scenarios.

---

## Phase 3: Concrete Mode Implementations

**Goal:** Implement the actual mode classes that contain behavioral differences.

---

### Chunk 3.1: ReadyMode

**New File:** `js/modes/ReadyMode.js`

The default "idle" state. User is navigating, not editing.

| Method                          | Signature                                | Description                                                   | Rationale                                                                                                                                                                                      |
| ------------------------------- | ---------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `handleIntent(intent, context)` | Override                                 | Handles mode-specific intents, delegates navigation to parent | **Key difference from current system**: Instead of checking `if (!this.editor.isEditing)` before navigation, ReadyMode simply handles it because being in ReadyMode _means_ we're not editing. |
| `_handleInput(context)`         | `({ char, isFormulaTrigger }) → boolean` | Handles INPUT intent                                          | If `char === '='`, switches to PointMode. Otherwise switches to EnterMode. **Currently in `_handleGlobalKeydown` under the character typing section**.                                         |
| `_handleEditStart()`            | `() → boolean`                           | Handles F2 / double-click                                     | Switches to EditMode. **Currently triggers `this.editor.startEdit()`**.                                                                                                                        |
| `_handleCellSelect(context)`    | `({ coords, shift, ctrl }) → boolean`    | Handles cell click                                            | Delegates to SelectionManager. **Currently in `renderer.on('cellMouseDown', ...)`**.                                                                                                           |
| `onEnter()`                     | Override                                 | Ensures cell editor is hidden                                 | Cleanup from previous mode.                                                                                                                                                                    |

**Testing:** Unit tests verifying correct mode transitions for each input type.

---

### Chunk 3.2: EditMode

**New File:** `js/modes/EditMode.js`

In-cell editing with text cursor movement. Does NOT extend NavigationMode.

| Method                          | Signature                                       | Description                                  | Rationale                                                                                                              |
| ------------------------------- | ----------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `handleIntent(intent, context)` | Override                                        | Handles COMMIT, CANCEL; **ignores NAVIGATE** | **This is the "switch"**: By not handling NAVIGATE, arrow keys fall through to browser default (text cursor movement). |
| `_handleCommit(context)`        | `({ moveDirection }) → boolean`                 | Commits edit, switches to ReadyMode          | **Currently in `EditorManager.commitEdit()`**, but mode transition logic is new.                                       |
| `_handleCancel()`               | `() → boolean`                                  | Cancels edit, switches to ReadyMode          | **Currently in `EditorManager.cancelEdit()`**.                                                                         |
| `onEnter(payload)`              | `({ cellId, initialValue, triggerKey }) → void` | Starts editing session                       | Calls `EditorManager.startEdit()`. The `triggerKey` allows "overwrite" vs "append" behavior.                           |
| `onExit()`                      | Override                                        | Commits any pending changes                  | Safety net – if mode switches unexpectedly, don't lose data.                                                           |

**Testing:** Verify that arrow keys are NOT handled (return false), and that COMMIT/CANCEL work correctly.

---

### Chunk 3.3: EnterMode

**New File:** `js/modes/EnterMode.js`

"Quick entry" mode – typing overwrites cell, arrows commit and move. Extends NavigationMode.

| Method                          | Signature                         | Description                         | Rationale                                                                                                                                               |
| ------------------------------- | --------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `handleIntent(intent, context)` | Override                          | **Overrides** NAVIGATE handling     | **Key behavior**: Commits current entry, THEN calls `super.handleIntent()` to move. This is the "commit before move" logic described in `app_modes.md`. |
| `_handleNavigate(context)`      | Override                          | Commit first, then delegate         | Calls `this._commitEntry()`, then `super._handleNavigate(context)`.                                                                                     |
| `_handleCommit(context)`        | `() → boolean`                    | Commits and returns to Ready        | Similar to EditMode but simpler (no cursor positioning).                                                                                                |
| `_handleInput(context)`         | `({ char }) → void`               | Appends character to entry buffer   | Updates the cell editor value. **Currently, this is implicitly handled by the cell editor's native input handling**.                                    |
| `onEnter(payload)`              | `({ cellId, triggerKey }) → void` | Starts entry with initial character | Clears cell, positions editor, inserts trigger key.                                                                                                     |
| `onExit()`                      | Override                          | Commits entry if not empty          | Ensures data isn't lost on unexpected mode switch.                                                                                                      |

**Testing:** Verify the "arrow commits then moves" behavior. Verify F2 toggles to EditMode.

---

### Chunk 3.4: EditorManager Modifications

**Modified File:** `js/ui/EditorManager.js`

Reduce responsibility – EditorManager becomes a "dumb" DOM controller, modes handle logic.

| Method                                        | Change Type | Description                         | Rationale                                                                                                                            |
| --------------------------------------------- | ----------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `startEdit(cellId, initialValue, triggerKey)` | **Keep**    | Still manages DOM positioning       | This stays, but is now called by modes, not directly by Spreadsheet.                                                                 |
| `commitEdit(moveDirection)`                   | **Modify**  | Remove mode transition side effects | Currently calls callbacks that trigger navigation. This should just commit and return the value. Mode handles what happens next.     |
| `cancelEdit()`                                | **Modify**  | Remove mode transition side effects | Same reasoning.                                                                                                                      |
| `getValue()`                                  | **New**     | Returns current editor value        | Modes need to query editor state without triggering commit.                                                                          |
| `setValue(value)`                             | **New**     | Sets editor value programmatically  | Needed for EnterMode's character appending.                                                                                          |
| `_bindEvents()`                               | **Modify**  | Remove keydown handling             | **Critical change**: EditorManager should NOT handle Enter/Escape/Tab. That's InputController's job. Editor just handles text input. |

**Breaking Change Warning:** The event binding changes require careful coordination with Phase 4 integration.

**Testing:** Verify EditorManager operates purely as DOM controller with no business logic.

---

## Phase 4: Integration & Migration

**Goal:** Connect the new system to the live application, migrate logic from Spreadsheet.js.

---

### Chunk 4.1: Spreadsheet.js – Phase 1 Wiring

**Modified File:** `js/spreadsheet.js`

Add new system alongside existing code (no removal yet).

| Change                     | Location             | Description                                         | Rationale                                     |
| -------------------------- | -------------------- | --------------------------------------------------- | --------------------------------------------- |
| Add `this.modeManager`     | Constructor          | Instantiate ModeManager with all dependencies       | Prepares for delegation.                      |
| Add `this.inputController` | Constructor          | Instantiate InputController                         | Will eventually replace direct event binding. |
| Register modes             | Constructor          | `modeManager.registerMode('ready', ReadyMode)` etc. | Makes modes available.                        |
| Add mode initialization    | After `loadFromFile` | `this.modeManager.switchMode('ready')`              | Sets initial state.                           |

**Testing:** Verify application still works identically – new system is wired but not active.

---

### Chunk 4.2: Spreadsheet.js – Keyboard Migration

**Modified File:** `js/spreadsheet.js`

Route keyboard events through new system.

| Method                    | Change Type | Description                            | Rationale                                                                                                                            |
| ------------------------- | ----------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `_handleGlobalKeydown(e)` | **Gut**     | Replace implementation with delegation | Change from 60+ lines of conditionals to: `const handled = this.inputController.processKeyDown(e); if (handled) e.preventDefault();` |
| `_setupEventWiring()`     | **Modify**  | Remove direct keydown listener         | `InputController.attach()` handles this now.                                                                                         |

**Migration Strategy:**

1. First, have InputController delegate to old `_handleGlobalKeydown` (wrapper pattern)
2. Then, gradually move cases from old handler to modes
3. Finally, delete old handler when empty

**Testing:** Full E2E test suite must pass at each migration step.

---

### Chunk 4.3: Spreadsheet.js – Method Extraction

**Modified File:** `js/spreadsheet.js`

Methods that move to modes or become thin delegators.

| Method                  | Destination                      | Change Description                          | Rationale                                       |
| ----------------------- | -------------------------------- | ------------------------------------------- | ----------------------------------------------- |
| `_clearSelection()`     | `NavigationMode._handleDelete()` | Move logic, leave thin wrapper              | Business logic belongs in mode.                 |
| `_handlePaste()`        | `NavigationMode._handlePaste()`  | Move logic                                  | Same reasoning.                                 |
| `applyRangeFormat()`    | Keep but call via mode           | Mode should validate we're in correct state | Formatting only makes sense in Ready mode.      |
| `_executeCellUpdate()`  | Keep as service method           | Modes call this                             | This is infrastructure, not mode-specific.      |
| `_executeMoveCommand()` | Keep as service method           | Same                                        | Drag-move is its own concern (future DragMode). |

**Testing:** Verify each method works identically before and after move.

---

### Chunk 4.4: Spreadsheet.js – Mouse Event Migration

**Modified File:** `js/spreadsheet.js`

Route mouse events through InputController.

| Callback                              | Change                        | Description                     | Rationale                                                                                              |
| ------------------------------------- | ----------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `renderer.on('cellMouseDown', ...)`   | Route through InputController | Convert to `CELL_SELECT` intent | Currently contains mode-checking logic (`if (this.editor.isEditing) return`). Mode should handle this. |
| `renderer.on('cellDoubleClick', ...)` | Route through InputController | Convert to `EDIT_START` intent  | Same reasoning.                                                                                        |
| Drag callbacks                        | Keep for now                  | Future DragMode will handle     | Drag is complex enough to warrant its own phase.                                                       |

**Testing:** Selection behavior must be identical. E2E tests for click, shift-click, ctrl-click.

---

### Chunk 4.5: FormulaBar Integration

**Modified File:** `js/formula-bar.js`

Update to work with mode system.

| Method                        | Change Type | Description                     | Rationale                                                             |
| ----------------------------- | ----------- | ------------------------------- | --------------------------------------------------------------------- |
| `handleFormulaKeydown(e)`     | **Modify**  | Delegate to InputController     | Currently handles Enter/Escape directly. Should send intents instead. |
| `setupSpreadsheetCallbacks()` | **Add**     | Listen to mode changes          | Display current mode in status area.                                  |
| Mode status display           | **New**     | Show "Ready" / "Edit" / "Point" | User feedback required by Epic 7.                                     |

**Testing:** Verify formula bar commits still work, mode indicator updates correctly.

---

## Phase 5: Formula Building Foundation (Epic 7 Prerequisites)

**Goal:** Implement PointMode and supporting infrastructure for formula building.

---

### Chunk 5.1: PointMode

**New File:** `js/modes/PointMode.js`

"Arrow keys select cells to insert references" mode. Extends NavigationMode.

| Method                          | Signature                     | Description                       | Rationale                                                                                                              |
| ------------------------------- | ----------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `handleIntent(intent, context)` | Override                      | Handles navigation specially      | Navigation updates formula text, not just selection.                                                                   |
| `_handleNavigate(context)`      | Override                      | Move selection AND update formula | Calls `super._handleNavigate()` for selection, then calls `FormulaBuilder.updateReference()`.                          |
| `_handleInput(context)`         | `({ char }) → boolean`        | Handles operator/text input       | Operators (`,`, `+`, etc.) commit current reference and stay in PointMode. Letters/numbers switch to formula EditMode. |
| `_handleCommit()`               | `() → boolean`                | Commits entire formula            | Switches to ReadyMode.                                                                                                 |
| `_handleCellSelect(context)`    | `({ coords }) → boolean`      | Mouse click inserts reference     | **Key Formula-Building feature**: Clicking a cell inserts its reference at cursor.                                     |
| `onEnter(payload)`              | `({ formulaBuilder }) → void` | Receives FormulaBuilder reference | PointMode needs to update the formula string.                                                                          |
| `onExit()`                      | Override                      | Cleans up visual highlights       | Removes "dancing ants" borders.                                                                                        |

**Testing:** Verify navigation updates formula text. Verify mode transitions match `app_modes.md` spec.

---

### Chunk 5.2: FormulaBuilder Controller (Stub)

**New File:** `js/ui/FormulaBuilder.js`

Minimal implementation to support PointMode. Full implementation is Epic 7.

| Method                                 | Signature                 | Description                               | Rationale                                             |
| -------------------------------------- | ------------------------- | ----------------------------------------- | ----------------------------------------------------- | --------------------------------------- |
| `constructor(editorManager, renderer)` | Dependencies              | Holds references                          | Needs to update editor text and grid visuals.         |
| `start(cellId, initialFormula)`        | `(string, string) → void` | Initializes formula building session      | Called when user types `=` or edits existing formula. |
| `updateReference(cellId)`              | `(string) → void`         | Updates the "active" reference in formula | Called by PointMode on navigation.                    |
| `insertReference(cellId)`              | `(string) → void`         | Inserts new reference at cursor           | Called on mouse click.                                |
| `commitReference()`                    | `() → void`               | Locks current reference (TYPED state)     | Called when user types operator.                      |
| `getFormulaString()`                   | `() → string`             | Returns current formula text              | For committing to cell.                               |
| `getCurrentTokenOrigin()`              | `() → 'POINTED'           | 'TYPED'`                                  | Returns origin of token at cursor                     | Determines replace vs. append behavior. |

**Testing:** Unit tests for reference insertion and update logic.

---

### Chunk 5.3: Mode Transition Rules for Formula Building

**Modification across multiple files**

Implement the formula-specific mode transitions described in `feature_spec_formula_builder_ux.md`.

| Transition           | Trigger             | From Mode      | To Mode                | Implementation Location                   |
| -------------------- | ------------------- | -------------- | ---------------------- | ----------------------------------------- |
| Start formula        | Type `=`            | Ready          | Point                  | `ReadyMode._handleInput()`                |
| Edit formula         | F2 on formula cell  | Ready          | Edit (formula variant) | `ReadyMode._handleEditStart()`            |
| Point after operator | Type `+`, `(`, etc. | Edit (formula) | Point                  | `EditMode._handleInput()` when in formula |
| Edit after text      | Type letter/number  | Point          | Edit (formula)         | `PointMode._handleInput()`                |
| Commit formula       | Enter/Tab           | Point or Edit  | Ready                  | Both modes' `_handleCommit()`             |
| Cancel formula       | Escape              | Point or Edit  | Ready                  | Both modes' `_handleCancel()`             |

**Testing:** E2E tests for complete formula entry workflows.

---

## Phase 6: Cleanup & Optimization

**Goal:** Remove deprecated code, optimize performance.

---

### Chunk 6.1: Dead Code Removal

**Modified File:** `js/spreadsheet.js`

| Removal                             | Description                           | Safety Check           |
| ----------------------------------- | ------------------------------------- | ---------------------- |
| Old `_handleGlobalKeydown()`        | Replaced by InputController + Modes   | All E2E tests pass     |
| Inline mode checks                  | `if (this.editor.isEditing)` patterns | Modes handle this now  |
| Direct EditorManager event handlers | `editor.on('commit', ...)`            | Modes manage lifecycle |

---

### Chunk 6.2: Performance Audit

| Concern                           | Mitigation                                   |
| --------------------------------- | -------------------------------------------- |
| Mode instantiation overhead       | Modes are cached in ModeManager              |
| Intent creation on every keypress | Use object pooling if profiling shows issues |
| Event listener count              | InputController consolidates listeners       |

---

## Dependency Graph

```
Phase 1 (Infrastructure)
    ├── 1.1 Intents ──────────────────┐
    ├── 1.2 AbstractMode ─────────────┼──► Phase 2 (Navigation)
    ├── 1.3 ModeManager ──────────────┤       ├── 2.1 NavigationMode
    └── 1.4 InputController ──────────┘       └── 2.2 SelectionManager mods
                                                         │
                                                         ▼
                                              Phase 3 (Modes)
                                                  ├── 3.1 ReadyMode
                                                  ├── 3.2 EditMode
                                                  ├── 3.3 EnterMode
                                                  └── 3.4 EditorManager mods
                                                         │
                                                         ▼
                                              Phase 4 (Integration)
                                                  ├── 4.1 Wiring
                                                  ├── 4.2 Keyboard migration
                                                  ├── 4.3 Method extraction
                                                  ├── 4.4 Mouse migration
                                                  └── 4.5 FormulaBar
                                                         │
                                                         ▼
                                              Phase 5 (Formula Building)
                                                  ├── 5.1 PointMode
                                                  ├── 5.2 FormulaBuilder
                                                  └── 5.3 Transitions
```

---

## Risk Mitigation

| Risk                                   | Mitigation Strategy                                                           |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| Breaking existing functionality        | Feature flags to enable/disable new system during development                 |
| Complex mode interactions              | Comprehensive state transition tests                                          |
| EditorManager changes breaking editing | Keep old event handlers until Phase 4.3 is complete                           |
| Formula building complexity            | Stub FormulaBuilder in Phase 5.2, full implementation in separate Epic 7 work |

---

## Testing Strategy Per Phase

| Phase | Test Type           | Coverage Target                   |
| ----- | ------------------- | --------------------------------- |
| 1     | Unit tests          | 100% of new classes               |
| 2     | Unit + integration  | Navigation stress tests from docs |
| 3     | Unit + integration  | Mode lifecycle, transitions       |
| 4     | E2E regression      | All existing E2E tests pass       |
| 5     | E2E + new scenarios | Formula building user stories     |

---

## Estimated Effort

| Phase   | Complexity   | Estimated Time |
| ------- | ------------ | -------------- |
| Phase 1 | Low          | 2-3 days       |
| Phase 2 | Medium       | 2-3 days       |
| Phase 3 | Medium-High  | 4-5 days       |
| Phase 4 | High (risky) | 5-7 days       |
| Phase 5 | Medium       | 3-4 days       |
| Phase 6 | Low          | 1-2 days       |

**Total: ~17-24 days of focused development**
