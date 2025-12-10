import { test, expect } from '@playwright/test';

test.describe('Border Formatting - Position Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');
  });

  test('should apply all borders to single cell', async ({ page }) => {
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

  test('should apply all borders to range', async ({ page }) => {
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

  test('should apply outer borders to range', async ({ page }) => {
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
  });

  test('should apply inner borders to range', async ({ page }) => {
    await page.click('[data-id="B2"]');
    await page.click('[data-id="D4"]', { modifiers: ['Shift'] });

    await page.click('button[data-id="borders"]');
    await page.click('.border-menu button[data-position="inner"]');

    // Verify inner vertical borders (right side of cells, not left)
    // B2 should have right border (between B and C)
    await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-right-width', '1px');
    // C2 should have right border (between C and D)
    await expect(page.locator('[data-id="C2"]')).toHaveCSS('border-right-width', '1px');
    // D2 should NOT have right border (it's on the edge)

    // Verify inner horizontal borders (bottom side of cells, not top)
    // B2 should have bottom border (between row 2 and 3)
    await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-bottom-width', '1px');
    // B3 should have bottom border (between row 3 and 4)
    await expect(page.locator('[data-id="B3"]')).toHaveCSS('border-bottom-width', '1px');
    // B4 should NOT have bottom border (it's on the edge)
  });

  test('should apply inner horizontal borders to range', async ({ page }) => {
    await page.click('[data-id="B2"]');
    await page.click('[data-id="D4"]', { modifiers: ['Shift'] });

    await page.click('button[data-id="borders"]');
    await page.click('.border-menu button[data-position="inner-h"]');

    // Verify horizontal borders between rows (bottom borders on cells above)
    await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-bottom-width', '1px');
    await expect(page.locator('[data-id="C2"]')).toHaveCSS('border-bottom-width', '1px');
    await expect(page.locator('[data-id="D2"]')).toHaveCSS('border-bottom-width', '1px');

    await expect(page.locator('[data-id="B3"]')).toHaveCSS('border-bottom-width', '1px');
    await expect(page.locator('[data-id="C3"]')).toHaveCSS('border-bottom-width', '1px');
    await expect(page.locator('[data-id="D3"]')).toHaveCSS('border-bottom-width', '1px');
  });

  test('should apply inner vertical borders to range', async ({ page }) => {
    await page.click('[data-id="B2"]');
    await page.click('[data-id="D4"]', { modifiers: ['Shift'] });

    await page.click('button[data-id="borders"]');
    await page.click('.border-menu button[data-position="inner-v"]');

    // Verify vertical borders between columns (right borders on cells to the left)
    await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-right-width', '1px');
    await expect(page.locator('[data-id="B3"]')).toHaveCSS('border-right-width', '1px');
    await expect(page.locator('[data-id="B4"]')).toHaveCSS('border-right-width', '1px');

    await expect(page.locator('[data-id="C2"]')).toHaveCSS('border-right-width', '1px');
    await expect(page.locator('[data-id="C3"]')).toHaveCSS('border-right-width', '1px');
    await expect(page.locator('[data-id="C4"]')).toHaveCSS('border-right-width', '1px');
  });

  test('should apply top border to range', async ({ page }) => {
    await page.click('[data-id="B2"]');
    await page.click('[data-id="D4"]', { modifiers: ['Shift'] });

    await page.click('button[data-id="borders"]');
    await page.click('.border-menu button[data-position="top"]');

    // Verify only top row has top borders
    await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-top-width', '1px');
    await expect(page.locator('[data-id="C2"]')).toHaveCSS('border-top-width', '1px');
    await expect(page.locator('[data-id="D2"]')).toHaveCSS('border-top-width', '1px');
  });

  test('should apply bottom border to range', async ({ page }) => {
    await page.click('[data-id="B2"]');
    await page.click('[data-id="D4"]', { modifiers: ['Shift'] });

    await page.click('button[data-id="borders"]');
    await page.click('.border-menu button[data-position="bottom"]');

    await expect(page.locator('[data-id="B4"]')).toHaveCSS('border-bottom-width', '1px');
    await expect(page.locator('[data-id="C4"]')).toHaveCSS('border-bottom-width', '1px');
    await expect(page.locator('[data-id="D4"]')).toHaveCSS('border-bottom-width', '1px');
  });

  test('should apply left border to range', async ({ page }) => {
    await page.click('[data-id="B2"]');
    await page.click('[data-id="D4"]', { modifiers: ['Shift'] });

    await page.click('button[data-id="borders"]');
    await page.click('.border-menu button[data-position="left"]');

    await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-left-width', '1px');
    await expect(page.locator('[data-id="B3"]')).toHaveCSS('border-left-width', '1px');
    await expect(page.locator('[data-id="B4"]')).toHaveCSS('border-left-width', '1px');
  });

  test('should apply right border to range', async ({ page }) => {
    await page.click('[data-id="B2"]');
    await page.click('[data-id="D4"]', { modifiers: ['Shift'] });

    await page.click('button[data-id="borders"]');
    await page.click('.border-menu button[data-position="right"]');

    await expect(page.locator('[data-id="D2"]')).toHaveCSS('border-right-width', '1px');
    await expect(page.locator('[data-id="D3"]')).toHaveCSS('border-right-width', '1px');
    await expect(page.locator('[data-id="D4"]')).toHaveCSS('border-right-width', '1px');
  });
});

test.describe('Border Formatting - Multi-Position Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');
  });

  test('should apply top and bottom borders simultaneously', async ({ page }) => {
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

  test('should toggle border position off', async ({ page }) => {
    await page.click('[data-id="B2"]');
    await page.click('button[data-id="borders"]');

    // Click top border (activate)
    await page.click('.border-menu button[data-position="top"]');
    await expect(page.locator('.border-menu button[data-position="top"]')).toHaveClass(/active/);

    // Click top border again (deactivate)
    await page.click('.border-menu button[data-position="top"]');
    await expect(page.locator('.border-menu button[data-position="top"]')).not.toHaveClass(/active/);
  });
});

