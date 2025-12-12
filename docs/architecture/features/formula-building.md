# Feature Walkthrough: Formula Building (Point Mode)

**Primary Actor**: User
**Goal**: Build a formula visually using point-and-click or arrow keys to select cell references

---

## 1. The Trigger (UI Layer)

* **Event**: User types a formula trigger character (`=`, `+`, or `-`) while in ReadyMode
* **Handler**: `InputController.js` -> `handleKeyDown()`
* **Action**: Creates INPUT intent, which triggers mode switch to PointMode

### Entry Flow
```
User presses "=" key
  -> InputController.handleKeyDown(event)
  -> InputController.createIntent('INPUT', { char: '=', key: '=' })
  -> ModeManager.handleIntent('INPUT', context)
  -> ReadyMode.handleIntent('INPUT', context)
  -> ReadyMode detects formula trigger
  -> ReadyMode.requestModeSwitch('point')
  -> ModeManager.switchMode('point')
  -> ReadyMode.onExit()
  -> PointMode.onEnter()
     -> EditorManager.activate(content: '=')
     -> Formula bar shows "="
```

---

## 2. Logic & Coordinator (Application Layer)

### Mode Transition: ReadyMode -> PointMode

* **Detector**: `ReadyMode.js`
* **Decision**: Character is `=`, `+`, or `-`
* **Lifecycle**: `PointMode.onEnter()` activates editor with formula trigger

```javascript
// In ReadyMode.handleIntent()
handleIntent(intent, context) {
  if (intent === 'INPUT') {
    const char = context.char;

    // Formula triggers
    if (char === '=' || char === '+' || char === '-') {
      this._editorManager.activate(char);
      this._requestModeSwitch('point');
      return true;
    }

    // Regular character -> EnterMode
    this._editorManager.activate(char);
    this._requestModeSwitch('enter');
    return true;
  }
}
```

### PointMode Intent Handling

PointMode extends NavigationMode but **overrides** how navigation intents work:

```javascript
// In PointMode.handleIntent()
handleIntent(intent, context) {
  if (intent === 'NAVIGATE') {
    // Navigate (inherited), but ALSO update formula reference
    const newCell = this._calculateTargetCell(context.direction, context.ctrl);
    this._updateFormulaReference(newCell, context.shift);
    return true;  // Don't actually move grid selection
  }

  if (intent === 'CELL_SELECT') {
    // Click updates formula reference
    this._updateFormulaReference(context.address, context.shift);
    return true;
  }

  if (intent === 'INPUT') {
    if (this._isOperator(context.char)) {
      // Operators lock current reference, prepare for next
      this._lockCurrentReference();
      this._editorManager.append(context.char);
      return true;
    }

    // Letters/numbers -> switch to EditMode for manual entry
    this._editorManager.append(context.char);
    this._requestModeSwitch('edit');
    return true;
  }
}
```

---

## 3. The "Magic": Reference Update Logic

PointMode's core intelligence is knowing when to **replace** vs **append** references:

### Scenario A: Replace Reference (No operator after)

```
Formula: "=A1"
User presses Arrow Right
Result: "=B1" (A1 REPLACED with B1)
```

### Scenario B: Append Reference (Operator just typed)

```
Formula: "=A1+"
User presses Arrow Right
Result: "=A1+B1" (B1 APPENDED after +)
```

### Scenario C: Replace Latest Reference (Continue moving)

```
Formula: "=A1+B1"
User presses Arrow Right
Result: "=A1+C1" (B1 replaced, A1 locked by +)
```

### Implementation Pattern

```javascript
// In PointMode
_updateFormulaReference(address, isRange) {
  const formula = this._editorManager.getContent();
  const tokens = this._tokenizeFormula(formula);

  // Find the "active" reference (last unlocked reference)
  const lastToken = tokens[tokens.length - 1];
  const isOperatorLast = this._isOperator(lastToken);

  if (isOperatorLast) {
    // Append new reference after operator
    const newRef = isRange ? `${this._rangeStart}:${address}` : address;
    this._editorManager.append(newRef);
  } else if (this._isReference(lastToken)) {
    // Replace the last reference
    const newFormula = formula.slice(0, -lastToken.length);
    const newRef = isRange ? `${this._rangeStart}:${address}` : address;
    this._editorManager.setContent(newFormula + newRef);
  }

  // Update visual highlights
  this._updateReferenceHighlights();
}
```

---

## 4. Visual Rendering (View Layer)

### Reference Highlighting

When a cell is referenced in the formula, it gets a colored border:

* **Renderer**: `GridRenderer.js` or `FormulaHighlighter.js`
* **Method**: `highlightReference(address, color)`

```
PointMode._updateReferenceHighlights()
  |
  ├─> Parse current formula for all references
  |      "=A1+B1:B10" -> ['A1', 'B1:B10']
  |
  ├─> Assign colors (cycle through palette)
  |      A1 -> blue border
  |      B1:B10 -> green border
  |
  └─> GridRenderer.highlightReferences(references, colors)
```

### Editor State

* **Manager**: `EditorManager.js`
* **State**: Current formula text, cursor position

```
EditorManager state:
  - active: true
  - content: "=A1+B1"
  - position: cell E1 (where formula is being entered)
```

---

## 5. Commit Flow (Formula Saved)

* **Trigger**: User presses Enter or Tab
* **Intent**: `COMMIT`

### Commit Flow

