import { test, expect } from '@playwright/test';

test.describe('Editor Resize', () => {
  test('editor resizes when adding cell references via arrow keys in PointMode', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Given: User starts building a formula
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('=');

    const editor = page.locator('#cell-editor');
    await expect(editor).toBeVisible();

    // Get initial width
    const initialWidth = await editor.evaluate(el => el.offsetWidth);

    // When: User presses arrow keys to add cell references
    await page.keyboard.press('ArrowRight'); // Selects B1
    await expect(editor).toHaveValue('=B1');

    // Get width after first reference
    const widthAfterB1 = await editor.evaluate(el => el.offsetWidth);
    expect(widthAfterB1).toBeGreaterThanOrEqual(initialWidth);

    // Type an operator (arrow keys reset to editing cell after operator)
    await page.keyboard.type('+');
    await expect(editor).toHaveValue('=B1+');

    // Navigate from editing cell (A1) with arrow key
    await page.keyboard.press('ArrowRight'); // From A1 -> B1
    await page.keyboard.press('ArrowRight'); // From B1 -> C1
    await expect(editor).toHaveValue('=B1+C1');

    // Get width after full formula - should be at least as wide
    const widthAfterFormula = await editor.evaluate(el => el.offsetWidth);
    expect(widthAfterFormula).toBeGreaterThanOrEqual(widthAfterB1);
  });

  test('editor resizes when adding cell references via mouse clicks in PointMode', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Given: User starts building a formula
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('=');

    const editor = page.locator('#cell-editor');
    await expect(editor).toBeVisible();

    // Get initial width
    const initialWidth = await editor.evaluate(el => el.offsetWidth);

    // When: User clicks on a cell to add reference
    await page.locator('[data-id="D5"]').click();
    await expect(editor).toHaveValue('=D5');

    // Get width after reference
    const widthAfterD5 = await editor.evaluate(el => el.offsetWidth);
    expect(widthAfterD5).toBeGreaterThanOrEqual(initialWidth);

    // Type an operator
    await page.keyboard.type('*');
    await expect(editor).toHaveValue('=D5*');

    // Click another cell
    await page.locator('[data-id="E10"]').click();
    await expect(editor).toHaveValue('=D5*E10');

    // Get width after full formula - should be at least as wide
    const widthAfterFormula = await editor.evaluate(el => el.offsetWidth);
    expect(widthAfterFormula).toBeGreaterThanOrEqual(widthAfterD5);
  });

  test('editor resizes when building range reference', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Given: User starts building a formula
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('=SUM(');

    const editor = page.locator('#cell-editor');

    // When: User navigates to select a cell
    await page.keyboard.press('ArrowRight'); // Select B1
    await expect(editor).toHaveValue('=SUM(B1');

    const widthAfterB1 = await editor.evaluate(el => el.offsetWidth);

    // Type colon to start range
    await page.keyboard.type(':');
    await expect(editor).toHaveValue('=SUM(B1:');

    // Click on end cell to complete range
    await page.locator('[data-id="D5"]').click();
    await expect(editor).toHaveValue('=SUM(B1:D5');

    // Width should have increased for the range
    const widthAfterRange = await editor.evaluate(el => el.offsetWidth);
    expect(widthAfterRange).toBeGreaterThan(widthAfterB1);

    // Close the function
    await page.keyboard.type(')');
    await expect(editor).toHaveValue('=SUM(B1:D5)');

    // Width should accommodate full formula
    const finalWidth = await editor.evaluate(el => el.offsetWidth);
    expect(finalWidth).toBeGreaterThanOrEqual(widthAfterRange);
  });

  test('editor resizes smoothly with mix of typing and navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Given: User starts with typed formula
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('=AVERAGE(');

    const editor = page.locator('#cell-editor');
    const widthAfterTyping = await editor.evaluate(el => el.offsetWidth);

    // Add reference via arrow key
    await page.keyboard.press('ArrowRight'); // B1
    await expect(editor).toHaveValue('=AVERAGE(B1');
    const widthAfterNav = await editor.evaluate(el => el.offsetWidth);
    expect(widthAfterNav).toBeGreaterThan(widthAfterTyping);

    // Type comma
    await page.keyboard.type(',');

    // Add reference via mouse
    await page.locator('[data-id="C3"]').click();
    await expect(editor).toHaveValue('=AVERAGE(B1,C3');
    const widthAfterClick = await editor.evaluate(el => el.offsetWidth);
    expect(widthAfterClick).toBeGreaterThan(widthAfterNav);

    // Type closing paren
    await page.keyboard.type(')');
    await expect(editor).toHaveValue('=AVERAGE(B1,C3)');

    // Verify width expanded throughout
    const finalWidth = await editor.evaluate(el => el.offsetWidth);
    expect(finalWidth).toBeGreaterThanOrEqual(widthAfterClick);
  });
});
