# Bug Fix Plan for v-sheet

## Summary
Fix 5 bugs from `docs/ux_architecture/bud_report.md` affecting file menu, clipboard, formula bar sync, drag ghost, and mode transitions.

---

## Bug 1: File Menu Doesn't Disappear After Creating New File

**Problem:** `handleNewFile()` doesn't guarantee dropdown closure or grid focus.

**Files to modify:**
- `js/formula-bar.js` (lines 335-367)

**Changes:**
1. Wrap `handleNewFile()` in try-finally block
2. Move `closeFileDropdown()` to finally block
3. Add `this.spreadsheet.renderer.cellGridContainer.focus()` after closing

---

## Bug 2: Copy/Paste Doesn't Work with Ctrl+C/Ctrl+V

**Problem:** `ClipboardManager.paste()` doesn't exist; `copy()` called without ranges.

**Files to modify:**
- `js/ui/ClipboardManager.js`
- `js/modes/NavigationMode.js`
- `js/spreadsheet.js`

**Changes:**

1. **ClipboardManager.js:**
   - Add `selectionManager` parameter to constructor
   - Modify `copy(ranges)` to get ranges from `selectionManager` when not provided
   - Add `paste()` method that calls `getPasteUpdates(activeCell)`
   - Add `cut()` method that calls `copy()` then sets `clipboard.isCut = true`

2. **spreadsheet.js:**
   - Pass `selectionManager` to ClipboardManager constructor
   - Add `executePaste` method to mode context that executes `UpdateCellsCommand`

3. **NavigationMode.js:**
   - Update `_handlePaste()` to call `context.executePaste(updates)`

---

## Bug 3: Formula Bar Synchronization Issues

**Problem:** Formula bar and cell editor don't sync during editing.

**Files to modify:**
- `js/ui/EditorManager.js`
- `js/formula-bar.js`
- `js/modes/EditMode.js`
- `js/modes/PointMode.js`
- `js/modes/Intents.js`
- `js/spreadsheet.js`

**Sub-fixes:**

### 3a. Cell typing doesn't update formula bar
- **EditorManager.js:** Add `onValueChange` callback, fire on `input` event
- **spreadsheet.js:** Wire callback to update formula bar

### 3b. Formula bar typing doesn't update cell
- **formula-bar.js:** Implement `handleFormulaInput()` to call `editor.setValue(value)`

### 3c. Point mode shows nothing when typing letters
- **PointMode.js:** In `_handleInput()`, pass the already-updated value to EditMode's `initialValue`

### 3d. Formula bar click should switch to Edit mode properly
- **Intents.js:** Add 'formulaBar' as valid source in `createEditStartContext()`

### 3e. No Point mode switch from Edit mode after typing operator
- **EditMode.js:** Add `INTENTS.INPUT` case in `handleIntent()`
- Check if editing formula and character is operator (+, -, *, /, etc.)
- If so, append operator and switch to PointMode

---

## Bug 4: Drag Ghost Not Visible

**Problem:** `showDragGhost()` is empty placeholder.

**Files to modify:**
- `js/ui/GridRenderer.js` (lines 232-238)

**Changes:**
1. Create `#drag-ghost` element dynamically if not exists
2. Calculate position from range cells using `getBoundingClientRect()`
3. Set `left`, `top`, `width`, `height` and `display: block`

---

## Implementation Order

1. **Bug 4** - Isolated, no dependencies
2. **Bug 1** - Isolated, straightforward
3. **Bug 2** - Multiple files but clear pattern
4. **Bug 3** - Most complex, interdependent sub-fixes

---

## Critical Files Summary

| File | Bugs |
|------|------|
| `js/formula-bar.js` | 1, 3b |
| `js/ui/ClipboardManager.js` | 2 |
| `js/modes/NavigationMode.js` | 2 |
| `js/spreadsheet.js` | 2, 3a |
| `js/ui/EditorManager.js` | 3a |
| `js/modes/EditMode.js` | 3e |
| `js/modes/PointMode.js` | 3c |
| `js/modes/Intents.js` | 3d |
| `js/ui/GridRenderer.js` | 4 |
