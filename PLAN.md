# Implementation Plan: Fix 17 Failing E2E Tests

## Summary of Issues

After analyzing the failing tests, I've identified **8 distinct root causes** affecting 17 tests across 6 categories.

---

## Issue Categories and Root Causes

### Category 1: Status Bar Not Updating (2 tests)
**Tests:**
- `status bar should update active cell when navigating with arrow keys`
- `status bar should update when clicking on different cells`

**Root Cause:** Status bar callbacks are registered with SelectionManager, but when mouse clicks bypass the mode system (going directly to `selectionManager.selectCell()`), the status bar should still update. The issue is likely that StatusBar's `setupCallbacks()` in `js/status-bar.js` is not being triggered properly during initialization.

**Files:** `js/status-bar.js`, `js/spreadsheet.js`

---

### Category 2: Enter Mode Not Exiting After Arrow Keys (2 tests)
**Tests:**
- `arrow key should commit edit and switch to Ready mode`
- `arrow right should commit edit and allow typing in next cell`

**Root Cause:** In `EnterMode.js:148-154`, `_handleNavigateWithCommit()` commits the entry and navigates but **never switches to Ready mode**. It should call `this._requestModeSwitch('ready')` after navigation.

**Files:** `js/modes/EnterMode.js:148-154`

**Fix:**
```javascript
_handleNavigateWithCommit(context) {
  this._commitEntry();
  super._handleNavigate(context);
  this._requestModeSwitch('ready');  // ADD THIS LINE
  return true;
}
```

---

### Category 3: Point Mode Mouse Click Not Inserting References (3 tests)
**Tests:**
- `clicking a cell in Point mode should insert reference`
- `clicking multiple cells should replace reference`
- `click after operator should add new reference`

**Root Cause:** `InputController._handleMouseDown()` at `js/ui/InputController.js:153-156` is a **stub** that does nothing. Mouse clicks bypass the mode system entirely and go directly to `selectionManager.selectCell()` via `Spreadsheet._setupEventWiring()`. Point mode's `CELL_SELECT` handler is never called for mouse events.

**Files:** `js/ui/InputController.js:153-156`, `js/spreadsheet.js:192-217`

**Fix:** Implement `_handleMouseDown()` to:
1. Extract cell coordinates from click target
2. Create a `CELL_SELECT` intent with coordinates and modifiers
3. Delegate to ModeManager

---

### Category 4: Double-Click / Edit Mode Issues (2 tests)
**Tests:**
- `double-click should enter Edit mode and allow editing`
- `arrow keys in Edit mode should move cursor, not cell selection`

**Root Cause:** The double-click handler at `js/spreadsheet.js:231-234` passes a string literal `'EDIT_START'` instead of importing the constant from `Intents.js`. This may cause issues with intent matching. Additionally, the test shows editor value is ` World` instead of `Hello World`, suggesting the existing value is being overwritten.

**Files:** `js/spreadsheet.js:231-235`, `js/modes/EditMode.js`

**Fix:**
1. Import `INTENTS` in Spreadsheet.js and use `INTENTS.EDIT_START`
2. Verify EditMode's `onEnter()` preserves existing cell content

---

### Category 5: Ctrl+B Formatting Not Working (2 tests)
**Tests:**
- `should toggle bold via Keyboard Shortcut (Ctrl+B)`
- `should persist formatting after reload`

**Root Cause:** `InputController._mapKeyToIntent()` correctly maps Ctrl+B to `INTENTS.FORMAT_BOLD` at line 300-306, but **no mode handles this intent**. `NavigationMode.handleIntent()` has no case for `FORMAT_BOLD`, so it falls through to `AbstractMode` which returns false (unhandled).

The old handler at `Spreadsheet._handleGlobalKeydown()` (line 426-435) was working but is now commented out (line 300).

**Files:** `js/modes/NavigationMode.js:58-90`

**Fix:** Add `FORMAT_BOLD` and `FORMAT_ITALIC` cases to `NavigationMode.handleIntent()`:
```javascript
case INTENTS.FORMAT_BOLD:
  return this._handleFormatBold();

case INTENTS.FORMAT_ITALIC:
  return this._handleFormatItalic();
```

Then implement these methods to call `spreadsheet.applyRangeFormat()`.

---

### Category 6: Enter Key Not Entering Edit Mode (1 test)
**Tests:**
- `pressing Enter on a cell with content should enter Edit mode`

