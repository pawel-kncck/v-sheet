# Cell Formatting Test Scenarios

This document defines comprehensive test scenarios for cell formatting in v-sheet, covering toolbar interactions, keyboard shortcuts, undo/redo, and persistence.

**Related Documentation**:
- **Architecture**: [docs/architecture/00-system-overview.md](../architecture/00-system-overview.md)
- **UI Components**: [docs/architecture/03-ui-components.md](../architecture/03-ui-components.md) (Toolbar section)
- **History System**: [docs/architecture/04-history-system.md](../architecture/04-history-system.md) (FormatRangeCommand)
- **User Workflows**: [docs/user-interactions/01-core-workflows.md](../user-interactions/01-core-workflows.md) (Workflows 16-18)

---

## Bold and Italic Formatting

### Scenario 1: Toggle Bold via Keyboard

**Given** user has selected cell B2 with value "Test"
**When** user presses Ctrl+B (Cmd+B on Mac)
**Then**
- Cell B2 text displays in bold
- Bold button in toolbar appears active/pressed
- FormatRangeCommand added to undo stack

**Playwright Implementation**:
```javascript
test('Toggle bold via keyboard', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Enter text in B2
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('Test');
  await page.keyboard.press('Enter');

  // Apply bold
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+B' : 'Control+B'
  );

  // Verify bold applied
  await expect(page.locator('[data-cell="B2"]')).toHaveCSS('font-weight', '700');
});
```

**What This Tests**:
- Keyboard shortcut handling (Ctrl+B / Cmd+B)
- FormatRangeCommand execution
- GridRenderer.updateCellStyle() applying bold CSS

---

### Scenario 2: Toggle Bold Off

**Given** user has cell B2 that is already bold
**When** user presses Ctrl+B again
**Then**
- Cell B2 returns to normal font weight
- Bold button in toolbar appears inactive

**Playwright Implementation**:
```javascript
test('Toggle bold off', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('Test');
  await page.keyboard.press('Enter');
  await page.locator('[data-cell="B2"]').click();

  // Apply bold
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+B' : 'Control+B'
  );
  await expect(page.locator('[data-cell="B2"]')).toHaveCSS('font-weight', '700');

  // Toggle bold off
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+B' : 'Control+B'
  );
  await expect(page.locator('[data-cell="B2"]')).toHaveCSS('font-weight', '400');
});
```

**What This Tests**:
- Toggle mode ("toggle" vs "set")
- applyRangeFormat with toggle mode
- Style removal via FormatRangeCommand

---

### Scenario 3: Toggle Italic via Keyboard

**Given** user has selected cell C3
**When** user presses Ctrl+I (Cmd+I on Mac)
**Then**
- Cell C3 displays in italic style
- Italic button in toolbar appears active

**Playwright Implementation**:
```javascript
test('Toggle italic via keyboard', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="C3"]').click();
  await page.keyboard.type('Italic');
  await page.keyboard.press('Enter');

  await page.locator('[data-cell="C3"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+I' : 'Control+I'
  );

  await expect(page.locator('[data-cell="C3"]')).toHaveCSS('font-style', 'italic');
});
```

---

### Scenario 4: Apply Bold to Multiple Cells

**Given** user has selected range B2:D2
**When** user presses Ctrl+B
**Then**
- All cells in range (B2, C2, D2) become bold
- Single FormatRangeCommand handles all cells

**Playwright Implementation**:
```javascript
test('Apply bold to range', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Enter values in B2:D2
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('One');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Two');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Three');
  await page.keyboard.press('Enter');

  // Select range B2:D2
  await page.locator('[data-cell="B2"]').click();
  await page.locator('[data-cell="D2"]').click({ modifiers: ['Shift'] });

  // Apply bold
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+B' : 'Control+B'
  );

  // Verify all cells are bold
  await expect(page.locator('[data-cell="B2"]')).toHaveCSS('font-weight', '700');
  await expect(page.locator('[data-cell="C2"]')).toHaveCSS('font-weight', '700');
  await expect(page.locator('[data-cell="D2"]')).toHaveCSS('font-weight', '700');
});
```

**What This Tests**:
- Range selection formatting
- Single command for multiple cells
- Undo restores all cells at once

---

## Color Formatting

### Scenario 5: Apply Fill Color via Toolbar

