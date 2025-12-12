# Border Formatting Test Scenarios

This document defines comprehensive test scenarios for cell/range border formatting in v-sheet, covering toolbar interactions, border positions, styles, undo/redo, and persistence.

**Related Documentation**:
- **Implementation Plan**: [docs/roadmap/implementation_plan_border_formatting.md](../roadmap/implementation_plan_border_formatting.md)
- **Epic 3**: [docs/roadmap/epic_03_cell_formatting.md](../roadmap/epic_03_cell_formatting.md)
- **Architecture**: [docs/architecture/00-system-overview.md](../architecture/00-system-overview.md)
- **UI Components**: [docs/architecture/03-ui-components.md](../architecture/03-ui-components.md) (Toolbar section)
- **History System**: [docs/architecture/04-history-system.md](../architecture/04-history-system.md) (BorderFormatCommand)

---

## Border Position Application

### Scenario 1: Apply 'All' Borders to Single Cell

**Given** user has selected cell B2
**When** user clicks border button in toolbar
**And** clicks "All Borders" in border menu
**Then**
- Cell B2 displays borders on all 4 sides (top, right, bottom, left)
- Borders use default style (solid, black, 1px)
- "All Borders" button appears active/pressed
- BorderFormatCommand added to undo stack

**Playwright Implementation**:
```javascript
test('Apply all borders to single cell', async ({ page }) => {
  await page.goto('/');
  await page.waitForResponse('**/api/recent');

  // Select cell B2
  await page.click('[data-id="B2"]');

  // Open border menu
  await page.click('button[data-id="borders"]');

  // Click "All Borders"
  await page.click('.border-menu button[data-position="all"]');

  // Verify borders applied
  const cell = page.locator('[data-id="B2"]');
  await expect(cell).toHaveCSS('border-top-width', '1px');
  await expect(cell).toHaveCSS('border-right-width', '1px');
  await expect(cell).toHaveCSS('border-bottom-width', '1px');
  await expect(cell).toHaveCSS('border-left-width', '1px');

  await expect(cell).toHaveCSS('border-top-style', 'solid');
  await expect(cell).toHaveCSS('border-top-color', 'rgb(0, 0, 0)');
});
```

**What This Tests**:
- Toolbar border button opens menu
- BorderMenu position button click handling
- BorderResolver.resolveBorderChanges() for 'all' position
- BorderFormatCommand execution
- GridRenderer.updateCellStyle() applying border CSS

---

### Scenario 2: Apply 'All' Borders to Range

**Given** user has selected range B2:D4
**When** user applies "All Borders"
**Then**
- All 9 cells (B2, B3, B4, C2, C3, C4, D2, D3, D4) have borders on all sides
- Creates grid appearance with borders on every edge
- Single BorderFormatCommand handles all cells

**Playwright Implementation**:
```javascript
test('Apply all borders to range', async ({ page }) => {
  await page.goto('/');
  await page.waitForResponse('**/api/recent');

  // Select range B2:D4
  await page.click('[data-id="B2"]');
  await page.click('[data-id="D4"]', { modifiers: ['Shift'] });

  // Apply all borders
  await page.click('button[data-id="borders"]');
  await page.click('.border-menu button[data-position="all"]');

  // Verify all cells have borders
  for (const cellId of ['B2', 'B3', 'B4', 'C2', 'C3', 'C4', 'D2', 'D3', 'D4']) {
    const cell = page.locator(`[data-id="${cellId}"]`);
    await expect(cell).toHaveCSS('border-top-width', '1px');
    await expect(cell).toHaveCSS('border-right-width', '1px');
    await expect(cell).toHaveCSS('border-bottom-width', '1px');
    await expect(cell).toHaveCSS('border-left-width', '1px');
  }
});
```

**What This Tests**:
- Range selection with border formatting
- BorderResolver handling multiple cells
- Single command for batch operation

---

### Scenario 3: Apply 'Outer' Borders to Range

**Given** user has selected range B2:D4
**When** user applies "Outer Borders"
**Then**
- Only perimeter cells receive borders on their outer edges
- Top row (B2, C2, D2) has top borders
- Bottom row (B4, C4, D4) has bottom borders
- Left column (B2, B3, B4) has left borders
- Right column (D2, D3, D4) has right borders
- Interior cells have no borders