**Root Cause:** In `ReadyMode.js:85-98`, the `COMMIT` intent handler only enters Edit mode if the cell contains a formula (starts with `=`). For non-formula content, it just navigates down.

**Files:** `js/modes/ReadyMode.js:85-98`

**Fix:** Change the logic to enter Edit mode for ANY cell with content:
```javascript
case INTENTS.COMMIT:
  const activeCellId = this._getActiveCellId();
  if (activeCellId) {
    const value = this._getCellValue(activeCellId);
    if (value) {  // Any content, not just formulas
      return this._handleEditStart({ source: 'keyboard' });
    }
  }
  return this._handleNavigate({ direction: 'down', shift: false });
```

---

### Category 7: Formula Bar Click Not Entering Edit Mode (1 test)
**Tests:**
- `clicking formula bar should enter Edit mode for active cell`

**Root Cause:** There's no event handler that captures clicks on the formula bar (`#formula-input`) to trigger mode transitions. The formula bar needs to generate an `EDIT_START` intent.

**Files:** `js/spreadsheet.js`, `js/formula-bar.js`

**Fix:** Add click handler on formula input that calls `modeManager.handleIntent(INTENTS.EDIT_START, { source: 'formulaBar' })`.

---

### Category 8: Jump to Edge Not Working After File Load (2 tests)
**Tests:**
- `Ctrl+Arrow should detect data edges immediately after load`
- `Ctrl+Right should work with horizontal data immediately after load`

**Root Cause:** In `NavigationMode.js:124-127`, `_handleJumpToEdge()` uses:
```javascript
const hasValueFn = (cellId) => {
  const value = this._fileManager?.getRawCellValue(cellId);
  return value !== null && value !== undefined && value !== '';
};
```

If `this._fileManager` is null or not yet initialized when Ctrl+Arrow is pressed, the optional chaining returns `undefined`, and `hasValueFn` returns `false` for every cell, causing no movement.

**Files:** `js/modes/NavigationMode.js:120-139`, `js/modes/AbstractMode.js:84-86`

**Fix:** Ensure `fileManager` is set in the mode context before keyboard events can be processed. Verify `spreadsheet.setFileManager()` is called and updates `modeContext.fileManager` properly.

---

### Category 9: Formula Calculation Showing Cell Reference Instead of Value (1 test)
**Tests:**
- `should correctly calculate and recalculate a formula`

**Root Cause:** The test shows `=A1+B1` displays "B1" instead of "15". This suggests the formula engine is returning the raw reference string instead of evaluating it. The issue is likely in how `getCellValue()` is called in the Evaluator, or cell data not being available when the formula is parsed.

**Files:** `js/engine/FormulaEngine.js:230-233`, `js/engine/Evaluator.js:60-61`

**Fix:** Debug the formula worker to trace why cell references aren't being resolved. Check if `cellData` is populated before formula evaluation.

---

## Implementation Order

1. **EnterMode arrow key exit** (Category 2) - Simple one-line fix
2. **Ctrl+B formatting** (Category 5) - Add intent handlers to NavigationMode
3. **Enter key Edit mode** (Category 6) - Simple condition change
4. **InputController mouse events** (Category 3) - Implement stub
5. **Status bar updates** (Category 1) - Verify callback wiring
6. **Double-click Edit mode** (Category 4) - Fix intent constant usage
7. **Formula bar click** (Category 7) - Add event handler
8. **Jump to edge** (Category 8) - Debug fileManager initialization
9. **Formula calculation** (Category 9) - Debug formula worker

---

## Files to Modify

| File | Changes |
|------|---------|
| `js/modes/EnterMode.js` | Add `_requestModeSwitch('ready')` after navigate |
| `js/modes/NavigationMode.js` | Add FORMAT_BOLD and FORMAT_ITALIC handlers |
| `js/modes/ReadyMode.js` | Change COMMIT to enter Edit mode for any content |
| `js/ui/InputController.js` | Implement `_handleMouseDown()` |
| `js/spreadsheet.js` | Import INTENTS, fix double-click handler, add formula bar click handler |
| `js/status-bar.js` | Verify callback registration |
| `js/formula-bar.js` | Add click handler for Edit mode transition |

---

## Estimated Impact

- **17 tests should pass** after implementing all fixes
- Changes are localized to the mode system and event handling
- No architectural changes required
- All fixes align with the existing FSM pattern documented in CLAUDE.md
