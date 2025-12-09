/**
 * E2E tests for formula bar synchronization issues
 */
import { test, expect } from '@playwright/test';

test.describe('Formula Bar Sync Issues', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');
  });

  test('Bug: Cell editor and formula bar should stay in sync when typing formula', async ({ page }) => {
    // Click on A1
    await page.locator('[data-id="A1"]').click();

    const cellEditor = page.locator('#cell-editor');
    const formulaBar = page.locator('#formula-input');

    // Type "="
    await page.keyboard.type('=');

    // Check that "=" is visible in both cell editor and formula bar
    await expect(cellEditor).toHaveValue('=');
    await expect(formulaBar).toHaveValue('=');
    // Also check that the editor is actually visible
    await expect(cellEditor).toBeVisible();

    // Type "S"
    await page.keyboard.type('S');

    // Check that "=S" is visible in both cell editor and formula bar
    // This is where the bug occurs: cell editor goes blank
    await expect(cellEditor).toHaveValue('=S');
    await expect(formulaBar).toHaveValue('=S');
    // Verify the editor is still visible
    await expect(cellEditor).toBeVisible();
    // When formula highlighting is active, editor text is transparent and colored overlay shows
    const textOverlay = page.locator('#formula-text-overlay');
    await expect(textOverlay).toBeVisible();

    // Type "U"
    await page.keyboard.type('U');

    // Check that "=SU" is visible in both
    await expect(cellEditor).toHaveValue('=SU');
    await expect(formulaBar).toHaveValue('=SU');
    await expect(cellEditor).toBeVisible();

    // Type "M"
    await page.keyboard.type('M');

    // Check that "=SUM" is visible in both
    await expect(cellEditor).toHaveValue('=SUM');
    await expect(formulaBar).toHaveValue('=SUM');
    await expect(cellEditor).toBeVisible();
  });

  test('Formula bar should show formula immediately when entering PointMode', async ({ page }) => {
    await page.locator('[data-id="A1"]').click();

    const formulaBar = page.locator('#formula-input');

    // Type "=" to enter PointMode
    await page.keyboard.type('=');

    // Formula bar should immediately show "="
    await expect(formulaBar).toHaveValue('=');
  });

  test('Cell editor and formula bar sync during navigation in PointMode', async ({ page }) => {
    await page.locator('[data-id="A1"]').click();

    const cellEditor = page.locator('#cell-editor');
    const formulaBar = page.locator('#formula-input');

    // Start building formula
    await page.keyboard.type('=');
    await page.keyboard.press('ArrowRight');

    // Both should show "=B1"
    await expect(cellEditor).toHaveValue('=B1');
    await expect(formulaBar).toHaveValue('=B1');

    // Type operator
    await page.keyboard.type('+');

    // Both should show "=B1+"
    await expect(cellEditor).toHaveValue('=B1+');
    await expect(formulaBar).toHaveValue('=B1+');

    // Navigate again
    await page.keyboard.press('ArrowDown');

    // Both should show "=B1+A2"
    await expect(cellEditor).toHaveValue('=B1+A2');
    await expect(formulaBar).toHaveValue('=B1+A2');
  });
});