```
User presses Enter
  -> InputController creates COMMIT intent
  -> ModeManager.handleIntent('COMMIT', context)
  -> PointMode.handleIntent('COMMIT', context)
  -> PointMode commits formula:
     |
     ├─> Get formula from EditorManager
     |      formula = "=A1+B1"
     |
     ├─> Create UpdateCellsCommand
     |      command = new UpdateCellsCommand(
     |        { E1: { value: "=A1+B1", formula: "=A1+B1" } }
     |      )
     |
     ├─> HistoryManager.execute(command)
     |
     ├─> Command.execute()
     |      -> FileManager.updateCell('E1', '=A1+B1')
     |      -> Worker.postMessage({ type: 'setValue', address: 'E1', value: '=A1+B1' })
     |
     ├─> Worker parses, evaluates, returns result
     |      -> { E1: { formula: '=A1+B1', value: 30 } }
     |
     ├─> GridRenderer.updateCells(updates)
     |      -> E1 now shows "30"
     |
     ├─> Remove reference highlights
     |
     └─> PointMode._requestModeSwitch('ready')
         -> EditorManager.deactivate()
         -> ModeManager.switchMode('ready')
```

---

## 6. Formula Worker Processing

When the formula is committed, the Web Worker processes it:

```
Worker receives: { type: 'setValue', address: 'E1', value: '=A1+B1' }
  |
  ├─> FormulaEngine.setValue('E1', '=A1+B1')
  |
  ├─> Tokenizer.tokenize('=A1+B1')
  |      -> [EQUALS, CELL_REF(A1), PLUS, CELL_REF(B1)]
  |
  ├─> Parser.parse(tokens)
  |      -> AST: { type: 'BinaryOp', op: '+', left: {ref: 'A1'}, right: {ref: 'B1'} }
  |
  ├─> DependencyGraph.addDependency('E1', ['A1', 'B1'])
  |
  ├─> Evaluator.evaluate(AST)
  |      -> Lookup A1 = 10, B1 = 20
  |      -> 10 + 20 = 30
  |
  └─> Worker.postMessage({ type: 'updates', cells: { E1: { formula: '=A1+B1', value: 30 } } })
```

---

## Mode Transitions in Formula Building

```
       User in ReadyMode at E1
                |
                | Types "="
                v
       ────────────────────
       │    PointMode     │  <-- Arrow keys/clicks update formula
       ────────────────────
         /        |        \
        /         |         \
   Types "SUM"  Types "+"   Presses Enter
       |          |              |
       v          |              v
  ──────────      |        ────────────
  │EditMode│      |        │ReadyMode │
  ──────────      |        ────────────
       |          |        Formula committed
       |     Stays in      E1 shows result
   Types "("   PointMode
       |          |
       v          v
  Back to     Can click/arrow
  PointMode   to add reference
```

---

## Key Files

| Layer | File | Responsibility |
|-------|------|----------------|
| Trigger | `js/ui/InputController.js` | Detects "=" key, creates INPUT intent |
| Mode | `js/modes/PointMode.js` | Formula building logic, reference updates |
| Mode | `js/modes/ReadyMode.js` | Detects formula trigger, initiates switch |
| Editor | `js/ui/EditorManager.js` | Manages formula text, cursor position |
| History | `js/history/commands/UpdateCellsCommand.js` | Undo-able cell update |
| Worker | `js/engine/formula-worker.js` | Receives setValue, triggers calculation |
| Engine | `js/engine/FormulaEngine.js` | Coordinates parsing & evaluation |
| Parser | `js/engine/parser/Tokenizer.js` | Lexical analysis |
| Parser | `js/engine/parser/Parser.js` | Builds AST |
| Eval | `js/engine/Evaluator.js` | Walks AST, computes result |
| Graph | `js/engine/DependencyGraph.js` | Tracks A1+B1 depends on A1 and B1 |

---

## F4: Toggle Absolute References

While in PointMode (or EditMode for formulas), pressing F4 cycles the reference format:

```
A1 -> $A$1 -> A$1 -> $A1 -> A1
```

### Implementation

```javascript
// In PointMode.handleIntent()
if (intent === 'TOGGLE_REFERENCE') {
  const formula = this._editorManager.getContent();
  const cursorPos = this._editorManager.getCursorPosition();

  // Find reference at/near cursor
  const reference = this._findReferenceAtCursor(formula, cursorPos);
  if (!reference) return false;

  // Cycle format
  const newRef = FormulaAdjuster.cycleReferenceFormat(reference);

  // Replace in formula
  const newFormula = formula.slice(0, reference.start)
    + newRef
    + formula.slice(reference.end);

  this._editorManager.setContent(newFormula);
  return true;
}
```

---

## Range Selection in PointMode

### Method 1: Shift+Arrow

```
Formula: "="
Click A1 -> "=A1"
Shift+Down -> "=A1:A2"
Shift+Down -> "=A1:A3"
...
```

### Method 2: Shift+Click

```
Formula: "="
Click A1 -> "=A1"
Shift+Click A10 -> "=A1:A10"
```

### Method 3: Drag

```
Formula: "=SUM("
Click A1, drag to A10 -> "=SUM(A1:A10"
```

---

## See Also

- Mode System: `/docs/architecture/01-mode-system.md`
- Formula Engine: `/docs/architecture/02-formula-engine.md`
- User workflows: `/docs/manuals/user-workflows.md` (Point Mode Formula Building)
- Test scenarios: `/docs/manuals/test-scenarios/formula-building.scenarios.md`
