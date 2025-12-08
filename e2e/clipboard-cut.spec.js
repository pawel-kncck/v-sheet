import { test, expect } from '@playwright/test';

test.describe('Clipboard - Cut Operations', () => {
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
    const testCells = [
      'A1', 'A2', 'B2', 'B3', 'C2', 'C3', 'D5', 'E5', 'F5', 'E6', 'F6'
    ];
    await clearCells(page, testCells);
  });

  test('Scenario 19: Cut and paste moves data', async ({ page }) => {
    // Enter data in B2
    await page.locator('[data-id="B2"]').click();
    await page.keyboard.type('Move Me');
    await page.keyboard.press('Enter');

    // Cut B2
    await page.locator('[data-id="B2"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+X' : 'Control+X'
    );

    // Paste to D5
    await page.locator('[data-id="D5"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
    );

    // D5 should have the value
    await expect(page.locator('[data-id="D5"]')).toHaveText('Move Me');

    // B2 should be empty
    await expect(page.locator('[data-id="B2"]')).toHaveText('');
  });

  test('Scenario 20: Cut shows cut visual feedback', async ({ page }) => {
    // Fill range B2:C3
    await page.locator('[data-id="B2"]').click();
    await page.keyboard.type('A');
    await page.keyboard.press('Tab');
    await page.keyboard.type('B');
    await page.keyboard.press('Enter');
    await page.locator('[data-id="B3"]').click();
    await page.keyboard.type('C');
    await page.keyboard.press('Tab');
    await page.keyboard.type('D');
    await page.keyboard.press('Enter');

    // Select and cut range
    await page.locator('[data-id="B2"]').click();
    await page.locator('[data-id="C3"]').click({ modifiers: ['Shift'] });
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+X' : 'Control+X'
    );

    // Check for copy-source class (current implementation uses same as copy)
    // In future, could check for cut-specific styling
    await expect(page.locator('[data-id="B2"]')).toHaveClass(/copy-source/);
  });

  test('Scenario 21: Cut range and paste moves entire range', async ({ page }) => {
    // Create source range
    await page.locator('[data-id="B2"]').click();
    await page.keyboard.type('A');
    await page.keyboard.press('Tab');
    await page.keyboard.type('B');
    await page.keyboard.press('Enter');
    await page.locator('[data-id="B3"]').click();
    await page.keyboard.type('C');
    await page.keyboard.press('Tab');
    await page.keyboard.type('D');
    await page.keyboard.press('Enter');

    // Cut range
    await page.locator('[data-id="B2"]').click();
    await page.locator('[data-id="C3"]').click({ modifiers: ['Shift'] });
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+X' : 'Control+X'
    );

    // Paste to E5
    await page.locator('[data-id="E5"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
    );

    // Check destination has values
    await expect(page.locator('[data-id="E5"]')).toHaveText('A');
    await expect(page.locator('[data-id="F5"]')).toHaveText('B');
    await expect(page.locator('[data-id="E6"]')).toHaveText('C');
    await expect(page.locator('[data-id="F6"]')).toHaveText('D');

    // Check source is empty
    await expect(page.locator('[data-id="B2"]')).toHaveText('');
    await expect(page.locator('[data-id="C2"]')).toHaveText('');
    await expect(page.locator('[data-id="B3"]')).toHaveText('');
    await expect(page.locator('[data-id="C3"]')).toHaveText('');
  });
});
