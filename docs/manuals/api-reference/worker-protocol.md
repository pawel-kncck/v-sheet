# Formula Worker Message Protocol

This document defines the message-passing protocol between the main thread and the Formula Worker (Web Worker).

## Architecture Context

The formula engine runs in a dedicated Web Worker to prevent UI blocking during complex calculations. All communication between the main thread and worker happens via the `postMessage` API with a structured JSON protocol.

**Key Files:**
- **Main Thread**: `js/spreadsheet.js:340-352` (`_setupWorkerListeners`)
- **Worker Thread**: `js/engine/formula-worker.js:39-99` (`self.onmessage`)

---

## Message Format

All messages follow this structure:

```javascript
{
  type: string,      // Message type identifier
  payload: object    // Message-specific data
}
```

---

## Main Thread → Worker Messages

These messages are sent from the main thread to the worker using `formulaWorker.postMessage()`.

### 1. setDebugFlag

**Purpose**: Enable or disable debug logging in the worker

**When Used**: On application initialization when debug mode is detected

**Message Format**:
```javascript
{
  type: 'setDebugFlag',
  payload: {
    isEnabled: boolean
  }
}
```

**Example**:
```javascript
formulaWorker.postMessage({
  type: 'setDebugFlag',
  payload: { isEnabled: true }
});
```

**Worker Response**: None (silent operation)

**Implementation**: `js/engine/formula-worker.js:44-50`

---

### 2. load

**Purpose**: Load initial file data into the formula engine

**When Used**: When a spreadsheet file is opened or the application starts

**Message Format**:
```javascript
{
  type: 'load',
  payload: {
    fileCellData: {
      [cellId: string]: {
        value: string | number,
        formula: boolean
      }
    }
  }
}
```

**Example**:
```javascript
formulaWorker.postMessage({
  type: 'load',
  payload: {
    fileCellData: {
      'A1': { value: '100', formula: false },
      'A2': { value: '200', formula: false },
      'A3': { value: '=SUM(A1:A2)', formula: true }
    }
  }
});
```

**Worker Response**:
1. First: `updates` message with all initial cell values
2. Then: `loadComplete` message

**Notes**:
- The worker parses all formulas and builds the dependency graph
- Formulas are recalculated in topological order
- All cells (including non-formula cells) are included in the initial `updates` response

**Implementation**: `js/engine/formula-worker.js:51-65`

---

### 3. setFormula

**Purpose**: Set or update a formula in a specific cell

**When Used**: When a user enters a formula starting with `=`

**Message Format**:
```javascript
{
  type: 'setFormula',
  payload: {
    cellId: string,       // e.g., "B5"
    formulaString: string // e.g., "=SUM(A1:A10)+5"
  }
}
```

**Example**:
```javascript
formulaWorker.postMessage({
  type: 'setFormula',
  payload: {
    cellId: 'B5',
    formulaString: '=SUM(A1:A10)+5'
  }
});
```

**Worker Response**: `updates` message containing:
- The target cell's calculated value
- Any dependent cells that were recalculated

**Error Handling**: If the formula has a syntax error, the cell value will be an error string like `#ERROR!` or `#NAME?`

**Implementation**: `js/engine/formula-worker.js:67-72`

---

### 4. setCellValue

**Purpose**: Set a raw value (non-formula) in a specific cell

**When Used**: When a user enters plain text or numbers

**Message Format**:
```javascript
{
  type: 'setCellValue',
  payload: {
    cellId: string,           // e.g., "C3"
    value: string | number    // e.g., 42 or "Hello"
  }
}
```

**Example**:
```javascript
formulaWorker.postMessage({
  type: 'setCellValue',
  payload: {
    cellId: 'C3',
    value: 42
  }
});
```

**Worker Response**: `updates` message containing:
- The target cell with its new value
- Any cells with formulas that depend on this cell (recalculated)

**Type Coercion**: The engine automatically coerces string numbers to actual numbers for calculations

**Implementation**: `js/engine/formula-worker.js:74-79`

---

### 5. clearCell

**Purpose**: Delete all data from a cell

**When Used**: When a user presses Delete/Backspace on a cell

**Message Format**:
```javascript
{
  type: 'clearCell',
  payload: {
    cellId: string  // e.g., "D7"
  }
}
```

**Example**:
```javascript
formulaWorker.postMessage({
  type: 'clearCell',
  payload: {
    cellId: 'D7'
  }
});
```

**Worker Response**: `updates` message containing:
- The target cell with empty value
- Any dependent cells recalculated (if the cleared cell was referenced)

**Dependency Handling**: The worker removes the cell from the dependency graph

**Implementation**: `js/engine/formula-worker.js:81-86`

---

## Worker → Main Thread Messages

These messages are sent from the worker to the main thread using `self.postMessage()`.