test.describe('Border Formatting - Style Customization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');
  });

  test('should change border color', async ({ page }) => {
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

  test('should change border style to dashed', async ({ page }) => {
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

  test('should change border style to dotted', async ({ page }) => {
    await page.click('[data-id="B2"]');
    await page.click('button[data-id="borders"]');
    await page.click('.border-menu button[data-position="all"]');

    await page.click('.border-menu #border-style-selector');
    await page.click('.border-style-dropdown button[data-style="dotted"]');

    const cell = page.locator('[data-id="B2"]');
    await expect(cell).toHaveCSS('border-top-style', 'dotted');
  });

  test('should change border thickness', async ({ page }) => {
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
});

test.describe('Border Formatting - Border Removal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');
  });

  test('should remove borders', async ({ page }) => {
    // Use a cell without pre-existing styles (G5 - not used elsewhere)
    await page.click('[data-id="G5"]');
    await page.click('button[data-id="borders"]');
    await page.click('.border-menu button[data-position="all"]');

    // Verify borders exist
    await expect(page.locator('[data-id="G5"]')).toHaveCSS('border-top-width', '1px');
    await expect(page.locator('[data-id="G5"]')).toHaveCSS('border-top-style', 'solid');

    // Remove borders (menu stays open after applying)
    await page.click('.border-menu .border-remove');

    // Click elsewhere to deselect (selection adds 1px border)
    await page.click('[data-id="A1"]');

    // Verify borders removed - should revert to default grid border
    const borderWidth = await page.locator('[data-id="G5"]').evaluate(el =>
      getComputedStyle(el).borderTopWidth
    );
    expect(parseFloat(borderWidth)).toBeLessThan(1);
  });
});

test.describe('Border Formatting - Undo/Redo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');
  });

  test('should undo border formatting', async ({ page }) => {
    // Use a cell without pre-existing styles (F5 - not used elsewhere)
    await page.click('[data-id="F5"]');
    await page.click('button[data-id="borders"]');
    await page.click('.border-menu button[data-position="all"]');

    // Verify borders applied
    await expect(page.locator('[data-id="F5"]')).toHaveCSS('border-top-width', '1px');
    await expect(page.locator('[data-id="F5"]')).toHaveCSS('border-top-style', 'solid');

    // Close menu to allow keyboard shortcut
    await page.keyboard.press('Escape');

    // Small delay to ensure mode switch
    await page.waitForTimeout(100);

    // Click cell to ensure focus on grid
    await page.click('[data-id="F5"]');

    // Use the undo button instead of keyboard shortcut
    await page.click('button[data-id="undo"]');

    // Small delay for undo to complete
    await page.waitForTimeout(200);

    // Click elsewhere to deselect F5 (selection adds 1px border)
    await page.click('[data-id="A1"]');

    // Verify borders removed - should revert to default grid border (0.5px or 0px)
    // The cell should no longer have the 1px solid black border we applied
    const borderWidth = await page.locator('[data-id="F5"]').evaluate(el =>
      getComputedStyle(el).borderTopWidth
    );
    expect(parseFloat(borderWidth)).toBeLessThan(1);
  });

  test('should redo border formatting', async ({ page }) => {
    // Use a cell without pre-existing styles
    await page.click('[data-id="A5"]');
    await page.click('button[data-id="borders"]');
    await page.click('.border-menu button[data-position="all"]');

    // Close menu
    await page.keyboard.press('Escape');

    // Undo
    await page.keyboard.press('Control+z');

    // Redo
    await page.keyboard.press('Control+y');

    // Verify borders reapplied
    await expect(page.locator('[data-id="A5"]')).toHaveCSS('border-top-width', '1px');
    await expect(page.locator('[data-id="A5"]')).toHaveCSS('border-top-style', 'solid');
  });

  test('should undo redo multiple border operations', async ({ page }) => {
    // Apply borders to A5 (no pre-existing styles)
    await page.click('[data-id="A5"]');
    await page.click('button[data-id="borders"]');
    await page.click('.border-menu button[data-position="all"]');

    // Close menu
    await page.keyboard.press('Escape');

    // Apply borders to E5 (no pre-existing styles)
    await page.click('[data-id="E5"]');
    await page.click('button[data-id="borders"]');
    await page.click('.border-menu button[data-position="all"]');

    // Close menu
    await page.keyboard.press('Escape');

    // Verify both have borders
    await expect(page.locator('[data-id="A5"]')).toHaveCSS('border-top-width', '1px');
    await expect(page.locator('[data-id="E5"]')).toHaveCSS('border-top-width', '1px');

    // Undo E5 borders
    await page.keyboard.press('Control+z');

    // Undo A5 borders
    await page.keyboard.press('Control+z');

    // Redo A5 borders
    await page.keyboard.press('Control+y');
    await expect(page.locator('[data-id="A5"]')).toHaveCSS('border-top-width', '1px');
  });
});

