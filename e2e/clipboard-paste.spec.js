import { test, expect } from '@playwright/test';

test.describe('Clipboard - Paste Operations', () => {
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
      'A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'B4',
      'C1', 'C2', 'C3', 'C4', 'C5',
      'D1', 'D2', 'D4', 'D5', 'E5', 'F5', 'E6', 'F6'
    ];
    await clearCells(page, testCells);
  });

  test('Scenario 15: Paste single cell', async ({ page }) => {
    // Enter and copy B2
    await page.locator('[data-id="B2"]').click();
    await page.keyboard.type('Hello');
    await page.keyboard.press('Enter');
    await page.locator('[data-id="B2"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
    );

    // Paste to D5
    await page.locator('[data-id="D5"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
    );

    // Check D5 has the value
    await expect(page.locator('[data-id="D5"]')).toHaveText('Hello');

    // B2 should still have the value
    await expect(page.locator('[data-id="B2"]')).toHaveText('Hello');
  });

  test('Scenario 16: Paste range', async ({ page }) => {
    // Create 2x2 source range
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

    // Copy range
    await page.locator('[data-id="B2"]').click();
    await page.locator('[data-id="C3"]').click({ modifiers: ['Shift'] });
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
    );

    // Paste to E5
    await page.locator('[data-id="E5"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
    );

    // Verify pasted values
    await expect(page.locator('[data-id="E5"]')).toHaveText('100');
    await expect(page.locator('[data-id="F5"]')).toHaveText('200');
    await expect(page.locator('[data-id="E6"]')).toHaveText('300');
    await expect(page.locator('[data-id="F6"]')).toHaveText('400');

    // Original range should be unchanged
    await expect(page.locator('[data-id="B2"]')).toHaveText('100');
    await expect(page.locator('[data-id="C3"]')).toHaveText('400');
  });

  test('Scenario 17: Paste formula with relative reference adjustment', async ({ page }) => {
    // Set up source cells
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('10');
    await page.keyboard.press('Enter');
    await page.keyboard.type('20');
    await page.keyboard.press('Enter');

    // Create formula in B2
    await page.locator('[data-id="B2"]').click();
    await page.keyboard.type('=A1+A2');
    await page.keyboard.press('Enter');

    // Verify B2 shows 30
    await expect(page.locator('[data-id="B2"]')).toHaveText('30');

    // Copy B2
    await page.locator('[data-id="B2"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
    );

    // Set up destination reference cells
    await page.locator('[data-id="C4"]').click();
    await page.keyboard.type('100');
    await page.keyboard.press('Enter');
    await page.keyboard.type('200');
    await page.keyboard.press('Enter');

    // Paste to D5
    await page.locator('[data-id="D5"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
    );

    // D5 should show 300 (C4=100 + C5=200)
    await expect(page.locator('[data-id="D5"]')).toHaveText('300');
  });

  test('Scenario 17.1: Paste formula with absolute reference unchanged', async ({ page }) => {
    // Set up source cells
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('10');
    await page.keyboard.press('Enter');
    await page.keyboard.type('30');
    await page.keyboard.press('Enter');

    // Create formula with absolute references
    await page.keyboard.type('=$A$1+$A$2');
    await page.keyboard.press('Enter');

    // Verify A3 shows 40
    await expect(page.locator('[data-id="A3"]')).toHaveText('40');

    // Copy A3
    await page.locator('[data-id="A3"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
    );

    // Paste to B3
    await page.locator('[data-id="B3"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
    );

    // B3 should still show 40 (references didn't adjust)
    await expect(page.locator('[data-id="B3"]')).toHaveText('40');
  });

  test('Scenario 17.2: Paste formula with column-absolute reference', async ({ page }) => {
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('100');
    await page.keyboard.press('Enter');
    await page.keyboard.type('200');
    await page.keyboard.press('Enter');

    // Create formula with column-absolute reference
    await page.keyboard.type('=$A1');
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-id="A3"]')).toHaveText('100');

    // Copy A3
    await page.locator('[data-id="A3"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
    );

    // Paste to B4
    await page.locator('[data-id="B4"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
    );

    // B4 should reference A2 (column locked, row adjusted)
    await expect(page.locator('[data-id="B4"]')).toHaveText('200');
  });

  test('Scenario 17.3: Paste formula with row-absolute reference', async ({ page }) => {
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('10');
    await page.keyboard.press('Tab');
    await page.keyboard.type('20');
    await page.keyboard.press('Enter');

    await page.locator('[data-id="A3"]').click();
    await page.keyboard.type('=A$1');
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-id="A3"]')).toHaveText('10');

    // Copy A3
    await page.locator('[data-id="A3"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
    );

    // Paste to B4
    await page.locator('[data-id="B4"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
    );

    // B4 should reference B1 (row locked, column adjusted)
    await expect(page.locator('[data-id="B4"]')).toHaveText('20');
  });

  test('Scenario 17.4: Paste formula with mixed references', async ({ page }) => {
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('10');
    await page.keyboard.press('Enter');

    await page.locator('[data-id="B2"]').click();
    await page.keyboard.type('20');
    await page.keyboard.press('Enter');

    await page.locator('[data-id="A3"]').click();
    await page.keyboard.type('=$A$1+B2');
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-id="A3"]')).toHaveText('30');

    // Copy A3
    await page.locator('[data-id="A3"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
    );

    // Set up C3 for testing
    await page.locator('[data-id="C3"]').click();
    await page.keyboard.type('50');
    await page.keyboard.press('Enter');

    // Paste to B4
    await page.locator('[data-id="B4"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
    );

    // B4 should show 60 (A1=10 + C3=50)
    await expect(page.locator('[data-id="B4"]')).toHaveText('60');
  });

  // Note: Scenario 18 (Paste Styles) is skipped as it requires the formatting system
  // which is not yet fully implemented
});
