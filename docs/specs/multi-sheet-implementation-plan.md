# Multi-Sheet Support - Implementation Plan

**Status:** Draft
**Date:** 2024-12-14
**Epic Reference:** `docs/specs/archive/epic_05_multi_sheet_support.md`

---

## Overview

This document provides a staged implementation plan for adding multi-sheet (workbook) support to v-sheet. Each stage is designed to be independently testable before proceeding to the next.

### Key Design Decisions

| Decision | Choice |
|----------|--------|
| Sheet reference syntax | `SheetName!A1` and `'Sheet Name'!A1` (quoted for spaces) |
| Cross-sheet ranges | Single sheet only (`Sheet1!A1:B5`, NOT `Sheet1!A1:Sheet2!B2`) |
| Data migration | Server-side (Python), auto-migrate to "Sheet1" |
| Sheet tab position | Bottom of grid |
| Sheet operations | Add, Delete, Rename, Reorder (drag), Hide |
| Context menu | Yes |
| PointMode behavior | Auto-insert `SheetName!` on tab click during formula edit |
| Cross-sheet ref colors | No (same highlighting as local refs) |
| Error on sheet delete | Immediate `#REF!` error |
| Cross-sheet circular refs | Detect and block |
| Undo sheet operations | Full undo/redo with data restore |
| Cell limit | 1,000,000 cells per file |
| Inactive sheet loading | Lazy-load (not fully in memory) |

---

## Stage 1: Data Model & Server Migration

**Goal:** Update file format and server to support multiple sheets, with backward compatibility.

### 1.1 Update Server Data Model

**File:** `server/app.py`

**Tasks:**
1. Define new file structure:
   ```python
   {
     "id": "uuid",
     "name": "Workbook Name",
     "created": "ISO timestamp",
     "modified": "ISO timestamp",
     "data": {
       "activeSheetId": "sheet_uuid_1",
       "sheets": [
         {
           "id": "sheet_uuid_1",
           "name": "Sheet1",
           "visible": true,
           "cells": { "A1": {...}, "B2": {...} },
           "columnWidths": { "A": 100 },
           "rowHeights": { "1": 25 },
           "metadata": { "lastActiveCell": "A1" }
         }
       ],
       "styles": { ... },  // Shared across all sheets
       "sheetOrder": ["sheet_uuid_1", "sheet_uuid_2"]  // For reordering
     }
   }
   ```

2. Create migration function:
   ```python
   def migrate_single_sheet_to_multi(file_data):
       """Migrate old single-sheet format to new multi-sheet format."""
       # Detect old format (has data.cells at top level)
       # Wrap existing data in sheets array
       # Generate sheet ID and default name "Sheet1"
   ```

3. Update `create_file()` endpoint to initialize with one empty sheet

4. Update `load_file()` endpoint to auto-migrate old files

5. Update `save_file()` endpoint to handle new structure

### 1.2 Update File Format Schema

**File:** `docs/manuals/api-reference/file-format-schema.md`

**Tasks:**
1. Document new multi-sheet structure
2. Document migration behavior
3. Add examples of multi-sheet files

### 1.3 Testing (Stage 1)

**Unit Tests:**
- `tests/server/test_migration.py` (new)
  - Test migration of old format to new
  - Test loading already-migrated files
  - Test creating new files with default sheet

**Manual Testing:**
- Start server with old-format file, verify it loads
- Create new file, verify JSON structure
- Verify existing E2E tests still pass

---

## Stage 2: Client-Side FileManager Refactor

**Goal:** Update FileManager to work with multi-sheet data model.

### 2.1 FileManager Sheet Management

**File:** `js/file-manager.js`

**New Properties:**
```javascript
this.activeSheetId = null;
this.sheetCache = new Map();  // sheetId -> sheet data (lazy loading)
```

**New Methods:**
```javascript
// Sheet navigation
getSheets()                    // Returns array of {id, name, visible}
getActiveSheet()               // Returns active sheet object
getSheetById(sheetId)          // Returns sheet object (loads if needed)
getSheetByName(name)           // Returns sheet object by name
setActiveSheet(sheetId)        // Switch active sheet

// Sheet CRUD
addSheet(name?)                // Add new sheet, returns sheet object
deleteSheet(sheetId)           // Delete sheet, returns deleted data (for undo)
renameSheet(sheetId, newName)  // Rename sheet
reorderSheets(orderedIds)      // Reorder sheets
setSheetVisibility(sheetId, visible)  // Hide/show sheet

// Cell operations (now sheet-aware)
getCellData(cellId, sheetId?)  // Default to active sheet
updateCellData(cellId, data, sheetId?)
getRawCellValue(cellId, sheetId?)
getCellStyle(cellId, sheetId?)

// Validation
getTotalCellCount()            // Sum across all sheets
validateCellLimit()            // Check 1M limit

// Sheet name utilities
isValidSheetName(name)         // Check for duplicates, invalid chars
sanitizeSheetName(name)        // Clean up sheet name
generateUniqueSheetName()      // "Sheet2", "Sheet3", etc.
```

### 2.2 Lazy Loading Strategy

**Implementation:**
```javascript
getSheetById(sheetId) {
  // Check cache first
  if (this.sheetCache.has(sheetId)) {
    return this.sheetCache.get(sheetId);
  }

  // Find sheet in file data
  const sheet = this.currentFile.data.sheets.find(s => s.id === sheetId);
  if (!sheet) return null;

  // Cache and return
  this.sheetCache.set(sheetId, sheet);
  return sheet;
}

// Clear cache on file switch
clearSheetCache() {
  this.sheetCache.clear();
}
```

### 2.3 Update Existing FileManager Methods

**Methods to modify:**
- `loadFile()` - Set activeSheetId, clear cache
- `saveCurrentFile()` - Include all sheets in save
- `updateCellData()` - Add sheetId parameter
- `getRawCellValue()` - Add sheetId parameter
- `getCellStyle()` - Add sheetId parameter
- `updateCellFormat()` - Add sheetId parameter
- `updateMetadata()` - Sheet-specific metadata

### 2.4 Testing (Stage 2)

**Unit Tests:** `tests/file-manager.test.js`
- Test getSheets() returns correct list
- Test addSheet() creates valid sheet
- Test deleteSheet() removes and returns data
- Test renameSheet() with valid/invalid names
- Test reorderSheets() updates order
- Test getCellData() with explicit sheetId
- Test lazy loading (cache behavior)
- Test cell limit validation

**Integration Test:**
- Load file → switch sheets → verify data isolation
- Add sheet → delete sheet → verify file structure

---

## Stage 3: Formula Engine - Cross-Sheet Reference Parsing

**Goal:** Update Tokenizer and Parser to recognize `SheetName!A1` and `'Sheet Name'!A1` syntax.

### 3.1 Tokenizer Updates

**File:** `js/engine/parser/Tokenizer.js`

**New Token Types:**
```javascript
// Add to token types
SHEET_REF: 'SHEET_REF',        // Combined: Sheet1!A1 or 'My Sheet'!A1
BANG: 'BANG',                  // ! character (for debugging)
```

**New Pattern Recognition:**

```javascript
// Option A: Single regex for complete sheet reference
// Pattern: (SheetName|'Sheet Name')![$]?[A-Z]+[$]?[0-9]+
const SHEET_CELL_REF = /^(?:([A-Za-z_][A-Za-z0-9_]*)|'([^']+)')!(\$?[A-Z]+\$?[0-9]+)$/;

// Option B: Tokenize separately and let parser combine
// - IDENTIFIER or QUOTED_STRING
// - BANG (!)
// - CELL_REF
```

**Recommended Approach (Option B - more flexible):**

1. Add `BANG` token recognition:
   ```javascript
   if (char === '!') {
     this.advance();
     return this.makeToken('BANG', '!');
   }
   ```

2. Add quoted string handling:
   ```javascript
   if (char === "'") {
     return this.readQuotedString();  // Returns QUOTED_STRING token
   }

   readQuotedString() {
     this.advance();  // Skip opening quote
     let value = '';
     while (this.current() !== "'" && !this.isAtEnd()) {
       if (this.current() === "''" ) {
         // Escaped quote
         value += "'";
         this.advance();
       }
       value += this.current();
       this.advance();
     }
     this.advance();  // Skip closing quote
     return this.makeToken('QUOTED_STRING', value);
   }
   ```

### 3.2 Parser Updates

**File:** `js/engine/parser/Parser.js`

**New AST Node Types:**
```javascript
// Local cell reference (unchanged)
{ type: 'cell', ref: 'A1' }

// Local range (unchanged)
{ type: 'range', start: 'A1', end: 'B5' }

// Cross-sheet cell reference
{ type: 'cell', ref: 'A1', sheet: 'Sheet1' }

// Cross-sheet range (single sheet only)
{ type: 'range', start: 'A1', end: 'B5', sheet: 'Data' }
```