**Playwright Implementation**:
```javascript
test('Apply outer borders to range', async ({ page }) => {
  await page.goto('/');
  await page.waitForResponse('**/api/recent');

  await page.click('[data-id="B2"]');
  await page.click('[data-id="D4"]', { modifiers: ['Shift'] });

  await page.click('button[data-id="borders"]');
  await page.click('.border-menu button[data-position="outer"]');

  // Verify outer borders
  // Top-left corner (B2)
  await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-top-width', '1px');
  await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-left-width', '1px');

  // Top-right corner (D2)
  await expect(page.locator('[data-id="D2"]')).toHaveCSS('border-top-width', '1px');
  await expect(page.locator('[data-id="D2"]')).toHaveCSS('border-right-width', '1px');

  // Bottom-left corner (B4)
  await expect(page.locator('[data-id="B4"]')).toHaveCSS('border-bottom-width', '1px');
  await expect(page.locator('[data-id="B4"]')).toHaveCSS('border-left-width', '1px');

  // Bottom-right corner (D4)
  await expect(page.locator('[data-id="D4"]')).toHaveCSS('border-bottom-width', '1px');
  await expect(page.locator('[data-id="D4"]')).toHaveCSS('border-right-width', '1px');

  // Center cell (C3) should have no explicit borders
  const centerCell = page.locator('[data-id="C3"]');
  // Note: May need to check for 0px or default grid border depending on implementation
});
```

**What This Tests**:
- BorderResolver 'outer' position logic
- Perimeter cell detection
- Edge-only border application

---

### Scenario 4: Apply 'Inner' Borders to Range

**Given** user has selected range B2:D4
**When** user applies "Inner Borders"
**Then**
- Only borders between cells are applied
- Vertical borders between columns (B-C, C-D)
- Horizontal borders between rows (2-3, 3-4)
- No borders on outer edges of range

**Playwright Implementation**:
```javascript
test('Apply inner borders to range', async ({ page }) => {
  await page.goto('/');
  await page.waitForResponse('**/api/recent');

  await page.click('[data-id="B2"]');
  await page.click('[data-id="D4"]', { modifiers: ['Shift'] });

  await page.click('button[data-id="borders"]');
  await page.click('.border-menu button[data-position="inner"]');

  // Verify inner vertical borders
  // B2 should have right border (between B and C)
  await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-right-width', '1px');
  // C2 should have left and right borders
  await expect(page.locator('[data-id="C2"]')).toHaveCSS('border-left-width', '1px');
  await expect(page.locator('[data-id="C2"]')).toHaveCSS('border-right-width', '1px');

  // Verify inner horizontal borders
  // B2 should have bottom border (between row 2 and 3)
  await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-bottom-width', '1px');
  // B3 should have top and bottom borders
  await expect(page.locator('[data-id="B3"]')).toHaveCSS('border-top-width', '1px');
  await expect(page.locator('[data-id="B3"]')).toHaveCSS('border-bottom-width', '1px');

  // Verify NO outer borders on perimeter
  // Top-left cell should not have top or left border
  const b2 = page.locator('[data-id="B2"]');
  // Check for 0px or absence (implementation dependent)
});
```

**What This Tests**:
- BorderResolver 'inner' position logic
- Interior border detection
- Exclusion of outer edges

---

### Scenario 5: Apply 'Inner Horizontal' Borders to Range

**Given** user has selected range B2:D4
**When** user applies "Inner Horizontal Borders"
**Then**
- Only horizontal borders between rows are applied
- B3, C3, D3 have top borders (between row 2-3)
- B4, C4, D4 have top borders (between row 3-4)
- No vertical borders
- No outer horizontal borders

**Playwright Implementation**:
```javascript
test('Apply inner horizontal borders to range', async ({ page }) => {
  await page.goto('/');
  await page.waitForResponse('**/api/recent');

  await page.click('[data-id="B2"]');
  await page.click('[data-id="D4"]', { modifiers: ['Shift'] });

  await page.click('button[data-id="borders"]');
  await page.click('.border-menu button[data-position="inner-h"]');

  // Verify horizontal borders between rows
  await expect(page.locator('[data-id="B3"]')).toHaveCSS('border-top-width', '1px');
  await expect(page.locator('[data-id="C3"]')).toHaveCSS('border-top-width', '1px');
  await expect(page.locator('[data-id="D3"]')).toHaveCSS('border-top-width', '1px');

  await expect(page.locator('[data-id="B4"]')).toHaveCSS('border-top-width', '1px');
  await expect(page.locator('[data-id="C4"]')).toHaveCSS('border-top-width', '1px');
  await expect(page.locator('[data-id="D4"]')).toHaveCSS('border-top-width', '1px');

  // Verify NO vertical borders
  // (Check implementation: may need to verify 0px or default)
});
```

