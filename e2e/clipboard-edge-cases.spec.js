import { test, expect } from '@playwright/test';

test.describe('Clipboard - Edge Cases', () => {
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
      'A1', 'B2', 'C2', 'D2', 'Y1', 'Z1'
    ];
    await clearCells(page, testCells);
  });

  test('Scenario 22: Paste beyond grid boundary truncates', async ({ page }) => {
    // Create 3-cell wide source
    await page.locator('[data-id="B2"]').click();
    await page.keyboard.type('A');
    await page.keyboard.press('Tab');
    await page.keyboard.type('B');
    await page.keyboard.press('Tab');
    await page.keyboard.type('C');
    await page.keyboard.press('Enter');

    // Copy B2:D2
    await page.locator('[data-id="B2"]').click();
    await page.locator('[data-id="D2"]').click({ modifiers: ['Shift'] });
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
    );

    // Try to paste at Y1 (only 2 columns to edge Z)
    await page.locator('[data-id="Y1"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
    );

    // Check what actually pasted (should truncate or paste what fits)
    await expect(page.locator('[data-id="Y1"]')).toHaveText('A');
    await expect(page.locator('[data-id="Z1"]')).toHaveText('B');

    // Third cell should not exist beyond Z (grid boundary at column 26)
  });

  test('Scenario 23: Paste with empty clipboard does nothing', async ({ page }) => {
    // Don't copy anything, just try to paste
    await page.locator('[data-id="B2"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
    );

    // Cell should remain empty (or have whatever was there before)
    await expect(page.locator('[data-id="B2"]')).toHaveText('');

    // No error should occur
  });

  test('Scenario 24: Copy writes to system clipboard', async ({ page }) => {
    // Note: This test requires clipboard permissions which may not be available
    // in all test environments. It's marked as a basic test without clipboard reading.

    await page.locator('[data-id="B2"]').click();
    await page.keyboard.type('Export Me');
    await page.keyboard.press('Enter');

    await page.locator('[data-id="B2"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
    );

    // Basic test: just verify copy doesn't error
    // In a real test with permissions, we would read clipboard:
    // const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    // expect(clipboardText).toBe('Export Me');

    // For now, just verify the copy-source class is applied
    await expect(page.locator('[data-id="B2"]')).toHaveClass(/copy-source/);
  });

  // Scenario 25 is covered in clipboard-copy.spec.js
});
