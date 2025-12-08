import { test, expect } from '@playwright/test';

test.describe('Absolute References - F4 Toggle', () => {
  test('F4 cycles A1 → $A$1 in PointMode', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Given: User is building formula "=A1" in PointMode
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('=A1');

    // When: User presses F4
    await page.keyboard.press('F4');

    // Then: Formula changes to "=$A$1"
    const editor = page.locator('#cell-editor');
    await expect(editor).toHaveValue('=$A$1');
  });

  test('F4 completes full cycle $A$1 → A$1 → $A1 → A1', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Given: Formula "=$A$1"
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('=$A$1');

    // When: User presses F4 three more times
    await page.keyboard.press('F4');
    await expect(page.locator('#cell-editor')).toHaveValue('=A$1');

    await page.keyboard.press('F4');
    await expect(page.locator('#cell-editor')).toHaveValue('=$A1');

    await page.keyboard.press('F4');
    await expect(page.locator('#cell-editor')).toHaveValue('=A1');

    // Then: Cycles through A$1 → $A1 → A1
  });

  test('F4 in EditMode cycles reference at cursor position', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Given: Create formula in C1 first
    await page.locator('[data-id="C1"]').click();
    await page.keyboard.type('=A1+B2');
    await page.keyboard.press('Enter');

    // Now edit the formula with F2
    await page.locator('[data-id="C1"]').click();
    await page.keyboard.press('F2');

    // Move cursor to position after A1 (need to move from end to after A1)
    // Formula is "=A1+B2", cursor is at end, need to move left 3 times to be after A1
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('ArrowLeft');
    }

    // When: User presses F4
    await page.keyboard.press('F4');

    // Then: Formula changes to "=$A$1+B2" (only A1 affected)
    const editor = page.locator('#cell-editor');
    await expect(editor).toHaveValue('=$A$1+B2');
  });
});

test.describe('Absolute References - Copy/Paste', () => {
  test('relative reference adjusts on paste', async ({ page }) => {
    // Capture console output
    page.on('console', msg => {
      if (msg.text().includes('FileManager') || msg.text().includes('ClipboardManager') || msg.text().includes('NavigationMode') || msg.text().includes('InputController')) {
        console.log('BROWSER:', msg.text());
      }
    });

    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Given: A1=10, A2=30, B1=100, B2=200, A3="=A1+A2"
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('10');
    await page.keyboard.press('Enter');
    await page.keyboard.type('30');
    await page.keyboard.press('Enter');

    await page.locator('[data-id="B1"]').click();
    await page.keyboard.type('100');
    await page.keyboard.press('Enter');
    await page.keyboard.type('200');
    await page.keyboard.press('Enter');

    // Create formula in A3
    await page.locator('[data-id="A3"]').click();
    await page.keyboard.type('=A1+A2');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-id="A3"]')).toHaveText('40');

    // When: Copy A3, paste to B3
    await page.locator('[data-id="A3"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
    );

    await page.locator('[data-id="B3"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
    );

    // Then: B3="=B1+B2", result=300
    await expect(page.locator('[data-id="B3"]')).toHaveText('300');
  });

  test('fully absolute reference unchanged on paste', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Given: A1=10, A2=30, A3="=$A$1+$A$2"
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('10');
    await page.keyboard.press('Enter');
    await page.keyboard.type('30');
    await page.keyboard.press('Enter');
    await page.keyboard.type('=$A$1+$A$2');
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-id="A3"]')).toHaveText('40');

    // When: Copy A3, paste to B3
    await page.locator('[data-id="A3"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
    );

    await page.locator('[data-id="B3"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
    );

    // Then: B3="=$A$1+$A$2", result=40
    await expect(page.locator('[data-id="B3"]')).toHaveText('40');
  });

  test('column-absolute keeps column, adjusts row', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Given: Formula "=$A1"
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('100');
    await page.keyboard.press('Enter');
    await page.keyboard.type('200');
    await page.keyboard.press('Enter');

    await page.locator('[data-id="A3"]').click();
    await page.keyboard.type('=$A1');
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-id="A3"]')).toHaveText('100');

    // When: Copy and paste 1 row down, 1 column right
    await page.locator('[data-id="A3"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
    );

    await page.locator('[data-id="B4"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
    );

    // Then: Formula becomes "=$A2"
    await expect(page.locator('[data-id="B4"]')).toHaveText('200');
  });

  test('row-absolute keeps row, adjusts column', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Given: Formula "=A$1"
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('10');
    await page.keyboard.press('Tab');
    await page.keyboard.type('20');
    await page.keyboard.press('Enter');

    await page.locator('[data-id="A3"]').click();
    await page.keyboard.type('=A$1');
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-id="A3"]')).toHaveText('10');

    // When: Copy and paste 1 row down, 1 column right
    await page.locator('[data-id="A3"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
    );

    await page.locator('[data-id="B4"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
    );

    // Then: Formula becomes "=B$1"
    await expect(page.locator('[data-id="B4"]')).toHaveText('20');
  });

  test('mixed references adjust correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Given: Set up data - A1=10, B2=20
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('10');
    await page.keyboard.press('Enter');

    await page.locator('[data-id="B2"]').click();
    await page.keyboard.type('20');
    await page.keyboard.press('Enter');

    // Create formula in A3: =$A$1+B2
    await page.locator('[data-id="A3"]').click();
    await page.keyboard.type('=$A$1+B2');
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-id="A3"]')).toHaveText('30');

    // Set up C3 for testing
    await page.locator('[data-id="C3"]').click();
    await page.keyboard.type('50');
    await page.keyboard.press('Enter');

    // When: Copy A3 and paste to B4
    await page.locator('[data-id="A3"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
    );

    await page.locator('[data-id="B4"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
    );

    // Then: Formula becomes "=$A$1+C3"
    // Result should be A1(10) + C3(50) = 60
    await expect(page.locator('[data-id="B4"]')).toHaveText('60');
  });

  test('range references adjust correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Given: Set up A1:B2 grid with values 1, 2, 3, 4
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('1');
    await page.keyboard.press('Tab');
    await page.keyboard.type('2');
    await page.keyboard.press('Enter');

    await page.locator('[data-id="A2"]').click();
    await page.keyboard.type('3');
    await page.keyboard.press('Tab');
    await page.keyboard.type('4');
    await page.keyboard.press('Enter');

    // Create formula in A3: =SUM(A1:B2)
    await page.locator('[data-id="A3"]').click();
    await page.keyboard.type('=SUM(A1:B2)');
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-id="A3"]')).toHaveText('10');

    // Set up B2:C3 grid with values 10, 20, 30, 40
    await page.locator('[data-id="B2"]').click();
    await page.keyboard.type('10');
    await page.keyboard.press('Tab');
    await page.keyboard.type('20');
    await page.keyboard.press('Enter');

    await page.locator('[data-id="B3"]').click();
    await page.keyboard.type('30');
    await page.keyboard.press('Tab');
    await page.keyboard.type('40');
    await page.keyboard.press('Enter');

    // When: Copy A3 and paste to B4
    await page.locator('[data-id="A3"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
    );

    await page.locator('[data-id="B4"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
    );

    // Then: Formula becomes "=SUM(B2:C3)"
    // Result should be 10+20+30+40 = 100
    await expect(page.locator('[data-id="B4"]')).toHaveText('100');
  });
});