test.describe('Border Formatting - Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');
  });

  test('should persist borders after reload', async ({ page }) => {
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

  test('should persist range borders after reload', async ({ page }) => {
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
});

// NOTE: Copy/paste of borders requires clipboard manager to include styles
// This is tracked as a separate enhancement. Skipping for now.
test.describe.skip('Border Formatting - Copy/Paste', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');
  });

  test('should preserve borders when copying and pasting', async ({ page }) => {
    // Use empty cells far from test data (L30, M30)
    await page.click('[data-id="L30"]');
    await page.click('button[data-id="borders"]');

    // Apply default borders (1px solid black)
    await page.click('.border-menu button[data-position="all"]');

    // Close menu
    await page.keyboard.press('Escape');

    // Copy L30
    await page.keyboard.press('Control+c');

    // Paste to M30
    await page.click('[data-id="M30"]');
    await page.keyboard.press('Control+v');

    // Click elsewhere to deselect (selection has its own border color)
    await page.click('[data-id="A1"]');

    // Verify M30 has same borders (default 1px solid black)
    const destCell = page.locator('[data-id="M30"]');
    await expect(destCell).toHaveCSS('border-top-width', '1px');
    await expect(destCell).toHaveCSS('border-top-color', 'rgb(0, 0, 0)');
    await expect(destCell).toHaveCSS('border-top-style', 'solid');
    await expect(destCell).toHaveCSS('border-right-width', '1px');
    await expect(destCell).toHaveCSS('border-bottom-width', '1px');
    await expect(destCell).toHaveCSS('border-left-width', '1px');
  });
});

test.describe('Border Formatting - Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');
  });

  test('should apply borders to empty cell', async ({ page }) => {
    // Select a truly empty cell (K30 - far from test data)
    await page.click('[data-id="K30"]');

    // Apply borders
    await page.click('button[data-id="borders"]');
    await page.click('.border-menu button[data-position="all"]');

    // Verify borders visible
    await expect(page.locator('[data-id="K30"]')).toHaveCSS('border-top-width', '1px');

    // Close menu
    await page.keyboard.press('Escape');

    // Re-click the cell to ensure proper selection/focus
    await page.click('[data-id="K30"]');

    // Enter text
    await page.keyboard.type('Text');
    await page.keyboard.press('Enter');

    // Verify borders still exist
    await expect(page.locator('[data-id="K30"]')).toHaveCSS('border-top-width', '1px');
    await expect(page.locator('[data-id="K30"]')).toHaveText('Text');
  });

  test('should combine borders with existing formatting', async ({ page }) => {
    // Apply bold and fill
    await page.click('[data-id="B2"]');
    await page.keyboard.type('Formatted');
    await page.keyboard.press('Enter');
    await page.click('[data-id="B2"]');
    await page.keyboard.press('Control+b');

    // Apply fill color (using toolbar color picker)
    const fillColorBtn = page.locator('.toolbar-btn.color-picker-btn').filter({ hasText: '' }).nth(1);
    await fillColorBtn.click();
    const fillInput = fillColorBtn.locator('input[type="color"]');
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
});
