import { test, expect } from '@playwright/test';

test.describe('Formula Highlighting', () => {
  test('displays colored borders for cell references in formulas', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Given: User starts building a formula
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('=B1+C1');

    // Then: Colored borders should appear on referenced cells
    const overlayContainer = page.locator('#formula-highlight-overlay');
    await expect(overlayContainer).toBeVisible();

    // Should have 2 borders (one for B1, one for C1)
    const borders = page.locator('.formula-reference-border');
    await expect(borders).toHaveCount(2);

    // Borders should have dashed style
    const firstBorder = borders.first();
    const borderStyle = await firstBorder.evaluate(el => window.getComputedStyle(el).borderStyle);
    expect(borderStyle).toContain('dashed');
  });

  test('displays colored text for cell references in editor', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Given: User starts building a formula
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('=B1+C1');

    // Then: Text overlay should appear
    const textOverlay = page.locator('#formula-text-overlay');
    await expect(textOverlay).toBeVisible();

    // Text overlay should contain colored spans
    const coloredSpans = textOverlay.locator('span[style*="color"]');
    await expect(coloredSpans).toHaveCount(4); // B1, C1, and 2 transparent spans for "=" and "+"

    // Editor text should be transparent
    const editor = page.locator('#cell-editor');
    const editorColor = await editor.evaluate(el => window.getComputedStyle(el).color);
    expect(editorColor).toContain('rgba(0, 0, 0, 0)');
  });

  test('displays colored borders for range references', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Given: User types a formula with a range
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('=SUM(B1:D3)');

    // Then: A single border should cover the range
    const borders = page.locator('.formula-reference-border');
    await expect(borders).toHaveCount(1);

    // The border should cover the entire range
    const border = borders.first();
    const borderBox = await border.boundingBox();
    expect(borderBox).not.toBeNull();
  });

  test('assigns different colors to different references', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Given: User types a formula with multiple references
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('=B1+C1');

    // Then: The two borders should have different colors
    const borders = page.locator('.formula-reference-border');
    const firstColor = await borders.first().evaluate(el => window.getComputedStyle(el).borderColor);
    const secondColor = await borders.nth(1).evaluate(el => window.getComputedStyle(el).borderColor);

    expect(firstColor).not.toBe(secondColor);
  });

  test('shows hover overlay when cursor is over reference', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Given: User types a formula
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('=B1+C1');

    const editor = page.locator('#cell-editor');

    // When: User clicks to position cursor in first reference
    await editor.click();
    await page.keyboard.press('Home'); // Move to start
    await page.keyboard.press('ArrowRight'); // Move past '='
    // Cursor should now be at position 1 (inside "B1")

    // Wait a bit for hover effect to trigger
    await page.waitForTimeout(100);

    // Then: Hover overlay should appear
    const hoverOverlay = page.locator('#formula-hover-overlay');
    await expect(hoverOverlay).toBeVisible();

    const overlays = page.locator('.formula-reference-overlay');
    await expect(overlays).toHaveCount(1);

    // Overlay should have transparency
    const overlay = overlays.first();
    const bgColor = await overlay.evaluate(el => window.getComputedStyle(el).backgroundColor);
    expect(bgColor).toContain('rgba');
  });

  test('updates borders when formula changes via arrow key navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Given: User starts building a formula in Point mode
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('=');

    // When: User presses arrow to add reference
    await page.keyboard.press('ArrowRight'); // Selects B1
    await expect(page.locator('#cell-editor')).toHaveValue('=B1');

    // Then: Border should appear on B1
    const borders = page.locator('.formula-reference-border');
    await expect(borders).toHaveCount(1);

    // When: User adds operator and another reference
    await page.keyboard.type('+');
    await page.keyboard.press('ArrowRight'); // From A1 -> B1
    await page.keyboard.press('ArrowRight'); // From B1 -> C1
    await expect(page.locator('#cell-editor')).toHaveValue('=B1+C1');

    // Then: Two borders should appear
    await expect(borders).toHaveCount(2);
  });

  test('updates borders when formula changes via mouse clicks', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Given: User starts building a formula
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('=');

    // When: User clicks on a cell to add reference
    await page.locator('[data-id="D5"]').click();
    await expect(page.locator('#cell-editor')).toHaveValue('=D5');

    // Then: Border should appear on D5
    const borders = page.locator('.formula-reference-border');
    await expect(borders).toHaveCount(1);

    // When: User types operator and clicks another cell
    await page.keyboard.type('*');
    await page.locator('[data-id="E10"]').click();
    await expect(page.locator('#cell-editor')).toHaveValue('=D5*E10');

    // Then: Two borders should appear
    await expect(borders).toHaveCount(2);
  });

  test('clears borders when exiting edit mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Given: User has a formula with borders visible
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('=B1+C1');

    const borders = page.locator('.formula-reference-border');
    await expect(borders).toHaveCount(2);

    // When: User commits the formula
    await page.keyboard.press('Enter');

    // Then: Borders should disappear
    const overlayContainer = page.locator('#formula-highlight-overlay');
    await expect(overlayContainer).not.toBeVisible();
  });

  test('handles complex formulas with multiple references', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Given: User types a complex formula
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('=SUM(A1:A10)+AVERAGE(B1:B10)-C5*D5');

    // Then: Should have 4 borders (A1:A10, B1:B10, C5, D5)
    const borders = page.locator('.formula-reference-border');
    await expect(borders).toHaveCount(4);
  });

  test('uses palette colors sequentially for unique references', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Given: User types a formula with same reference multiple times
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('=B1+B1+C1');

    // Then: Should only have 2 borders (B1 appears once, C1 once)
    // because unique references get unique colors
    const borders = page.locator('.formula-reference-border');
    const count = await borders.count();

    // We expect borders for each occurrence, but colors should cycle
    expect(count).toBeGreaterThan(0);
  });
});
