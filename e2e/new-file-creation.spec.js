import { test, expect } from '@playwright/test';

test.describe('New File Creation and Grid Initialization', () => {
  test('Creates new file, verifies grid alignment and active cell, then performs basic data entry with formula', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Create a new file
    // 1. Click the file selector button to open the dropdown
    await page.locator('#file-selector-button').click();

    // 2. Handle the prompt dialog and create new file
    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('prompt');
      expect(dialog.message()).toBe('Enter file name:');
      await dialog.accept('Test File');
    });

    // Wait for POST request when creating file
    const postResponsePromise = page.waitForResponse(response =>
      response.url().includes('/api/files') && response.request().method() === 'POST'
    );

    // Click the "New File" button (this will trigger the prompt)
    await page.locator('#new-file-btn').click();

    // Wait for the POST to complete
    await postResponsePromise;

    // Wait for the file list to reload (GET request after POST)
    await page.waitForResponse(response =>
      response.url().includes('/api/files') && response.request().method() === 'GET'
    );

    // ===== Test 1: Grid Alignment =====
    // Verify Column A is visible (first column header should show "A")
    const columnHeaders = page.locator('#column-headers');
    await expect(columnHeaders).toBeVisible();

    // Check that the first visible column header contains "A"
    const firstColumnHeader = columnHeaders.locator('.header-cell').first();
    await expect(firstColumnHeader).toHaveText('A');

    // Verify Row 1 is visible (first row header should show "1")
    const rowHeaders = page.locator('#row-headers');
    await expect(rowHeaders).toBeVisible();

    // Check that the first visible row header contains "1"
    const firstRowHeader = rowHeaders.locator('.header-cell').first();
    await expect(firstRowHeader).toHaveText('1');

    // ===== Test 2: Cell A1 is Active =====
    const cellA1 = page.locator('[data-id="A1"]');

    // Check that A1 exists and is visible
    await expect(cellA1).toBeVisible();

    // Check that A1 has the selected class
    await expect(cellA1).toHaveClass(/selected/);

    // Check that A1 has a blue border (visual indication)
    // The CSS defines: .cell.selected { border: 1px solid #0e65eb; }
    const borderColor = await cellA1.evaluate((el) => {
      return window.getComputedStyle(el).borderColor;
    });
    // #0e65eb is rgb(14, 101, 235)
    expect(borderColor).toBe('rgb(14, 101, 235)');

    // ===== Test 3: Data Entry and Formula =====
    // User types 10, presses Enter
    await page.keyboard.type('10');
    await page.keyboard.press('Enter');

    // User types 20, presses arrow key down
    await page.keyboard.type('20');
    await page.keyboard.press('ArrowDown');

    // User types "=A1+A2", presses enter
    await page.keyboard.type('=A1+A2');
    await page.keyboard.press('Enter');

    // ===== Test 4: Verify Values and Formula =====
    // Verify A1 has value "10"
    await expect(page.locator('[data-id="A1"]')).toHaveText('10');

    // Verify A2 has value "20"
    await expect(page.locator('[data-id="A2"]')).toHaveText('20');

    // Verify A3 displays the calculated result "30"
    await expect(page.locator('[data-id="A3"]')).toHaveText('30');

    // Verify A3 contains the formula "=A1+A2"
    // Click on A3 and press F2 to edit and see the formula
    await page.locator('[data-id="A3"]').click();
    await page.keyboard.press('F2');

    const editor = page.locator('#cell-editor');
    await expect(editor).toHaveValue('=A1+A2');

    // ===== Cleanup: Delete the test file =====
    // Press Escape to exit edit mode
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    // Open the file dropdown
    await page.locator('#file-selector-button').click();

    // Wait for dropdown to be visible
    const deleteBtn = page.locator('#delete-file-btn');
    await expect(deleteBtn).toBeVisible();

    // Set up confirmation dialog handler
    page.once('dialog', async dialog => {
      await dialog.accept();
    });

    // Click delete button
    await deleteBtn.click();

    // Give the delete operation time to complete
    await page.waitForTimeout(500);
  });
});
