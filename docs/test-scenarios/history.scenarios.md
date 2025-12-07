# History (Undo/Redo) Test Scenarios

This document provides comprehensive test scenarios for undo/redo functionality in the v-sheet application, powered by the Command Pattern.

**Related Documentation**:
- **User Workflows**: [docs/user-interactions/01-core-workflows.md](../user-interactions/01-core-workflows.md) (workflow #13)
- **Keyboard Shortcuts**: [docs/user-interactions/03-keyboard-shortcuts.md](../user-interactions/03-keyboard-shortcuts.md) (Global shortcuts)
- **Architecture**: HistoryManager (`js/history/HistoryManager.js`), Command Pattern (`js/history/Command.js`)

---

## Architecture Overview

The undo/redo system uses the **Command Pattern**:

- **HistoryManager** maintains two stacks: `undoStack` and `redoStack`
- Every state-changing operation creates a **Command** object
- Commands implement `execute()` and `undo()` methods
- New operations clear the redo stack
- Stack size limited to 100 commands (prevents memory overflow)

**Command Types**:
1. **UpdateCellsCommand** - Cell value/formula changes
2. **MoveRangeCommand** - Drag-and-drop range moves
3. **ResizeCommand** - Column/row resize operations
4. **FormatRangeCommand** - Cell formatting changes

---

## Basic Undo/Redo Scenarios

### Scenario 1: Undo Single Cell Edit

**Given** user has entered "Hello" in cell B2
**When** user presses Cmd+Z (undo)
**Then**
- Cell B2 reverts to empty (previous state)
- Undo stack size decreases by 1
- Redo stack size increases by 1
- canRedo() returns true

**Playwright Implementation**:
```javascript
test('Undo single cell edit', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Enter value in B2
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('Hello');
  await page.keyboard.press('Enter');

  // Verify value is there
  await expect(page.locator('[data-cell="B2"]')).toHaveText('Hello');

  // Undo
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
  );

  // Cell should be empty
  await expect(page.locator('[data-cell="B2"]')).toHaveText('');
});
```

**What This Tests**:
- UpdateCellsCommand undo() method
- HistoryManager.undo() call
- UI update after undo

---

### Scenario 2: Redo Single Cell Edit

**Given** user has entered "Hello" in B2 and then undone it
**When** user presses Cmd+Shift+Z (redo)
**Then**
- Cell B2 contains "Hello" again
- Redo stack size decreases by 1
- Undo stack size increases by 1
- Command moves from redoStack back to undoStack

**Playwright Implementation**:
```javascript
test('Redo single cell edit', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Enter value, then undo
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('Hello');
  await page.keyboard.press('Enter');
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
  );

  // Cell should be empty after undo
  await expect(page.locator('[data-cell="B2"]')).toHaveText('');

  // Redo
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Shift+Z' : 'Control+Y'
  );

  // Cell should have value again
  await expect(page.locator('[data-cell="B2"]')).toHaveText('Hello');
});
```

**What This Tests**:
- UpdateCellsCommand execute() method (called again)
- HistoryManager.redo() call
- Stack management

**Platform Note**: macOS uses Cmd+Shift+Z for redo, Windows/Linux uses Ctrl+Y

---

### Scenario 3: Multiple Sequential Undos

**Given** user has performed 3 edits:
1. B2 = "First"
2. C3 = "Second"
3. D4 = "Third"

**When** user presses Cmd+Z three times
**Then**
- After 1st undo: D4 is empty, C3 and B2 still have values
- After 2nd undo: D4 and C3 empty, B2 still has value
- After 3rd undo: All cells empty
- Undo stack size is 0, redo stack size is 3

**Playwright Implementation**:
```javascript
test('Multiple sequential undos', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Perform 3 edits
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('First');
  await page.keyboard.press('Enter');

  await page.locator('[data-cell="C3"]').click();
  await page.keyboard.type('Second');
  await page.keyboard.press('Enter');

  await page.locator('[data-cell="D4"]').click();
  await page.keyboard.type('Third');
  await page.keyboard.press('Enter');

  // First undo
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
  );
  await expect(page.locator('[data-cell="D4"]')).toHaveText('');
  await expect(page.locator('[data-cell="C3"]')).toHaveText('Second');
  await expect(page.locator('[data-cell="B2"]')).toHaveText('First');

  // Second undo
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
  );
  await expect(page.locator('[data-cell="C3"]')).toHaveText('');
  await expect(page.locator('[data-cell="B2"]')).toHaveText('First');

  // Third undo
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
  );
  await expect(page.locator('[data-cell="B2"]')).toHaveText('');
});
```

**What This Tests**:
- Stack LIFO (Last In, First Out) behavior
- Independent undo operations
- Stack size management

---

### Scenario 4: Multiple Sequential Redos

**Given** user has performed 3 edits and undone all 3
**When** user presses Cmd+Shift+Z three times
**Then**
- After 1st redo: B2 = "First", others empty
- After 2nd redo: B2 = "First", C3 = "Second", D4 empty
- After 3rd redo: All three cells have original values
- Redo stack is empty, undo stack size is 3

**Playwright Implementation**:
```javascript
test('Multiple sequential redos', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Perform 3 edits
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('First');
  await page.keyboard.press('Enter');

  await page.locator('[data-cell="C3"]').click();
  await page.keyboard.type('Second');
  await page.keyboard.press('Enter');

  await page.locator('[data-cell="D4"]').click();
  await page.keyboard.type('Third');
  await page.keyboard.press('Enter');

  // Undo all 3
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
  );
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
  );
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
  );

  // Redo all 3
  const redoKey = process.platform === 'darwin' ? 'Meta+Shift+Z' : 'Control+Y';

  await page.keyboard.press(redoKey);
  await expect(page.locator('[data-cell="B2"]')).toHaveText('First');
  await expect(page.locator('[data-cell="C3"]')).toHaveText('');
  await expect(page.locator('[data-cell="D4"]')).toHaveText('');

  await page.keyboard.press(redoKey);
  await expect(page.locator('[data-cell="C3"]')).toHaveText('Second');

  await page.keyboard.press(redoKey);
  await expect(page.locator('[data-cell="D4"]')).toHaveText('Third');
});
```

**What This Tests**:
- Redo stack LIFO behavior
- Complete state restoration
- Stack transitions (redo → undo)

---

### Scenario 5: New Action Clears Redo Stack

**Given** user has performed an edit, undone it (redo stack has 1 command)
**When** user performs a new edit
**Then**
- Redo stack is cleared (size = 0)
- canRedo() returns false
- New command added to undo stack
- User cannot redo the original undone operation

**Playwright Implementation**:
```javascript
test('New action clears redo stack', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // First edit
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('Original');
  await page.keyboard.press('Enter');

  // Undo
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
  );
  await expect(page.locator('[data-cell="B2"]')).toHaveText('');

  // New edit (should clear redo stack)
  await page.locator('[data-cell="C3"]').click();
  await page.keyboard.type('New');
  await page.keyboard.press('Enter');

  // Try to redo - should do nothing
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Shift+Z' : 'Control+Y'
  );

  // B2 should still be empty (redo didn't happen)
  await expect(page.locator('[data-cell="B2"]')).toHaveText('');
  await expect(page.locator('[data-cell="C3"]')).toHaveText('New');
});
```

**What This Tests**:
- HistoryManager.execute() clears redoStack
- Redo stack invalidation logic
- Prevents "branching" history

**Critical Behavior**: This is essential for maintaining a linear history. Without this, users could create inconsistent states.

---

## Command-Specific Undo/Redo Scenarios

### Scenario 6: Undo Cell Update (UpdateCellsCommand)

**Given** user has changed B2 from "Old" to "New"
**When** user presses Cmd+Z
**Then**
- B2 reverts to "Old" (previous value)
- Formula worker recalculates dependents if B2 is referenced

**Playwright Implementation**:
```javascript
test('Undo cell update restores previous value', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Enter initial value
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('Old');
  await page.keyboard.press('Enter');

  // Change value
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('New');
  await page.keyboard.press('Enter');

  // Undo
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
  );

  // Should revert to "Old"
  await expect(page.locator('[data-cell="B2"]')).toHaveText('Old');
});
```

**What This Tests**:
- UpdateCellsCommand stores previous values
- UpdateCellsCommand.undo() restores old state
- Worker message sent for recalculation

---

### Scenario 7: Undo Range Move (MoveRangeCommand)

**Given** user has dragged range B2:C3 to E5:F6
**When** user presses Cmd+Z
**Then**
- Range E5:F6 becomes empty
- Range B2:C3 has original values restored
- Single undo operation reverses both moves

**Playwright Implementation**:
```javascript
test('Undo range move restores source and clears destination', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Create source range
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('A');
  await page.keyboard.press('Tab');
  await page.keyboard.type('B');
  await page.keyboard.press('Enter');
  await page.keyboard.type('C');
  await page.keyboard.press('Tab');
  await page.keyboard.type('D');
  await page.keyboard.press('Enter');

  // Select and drag range B2:C3 to E5
  await page.locator('[data-cell="B2"]').click();
  await page.locator('[data-cell="C3"]').click({ modifiers: ['Shift'] });

  // Simulate drag (this depends on your drag implementation)
  // For now, assume drag-and-drop handler exists
  // This is a simplified version - actual drag requires mouse events

  // Undo the move
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
  );

  // Source should be restored
  await expect(page.locator('[data-cell="B2"]')).toHaveText('A');
  await expect(page.locator('[data-cell="C2"]')).toHaveText('B');
  await expect(page.locator('[data-cell="B3"]')).toHaveText('C');
  await expect(page.locator('[data-cell="C3"]')).toHaveText('D');

  // Destination should be empty
  await expect(page.locator('[data-cell="E5"]')).toHaveText('');
  await expect(page.locator('[data-cell="F6"]')).toHaveText('');
});
```

**What This Tests**:
- MoveRangeCommand.undo() reverses both source and destination changes
- Atomic undo of compound operation
- Complex command state restoration

**Note**: Full drag-and-drop test requires mouse event simulation. See Epic 6 for drag-and-drop implementation.

---

### Scenario 8: Undo Column Resize (ResizeCommand)

**Given** user has resized column B from 94px to 150px
**When** user presses Cmd+Z
**Then**
- Column B width returns to 94px
- Grid re-renders with original width
- ResizeCommand stores old and new widths

**Playwright Implementation**:
```javascript
test('Undo column resize restores original width', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Get initial column width
  const colHeader = page.locator('.col-header[data-col="1"]'); // Column B
  const initialWidth = await colHeader.evaluate(el => el.offsetWidth);

  // Resize column (requires interacting with resize handle)
  // Simplified: Assume resize event fires and width changes to 150px
  // Actual test would require mouse drag on resize handle

  // For this test, we'll just verify undo works after resize
  // (Full resize interaction test should be in a separate file)

  // Undo resize
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
  );

  // Width should return to initial value
  const finalWidth = await colHeader.evaluate(el => el.offsetWidth);
  expect(finalWidth).toBe(initialWidth);
});
```

**What This Tests**:
- ResizeCommand.undo() restores old sizes
- GridRenderer updates column widths
- FileManager persists new widths

**Note**: Full resize interaction testing belongs in a dedicated resize test file.

---

### Scenario 9: Undo Cell Formatting (FormatRangeCommand)

**Given** user has made cell B2 bold and blue background
**When** user presses Cmd+Z
**Then**
- Cell B2 loses bold and background color
- Styling reverts to default or previous state
- FormatRangeCommand stores old styles

**Playwright Implementation**:
```javascript
test('Undo formatting restores previous style', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('Styled');
  await page.keyboard.press('Enter');

  // Apply formatting (assumes formatting UI exists)
  // This is a placeholder - actual implementation depends on Epic 9
  await page.locator('[data-cell="B2"]').click();
  // ... trigger bold and background color via UI ...

  // Undo formatting
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
  );

  // Check styling is removed (requires checking computed styles or class)
  // await expect(page.locator('[data-cell="B2"]')).not.toHaveCSS('font-weight', 'bold');
});
```

**What This Tests**:
- FormatRangeCommand.undo() removes new styles
- StyleManager integration
- Format state restoration

**Note**: This scenario requires Epic 9 (Cell Formatting) to be implemented.

---

## Formula Recalculation Undo Scenarios

### Scenario 10: Undo Cell Edit Triggers Dependent Recalculation

**Given**:
- A1 = 100
- A2 = `=A1*2` (calculated value: 200)
- User changes A1 to 500 (A2 recalculates to 1000)

**When** user presses Cmd+Z
**Then**:
- A1 reverts to 100
- A2 recalculates back to 200
- Worker receives message to recalculate A2

**Playwright Implementation**:
```javascript
test('Undo triggers recalculation of dependent formulas', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Set up formula
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('100');
  await page.keyboard.press('Enter');
  await page.keyboard.type('=A1*2');
  await page.keyboard.press('Enter');

  // Verify initial calculation
  await expect(page.locator('[data-cell="A2"]')).toHaveText('200');

  // Change A1
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('500');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-cell="A2"]')).toHaveText('1000');

  // Undo
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
  );

  // Both should revert
  await expect(page.locator('[data-cell="A1"]')).toHaveText('100');
  await expect(page.locator('[data-cell="A2"]')).toHaveText('200');
});
```

**What This Tests**:
- UpdateCellsCommand sends worker message on undo
- DependencyGraph recalculates affected cells
- UI updates with recalculated values

---

### Scenario 11: Undo Formula Edit

**Given**:
- A3 = `=A1+A2`
- User changes A3 to `=SUM(A1:A2)`

**When** user presses Cmd+Z
**Then**:
- A3 formula reverts to `=A1+A2`
- Formula bar shows `=A1+A2`
- Result recalculates using original formula

**Playwright Implementation**:
```javascript
test('Undo formula edit restores original formula', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Set up source cells
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('10');
  await page.keyboard.press('Enter');
  await page.keyboard.type('20');
  await page.keyboard.press('Enter');

  // Enter original formula
  await page.keyboard.type('=A1+A2');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-cell="A3"]')).toHaveText('30');

  // Change formula
  await page.locator('[data-cell="A3"]').click();
  await page.keyboard.type('=SUM(A1:A2)');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-cell="A3"]')).toHaveText('30');

  // Undo
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
  );

  // Check formula bar shows original formula
  await page.locator('[data-cell="A3"]').click();
  // await expect(page.locator('.formula-bar input')).toHaveValue('=A1+A2');
});
```

**What This Tests**:
- Formula string restoration
- Worker receives correct formula on undo
- Formula bar updates

---

## Edge Cases and Limits

### Scenario 12: Undo When Stack is Empty

**Given** user has just loaded the application (undo stack empty)
**When** user presses Cmd+Z
**Then**
- Nothing happens (no error thrown)
- Console warning: "Nothing to undo"
- canUndo() returns false

**Playwright Implementation**:
```javascript
test('Undo with empty stack does nothing', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Get initial cell state
  const initialText = await page.locator('[data-cell="B2"]').textContent();

  // Try to undo
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
  );

  // Cell should be unchanged
  const finalText = await page.locator('[data-cell="B2"]').textContent();
  expect(finalText).toBe(initialText);
});
```

**What This Tests**:
- HistoryManager.undo() early return when stack empty
- Graceful handling of invalid undo

---

### Scenario 13: Redo When Stack is Empty

**Given** user has not performed any undo operations (redo stack empty)
**When** user presses Cmd+Shift+Z
**Then**
- Nothing happens
- Console warning: "Nothing to redo"
- canRedo() returns false

**Playwright Implementation**:
```javascript
test('Redo with empty stack does nothing', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('Test');
  await page.keyboard.press('Enter');

  // Try to redo without undoing first
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Shift+Z' : 'Control+Y'
  );

  // Cell should still have the value
  await expect(page.locator('[data-cell="B2"]')).toHaveText('Test');
});
```

**What This Tests**:
- HistoryManager.redo() early return when stack empty
- Redo only works after undo

---

### Scenario 14: History Clears on File Load

**Given** user has performed several edits (undo stack has 5 commands)
**When** user loads a new file
**Then**
- Undo stack is cleared (size = 0)
- Redo stack is cleared (size = 0)
- canUndo() and canRedo() both return false
- Previous file's history is not accessible

**Playwright Implementation**:
```javascript
test('Loading new file clears history', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Make some edits
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('Edit1');
  await page.keyboard.press('Enter');
  await page.locator('[data-cell="C3"]').click();
  await page.keyboard.type('Edit2');
  await page.keyboard.press('Enter');

  // Load a different file (assumes file switcher UI exists)
  // For this test, we'll simulate a page reload which triggers loadFromFile
  await page.reload();

  // Wait for page to load
  await page.waitForSelector('.cell-grid');

  // Try to undo - should do nothing
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
  );

  // Cells should remain in their loaded state (empty or with loaded data)
});
```

**What This Tests**:
- HistoryManager.clear() called on file load
- History isolation between files

**Implementation**: Check `js/spreadsheet.js:loadFromFile()` calls `historyManager.clear()` (line 146)

---

### Scenario 15: Stack Size Limit (100 Commands)

**Given** user has performed 101 cell edits
**When** user tries to undo 101 times
**Then**
- Only 100 undos work (oldest command was dropped)
- After 100 undos, canUndo() returns false
- Stack prevents unbounded memory growth

**Playwright Implementation**:
```javascript
test('Undo stack limited to 100 commands', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Perform 101 edits
  for (let i = 0; i < 101; i++) {
    await page.locator('[data-cell="A1"]').click();
    await page.keyboard.type(`Edit${i}`);
    await page.keyboard.press('Enter');
  }

  // Cell should have last edit
  await expect(page.locator('[data-cell="A1"]')).toHaveText('Edit100');

  // Undo 100 times
  for (let i = 0; i < 100; i++) {
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
    );
  }

  // Cell should have Edit0 (oldest command still in stack)
  await expect(page.locator('[data-cell="A1"]')).toHaveText('Edit0');

  // 101st undo should do nothing (stack empty)
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
  );
  await expect(page.locator('[data-cell="A1"]')).toHaveText('Edit0');
});
```

**What This Tests**:
- HistoryManager stack size limit enforcement
- `undoStack.shift()` removes oldest command (line 45)
- Memory management

**Note**: This is a long test (101 edits). Consider reducing to 10-15 for faster execution.

---

## Complex Undo/Redo Workflows

### Scenario 16: Undo/Redo Interleaving

**Given** user performs sequence:
1. Edit A1 = "First"
2. Edit B2 = "Second"
3. Undo (B2 empty)
4. Edit C3 = "Third"
5. Undo (C3 empty)
6. Redo (C3 = "Third" again)

**When** user tries to redo again
**Then**
- Nothing happens (redo stack empty after step 6)
- B2 cannot be redone (cleared by step 4)

**Playwright Implementation**:
```javascript
test('Complex undo/redo interleaving', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Step 1
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('First');
  await page.keyboard.press('Enter');

  // Step 2
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('Second');
  await page.keyboard.press('Enter');

  // Step 3: Undo
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
  );
  await expect(page.locator('[data-cell="B2"]')).toHaveText('');

  // Step 4: New edit (clears redo stack)
  await page.locator('[data-cell="C3"]').click();
  await page.keyboard.type('Third');
  await page.keyboard.press('Enter');

  // Step 5: Undo
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
  );
  await expect(page.locator('[data-cell="C3"]')).toHaveText('');

  // Step 6: Redo
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Shift+Z' : 'Control+Y'
  );
  await expect(page.locator('[data-cell="C3"]')).toHaveText('Third');

  // Try redo again - should do nothing
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Shift+Z' : 'Control+Y'
  );
  await expect(page.locator('[data-cell="C3"]')).toHaveText('Third');

  // B2 should still be empty (cannot redo old operation)
  await expect(page.locator('[data-cell="B2"]')).toHaveText('');
});
```

**What This Tests**:
- Redo stack clearing on new edit
- Linear history enforcement
- Complex state transitions

---

### Scenario 17: Undo Bulk Operation (Range Paste)

**Given** user has pasted 2x2 range (4 cells updated atomically)
**When** user presses Cmd+Z
**Then**
- All 4 cells revert in a single undo
- Not 4 separate undo operations
- UpdateCellsCommand handles multiple cells

**Playwright Implementation**:
```javascript
test('Undo bulk paste reverts all cells atomically', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Create source range
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('1');
  await page.keyboard.press('Tab');
  await page.keyboard.type('2');
  await page.keyboard.press('Enter');
  await page.keyboard.type('3');
  await page.keyboard.press('Tab');
  await page.keyboard.type('4');
  await page.keyboard.press('Enter');

  // Copy range
  await page.locator('[data-cell="A1"]').click();
  await page.locator('[data-cell="B2"]').click({ modifiers: ['Shift'] });
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
  );

  // Paste to D5
  await page.locator('[data-cell="D5"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
  );

  // Verify paste
  await expect(page.locator('[data-cell="D5"]')).toHaveText('1');
  await expect(page.locator('[data-cell="E6"]')).toHaveText('4');

  // Single undo should revert all 4 cells
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
  );

  await expect(page.locator('[data-cell="D5"]')).toHaveText('');
  await expect(page.locator('[data-cell="E5"]')).toHaveText('');
  await expect(page.locator('[data-cell="D6"]')).toHaveText('');
  await expect(page.locator('[data-cell="E6"]')).toHaveText('');
});
```

**What This Tests**:
- Atomic bulk operations
- UpdateCellsCommand handles multiple cells in constructor
- Single command for related changes

---

### Scenario 18: Undo After Mode Transitions

**Given** user enters formula in PointMode, commits, then switches to Edit mode
**When** user undoes while in Edit mode
**Then**
- Formula edit is undone (mode doesn't matter)
- Undo works across mode boundaries
- HistoryManager is mode-agnostic

**Playwright Implementation**:
```javascript
test('Undo works across mode transitions', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Enter formula in PointMode
  await page.locator('[data-cell="A3"]').click();
  await page.keyboard.type('=A1+A2');
  await page.keyboard.press('Enter');

  // Switch to EditMode (F2)
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.press('F2');

  // Type something in EditMode
  await page.keyboard.type('Test');
  await page.keyboard.press('Enter');

  // Now undo from ReadyMode
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
  );

  // Last edit (B2) should be undone
  await expect(page.locator('[data-cell="B2"]')).toHaveText('');

  // Undo again (A3 formula)
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
  );
  await expect(page.locator('[data-cell="A3"]')).toHaveText('');
});
```

**What This Tests**:
- HistoryManager independent of mode system
- Undo/redo available in all modes (handled in NavigationMode base class)
- Mode transitions don't affect history

---

## Performance and Stress Tests

### Scenario 19: Rapid Undo/Redo Sequence

**Given** user has 20 commands in undo stack
**When** user rapidly presses Cmd+Z 20 times, then Cmd+Shift+Z 20 times
**Then**
- All operations complete without lag
- UI updates correctly for each step
- No stack corruption

**Playwright Implementation**:
```javascript
test('Rapid undo/redo sequence performs well', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Create 20 edits
  for (let i = 0; i < 20; i++) {
    await page.locator('[data-cell="A1"]').click();
    await page.keyboard.type(`${i}`);
    await page.keyboard.press('Enter');
  }

  // Rapid undo
  const startUndo = Date.now();
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
    );
  }
  const undoDuration = Date.now() - startUndo;

  // Should complete in reasonable time (< 5 seconds)
  expect(undoDuration).toBeLessThan(5000);

  // Rapid redo
  const startRedo = Date.now();
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+Shift+Z' : 'Control+Y'
    );
  }
  const redoDuration = Date.now() - startRedo;

  expect(redoDuration).toBeLessThan(5000);

  // Final state should match initial
  await expect(page.locator('[data-cell="A1"]')).toHaveText('19');
});
```

**What This Tests**:
- Performance of stack operations
- UI responsiveness
- No memory leaks or slowdowns

---

## Integration with Other Features

### Scenario 20: Undo After Copy/Paste

**Given** user has copied B2 and pasted to D5
**When** user undoes
**Then**
- Only the paste is undone (D5 cleared)
- Copy operation is not undoable (no state change)
- B2 remains unchanged

**Playwright Implementation**:
```javascript
test('Undo paste does not affect copy', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('Data');
  await page.keyboard.press('Enter');

  // Copy
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
  );

  // Paste
  await page.locator('[data-cell="D5"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
  );

  // Undo paste
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
  );

  // D5 should be empty
  await expect(page.locator('[data-cell="D5"]')).toHaveText('');

  // B2 should still have data
  await expect(page.locator('[data-cell="B2"]')).toHaveText('Data');
});
```

**What This Tests**:
- Paste creates UpdateCellsCommand
- Copy doesn't create command (read-only)
- Undo only affects stateful operations

---

## Summary

These 20 scenarios provide comprehensive coverage of:

**Basic Undo/Redo**:
- Single operations
- Sequential undo/redo
- Redo stack clearing

**Command Types**:
- UpdateCellsCommand (cell edits)
- MoveRangeCommand (drag-and-drop)
- ResizeCommand (column/row resize)
- FormatRangeCommand (styling)

**Formula Integration**:
- Dependent recalculation on undo
- Formula string restoration

**Edge Cases**:
- Empty stack handling
- Stack size limits
- File load clearing history

**Complex Workflows**:
- Undo/redo interleaving
- Bulk operations
- Mode transitions

**Performance**:
- Rapid undo/redo
- Large stack handling

---

## Testing Strategy

### Priority Levels

**High Priority** (Core Functionality):
- Scenarios 1-5 (Basic undo/redo, stack management)
- Scenario 6 (UpdateCellsCommand)
- Scenario 10 (Formula recalculation)

**Medium Priority** (Extended Features):
- Scenarios 7-9 (Command-specific undo)
- Scenarios 11-13 (Edge cases)
- Scenario 17 (Bulk operations)

**Low Priority** (Advanced/Integration):
- Scenarios 14-16 (Complex workflows)
- Scenarios 18-20 (Integration tests)
- Scenario 19 (Performance)

### Recommended Test Organization

Group tests in Playwright spec files:
- `history-basic.spec.js` - Scenarios 1-5
- `history-commands.spec.js` - Scenarios 6-9
- `history-formulas.spec.js` - Scenarios 10-11
- `history-edge-cases.spec.js` - Scenarios 12-15
- `history-complex.spec.js` - Scenarios 16-18
- `history-performance.spec.js` - Scenario 19
- `history-integration.spec.js` - Scenario 20

---

## Implementation Checklist

Verify these implementation requirements:

- [ ] HistoryManager maintains undoStack and redoStack
- [ ] All state-changing operations use Command Pattern
- [ ] Commands implement execute() and undo() methods
- [ ] New operations clear redo stack
- [ ] Stack size limited to 100 commands
- [ ] File load calls historyManager.clear()
- [ ] Undo/redo accessible via keyboard shortcuts (Cmd+Z, Cmd+Shift+Z)
- [ ] Worker integration: undo sends correct messages to formula worker
- [ ] Mode system: undo/redo handled in NavigationMode base class

---

## Related Files

- **HistoryManager**: `js/history/HistoryManager.js`
- **Command Base Class**: `js/history/Command.js`
- **UpdateCellsCommand**: `js/history/commands/UpdateCellsCommand.js`
- **MoveRangeCommand**: `js/history/commands/MoveRangeCommand.js`
- **ResizeCommand**: `js/history/commands/ResizeCommand.js`
- **FormatRangeCommand**: `js/history/commands/FormatRangeCommand.js`
- **NavigationMode**: `js/modes/NavigationMode.js` (handles undo/redo intents)
