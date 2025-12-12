# Implementation Plan: Absolute References in Formulas

**Status**: Planning Complete
**Date**: 2025-12-08
**Epic Dependencies**: Epic 4 (Advanced Copy/Paste), Epic 7 (Formula Building UX)

## Overview

Implement absolute cell references (`$A$1`, `$A1`, `A$1`) with:
1. **F4 Toggle**: Cycle reference formats during formula editing
2. **Smart Paste**: Adjust relative references when pasting, preserve absolute ones

---

## Phase 1: Documentation Updates

### 1.1 Update CLAUDE.md
Add section under "Important Implementation Notes":
```markdown
### Absolute References
- `$` prefix locks column/row during copy-paste
- F4 cycles: A1 → $A$1 → A$1 → $A1 → A1
- FormulaAdjuster utility handles paste adjustments
```

### 1.2 Update Epic 4 (`docs/roadmap/epic_04_advanced_copy_paste.md`)
- Change status from "Draft" to "In Progress"
- Add implementation details for `FormulaAdjuster.js`

### 1.3 Update Epic 7 Feature Spec (`docs/roadmap/feature_spec_formula_builder_ux.md`)
- Expand section 3.6 "F4 Toggle" with detailed behavior spec

### 1.4 Update Mode System Architecture (`docs/architecture/01-mode-system.md`)
- Add `TOGGLE_REFERENCE` to "Key Intents" list (around line 172)
- Update PointMode section to mention F4 handling
- Update EditMode section to mention F4 handling

### 1.5 Update Mode Behaviors (`docs/user-interactions/02-mode-behaviors.md`)
- Add F4 row to PointMode behavior matrix (line ~210-228)
- Add F4 row to EditMode behavior matrix (line ~148-165)
- Add F4 to "Mode Transition Rules" section

### 1.6 Update Keyboard Shortcuts (`docs/user-interactions/03-keyboard-shortcuts.md`)
- Move F4 from "Shortcuts Not Yet Implemented" (line 355) to PointMode/EditMode sections
- Add F4 to PointMode Shortcuts table (around line 160)
- Add F4 to EditMode Shortcuts table (around line 170)

### 1.7 Update Intent Vocabulary (`docs/api-reference/intent-vocabulary.md`)
- Add new `TOGGLE_REFERENCE` intent documentation section
- Add to Summary table (line ~659-676)

### 1.8 Update Formula Building Test Scenarios (`docs/test-scenarios/formula-building.scenarios.md`)
Add new scenario group "Scenario Group: Absolute References (F4 Toggle)":
- Scenario: F4 cycles A1 → $A$1 in PointMode
- Scenario: F4 cycles $A$1 → A$1 → $A1 → A1 (full cycle)
- Scenario: F4 in EditMode cycles reference at cursor
- Scenario: F4 with range reference cycles both parts

### 1.9 Update Selection/Clipboard Test Scenarios (`docs/test-scenarios/selection-clipboard.scenarios.md`)
Update Scenario 17 (Paste Formula) and add new scenarios:
- Scenario: Paste formula with absolute reference ($A$1 unchanged)
- Scenario: Paste formula with column-absolute ($A1 → $A2)
- Scenario: Paste formula with row-absolute (A$1 → B$1)
- Scenario: Paste formula with mixed references

---

## Phase 2: E2E Tests

### File: `e2e/absolute-references.spec.js`

