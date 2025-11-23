import { test, expect } from '@playwright/test';

test.describe('Epic 3: Cell Formatting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');
  });

  test('should apply bold formatting via Toolbar', async ({ page }) => {
    await page.click('[data-id="A1"]');
    await page.keyboard.type('Bold Text');
    await page.keyboard.press('Enter');
    await page.click('[data-id="A1"]'); 

    await page.click('button[data-id="bold"]');

    const cell = page.locator('[data-id="A1"]');
    await expect(cell).toHaveCSS('font-weight', '700');
  });

  // --- NEW TEST CASE ---
  test('should toggle bold via Keyboard Shortcut (Ctrl+B)', async ({ page }) => {
    await page.click('[data-id="A2"]');
    await page.keyboard.type('Shortcut');
    await page.keyboard.press('Enter');
    await page.click('[data-id="A2"]');

    // Press Ctrl+B
    await page.keyboard.press('Control+b');
    const cell = page.locator('[data-id="A2"]');
    await expect(cell).toHaveCSS('font-weight', '700');

    // Press Ctrl+B again (Toggle Off)
    await page.keyboard.press('Control+b');
    
    // Wait for style update (Playwright handles this via auto-wait usually, 
    // but checking for '400' ensures it changed back)
    await expect(cell).toHaveCSS('font-weight', '400'); // 400 is normal
  });
  // ---------------------

  test('should persist formatting after reload', async ({ page }) => {
    await page.click('[data-id="B2"]');
    await page.keyboard.type('Persistent');
    await page.keyboard.press('Enter');
    
    await page.click('[data-id="B2"]');
    await page.click('button[data-id="bold"]');
    
    await page.waitForTimeout(1000); 

    await page.reload();
    await page.waitForResponse('**/api/files/*');

    const cell = page.locator('[data-id="B2"]');
    await expect(cell).toHaveText('Persistent');
    await expect(cell).toHaveCSS('font-weight', '700');
  });

  test('should undo formatting', async ({ page }) => {
    await page.click('[data-id="C3"]');
    await page.keyboard.type('Undo Me');
    await page.keyboard.press('Enter');
    
    await page.click('[data-id="C3"]');
    await page.click('button[data-id="italic"]');
    
    const cell = page.locator('[data-id="C3"]');
    await expect(cell).toHaveCSS('font-style', 'italic');

    await page.keyboard.press('Control+z');

    await expect(cell).toHaveCSS('font-style', 'normal');
  });
});