**Grammar Update:**

```
primary ::= NUMBER
          | STRING
          | TRUE | FALSE
          | LPAREN expression RPAREN
          | function_call
          | cell_or_range
          | sheet_cell_or_range

cell_or_range ::= CELL_REF (COLON CELL_REF)?

sheet_cell_or_range ::= sheet_prefix CELL_REF (COLON CELL_REF)?

sheet_prefix ::= IDENTIFIER BANG
               | QUOTED_STRING BANG
```

**Implementation:**

```javascript
parsePrimary() {
  // ... existing cases ...

  // Check for sheet prefix (IDENTIFIER! or 'string'!)
  if (this.check('IDENTIFIER') || this.check('QUOTED_STRING')) {
    const lookahead = this.peek(1);  // Need lookahead
    if (lookahead && lookahead.type === 'BANG') {
      return this.parseSheetReference();
    }
  }

  // ... rest of existing logic ...
}

parseSheetReference() {
  // Get sheet name (IDENTIFIER or QUOTED_STRING)
  let sheetName;
  if (this.match('IDENTIFIER')) {
    sheetName = this.previous().value;
  } else if (this.match('QUOTED_STRING')) {
    sheetName = this.previous().value;
  }

  // Consume BANG
  this.consume('BANG', "Expected '!' after sheet name");

  // Must be followed by cell reference
  this.consume('CELL_REF', "Expected cell reference after 'SheetName!'");
  const startCell = this.previous().value;

  // Check for range
  if (this.match('COLON')) {
    this.consume('CELL_REF', "Expected cell reference after ':'");
    const endCell = this.previous().value;
    return { type: 'range', start: startCell, end: endCell, sheet: sheetName };
  }

  return { type: 'cell', ref: startCell, sheet: sheetName };
}
```

### 3.3 CellHelpers Updates

**File:** `js/engine/utils/CellHelpers.js`

**New Functions:**
```javascript
/**
 * Parse a potentially sheet-qualified cell reference
 * @param {string} ref - e.g., "A1", "Sheet1!A1", "'My Sheet'!$A$1"
 * @returns {{ sheet: string|null, col: number, row: number, colAbs: boolean, rowAbs: boolean }}
 */
parseSheetCellRef(ref) {
  // Parse sheet prefix if present
  let sheet = null;
  let cellPart = ref;

  const bangIndex = ref.indexOf('!');
  if (bangIndex > 0) {
    const sheetPart = ref.substring(0, bangIndex);
    // Handle quoted sheet name
    if (sheetPart.startsWith("'") && sheetPart.endsWith("'")) {
      sheet = sheetPart.slice(1, -1);
    } else {
      sheet = sheetPart;
    }
    cellPart = ref.substring(bangIndex + 1);
  }

  // Parse cell part using existing parseCellRef
  const cellInfo = parseCellRef(cellPart);
  return { ...cellInfo, sheet };
}

/**
 * Build a cell reference string, optionally with sheet qualifier
 */
buildSheetCellRef(row, col, colAbs, rowAbs, sheet) {
  const cellRef = buildCellRef(row, col, colAbs, rowAbs);
  if (!sheet) return cellRef;

  // Quote sheet name if it contains spaces or special chars
  if (/[^A-Za-z0-9_]/.test(sheet)) {
    return `'${sheet}'!${cellRef}`;
  }
  return `${sheet}!${cellRef}`;
}

/**
 * Check if a sheet name requires quoting
 */
needsQuoting(sheetName) {
  return /[^A-Za-z0-9_]/.test(sheetName);
}
```

### 3.4 Testing (Stage 3)

**Unit Tests:** `tests/engine/parser/`

**Tokenizer Tests:**
```javascript
// tests/engine/parser/Tokenizer.test.js
describe('Sheet reference tokenization', () => {
  test('tokenizes Sheet1!A1', () => {
    const tokens = tokenize('Sheet1!A1');
    expect(tokens).toEqual([
      { type: 'IDENTIFIER', value: 'Sheet1' },
      { type: 'BANG', value: '!' },
      { type: 'CELL_REF', value: 'A1' },
      { type: 'EOF' }
    ]);
  });

  test('tokenizes quoted sheet name', () => {
    const tokens = tokenize("'My Sheet'!A1");
    expect(tokens).toEqual([
      { type: 'QUOTED_STRING', value: 'My Sheet' },
      { type: 'BANG', value: '!' },
      { type: 'CELL_REF', value: 'A1' },
      { type: 'EOF' }
    ]);
  });

  test('tokenizes sheet range', () => {
    const tokens = tokenize('Data!A1:B5');
    // ... verify tokens
  });
});
```

**Parser Tests:**
```javascript
// tests/engine/parser/Parser.test.js
describe('Sheet reference parsing', () => {
  test('parses simple sheet cell ref', () => {
    const ast = parse('=Sheet1!A1');
    expect(ast).toEqual({
      type: 'cell',
      ref: 'A1',
      sheet: 'Sheet1'
    });
  });

  test('parses quoted sheet cell ref', () => {
    const ast = parse("='My Data'!B2");
    expect(ast).toEqual({
      type: 'cell',
      ref: 'B2',
      sheet: 'My Data'
    });
  });

  test('parses sheet range ref', () => {
    const ast = parse('=SUM(Data!A1:A10)');
    // Verify range with sheet property
  });

  test('parses absolute refs in sheet context', () => {
    const ast = parse('=Sheet1!$A$1');
    expect(ast.ref).toBe('$A$1');
    expect(ast.sheet).toBe('Sheet1');
  });

  test('mixed local and remote refs', () => {
    const ast = parse('=A1 + Sheet2!B1');
    // Verify both refs parsed correctly
  });
});
```

---

## Stage 4: Formula Engine - Cross-Sheet Evaluation

**Goal:** Enable evaluation of formulas with cross-sheet references.

### 4.1 Evaluator Updates

**File:** `js/engine/Evaluator.js`

**Constructor Changes:**
```javascript
constructor({ getCellValue, getRangeValues, functionRegistry }) {
  // getCellValue signature: (cellId, sheetId?) => value
  // getRangeValues signature: (start, end, sheetId?) => array
  this.getCellValue = getCellValue;
  this.getRangeValues = getRangeValues;
  this.functionRegistry = functionRegistry;
}
```

**Evaluation Changes:**
```javascript
evaluate(node) {
  switch (node.type) {
    case 'cell':
      // Pass sheet if present, otherwise null (use current sheet)
      return this.getCellValue(node.ref, node.sheet || null);

    case 'range':
      // Pass sheet if present
      return this.getRangeValues(node.start, node.end, node.sheet || null);

    // ... other cases unchanged
  }
}
```

### 4.2 FormulaEngine Updates

**File:** `js/engine/FormulaEngine.js`

**New Properties:**
```javascript
this.sheets = new Map();           // sheetId -> { cells: Map, name: string }
this.activeSheetId = null;         // Current evaluation context
this.sheetNameToId = new Map();    // 'Sheet1' -> 'sheet_uuid_1'
```

**New Methods:**
```javascript
/**
 * Load all sheets data
 */
loadSheets(sheetsData) {
  this.sheets.clear();
  this.sheetNameToId.clear();

  for (const sheet of sheetsData) {
    this.sheets.set(sheet.id, {
      cells: new Map(Object.entries(sheet.cells || {})),
      name: sheet.name
    });
    this.sheetNameToId.set(sheet.name, sheet.id);
  }
}

/**
 * Set active sheet for evaluation context
 */
setActiveSheet(sheetId) {
  this.activeSheetId = sheetId;
}

/**
 * Resolve sheet name to sheet ID
 */
resolveSheetId(sheetName) {
  if (!sheetName) return this.activeSheetId;
  return this.sheetNameToId.get(sheetName) || null;
}

/**
 * Get cell value, potentially from another sheet
 */
getCellValueForEval(cellId, sheetName) {
  const sheetId = this.resolveSheetId(sheetName);
  if (!sheetId) {
    return { type: 'error', value: '#REF!', message: `Sheet "${sheetName}" not found` };
  }

  const sheet = this.sheets.get(sheetId);
  if (!sheet) {
    return { type: 'error', value: '#REF!', message: `Sheet not loaded` };
  }

  const cell = sheet.cells.get(cellId);
  return cell?.value ?? 0;  // Default to 0 for empty cells
}

/**
 * Get range values, potentially from another sheet
 */
getRangeValuesForEval(start, end, sheetName) {
  const sheetId = this.resolveSheetId(sheetName);
  if (!sheetId) {
    return { type: 'error', value: '#REF!', message: `Sheet "${sheetName}" not found` };
  }

  const sheet = this.sheets.get(sheetId);
  if (!sheet) {
    return { type: 'error', value: '#REF!', message: `Sheet not loaded` };
  }

  // Expand range and collect values
  const cellIds = expandRange(start, end);
  return cellIds.map(id => sheet.cells.get(id)?.value ?? 0);
}
```