**What This Tests**:
- BorderResolver 'inner-h' position logic
- Row border detection
- Exclusion of column borders

---

### Scenario 6: Apply 'Inner Vertical' Borders to Range

**Given** user has selected range B2:D4
**When** user applies "Inner Vertical Borders"
**Then**
- Only vertical borders between columns are applied
- C2, C3, C4 have left borders (between B-C)
- D2, D3, D4 have left borders (between C-D)
- No horizontal borders

**Playwright Implementation**:
```javascript
test('Apply inner vertical borders to range', async ({ page }) => {
  await page.goto('/');
  await page.waitForResponse('**/api/recent');

  await page.click('[data-id="B2"]');
  await page.click('[data-id="D4"]', { modifiers: ['Shift'] });

  await page.click('button[data-id="borders"]');
  await page.click('.border-menu button[data-position="inner-v"]');

  // Verify vertical borders between columns
  await expect(page.locator('[data-id="C2"]')).toHaveCSS('border-left-width', '1px');
  await expect(page.locator('[data-id="C3"]')).toHaveCSS('border-left-width', '1px');
  await expect(page.locator('[data-id="C4"]')).toHaveCSS('border-left-width', '1px');

  await expect(page.locator('[data-id="D2"]')).toHaveCSS('border-left-width', '1px');
  await expect(page.locator('[data-id="D3"]')).toHaveCSS('border-left-width', '1px');
  await expect(page.locator('[data-id="D4"]')).toHaveCSS('border-left-width', '1px');
});
```

**What This Tests**:
- BorderResolver 'inner-v' position logic
- Column border detection

---

### Scenario 7: Apply 'Top' Border to Range

**Given** user has selected range B2:D4
**When** user applies "Top Border"
**Then**
- Only top edge of range gets border
- B2, C2, D2 have top borders
- All other borders remain unchanged

**Playwright Implementation**:
```javascript
test('Apply top border to range', async ({ page }) => {
  await page.goto('/');
  await page.waitForResponse('**/api/recent');

  await page.click('[data-id="B2"]');
  await page.click('[data-id="D4"]', { modifiers: ['Shift'] });

  await page.click('button[data-id="borders"]');
  await page.click('.border-menu button[data-position="top"]');

  // Verify only top row has top borders
  await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-top-width', '1px');
  await expect(page.locator('[data-id="C2"]')).toHaveCSS('border-top-width', '1px');
  await expect(page.locator('[data-id="D2"]')).toHaveCSS('border-top-width', '1px');
});
```

**What This Tests**:
- BorderResolver 'top' position logic
- Edge-specific border application

---

### Scenario 8: Apply 'Bottom' Border to Range

**Given** user has selected range B2:D4
**When** user applies "Bottom Border"
**Then**
- Only bottom edge of range gets border
- B4, C4, D4 have bottom borders

**Playwright Implementation**:
```javascript
test('Apply bottom border to range', async ({ page }) => {
  await page.goto('/');
  await page.waitForResponse('**/api/recent');

  await page.click('[data-id="B2"]');
  await page.click('[data-id="D4"]', { modifiers: ['Shift'] });

  await page.click('button[data-id="borders"]');
  await page.click('.border-menu button[data-position="bottom"]');

  await expect(page.locator('[data-id="B4"]')).toHaveCSS('border-bottom-width', '1px');
  await expect(page.locator('[data-id="C4"]')).toHaveCSS('border-bottom-width', '1px');
  await expect(page.locator('[data-id="D4"]')).toHaveCSS('border-bottom-width', '1px');
});
```

---

### Scenario 9: Apply 'Left' Border to Range

**Given** user has selected range B2:D4
**When** user applies "Left Border"
**Then**
- Only left edge of range gets border
- B2, B3, B4 have left borders

**Playwright Implementation**:
```javascript
test('Apply left border to range', async ({ page }) => {
  await page.goto('/');
  await page.waitForResponse('**/api/recent');

  await page.click('[data-id="B2"]');
  await page.click('[data-id="D4"]', { modifiers: ['Shift'] });

  await page.click('button[data-id="borders"]');
  await page.click('.border-menu button[data-position="left"]');

  await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-left-width', '1px');
  await expect(page.locator('[data-id="B3"]')).toHaveCSS('border-left-width', '1px');
  await expect(page.locator('[data-id="B4"]')).toHaveCSS('border-left-width', '1px');
});
```

---

### Scenario 10: Apply 'Right' Border to Range

**Given** user has selected range B2:D4
**When** user applies "Right Border"
**Then**
- Only right edge of range gets border
- D2, D3, D4 have right borders