**Given** user has selected cell B2
**When** user clicks Fill Color picker and selects yellow (#FFFF00)
**Then**
- Cell B2 background changes to yellow
- Fill color picker shows yellow as selected

**Playwright Implementation**:
```javascript
test('Apply fill color via toolbar', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('Colored');
  await page.keyboard.press('Enter');
  await page.locator('[data-cell="B2"]').click();

  // Click fill color picker and select color
  // (exact selector depends on toolbar implementation)
  await page.locator('#fill-color-picker').click();
  await page.locator('[data-color="#FFFF00"]').click();

  await expect(page.locator('[data-cell="B2"]')).toHaveCSS(
    'background-color', 'rgb(255, 255, 0)'
  );
});
```

**What This Tests**:
- Toolbar color picker interaction
- fill.color style property
- GridRenderer applying backgroundColor

---

### Scenario 6: Apply Text Color

**Given** user has selected cell B2 with value "Red Text"
**When** user selects red (#FF0000) from text color picker
**Then**
- Cell B2 text displays in red
- Value remains unchanged

**Playwright Implementation**:
```javascript
test('Apply text color via toolbar', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('Red Text');
  await page.keyboard.press('Enter');
  await page.locator('[data-cell="B2"]').click();

  // Select text color
  await page.locator('#text-color-picker').click();
  await page.locator('[data-color="#FF0000"]').click();

  await expect(page.locator('[data-cell="B2"]')).toHaveCSS(
    'color', 'rgb(255, 0, 0)'
  );
  await expect(page.locator('[data-cell="B2"]')).toHaveText('Red Text');
});
```

---

## Font Properties

### Scenario 7: Change Font Size

**Given** user has selected cell B2
**When** user selects font size 18 from dropdown
**Then**
- Cell B2 text displays at 18px
- Other style properties (bold, color) preserved

**Playwright Implementation**:
```javascript
test('Change font size via toolbar', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('Large');
  await page.keyboard.press('Enter');
  await page.locator('[data-cell="B2"]').click();

  // Select font size from dropdown
  await page.locator('#font-size-select').selectOption('18');

  await expect(page.locator('[data-cell="B2"]')).toHaveCSS('font-size', '18px');
});
```

---

### Scenario 8: Change Font Family

**Given** user has selected cell B2
**When** user selects "Courier" from font family dropdown
**Then**
- Cell B2 text displays in Courier font

**Playwright Implementation**:
```javascript
test('Change font family via toolbar', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('Monospace');
  await page.keyboard.press('Enter');
  await page.locator('[data-cell="B2"]').click();

  await page.locator('#font-family-select').selectOption('Courier');

  const fontFamily = await page.locator('[data-cell="B2"]').evaluate(
    el => getComputedStyle(el).fontFamily
  );
  expect(fontFamily).toContain('Courier');
});
```

---

## Alignment

### Scenario 9: Center Align Text

**Given** user has selected cell B2
**When** user clicks Center Align button
**Then**
- Cell B2 text is centered horizontally

**Playwright Implementation**:
```javascript
test('Center align text', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('Centered');
  await page.keyboard.press('Enter');
  await page.locator('[data-cell="B2"]').click();

  await page.locator('#align-center-btn').click();

  await expect(page.locator('[data-cell="B2"]')).toHaveCSS('text-align', 'center');
});
```

---

## Undo/Redo Formatting

### Scenario 10: Undo Bold Formatting

**Given** user has made cell B2 bold
**When** user presses Ctrl+Z
**Then**
- Cell B2 returns to normal font weight
- FormatRangeCommand removed from undo stack
- Command pushed to redo stack

**Playwright Implementation**:
```javascript
test('Undo bold formatting', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('Test');
  await page.keyboard.press('Enter');
  await page.locator('[data-cell="B2"]').click();

  // Apply bold
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+B' : 'Control+B'
  );
  await expect(page.locator('[data-cell="B2"]')).toHaveCSS('font-weight', '700');

  // Undo
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
  );
  await expect(page.locator('[data-cell="B2"]')).toHaveCSS('font-weight', '400');
});
```

---

### Scenario 11: Redo Bold Formatting

**Given** user has undone bold formatting
**When** user presses Ctrl+Y (or Ctrl+Shift+Z)
**Then**
- Cell B2 becomes bold again

**Playwright Implementation**:
```javascript
test('Redo bold formatting', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('Test');
  await page.keyboard.press('Enter');
  await page.locator('[data-cell="B2"]').click();

  // Apply bold
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+B' : 'Control+B'
  );

  // Undo
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
  );
  await expect(page.locator('[data-cell="B2"]')).toHaveCSS('font-weight', '400');

  // Redo
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Y' : 'Control+Y'
  );
  await expect(page.locator('[data-cell="B2"]')).toHaveCSS('font-weight', '700');
});
```

---

## Clipboard and Formatting

### Scenario 12: Copy Preserves Formatting

**Given** cell B2 has bold text "Total" with blue background
**When** user copies B2 and pastes to D5
**Then**
- D5 has value "Total"
- D5 has bold text
- D5 has blue background

**Playwright Implementation**:
```javascript
test('Copy paste preserves formatting', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Enter and format B2
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('Total');
  await page.keyboard.press('Enter');
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+B' : 'Control+B'
  );

  // Copy
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
  );

  // Paste to D5
  await page.locator('[data-cell="D5"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
  );

  // Verify value and formatting
  await expect(page.locator('[data-cell="D5"]')).toHaveText('Total');
  await expect(page.locator('[data-cell="D5"]')).toHaveCSS('font-weight', '700');
});
```

**What This Tests**:
- ClipboardManager stores styles
- UpdateCellsCommand handles newStyle
- StyleManager deduplication on paste

---

## Persistence

### Scenario 13: Formatting Persists After Reload

**Given** user has formatted cell B2 (bold, yellow background)
**And** file has been auto-saved
**When** user reloads the page
**Then**
- B2 still shows bold text with yellow background

**Playwright Implementation**:
```javascript
test('Formatting persists after reload', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Format cell
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('Persistent');
  await page.keyboard.press('Enter');
  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+B' : 'Control+B'
  );

  // Wait for autosave (500ms debounce + buffer)
  await page.waitForTimeout(1000);

  // Reload
  await page.reload();
  await page.waitForSelector('[data-cell="B2"]');

  // Verify formatting persisted
  await expect(page.locator('[data-cell="B2"]')).toHaveText('Persistent');
  await expect(page.locator('[data-cell="B2"]')).toHaveCSS('font-weight', '700');
});
```

**What This Tests**:
- StyleManager palette saved to file
- Cell styleId references preserved
- Styles restored on file load

---

## StyleManager Deduplication

### Scenario 14: Multiple Cells Share Style

**Given** user formats cells B2, C2, D2 all with the same style (bold + yellow)
**When** inspecting the saved file
**Then**
- Only one style entry exists in styles palette
- All three cells reference the same styleId

**Implementation Note**: This is better tested as a unit test rather than E2E:

```javascript
// Unit test example
test('StyleManager deduplicates identical styles', () => {
  const styleManager = new StyleManager();

  const style = { font: { bold: true }, fill: { color: '#FFFF00' } };

  const id1 = styleManager.addStyle(style);
  const id2 = styleManager.addStyle(style);
  const id3 = styleManager.addStyle({ font: { bold: true }, fill: { color: '#FFFF00' } });

  expect(id1).toBe(id2);
  expect(id1).toBe(id3);
  expect(Object.keys(styleManager.styles).length).toBe(1);
});
```

---

## Combined Formatting

### Scenario 15: Multiple Format Properties

**Given** user has selected cell B2
**When** user applies bold, italic, and center alignment
**Then**
- Cell displays bold + italic + centered
- All properties stored in single style object

**Playwright Implementation**:
```javascript
test('Multiple format properties combined', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('Multi');
  await page.keyboard.press('Enter');
  await page.locator('[data-cell="B2"]').click();

  // Apply bold
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+B' : 'Control+B'
  );

  // Apply italic
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+I' : 'Control+I'
  );

  // Apply center align
  await page.locator('#align-center-btn').click();

  // Verify all properties
  await expect(page.locator('[data-cell="B2"]')).toHaveCSS('font-weight', '700');
  await expect(page.locator('[data-cell="B2"]')).toHaveCSS('font-style', 'italic');
  await expect(page.locator('[data-cell="B2"]')).toHaveCSS('text-align', 'center');
});
```

**What This Tests**:
- Deep merge of style properties
- Multiple FormatRangeCommands in sequence
- Each undo removes one format change

---

## Edge Cases

### Scenario 16: Format Empty Cell

**Given** cell B2 is empty
**When** user selects B2 and applies bold
**Then**
- Cell has styleId set
- Future text entered will be bold

---

### Scenario 17: Format During Edit Mode

**Given** user is actively editing cell B2 (EditMode)
**When** user presses Ctrl+B
**Then**
- Format is applied immediately (or on commit, depending on implementation)

---

## Summary

| Scenario | What It Tests |
|----------|---------------|
| 1-4 | Bold/Italic via keyboard |
| 5-6 | Color pickers |
| 7-8 | Font size and family |
| 9 | Text alignment |
| 10-11 | Undo/Redo formatting |
| 12 | Copy/paste with styles |
| 13 | Persistence after reload |
| 14 | StyleManager deduplication |
| 15-17 | Combined and edge cases |

---

## Related Files

- **StyleManager**: `js/StyleManager.js`
- **Toolbar**: `js/ui/Toolbar.js`
- **FormatRangeCommand**: `js/history/commands/FormatRangeCommand.js`
- **GridRenderer.updateCellStyle**: `js/ui/GridRenderer.js`
- **FileManager style methods**: `js/file-manager.js`