**Update setFormula():**
```javascript
setFormula(cellId, formula, sheetId) {
  // cellId is local (e.g., "A1"), sheetId identifies the sheet
  const globalCellId = this.makeGlobalCellId(cellId, sheetId);

  // Parse and extract dependencies with sheet context
  const { ast, dependencies } = this.parseWithDependencies(formula, sheetId);

  // Update dependency graph with global IDs
  this.dependencyGraph.updateDependencies(globalCellId, dependencies);

  // Evaluate and store result
  // ...
}

/**
 * Create globally unique cell ID
 */
makeGlobalCellId(cellId, sheetId) {
  return `${sheetId}:${cellId}`;
}

/**
 * Parse global cell ID back to components
 */
parseGlobalCellId(globalId) {
  const [sheetId, cellId] = globalId.split(':');
  return { sheetId, cellId };
}
```

### 4.3 Dependency Extraction Updates

**Update `_extractDependencies()`:**
```javascript
_extractDependencies(ast, currentSheetId, dependencies = new Set()) {
  if (!ast) return dependencies;

  switch (ast.type) {
    case 'cell': {
      const refSheetId = ast.sheet
        ? this.resolveSheetId(ast.sheet)
        : currentSheetId;

      if (!refSheetId) {
        // Sheet doesn't exist - will cause #REF! at eval time
        break;
      }

      // Add as global cell ID
      dependencies.add(this.makeGlobalCellId(ast.ref, refSheetId));
      break;
    }

    case 'range': {
      const refSheetId = ast.sheet
        ? this.resolveSheetId(ast.sheet)
        : currentSheetId;

      if (!refSheetId) break;

      // Expand range and add all cells
      const cellIds = expandRange(ast.start, ast.end);
      for (const cellId of cellIds) {
        dependencies.add(this.makeGlobalCellId(cellId, refSheetId));
      }
      break;
    }

    case 'binary':
    case 'unary':
    case 'function':
      // Recurse into children
      // ...
  }

  return dependencies;
}
```

### 4.4 Testing (Stage 4)

**Unit Tests:** `tests/engine/FormulaEngine.test.js`

```javascript
describe('Cross-sheet evaluation', () => {
  let engine;

  beforeEach(() => {
    engine = new FormulaEngine();
    engine.loadSheets([
      { id: 's1', name: 'Sheet1', cells: { 'A1': { value: 10 } } },
      { id: 's2', name: 'Data', cells: { 'B1': { value: 20 } } },
      { id: 's3', name: 'My Sheet', cells: { 'C1': { value: 30 } } }
    ]);
  });

  test('evaluates simple cross-sheet ref', () => {
    engine.setActiveSheet('s1');
    const result = engine.evaluate('=Data!B1');
    expect(result).toBe(20);
  });

  test('evaluates quoted sheet name', () => {
    engine.setActiveSheet('s1');
    const result = engine.evaluate("='My Sheet'!C1");
    expect(result).toBe(30);
  });

  test('returns #REF! for missing sheet', () => {
    engine.setActiveSheet('s1');
    const result = engine.evaluate('=Missing!A1');
    expect(result).toEqual({ type: 'error', value: '#REF!' });
  });

  test('evaluates cross-sheet range', () => {
    engine.loadSheets([
      { id: 's1', name: 'Sheet1', cells: {} },
      { id: 's2', name: 'Data', cells: {
        'A1': { value: 1 },
        'A2': { value: 2 },
        'A3': { value: 3 }
      }}
    ]);
    engine.setActiveSheet('s1');
    const result = engine.evaluate('=SUM(Data!A1:A3)');
    expect(result).toBe(6);
  });

  test('mixed local and remote refs', () => {
    engine.setActiveSheet('s1');
    const result = engine.evaluate('=A1 + Data!B1');
    expect(result).toBe(30);  // 10 + 20
  });
});
```

---

## Stage 5: DependencyGraph - Cross-Sheet Support

**Goal:** Track dependencies across sheets for correct recalculation order and circular reference detection.

### 5.1 DependencyGraph Updates

**File:** `js/engine/DependencyGraph.js`

**Key Changes:**
- All cell IDs are now global: `"sheetId:cellId"` format
- No changes to core algorithms, just ID format

**Updated Methods:**
```javascript
/**
 * Update dependencies using global cell IDs
 * @param {string} globalCellId - e.g., "sheet1:A1"
 * @param {Set<string>} newDependencies - Set of global cell IDs
 */
updateDependencies(globalCellId, newDependencies) {
  // Same logic, different ID format
  this._remove(globalCellId);
  this.dependencies.set(globalCellId, newDependencies);

  for (const dep of newDependencies) {
    if (!this.dependents.has(dep)) {
      this.dependents.set(dep, new Set());
    }
    this.dependents.get(dep).add(globalCellId);
  }
}

/**
 * Check for circular references across sheets
 */
checkForCircularReference(globalCellId, newDependencies) {
  // Same algorithm works for global IDs
  // e.g., s1:A1 -> s2:B1 -> s1:A1 is correctly detected
}

/**
 * Get recalculation order across sheets
 */
getRecalculationOrder(changedGlobalCellId) {
  // Returns array of global cell IDs in order
  // e.g., ["s2:B1", "s1:C5", "s3:A1"]
}
```

### 5.2 Testing (Stage 5)

**Unit Tests:** `tests/engine/DependencyGraph.test.js`

```javascript
describe('Cross-sheet dependencies', () => {
  let graph;

  beforeEach(() => {
    graph = new DependencyGraph();
  });

  test('tracks cross-sheet dependency', () => {
    // s1:A1 depends on s2:B1
    graph.updateDependencies('s1:A1', new Set(['s2:B1']));

    expect(graph.dependencies.get('s1:A1')).toContain('s2:B1');
    expect(graph.dependents.get('s2:B1')).toContain('s1:A1');
  });

  test('detects cross-sheet circular reference', () => {
    // s1:A1 = s2:B1
    graph.updateDependencies('s1:A1', new Set(['s2:B1']));

    // s2:B1 = s1:A1 (would create cycle)
    const hasCycle = graph.checkForCircularReference('s2:B1', new Set(['s1:A1']));
    expect(hasCycle).toBe(true);
  });

  test('recalculation order spans sheets', () => {
    // s1:A1 (no deps)
    // s2:B1 = s1:A1
    // s1:C1 = s2:B1
    graph.updateDependencies('s2:B1', new Set(['s1:A1']));
    graph.updateDependencies('s1:C1', new Set(['s2:B1']));

    const order = graph.getRecalculationOrder('s1:A1');

    // s2:B1 must come before s1:C1
    const b1Index = order.indexOf('s2:B1');
    const c1Index = order.indexOf('s1:C1');
    expect(b1Index).toBeLessThan(c1Index);
  });

  test('handles three-sheet dependency chain', () => {
    // s1:A1 -> s2:A1 -> s3:A1 -> s1:B1
    graph.updateDependencies('s2:A1', new Set(['s1:A1']));
    graph.updateDependencies('s3:A1', new Set(['s2:A1']));
    graph.updateDependencies('s1:B1', new Set(['s3:A1']));

    const order = graph.getRecalculationOrder('s1:A1');
    expect(order).toEqual(['s2:A1', 's3:A1', 's1:B1']);
  });
});
```

---

## Stage 6: Worker Protocol Updates

**Goal:** Update Web Worker communication for multi-sheet operations.

### 6.1 Worker Message Protocol

**File:** `js/engine/formula-worker.js`

**New Message Types:**
```javascript
// Main thread -> Worker
{
  type: 'loadSheets',
  payload: {
    sheets: [
      { id: 's1', name: 'Sheet1', cells: {...} },
      { id: 's2', name: 'Data', cells: {...} }
    ]
  }
}

{
  type: 'setActiveSheet',
  payload: { sheetId: 's1' }
}

{
  type: 'addSheet',
  payload: { sheet: { id: 's3', name: 'New Sheet', cells: {} } }
}

{
  type: 'deleteSheet',
  payload: { sheetId: 's2' }
}

{
  type: 'renameSheet',
  payload: { sheetId: 's1', newName: 'Data' }
}

{
  type: 'setFormula',
  payload: {
    sheetId: 's1',      // Which sheet this cell is on
    cellId: 'A1',       // Local cell ID
    formula: '=Data!B1' // Formula (may reference other sheets)
  }
}

// Worker -> Main thread
{
  type: 'updates',
  payload: {
    cells: {
      's1:A1': { value: 42 },      // Global cell IDs
      's1:B1': { value: 100 },
      's2:C1': { value: '#REF!' }  // Cross-sheet update
    }
  }
}

{
  type: 'sheetDeleted',
  payload: {
    affectedCells: ['s1:A1', 's3:B2'],  // Cells now showing #REF!
    deletedSheetId: 's2'
  }
}
```

