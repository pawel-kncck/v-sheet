import { test, expect } from '@playwright/test';

test.describe('Automatic Cell Alignment', () => {
  test('Numbers should align right, text should align left', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Click on A1
    await page.locator('[data-id="A1"]').click();

    // Test 1: Enter a number - should align right
    await page.keyboard.type('123');
    await page.keyboard.press('Enter');

    let cellA1 = page.locator('[data-id="A1"]');
    let alignment = await cellA1.evaluate(el => window.getComputedStyle(el).textAlign);
    expect(alignment).toBe('right');

    // Test 2: Enter text in A2 - should align left
    await page.keyboard.type('Hello');
    await page.keyboard.press('Enter');

    const cellA2 = page.locator('[data-id="A2"]');
    alignment = await cellA2.evaluate(el => window.getComputedStyle(el).textAlign);
    expect(alignment).toBe('left');

    // Test 3: Enter a decimal number in A3 - should align right
    await page.keyboard.type('123.45');
    await page.keyboard.press('Enter');

    const cellA3 = page.locator('[data-id="A3"]');
    alignment = await cellA3.evaluate(el => window.getComputedStyle(el).textAlign);
    expect(alignment).toBe('right');

    // Test 4: Enter a negative number in A4 - should align right
    await page.keyboard.type('-99');
    await page.keyboard.press('Enter');

    const cellA4 = page.locator('[data-id="A4"]');
    alignment = await cellA4.evaluate(el => window.getComputedStyle(el).textAlign);
    expect(alignment).toBe('right');

    // Test 5: Enter mixed alphanumeric in A5 - should align left
    await page.keyboard.type('ABC123');
    await page.keyboard.press('Enter');

    const cellA5 = page.locator('[data-id="A5"]');
    alignment = await cellA5.evaluate(el => window.getComputedStyle(el).textAlign);
    expect(alignment).toBe('left');
  });

  test('Formula results should align based on result type', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Click on B1
    await page.locator('[data-id="B1"]').click();

    // Test 1: Formula returning a number - should align right
    await page.keyboard.type('=10+20');
    await page.keyboard.press('Enter');

    const cellB1 = page.locator('[data-id="B1"]');
    await expect(cellB1).toHaveText('30');
    let alignment = await cellB1.evaluate(el => window.getComputedStyle(el).textAlign);
    expect(alignment).toBe('right');

    // Test 2: Formula with SUM - should align right
    await page.locator('[data-id="C1"]').click();
    await page.keyboard.type('5');
    await page.keyboard.press('Enter');

    await page.keyboard.type('10');
    await page.keyboard.press('Enter');

    await page.keyboard.type('=SUM(C1:C2)');
    await page.keyboard.press('Enter');

    const cellC3 = page.locator('[data-id="C3"]');
    await expect(cellC3).toHaveText('15');
    alignment = await cellC3.evaluate(el => window.getComputedStyle(el).textAlign);
    expect(alignment).toBe('right');

    // Test 3: Formula with multiplication - should align right
    await page.locator('[data-id="D1"]').click();
    await page.keyboard.type('=5*6');
    await page.keyboard.press('Enter');

    const cellD1 = page.locator('[data-id="D1"]');
    await expect(cellD1).toHaveText('30');
    alignment = await cellD1.evaluate(el => window.getComputedStyle(el).textAlign);
    expect(alignment).toBe('right');
  });
});