```javascript
test.describe('Absolute References - F4 Toggle', () => {
  test('F4 cycles A1 → $A$1 in PointMode', async ({ page }) => {
    // Given: User is building formula "=A1" in PointMode
    // When: User presses F4
    // Then: Formula changes to "=$A$1"
  });

  test('F4 completes full cycle $A$1 → A$1 → $A1 → A1', async ({ page }) => {
    // Given: Formula "=$A$1"
    // When: User presses F4 three more times
    // Then: Cycles through A$1 → $A1 → A1
  });

  test('F4 in EditMode cycles reference at cursor position', async ({ page }) => {
    // Given: User is editing formula "=A1+B2" with cursor after A1
    // When: User presses F4
    // Then: Formula changes to "=$A$1+B2" (only A1 affected)
  });
});

test.describe('Absolute References - Copy/Paste', () => {
  test('relative reference adjusts on paste', async ({ page }) => {
    // Given: A1=10, A2=30, B1=100, B2=200, A3="=A1+A2"
    // When: Copy A3, paste to B3
    // Then: B3="=B1+B2", result=300
  });

  test('fully absolute reference unchanged on paste', async ({ page }) => {
    // Given: A1=10, A2=30, A3="=$A$1+$A$2"
    // When: Copy A3, paste to B3
    // Then: B3="=$A$1+$A$2", result=40
  });

  test('column-absolute keeps column, adjusts row', async ({ page }) => {
    // Given: Formula "=$A1"
    // When: Copy and paste 1 row down, 1 column right
    // Then: Formula becomes "=$A2"
  });

  test('row-absolute keeps row, adjusts column', async ({ page }) => {
    // Given: Formula "=A$1"
    // When: Copy and paste 1 row down, 1 column right
    // Then: Formula becomes "=B$1"
  });

  test('mixed references adjust correctly', async ({ page }) => {
    // Given: Formula "=$A$1+B2"
    // When: Copy and paste 1 row down, 1 column right
    // Then: Formula becomes "=$A$1+C3"
  });

  test('range references adjust correctly', async ({ page }) => {
    // Given: Formula "=SUM(A1:B2)"
    // When: Copy and paste 1 row down, 1 column right
    // Then: Formula becomes "=SUM(B2:C3)"
  });
});
```

---

## Phase 3: Code Implementation

### 3.1 Extend CellHelpers (`js/engine/utils/CellHelpers.js`)

Add new method `buildCellRef()`:
```javascript
/**
 * Creates a cell reference string with optional absolute markers.
 * @param {number} row - 0-based row index
 * @param {number} col - 0-based column index
 * @param {boolean} colAbs - Whether column is absolute ($)
 * @param {boolean} rowAbs - Whether row is absolute ($)
 * @returns {string} Cell reference (e.g., "$A$1", "B2")
 */
static buildCellRef(row, col, colAbs = false, rowAbs = false) {
  const colStr = this.colIdxToLetter(col);
  const rowStr = row + 1;
  const colPrefix = colAbs ? '$' : '';
  const rowPrefix = rowAbs ? '$' : '';
  return `${colPrefix}${colStr}${rowPrefix}${rowStr}`;
}
```

Update `resolveRelativeRef()` to preserve $ markers:
```javascript
static resolveRelativeRef(ref, rowOffset = 0, colOffset = 0) {
  const newRow = ref.rowAbs ? ref.row : ref.row + rowOffset;
  const newCol = ref.colAbs ? ref.col : ref.col + colOffset;

  // Clamp to valid grid bounds
  const finalRow = Math.max(0, newRow);
  const finalCol = Math.max(0, newCol);

  // Preserve absolute markers
  return this.buildCellRef(finalRow, finalCol, ref.colAbs, ref.rowAbs);
}
```

### 3.2 Create FormulaAdjuster (`js/engine/utils/FormulaAdjuster.js`)

New utility class with pure functions:

```javascript
import { Tokenizer } from '../parser/Tokenizer.js';
import { CellHelpers } from './CellHelpers.js';

class FormulaAdjuster {
  /**
   * Adjusts all cell references in a formula by the given offset.
   * Respects absolute ($) markers.
   *
   * @param {string} formula - The formula string (e.g., "=A1+$B$2")
   * @param {number} rowOffset - Rows to shift (positive = down)
   * @param {number} colOffset - Columns to shift (positive = right)
   * @returns {string} Adjusted formula
   */
  static adjustFormula(formula, rowOffset, colOffset) {
    if (!formula.startsWith('=')) return formula;

    const tokenizer = new Tokenizer(formula.substring(1));
    const tokens = tokenizer.tokenize();

    let result = '=';
    for (const token of tokens) {
      if (token.type === 'CELL_REF') {
        const parsed = CellHelpers.parseCellRef(token.value);
        if (parsed) {
          result += CellHelpers.resolveRelativeRef(parsed, rowOffset, colOffset);
        } else {
          result += token.value;
        }
      } else {
        result += token.value;
      }
    }
    return result;
  }

  /**
   * Cycles a cell reference through absolute formats.
   * A1 → $A$1 → A$1 → $A1 → A1
   *
   * @param {string} ref - Cell reference string
   * @returns {string} Next format in cycle
   */
  static cycleReferenceFormat(ref) {
    const parsed = CellHelpers.parseCellRef(ref);
    if (!parsed) return ref;

    const { row, col, colAbs, rowAbs } = parsed;

    // Determine next state in cycle
    if (!colAbs && !rowAbs) {
      // A1 → $A$1
      return CellHelpers.buildCellRef(row, col, true, true);
    } else if (colAbs && rowAbs) {
      // $A$1 → A$1
      return CellHelpers.buildCellRef(row, col, false, true);
    } else if (!colAbs && rowAbs) {
      // A$1 → $A1
      return CellHelpers.buildCellRef(row, col, true, false);
    } else {
      // $A1 → A1
      return CellHelpers.buildCellRef(row, col, false, false);
    }
  }
}

export { FormulaAdjuster };
```

### 3.3 Add F4 Intent (`js/modes/Intents.js`)

```javascript
export const INTENTS = Object.freeze({
  // ... existing intents
  TOGGLE_REFERENCE: 'TOGGLE_REFERENCE',  // F4 key
});
```

### 3.4 Map F4 Key (`js/ui/InputController.js`)

In `_mapKeyToIntent()` method (around line 280):
```javascript
// F4: Toggle reference format
if (key === 'F4') {
  return {
    intent: INTENTS.TOGGLE_REFERENCE,
    context: null
  };
}
```

### 3.5 Handle F4 in PointMode (`js/modes/PointMode.js`)

Add to `handleIntent()`:
```javascript
case INTENTS.TOGGLE_REFERENCE:
  return this._handleToggleReference();
```

Add new method:
```javascript
_handleToggleReference() {
  if (!this._editorManager) return false;

  const formula = this._editorManager.getValue();
  const cursorPos = this._editorManager.getCursorPosition();

  // Find the reference at or before cursor
  const { ref, start, end } = this._findReferenceAtCursor(formula, cursorPos);
  if (!ref) return false;

  // Cycle the reference format
  const newRef = FormulaAdjuster.cycleReferenceFormat(ref);

  // Replace in formula
  const newFormula = formula.substring(0, start) + newRef + formula.substring(end);
  this._editorManager.setValue(newFormula);

  // Update base formula for subsequent navigation
  this._baseFormula = newFormula.substring(0, start + newRef.length);

  return true;
}

_findReferenceAtCursor(formula, cursorPos) {
  // Use regex to find all cell references with their positions
  const refRegex = /\$?[A-Z]+\$?[0-9]+/gi;
  let match;

  while ((match = refRegex.exec(formula)) !== null) {
    const start = match.index;
    const end = start + match[0].length;

    // Check if cursor is within or at end of this reference
    if (cursorPos >= start && cursorPos <= end) {
      return { ref: match[0], start, end };
    }
  }

  return { ref: null, start: -1, end: -1 };
}
```

### 3.6 Handle F4 in EditMode (`js/modes/EditMode.js`)

Similar implementation - delegate to shared utility or duplicate logic.

### 3.7 Update ClipboardManager (`js/ui/ClipboardManager.js`)

Modify `getPasteUpdates()` to adjust formulas:

