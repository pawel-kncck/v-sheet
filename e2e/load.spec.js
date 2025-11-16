import { test, expect } from '@playwright/test';

test.describe('Critical Path 1: Application Load', () => {
  test('should load the application and render the grid', async ({ page }) => {
    // 1. Go to the base URL (http://localhost:5000)
    // The webServer config in playwright.config.js ensures the server is running.
    await page.goto('/');

    // 2. Wait for the file manager to load the recent file
    // We know from file-manager.js that it hits this endpoint on init.
    await page.waitForResponse('**/api/recent');

    // 3. Check that the main spreadsheet container is visible
    const gridContainer = page.locator('#spreadsheet-container');
    await expect(gridContainer).toBeVisible();

    // 4. Check that the first cell 'A1' is rendered in the grid
    const cellA1 = page.locator('[data-id="A1"]');
    await expect(cellA1).toBeVisible();

    // 5. Check that the file name has loaded and is not "Loading..."
    const currentFileName = page.locator('#current-file-name');
    await expect(currentFileName).not.toHaveText('Loading...');
  });
});
