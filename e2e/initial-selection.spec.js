import { test, expect } from '@playwright/test';

test.describe('Initial Selection on Load', () => {
  test('Should restore the last active cell when loading an existing file', async ({ page }) => {
    // Just load the app (it will load the most recent file)
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Give it a moment to initialize
    await page.waitForTimeout(500);

    // Get the active cell from the selection manager
    const selectionState = await page.evaluate(() => {
      const spreadsheet = window.spreadsheet;
      if (spreadsheet && spreadsheet.selectionManager) {
        return {
          activeCell: spreadsheet.selectionManager.activeCell,
          activeCellId: spreadsheet.selectionManager.getActiveCellId(),
          ranges: spreadsheet.selectionManager.ranges
        };
      }
      return null;
    });

    // Verify we have an active cell
    expect(selectionState).not.toBeNull();
    expect(selectionState.activeCell).toBeTruthy();
    expect(selectionState.activeCellId).toBeTruthy();

    // Verify the active cell has the selected class
    const activeCell = page.locator(`[data-id="${selectionState.activeCellId}"]`);
    await expect(activeCell).toHaveClass(/selected/);
  });

  test('Clicking a cell should select it', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');
    await page.waitForTimeout(500);

    // Click on A1
    const cellA1 = page.locator('[data-id="A1"]');
    await cellA1.click();

    // Verify A1 is now selected
    await expect(cellA1).toHaveClass(/selected/);
  });
});