**Playwright Implementation**:
```javascript
test('Apply right border to range', async ({ page }) => {
  await page.goto('/');
  await page.waitForResponse('**/api/recent');

  await page.click('[data-id="B2"]');
  await page.click('[data-id="D4"]', { modifiers: ['Shift'] });

  await page.click('button[data-id="borders"]');
  await page.click('.border-menu button[data-position="right"]');

  await expect(page.locator('[data-id="D2"]')).toHaveCSS('border-right-width', '1px');
  await expect(page.locator('[data-id="D3"]')).toHaveCSS('border-right-width', '1px');
  await expect(page.locator('[data-id="D4"]')).toHaveCSS('border-right-width', '1px');
});
```

---

## Multi-Position Selection

### Scenario 11: Apply Top and Bottom Borders Simultaneously

**Given** user has selected range B2:D4
**When** user clicks "Top Border" (becomes active)
**And** user clicks "Bottom Border" (both now active)
**And** borders are applied
**Then**
- Top row (B2, C2, D2) has top borders
- Bottom row (B4, C4, D4) has bottom borders
- Both position buttons show active state

**Playwright Implementation**:
```javascript
test('Apply multiple positions - top and bottom', async ({ page }) => {
  await page.goto('/');
  await page.waitForResponse('**/api/recent');

  await page.click('[data-id="B2"]');
  await page.click('[data-id="D4"]', { modifiers: ['Shift'] });

  await page.click('button[data-id="borders"]');

  // Click top border
  await page.click('.border-menu button[data-position="top"]');

  // Verify top button is active
  await expect(page.locator('.border-menu button[data-position="top"]')).toHaveClass(/active/);

  // Click bottom border (should also become active)
  await page.click('.border-menu button[data-position="bottom"]');

  // Verify both buttons are active
  await expect(page.locator('.border-menu button[data-position="top"]')).toHaveClass(/active/);
  await expect(page.locator('.border-menu button[data-position="bottom"]')).toHaveClass(/active/);

  // Verify borders applied
  await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-top-width', '1px');
  await expect(page.locator('[data-id="C2"]')).toHaveCSS('border-top-width', '1px');
  await expect(page.locator('[data-id="D2"]')).toHaveCSS('border-top-width', '1px');

  await expect(page.locator('[data-id="B4"]')).toHaveCSS('border-bottom-width', '1px');
  await expect(page.locator('[data-id="C4"]')).toHaveCSS('border-bottom-width', '1px');
  await expect(page.locator('[data-id="D4"]')).toHaveCSS('border-bottom-width', '1px');
});
```

**What This Tests**:
- BorderMenu multi-select state management
- Multiple positions in selectedPositions Set
- BorderResolver handling multiple positions
- Active button styling

---

### Scenario 12: Toggle Position Off

**Given** user has "Top Border" selected (active)
**When** user clicks "Top Border" again
**Then**
- "Top Border" button becomes inactive
- Position is removed from selectedPositions

**Playwright Implementation**:
```javascript
test('Toggle border position off', async ({ page }) => {
  await page.goto('/');
  await page.waitForResponse('**/api/recent');

  await page.click('[data-id="B2"]');
  await page.click('button[data-id="borders"]');

  // Click top border (activate)
  await page.click('.border-menu button[data-position="top"]');
  await expect(page.locator('.border-menu button[data-position="top"]')).toHaveClass(/active/);

  // Click top border again (deactivate)
  await page.click('.border-menu button[data-position="top"]');
  await expect(page.locator('.border-menu button[data-position="top"]')).not.toHaveClass(/active/);
});
```

**What This Tests**:
- Toggle logic in BorderMenu
- Button state management

---

## Border Style Customization

### Scenario 13: Change Border Color