### 6.2 Worker Implementation Updates

**File:** `js/engine/formula-worker.js`

```javascript
self.onmessage = (event) => {
  const { type, payload, msgId } = event.data;

  switch (type) {
    case 'loadSheets':
      engine.loadSheets(payload.sheets);
      postResponse(msgId, { success: true });
      break;

    case 'setActiveSheet':
      engine.setActiveSheet(payload.sheetId);
      postResponse(msgId, { success: true });
      break;

    case 'addSheet':
      engine.addSheet(payload.sheet);
      postResponse(msgId, { success: true });
      break;

    case 'deleteSheet': {
      const affected = engine.deleteSheet(payload.sheetId);
      // Recalculate formulas that referenced deleted sheet
      const updates = engine.recalculateAffected(affected);
      postResponse(msgId, {
        success: true,
        updates,
        affectedCells: affected
      });
      break;
    }

    case 'renameSheet':
      // Note: This requires updating all formulas that reference old name
      const renames = engine.renameSheet(payload.sheetId, payload.newName);
      postResponse(msgId, {
        success: true,
        formulaUpdates: renames  // Cells whose formula text changed
      });
      break;

    case 'setFormula': {
      const result = engine.setFormula(
        payload.cellId,
        payload.formula,
        payload.sheetId
      );
      postResponse(msgId, {
        success: true,
        updates: result.updates  // Map of globalCellId -> value
      });
      break;
    }

    // ... existing cases with sheetId added
  }
};
```

### 6.3 Main Thread Worker Interface

**File:** `js/spreadsheet.js` (or new `js/WorkerManager.js`)

```javascript
class WorkerManager {
  constructor() {
    this.worker = new Worker('js/engine/formula-worker.js', { type: 'module' });
    this.pendingMessages = new Map();
    this.msgId = 0;

    this.worker.onmessage = this.handleMessage.bind(this);
  }

  async loadSheets(sheets) {
    return this.postMessage('loadSheets', { sheets });
  }

  async setActiveSheet(sheetId) {
    return this.postMessage('setActiveSheet', { sheetId });
  }

  async setFormula(sheetId, cellId, formula) {
    return this.postMessage('setFormula', { sheetId, cellId, formula });
  }

  async deleteSheet(sheetId) {
    const result = await this.postMessage('deleteSheet', { sheetId });
    // Handle #REF! updates in UI
    return result;
  }

  // Promise-based message handling
  postMessage(type, payload) {
    return new Promise((resolve, reject) => {
      const id = ++this.msgId;
      this.pendingMessages.set(id, { resolve, reject });
      this.worker.postMessage({ type, payload, msgId: id });
    });
  }

  handleMessage(event) {
    const { msgId, ...data } = event.data;
    const pending = this.pendingMessages.get(msgId);
    if (pending) {
      pending.resolve(data);
      this.pendingMessages.delete(msgId);
    }
  }
}
```

### 6.4 Testing (Stage 6)

**Integration Tests:**
- Send `loadSheets` → verify engine state
- Send `setFormula` with cross-sheet ref → verify correct evaluation
- Send `deleteSheet` → verify `#REF!` errors returned
- Verify message round-trip timing

---

## Stage 7: Sheet Tab UI

**Goal:** Add sheet tab bar with full management capabilities.

### 7.1 HTML Structure

**File:** `index.html`

Add below `#spreadsheet-container`:
```html
<div id="sheet-bar">
  <div id="sheet-tabs-container">
    <!-- Tabs rendered by JavaScript -->
  </div>
  <button id="add-sheet-btn" class="sheet-bar-btn" title="Add sheet">+</button>
</div>

<!-- Context menu (hidden by default) -->
<div id="sheet-context-menu" class="context-menu hidden">
  <div class="context-menu-item" data-action="rename">Rename</div>
  <div class="context-menu-item" data-action="delete">Delete</div>
  <div class="context-menu-item" data-action="hide">Hide</div>
  <div class="context-menu-item" data-action="unhide">Unhide sheets...</div>
  <div class="context-menu-divider"></div>
  <div class="context-menu-item" data-action="duplicate">Duplicate</div>
</div>

<!-- Unhide sheets dialog -->
<div id="unhide-dialog" class="dialog hidden">
  <div class="dialog-content">
    <h3>Unhide Sheet</h3>
    <select id="unhide-sheet-select"></select>
    <div class="dialog-buttons">
      <button class="btn-cancel">Cancel</button>
      <button class="btn-ok">OK</button>
    </div>
  </div>
</div>
```

### 7.2 Sheet Tab Component

**File:** `js/ui/SheetTabBar.js` (new)