```javascript
getPasteUpdates(targetCoords) {
  if (!this.clipboard || !this.clipboard.data) return [];

  const { minRow: sourceMinRow, minCol: sourceMinCol } = this.clipboard;
  const rowOffset = targetCoords.row - sourceMinRow;
  const colOffset = targetCoords.col - sourceMinCol;

  const updates = [];

  this.clipboard.data.forEach(item => {
    const destRow = targetCoords.row + item.relativePos.row;
    const destCol = targetCoords.col + item.relativePos.col;
    const destCellId = this._coordsToCellId(destRow, destCol);

    let value = item.value;

    // Adjust formula references if this is a formula
    if (typeof value === 'string' && value.startsWith('=')) {
      value = FormulaAdjuster.adjustFormula(value, rowOffset, colOffset);
    }

    updates.push({
      cellId: destCellId,
      value: value,
      style: item.style
    });
  });

  return updates;
}
```

---

## Phase 4: Unit Tests

### 4.1 CellHelpers Tests (`tests/engine/utils/CellHelpers.test.js`)

```javascript
describe('buildCellRef', () => {
  test('builds relative reference', () => {
    expect(CellHelpers.buildCellRef(0, 0)).toBe('A1');
  });

  test('builds fully absolute reference', () => {
    expect(CellHelpers.buildCellRef(0, 0, true, true)).toBe('$A$1');
  });

  test('builds column-absolute reference', () => {
    expect(CellHelpers.buildCellRef(0, 0, true, false)).toBe('$A1');
  });

  test('builds row-absolute reference', () => {
    expect(CellHelpers.buildCellRef(0, 0, false, true)).toBe('A$1');
  });
});

describe('resolveRelativeRef with absolute markers', () => {
  test('adjusts relative reference', () => {
    const ref = { row: 0, col: 0, colAbs: false, rowAbs: false };
    expect(CellHelpers.resolveRelativeRef(ref, 1, 1)).toBe('B2');
  });

  test('preserves fully absolute reference', () => {
    const ref = { row: 0, col: 0, colAbs: true, rowAbs: true };
    expect(CellHelpers.resolveRelativeRef(ref, 1, 1)).toBe('$A$1');
  });

  test('preserves column-absolute, adjusts row', () => {
    const ref = { row: 0, col: 0, colAbs: true, rowAbs: false };
    expect(CellHelpers.resolveRelativeRef(ref, 1, 1)).toBe('$A2');
  });

  test('preserves row-absolute, adjusts column', () => {
    const ref = { row: 0, col: 0, colAbs: false, rowAbs: true };
    expect(CellHelpers.resolveRelativeRef(ref, 1, 1)).toBe('B$1');
  });
});
```

### 4.2 FormulaAdjuster Tests (`tests/engine/utils/FormulaAdjuster.test.js`)

```javascript
describe('adjustFormula', () => {
  test('adjusts simple relative formula', () => {
    expect(FormulaAdjuster.adjustFormula('=A1+A2', 0, 1)).toBe('=B1+B2');
  });

  test('preserves fully absolute references', () => {
    expect(FormulaAdjuster.adjustFormula('=$A$1+$A$2', 0, 1)).toBe('=$A$1+$A$2');
  });

  test('handles mixed references', () => {
    expect(FormulaAdjuster.adjustFormula('=$A$1+B2', 1, 1)).toBe('=$A$1+C3');
  });

  test('handles column-absolute reference', () => {
    expect(FormulaAdjuster.adjustFormula('=$A1', 1, 1)).toBe('=$A2');
  });

  test('handles row-absolute reference', () => {
    expect(FormulaAdjuster.adjustFormula('=A$1', 1, 1)).toBe('=B$1');
  });

  test('handles range references', () => {
    expect(FormulaAdjuster.adjustFormula('=SUM(A1:B2)', 1, 1)).toBe('=SUM(B2:C3)');
  });

  test('returns non-formula values unchanged', () => {
    expect(FormulaAdjuster.adjustFormula('hello', 1, 1)).toBe('hello');
  });

  test('clamps negative references to grid bounds', () => {
    expect(FormulaAdjuster.adjustFormula('=A1', -5, -5)).toBe('=A1');
  });
});

describe('cycleReferenceFormat', () => {
  test('A1 → $A$1', () => {
    expect(FormulaAdjuster.cycleReferenceFormat('A1')).toBe('$A$1');
  });

  test('$A$1 → A$1', () => {
    expect(FormulaAdjuster.cycleReferenceFormat('$A$1')).toBe('A$1');
  });

  test('A$1 → $A1', () => {
    expect(FormulaAdjuster.cycleReferenceFormat('A$1')).toBe('$A1');
  });

  test('$A1 → A1', () => {
    expect(FormulaAdjuster.cycleReferenceFormat('$A1')).toBe('A1');
  });

  test('handles multi-letter columns', () => {
    expect(FormulaAdjuster.cycleReferenceFormat('AA10')).toBe('$AA$10');
  });
});
```

