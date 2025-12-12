# Selection and Clipboard Test Scenarios

This document provides comprehensive test scenarios for selection behaviors and clipboard operations (copy/paste/cut) in the v-sheet application.

**Related Documentation**:
- **User Workflows**: [docs/user-interactions/01-core-workflows.md](../user-interactions/01-core-workflows.md) (workflows #6-8)
- **Keyboard Shortcuts**: [docs/user-interactions/03-keyboard-shortcuts.md](../user-interactions/03-keyboard-shortcuts.md)
- **Architecture**: SelectionManager (`js/ui/SelectionManager.js`), ClipboardManager (`js/ui/ClipboardManager.js`)

---

## Basic Selection Scenarios

### Scenario 1: Single Cell Selection

**Given** the grid is loaded with default state
**When** user clicks on cell C5
**Then**
- Cell C5 has blue selection border
- Active cell is C5
- Selection ranges array contains one range: { start: C5, end: C5 }
- Formula bar shows C5's content (or empty)

**Playwright Implementation**:
```javascript
test('Single cell selection', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="C5"]').click();

  await expect(page.locator('[data-cell="C5"]')).toHaveClass(/selected/);
  // Could also check computed styles for blue border
});
```

---

### Scenario 2: Range Selection by Dragging

**Given** user has grid loaded
**When** user clicks on cell B2 and drags to D4
**Then**
- Cells B2:D4 are highlighted with selection overlay
- Active cell is B2 (the anchor point)
- Selection ranges contains: { start: B2, end: D4 }
- 9 cells total are selected (3x3 grid)

**Playwright Implementation**:
```javascript
test('Range selection by dragging', async ({ page }) => {
  await page.goto('http://localhost:5000');

  const startCell = page.locator('[data-cell="B2"]');
  const endCell = page.locator('[data-cell="D4"]');

  await startCell.hover();
  await page.mouse.down();
  await endCell.hover();
  await page.mouse.up();

  // Check that cells in range have selection styling
  await expect(page.locator('[data-cell="B2"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-cell="D4"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-cell="C3"]')).toHaveClass(/selected/);
});
```

**What This Tests**:
- Mouse down → drag → mouse up interaction
- Range calculation from start/end coordinates
- Selection rendering for all cells in range

---

### Scenario 3: Extend Selection with Shift+Click

**Given** user has selected cell B2
**When** user holds Shift and clicks on D4
**Then**
- Selection extends from B2 to D4
- Active cell remains B2
- Selection is a single continuous range B2:D4

**Playwright Implementation**:
```javascript
test('Extend selection with Shift+Click', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="B2"]').click();
  await page.locator('[data-cell="D4"]').click({ modifiers: ['Shift'] });

  // All cells in range should be selected
  await expect(page.locator('[data-cell="B2"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-cell="C3"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-cell="D4"]')).toHaveClass(/selected/);
});
```

**What This Tests**:
- Shift modifier detection
- Range extension logic
- Active cell preservation

---

### Scenario 4: Multi-Range Selection with Cmd+Click

**Given** user has selected range B2:C3
**When** user holds Cmd and clicks on E5
**Then**
- Both B2:C3 and E5 are selected (two disconnected ranges)
- Active cell becomes E5
- Selection ranges array has two entries
- Both ranges are highlighted

**Playwright Implementation**:
```javascript
test('Multi-range selection with Cmd+Click', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Select first range
  await page.locator('[data-cell="B2"]').click();
  await page.locator('[data-cell="C3"]').click({ modifiers: ['Shift'] });

  // Add second range with Cmd
  await page.locator('[data-cell="E5"]').click({
    modifiers: process.platform === 'darwin' ? ['Meta'] : ['Control']
  });

  // Both ranges should be selected
  await expect(page.locator('[data-cell="B2"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-cell="C3"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-cell="E5"]')).toHaveClass(/selected/);
});
```

**What This Tests**:
- Cmd/Ctrl modifier detection
- Multi-range state management
- Rendering multiple disconnected selections

**Platform Note**: macOS uses Meta (Cmd), Windows/Linux uses Control

---

## Header Selection Scenarios

### Scenario 5: Select Entire Column

**Given** grid is loaded
**When** user clicks on column header "C"
**Then**
- All cells in column C (C1:C100) are selected
- Active cell is C1
- Column header C is highlighted
- Selection range is { start: C1, end: C100 }

**Playwright Implementation**:
```javascript
test('Select entire column by clicking header', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('.col-header[data-col="2"]').click(); // Column C is index 2

  // Check a few cells in the column are selected
  await expect(page.locator('[data-cell="C1"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-cell="C50"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-cell="C100"]')).toHaveClass(/selected/);

  // Check column header is highlighted
  await expect(page.locator('.col-header[data-col="2"]')).toHaveClass(/header-selected/);
});
```

**What This Tests**:
- Header click detection
- Full column selection logic
- Header visual feedback

---

### Scenario 6: Select Entire Row

**Given** grid is loaded
**When** user clicks on row header "5"
**Then**
- All cells in row 5 (A5:Z5) are selected
- Active cell is A5
- Row header 5 is highlighted
- Selection range is { start: A5, end: Z5 }

**Playwright Implementation**:
```javascript
test('Select entire row by clicking header', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('.row-header[data-row="5"]').click();

  // Check cells across the row are selected
  await expect(page.locator('[data-cell="A5"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-cell="M5"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-cell="Z5"]')).toHaveClass(/selected/);

  // Check row header is highlighted
  await expect(page.locator('.row-header[data-row="5"]')).toHaveClass(/header-selected/);
});
```

---

### Scenario 7: Extend Selection to Include Column with Shift+Header Click

**Given** user has selected range B2:C5
**When** user holds Shift and clicks column header "E"
**Then**
- Selection extends from B2 to E100 (entire column E included)
- Active cell remains B2
- Range is continuous from B2 to E100

**Playwright Implementation**:
```javascript
test('Extend selection to column with Shift+Click header', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Select initial range
  await page.locator('[data-cell="B2"]').click();
  await page.locator('[data-cell="C5"]').click({ modifiers: ['Shift'] });

  // Shift+Click column E header
  await page.locator('.col-header[data-col="4"]').click({ modifiers: ['Shift'] });

  // Check extended range includes column E
  await expect(page.locator('[data-cell="E2"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-cell="E100"]')).toHaveClass(/selected/);
});
```

**What This Tests**:
- Shift+header interaction
- Range extension to full column
- Mixed cell and header selection logic

---

### Scenario 8: Add Disconnected Column with Cmd+Header Click

**Given** user has selected column B
**When** user holds Cmd and clicks column header "D"
**Then**
- Both column B and column D are selected (disconnected)
- Two ranges exist in selection
- Both columns highlighted

**Playwright Implementation**:
```javascript
test('Add disconnected column with Cmd+Click header', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Select column B
  await page.locator('.col-header[data-col="1"]').click();

  // Cmd+Click column D
  await page.locator('.col-header[data-col="3"]').click({
    modifiers: process.platform === 'darwin' ? ['Meta'] : ['Control']
  });

  // Both columns should be selected
  await expect(page.locator('[data-cell="B10"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-cell="D10"]')).toHaveClass(/selected/);

  // Column C should NOT be selected
  await expect(page.locator('[data-cell="C10"]')).not.toHaveClass(/selected/);
});
```

---

## Keyboard Selection Extension Scenarios

### Scenario 9: Extend Selection with Shift+Arrow Right

**Given** user has selected cell B2
**When** user presses Shift+Arrow Right
**Then**
- Selection extends to include C2
- Range is now B2:C2
- Active cell remains B2

**Playwright Implementation**:
```javascript
test('Extend selection with Shift+Arrow Right', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.press('Shift+ArrowRight');

  await expect(page.locator('[data-cell="B2"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-cell="C2"]')).toHaveClass(/selected/);
});
```

---

### Scenario 10: Extend Selection with Shift+Arrow Down (Multiple Presses)

**Given** user has selected cell B2
**When** user presses Shift+Arrow Down three times
**Then**
- Selection extends to B2:B5 (4 cells vertically)
- Active cell remains B2
- All four cells highlighted

**Playwright Implementation**:
```javascript
test('Extend selection downward with multiple Shift+Arrow presses', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Shift+ArrowDown');

  await expect(page.locator('[data-cell="B2"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-cell="B3"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-cell="B4"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-cell="B5"]')).toHaveClass(/selected/);
});
```

---

### Scenario 11: Extend Selection to Edge with Cmd+Shift+Arrow Right

**Given** user has selected cell A1, and cells A1-A5 contain data, A6 is empty
**When** user presses Cmd+Shift+Arrow Right
**Then**
- Selection extends from A1 to the edge of data in row 1
- If row 1 has data in A1:D1, selection becomes A1:D1
- Active cell remains A1

**Playwright Implementation**:
```javascript
test('Extend selection to edge with Cmd+Shift+Arrow Right', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Set up data in A1:D1
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('100');
  await page.keyboard.press('Tab');
  await page.keyboard.type('200');
  await page.keyboard.press('Tab');
  await page.keyboard.type('300');
  await page.keyboard.press('Tab');
  await page.keyboard.type('400');
  await page.keyboard.press('Enter');

  // Select A1 and extend to edge
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Shift+ArrowRight' : 'Control+Shift+ArrowRight'
  );

  // Check range A1:D1 is selected
  await expect(page.locator('[data-cell="A1"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-cell="B1"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-cell="C1"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-cell="D1"]')).toHaveClass(/selected/);

  // E1 should NOT be selected
  await expect(page.locator('[data-cell="E1"]')).not.toHaveClass(/selected/);
});
```

**What This Tests**:
- Edge detection logic
- Keyboard modifier combinations (Cmd+Shift)
- Data boundary awareness

---

## Copy Operation Scenarios

### Scenario 12: Copy Single Cell

**Given** user has selected cell B2 containing "Hello"
**When** user presses Cmd+C
**Then**
- Cell B2 gets "copy-source" highlight (dashed border)
- Clipboard data contains B2's value
- System clipboard contains "Hello"

**Playwright Implementation**:
```javascript
test('Copy single cell', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Enter data in B2
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('Hello');
  await page.keyboard.press('Enter');

  // Copy B2
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
  );

  // Check visual feedback
  await expect(page.locator('[data-cell="B2"]')).toHaveClass(/copy-source/);

  // Note: Testing system clipboard in Playwright requires clipboard permissions
  // const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  // expect(clipboardText).toBe('Hello');
});
```

**What This Tests**:
- Copy command detection
- ClipboardManager.copy() call
- Visual feedback rendering

---

### Scenario 13: Copy Range of Cells

**Given** user has selected range B2:C3 with values:
```
B2: 100  | C2: 200
B3: 300  | C3: 400
```
**When** user presses Cmd+C
**Then**
- All four cells highlighted with copy-source border
- Clipboard contains 2x2 grid data
- System clipboard contains tab/newline delimited text:
  ```
  100\t200
  300\t400
  ```

**Playwright Implementation**:
```javascript
test('Copy range of cells', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Fill in 2x2 range
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('100');
  await page.keyboard.press('Tab');
  await page.keyboard.type('200');
  await page.keyboard.press('Enter');
  await page.keyboard.type('300');
  await page.keyboard.press('Tab');
  await page.keyboard.type('400');
  await page.keyboard.press('Enter');

  // Select range B2:C3
  await page.locator('[data-cell="B2"]').click();
  await page.locator('[data-cell="C3"]').click({ modifiers: ['Shift'] });

  // Copy
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
  );

  // Check all cells have copy-source class
  await expect(page.locator('[data-cell="B2"]')).toHaveClass(/copy-source/);
  await expect(page.locator('[data-cell="C2"]')).toHaveClass(/copy-source/);
  await expect(page.locator('[data-cell="B3"]')).toHaveClass(/copy-source/);
  await expect(page.locator('[data-cell="C3"]')).toHaveClass(/copy-source/);
});
```

**What This Tests**:
- Range copy logic
- Tab-delimited text format
- Multiple cell visual feedback

---

### Scenario 14: Copy Clears Previous Copy Visual

**Given** user has copied cell B2 (highlighted with copy-source)
**When** user copies cell D4
**Then**
- B2 loses copy-source highlight
- D4 gains copy-source highlight
- Only one set of cells highlighted at a time

**Playwright Implementation**:
```javascript
test('Copy clears previous copy highlight', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Copy B2
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
  );
  await expect(page.locator('[data-cell="B2"]')).toHaveClass(/copy-source/);

  // Copy D4
  await page.locator('[data-cell="D4"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
  );

  // B2 should no longer be highlighted
  await expect(page.locator('[data-cell="B2"]')).not.toHaveClass(/copy-source/);

  // D4 should be highlighted
  await expect(page.locator('[data-cell="D4"]')).toHaveClass(/copy-source/);
});
```

**What This Tests**:
- ClipboardManager.clearVisuals()
- State replacement on new copy

---

## Paste Operation Scenarios

### Scenario 15: Paste Single Cell

**Given** user has copied cell B2 containing "Hello"
**When** user selects D5 and presses Cmd+V
**Then**
- D5 now contains "Hello"
- B2 still contains "Hello" (copy, not cut)
- Copy-source highlight clears from B2 after paste

**Playwright Implementation**:
```javascript
test('Paste single cell', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Enter and copy B2
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('Hello');
  await page.keyboard.press('Enter');
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
  );

  // Paste to D5
  await page.locator('[data-cell="D5"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
  );

  // Check D5 has the value
  await expect(page.locator('[data-cell="D5"]')).toHaveText('Hello');

  // B2 should still have the value
  await expect(page.locator('[data-cell="B2"]')).toHaveText('Hello');
});
```

**What This Tests**:
- Paste command detection
- UpdateCellsCommand execution
- Non-destructive copy

---

### Scenario 16: Paste Range

**Given** user has copied range B2:C3 (2x2 grid with values 100, 200, 300, 400)
**When** user selects E5 and presses Cmd+V
**Then**
- Range E5:F6 now contains the copied values:
  ```
  E5: 100  | F5: 200
  E6: 300  | F6: 400
  ```
- Relative positions preserved
- Original range B2:C3 unchanged

**Playwright Implementation**:
```javascript
test('Paste range', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Create 2x2 source range
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('100');
  await page.keyboard.press('Tab');
  await page.keyboard.type('200');
  await page.keyboard.press('Enter');
  await page.keyboard.type('300');
  await page.keyboard.press('Tab');
  await page.keyboard.type('400');
  await page.keyboard.press('Enter');

  // Copy range
  await page.locator('[data-cell="B2"]').click();
  await page.locator('[data-cell="C3"]').click({ modifiers: ['Shift'] });
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
  );

  // Paste to E5
  await page.locator('[data-cell="E5"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
  );

  // Verify pasted values
  await expect(page.locator('[data-cell="E5"]')).toHaveText('100');
  await expect(page.locator('[data-cell="F5"]')).toHaveText('200');
  await expect(page.locator('[data-cell="E6"]')).toHaveText('300');
  await expect(page.locator('[data-cell="F6"]')).toHaveText('400');

  // Original range should be unchanged
  await expect(page.locator('[data-cell="B2"]')).toHaveText('100');
  await expect(page.locator('[data-cell="C3"]')).toHaveText('400');
});
```

**What This Tests**:
- Range paste logic
- Relative position calculation
- Bounds checking (paste doesn't go beyond grid)

---

### Scenario 17: Paste Formula with Relative Reference Adjustment

**Given** user has copied cell B2 containing formula "=A1+A2"
**When** user pastes to D5
**Then**
- D5 contains formula "=C4+C5" (relative references adjusted)
- Formula calculates correctly based on C4 and C5 values

**Playwright Implementation**:
```javascript
test('Paste formula with relative reference adjustment', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Set up source cells
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('10');
  await page.keyboard.press('Enter');
  await page.keyboard.type('20');
  await page.keyboard.press('Enter');

  // Create formula in B2
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('=A1+A2');
  await page.keyboard.press('Enter');

  // Verify B2 shows 30
  await expect(page.locator('[data-cell="B2"]')).toHaveText('30');

  // Copy B2
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
  );

  // Set up destination reference cells
  await page.locator('[data-cell="C4"]').click();
  await page.keyboard.type('100');
  await page.keyboard.press('Enter');
  await page.keyboard.type('200');
  await page.keyboard.press('Enter');

  // Paste to D5
  await page.locator('[data-cell="D5"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
  );

  // D5 should show 300 (C4=100 + C5=200)
  await expect(page.locator('[data-cell="D5"]')).toHaveText('300');

  // Check formula bar shows adjusted formula (if visible)
  // await expect(page.locator('.formula-bar input')).toHaveValue('=C4+C5');
});
```

**What This Tests**:
- Formula paste logic
- Relative reference adjustment algorithm
- Worker recalculation after paste

**Important**: This test assumes the formula engine adjusts references when pasting. Check implementation in `UpdateCellsCommand` or paste handler.

---

### Scenario 17.1: Paste Formula with Absolute Reference ($A$1 unchanged)

**Given** A1=10, A2=30, A3 contains formula "=$A$1+$A$2"
**When** user copies A3 and pastes to B3
**Then**
- B3 contains formula "=$A$1+$A$2" (absolute references unchanged)
- B3 displays "40" (A1+A2 = 10+30)

**Playwright Implementation**:
```javascript
test('Paste formula with absolute reference unchanged', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Set up source cells
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('10');
  await page.keyboard.press('Enter');
  await page.keyboard.type('30');
  await page.keyboard.press('Enter');

  // Create formula with absolute references
  await page.keyboard.type('=$A$1+$A$2');
  await page.keyboard.press('Enter');

  // Verify A3 shows 40
  await expect(page.locator('[data-cell="A3"]')).toHaveText('40');

  // Copy A3
  await page.locator('[data-cell="A3"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
  );

  // Paste to B3
  await page.locator('[data-cell="B3"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
  );

  // B3 should still show 40 (references didn't adjust)
  await expect(page.locator('[data-cell="B3"]')).toHaveText('40');
});
```

---

### Scenario 17.2: Paste Formula with Column-Absolute ($A1 keeps column, adjusts row)

**Given** cell A3 contains formula "=$A1"
**When** user copies A3 and pastes to B4 (1 row down, 1 column right)
**Then**
- B4 contains formula "=$A2" (column A locked, row adjusted)

**Playwright Implementation**:
```javascript
test('Paste formula with column-absolute reference', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('100');
  await page.keyboard.press('Enter');
  await page.keyboard.type('200');
  await page.keyboard.press('Enter');

  // Create formula with column-absolute reference
  await page.keyboard.type('=$A1');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-cell="A3"]')).toHaveText('100');

  // Copy A3
  await page.locator('[data-cell="A3"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
  );

  // Paste to B4
  await page.locator('[data-cell="B4"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
  );

  // B4 should reference A2 (column locked, row adjusted)
  await expect(page.locator('[data-cell="B4"]')).toHaveText('200');
});
```

---

### Scenario 17.3: Paste Formula with Row-Absolute (A$1 keeps row, adjusts column)

**Given** cell A3 contains formula "=A$1"
**When** user copies A3 and pastes to B4 (1 row down, 1 column right)
**Then**
- B4 contains formula "=B$1" (row 1 locked, column adjusted)

**Playwright Implementation**:
```javascript
test('Paste formula with row-absolute reference', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('10');
  await page.keyboard.press('Tab');
  await page.keyboard.type('20');
  await page.keyboard.press('Enter');

  await page.locator('[data-cell="A3"]').click();
  await page.keyboard.type('=A$1');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-cell="A3"]')).toHaveText('10');

  // Copy A3
  await page.locator('[data-cell="A3"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
  );

  // Paste to B4
  await page.locator('[data-cell="B4"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
  );

  // B4 should reference B1 (row locked, column adjusted)
  await expect(page.locator('[data-cell="B4"]')).toHaveText('20');
});
```

---

### Scenario 17.4: Paste Formula with Mixed References

**Given** cell A3 contains formula "=$A$1+B2"
**When** user copies A3 and pastes to B4 (1 row down, 1 column right)
**Then**
- B4 contains formula "=$A$1+C3" (absolute part unchanged, relative part adjusted)

**Playwright Implementation**:
```javascript
test('Paste formula with mixed references', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('10');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.type('20');
  await page.keyboard.press('Enter');

  await page.locator('[data-cell="A3"]').click();
  await page.keyboard.type('=$A$1+B2');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-cell="A3"]')).toHaveText('30');

  // Copy A3
  await page.locator('[data-cell="A3"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
  );

  // Set up C3 for testing
  await page.locator('[data-cell="C3"]').click();
  await page.keyboard.type('50');
  await page.keyboard.press('Enter');

  // Paste to B4
  await page.locator('[data-cell="B4"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
  );

  // B4 should show 60 (A1=10 + C3=50)
  await expect(page.locator('[data-cell="B4"]')).toHaveText('60');
});
```

---

### Scenario 17.5: Paste Multi-Cell Range to Single Cell (Auto-Expand)

**Given** user has copied range A1:A3 containing [10, 20, 30]
**When** user selects B1 (single cell) and presses Cmd+V
**Then**
- Paste automatically expands to B1:B3
- B1=10, B2=20, B3=30
- Source range determines paste size, not target selection

**Playwright Implementation**:
```javascript
test('Paste range to single cell auto-expands', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Create source range A1:A3
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('10');
  await page.keyboard.press('Enter');
  await page.keyboard.type('20');
  await page.keyboard.press('Enter');
  await page.keyboard.type('30');
  await page.keyboard.press('Enter');

  // Copy A1:A3
  await page.locator('[data-cell="A1"]').click();
  await page.locator('[data-cell="A3"]').click({ modifiers: ['Shift'] });
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
  );

  // Paste to single cell B1
  await page.locator('[data-cell="B1"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
  );

  // Verify B1:B3 contains the values
  await expect(page.locator('[data-cell="B1"]')).toHaveText('10');
  await expect(page.locator('[data-cell="B2"]')).toHaveText('20');
  await expect(page.locator('[data-cell="B3"]')).toHaveText('30');
});
```

**What This Tests**:
- Paste uses source range size, not target selection size
- Clipboard manager expands paste from anchor cell
- Standard spreadsheet behavior (Excel/Google Sheets compatible)

---

### Scenario 17.6: Paste Single Cell to Multi-Cell Selection (Fill Range)

**Given** user has copied cell A1 containing "100"
**When** user selects range B1:B3 and presses Cmd+V
**Then**
- **Option A (Fill)**: All cells B1, B2, B3 contain "100" (fill behavior)
- **Option B (Single)**: Only B1 contains "100", B2:B3 unchanged (anchor-only behavior)

**Playwright Implementation (Option A - Fill)**:
```javascript
test('Paste single cell to range fills all cells', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Create source cell
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('100');
  await page.keyboard.press('Enter');

  // Copy A1
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
  );

  // Select range B1:B3
  await page.locator('[data-cell="B1"]').click();
  await page.locator('[data-cell="B3"]').click({ modifiers: ['Shift'] });

  // Paste
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
  );

  // All cells should contain "100"
  await expect(page.locator('[data-cell="B1"]')).toHaveText('100');
  await expect(page.locator('[data-cell="B2"]')).toHaveText('100');
  await expect(page.locator('[data-cell="B3"]')).toHaveText('100');
});
```

**What This Tests**:
- Behavior when target selection is larger than source
- Design decision: fill vs. anchor-only paste
- Excel behavior: fills the range; Google Sheets: anchor-only

**Implementation Note**: Current implementation likely uses anchor-only (Option B). If you want Excel-style fill behavior, this requires enhancement to `ClipboardManager.getPasteUpdates()`.

---

### Scenario 17.7: Paste Range to Larger Selection (Tile or Truncate)

**Given** user has copied range A1:A2 containing [10, 20]
**When** user selects range B1:B5 (larger than source) and presses Cmd+V
**Then**
- **Option A (Tile)**: Pattern repeats - B1=10, B2=20, B3=10, B4=20, B5=10
- **Option B (Single Copy)**: Only B1:B2 filled, B3:B5 unchanged
- **Option C (Error)**: Warning "Cannot paste: selection size mismatch"

**Playwright Implementation (Option B - Single Copy)**:
```javascript
test('Paste range to larger selection pastes once at anchor', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Create source range
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('10');
  await page.keyboard.press('Enter');
  await page.keyboard.type('20');
  await page.keyboard.press('Enter');

  // Copy A1:A2
  await page.locator('[data-cell="A1"]').click();
  await page.locator('[data-cell="A2"]').click({ modifiers: ['Shift'] });
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
  );

  // Select larger range B1:B5
  await page.locator('[data-cell="B1"]').click();
  await page.locator('[data-cell="B5"]').click({ modifiers: ['Shift'] });

  // Paste
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
  );

  // Only B1:B2 should be filled
  await expect(page.locator('[data-cell="B1"]')).toHaveText('10');
  await expect(page.locator('[data-cell="B2"]')).toHaveText('20');
  await expect(page.locator('[data-cell="B3"]')).toHaveText('');
  await expect(page.locator('[data-cell="B4"]')).toHaveText('');
  await expect(page.locator('[data-cell="B5"]')).toHaveText('');
});
```

**What This Tests**:
- Behavior when target is larger than source
- Current implementation: likely ignores target selection size
- Excel behavior: requires exact size match or shows error

---

### Scenario 17.8: Paste Range to Smaller Selection (Error or Expand)

**Given** user has copied range A1:A5 containing [10, 20, 30, 40, 50]
**When** user selects range B1:B3 (smaller than source) and presses Cmd+V
**Then**
- **Option A (Expand)**: Paste ignores target size, fills B1:B5
- **Option B (Truncate)**: Only B1:B3 filled with first 3 values
- **Option C (Error)**: Warning "Cannot paste: selection too small"

**Playwright Implementation (Option A - Expand)**:
```javascript
test('Paste range to smaller selection expands to source size', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Create source range A1:A5
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('10');
  await page.keyboard.press('Enter');
  await page.keyboard.type('20');
  await page.keyboard.press('Enter');
  await page.keyboard.type('30');
  await page.keyboard.press('Enter');
  await page.keyboard.type('40');
  await page.keyboard.press('Enter');
  await page.keyboard.type('50');
  await page.keyboard.press('Enter');

  // Copy A1:A5
  await page.locator('[data-cell="A1"]').click();
  await page.locator('[data-cell="A5"]').click({ modifiers: ['Shift'] });
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
  );

  // Select smaller range B1:B3
  await page.locator('[data-cell="B1"]').click();
  await page.locator('[data-cell="B3"]').click({ modifiers: ['Shift'] });

  // Paste
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
  );

  // All 5 values should paste (expands beyond selection)
  await expect(page.locator('[data-cell="B1"]')).toHaveText('10');
  await expect(page.locator('[data-cell="B2"]')).toHaveText('20');
  await expect(page.locator('[data-cell="B3"]')).toHaveText('30');
  await expect(page.locator('[data-cell="B4"]')).toHaveText('40');
  await expect(page.locator('[data-cell="B5"]')).toHaveText('50');
});
```

**What This Tests**:
- Behavior when target is smaller than source
- Standard behavior: paste ignores target selection size
- Excel/Google Sheets: always use source range dimensions

---

### Scenario 17.9: Paste 2D Range to Different Shape Selection

**Given** user has copied range A1:A3 (3 rows × 1 column) containing [10, 20, 30]
**When** user selects range B1:D1 (1 row × 3 columns) and presses Cmd+V
**Then**
- **Option A (Shape Mismatch)**: Paste uses source shape, fills B1:B3 vertically
- **Option B (Error)**: Warning "Cannot paste: shape mismatch"

**Playwright Implementation (Option A)**:
```javascript
test('Paste range ignores target selection shape', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Create vertical source A1:A3
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('10');
  await page.keyboard.press('Enter');
  await page.keyboard.type('20');
  await page.keyboard.press('Enter');
  await page.keyboard.type('30');
  await page.keyboard.press('Enter');

  // Copy A1:A3
  await page.locator('[data-cell="A1"]').click();
  await page.locator('[data-cell="A3"]').click({ modifiers: ['Shift'] });
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
  );

  // Select horizontal range B1:D1
  await page.locator('[data-cell="B1"]').click();
  await page.locator('[data-cell="D1"]').click({ modifiers: ['Shift'] });

  // Paste
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
  );

  // Should paste vertically at B1:B3 (ignoring horizontal selection)
  await expect(page.locator('[data-cell="B1"]')).toHaveText('10');
  await expect(page.locator('[data-cell="B2"]')).toHaveText('20');
  await expect(page.locator('[data-cell="B3"]')).toHaveText('30');
  await expect(page.locator('[data-cell="C1"]')).toHaveText('');
  await expect(page.locator('[data-cell="D1"]')).toHaveText('');
});
```

**What This Tests**:
- Paste always uses source range shape
- Target selection shape is ignored
- Standard spreadsheet behavior

---

### Scenario 17.10: Paste Range with Formulas to Multi-Cell (Reference Adjustment for Each Cell)

**Given** user has copied range A1:A2 containing ["=B1", "=B2"]
**When** user selects C1 and pastes
**Then**
- C1 contains "=D1" (relative reference adjusted)
- C2 contains "=D2" (each formula adjusted independently)

**Playwright Implementation**:
```javascript
test('Paste range of formulas adjusts each reference independently', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Set up reference cells
  await page.locator('[data-cell="B1"]').click();
  await page.keyboard.type('100');
  await page.keyboard.press('Enter');
  await page.keyboard.type('200');
  await page.keyboard.press('Enter');

  // Create formula range A1:A2
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('=B1');
  await page.keyboard.press('Enter');
  await page.keyboard.type('=B2');
  await page.keyboard.press('Enter');

  // Verify formulas work
  await expect(page.locator('[data-cell="A1"]')).toHaveText('100');
  await expect(page.locator('[data-cell="A2"]')).toHaveText('200');

  // Copy A1:A2
  await page.locator('[data-cell="A1"]').click();
  await page.locator('[data-cell="A2"]').click({ modifiers: ['Shift'] });
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
  );

  // Set up new reference cells
  await page.locator('[data-cell="D1"]').click();
  await page.keyboard.type('10');
  await page.keyboard.press('Enter');
  await page.keyboard.type('20');
  await page.keyboard.press('Enter');

  // Paste to C1
  await page.locator('[data-cell="C1"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
  );

  // Each formula should reference D column
  await expect(page.locator('[data-cell="C1"]')).toHaveText('10');
  await expect(page.locator('[data-cell="C2"]')).toHaveText('20');
});
```

**What This Tests**:
- Multi-cell paste with formulas
- Independent reference adjustment for each pasted cell
- FormulaAdjuster handles each cell in the range

---

### Scenario 18: Paste Styles Along with Values

**Given** user has copied cell B2 with bold text and background color
**When** user pastes to D5
**Then**
- D5 gets both the value AND the formatting
- Bold and background color applied to D5

**Playwright Implementation**:
```javascript
test('Paste copies both value and style', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Enter value in B2
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('Styled');
  await page.keyboard.press('Enter');

  // Apply bold formatting to B2
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+B' : 'Control+B'
  );

  // Copy B2
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
  );

  // Paste to D5
  await page.locator('[data-cell="D5"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
  );

  // Check D5 has the value
  await expect(page.locator('[data-cell="D5"]')).toHaveText('Styled');

  // Check D5 has the bold styling
  await expect(page.locator('[data-cell="D5"]')).toHaveCSS('font-weight', '700');
});
```

**What This Tests**:
- StyleManager integration with clipboard
- Style preservation during copy/paste
- UpdateCellsCommand handling both value and style

---

## Cut Operation Scenarios

### Scenario 19: Cut and Paste Moves Data

**Given** user has selected cell B2 containing "Move Me"
**When** user presses Cmd+X (cut), then selects D5 and presses Cmd+V
**Then**
- D5 now contains "Move Me"
- B2 is now empty (data moved, not copied)
- Cut operation cleared after paste

**Playwright Implementation**:
```javascript
test('Cut and paste moves data', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Enter data in B2
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('Move Me');
  await page.keyboard.press('Enter');

  // Cut B2
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+X' : 'Control+X'
  );

  // Paste to D5
  await page.locator('[data-cell="D5"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
  );

  // D5 should have the value
  await expect(page.locator('[data-cell="D5"]')).toHaveText('Move Me');

  // B2 should be empty
  await expect(page.locator('[data-cell="B2"]')).toHaveText('');
});
```

**What This Tests**:
- Cut command (Cmd+X)
- ClipboardManager.isCut flag
- Source cell clearing after paste

---

### Scenario 20: Cut Shows Different Visual Feedback

**Given** user selects range B2:C3
**When** user presses Cmd+X
**Then**
- Cells B2:C3 highlighted with "cut" indicator (different from copy, e.g., dashed red border)
- Indicates cells will be cleared after paste

**Playwright Implementation**:
```javascript
test('Cut shows cut visual feedback', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Fill range B2:C3
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('A');
  await page.keyboard.press('Tab');
  await page.keyboard.type('B');
  await page.keyboard.press('Enter');
  await page.keyboard.type('C');
  await page.keyboard.press('Tab');
  await page.keyboard.type('D');
  await page.keyboard.press('Enter');

  // Select and cut range
  await page.locator('[data-cell="B2"]').click();
  await page.locator('[data-cell="C3"]').click({ modifiers: ['Shift'] });
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+X' : 'Control+X'
  );

  // Check for cut-specific class or styling
  await expect(page.locator('[data-cell="B2"]')).toHaveClass(/copy-source/);
  // If you implement a distinct cut visual, check for that:
  // await expect(page.locator('[data-cell="B2"]')).toHaveClass(/cut-source/);
});
```

**What This Tests**:
- Cut-specific visual feedback (if implemented differently from copy)
- ClipboardManager.isCut flag

**Note**: Current implementation uses same `copy-source` class for both copy and cut. Consider adding `cut-source` class for better UX.

---

### Scenario 21: Cut Range and Paste Moves Entire Range

**Given** user has cut range B2:C3 containing [A, B, C, D]
**When** user pastes to E5
**Then**
- Range E5:F6 contains [A, B, C, D]
- Range B2:C3 is now empty
- All four source cells cleared

**Playwright Implementation**:
```javascript
test('Cut range and paste moves entire range', async ({ page }) => {
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

  // Cut range
  await page.locator('[data-cell="B2"]').click();
  await page.locator('[data-cell="C3"]').click({ modifiers: ['Shift'] });
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+X' : 'Control+X'
  );

  // Paste to E5
  await page.locator('[data-cell="E5"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
  );

  // Check destination has values
  await expect(page.locator('[data-cell="E5"]')).toHaveText('A');
  await expect(page.locator('[data-cell="F5"]')).toHaveText('B');
  await expect(page.locator('[data-cell="E6"]')).toHaveText('C');
  await expect(page.locator('[data-cell="F6"]')).toHaveText('D');

  // Check source is empty
  await expect(page.locator('[data-cell="B2"]')).toHaveText('');
  await expect(page.locator('[data-cell="C2"]')).toHaveText('');
  await expect(page.locator('[data-cell="B3"]')).toHaveText('');
  await expect(page.locator('[data-cell="C3"]')).toHaveText('');
});
```

**What This Tests**:
- Range cut/paste
- Bulk cell clearing
- Command pattern for undo/redo support

---

## Edge Cases and Error Scenarios

### Scenario 22: Paste Beyond Grid Boundary (Right Edge)

**Given** user has copied range B2:D2 (3 cells wide)
**When** user pastes to cell Y1 (only 2 columns from right edge Z)
**Then**
- Only cells Y1:Z1 are pasted (truncated to fit grid)
- OR warning message shown "Cannot paste: exceeds grid boundary"

**Playwright Implementation**:
```javascript
test('Paste truncates at grid boundary', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Create 3-cell wide source
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('A');
  await page.keyboard.press('Tab');
  await page.keyboard.type('B');
  await page.keyboard.press('Tab');
  await page.keyboard.type('C');
  await page.keyboard.press('Enter');

  // Copy B2:D2
  await page.locator('[data-cell="B2"]').click();
  await page.locator('[data-cell="D2"]').click({ modifiers: ['Shift'] });
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
  );

  // Try to paste at Y1 (only 2 columns to edge)
  await page.locator('[data-cell="Y1"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
  );

  // Check what actually pasted
  await expect(page.locator('[data-cell="Y1"]')).toHaveText('A');
  await expect(page.locator('[data-cell="Z1"]')).toHaveText('B');

  // Third cell should not exist beyond Z
});
```

**What This Tests**:
- Bounds checking in ClipboardManager.getPasteUpdates()
- Graceful handling of out-of-bounds paste

**Implementation Note**: Current code at `ClipboardManager.js:89` has basic bounds check. May need improvement.

---

### Scenario 23: Paste with No Clipboard Data

**Given** user has not copied anything yet
**When** user presses Cmd+V
**Then**
- Nothing happens (no error thrown)
- OR message shown "No clipboard data to paste"

**Playwright Implementation**:
```javascript
test('Paste with empty clipboard does nothing', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
  );

  // Cell should remain empty
  await expect(page.locator('[data-cell="B2"]')).toHaveText('');

  // No error message should appear (or check for specific message)
});
```

**What This Tests**:
- Null clipboard handling
- ClipboardManager.paste() early return

---

### Scenario 24: Copy Updates System Clipboard for External Use

**Given** user has selected cell B2 containing "Export Me"
**When** user presses Cmd+C
**Then**
- Data is written to system clipboard
- User can paste into external application (e.g., TextEdit, Excel)

**Playwright Implementation**:
```javascript
test('Copy writes to system clipboard', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('Export Me');
  await page.keyboard.press('Enter');

  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
  );

  // Read system clipboard (requires clipboard permissions in test context)
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toBe('Export Me');
});
```

**What This Tests**:
- ClipboardManager._writeToSystemClipboard()
- Integration with browser Clipboard API

**Note**: Playwright may need clipboard permissions granted via browser context options:
```javascript
const context = await browser.newContext({
  permissions: ['clipboard-read', 'clipboard-write']
});
```

---

## Multi-Range Copy Scenarios

### Scenario 25: Copy Only Copies Primary Range

**Given** user has multi-selected ranges B2:C2 and E5:E6 (two disconnected ranges)
**When** user presses Cmd+C
**Then**
- Only the most recent range (E5:E6) is copied
- OR warning shown "Cannot copy multiple disconnected ranges"

**Playwright Implementation**:
```javascript
test('Copy with multi-range selection copies last range only', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Create data in two ranges
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('A');
  await page.keyboard.press('Tab');
  await page.keyboard.type('B');
  await page.keyboard.press('Enter');

  await page.locator('[data-cell="E5"]').click();
  await page.keyboard.type('X');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Y');
  await page.keyboard.press('Enter');

  // Multi-select ranges
  await page.locator('[data-cell="B2"]').click();
  await page.locator('[data-cell="C2"]').click({ modifiers: ['Shift'] });
  await page.locator('[data-cell="E5"]').click({
    modifiers: process.platform === 'darwin' ? ['Meta'] : ['Control']
  });
  await page.locator('[data-cell="E6"]').click({ modifiers: ['Shift'] });

  // Copy
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
  );

  // Paste somewhere
  await page.locator('[data-cell="G1"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
  );

  // Check that only last range (E5:E6) was pasted
  await expect(page.locator('[data-cell="G1"]')).toHaveText('X');
  await expect(page.locator('[data-cell="G2"]')).toHaveText('Y');
});
```

**What This Tests**:
- ClipboardManager.copy() with multiple ranges
- Current implementation: `const primaryRange = ranges[ranges.length - 1];` (line 33)

---

## Undo/Redo Integration Scenarios

### Scenario 26: Paste Can Be Undone

**Given** user has pasted range B2:C3 to E5
**When** user presses Cmd+Z (undo)
**Then**
- Cells E5:F6 revert to previous values (or empty)
- Redo stack contains the paste operation

**Playwright Implementation**:
```javascript
test('Paste operation can be undone', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Create and copy source
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('Test');
  await page.keyboard.press('Enter');
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
  );

  // Paste to E5
  await page.locator('[data-cell="E5"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
  );
  await expect(page.locator('[data-cell="E5"]')).toHaveText('Test');

  // Undo
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
  );

  // E5 should be empty again
  await expect(page.locator('[data-cell="E5"]')).toHaveText('');
});
```

**What This Tests**:
- HistoryManager integration
- UpdateCellsCommand undo() method
- Redo stack management

---

### Scenario 27: Cut and Paste Creates Single Undoable Action

**Given** user cuts B2 and pastes to D5
**When** user presses Cmd+Z once
**Then**
- Both the paste (D5) and the source clear (B2) are undone together
- B2 is restored, D5 is cleared

**Playwright Implementation**:
```javascript
test('Cut and paste is a single undoable action', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Create source data
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('Move Me');
  await page.keyboard.press('Enter');

  // Cut and paste
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+X' : 'Control+X'
  );
  await page.locator('[data-cell="D5"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
  );

  // Verify moved
  await expect(page.locator('[data-cell="B2"]')).toHaveText('');
  await expect(page.locator('[data-cell="D5"]')).toHaveText('Move Me');

  // Single undo
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
  );

  // Both should revert
  await expect(page.locator('[data-cell="B2"]')).toHaveText('Move Me');
  await expect(page.locator('[data-cell="D5"]')).toHaveText('');
});
```

**What This Tests**:
- Composite command pattern
- Cut operation creates command that updates both source and destination

**Implementation Note**: May require a special CutPasteCommand that handles both operations atomically.

---

## Summary

These 33 scenarios provide comprehensive coverage of:

**Selection**:
- Single cell, range, multi-range
- Header selection (row/column)
- Keyboard extension (Shift+Arrow, Cmd+Shift+Arrow)

**Copy**:
- Single cell and range copy
- Visual feedback
- System clipboard integration
- Multi-range handling

**Paste**:
- Value paste with relative positioning
- Formula paste with reference adjustment (absolute, relative, mixed)
- **Range size mismatches** (source vs. target selection):
  - Multi-cell to single cell (auto-expand)
  - Single cell to multi-cell (fill or anchor-only)
  - Range to larger selection (tile or truncate)
  - Range to smaller selection (expand or error)
  - Different shape selections (vertical vs. horizontal)
- Range of formulas with independent reference adjustment
- Style paste (with formatting system)
- Bounds checking

**Cut**:
- Move operation (clear source after paste)
- Cut-specific visual feedback

**Edge Cases**:
- Boundary conditions
- Empty clipboard
- External clipboard integration

**Undo/Redo**:
- Paste undo
- Cut/paste as atomic operation

---

## Testing Strategy

### Priority Levels

**High Priority** (Core Functionality):
- Scenarios 1-6 (Basic selection)
- Scenarios 12-16 (Copy and paste basics)
- Scenario 17.5 (Multi-cell to single cell paste - auto-expand)
- Scenario 19 (Cut and paste)

**Medium Priority** (Extended Features):
- Scenarios 7-11 (Keyboard selection)
- Scenarios 17-17.4 (Formula paste with absolute/relative references)
- Scenarios 17.6-17.10 (Range size mismatches and formula ranges)
- Scenario 18 (Style paste)
- Scenarios 20-21 (Cut operations)

**Low Priority** (Edge Cases):
- Scenarios 22-25 (Boundary and error handling)
- Scenarios 26-27 (Undo integration)

### Recommended Test Organization

Group tests in Playwright spec files:
- `selection.spec.js` - Scenarios 1-11
- `clipboard-copy.spec.js` - Scenarios 12-14
- `clipboard-paste.spec.js` - Scenarios 15-18
- `clipboard-cut.spec.js` - Scenarios 19-21
- `clipboard-edge-cases.spec.js` - Scenarios 22-25
- `clipboard-history.spec.js` - Scenarios 26-27

---

## Related Files

- **SelectionManager**: `js/ui/SelectionManager.js`
- **ClipboardManager**: `js/ui/ClipboardManager.js`
- **UpdateCellsCommand**: `js/history/commands/UpdateCellsCommand.js`
- **HistoryManager**: `js/history/HistoryManager.js`
- **Mode Handlers**: Copy/paste/cut handled in `NavigationMode.js` base class