### 1. ready

**Purpose**: Signal that the worker has initialized successfully

**When Sent**: Immediately when the worker script loads

**Message Format**:
```javascript
{
  type: 'ready'
}
```

**No Payload**

**Main Thread Handling**: Currently not actively listened for, but useful for debugging

**Implementation**: `js/engine/formula-worker.js:103`

---

### 2. updates

**Purpose**: Send calculated cell values back to the main thread

**When Sent**:
- After `load` (initial values)
- After `setFormula` (recalculated values)
- After `setCellValue` (recalculated dependents)
- After `clearCell` (recalculated dependents)

**Message Format**:
```javascript
{
  type: 'updates',
  payload: {
    updates: {
      [cellId: string]: string | number | Error
    }
  }
}
```

**Example**:
```javascript
// After setting A3 = SUM(A1:A2)
{
  type: 'updates',
  payload: {
    updates: {
      'A3': 300
    }
  }
}

// After changing A1 from 100 to 500 (A3 depends on A1)
{
  type: 'updates',
  payload: {
    updates: {
      'A1': 500,
      'A3': 700  // Recalculated: SUM(500, 200)
    }
  }
}
```

**Error Values**: If a formula fails, the value will be an error string:
- `#ERROR!` - General formula error
- `#NAME?` - Unknown function name
- `#DIV/0!` - Division by zero
- `#REF!` - Invalid cell reference
- `#CIRC!` - Circular dependency detected

**Main Thread Handling**: `js/spreadsheet.js:344-347`
```javascript
Object.entries(payload.updates).forEach(([cellId, value]) => {
  this.renderer.updateCellContent(cellId, value);
});
```

**Implementation**: `js/engine/formula-worker.js:59-62, 70, 77, 84`

---

### 3. loadComplete

**Purpose**: Signal that file loading and initial recalculation is complete

**When Sent**: After processing a `load` message

**Message Format**:
```javascript
{
  type: 'loadComplete'
}
```

**No Payload**

**Use Case**: Can be used to hide loading spinners or enable UI interactions

**Implementation**: `js/engine/formula-worker.js:64`

---

### 4. error

**Purpose**: Report errors that occur during message processing

**When Sent**:
- If the FormulaEngine fails to instantiate
- If any message processing throws an unexpected error

**Message Format**:
```javascript
{
  type: 'error',
  payload: {
    message: string,
    stack?: string
  }
}
```

**Example**:
```javascript
{
  type: 'error',
  payload: {
    message: 'Engine instantiation failed: Cannot import module',
    stack: 'Error: Cannot import module\n  at ...'
  }
}
```

**Main Thread Handling**: `js/spreadsheet.js:348-350`
```javascript
Logger.error('Worker', payload.message);
```

**Implementation**: `js/engine/formula-worker.js:26-29, 93-98`

---

## Message Flow Examples

### Example 1: User Enters a Formula

**User Action**: Types `=SUM(A1:A10)` in cell B5 and presses Enter

**Message Flow**:
```
Main Thread → Worker:
{
  type: 'setFormula',
  payload: {
    cellId: 'B5',
    formulaString: '=SUM(A1:A10)'
  }
}

Worker → Main Thread:
{
  type: 'updates',
  payload: {
    updates: {
      'B5': 550  // Calculated sum
    }
  }
}
```

**What Happens in Worker**:
1. Tokenizer parses `=SUM(A1:A10)` into tokens
2. Parser builds AST: `FunctionCall('SUM', Range('A1:A10'))`
3. Evaluator looks up SUM in FunctionRegistry
4. Evaluator iterates A1:A10 and sums values
5. Result stored in dependency graph
6. Updates message sent back

---

### Example 2: Cascading Recalculation

**Initial State**:
- A1 = 100
- A2 = 200
- A3 = `=A1+A2` (value: 300)
- A4 = `=A3*2` (value: 600)

**User Action**: Changes A1 to 500

**Message Flow**:
```
Main Thread → Worker:
{
  type: 'setCellValue',
  payload: {
    cellId: 'A1',
    value: 500
  }
}

Worker → Main Thread:
{
  type: 'updates',
  payload: {
    updates: {
      'A1': 500,
      'A3': 700,   // Recalculated: 500 + 200
      'A4': 1400   // Recalculated: 700 * 2
    }
  }
}
```

**What Happens in Worker**:
1. A1 value updated to 500
2. Dependency graph identifies A3 depends on A1
3. Dependency graph identifies A4 depends on A3
4. Topological sort determines order: A1 → A3 → A4
5. A3 recalculated: 500 + 200 = 700
6. A4 recalculated: 700 * 2 = 1400
7. All three cells sent in updates message

---

### Example 3: File Loading

**User Action**: Opens a saved spreadsheet

