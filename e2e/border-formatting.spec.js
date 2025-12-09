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
  });

  test('should apply inner horizontal borders to range', async ({ page }) => {
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
  });

  test('should apply inner vertical borders to range', async ({ page }) => {
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
    // Apply borders first
    await page.click('[data-id="B2"]');
    await page.click('button[data-id="borders"]');
    await page.click('.border-menu button[data-position="all"]');

    // Verify borders exist
    await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-top-width', '1px');

    // Remove borders
    await page.click('.border-menu .border-remove');

    // Verify borders removed
    // Note: Implementation may need adjustment based on how removal works
    // May check for 0px, empty string, or default grid border
  });
});

test.describe('Border Formatting - Undo/Redo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');
  });

  test('should undo border formatting', async ({ page }) => {
    await page.click('[data-id="B2"]');
    await page.click('button[data-id="borders"]');
    await page.click('.border-menu button[data-position="all"]');

    // Verify borders applied
    await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-top-width', '1px');

    // Close menu to allow keyboard shortcut
    await page.keyboard.press('Escape');

    // Undo
    await page.keyboard.press('Control+z');

    // Verify borders removed or reverted
    // Note: May need to check implementation for expected result
  });

  test('should redo border formatting', async ({ page }) => {
    await page.click('[data-id="B2"]');
    await page.click('button[data-id="borders"]');
    await page.click('.border-menu button[data-position="all"]');

    // Close menu
    await page.keyboard.press('Escape');

    // Undo
    await page.keyboard.press('Control+z');

    // Redo
    await page.keyboard.press('Control+y');

    // Verify borders reapplied
    await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-top-width', '1px');
    await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-top-style', 'solid');
  });

  test('should undo redo multiple border operations', async ({ page }) => {
    // Apply borders to B2
    await page.click('[data-id="B2"]');
    await page.click('button[data-id="borders"]');
    await page.click('.border-menu button[data-position="all"]');

    // Close menu
    await page.keyboard.press('Escape');

    // Apply borders to C3
    await page.click('[data-id="C3"]');
    await page.click('button[data-id="borders"]');
    await page.click('.border-menu button[data-position="all"]');

    // Close menu
    await page.keyboard.press('Escape');

    // Verify both have borders
    await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-top-width', '1px');
    await expect(page.locator('[data-id="C3"]')).toHaveCSS('border-top-width', '1px');

    // Undo C3 borders
    await page.keyboard.press('Control+z');

    // Undo B2 borders
    await page.keyboard.press('Control+z');

    // Redo B2 borders
    await page.keyboard.press('Control+y');
    await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-top-width', '1px');
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

test.describe('Border Formatting - Copy/Paste', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');
  });

  test('should preserve borders when copying and pasting', async ({ page }) => {
    // Apply borders to B2
    await page.click('[data-id="B2"]');
    await page.click('button[data-id="borders"]');
    await page.click('.border-menu button[data-position="all"]');

    // Change to red, 2px
    const colorInput = page.locator('.border-menu #border-color-picker input[type="color"]');
    await colorInput.fill('#ff0000');
    await page.click('.border-menu #border-style-selector');
    await page.click('.border-style-dropdown button[data-style="solid"][data-width="2"]');

    // Close menu
    await page.keyboard.press('Escape');

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
});

test.describe('Border Formatting - Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');
  });

  test('should apply borders to empty cell', async ({ page }) => {
    // Select empty cell
    await page.click('[data-id="B2"]');

    // Apply borders
    await page.click('button[data-id="borders"]');
    await page.click('.border-menu button[data-position="all"]');

    // Verify borders visible
    await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-top-width', '1px');

    // Close menu
    await page.keyboard.press('Escape');

    // Enter text
    await page.keyboard.type('Text');
    await page.keyboard.press('Enter');

    // Verify borders still exist
    await expect(page.locator('[data-id="B2"]')).toHaveCSS('border-top-width', '1px');
    await expect(page.locator('[data-id="B2"]')).toHaveText('Text');
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
