# Bug Fix Plan: Absolute References E2E Test Failures

## Problem Summary

After implementing absolute references (F4 toggle), 6 out of 9 E2E tests are failing. The failures fall into two categories:

1. **Formulas with `$` markers fail to evaluate** (Tests 5, 6, 7)
2. **Relative reference paste produces wrong values** (Test 4)
3. **Range reference paste fails** (Tests 8, 9)

## Root Cause Analysis

### Bug 1: FormulaEngine.getCellValue() Doesn't Normalize Cell IDs (CRITICAL)

**Location**: `js/engine/FormulaEngine.js:230-233`

**Problem**: When the formula `=$A$1+$A$2` is parsed, the AST contains cell reference nodes like:
```javascript
{ type: 'cell', ref: '$A$1' }
```

When the Evaluator calls `getCellValue('$A$1')`, it looks up the key `'$A$1'` in the `cellData` Map. However, cell data is stored under **normalized keys without `$` markers** (e.g., `'A1'`).

```javascript
getCellValue(cellId) {
  const data = this.cellData.get(cellId);  // Looks for '$A$1', but data is under 'A1'
  return data ? data.value : undefined;    // Returns undefined
}
```

When `undefined` is returned, `TypeCoercion.toNumber(undefined)` returns `0` (line 24-26 of TypeCoercion.js).

**Evidence**: Test 5 expects `=$A$1+$A$2` to evaluate to `40` (10+30), but gets `0` (0+0).

**Impact**: All formulas containing `$` markers evaluate incorrectly.

### Bug 2: _extractDependencies() Stores Dependencies with `$` Markers (CRITICAL)

**Location**: `js/engine/FormulaEngine.js:299-332`

**Problem**: When extracting dependencies from the AST, cell references are added to the Set with their original `$` markers intact:

```javascript
case 'cell':
  dependencies.add(node.ref);  // Adds '$A$1' instead of 'A1'
  return;
```

This causes a mismatch:
- Dependencies are stored as `Set(['$A$1', '$A$2'])`
- Actual cell data keys are `'A1'`, `'A2'`
- When `A1` changes, the dependency graph looks for cells depending on `'A1'`, but finds nothing because dependents registered `'$A$1'`

**Impact**: Formulas with absolute references won't recalculate when their source cells change.

### Bug 3: getRangeValues() May Have Similar Issues

**Location**: `js/engine/FormulaEngine.js:252-255`

While `CellHelpers.expandRange()` correctly handles `$` markers (it parses them and builds normalized IDs), the individual `getCellValue(id)` calls within the loop will fail if `expandRange` ever receives range endpoints with `$` markers (e.g., from `=SUM($A$1:$B$2)`).

**Status**: Need to verify if `expandRange` strips `$` before processing.

### Bug 4: Test 4 Failure - Requires Further Investigation

**Symptom**: Copy `=A1+A2` from A3, paste to B3. Expected B3=`=B1+B2`=300, but got B3=30.

**Observation**: 30 = A2's value. This suggests either:
1. The formula adjustment isn't happening correctly
2. Only partial formula is being saved/evaluated
3. Timing/async issue in E2E test

**Analysis**: The FormulaAdjuster unit tests pass, and the code logic appears correct. This may be:
- A separate bug in how paste updates are processed by the formula worker
- A race condition where the formula is evaluated before all dependencies are set
- An issue with how the E2E test is structured

---

## Implementation Plan

### Step 1: Add Cell ID Normalization Utility

**File**: `js/engine/utils/CellHelpers.js`

Add a new static method to strip `$` markers from cell references:

```javascript
/**
 * Normalizes a cell reference by removing $ markers.
 * @param {string} cellRef - Cell reference (e.g., "$A$1", "A1", "$A1")
 * @returns {string} Normalized cell ID (e.g., "A1")
 */
static normalizeCellId(cellRef) {
  return cellRef.replace(/\$/g, '');
}
```

### Step 2: Fix FormulaEngine.getCellValue()

**File**: `js/engine/FormulaEngine.js`

Normalize the cell ID before lookup:

```javascript
getCellValue(cellId) {
  const normalizedId = this.cellHelpers.normalizeCellId(cellId);
  const data = this.cellData.get(normalizedId);
  return data ? data.value : undefined;
}
```

### Step 3: Fix FormulaEngine._extractDependencies()

**File**: `js/engine/FormulaEngine.js`