**Message Flow**:
```
Main Thread → Worker:
{
  type: 'load',
  payload: {
    fileCellData: {
      'A1': { value: '100', formula: false },
      'A2': { value: '200', formula: false },
      'A3': { value: '=A1+A2', formula: true },
      'B1': { value: '=A3*2', formula: true }
    }
  }
}

Worker → Main Thread (Message 1):
{
  type: 'updates',
  payload: {
    updates: {
      'A1': 100,
      'A2': 200,
      'A3': 300,
      'B1': 600
    }
  }
}

Worker → Main Thread (Message 2):
{
  type: 'loadComplete'
}
```

**What Happens in Worker**:
1. FormulaEngine.loadData() called
2. All cells loaded into engine's cell map
3. Formulas parsed and dependency graph built
4. Topological sort determines calculation order
5. All formulas evaluated in correct order
6. Updates message sent with all cell values
7. loadComplete signal sent

---

## Performance Considerations

### Batching Updates

The worker always sends updates in batches, never one cell at a time. When a cell changes, the worker:
1. Identifies all dependent cells
2. Calculates them in topological order
3. Sends a single `updates` message with all changes

**Benefit**: Minimizes message-passing overhead and UI repaints

### Asynchronous Calculation

The main thread never waits for worker responses. The flow is:
1. Main thread sends message (non-blocking)
2. Worker calculates (off main thread)
3. Worker sends result back
4. Main thread updates UI when response arrives

**Benefit**: UI remains responsive even during complex recalculations

### No Synchronous API

There is **no way** to synchronously get a value from the worker. All operations are fire-and-forget with async responses.

**Implication**: The main thread's FileManager stores the raw formula strings, while the worker stores calculated values. They're eventually consistent via the message protocol.

---

## Error Handling

### Worker-Side Errors

When the worker encounters an error during message processing:

1. **Catch Block**: `js/engine/formula-worker.js:91-98`
2. **Error Message**: Sent via `error` type
3. **Worker Continues**: The worker doesn't crash; it's ready for next message

**Example Error Scenarios**:
- Invalid formula syntax: Returns `#ERROR!` as cell value
- Unknown function: Returns `#NAME?` as cell value
- Circular dependency: Returns `#CIRC!` as cell value
- Worker crash: Main thread will see no response (timeout handling recommended)

### Main Thread Error Handling

The main thread currently logs errors to console but doesn't show user-facing alerts. Future improvements could:
- Show error toast notifications
- Display error indicators in cells
- Implement retry logic for critical operations

---

## Testing the Protocol

### Manual Testing via Console

You can test the protocol directly from the browser console:

```javascript
// Access the worker
const worker = window.spreadsheet.formulaWorker;

// Send a test message
worker.postMessage({
  type: 'setFormula',
  payload: {
    cellId: 'Z99',
    formulaString: '=1+1'
  }
});

// Listen for response
worker.onmessage = (e) => console.log('Worker response:', e.data);
```

### Unit Testing

Worker protocol tests are in `tests/engine/formula-worker.test.js` (if they exist). To test:

1. Instantiate worker in test environment
2. Send messages via postMessage
3. Assert on received messages
4. Test error scenarios

**Example**:
```javascript
test('setFormula sends updates message', (done) => {
  const worker = new Worker('./js/engine/formula-worker.js', { type: 'module' });

  worker.onmessage = (e) => {
    if (e.data.type === 'updates') {
      expect(e.data.payload.updates['A1']).toBe(2);
      done();
    }
  };

  worker.postMessage({
    type: 'setFormula',
    payload: { cellId: 'A1', formulaString: '=1+1' }
  });
});
```

---

## Future Extensions

### Potential New Messages

**Main Thread → Worker**:
- `moveCell` - Move a cell and update all references
- `copyCell` - Copy a cell with relative reference adjustment
- `reevaluate` - Force recalculation of all formulas (for volatile functions)
- `getMetrics` - Request performance metrics (calc time, dependency count)

**Worker → Main Thread**:
- `metrics` - Performance data for profiling
- `progress` - Progress updates for long calculations
- `warning` - Non-fatal warnings (e.g., precision loss)

### Streaming Large Updates

For spreadsheets with thousands of dependent cells, the worker could:
1. Send updates in chunks (e.g., 100 cells at a time)
2. Use `TransferableObjects` for large data
3. Implement priority queue (visible cells first)

---

## Related Documentation

- **Architecture**: See [docs/architecture/02-formula-engine.md](../architecture/02-formula-engine.md) for engine internals
- **REST API**: See [docs/api-reference/rest-api.md](./rest-api.md) for file persistence protocol
- **Worker Implementation**: `js/engine/formula-worker.js`
- **Main Thread Handler**: `js/spreadsheet.js:340-352`
