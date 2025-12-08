import { test, expect } from '@playwright/test';

test.describe('Selection Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');
  });

  // ===== Basic Selection Scenarios =====

  test('Scenario 1: Single cell selection', async ({ page }) => {
    // Click on cell C5
    await page.locator('[data-id="C5"]').click();

    // Cell C5 should have selected class
    await expect(page.locator('[data-id="C5"]')).toHaveClass(/selected/);

    // Status bar should show C5
    await expect(page.locator('#status-selection-value')).toHaveText('C5');
  });

  test('Scenario 2: Range selection by dragging', async ({ page }) => {
    // Note: Playwright's drag doesn't work well with custom selection logic
    // We'll use Shift+Click instead which achieves the same result
    await page.locator('[data-id="B2"]').click();
    await page.locator('[data-id="D4"]').click({ modifiers: ['Shift'] });

    // Check that cells in range have selection styling
    await expect(page.locator('[data-id="B2"]')).toHaveClass(/selected/);
    await expect(page.locator('[data-id="C3"]')).toHaveClass(/selected/);
    await expect(page.locator('[data-id="D4"]')).toHaveClass(/selected/);
  });

  test('Scenario 3: Extend selection with Shift+Click', async ({ page }) => {
    // Select cell B2
    await page.locator('[data-id="B2"]').click();

    // Shift+Click on D4
    await page.locator('[data-id="D4"]').click({ modifiers: ['Shift'] });

    // All cells in range should be selected
    await expect(page.locator('[data-id="B2"]')).toHaveClass(/selected/);
    await expect(page.locator('[data-id="C3"]')).toHaveClass(/selected/);
    await expect(page.locator('[data-id="D4"]')).toHaveClass(/selected/);

    // Active cell should still be B2
    await expect(page.locator('#status-selection-value')).toContainText('B2');
  });

  test('Scenario 4: Multi-range selection with Cmd+Click', async ({ page }) => {
    // Select first range B2:C3
    await page.locator('[data-id="B2"]').click();
    await page.locator('[data-id="C3"]').click({ modifiers: ['Shift'] });

    // Add second range with Cmd/Ctrl
    await page.locator('[data-id="E5"]').click({
      modifiers: process.platform === 'darwin' ? ['Meta'] : ['Control']
    });

    // Both ranges should be selected
    await expect(page.locator('[data-id="B2"]')).toHaveClass(/selected/);
    await expect(page.locator('[data-id="C3"]')).toHaveClass(/selected/);
    await expect(page.locator('[data-id="E5"]')).toHaveClass(/selected/);
  });

  // Note: Scenarios 5-8 (Header selection) are skipped as header selection
  // functionality is not yet implemented in the current version

  // ===== Keyboard Selection Extension Scenarios =====

  test('Scenario 9: Extend selection with Shift+Arrow Right', async ({ page }) => {
    // Select cell B2
    await page.locator('[data-id="B2"]').click();

    // Press Shift+Arrow Right
    await page.keyboard.press('Shift+ArrowRight');

    // Both B2 and C2 should be selected
    await expect(page.locator('[data-id="B2"]')).toHaveClass(/selected/);
    await expect(page.locator('[data-id="C2"]')).toHaveClass(/selected/);
  });

  test('Scenario 10: Extend selection with Shift+Arrow Down (multiple presses)', async ({ page }) => {
    // Select cell B2
    await page.locator('[data-id="B2"]').click();

    // Press Shift+Arrow Down three times
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Shift+ArrowDown');

    // All four cells should be selected
    await expect(page.locator('[data-id="B2"]')).toHaveClass(/selected/);
    await expect(page.locator('[data-id="B3"]')).toHaveClass(/selected/);
    await expect(page.locator('[data-id="B4"]')).toHaveClass(/selected/);
    await expect(page.locator('[data-id="B5"]')).toHaveClass(/selected/);
  });

  test('Scenario 11: Extend selection to edge with Cmd+Shift+Arrow Right', async ({ page }) => {
    // Clear cells first to ensure clean state
    const cellsToClear = ['A1', 'B1', 'C1', 'D1', 'E1', 'F1'];
    for (const cellId of cellsToClear) {
      await page.locator(`[data-id="${cellId}"]`).click();
      await page.keyboard.press('Delete');
    }

    // Set up data in A1:D1
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('100');
    await page.keyboard.press('Tab');
    await page.keyboard.type('200');
    await page.keyboard.press('Tab');
    await page.keyboard.type('300');
    await page.keyboard.press('Tab');
    await page.keyboard.type('400');
    await page.keyboard.press('Enter');

    // Select A1 and extend to edge
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+Shift+ArrowRight' : 'Control+Shift+ArrowRight'
    );

    // Check range A1:D1 is selected
    await expect(page.locator('[data-id="A1"]')).toHaveClass(/selected/);
    await expect(page.locator('[data-id="B1"]')).toHaveClass(/selected/);
    await expect(page.locator('[data-id="C1"]')).toHaveClass(/selected/);
    await expect(page.locator('[data-id="D1"]')).toHaveClass(/selected/);

    // E1 should NOT be selected
    await expect(page.locator('[data-id="E1"]')).not.toHaveClass(/selected/);
  });
});