Normalize cell references when adding to the dependency Set:

```javascript
case 'cell':
  dependencies.add(this.cellHelpers.normalizeCellId(node.ref));
  return;
```

### Step 4: Fix FormulaEngine.getRangeValues()

**File**: `js/engine/FormulaEngine.js`

Normalize range endpoints before passing to `expandRange`:

```javascript
getRangeValues(startCell, endCell) {
  const normalizedStart = this.cellHelpers.normalizeCellId(startCell);
  const normalizedEnd = this.cellHelpers.normalizeCellId(endCell);
  const cellIds = this.cellHelpers.expandRange(normalizedStart, normalizedEnd);
  return cellIds.map((id) => this.getCellValue(id));
}
```

### Step 5: Add Unit Tests for Normalization

**File**: `tests/engine/utils/CellHelpers.test.js`

Add tests for the new `normalizeCellId` method:

```javascript
describe('normalizeCellId', () => {
  it('returns A1 unchanged', () => {
    expect(CellHelpers.normalizeCellId('A1')).toBe('A1');
  });

  it('strips fully absolute $A$1 to A1', () => {
    expect(CellHelpers.normalizeCellId('$A$1')).toBe('A1');
  });

  it('strips column-absolute $A1 to A1', () => {
    expect(CellHelpers.normalizeCellId('$A1')).toBe('A1');
  });

  it('strips row-absolute A$1 to A1', () => {
    expect(CellHelpers.normalizeCellId('A$1')).toBe('A1');
  });

  it('handles multi-letter columns', () => {
    expect(CellHelpers.normalizeCellId('$AA$100')).toBe('AA100');
  });
});
```

### Step 6: Add Integration Tests for Formula Evaluation

**File**: `tests/engine/FormulaEngine.test.js` (new or existing)

Add tests that verify formulas with absolute references evaluate correctly:

```javascript
describe('absolute reference evaluation', () => {
  it('evaluates $A$1 correctly', () => {
    engine.setCellValue('A1', 10);
    engine.setFormula('B1', '=$A$1');
    expect(engine.getCellValue('B1')).toBe(10);
  });

  it('recalculates when source cell changes', () => {
    engine.setCellValue('A1', 10);
    engine.setFormula('B1', '=$A$1');
    engine.setCellValue('A1', 20);
    expect(engine.getCellValue('B1')).toBe(20);
  });
});
```

### Step 7: Investigate Test 4 Failure

After fixing the primary bugs, re-run the E2E tests. If test 4 still fails:

1. Add debug logging to `ClipboardManager.getPasteUpdates()` to verify:
   - Source formula is correctly retrieved
   - Offsets are calculated correctly
   - Adjusted formula is correct

2. Add debug logging to `UpdateCellsCommand.execute()` to verify:
   - Correct cellId and value are sent to formula worker
   - Formula worker receives and processes the update

3. Check for timing issues in E2E test:
   - Ensure adequate wait times between copy and paste
   - Verify formula evaluation completes before assertion

---

## Testing Strategy

### Unit Tests
1. Run `npm test` to verify CellHelpers and FormulaEngine changes
2. Ensure all existing tests pass
3. Add new tests as specified above

### E2E Tests
1. Run `npm run e2e -- e2e/absolute-references.spec.js`
2. All 9 tests should pass after fixes

### Manual Testing
1. Open application in browser
2. Enter `=$A$1` formula - verify it evaluates correctly
3. Copy formula with absolute references - verify adjustment behavior
4. Test F4 cycling still works

---

## Files to Modify

| File | Changes |
|------|---------|
| `js/engine/utils/CellHelpers.js` | Add `normalizeCellId()` method |
| `js/engine/FormulaEngine.js` | Use normalization in `getCellValue()`, `_extractDependencies()`, `getRangeValues()` |
| `tests/engine/utils/CellHelpers.test.js` | Add tests for `normalizeCellId()` |
| `tests/engine/FormulaEngine.test.js` | Add integration tests for absolute references |

---

## Risk Assessment

- **Low Risk**: Changes are localized to the FormulaEngine and don't affect UI components
- **Backward Compatible**: Normalization handles both normalized and non-normalized cell IDs
- **No Breaking Changes**: Existing relative references will continue to work

---

## Success Criteria

1. All 9 absolute reference E2E tests pass
2. All existing unit tests pass
3. F4 toggle functionality continues to work
4. Copy/paste with mixed references works correctly