---

## Files to Create/Modify

### Documentation Files
| Action | File |
|--------|------|
| Modify | `CLAUDE.md` |
| Modify | `docs/roadmap/epic_04_advanced_copy_paste.md` |
| Modify | `docs/roadmap/feature_spec_formula_builder_ux.md` |
| Modify | `docs/architecture/01-mode-system.md` |
| Modify | `docs/user-interactions/02-mode-behaviors.md` |
| Modify | `docs/user-interactions/03-keyboard-shortcuts.md` |
| Modify | `docs/api-reference/intent-vocabulary.md` |
| Modify | `docs/test-scenarios/formula-building.scenarios.md` |
| Modify | `docs/test-scenarios/selection-clipboard.scenarios.md` |

### Test Files
| Action | File |
|--------|------|
| Create | `e2e/absolute-references.spec.js` |
| Create | `tests/engine/utils/FormulaAdjuster.test.js` |
| Modify | `tests/engine/utils/CellHelpers.test.js` |

### Source Code Files
| Action | File |
|--------|------|
| Create | `js/engine/utils/FormulaAdjuster.js` |
| Modify | `js/engine/utils/CellHelpers.js` |
| Modify | `js/modes/Intents.js` |
| Modify | `js/ui/InputController.js` |
| Modify | `js/modes/PointMode.js` |
| Modify | `js/modes/EditMode.js` |
| Modify | `js/ui/ClipboardManager.js` |

---

## Implementation Order

### Step 1: Documentation (9 files)
1. `CLAUDE.md` - Add absolute references section
2. `docs/roadmap/epic_04_advanced_copy_paste.md` - Status and FormulaAdjuster details
3. `docs/roadmap/feature_spec_formula_builder_ux.md` - Expand F4 spec
4. `docs/architecture/01-mode-system.md` - Add TOGGLE_REFERENCE intent
5. `docs/user-interactions/02-mode-behaviors.md` - F4 in mode matrices
6. `docs/user-interactions/03-keyboard-shortcuts.md` - F4 shortcuts
7. `docs/api-reference/intent-vocabulary.md` - TOGGLE_REFERENCE docs
8. `docs/test-scenarios/formula-building.scenarios.md` - F4 scenarios
9. `docs/test-scenarios/selection-clipboard.scenarios.md` - Absolute paste scenarios

### Step 2: E2E Tests
10. Create `e2e/absolute-references.spec.js` - Write failing tests (TDD)

### Step 3: Code Implementation
11. `js/engine/utils/CellHelpers.js` - Add buildCellRef()
12. `tests/engine/utils/CellHelpers.test.js` - Unit tests for buildCellRef
13. Update `CellHelpers.resolveRelativeRef()` - Preserve $ markers
14. Create `js/engine/utils/FormulaAdjuster.js` - New utility
15. Create `tests/engine/utils/FormulaAdjuster.test.js` - Unit tests
16. `js/modes/Intents.js` - Add TOGGLE_REFERENCE intent
17. `js/ui/InputController.js` - Map F4 key
18. `js/modes/PointMode.js` - Handle TOGGLE_REFERENCE
19. `js/modes/EditMode.js` - Handle TOGGLE_REFERENCE
20. `js/ui/ClipboardManager.js` - Integrate FormulaAdjuster

### Step 4: Verification
21. Run all E2E tests - `npm run e2e`
22. Run all unit tests - `npm test`