```javascript
export class SheetTabBar {
  constructor({ container, fileManager, onSheetSwitch, onSheetChange }) {
    this.container = container;
    this.fileManager = fileManager;
    this.onSheetSwitch = onSheetSwitch;
    this.onSheetChange = onSheetChange;  // For history integration

    this.tabsContainer = container.querySelector('#sheet-tabs-container');
    this.addBtn = container.querySelector('#add-sheet-btn');
    this.contextMenu = document.getElementById('sheet-context-menu');

    this.dragState = null;
    this.contextMenuTarget = null;

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Add sheet button
    this.addBtn.addEventListener('click', () => this.addSheet());

    // Tab clicks
    this.tabsContainer.addEventListener('click', (e) => {
      const tab = e.target.closest('.sheet-tab');
      if (tab) this.handleTabClick(tab, e);
    });

    // Double-click to rename
    this.tabsContainer.addEventListener('dblclick', (e) => {
      const tab = e.target.closest('.sheet-tab');
      if (tab) this.startRename(tab);
    });

    // Right-click context menu
    this.tabsContainer.addEventListener('contextmenu', (e) => {
      const tab = e.target.closest('.sheet-tab');
      if (tab) {
        e.preventDefault();
        this.showContextMenu(tab, e);
      }
    });

    // Drag and drop for reordering
    this.tabsContainer.addEventListener('dragstart', (e) => this.handleDragStart(e));
    this.tabsContainer.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.tabsContainer.addEventListener('drop', (e) => this.handleDrop(e));
    this.tabsContainer.addEventListener('dragend', (e) => this.handleDragEnd(e));

    // Context menu actions
    this.contextMenu.addEventListener('click', (e) => this.handleContextMenuAction(e));

    // Close context menu on outside click
    document.addEventListener('click', () => this.hideContextMenu());
  }

  render() {
    const sheets = this.fileManager.getSheets();
    const activeId = this.fileManager.activeSheetId;

    this.tabsContainer.innerHTML = '';

    for (const sheet of sheets) {
      if (!sheet.visible) continue;  // Hidden sheets not shown

      const tab = document.createElement('div');
      tab.className = `sheet-tab ${sheet.id === activeId ? 'active' : ''}`;
      tab.dataset.sheetId = sheet.id;
      tab.draggable = true;
      tab.innerHTML = `<span class="sheet-tab-name">${this.escapeHtml(sheet.name)}</span>`;

      this.tabsContainer.appendChild(tab);
    }
  }

  handleTabClick(tab, event) {
    const sheetId = tab.dataset.sheetId;
    if (sheetId !== this.fileManager.activeSheetId) {
      this.onSheetSwitch(sheetId);
    }
  }

  addSheet() {
    const sheet = this.fileManager.addSheet();
    this.onSheetChange({ type: 'add', sheet });
    this.render();
    this.onSheetSwitch(sheet.id);
  }

  startRename(tab) {
    const nameSpan = tab.querySelector('.sheet-tab-name');
    const currentName = nameSpan.textContent;

    // Replace with input
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'sheet-tab-input';
    input.value = currentName;

    nameSpan.replaceWith(input);
    input.focus();
    input.select();

    const finishRename = () => {
      const newName = input.value.trim();
      if (newName && newName !== currentName) {
        const sheetId = tab.dataset.sheetId;
        if (this.fileManager.isValidSheetName(newName)) {
          this.fileManager.renameSheet(sheetId, newName);
          this.onSheetChange({ type: 'rename', sheetId, oldName: currentName, newName });
        }
      }
      this.render();  // Re-render to show updated name
    };

    input.addEventListener('blur', finishRename);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finishRename();
      if (e.key === 'Escape') this.render();
    });
  }

  showContextMenu(tab, event) {
    this.contextMenuTarget = tab.dataset.sheetId;

    // Position menu
    this.contextMenu.style.left = `${event.clientX}px`;
    this.contextMenu.style.top = `${event.clientY}px`;
    this.contextMenu.classList.remove('hidden');

    // Update menu items based on state
    const sheets = this.fileManager.getSheets();
    const visibleCount = sheets.filter(s => s.visible).length;

    // Can't delete last visible sheet
    const deleteItem = this.contextMenu.querySelector('[data-action="delete"]');
    deleteItem.classList.toggle('disabled', visibleCount <= 1);

    // Can't hide last visible sheet
    const hideItem = this.contextMenu.querySelector('[data-action="hide"]');
    hideItem.classList.toggle('disabled', visibleCount <= 1);

    // Show "Unhide" only if there are hidden sheets
    const hasHidden = sheets.some(s => !s.visible);
    const unhideItem = this.contextMenu.querySelector('[data-action="unhide"]');
    unhideItem.classList.toggle('disabled', !hasHidden);
  }

  hideContextMenu() {
    this.contextMenu.classList.add('hidden');
    this.contextMenuTarget = null;
  }

  handleContextMenuAction(event) {
    const action = event.target.dataset.action;
    if (!action || !this.contextMenuTarget) return;
    if (event.target.classList.contains('disabled')) return;

    const sheetId = this.contextMenuTarget;

    switch (action) {
      case 'rename':
        const tab = this.tabsContainer.querySelector(`[data-sheet-id="${sheetId}"]`);
        if (tab) this.startRename(tab);
        break;

      case 'delete':
        this.deleteSheet(sheetId);
        break;

      case 'hide':
        this.hideSheet(sheetId);
        break;

      case 'unhide':
        this.showUnhideDialog();
        break;

      case 'duplicate':
        this.duplicateSheet(sheetId);
        break;
    }

    this.hideContextMenu();
  }

  deleteSheet(sheetId) {
    const deletedData = this.fileManager.deleteSheet(sheetId);
    this.onSheetChange({ type: 'delete', sheetId, deletedData });
    this.render();

    // Switch to another sheet if we deleted active
    if (sheetId === this.fileManager.activeSheetId) {
      const sheets = this.fileManager.getSheets().filter(s => s.visible);
      if (sheets.length > 0) {
        this.onSheetSwitch(sheets[0].id);
      }
    }
  }

  hideSheet(sheetId) {
    this.fileManager.setSheetVisibility(sheetId, false);
    this.onSheetChange({ type: 'hide', sheetId });
    this.render();

    // Switch if we hid active
    if (sheetId === this.fileManager.activeSheetId) {
      const sheets = this.fileManager.getSheets().filter(s => s.visible);
      if (sheets.length > 0) {
        this.onSheetSwitch(sheets[0].id);
      }
    }
  }

  // Drag and drop handlers
  handleDragStart(event) {
    const tab = event.target.closest('.sheet-tab');
    if (!tab) return;

    this.dragState = { sheetId: tab.dataset.sheetId };
    tab.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
  }

  handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    // Visual feedback for drop position
    const tab = event.target.closest('.sheet-tab');
    if (tab && tab.dataset.sheetId !== this.dragState?.sheetId) {
      // Show drop indicator
      const rect = tab.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      const position = event.clientX < midX ? 'before' : 'after';

      // Update visual indicator
      this.tabsContainer.querySelectorAll('.sheet-tab').forEach(t => {
        t.classList.remove('drop-before', 'drop-after');
      });
      tab.classList.add(`drop-${position}`);
    }
  }

  handleDrop(event) {
    event.preventDefault();

    const tab = event.target.closest('.sheet-tab');
    if (!tab || !this.dragState) return;

    const sourceId = this.dragState.sheetId;
    const targetId = tab.dataset.sheetId;

    if (sourceId === targetId) return;

    // Determine new order
    const sheets = this.fileManager.getSheets();
    const orderedIds = sheets.map(s => s.id);

    const sourceIndex = orderedIds.indexOf(sourceId);
    const targetIndex = orderedIds.indexOf(targetId);

    // Remove from current position
    orderedIds.splice(sourceIndex, 1);

    // Insert at new position
    const rect = tab.getBoundingClientRect();
    const insertBefore = event.clientX < rect.left + rect.width / 2;
    const newIndex = insertBefore ? targetIndex : targetIndex + 1;
    orderedIds.splice(newIndex > sourceIndex ? newIndex - 1 : newIndex, 0, sourceId);

    // Apply new order
    this.fileManager.reorderSheets(orderedIds);
    this.onSheetChange({ type: 'reorder', orderedIds });
    this.render();
  }

  handleDragEnd(event) {
    this.tabsContainer.querySelectorAll('.sheet-tab').forEach(t => {
      t.classList.remove('dragging', 'drop-before', 'drop-after');
    });
    this.dragState = null;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
```

### 7.3 CSS Styles

**File:** `css/sheet-tabs.css` (new)

```css
#sheet-bar {
  display: flex;
  align-items: center;
  height: 32px;
  background: #f0f0f0;
  border-top: 1px solid #ccc;
  padding: 0 8px;
  gap: 4px;
}

#sheet-tabs-container {
  display: flex;
  gap: 2px;
  overflow-x: auto;
  flex: 1;
}

.sheet-tab {
  padding: 6px 16px;
  background: #e0e0e0;
  border: 1px solid #ccc;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  font-size: 13px;
}

.sheet-tab:hover {
  background: #d0d0d0;
}

.sheet-tab.active {
  background: #fff;
  border-bottom: 1px solid #fff;
  margin-bottom: -1px;
}

.sheet-tab.dragging {
  opacity: 0.5;
}

.sheet-tab.drop-before {
  border-left: 3px solid #4285f4;
}

.sheet-tab.drop-after {
  border-right: 3px solid #4285f4;
}

.sheet-tab-input {
  border: 1px solid #4285f4;
  padding: 2px 4px;
  font-size: 13px;
  width: 100px;
}

#add-sheet-btn {
  width: 28px;
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #f5f5f5;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}

#add-sheet-btn:hover {
  background: #e5e5e5;
}

/* Context Menu */
.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 2px 2px 10px rgba(0,0,0,0.2);
  min-width: 150px;
  z-index: 1000;
}

.context-menu.hidden {
  display: none;
}

.context-menu-item {
  padding: 8px 16px;
  cursor: pointer;
}

.context-menu-item:hover {
  background: #f0f0f0;
}

.context-menu-item.disabled {
  color: #999;
  cursor: default;
}

.context-menu-item.disabled:hover {
  background: transparent;
}

.context-menu-divider {
  height: 1px;
  background: #e0e0e0;
  margin: 4px 0;
}
```

### 7.4 Testing (Stage 7)

**E2E Tests:** `e2e/sheet-tabs.spec.js`

```javascript
import { test, expect } from '@playwright/test';

test.describe('Sheet Tabs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#sheet-tabs-container');
  });

  test('displays default Sheet1 tab', async ({ page }) => {
    const tabs = await page.locator('.sheet-tab').count();
    expect(tabs).toBe(1);

    const tabName = await page.locator('.sheet-tab-name').textContent();
    expect(tabName).toBe('Sheet1');
  });

  test('adds new sheet', async ({ page }) => {
    await page.click('#add-sheet-btn');

    const tabs = await page.locator('.sheet-tab').count();
    expect(tabs).toBe(2);

    // New sheet should be active
    const activeTab = await page.locator('.sheet-tab.active .sheet-tab-name').textContent();
    expect(activeTab).toBe('Sheet2');
  });

  test('switches between sheets', async ({ page }) => {
    // Add second sheet
    await page.click('#add-sheet-btn');

    // Enter value in Sheet2
    await page.click('#cell-A1');
    await page.keyboard.type('Sheet2 Data');
    await page.keyboard.press('Enter');

    // Switch to Sheet1
    await page.click('.sheet-tab:first-child');

    // Verify A1 is empty on Sheet1
    const cellValue = await page.locator('#cell-A1 .cell-content').textContent();
    expect(cellValue).toBe('');

    // Switch back to Sheet2
    await page.click('.sheet-tab:last-child');
    const sheet2Value = await page.locator('#cell-A1 .cell-content').textContent();
    expect(sheet2Value).toBe('Sheet2 Data');
  });

  test('renames sheet via double-click', async ({ page }) => {
    await page.dblclick('.sheet-tab');

    // Should show input
    const input = page.locator('.sheet-tab-input');
    await expect(input).toBeVisible();

    // Type new name
    await input.fill('MyData');
    await page.keyboard.press('Enter');

    // Verify renamed
    const tabName = await page.locator('.sheet-tab-name').textContent();
    expect(tabName).toBe('MyData');
  });

  test('deletes sheet via context menu', async ({ page }) => {
    // Add second sheet
    await page.click('#add-sheet-btn');
    expect(await page.locator('.sheet-tab').count()).toBe(2);

    // Right-click first sheet
    await page.click('.sheet-tab:first-child', { button: 'right' });

    // Click delete
    await page.click('[data-action="delete"]');

    // Should have one sheet
    expect(await page.locator('.sheet-tab').count()).toBe(1);
  });

  test('cannot delete last sheet', async ({ page }) => {
    await page.click('.sheet-tab', { button: 'right' });

    const deleteItem = page.locator('[data-action="delete"]');
    await expect(deleteItem).toHaveClass(/disabled/);
  });

  test('reorders sheets via drag', async ({ page }) => {
    // Add two more sheets
    await page.click('#add-sheet-btn');
    await page.click('#add-sheet-btn');

    // Drag Sheet3 before Sheet2
    const sheet3 = page.locator('.sheet-tab:nth-child(3)');
    const sheet1 = page.locator('.sheet-tab:first-child');

    await sheet3.dragTo(sheet1);

    // Verify new order
    const tabs = await page.locator('.sheet-tab-name').allTextContents();
    expect(tabs).toEqual(['Sheet3', 'Sheet1', 'Sheet2']);
  });
});
```

