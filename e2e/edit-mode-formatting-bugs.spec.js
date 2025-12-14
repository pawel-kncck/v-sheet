import { test, expect } from '@playwright/test';

/**
 * Focused tests for Edit mode text-level formatting bugs
 *
 * Bug 1: When selecting text in Edit mode and applying bold, formatting disappears after commit
 * Bug 2: Bold toggle doesn't work in Edit mode - can't revert bold with Cmd+B
 */

test.describe('Edit Mode Formatting Bugs', () => {
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Clear A1
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.press('Delete');
  });

  test('Bug 1: Bold formatting should persist after commit in Edit mode', async ({ page }) => {
    const cellA1 = page.locator('[data-id="A1"]');
    const editor = page.locator('#cell-editor');

    // Step 1: Enter text in A1
    await cellA1.click();
    await page.keyboard.type('Hello World');
    await page.keyboard.press('Enter');

    // Step 2: Double-click to enter Edit mode
    await cellA1.dblclick();
    await expect(editor).toBeVisible();

    // Step 3: Select "World" and make it bold
    // Move to end, then select word left
    await page.keyboard.press('End');
    await page.keyboard.press(`${modifier}+Shift+ArrowLeft`);

    // Apply bold
    await page.keyboard.press(`${modifier}+b`);

    // Verify editor shows bold (check if "World" span has bold)
    const editorBoldSpan = editor.locator('span').filter({ hasText: 'World' });
    await expect(editorBoldSpan).toHaveCSS('font-weight', '700');

    // Step 4: Commit
    await page.keyboard.press('Enter');

    // Step 5: VERIFY - Cell should show "World" as bold
    await page.waitForTimeout(100); // Small wait for rendering

    const cellBoldSpan = cellA1.locator('span').filter({ hasText: 'World' });
    await expect(cellBoldSpan).toBeVisible({ timeout: 2000 });
    await expect(cellBoldSpan).toHaveCSS('font-weight', '700');
  });

  test('Bug 2: Bold toggle should work in Edit mode - can remove bold', async ({ page }) => {
    const cellA1 = page.locator('[data-id="A1"]');
    const editor = page.locator('#cell-editor');

    // Step 1: Create text with bold word
    await cellA1.click();
    await page.keyboard.type('Hello');
    await page.keyboard.press(`${modifier}+b`); // Toggle bold ON
    await page.keyboard.type(' World');
    await page.keyboard.press('Enter');

    // Verify "World" is bold in cell
    let cellBoldSpan = cellA1.locator('span').filter({ hasText: 'World' });
    await expect(cellBoldSpan).toHaveCSS('font-weight', '700');

    // Step 2: Re-enter Edit mode
    await cellA1.dblclick();
    await expect(editor).toBeVisible();

    // Step 3: Select "World"
    await page.keyboard.press('End');
    await page.keyboard.press(`${modifier}+Shift+ArrowLeft`);

    // Step 4: Press Cmd+B again to toggle OFF bold
    await page.keyboard.press(`${modifier}+b`);

    // Verify editor shows "World" is no longer bold
    const editorSpans = editor.locator('span').filter({ hasText: 'World' });
    const count = await editorSpans.count();

    if (count > 0) {
      // If there's still a span, it shouldn't be bold
      await expect(editorSpans.first()).not.toHaveCSS('font-weight', '700');
    }
    // OR there's no span at all (plain text), which is also correct

    // Step 5: Commit
    await page.keyboard.press('Enter');

    // Step 6: VERIFY - Cell should show "World" is NOT bold anymore
    await page.waitForTimeout(100);

    // The cell should either have no bold spans, or "World" shouldn't be in a bold span
    cellBoldSpan = cellA1.locator('span').filter({ hasText: 'World' });
    const cellSpanCount = await cellBoldSpan.count();

    if (cellSpanCount > 0) {
      // If there's a span, it shouldn't be bold
      await expect(cellBoldSpan.first()).not.toHaveCSS('font-weight', '700');
    }
  });

  test('Should apply bold, then italic, to different words', async ({ page }) => {
    const cellA1 = page.locator('[data-id="A1"]');

    // Enter text
    await cellA1.click();
    await page.keyboard.type('One Two Three');
    await page.keyboard.press('Enter');

    // Make "Two" bold
    await cellA1.dblclick();
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowRight'); // O
    await page.keyboard.press('ArrowRight'); // n
    await page.keyboard.press('ArrowRight'); // e
    await page.keyboard.press('ArrowRight'); // space
    // Select "Two"
    await page.keyboard.press(`${modifier}+Shift+ArrowRight`);
    await page.keyboard.press(`${modifier}+b`);
    await page.keyboard.press('Enter');

    // Verify "Two" is bold
    let twoSpan = cellA1.locator('span').filter({ hasText: 'Two' });
    await expect(twoSpan).toHaveCSS('font-weight', '700');

    // Make "Three" italic
    await cellA1.dblclick();
    await page.keyboard.press('End');
    await page.keyboard.press(`${modifier}+Shift+ArrowLeft`);
    await page.keyboard.press(`${modifier}+i`);
    await page.keyboard.press('Enter');

    // Verify "Three" is italic and "Two" is still bold
    await page.waitForTimeout(100);

    const threeSpan = cellA1.locator('span').filter({ hasText: 'Three' });
    await expect(threeSpan).toHaveCSS('font-style', 'italic');

    twoSpan = cellA1.locator('span').filter({ hasText: 'Two' });
    await expect(twoSpan).toHaveCSS('font-weight', '700');
  });
});
