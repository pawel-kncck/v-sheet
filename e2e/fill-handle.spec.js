import { test, expect } from '@playwright/test';

test.describe('Fill Handle', () => {
  // Helper function to clear cells
  async function clearCells(page, cells) {
    for (const cellId of cells) {
      await page.locator(`[data-id="${cellId}"]`).click();
      await page.keyboard.press('Delete');
    }
  }

  // Helper to perform fill handle drag
  async function dragFillHandle(page, targetCellId) {
    const fillHandle = page.locator('#fill-handle');
    const targetCell = page.locator(`[data-id="${targetCellId}"]`);

    await fillHandle.hover();
    await page.mouse.down();
    await targetCell.hover();
    await page.mouse.up();
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Clear test cells
    const testCells = [
      'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7',
      'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
      'C1', 'C2', 'C3', 'C4',
      'D1', 'D2', 'D3', 'D4',
      'E1', 'E2', 'E3'
    ];
    await clearCells(page, testCells);
  });

  test.describe('Visual & Interaction', () => {
    test('FH-1: Fill handle appears on single cell selection', async ({ page }) => {
      await page.locator('[data-id="C5"]').click();

      const fillHandle = page.locator('#fill-handle');
      await expect(fillHandle).toBeVisible();
    });

    test('FH-2: Fill handle appears at bottom-right of range selection', async ({ page }) => {
      await page.locator('[data-id="B2"]').click();
      await page.locator('[data-id="D4"]').click({ modifiers: ['Shift'] });

      const fillHandle = page.locator('#fill-handle');
      await expect(fillHandle).toBeVisible();
    });

    test('FH-3: Crosshair cursor on fill handle hover', async ({ page }) => {
      await page.locator('[data-id="C5"]').click();

      const fillHandle = page.locator('#fill-handle');
      await fillHandle.hover();

      const cursor = await fillHandle.evaluate(el =>
        window.getComputedStyle(el).cursor
      );
      expect(cursor).toBe('crosshair');
    });

    test('FH-4: Fill handle hidden during edit mode', async ({ page }) => {
      await page.locator('[data-id="C5"]').click();

      const fillHandle = page.locator('#fill-handle');
      await expect(fillHandle).toBeVisible();

      // Enter edit mode
      await page.keyboard.press('F2');
      await expect(fillHandle).not.toBeVisible();

      // Commit edit
      await page.keyboard.press('Enter');
      await expect(fillHandle).toBeVisible();
    });

    test('FH-5: Fill preview overlay during drag', async ({ page }) => {
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('100');
      await page.keyboard.press('Enter');
      await page.locator('[data-id="A1"]').click();

      const fillHandle = page.locator('#fill-handle');
      const a3 = page.locator('[data-id="A3"]');

      await fillHandle.hover();
      await page.mouse.down();
      await a3.hover();

      const preview = page.locator('#fill-preview');
      await expect(preview).toBeVisible();

      await page.mouse.up();
    });
  });

  test.describe('Single Cell Fill', () => {
    test('FH-10: Fill single cell value downward', async ({ page }) => {
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('Hello');
      await page.keyboard.press('Enter');
      await page.locator('[data-id="A1"]').click();

      await dragFillHandle(page, 'A3');

      await expect(page.locator('[data-id="A2"]')).toHaveText('Hello');
      await expect(page.locator('[data-id="A3"]')).toHaveText('Hello');
    });

    test('FH-11: Fill single formula with reference adjustment', async ({ page }) => {
      // Set up reference values
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('10');
      await page.keyboard.press('Enter');
      await page.keyboard.type('20');
      await page.keyboard.press('Enter');

      // Create formula
      await page.locator('[data-id="B1"]').click();
      await page.keyboard.type('=A1+5');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="B1"]')).toHaveText('15');

      await page.locator('[data-id="B1"]').click();
      await dragFillHandle(page, 'B2');

      await expect(page.locator('[data-id="B2"]')).toHaveText('25');
    });

    test('FH-12: Fill single formula with absolute reference unchanged', async ({ page }) => {
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('10');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="B1"]').click();
      await page.keyboard.type('=$A$1*2');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="B1"]')).toHaveText('20');

      await page.locator('[data-id="B1"]').click();
      await dragFillHandle(page, 'B3');

      // Both should show 20 (absolute ref unchanged)
      await expect(page.locator('[data-id="B2"]')).toHaveText('20');
      await expect(page.locator('[data-id="B3"]')).toHaveText('20');
    });
  });

  test.describe('Numeric Sequence Fill (Linear Regression)', () => {
    test('FH-20: Fill ascending numeric sequence downward', async ({ page }) => {
      // Create sequence 1, 2, 3
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('1');
      await page.keyboard.press('Enter');
      await page.keyboard.type('2');
      await page.keyboard.press('Enter');
      await page.keyboard.type('3');
      await page.keyboard.press('Enter');

      // Select A1:A3
      await page.locator('[data-id="A1"]').click();
      await page.locator('[data-id="A3"]').click({ modifiers: ['Shift'] });

      await dragFillHandle(page, 'A6');

      // Verify linear regression
      await expect(page.locator('[data-id="A4"]')).toHaveText('4');
      await expect(page.locator('[data-id="A5"]')).toHaveText('5');
      await expect(page.locator('[data-id="A6"]')).toHaveText('6');
    });

    test('FH-21: Fill numeric sequence upward (reverse)', async ({ page }) => {
      // Create sequence at B4:B6
      await page.locator('[data-id="B4"]').click();
      await page.keyboard.type('1');
      await page.keyboard.press('Enter');
      await page.keyboard.type('2');
      await page.keyboard.press('Enter');
      await page.keyboard.type('3');
      await page.keyboard.press('Enter');

      // Select B4:B6
      await page.locator('[data-id="B4"]').click();
      await page.locator('[data-id="B6"]').click({ modifiers: ['Shift'] });

      await dragFillHandle(page, 'B2');

      // Verify backward extrapolation
      await expect(page.locator('[data-id="B3"]')).toHaveText('0');
      await expect(page.locator('[data-id="B2"]')).toHaveText('-1');
    });

    test('FH-22: Fill non-integer step sequence', async ({ page }) => {
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('1');
      await page.keyboard.press('Enter');
      await page.keyboard.type('3');
      await page.keyboard.press('Enter');
      await page.keyboard.type('5');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="A1"]').click();
      await page.locator('[data-id="A3"]').click({ modifiers: ['Shift'] });

      await dragFillHandle(page, 'A5');

      await expect(page.locator('[data-id="A4"]')).toHaveText('7');
      await expect(page.locator('[data-id="A5"]')).toHaveText('9');
    });

    test('FH-23: Fill constant sequence', async ({ page }) => {
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('5');
      await page.keyboard.press('Enter');
      await page.keyboard.type('5');
      await page.keyboard.press('Enter');
      await page.keyboard.type('5');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="A1"]').click();
      await page.locator('[data-id="A3"]').click({ modifiers: ['Shift'] });

      await dragFillHandle(page, 'A5');

      await expect(page.locator('[data-id="A4"]')).toHaveText('5');
      await expect(page.locator('[data-id="A5"]')).toHaveText('5');
    });

    test('FH-24: Fill numeric sequence horizontally', async ({ page }) => {
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('10');
      await page.keyboard.press('Tab');
      await page.keyboard.type('20');
      await page.keyboard.press('Tab');
      await page.keyboard.type('30');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="A1"]').click();
      await page.locator('[data-id="C1"]').click({ modifiers: ['Shift'] });

      await dragFillHandle(page, 'E1');

      await expect(page.locator('[data-id="D1"]')).toHaveText('40');
      await expect(page.locator('[data-id="E1"]')).toHaveText('50');
    });
  });

  test.describe('Formula/Text Range Fill (Cyclic Copy)', () => {
    test('FH-30: Fill formula range with cyclic copy', async ({ page }) => {
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('=2+1');
      await page.keyboard.press('Enter');
      await page.keyboard.type('=2+2');
      await page.keyboard.press('Enter');
      await page.keyboard.type('=2+3');
      await page.keyboard.press('Enter');

      // Verify source values
      await expect(page.locator('[data-id="A1"]')).toHaveText('3');
      await expect(page.locator('[data-id="A2"]')).toHaveText('4');
      await expect(page.locator('[data-id="A3"]')).toHaveText('5');

      await page.locator('[data-id="A1"]').click();
      await page.locator('[data-id="A3"]').click({ modifiers: ['Shift'] });

      await dragFillHandle(page, 'A7');

      // Verify cyclic copy
      await expect(page.locator('[data-id="A4"]')).toHaveText('3');
      await expect(page.locator('[data-id="A5"]')).toHaveText('4');
      await expect(page.locator('[data-id="A6"]')).toHaveText('5');
      await expect(page.locator('[data-id="A7"]')).toHaveText('3'); // Cycled back
    });

    test('FH-40: Fill text range with cyclic copy', async ({ page }) => {
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('Red');
      await page.keyboard.press('Enter');
      await page.keyboard.type('Green');
      await page.keyboard.press('Enter');
      await page.keyboard.type('Blue');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="A1"]').click();
      await page.locator('[data-id="A3"]').click({ modifiers: ['Shift'] });

      await dragFillHandle(page, 'A6');

      await expect(page.locator('[data-id="A4"]')).toHaveText('Red');
      await expect(page.locator('[data-id="A5"]')).toHaveText('Green');
      await expect(page.locator('[data-id="A6"]')).toHaveText('Blue');
    });
  });

  test.describe('Multi-Column/Row Fill', () => {
    test('FH-50: Fill multi-column range downward', async ({ page }) => {
      // Column A: 1, 2, 3
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('1');
      await page.keyboard.press('Enter');
      await page.keyboard.type('2');
      await page.keyboard.press('Enter');
      await page.keyboard.type('3');
      await page.keyboard.press('Enter');

      // Column B: 2, 4, 6
      await page.locator('[data-id="B1"]').click();
      await page.keyboard.type('2');
      await page.keyboard.press('Enter');
      await page.keyboard.type('4');
      await page.keyboard.press('Enter');
      await page.keyboard.type('6');
      await page.keyboard.press('Enter');

      // Select A1:B3
      await page.locator('[data-id="A1"]').click();
      await page.locator('[data-id="B3"]').click({ modifiers: ['Shift'] });

      await dragFillHandle(page, 'B4');

      // Each column extends independently
      await expect(page.locator('[data-id="A4"]')).toHaveText('4');
      await expect(page.locator('[data-id="B4"]')).toHaveText('8');
    });

    test('FH-51: Fill multi-row range rightward', async ({ page }) => {
      // Row 1: 1, 2
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('1');
      await page.keyboard.press('Tab');
      await page.keyboard.type('2');
      await page.keyboard.press('Enter');

      // Row 2: 2, 4
      await page.locator('[data-id="A2"]').click();
      await page.keyboard.type('2');
      await page.keyboard.press('Tab');
      await page.keyboard.type('4');
      await page.keyboard.press('Enter');

      // Row 3: 3, 6
      await page.locator('[data-id="A3"]').click();
      await page.keyboard.type('3');
      await page.keyboard.press('Tab');
      await page.keyboard.type('6');
      await page.keyboard.press('Enter');

      // Select A1:B3
      await page.locator('[data-id="A1"]').click();
      await page.locator('[data-id="B3"]').click({ modifiers: ['Shift'] });

      await dragFillHandle(page, 'C3');

      // Each row extends independently
      await expect(page.locator('[data-id="C1"]')).toHaveText('3');
      await expect(page.locator('[data-id="C2"]')).toHaveText('6');
      await expect(page.locator('[data-id="C3"]')).toHaveText('9');
    });
  });

  test.describe('Undo/Redo', () => {
    test('FH-60: Undo fill operation', async ({ page }) => {
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('1');
      await page.keyboard.press('Enter');
      await page.keyboard.type('2');
      await page.keyboard.press('Enter');
      await page.keyboard.type('3');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="A1"]').click();
      await page.locator('[data-id="A3"]').click({ modifiers: ['Shift'] });

      await dragFillHandle(page, 'A5');

      // Verify fill happened
      await expect(page.locator('[data-id="A4"]')).toHaveText('4');
      await expect(page.locator('[data-id="A5"]')).toHaveText('5');

      // Undo
      await page.keyboard.press(
        process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
      );

      // Verify undo
      await expect(page.locator('[data-id="A4"]')).toHaveText('');
      await expect(page.locator('[data-id="A5"]')).toHaveText('');

      // Source unchanged
      await expect(page.locator('[data-id="A1"]')).toHaveText('1');
      await expect(page.locator('[data-id="A2"]')).toHaveText('2');
      await expect(page.locator('[data-id="A3"]')).toHaveText('3');
    });

    test('FH-61: Redo fill operation', async ({ page }) => {
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('1');
      await page.keyboard.press('Enter');
      await page.keyboard.type('2');
      await page.keyboard.press('Enter');
      await page.keyboard.type('3');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="A1"]').click();
      await page.locator('[data-id="A3"]').click({ modifiers: ['Shift'] });

      await dragFillHandle(page, 'A5');

      // Undo
      await page.keyboard.press(
        process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z'
      );

      await expect(page.locator('[data-id="A4"]')).toHaveText('');
      await expect(page.locator('[data-id="A5"]')).toHaveText('');

      // Redo
      await page.keyboard.press(
        process.platform === 'darwin' ? 'Meta+Shift+Z' : 'Control+Y'
      );

      // Verify redo
      await expect(page.locator('[data-id="A4"]')).toHaveText('4');
      await expect(page.locator('[data-id="A5"]')).toHaveText('5');
    });
  });

  test.describe('Edge Cases', () => {
    test('FH-73: Single numeric cell fill (no regression)', async ({ page }) => {
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('42');
      await page.keyboard.press('Enter');
      await page.locator('[data-id="A1"]').click();

      await dragFillHandle(page, 'A3');

      await expect(page.locator('[data-id="A2"]')).toHaveText('42');
      await expect(page.locator('[data-id="A3"]')).toHaveText('42');
    });
  });
});