---

## Stage 8: Spreadsheet Integration

**Goal:** Connect all components in Spreadsheet coordinator.

### 8.1 Spreadsheet Updates

**File:** `js/spreadsheet.js`

**Key Changes:**

```javascript
class Spreadsheet {
  constructor() {
    // ... existing initialization ...

    // Sheet management
    this.sheetTabBar = null;
    this.currentSheetId = null;
  }

  async initialize() {
    // ... existing initialization ...

    // Initialize sheet tab bar
    this.sheetTabBar = new SheetTabBar({
      container: document.getElementById('sheet-bar'),
      fileManager: this.fileManager,
      onSheetSwitch: (sheetId) => this.switchSheet(sheetId),
      onSheetChange: (change) => this.handleSheetChange(change)
    });

    // Load initial file
    await this.fileManager.initialize();

    // Render initial sheet
    this.currentSheetId = this.fileManager.activeSheetId;
    this.renderActiveSheet();
    this.sheetTabBar.render();
  }

  async switchSheet(sheetId) {
    // Save current selection/scroll position
    this.saveSheetState(this.currentSheetId);

    // Switch in FileManager
    this.fileManager.setActiveSheet(sheetId);
    this.currentSheetId = sheetId;

    // Notify worker
    await this.workerManager.setActiveSheet(sheetId);

    // Re-render grid with new sheet data
    this.renderActiveSheet();

    // Restore selection/scroll for new sheet
    this.restoreSheetState(sheetId);

    // Update tab bar
    this.sheetTabBar.render();
  }

  renderActiveSheet() {
    const sheet = this.fileManager.getActiveSheet();

    // Clear grid
    this.gridRenderer.clear();

    // Apply column widths
    this.gridRenderer.setColumnWidths(sheet.columnWidths || {});

    // Apply row heights
    this.gridRenderer.setRowHeights(sheet.rowHeights || {});

    // Render cells
    for (const [cellId, cellData] of Object.entries(sheet.cells || {})) {
      this.gridRenderer.updateCellContent(cellId, cellData);
      if (cellData.styleId) {
        const style = this.fileManager.styleManager.getStyle(cellData.styleId);
        this.gridRenderer.updateCellStyle(cellId, style);
      }
    }
  }

  saveSheetState(sheetId) {
    // Store selection, scroll position, etc.
    const state = {
      selection: this.selectionManager.getSelection(),
      scrollTop: this.gridContainer.scrollTop,
      scrollLeft: this.gridContainer.scrollLeft
    };
    this.sheetStates.set(sheetId, state);
  }

  restoreSheetState(sheetId) {
    const state = this.sheetStates.get(sheetId);
    if (state) {
      this.selectionManager.setSelection(state.selection);
      this.gridContainer.scrollTop = state.scrollTop;
      this.gridContainer.scrollLeft = state.scrollLeft;
    } else {
      // Default: select A1
      this.selectionManager.selectCell({ row: 0, col: 0 });
    }
  }

  handleSheetChange(change) {
    // Create history command for undo/redo
    switch (change.type) {
      case 'add':
        this.historyManager.execute(new AddSheetCommand({
          sheet: change.sheet,
          fileManager: this.fileManager,
          workerManager: this.workerManager
        }));
        break;

      case 'delete':
        this.historyManager.execute(new DeleteSheetCommand({
          sheetId: change.sheetId,
          deletedData: change.deletedData,
          fileManager: this.fileManager,
          workerManager: this.workerManager
        }));
        break;

      case 'rename':
        this.historyManager.execute(new RenameSheetCommand({
          sheetId: change.sheetId,
          oldName: change.oldName,
          newName: change.newName,
          fileManager: this.fileManager,
          workerManager: this.workerManager
        }));
        break;

      case 'reorder':
        this.historyManager.execute(new ReorderSheetsCommand({
          orderedIds: change.orderedIds,
          fileManager: this.fileManager
        }));
        break;

      case 'hide':
        this.historyManager.execute(new HideSheetCommand({
          sheetId: change.sheetId,
          fileManager: this.fileManager
        }));
        break;
    }
  }
}
```

### 8.2 SelectionManager Updates

**File:** `js/ui/SelectionManager.js`

```javascript
// Add sheet context
selectCell(coords, event, sheetId = null) {
  // Use provided sheetId or current active sheet
  const targetSheet = sheetId || this.fileManager.activeSheetId;

  // Only update if on current sheet
  if (targetSheet !== this.fileManager.activeSheetId) {
    return;  // Or: switch sheets first
  }

  // ... existing selection logic ...
}
```

### 8.3 Testing (Stage 8)

**E2E Tests:** `e2e/multi-sheet-integration.spec.js`

```javascript
test.describe('Multi-Sheet Integration', () => {
  test('data isolation between sheets', async ({ page }) => {
    await page.goto('/');

    // Enter data in Sheet1
    await page.click('#cell-A1');
    await page.keyboard.type('Sheet1 A1');
    await page.keyboard.press('Tab');
    await page.keyboard.type('Sheet1 B1');
    await page.keyboard.press('Enter');

    // Add Sheet2
    await page.click('#add-sheet-btn');

    // Verify Sheet2 is empty
    const a1 = await page.locator('#cell-A1 .cell-content').textContent();
    expect(a1).toBe('');

    // Enter different data in Sheet2
    await page.click('#cell-A1');
    await page.keyboard.type('Sheet2 A1');
    await page.keyboard.press('Enter');

    // Switch back to Sheet1
    await page.click('.sheet-tab:first-child');

    // Verify Sheet1 data unchanged
    const sheet1A1 = await page.locator('#cell-A1 .cell-content').textContent();
    expect(sheet1A1).toBe('Sheet1 A1');
  });

  test('cross-sheet formula works', async ({ page }) => {
    await page.goto('/');

    // Set value in Sheet1
    await page.click('#cell-A1');
    await page.keyboard.type('100');
    await page.keyboard.press('Enter');

    // Add Sheet2
    await page.click('#add-sheet-btn');

    // Enter cross-sheet formula
    await page.click('#cell-A1');
    await page.keyboard.type('=Sheet1!A1 * 2');
    await page.keyboard.press('Enter');

    // Verify result
    const result = await page.locator('#cell-A1 .cell-content').textContent();
    expect(result).toBe('200');
  });

  test('cross-sheet formula updates on source change', async ({ page }) => {
    // Setup cross-sheet formula (as above)
    // ...

    // Go back to Sheet1 and change value
    await page.click('.sheet-tab:first-child');
    await page.click('#cell-A1');
    await page.keyboard.type('50');
    await page.keyboard.press('Enter');

    // Go to Sheet2
    await page.click('.sheet-tab:last-child');

    // Verify formula updated
    const result = await page.locator('#cell-A1 .cell-content').textContent();
    expect(result).toBe('100');  // 50 * 2
  });

  test('deleting referenced sheet shows #REF!', async ({ page }) => {
    // Create cross-sheet reference
    // ...

    // Delete Sheet1
    await page.click('.sheet-tab:first-child', { button: 'right' });
    await page.click('[data-action="delete"]');

    // Verify #REF! in Sheet2
    const result = await page.locator('#cell-A1 .cell-content').textContent();
    expect(result).toBe('#REF!');
  });
});
```

---

## Stage 9: History Commands for Sheet Operations

**Goal:** Implement undo/redo for all sheet operations.

### 9.1 Command Implementations

**File:** `js/history/commands/AddSheetCommand.js` (new)

```javascript
import { Command } from '../Command.js';

export class AddSheetCommand extends Command {
  constructor({ sheet, fileManager, workerManager }) {
    super();
    this.sheet = sheet;
    this.fileManager = fileManager;
    this.workerManager = workerManager;
  }

  execute() {
    // Already added via UI, just record for undo
    this.workerManager.addSheet(this.sheet);
  }

  undo() {
    this.fileManager.deleteSheet(this.sheet.id);
    this.workerManager.deleteSheet(this.sheet.id);
  }

  redo() {
    this.fileManager.restoreSheet(this.sheet);
    this.workerManager.addSheet(this.sheet);
  }
}
```

