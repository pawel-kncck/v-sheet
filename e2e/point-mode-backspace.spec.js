import { test, expect } from '@playwright/test';

test.describe('PointMode - Backspace', () => {
  test('backspace deletes characters in PointMode', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Given: User starts building a formula in PointMode
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('=A1+');

    const editor = page.locator('#cell-editor');
    await expect(editor).toHaveValue('=A1+');

    // When: User presses Backspace to delete the "+"
    await page.keyboard.press('Backspace');

    // Then: The "+" should be deleted
    await expect(editor).toHaveValue('=A1');

    // And: User can continue typing
    await page.keyboard.type('-B2');
    await expect(editor).toHaveValue('=A1-B2');
  });

  test('backspace works after typing operator', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Given: User builds formula and types an operator
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('=');

    // Navigate to select B1
    await page.keyboard.press('ArrowRight');

    const editor = page.locator('#cell-editor');
    await expect(editor).toHaveValue('=B1');

    // Type an operator
    await page.keyboard.type('+');
    await expect(editor).toHaveValue('=B1+');

    // When: User immediately presses Backspace to undo the operator
    await page.keyboard.press('Backspace');

    // Then: The "+" should be deleted
    await expect(editor).toHaveValue('=B1');

    // And: User can type a different operator
    await page.keyboard.type('*');
    await expect(editor).toHaveValue('=B1*');
  });

  test('backspace deletes cell reference character by character', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Given: User types a formula directly
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('=B10');

    const editor = page.locator('#cell-editor');
    await expect(editor).toHaveValue('=B10');

    // When: User presses Backspace twice
    await page.keyboard.press('Backspace');
    await expect(editor).toHaveValue('=B1');

    await page.keyboard.press('Backspace');
    await expect(editor).toHaveValue('=B');

    // Then: User can type new reference
    await page.keyboard.type('2');
    await expect(editor).toHaveValue('=B2');
  });

  test('backspace on "=" leaves empty editor', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Given: User types "=" to enter PointMode
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('=');

    const editor = page.locator('#cell-editor');
    await expect(editor).toHaveValue('=');

    // When: User presses Backspace to delete "="
    await page.keyboard.press('Backspace');

    // Then: Editor should have empty value (browser behavior)
    await expect(editor).toHaveValue('');

    // And: User can press Escape to cancel
    await page.keyboard.press('Escape');
    await expect(editor).not.toBeVisible();
  });
});
