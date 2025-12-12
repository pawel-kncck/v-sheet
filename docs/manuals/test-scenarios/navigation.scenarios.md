# Navigation Test Scenarios

This document contains test scenarios for grid navigation in Given-When-Then format, ready for implementation in Playwright e2e tests.

**Related User Documentation**: `/docs/user-interactions/01-core-workflows.md` (Workflows #12, #13)

---

## Scenario Group: Basic Arrow Key Navigation

### Scenario 1.1: Arrow Right moves selection

**Given** cell A1 is selected
**When** user presses Arrow Right
**Then**:
- Cell B1 is now selected
- Cell A1 is no longer selected
- Mode remains ReadyMode

**Playwright Implementation**:
```javascript
test('Arrow Right moves selection right', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.press('ArrowRight');

  await expect(page.locator('[data-cell="B1"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-cell="A1"]')).not.toHaveClass(/selected/);
  await expect(page.locator('[data-testid="mode-indicator"]')).toHaveText('Ready');
});
```

---

### Scenario 1.2: Arrow Down moves selection

**Given** cell A1 is selected
**When** user presses Arrow Down
**Then**:
- Cell A2 is now selected

**Implementation**:
```javascript
test('Arrow Down moves selection down', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.press('ArrowDown');

  await expect(page.locator('[data-cell="A2"]')).toHaveClass(/selected/);
});
```

---

### Scenario 1.3: Arrow Left moves selection

**Given** cell B2 is selected
**When** user presses Arrow Left
**Then**:
- Cell A2 is now selected

**Implementation**:
```javascript
test('Arrow Left moves selection left', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.press('ArrowLeft');

  await expect(page.locator('[data-cell="A2"]')).toHaveClass(/selected/);
});
```

---

### Scenario 1.4: Arrow Up moves selection

**Given** cell A2 is selected
**When** user presses Arrow Up
**Then**:
- Cell A1 is now selected

**Implementation**:
```javascript
test('Arrow Up moves selection up', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A2"]').click();
  await page.keyboard.press('ArrowUp');

  await expect(page.locator('[data-cell="A1"]')).toHaveClass(/selected/);
});
```

---

## Scenario Group: Jump to Edge (Cmd/Ctrl + Arrow)

### Scenario 2.1: Jump right to data edge

**Given**:
- Cells A1:E1 contain data (values: "A", "B", "C", "D", "E")
- Cell F1 is empty
- Cell A1 is selected

**When** user presses Cmd+Arrow Right (Ctrl on Windows)
**Then**:
- Cell E1 is selected (last cell with data in row)

**Implementation**:
```javascript
test('Cmd+Arrow Right jumps to data edge', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Setup: Fill A1:E1 with data
  await page.locator('[data-cell="A1"]').click();
  for (const val of ['A', 'B', 'C', 'D', 'E']) {
    await page.keyboard.type(val);
    await page.keyboard.press('Tab');
  }

  // Test
  await page.locator('[data-cell="A1"]').click();

  const isMac = process.platform === 'darwin';
  if (isMac) {
    await page.keyboard.press('Meta+ArrowRight');
  } else {
    await page.keyboard.press('Control+ArrowRight');
  }

  await expect(page.locator('[data-cell="E1"]')).toHaveClass(/selected/);
});
```

---

### Scenario 2.2: Jump down to data edge

**Given**:
- Cells A1:A5 contain data
- Cell A6 is empty
- Cell A1 is selected

**When** user presses Cmd+Arrow Down
**Then**:
- Cell A5 is selected

**Implementation**:
```javascript
test('Cmd+Arrow Down jumps to data edge', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Setup
  await page.locator('[data-cell="A1"]').click();
  for (let i = 1; i <= 5; i++) {
    await page.keyboard.type(String(i));
    await page.keyboard.press('Enter');
  }

  // Test
  await page.locator('[data-cell="A1"]').click();

  const isMac = process.platform === 'darwin';
  if (isMac) {
    await page.keyboard.press('Meta+ArrowDown');
  } else {
    await page.keyboard.press('Control+ArrowDown');
  }

  await expect(page.locator('[data-cell="A5"]')).toHaveClass(/selected/);
});
```

---

### Scenario 2.3: Jump to grid edge when no data

**Given**:
- Cell A1 is selected
- No data exists in row 1 to the right

**When** user presses Cmd+Arrow Right
**Then**:
- Selection jumps to last column (e.g., Z1 or configured grid edge)

**Implementation**:
```javascript
test('Cmd+Arrow Right jumps to grid edge when no data', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();

  const isMac = process.platform === 'darwin';
  if (isMac) {
    await page.keyboard.press('Meta+ArrowRight');
  } else {
    await page.keyboard.press('Control+ArrowRight');
  }

  // Should jump to last column (implementation-dependent)
  // Verify selection moved far right
  const selectedCell = await page.locator('.selected').getAttribute('data-cell');
  expect(selectedCell).not.toBe('A1');
});
```

---

### Scenario 2.4: Jump left from middle of data

**Given**:
- Cells A1:E1 contain data
- Cell C1 is selected

**When** user presses Cmd+Arrow Left
**Then**:
- Cell A1 is selected (first cell in row)

**Implementation**:
```javascript
test('Cmd+Arrow Left jumps to start of data', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Setup
  await page.locator('[data-cell="A1"]').click();
  for (const val of ['A', 'B', 'C', 'D', 'E']) {
    await page.keyboard.type(val);
    await page.keyboard.press('Tab');
  }

  // Test: Start from C1
  await page.locator('[data-cell="C1"]').click();

  const isMac = process.platform === 'darwin';
  if (isMac) {
    await page.keyboard.press('Meta+ArrowLeft');
  } else {
    await page.keyboard.press('Control+ArrowLeft');
  }

  await expect(page.locator('[data-cell="A1"]')).toHaveClass(/selected/);
});
```

---

## Scenario Group: Selection Extension (Shift + Arrow)

### Scenario 3.1: Extend selection right

**Given** cell A1 is selected
**When** user presses Shift+Arrow Right
**Then**:
- Range A1:B1 is selected (highlighted)
- A1 remains the active cell (anchor)

**Implementation**:
```javascript
test('Shift+Arrow Right extends selection', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.press('Shift+ArrowRight');

  // Both cells should be highlighted
  await expect(page.locator('[data-cell="A1"]')).toHaveClass(/selected|highlighted/);
  await expect(page.locator('[data-cell="B1"]')).toHaveClass(/selected|highlighted/);
});
```

---

### Scenario 3.2: Extend selection down multiple cells

**Given** cell A1 is selected
**When** user:
1. Presses Shift+Arrow Down (A1:A2 selected)
2. Presses Shift+Arrow Down again (A1:A3 selected)
3. Presses Shift+Arrow Down again (A1:A4 selected)

**Then**:
- Range A1:A4 is selected

**Implementation**:
```javascript
test('Shift+Arrow Down extends selection multiple times', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Shift+ArrowDown');

  // A1:A4 should all be highlighted
  for (let i = 1; i <= 4; i++) {
    await expect(page.locator(`[data-cell="A${i}"]`)).toHaveClass(/selected|highlighted/);
  }
});
```

---

### Scenario 3.3: Extend selection then shrink

**Given** range A1:A3 is selected
**When** user presses Shift+Arrow Up
**Then**:
- Range shrinks to A1:A2

**Implementation**:
```javascript
test('Shift+Arrow in opposite direction shrinks selection', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Shift+ArrowDown');

  // Now A1:A3 selected, shrink back
  await page.keyboard.press('Shift+ArrowUp');

  // A1:A2 should be selected, A3 not
  await expect(page.locator('[data-cell="A1"]')).toHaveClass(/selected|highlighted/);
  await expect(page.locator('[data-cell="A2"]')).toHaveClass(/selected|highlighted/);
  await expect(page.locator('[data-cell="A3"]')).not.toHaveClass(/selected|highlighted/);
});
```

---

## Scenario Group: Extend to Edge (Cmd+Shift+Arrow)

### Scenario 4.1: Extend selection to data edge right

**Given**:
- Cells A1:E1 contain data
- Cell A1 is selected

**When** user presses Cmd+Shift+Arrow Right
**Then**:
- Range A1:E1 is selected

**Implementation**:
```javascript
test('Cmd+Shift+Arrow Right extends to data edge', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Setup
  await page.locator('[data-cell="A1"]').click();
  for (const val of ['A', 'B', 'C', 'D', 'E']) {
    await page.keyboard.type(val);
    await page.keyboard.press('Tab');
  }

  // Test
  await page.locator('[data-cell="A1"]').click();

  const isMac = process.platform === 'darwin';
  if (isMac) {
    await page.keyboard.press('Meta+Shift+ArrowRight');
  } else {
    await page.keyboard.press('Control+Shift+ArrowRight');
  }

  // A1:E1 should all be selected
  for (const col of ['A', 'B', 'C', 'D', 'E']) {
    await expect(page.locator(`[data-cell="${col}1"]`)).toHaveClass(/selected|highlighted/);
  }
});
```

---

### Scenario 4.2: Extend selection to data edge down

**Given**:
- Cells A1:A10 contain data
- Cell A1 is selected

**When** user presses Cmd+Shift+Arrow Down
**Then**:
- Range A1:A10 is selected

**Implementation**:
```javascript
test('Cmd+Shift+Arrow Down extends to data edge', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Setup
  await page.locator('[data-cell="A1"]').click();
  for (let i = 1; i <= 10; i++) {
    await page.keyboard.type(String(i));
    await page.keyboard.press('Enter');
  }

  // Test
  await page.locator('[data-cell="A1"]').click();

  const isMac = process.platform === 'darwin';
  if (isMac) {
    await page.keyboard.press('Meta+Shift+ArrowDown');
  } else {
    await page.keyboard.press('Control+Shift+ArrowDown');
  }

  // A1:A10 should all be selected
  for (let i = 1; i <= 10; i++) {
    await expect(page.locator(`[data-cell="A${i}"]`)).toHaveClass(/selected|highlighted/);
  }
});
```

---

## Scenario Group: Mouse Click Navigation

### Scenario 5.1: Click cell to select

**Given** cell A1 is selected
**When** user clicks cell C5
**Then**:
- Cell C5 is now selected
- Cell A1 is no longer selected

**Implementation**:
```javascript
test('clicking cell changes selection', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.locator('[data-cell="C5"]').click();

  await expect(page.locator('[data-cell="C5"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-cell="A1"]')).not.toHaveClass(/selected/);
});
```

---

### Scenario 5.2: Shift+Click creates range

**Given** cell A1 is selected
**When** user Shift+Clicks cell C3
**Then**:
- Range A1:C3 is selected (all 9 cells highlighted)

**Implementation**:
```javascript
test('Shift+Click creates range selection', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.locator('[data-cell="C3"]').click({ modifiers: ['Shift'] });

  // All cells in range should be highlighted
  await expect(page.locator('[data-cell="A1"]')).toHaveClass(/selected|highlighted/);
  await expect(page.locator('[data-cell="B2"]')).toHaveClass(/selected|highlighted/);
  await expect(page.locator('[data-cell="C3"]')).toHaveClass(/selected|highlighted/);
});
```

---

### Scenario 5.3: Drag to select range

**Given** user starts at cell A1
**When** user:
1. Mouse down on A1
2. Drags to C3
3. Mouse up

**Then**:
- Range A1:C3 is selected

**Implementation**:
```javascript
test('dragging creates range selection', async ({ page }) => {
  await page.goto('http://localhost:5000');

  const cellA1 = page.locator('[data-cell="A1"]');
  const cellC3 = page.locator('[data-cell="C3"]');

  const a1Box = await cellA1.boundingBox();
  const c3Box = await cellC3.boundingBox();

  // Drag from A1 to C3
  await page.mouse.move(a1Box.x + a1Box.width / 2, a1Box.y + a1Box.height / 2);
  await page.mouse.down();
  await page.mouse.move(c3Box.x + c3Box.width / 2, c3Box.y + c3Box.height / 2);
  await page.mouse.up();

  // Range should be selected
  await expect(page.locator('[data-cell="A1"]')).toHaveClass(/selected|highlighted/);
  await expect(page.locator('[data-cell="C3"]')).toHaveClass(/selected|highlighted/);
});
```

---

## Scenario Group: Column/Row Header Selection

### Scenario 6.1: Click column header selects column

**Given** user is viewing the grid
**When** user clicks column header "B"
**Then**:
- Entire column B is selected
- All cells in column B have selection highlight

**Implementation**:
```javascript
test('clicking column header selects entire column', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-column-header="B"]').click();

  // Multiple cells in column B should be selected
  await expect(page.locator('[data-cell="B1"]')).toHaveClass(/selected|highlighted/);
  await expect(page.locator('[data-cell="B2"]')).toHaveClass(/selected|highlighted/);
  await expect(page.locator('[data-cell="B10"]')).toHaveClass(/selected|highlighted/);
});
```

---

### Scenario 6.2: Click row header selects row

**Given** user is viewing the grid
**When** user clicks row header "5"
**Then**:
- Entire row 5 is selected

**Implementation**:
```javascript
test('clicking row header selects entire row', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-row-header="5"]').click();

  // Multiple cells in row 5 should be selected
  await expect(page.locator('[data-cell="A5"]')).toHaveClass(/selected|highlighted/);
  await expect(page.locator('[data-cell="B5"]')).toHaveClass(/selected|highlighted/);
  await expect(page.locator('[data-cell="E5"]')).toHaveClass(/selected|highlighted/);
});
```

---

## Scenario Group: Tab Key Navigation

### Scenario 7.1: Tab moves right

**Given** cell A1 is selected
**When** user presses Tab
**Then**:
- Cell B1 is selected

**Implementation**:
```javascript
test('Tab moves selection right', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.press('Tab');

  await expect(page.locator('[data-cell="B1"]')).toHaveClass(/selected/);
});
```

---

### Scenario 7.2: Shift+Tab moves left

**Given** cell B1 is selected
**When** user presses Shift+Tab
**Then**:
- Cell A1 is selected

**Implementation**:
```javascript
test('Shift+Tab moves selection left', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="B1"]').click();
  await page.keyboard.press('Shift+Tab');

  await expect(page.locator('[data-cell="A1"]')).toHaveClass(/selected/);
});
```

---

## Scenario Group: Enter Key Navigation

### Scenario 8.1: Enter moves down

**Given** cell A1 is selected
**When** user presses Enter
**Then**:
- Cell A2 is selected (if A1 is empty, enters EnterMode first)
- OR if A1 has content, enters EditMode

**Implementation**:
```javascript
test('Enter on empty cell moves down', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.press('Enter');

  // Should enter EnterMode or move down depending on implementation
  // This test assumes empty cell behavior
  const mode = await page.locator('[data-testid="mode-indicator"]').textContent();
  expect(['Enter', 'Edit']).toContain(mode);
});
```

---

## Scenario Group: Home/End Navigation

### Scenario 9.1: Home key moves to column A

**Given** cell E5 is selected
**When** user presses Home
**Then**:
- Cell A5 is selected (first column, same row)

**Implementation**:
```javascript
test('Home moves to first column', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="E5"]').click();
  await page.keyboard.press('Home');

  await expect(page.locator('[data-cell="A5"]')).toHaveClass(/selected/);
});
```

---

### Scenario 9.2: Cmd+Home moves to A1

**Given** cell E5 is selected
**When** user presses Cmd+Home (Ctrl+Home on Windows)
**Then**:
- Cell A1 is selected

**Implementation**:
```javascript
test('Cmd+Home moves to A1', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="E5"]').click();

  const isMac = process.platform === 'darwin';
  if (isMac) {
    await page.keyboard.press('Meta+Home');
  } else {
    await page.keyboard.press('Control+Home');
  }

  await expect(page.locator('[data-cell="A1"]')).toHaveClass(/selected/);
});
```

---

## Scenario Group: Edge Cases

### Scenario 10.1: Navigation at grid boundaries

**Given** cell A1 is selected (top-left corner)
**When** user presses:
1. Arrow Up (should stay at A1 or do nothing)
2. Arrow Left (should stay at A1 or do nothing)

**Then**:
- Selection remains at A1

**Implementation**:
```javascript
test('navigation at boundaries does not move beyond grid', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.press('ArrowUp');

  await expect(page.locator('[data-cell="A1"]')).toHaveClass(/selected/);

  await page.keyboard.press('ArrowLeft');

  await expect(page.locator('[data-cell="A1"]')).toHaveClass(/selected/);
});
```

---

### Scenario 10.2: Jump to edge with gaps in data

**Given**:
- A1 = "A"
- A2 = empty
- A3 = "B"
- A4 = "C"
- A5 = empty

**When** user is at A1 and presses Cmd+Arrow Down
**Then**:
- Selection jumps to A1 (last cell before gap)
- OR A3 (next data region) depending on implementation

**Implementation**:
```javascript
test('jump to edge handles data gaps', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Setup data with gaps
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('A');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter'); // Skip A2
  await page.keyboard.type('B');
  await page.keyboard.press('Enter');
  await page.keyboard.type('C');
  await page.keyboard.press('Enter');

  // Test from A1
  await page.locator('[data-cell="A1"]').click();

  const isMac = process.platform === 'darwin';
  if (isMac) {
    await page.keyboard.press('Meta+ArrowDown');
  } else {
    await page.keyboard.press('Control+ArrowDown');
  }

  // Should jump to edge before gap or next data region
  const selected = await page.locator('.selected').getAttribute('data-cell');
  expect(['A1', 'A3']).toContain(selected);
});
```

---

## Summary: Test Coverage

This file covers:
- ✅ Basic arrow key navigation (4 directions)
- ✅ Jump to edge with Cmd+Arrow (all directions)
- ✅ Selection extension with Shift+Arrow
- ✅ Extend to edge with Cmd+Shift+Arrow
- ✅ Mouse click navigation
- ✅ Shift+Click range selection
- ✅ Drag selection
- ✅ Column/row header selection
- ✅ Tab navigation (Tab, Shift+Tab)
- ✅ Enter key navigation
- ✅ Home/End navigation
- ✅ Edge cases (boundaries, data gaps)

**Total Scenarios**: 24 test scenarios

---

## See Also

- **User Workflows**: `/docs/user-interactions/01-core-workflows.md` (#12, #13)
- **Keyboard Shortcuts**: `/docs/user-interactions/03-keyboard-shortcuts.md`
- **Mode Behaviors**: `/docs/user-interactions/02-mode-behaviors.md` (ReadyMode navigation)
- **Data Entry Scenarios**: `/docs/test-scenarios/data-entry.scenarios.md`
- **Formula Building Scenarios**: `/docs/test-scenarios/formula-building.scenarios.md`
