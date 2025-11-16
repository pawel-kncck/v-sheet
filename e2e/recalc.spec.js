import { test, expect } from '@playwright/test';

test.describe('Critical Path 2: Recalculation Loop', () => {
  test('should correctly calculate and recalculate a formula', async ({
    page,
  }) => {
    // 1. Go to the page and wait for it to be ready
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // 2. Set A1 to 5
    // Clicks the cell, types '5', and presses 'Enter'
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('5');
    await page.keyboard.press('Enter'); // Commits edit and moves to A2

    // 3. Set B1 to 10
    await page.locator('[data-id="B1"]').click();
    await page.keyboard.type('10');
    await page.keyboard.press('Enter'); // Commits edit and moves to B2

    // 4. Set C1 to =A1+B1
    await page.locator('[data-id="C1"]').click();
    await page.keyboard.type('=A1+B1');
    await page.keyboard.press('Enter'); // Commits edit and moves to C2

    // 5. Assert that C1 displays 15
    // Playwright's toHaveText will auto-wait for the value to update.
    await expect(page.locator('[data-id="C1"]')).toHaveText('15');

    // 6. Change precedent: Set A1 to 20
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('20');
    await page.keyboard.press('Enter');

    // 7. Assert that C1 automatically updates to 30
    await expect(page.locator('[data-id="C1"]')).toHaveText('30');
  });
});