**File:** `js/history/commands/DeleteSheetCommand.js` (new)

```javascript
import { Command } from '../Command.js';

export class DeleteSheetCommand extends Command {
  constructor({ sheetId, deletedData, fileManager, workerManager }) {
    super();
    this.sheetId = sheetId;
    this.deletedData = deletedData;  // Full sheet data for restore
    this.fileManager = fileManager;
    this.workerManager = workerManager;
    this.affectedFormulas = null;  // Track formulas that got #REF!
  }

  async execute() {
    // Get affected formulas before delete
    this.affectedFormulas = await this.workerManager.getFormulasReferencingSheet(this.sheetId);

    // Delete in worker (returns cells that became #REF!)
    await this.workerManager.deleteSheet(this.sheetId);
  }

  async undo() {
    // Restore sheet with all data
    this.fileManager.restoreSheet(this.deletedData);
    await this.workerManager.addSheet(this.deletedData);

    // Re-evaluate affected formulas to remove #REF!
    for (const cellId of this.affectedFormulas) {
      await this.workerManager.recalculateCell(cellId);
    }
  }

  async redo() {
    await this.execute();
  }
}
```

**File:** `js/history/commands/RenameSheetCommand.js` (new)

```javascript
import { Command } from '../Command.js';

export class RenameSheetCommand extends Command {
  constructor({ sheetId, oldName, newName, fileManager, workerManager }) {
    super();
    this.sheetId = sheetId;
    this.oldName = oldName;
    this.newName = newName;
    this.fileManager = fileManager;
    this.workerManager = workerManager;
    this.formulaUpdates = null;  // Track formulas that reference this sheet
  }

  async execute() {
    // Rename in worker - updates formulas that reference this sheet
    this.formulaUpdates = await this.workerManager.renameSheet(this.sheetId, this.newName);
  }

  undo() {
    this.fileManager.renameSheet(this.sheetId, this.oldName);
    this.workerManager.renameSheet(this.sheetId, this.oldName);
  }

  redo() {
    this.fileManager.renameSheet(this.sheetId, this.newName);
    this.workerManager.renameSheet(this.sheetId, this.newName);
  }
}
```

**File:** `js/history/commands/ReorderSheetsCommand.js` (new)

```javascript
import { Command } from '../Command.js';

export class ReorderSheetsCommand extends Command {
  constructor({ orderedIds, previousOrderedIds, fileManager }) {
    super();
    this.orderedIds = orderedIds;
    this.previousOrderedIds = previousOrderedIds;
    this.fileManager = fileManager;
  }

  execute() {
    this.fileManager.reorderSheets(this.orderedIds);
  }

  undo() {
    this.fileManager.reorderSheets(this.previousOrderedIds);
  }

  redo() {
    this.fileManager.reorderSheets(this.orderedIds);
  }
}
```

**File:** `js/history/commands/HideSheetCommand.js` (new)

```javascript
import { Command } from '../Command.js';

export class HideSheetCommand extends Command {
  constructor({ sheetId, fileManager }) {
    super();
    this.sheetId = sheetId;
    this.fileManager = fileManager;
  }

  execute() {
    this.fileManager.setSheetVisibility(this.sheetId, false);
  }

  undo() {
    this.fileManager.setSheetVisibility(this.sheetId, true);
  }

  redo() {
    this.fileManager.setSheetVisibility(this.sheetId, false);
  }
}
```

### 9.2 Testing (Stage 9)

**Unit Tests:** `tests/history/commands/`

```javascript
describe('Sheet History Commands', () => {
  describe('AddSheetCommand', () => {
    test('undo removes sheet', async () => {
      const cmd = new AddSheetCommand({ sheet, fileManager, workerManager });
      await cmd.execute();

      await cmd.undo();

      expect(fileManager.getSheetById(sheet.id)).toBeNull();
    });

    test('redo restores sheet', async () => {
      // ...
    });
  });

  describe('DeleteSheetCommand', () => {
    test('undo restores sheet with data', async () => {
      const deletedData = { id: 's1', name: 'Data', cells: { 'A1': { value: 100 } } };
      const cmd = new DeleteSheetCommand({ sheetId: 's1', deletedData, fileManager, workerManager });

      await cmd.execute();
      await cmd.undo();

      const sheet = fileManager.getSheetById('s1');
      expect(sheet.cells.A1.value).toBe(100);
    });

    test('undo restores cross-sheet formulas', async () => {
      // Setup: Sheet2 has formula =Sheet1!A1
      // Delete Sheet1
      // Undo
      // Verify formula in Sheet2 works again
    });
  });

  describe('RenameSheetCommand', () => {
    test('updates formulas referencing renamed sheet', async () => {
      // Setup: Sheet2 has formula =Data!A1
      // Rename "Data" to "Source"
      // Verify formula text is now =Source!A1
    });

    test('undo reverts formula text', async () => {
      // ...
    });
  });
});
```

**E2E Tests:**

```javascript
test.describe('Sheet History', () => {
  test('undo add sheet', async ({ page }) => {
    await page.click('#add-sheet-btn');
    expect(await page.locator('.sheet-tab').count()).toBe(2);

    await page.keyboard.press('Control+z');
    expect(await page.locator('.sheet-tab').count()).toBe(1);
  });

  test('undo delete sheet restores data', async ({ page }) => {
    // Add sheet and enter data
    await page.click('#add-sheet-btn');
    await page.click('#cell-A1');
    await page.keyboard.type('Important Data');
    await page.keyboard.press('Enter');

    // Delete sheet
    await page.click('.sheet-tab.active', { button: 'right' });
    await page.click('[data-action="delete"]');

    // Undo
    await page.keyboard.press('Control+z');

    // Verify data restored
    await page.click('.sheet-tab:last-child');
    const value = await page.locator('#cell-A1 .cell-content').textContent();
    expect(value).toBe('Important Data');
  });
});
```

---

## Stage 10: PointMode Cross-Sheet Support

**Goal:** Enable formula building across sheets.

### 10.1 PointMode Updates

**File:** `js/modes/PointMode.js`

**Changes:**

```javascript
class PointMode extends NavigationMode {
  // ... existing code ...

  handleIntent(intent, context) {
    switch (intent) {
      case INTENTS.SHEET_SWITCH:
        return this.handleSheetSwitch(context);

      // ... existing cases ...
    }
  }

  /**
   * Handle user clicking a different sheet tab while in PointMode
   */
  handleSheetSwitch(context) {
    const { sheetId, sheetName } = context;

    // Don't switch sheets, but prepare for cross-sheet reference
    this.crossSheetContext = { sheetId, sheetName };

    // Update visual feedback (highlight the clicked tab)
    this._context.sheetTabBar.setPointModeTarget(sheetId);

    // Next cell click will include sheet prefix
    return true;
  }

  /**
   * Override cell selection to include sheet prefix
   */
  handleCellSelect(context) {
    const { coords } = context;
    const cellRef = coordsToCellRef(coords);

    let reference;
    if (this.crossSheetContext) {
      // Cross-sheet reference
      const { sheetName } = this.crossSheetContext;
      reference = buildSheetCellRef(coords.row, coords.col, false, false, sheetName);
      this.crossSheetContext = null;  // Reset after use
    } else {
      // Same-sheet reference (no prefix)
      reference = cellRef;
    }

    // Insert reference into formula
    this.insertReference(reference);

    return true;
  }

  onExit() {
    // Clean up cross-sheet state
    this.crossSheetContext = null;
    this._context.sheetTabBar.clearPointModeTarget();

    super.onExit();
  }
}
```

### 10.2 SheetTabBar PointMode Support

**File:** `js/ui/SheetTabBar.js`

Add methods:

```javascript
/**
 * Called when PointMode is active and user clicks a sheet tab
 */
handleTabClickInPointMode(sheetId) {
  // Don't switch sheets, notify mode instead
  const sheet = this.fileManager.getSheetById(sheetId);

  this.modeManager.handleIntent(INTENTS.SHEET_SWITCH, {
    sheetId,
    sheetName: sheet.name
  });
}

/**
 * Visual feedback for cross-sheet reference target
 */
setPointModeTarget(sheetId) {
  this.tabsContainer.querySelectorAll('.sheet-tab').forEach(tab => {
    tab.classList.toggle('point-mode-target', tab.dataset.sheetId === sheetId);
  });
}

clearPointModeTarget() {
  this.tabsContainer.querySelectorAll('.sheet-tab').forEach(tab => {
    tab.classList.remove('point-mode-target');
  });
}
```

Add CSS:

```css
.sheet-tab.point-mode-target {
  background: #e3f2fd;
  border-color: #2196f3;
}
```