**Given** user has selected cell B2
**And** user has "All Borders" position selected
**When** user clicks color picker and selects red (#FF0000)
**Then**
- Borders immediately change to red
- All subsequent border applications use red until changed

**Playwright Implementation**:
```javascript
test('Change border color', async ({ page }) => {
  await page.goto('/');
  await page.waitForResponse('**/api/recent');

  await page.click('[data-id="B2"]');
  await page.click('button[data-id="borders"]');
  await page.click('.border-menu button[data-position="all"]');

  // Change color to red
  const colorInput = page.locator('.border-menu #border-color-picker input[type="color"]');
  await colorInput.fill('#ff0000');

  // Verify border color changed
  const cell = page.locator('[data-id="B2"]');
  await expect(cell).toHaveCSS('border-top-color', 'rgb(255, 0, 0)');
  await expect(cell).toHaveCSS('border-right-color', 'rgb(255, 0, 0)');
  await expect(cell).toHaveCSS('border-bottom-color', 'rgb(255, 0, 0)');
  await expect(cell).toHaveCSS('border-left-color', 'rgb(255, 0, 0)');
});
```

**What This Tests**:
- BorderMenu color picker interaction
- Immediate application on color change
- BorderResolver using updated color
- GridRenderer applying color CSS

---

### Scenario 14: Change Border Style to Dashed

**Given** user has selected range B2:D2
**And** user has "All Borders" position selected
**When** user clicks style selector and selects "Dashed"
**Then**
- Borders immediately change to dashed style
- Border width and color remain unchanged

**Playwright Implementation**:
```javascript
test('Change border style to dashed', async ({ page }) => {
  await page.goto('/');
  await page.waitForResponse('**/api/recent');

  await page.click('[data-id="B2"]');
  await page.click('[data-id="D2"]', { modifiers: ['Shift'] });

  await page.click('button[data-id="borders"]');
  await page.click('.border-menu button[data-position="all"]');

  // Open style dropdown
  await page.click('.border-menu #border-style-selector');

  // Select dashed
  await page.click('.border-style-dropdown button[data-style="dashed"]');

  // Verify border style changed
  for (const cellId of ['B2', 'C2', 'D2']) {
    const cell = page.locator(`[data-id="${cellId}"]`);
    await expect(cell).toHaveCSS('border-top-style', 'dashed');
    await expect(cell).toHaveCSS('border-right-style', 'dashed');
    await expect(cell).toHaveCSS('border-bottom-style', 'dashed');
    await expect(cell).toHaveCSS('border-left-style', 'dashed');
  }
});
```

**What This Tests**:
- Style selector dropdown interaction
- Border style application
- GridRenderer applying style CSS

---

### Scenario 15: Change Border Style to Dotted

**Given** user has borders applied
**When** user selects "Dotted" style
**Then**
- Borders change to dotted style

**Playwright Implementation**:
```javascript
test('Change border style to dotted', async ({ page }) => {
  await page.goto('/');
  await page.waitForResponse('**/api/recent');

  await page.click('[data-id="B2"]');
  await page.click('button[data-id="borders"]');
  await page.click('.border-menu button[data-position="all"]');

  await page.click('.border-menu #border-style-selector');
  await page.click('.border-style-dropdown button[data-style="dotted"]');

  const cell = page.locator('[data-id="B2"]');
  await expect(cell).toHaveCSS('border-top-style', 'dotted');
});
```

---

### Scenario 16: Change Border Thickness

**Given** user has borders applied with 1px width
**When** user selects "Solid Medium" (2px) from style dropdown
**Then**
- Border width changes to 2px
- Style remains solid

**Playwright Implementation**:
```javascript
test('Change border thickness', async ({ page }) => {
  await page.goto('/');
  await page.waitForResponse('**/api/recent');

  await page.click('[data-id="B2"]');
  await page.click('button[data-id="borders"]');
  await page.click('.border-menu button[data-position="all"]');

  // Initially 1px (default)
  await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-top-width', '1px');

  // Change to 2px
  await page.click('.border-menu #border-style-selector');
  await page.click('.border-style-dropdown button[data-style="solid"][data-width="2"]');

  // Verify width changed
  await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-top-width', '2px');
  await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-top-style', 'solid');
});
```

**What This Tests**:
- Border width application
- Combined style/width selection

---

## Border Removal

### Scenario 17: Remove Borders

**Given** cell B2 has borders on all sides
**When** user selects B2
**And** opens border menu
**And** clicks "Remove Borders" button
**Then**
- All borders are removed from B2
- Cell returns to default appearance

**Playwright Implementation**:
```javascript
test('Remove borders', async ({ page }) => {
  await page.goto('/');
  await page.waitForResponse('**/api/recent');

  // Apply borders first
  await page.click('[data-id="B2"]');
  await page.click('button[data-id="borders"]');
  await page.click('.border-menu button[data-position="all"]');

  // Verify borders exist
  await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-top-width', '1px');

  // Remove borders
  await page.click('.border-menu .border-remove');

  // Verify borders removed (may be 0px or empty depending on implementation)
  // This test may need adjustment based on how removal is implemented
  const cell = page.locator('[data-id="B2"]');
  // Check that border style is reset or width is 0
});
```

**What This Tests**:
- Border removal functionality
- BorderFormatCommand with null borderStyle
- GridRenderer clearing border CSS

---

## Undo/Redo

### Scenario 18: Undo Border Formatting

**Given** user has applied borders to cell B2
**When** user presses Ctrl+Z
**Then**
- Borders are removed from B2
- Cell returns to pre-border state
- BorderFormatCommand moved to redo stack

**Playwright Implementation**:
```javascript
test('Undo border formatting', async ({ page }) => {
  await page.goto('/');
  await page.waitForResponse('**/api/recent');

  await page.click('[data-id="B2"]');
  await page.click('button[data-id="borders"]');
  await page.click('.border-menu button[data-position="all"]');

  // Verify borders applied
  await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-top-width', '1px');

  // Undo
  await page.keyboard.press('Control+z');

  // Verify borders removed
  // (Implementation dependent - may be 0px or default grid border)
});
```

**What This Tests**:
- BorderFormatCommand.undo()
- HistoryManager integration
- GridRenderer updating after undo

---

### Scenario 19: Redo Border Formatting

**Given** user has undone border formatting
**When** user presses Ctrl+Y
**Then**
- Borders are reapplied to cell
- Cell returns to bordered state

**Playwright Implementation**:
```javascript
test('Redo border formatting', async ({ page }) => {
  await page.goto('/');
  await page.waitForResponse('**/api/recent');

  await page.click('[data-id="B2"]');
  await page.click('button[data-id="borders"]');
  await page.click('.border-menu button[data-position="all"]');

  // Undo
  await page.keyboard.press('Control+z');

  // Redo
  await page.keyboard.press('Control+y');

  // Verify borders reapplied
  await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-top-width', '1px');
  await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-top-style', 'solid');
});
```

**What This Tests**:
- BorderFormatCommand.execute() (second time)
- Redo stack management

---

### Scenario 20: Undo/Redo with Multiple Border Operations

**Given** user applies borders to B2, then applies different borders to C3
**When** user presses Ctrl+Z twice
**Then**
- C3 borders removed (first undo)
- B2 borders removed (second undo)

**When** user presses Ctrl+Y once
**Then**
- B2 borders reapplied

**Playwright Implementation**:
```javascript
test('Undo redo multiple border operations', async ({ page }) => {
  await page.goto('/');
  await page.waitForResponse('**/api/recent');

  // Apply borders to B2
  await page.click('[data-id="B2"]');
  await page.click('button[data-id="borders"]');
  await page.click('.border-menu button[data-position="all"]');

  // Apply borders to C3
  await page.click('[data-id="C3"]');
  await page.click('button[data-id="borders"]');
  await page.click('.border-menu button[data-position="all"]');

  // Verify both have borders
  await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-top-width', '1px');
  await expect(page.locator('[data-id="C3"]')).toHaveCSS('border-top-width', '1px');

  // Undo C3 borders
  await page.keyboard.press('Control+z');
  // C3 should have no borders (or default)

  // Undo B2 borders
  await page.keyboard.press('Control+z');
  // B2 should have no borders (or default)

  // Redo B2 borders
  await page.keyboard.press('Control+y');
  await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-top-width', '1px');
});
```

**What This Tests**:
- Multiple commands in history stack
- Sequential undo/redo
- Command isolation

---

## Persistence

### Scenario 21: Borders Persist After Reload

**Given** user has applied borders to cell B2
**And** file has been auto-saved
**When** user reloads the page
**Then**
- B2 still displays borders with correct style, color, and width

**Playwright Implementation**:
```javascript
test('Borders persist after reload', async ({ page }) => {
  await page.goto('/');
  await page.waitForResponse('**/api/recent');

  // Apply borders
  await page.click('[data-id="B2"]');
  await page.click('button[data-id="borders"]');
  await page.click('.border-menu button[data-position="all"]');

  // Change color to red for visibility
  const colorInput = page.locator('.border-menu #border-color-picker input[type="color"]');
  await colorInput.fill('#ff0000');

  // Wait for autosave
  await page.waitForTimeout(1000);

  // Reload page
  await page.reload();
  await page.waitForResponse('**/api/files/*');

  // Verify borders persisted
  const cell = page.locator('[data-id="B2"]');
  await expect(cell).toHaveCSS('border-top-width', '1px');
  await expect(cell).toHaveCSS('border-top-color', 'rgb(255, 0, 0)');
  await expect(cell).toHaveCSS('border-top-style', 'solid');
});
```

**What This Tests**:
- StyleManager palette saved to file
- Cell styleId references preserved
- Border styles restored on file load
- FileManager autosave integration

---

### Scenario 22: Range Borders Persist After Reload

**Given** user has applied "Outer Borders" to range B2:D4
**And** file has been auto-saved
**When** user reloads the page
**Then**
- All perimeter cells still display correct borders

**Playwright Implementation**:
```javascript
test('Range borders persist after reload', async ({ page }) => {
  await page.goto('/');
  await page.waitForResponse('**/api/recent');

  await page.click('[data-id="B2"]');
  await page.click('[data-id="D4"]', { modifiers: ['Shift'] });
  await page.click('button[data-id="borders"]');
  await page.click('.border-menu button[data-position="outer"]');

  await page.waitForTimeout(1000);

  await page.reload();
  await page.waitForResponse('**/api/files/*');

  // Verify outer borders persisted
  await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-top-width', '1px');
  await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-left-width', '1px');
  await expect(page.locator('[data-id="D4"]')).toHaveCSS('border-bottom-width', '1px');
  await expect(page.locator('[data-id="D4"]')).toHaveCSS('border-right-width', '1px');
});
```

---

## Copy/Paste

### Scenario 23: Copy/Paste Preserves Borders

**Given** cell B2 has borders (all sides, red, solid, 2px)
**When** user copies B2 and pastes to D5
**Then**
- D5 has identical borders (all sides, red, solid, 2px)
- Border styleId deduplicated via StyleManager

**Playwright Implementation**:
```javascript
test('Copy paste preserves borders', async ({ page }) => {
  await page.goto('/');
  await page.waitForResponse('**/api/recent');

  // Apply borders to B2
  await page.click('[data-id="B2"]');
  await page.click('button[data-id="borders"]');
  await page.click('.border-menu button[data-position="all"]');

  // Change to red, 2px
  const colorInput = page.locator('.border-menu #border-color-picker input[type="color"]');
  await colorInput.fill('#ff0000');
  await page.click('.border-menu #border-style-selector');
  await page.click('.border-style-dropdown button[data-style="solid"][data-width="2"]');

  // Copy B2
  await page.keyboard.press('Control+c');

  // Paste to D5
  await page.click('[data-id="D5"]');
  await page.keyboard.press('Control+v');

  // Verify D5 has same borders
  const destCell = page.locator('[data-id="D5"]');
  await expect(destCell).toHaveCSS('border-top-width', '2px');
  await expect(destCell).toHaveCSS('border-top-color', 'rgb(255, 0, 0)');
  await expect(destCell).toHaveCSS('border-top-style', 'solid');
  await expect(destCell).toHaveCSS('border-right-width', '2px');
  await expect(destCell).toHaveCSS('border-bottom-width', '2px');
  await expect(destCell).toHaveCSS('border-left-width', '2px');
});
```

**What This Tests**:
- ClipboardManager stores border styles
- UpdateCellsCommand handles border in newStyle
- StyleManager deduplication on paste

---

## Edge Cases

### Scenario 24: Apply Borders to Empty Cell

**Given** cell B2 is empty (no value)
**When** user applies borders to B2
**Then**
- Cell has styleId set with border property
- Future text entered will appear with borders
- Empty cell visually shows borders

**Playwright Implementation**:
```javascript
test('Apply borders to empty cell', async ({ page }) => {
  await page.goto('/');
  await page.waitForResponse('**/api/recent');

  // Select empty cell
  await page.click('[data-id="B2"]');

  // Apply borders
  await page.click('button[data-id="borders"]');
  await page.click('.border-menu button[data-position="all"]');

  // Verify borders visible
  await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-top-width', '1px');

  // Enter text
  await page.keyboard.type('Text');
  await page.keyboard.press('Enter');

  // Verify borders still exist
  await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-top-width', '1px');
  await expect(page.locator('[data-id="B2"]')).toHaveText('Text');
});
```

**What This Tests**:
- Border application to cells without values
- Border persistence when value added

---

### Scenario 25: Apply 'Inner' to Single Cell (No-Op)

**Given** user has selected single cell B2
**When** user applies "Inner Borders"
**Then**
- No borders are applied (inner requires range)
- Operation completes without error

**Playwright Implementation**:
```javascript
test('Apply inner borders to single cell - no-op', async ({ page }) => {
  await page.goto('/');
  await page.waitForResponse('**/api/recent');

  await page.click('[data-id="B2"]');
  await page.click('button[data-id="borders"]');
  await page.click('.border-menu button[data-position="inner"]');

  // Verify no borders applied (or default state)
  // Implementation dependent
});
```

**What This Tests**:
- BorderResolver handling edge case
- No-op behavior for invalid position/selection combo

---

### Scenario 26: Combine Border Formatting with Other Styles

**Given** cell B2 is bold with yellow background
**When** user applies borders
**Then**
- Cell has bold + yellow + borders
- All properties stored in merged style object
- Single styleId references combined style

**Playwright Implementation**:
```javascript
test('Combine borders with existing formatting', async ({ page }) => {
  await page.goto('/');
  await page.waitForResponse('**/api/recent');

  // Apply bold and fill
  await page.click('[data-id="B2"]');
  await page.keyboard.type('Formatted');
  await page.keyboard.press('Enter');
  await page.click('[data-id="B2"]');
  await page.keyboard.press('Control+b');

  // Apply fill color (using toolbar color picker)
  const fillInput = page.locator('button[data-id="fill-color"] input[type="color"]');
  await fillInput.fill('#ffff00');

  // Apply borders
  await page.click('button[data-id="borders"]');
  await page.click('.border-menu button[data-position="all"]');

  // Verify all styles present
  const cell = page.locator('[data-id="B2"]');
  await expect(cell).toHaveCSS('font-weight', '700');
  await expect(cell).toHaveCSS('background-color', 'rgb(255, 255, 0)');
  await expect(cell).toHaveCSS('border-top-width', '1px');
  await expect(cell).toHaveText('Formatted');
});
```

**What This Tests**:
- Deep merge of style properties
- Border formatting alongside font and fill
- StyleManager handling complex styles

---

### Scenario 27: Large Range Performance

**Given** user has selected range A1:Z100 (2600 cells)
**When** user applies "All Borders"
**Then**
- Operation completes in < 500ms
- All cells receive borders
- UI remains responsive

**Playwright Implementation**:
```javascript
test('Large range border performance', async ({ page }) => {
  await page.goto('/');
  await page.waitForResponse('**/api/recent');

  // Select large range (A1:Z100)
  await page.click('[data-id="A1"]');
  await page.keyboard.press('Shift+End'); // Select to end of row
  // May need to adjust selection method for 100 rows

  const startTime = Date.now();

  await page.click('button[data-id="borders"]');
  await page.click('.border-menu button[data-position="all"]');

  const endTime = Date.now();
  const duration = endTime - startTime;

  // Verify performance
  expect(duration).toBeLessThan(500);

  // Spot check a few cells
  await expect(page.locator('[data-id="A1"]')).toHaveCSS('border-top-width', '1px');
  await expect(page.locator('[data-id="Z100"]')).toHaveCSS('border-bottom-width', '1px');
});
```

**What This Tests**:
- Performance with large selections
- Batched rendering updates
- Command execution efficiency

---

## Summary Table

| Scenario | Position | What It Tests |
|----------|----------|---------------|
| 1 | All - Single Cell | Basic border application |
| 2 | All - Range | Multi-cell border application |
| 3 | Outer | Perimeter detection |
| 4 | Inner | Interior border logic |
| 5 | Inner-H | Horizontal interior borders |
| 6 | Inner-V | Vertical interior borders |
| 7 | Top | Edge-specific borders |
| 8 | Bottom | Edge-specific borders |
| 9 | Left | Edge-specific borders |
| 10 | Right | Edge-specific borders |
| 11 | Top + Bottom | Multi-position selection |
| 12 | Toggle | Position toggle logic |
| 13 | Color | Color picker integration |
| 14 | Dashed | Style application |
| 15 | Dotted | Style application |
| 16 | Thickness | Width application |
| 17 | Remove | Border removal |
| 18 | Undo | History integration |
| 19 | Redo | History integration |
| 20 | Multi-Op Undo | Complex history |
| 21 | Persistence | File save/load |
| 22 | Range Persistence | File save/load |
| 23 | Copy/Paste | Clipboard integration |
| 24 | Empty Cell | Edge case |
| 25 | Inner on Single | Edge case |
| 26 | Combined Styles | Style merging |
| 27 | Large Range | Performance |

---

## Related Files

- **BorderResolver**: `js/ui/BorderResolver.js`
- **BorderMenu**: `js/ui/BorderMenu.js`
- **BorderFormatCommand**: `js/history/commands/BorderFormatCommand.js`
- **GridRenderer**: `js/ui/GridRenderer.js`
- **Toolbar**: `js/ui/Toolbar.js`
- **Spreadsheet**: `js/spreadsheet.js`
- **StyleManager**: `js/StyleManager.js`
- **CSS**: `css/spreadsheet.css`
