import { test, expect } from '@playwright/test';

test.describe('Clipboard - Range Size Mismatch Scenarios', () => {
  // Helper function to clear cells in a range
  async function clearCells(page, cells) {
    for (const cellId of cells) {
      await page.locator(`[data-id="${cellId}"]`).click();
      await page.keyboard.press('Delete');
    }
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Clear commonly used test cells to ensure isolation
    const testCells = [
      'A1', 'A2', 'A3', 'A4', 'A5',
      'B1', 'B2', 'B3', 'B4', 'B5',
      'C1', 'C2', 'C3',
      'D1', 'D2', 'D3', 'D4', 'D5',
      'E1', 'E2'
    ];
    await clearCells(page, testCells);
  });

  test('Scenario 17.5: Paste multi-cell range to single cell auto-expands', async ({ page }) => {
    // Create source range A1:A3
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('10');
    await page.keyboard.press('Enter');
    await page.keyboard.type('20');
    await page.keyboard.press('Enter');
    await page.keyboard.type('30');
    await page.keyboard.press('Enter');

    // Copy A1:A3
    await page.locator('[data-id="A1"]').click();
    await page.locator('[data-id="A3"]').click({ modifiers: ['Shift'] });
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
    );

    // Paste to single cell B1
    await page.locator('[data-id="B1"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
    );

    // Verify B1:B3 contains the values
    await expect(page.locator('[data-id="B1"]')).toHaveText('10');
    await expect(page.locator('[data-id="B2"]')).toHaveText('20');
    await expect(page.locator('[data-id="B3"]')).toHaveText('30');
  });

  test('Scenario 17.6: Paste single cell to multi-cell selection (fill range)', async ({ page }) => {
    // Create source cell
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('100');
    await page.keyboard.press('Enter');

    // Copy A1
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
    );

    // Select range B1:B3
    await page.locator('[data-id="B1"]').click();
    await page.locator('[data-id="B3"]').click({ modifiers: ['Shift'] });

    // Paste
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
    );

    // Desired behavior: Fill entire selected range (Excel-style)
    await expect(page.locator('[data-id="B1"]')).toHaveText('100');
    await expect(page.locator('[data-id="B2"]')).toHaveText('100');
    await expect(page.locator('[data-id="B3"]')).toHaveText('100');
  });

  test('Scenario 17.7: Paste range to larger selection pastes once at anchor', async ({ page }) => {
    
    

    // Create source range
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('10');
    await page.keyboard.press('Enter');
    await page.keyboard.type('20');
    await page.keyboard.press('Enter');

    // Copy A1:A2
    await page.locator('[data-id="A1"]').click();
    await page.locator('[data-id="A2"]').click({ modifiers: ['Shift'] });
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
    );

    // Select larger range B1:B5
    await page.locator('[data-id="B1"]').click();
    await page.locator('[data-id="B5"]').click({ modifiers: ['Shift'] });

    // Paste
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
    );

    // Only B1:B2 should be filled
    await expect(page.locator('[data-id="B1"]')).toHaveText('10');
    await expect(page.locator('[data-id="B2"]')).toHaveText('20');
    await expect(page.locator('[data-id="B3"]')).toHaveText('');
    await expect(page.locator('[data-id="B4"]')).toHaveText('');
    await expect(page.locator('[data-id="B5"]')).toHaveText('');
  });

  test('Scenario 17.8: Paste range to smaller selection expands to source size', async ({ page }) => {
    
    

    // Create source range A1:A5
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('10');
    await page.keyboard.press('Enter');
    await page.keyboard.type('20');
    await page.keyboard.press('Enter');
    await page.keyboard.type('30');
    await page.keyboard.press('Enter');
    await page.keyboard.type('40');
    await page.keyboard.press('Enter');
    await page.keyboard.type('50');
    await page.keyboard.press('Enter');

    // Copy A1:A5
    await page.locator('[data-id="A1"]').click();
    await page.locator('[data-id="A5"]').click({ modifiers: ['Shift'] });
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
    );

    // Select smaller range B1:B3
    await page.locator('[data-id="B1"]').click();
    await page.locator('[data-id="B3"]').click({ modifiers: ['Shift'] });

    // Paste
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
    );

    // All 5 values should paste (expands beyond selection)
    await expect(page.locator('[data-id="B1"]')).toHaveText('10');
    await expect(page.locator('[data-id="B2"]')).toHaveText('20');
    await expect(page.locator('[data-id="B3"]')).toHaveText('30');
    await expect(page.locator('[data-id="B4"]')).toHaveText('40');
    await expect(page.locator('[data-id="B5"]')).toHaveText('50');
  });

  test('Scenario 17.9: Paste range ignores target selection shape', async ({ page }) => {
    
    

    // Create vertical source A1:A3
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('10');
    await page.keyboard.press('Enter');
    await page.keyboard.type('20');
    await page.keyboard.press('Enter');
    await page.keyboard.type('30');
    await page.keyboard.press('Enter');

    // Copy A1:A3
    await page.locator('[data-id="A1"]').click();
    await page.locator('[data-id="A3"]').click({ modifiers: ['Shift'] });
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
    );

    // Select horizontal range B1:D1
    await page.locator('[data-id="B1"]').click();
    await page.locator('[data-id="D1"]').click({ modifiers: ['Shift'] });

    // Paste
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
    );

    // Should paste vertically at B1:B3 (ignoring horizontal selection)
    await expect(page.locator('[data-id="B1"]')).toHaveText('10');
    await expect(page.locator('[data-id="B2"]')).toHaveText('20');
    await expect(page.locator('[data-id="B3"]')).toHaveText('30');
    await expect(page.locator('[data-id="C1"]')).toHaveText('');
    await expect(page.locator('[data-id="D1"]')).toHaveText('');
  });

  test('Scenario 17.10: Paste range of formulas adjusts each reference independently', async ({ page }) => {
    
    

    // Set up reference cells
    await page.locator('[data-id="B1"]').click();
    await page.keyboard.type('100');
    await page.keyboard.press('Enter');
    await page.keyboard.type('200');
    await page.keyboard.press('Enter');

    // Create formula range A1:A2
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('=B1');
    await page.keyboard.press('Enter');
    await page.keyboard.type('=B2');
    await page.keyboard.press('Enter');

    // Verify formulas work
    await expect(page.locator('[data-id="A1"]')).toHaveText('100');
    await expect(page.locator('[data-id="A2"]')).toHaveText('200');

    // Copy A1:A2
    await page.locator('[data-id="A1"]').click();
    await page.locator('[data-id="A2"]').click({ modifiers: ['Shift'] });
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
    );

    // Set up new reference cells
    await page.locator('[data-id="D1"]').click();
    await page.keyboard.type('10');
    await page.keyboard.press('Enter');
    await page.keyboard.type('20');
    await page.keyboard.press('Enter');

    // Paste to C1
    await page.locator('[data-id="C1"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
    );

    // Each formula should reference D column
    await expect(page.locator('[data-id="C1"]')).toHaveText('10');
    await expect(page.locator('[data-id="C2"]')).toHaveText('20');
  });

  test('Scenario 17.5 variation: Paste 2D range to single cell', async ({ page }) => {
    // Create 2x2 source range
    // Row 1: A1=1, B1=2
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('1');
    await page.keyboard.press('Tab');
    await page.keyboard.type('2');
    await page.keyboard.press('Enter');

    // Row 2: A2=3, B2=4
    await page.locator('[data-id="A2"]').click();
    await page.keyboard.type('3');
    await page.keyboard.press('Tab');
    await page.keyboard.type('4');
    await page.keyboard.press('Enter');

    // Copy A1:B2
    await page.locator('[data-id="A1"]').click();
    await page.locator('[data-id="B2"]').click({ modifiers: ['Shift'] });
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+C' : 'Control+C'
    );

    // Paste to D1
    await page.locator('[data-id="D1"]').click();
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+V' : 'Control+V'
    );

    // Should expand to D1:E2
    await expect(page.locator('[data-id="D1"]')).toHaveText('1');
    await expect(page.locator('[data-id="E1"]')).toHaveText('2');
    await expect(page.locator('[data-id="D2"]')).toHaveText('3');
    await expect(page.locator('[data-id="E2"]')).toHaveText('4');
  });
});
