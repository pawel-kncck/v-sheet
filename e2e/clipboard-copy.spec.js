import { test, expect } from '@playwright/test';

test.describe('Clipboard - Copy Operations', () => {
  // Helper function to clear cells
  async function clearCells(page, cells) {
    for (const cellId of cells) {
      await page.locator(`[data-id="${cellId}"]`).click();
      await page.keyboard.press('Delete');
    }
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Clear test cells
    const testCells = ['A1', 'A2', 'B2', 'B3', 'C2', 'C3', 'D4', 'D5'];
    await clearCells(page, testCells);
  });

  test('Scenario 12: Copy single cell', async ({ page }) => {
    // Enter data in B2
    await page.locator('[data-id="B2"]').click();
    await page.keyboard.type('Hello');
    await page.keyboard.press('Enter');

    // Copy B2
    await page.locator('[data-id="B2"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
    );

    // Check visual feedback
    await expect(page.locator('[data-id="B2"]')).toHaveClass(/copy-source/);
  });

  test('Scenario 13: Copy range of cells', async ({ page }) => {
    // Fill in 2x2 range
    await page.locator('[data-id="B2"]').click();
    await page.keyboard.type('100');
    await page.keyboard.press('Tab');
    await page.keyboard.type('200');
    await page.keyboard.press('Enter');
    await page.locator('[data-id="B3"]').click();
    await page.keyboard.type('300');
    await page.keyboard.press('Tab');
    await page.keyboard.type('400');
    await page.keyboard.press('Enter');

    // Select range B2:C3
    await page.locator('[data-id="B2"]').click();
    await page.locator('[data-id="C3"]').click({ modifiers: ['Shift'] });

    // Copy
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
    );

    // Check all cells have copy-source class
    await expect(page.locator('[data-id="B2"]')).toHaveClass(/copy-source/);
    await expect(page.locator('[data-id="C2"]')).toHaveClass(/copy-source/);
    await expect(page.locator('[data-id="B3"]')).toHaveClass(/copy-source/);
    await expect(page.locator('[data-id="C3"]')).toHaveClass(/copy-source/);
  });

  test('Scenario 14: Copy clears previous copy highlight', async ({ page }) => {
    // Enter data in both cells
    await page.locator('[data-id="B2"]').click();
    await page.keyboard.type('First');
    await page.keyboard.press('Enter');

    await page.locator('[data-id="D4"]').click();
    await page.keyboard.type('Second');
    await page.keyboard.press('Enter');

    // Copy B2
    await page.locator('[data-id="B2"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
    );
    await expect(page.locator('[data-id="B2"]')).toHaveClass(/copy-source/);

    // Copy D4
    await page.locator('[data-id="D4"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
    );

    // B2 should no longer be highlighted
    await expect(page.locator('[data-id="B2"]')).not.toHaveClass(/copy-source/);

    // D4 should be highlighted
    await expect(page.locator('[data-id="D4"]')).toHaveClass(/copy-source/);
  });

  test('Scenario 25: Copy only copies primary range (multi-range)', async ({ page }) => {
    // Create data in two ranges
    await page.locator('[data-id="B2"]').click();
    await page.keyboard.type('A');
    await page.keyboard.press('Tab');
    await page.keyboard.type('B');
    await page.keyboard.press('Enter');

    await page.locator('[data-id="D5"]').click();
    await page.keyboard.type('X');
    await page.keyboard.press('Enter');

    // Multi-select ranges (if supported)
    await page.locator('[data-id="B2"]').click();
    await page.locator('[data-id="C2"]').click({ modifiers: ['Shift'] });
    await page.locator('[data-id="D5"]').click({
      modifiers: process.platform === 'darwin' ? ['Meta'] : ['Control']
    });

    // Copy
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
    );

    // Paste somewhere and verify only last range was copied
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
    );

    // Should paste only D5's value (the last selected range)
    await expect(page.locator('[data-id="A1"]')).toHaveText('X');
  });
});
