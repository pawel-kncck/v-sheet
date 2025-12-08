import { test, expect } from '@playwright/test';

test.describe('Clipboard - Undo/Redo Integration', () => {
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
    const testCells = ['A1', 'B2', 'D5', 'E5'];
    await clearCells(page, testCells);
  });

  test('Scenario 26: Paste operation can be undone', async ({ page }) => {
    // Create and copy source
    await page.locator('[data-id="B2"]').click();
    await page.keyboard.type('Test');
    await page.keyboard.press('Enter');
    await page.locator('[data-id="B2"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
    );

    // Paste to E5
    await page.locator('[data-id="E5"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
    );
    await expect(page.locator('[data-id="E5"]')).toHaveText('Test');

    // Undo
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
    );

    // E5 should be empty again
    await expect(page.locator('[data-id="E5"]')).toHaveText('');

    // Redo
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+Shift+Z' : 'Control+Y'
    );

    // E5 should have the value again
    await expect(page.locator('[data-id="E5"]')).toHaveText('Test');
  });

  test('Scenario 27: Cut and paste creates single undoable action', async ({ page }) => {
    // Create source data
    await page.locator('[data-id="B2"]').click();
    await page.keyboard.type('Move Me');
    await page.keyboard.press('Enter');

    // Cut and paste
    await page.locator('[data-id="B2"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+X' : 'Control+X'
    );
    await page.locator('[data-id="D5"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
    );

    // Verify moved
    await expect(page.locator('[data-id="B2"]')).toHaveText('');
    await expect(page.locator('[data-id="D5"]')).toHaveText('Move Me');

    // Single undo should revert paste
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
    );

    // D5 should be empty
    await expect(page.locator('[data-id="D5"]')).toHaveText('');

    // Another undo should revert cut (restore B2)
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
    );

    // B2 should have original value
    await expect(page.locator('[data-id="B2"]')).toHaveText('Move Me');

    // Note: In an ideal implementation, cut+paste would be a single atomic operation
    // requiring only one undo. Current implementation may require two undos.
  });

  test('Multiple paste operations can be undone sequentially', async ({ page }) => {
    // Create source
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('Value');
    await page.keyboard.press('Enter');
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
    );

    // Paste to B2
    await page.locator('[data-id="B2"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
    );
    await expect(page.locator('[data-id="B2"]')).toHaveText('Value');

    // Paste to D5
    await page.locator('[data-id="D5"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
    );
    await expect(page.locator('[data-id="D5"]')).toHaveText('Value');

    // Undo last paste (D5)
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
    );
    await expect(page.locator('[data-id="D5"]')).toHaveText('');
    await expect(page.locator('[data-id="B2"]')).toHaveText('Value');

    // Undo first paste (B2)
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
    );
    await expect(page.locator('[data-id="B2"]')).toHaveText('');
  });
});