### 10.3 InputController Updates

**File:** `js/ui/InputController.js`

Add sheet tab click handling:

```javascript
setupSheetTabListeners() {
  const tabsContainer = document.getElementById('sheet-tabs-container');

  tabsContainer.addEventListener('click', (e) => {
    const tab = e.target.closest('.sheet-tab');
    if (!tab) return;

    const sheetId = tab.dataset.sheetId;

    // Check if we're in PointMode
    if (this.modeManager.getCurrentModeName() === 'PointMode') {
      // Let PointMode handle it
      this.modeManager.handleIntent(INTENTS.SHEET_SWITCH, {
        sheetId,
        sheetName: this.fileManager.getSheetById(sheetId).name
      });
      e.stopPropagation();
    }
    // Otherwise, normal sheet switch (handled by SheetTabBar)
  });
}
```

### 10.4 Testing (Stage 10)

**E2E Tests:** `e2e/point-mode-cross-sheet.spec.js`

```javascript
test.describe('PointMode Cross-Sheet', () => {
  test('clicking sheet tab in formula mode inserts sheet prefix', async ({ page }) => {
    await page.goto('/');

    // Add second sheet with data
    await page.click('#add-sheet-btn');
    await page.click('#cell-A1');
    await page.keyboard.type('100');
    await page.keyboard.press('Enter');

    // Go back to Sheet1
    await page.click('.sheet-tab:first-child');

    // Start formula
    await page.click('#cell-A1');
    await page.keyboard.type('=');

    // Click Sheet2 tab
    await page.click('.sheet-tab:last-child');

    // Click A1 on Sheet2 (need to handle visually)
    await page.click('#cell-A1');

    // Verify formula
    const formulaBar = await page.locator('#formula-bar').inputValue();
    expect(formulaBar).toBe('=Sheet2!A1');

    // Commit
    await page.keyboard.press('Enter');

    // Verify result
    const result = await page.locator('#cell-A1 .cell-content').textContent();
    expect(result).toBe('100');
  });

  test('cross-sheet reference with quoted sheet name', async ({ page }) => {
    // Rename sheet to have spaces
    await page.dblclick('.sheet-tab:last-child');
    await page.keyboard.type('My Data');
    await page.keyboard.press('Enter');

    // Create formula referencing it
    await page.click('.sheet-tab:first-child');
    await page.click('#cell-B1');
    await page.keyboard.type('=');
    await page.click('.sheet-tab:last-child');
    await page.click('#cell-A1');

    // Verify quoted syntax
    const formulaBar = await page.locator('#formula-bar').inputValue();
    expect(formulaBar).toBe("='My Data'!A1");
  });
});
```

---

## Stage 11: Cell Limit Enforcement

**Goal:** Enforce 1,000,000 cell limit across all sheets.

### 11.1 FileManager Validation

**File:** `js/file-manager.js`

```javascript
const MAX_TOTAL_CELLS = 1_000_000;

/**
 * Get total cell count across all sheets
 */
getTotalCellCount() {
  let count = 0;
  for (const sheet of this.currentFile.data.sheets) {
    count += Object.keys(sheet.cells || {}).length;
  }
  return count;
}

/**
 * Check if adding cells would exceed limit
 */
canAddCells(count) {
  return this.getTotalCellCount() + count <= MAX_TOTAL_CELLS;
}

/**
 * Validate before cell operations
 */
validateCellLimit(newCellCount = 1) {
  if (!this.canAddCells(newCellCount)) {
    throw new Error(`Cell limit exceeded. Maximum ${MAX_TOTAL_CELLS.toLocaleString()} cells allowed.`);
  }
}

/**
 * Check limit when pasting range
 */
validatePasteRange(rangeSize) {
  const currentCount = this.getTotalCellCount();
  if (currentCount + rangeSize > MAX_TOTAL_CELLS) {
    const available = MAX_TOTAL_CELLS - currentCount;
    throw new Error(
      `Cannot paste ${rangeSize.toLocaleString()} cells. ` +
      `Only ${available.toLocaleString()} cells available ` +
      `(${currentCount.toLocaleString()} of ${MAX_TOTAL_CELLS.toLocaleString()} used).`
    );
  }
}
```

### 11.2 UI Feedback

**File:** `js/spreadsheet.js`

```javascript
// Show cell count in status bar
updateStatusBar() {
  const count = this.fileManager.getTotalCellCount();
  const percentage = (count / 1_000_000 * 100).toFixed(1);

  this.statusBar.textContent = `${count.toLocaleString()} cells (${percentage}%)`;

  // Warning if approaching limit
  if (count > 900_000) {
    this.statusBar.classList.add('warning');
  }
}
```

### 11.3 Testing (Stage 11)

```javascript
describe('Cell Limit', () => {
  test('enforces 1M cell limit', () => {
    // Setup file near limit
    const fileManager = new FileManager();
    // ... add 999,999 cells ...

    // Adding one more should work
    expect(() => fileManager.validateCellLimit(1)).not.toThrow();

    // Adding two should fail
    expect(() => fileManager.validateCellLimit(2)).toThrow(/limit exceeded/);
  });

  test('counts cells across all sheets', () => {
    const fileManager = new FileManager();
    // Sheet1: 100 cells
    // Sheet2: 200 cells

    expect(fileManager.getTotalCellCount()).toBe(300);
  });
});
```

---

## Implementation Summary

### Stage Dependencies

```
Stage 1 (Data Model)
    ↓
Stage 2 (FileManager)
    ↓
Stage 3 (Parser) ──────────────────┐
    ↓                              │
Stage 4 (Evaluator) ←──────────────┤
    ↓                              │
Stage 5 (DependencyGraph) ←────────┘
    ↓
Stage 6 (Worker Protocol)
    ↓
Stage 7 (Sheet Tab UI) ←─── Stage 2
    ↓
Stage 8 (Integration)
    ↓
Stage 9 (History Commands)
    ↓
Stage 10 (PointMode)
    ↓
Stage 11 (Cell Limit)
```

### Testing Checkpoints

| Stage | Key Tests |
|-------|-----------|
| 1 | Server migration, file format |
| 2 | FileManager sheet CRUD |
| 3 | Tokenizer/Parser for `Sheet!A1` syntax |
| 4 | Cross-sheet formula evaluation |
| 5 | Cross-sheet dependency tracking, circular detection |
| 6 | Worker message round-trips |
| 7 | Sheet tab UI interactions |
| 8 | Full integration: switching, data isolation |
| 9 | Undo/redo all sheet operations |
| 10 | Formula building across sheets |
| 11 | Cell limit enforcement |

### Files to Create

| File | Stage |
|------|-------|
| `js/ui/SheetTabBar.js` | 7 |
| `css/sheet-tabs.css` | 7 |
| `js/history/commands/AddSheetCommand.js` | 9 |
| `js/history/commands/DeleteSheetCommand.js` | 9 |
| `js/history/commands/RenameSheetCommand.js` | 9 |
| `js/history/commands/ReorderSheetsCommand.js` | 9 |
| `js/history/commands/HideSheetCommand.js` | 9 |
| `tests/server/test_migration.py` | 1 |

### Files to Modify

| File | Stages |
|------|--------|
| `server/app.py` | 1 |
| `js/file-manager.js` | 2, 11 |
| `js/engine/parser/Tokenizer.js` | 3 |
| `js/engine/parser/Parser.js` | 3 |
| `js/engine/utils/CellHelpers.js` | 3 |
| `js/engine/Evaluator.js` | 4 |
| `js/engine/FormulaEngine.js` | 4, 5 |
| `js/engine/DependencyGraph.js` | 5 |
| `js/engine/formula-worker.js` | 6 |
| `js/spreadsheet.js` | 8, 11 |
| `js/ui/SelectionManager.js` | 8 |
| `js/modes/PointMode.js` | 10 |
| `js/ui/InputController.js` | 10 |
| `index.html` | 7 |
| `css/styles.css` | 7 |
| `docs/manuals/api-reference/file-format-schema.md` | 1 |

---

## Appendix A: Error Codes

| Error | Cause | Display |
|-------|-------|---------|
| `#REF!` | Referenced sheet deleted | `#REF!` |
| `#REF!` | Referenced sheet doesn't exist | `#REF!` |
| `#CIRC!` | Cross-sheet circular reference | `#CIRC!` |
| `#LIMIT!` | Cell limit exceeded | Error dialog |

---

## Appendix B: Sheet Name Validation Rules

Valid sheet names:
- 1-31 characters
- Cannot contain: `\ / * ? : [ ]`
- Cannot be blank
- Must be unique (case-insensitive)
- Leading/trailing spaces stripped

Examples:
- Valid: `Sheet1`, `Data_2024`, `Q4 Results`
- Invalid: `Sheet/1`, ``, `[Data]`
