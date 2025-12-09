import { test, expect } from '@playwright/test';

test.describe('Data Entry Test Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');
  });

  // ===== Scenario Group: Quick Entry with Tab =====

  test('Scenario 1.1: Single value entry with Tab', async ({ page }) => {
    // Given
    await page.locator('[data-id="B2"]').click();

    // When
    await page.keyboard.type('100');
    await page.keyboard.press('Tab');

    // Then
    await expect(page.locator('[data-id="B2"]')).toHaveText('100');
    await expect(page.locator('[data-id="C2"]')).toHaveClass(/selected/);
    await expect(page.locator('#status-mode-value')).toHaveText('Ready');
    // Formula bar should show C2's content (empty if new cell)
    await expect(page.locator('#formula-input')).toHaveValue('');
  });

  test('Scenario 1.2: Horizontal data entry with Tab', async ({ page }) => {
    // Given
    await page.locator('[data-id="A1"]').click();

    // When
    await page.keyboard.type('Apple');
    await page.keyboard.press('Tab');

    await page.keyboard.type('Banana');
    await page.keyboard.press('Tab');

    await page.keyboard.type('Cherry');
    await page.keyboard.press('Enter');

    // Then
    await expect(page.locator('[data-id="A1"]')).toHaveText('Apple');
    await expect(page.locator('[data-id="B1"]')).toHaveText('Banana');
    await expect(page.locator('[data-id="C1"]')).toHaveText('Cherry');
    await expect(page.locator('[data-id="C2"]')).toHaveClass(/selected/);
  });

  // ===== Scenario Group: Quick Entry with Enter =====

  test('Scenario 2.1: Vertical data entry with Enter', async ({ page }) => {
    // Given
    await page.locator('[data-id="A1"]').click();

    // When
    await page.keyboard.type('10');
    await page.keyboard.press('Enter');

    await page.keyboard.type('20');
    await page.keyboard.press('Enter');

    await page.keyboard.type('30');
    await page.keyboard.press('Enter');

    // Then
    await expect(page.locator('[data-id="A1"]')).toHaveText('10');
    await expect(page.locator('[data-id="A2"]')).toHaveText('20');
    await expect(page.locator('[data-id="A3"]')).toHaveText('30');
    await expect(page.locator('[data-id="A4"]')).toHaveClass(/selected/);
  });

  // ===== Scenario Group: Arrow Key Commits in EnterMode =====

  test('Scenario 3.1: Arrow Right commits and moves', async ({ page }) => {
    // Given
    await page.locator('[data-id="B2"]').click();

    // When
    await page.keyboard.type('100');
    await page.keyboard.press('ArrowRight');

    // Then
    await expect(page.locator('[data-id="B2"]')).toHaveText('100');
    await expect(page.locator('[data-id="C2"]')).toHaveClass(/selected/);
    await expect(page.locator('#status-mode-value')).toHaveText('Ready');
  });

  test('Scenario 3.2: Arrow Down commits and moves', async ({ page }) => {
    // Given
    await page.locator('[data-id="A1"]').click();

    // When
    await page.keyboard.type('Test');
    await page.keyboard.press('ArrowDown');

    // Then
    await expect(page.locator('[data-id="A1"]')).toHaveText('Test');
    await expect(page.locator('[data-id="A2"]')).toHaveClass(/selected/);

    // Verify ready for next input
    await page.keyboard.type('Next');
    await expect(page.locator('#status-mode-value')).toHaveText('Enter');
  });

  test('Scenario 3.3: Directional data entry pattern', async ({ page }) => {
    // Given
    await page.locator('[data-id="B2"]').click();

    // When
    await page.keyboard.type('100');
    await page.keyboard.press('ArrowRight');

    await page.keyboard.type('200');
    await page.keyboard.press('ArrowDown');

    await page.keyboard.type('300');
    await page.keyboard.press('ArrowLeft');

    await page.keyboard.type('400');
    await page.keyboard.press('ArrowUp');

    // Then
    await expect(page.locator('[data-id="B2"]')).toHaveText('100');
    await expect(page.locator('[data-id="C2"]')).toHaveText('200');
    await expect(page.locator('[data-id="C3"]')).toHaveText('300');
    await expect(page.locator('[data-id="B3"]')).toHaveText('400');
    await expect(page.locator('[data-id="B2"]')).toHaveClass(/selected/);
  });

  // ===== Scenario Group: Backspace and Delete in EnterMode =====

  test('Scenario 4.1: Backspace removes last character', async ({ page }) => {
    // Given
    await page.locator('[data-id="A1"]').click();

    // When
    await page.keyboard.type('Hello');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');

    // Then
    // During editing, content is in the editor, not the cell div
    const editor = page.locator('#cell-editor');
    await expect(editor).toHaveValue('Hel');
    await expect(page.locator('#formula-input')).toHaveValue('Hel');
    await expect(page.locator('#status-mode-value')).toHaveText('Enter');
  });

  test('Scenario 4.2: Delete key works in EnterMode', async ({ page }) => {
    // Given
    await page.locator('[data-id="A1"]').click();

    // When
    await page.keyboard.type('Test');
    await page.keyboard.press('Delete');

    // Then
    // During editing, content is in the editor, not the cell div
    const editor = page.locator('#cell-editor');
    await expect(editor).toHaveValue('Tes');
  });

  // ===== Scenario Group: Escape Cancels Entry =====

  test('Scenario 5.1: Escape discards EnterMode changes', async ({ page }) => {
    // Given
    await page.locator('[data-id="A1"]').click();

    // When
    await page.keyboard.type('Will be cancelled');
    await page.keyboard.press('Escape');

    // Then
    await expect(page.locator('[data-id="A1"]')).toBeEmpty();
    await expect(page.locator('[data-id="A1"]')).toHaveClass(/selected/);
    await expect(page.locator('#status-mode-value')).toHaveText('Ready');
  });

  test('Scenario 5.2: Escape restores original value', async ({ page }) => {
    // Setup: create cell with original value
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('Original');
    await page.keyboard.press('Enter');

    // Test: modify and cancel
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('Modified');
    await page.keyboard.press('Escape');

    // Then
    await expect(page.locator('[data-id="A1"]')).toHaveText('Original');
  });

  // ===== Scenario Group: EnterMode to EditMode Transition =====

  test('Scenario 6.1: F2 switches to EditMode', async ({ page }) => {
    // Given
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('Hello');

    // When
    await page.keyboard.press('F2');

    // Then
    await expect(page.locator('#status-mode-value')).toHaveText('Edit');

    // Arrow should move cursor, not commit
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.type('X');

    // Should insert in middle: HelXlo
    // During editing, content is in the editor
    const editor = page.locator('#cell-editor');
    await expect(editor).toHaveValue('HelXlo');
  });

  // ===== Scenario Group: Numeric Data Entry =====

  test('Scenario 7.1: Integer entry', async ({ page }) => {
    // Given
    await page.locator('[data-id="A1"]').click();

    // When
    await page.keyboard.type('42');
    await page.keyboard.press('Enter');

    // Then
    await expect(page.locator('[data-id="A1"]')).toHaveText('42');

    // Verify it's treated as number (can be used in formula)
    await page.locator('[data-id="B1"]').click();
    await page.keyboard.type('=A1+10');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-id="B1"]')).toHaveText('52');
  });

  test('Scenario 7.2: Decimal entry', async ({ page }) => {
    // Given
    await page.locator('[data-id="A1"]').click();

    // When
    await page.keyboard.type('3.14');
    await page.keyboard.press('Enter');

    // Then
    await expect(page.locator('[data-id="A1"]')).toHaveText('3.14');
  });

  test('Scenario 7.3: Negative number entry', async ({ page }) => {
    // Given
    await page.locator('[data-id="A1"]').click();

    // When
    await page.keyboard.type('-100');
    await page.keyboard.press('Enter');

    // Then
    await expect(page.locator('[data-id="A1"]')).toHaveText('-100');

    // Verify it's a number
    await page.locator('[data-id="B1"]').click();
    await page.keyboard.type('=A1*-1');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-id="B1"]')).toHaveText('100');
  });

  // ===== Scenario Group: Text Entry =====

  test('Scenario 8.1: Simple text entry', async ({ page }) => {
    // Given
    await page.locator('[data-id="A1"]').click();

    // When
    await page.keyboard.type('Hello World');
    await page.keyboard.press('Enter');

    // Then
    await expect(page.locator('[data-id="A1"]')).toHaveText('Hello World');
  });

  test('Scenario 8.2: Text with special characters', async ({ page }) => {
    // Given
    await page.locator('[data-id="A1"]').click();

    // When
    await page.keyboard.type('Price: $99.99');
    await page.keyboard.press('Enter');

    // Then
    await expect(page.locator('[data-id="A1"]')).toHaveText('Price: $99.99');
  });

  // ===== Scenario Group: Mode Persistence =====

  test('Scenario 9.1: Mode returns to Ready after commit', async ({ page }) => {
    // Given
    await page.locator('[data-id="A1"]').click();
    await page.keyboard.type('Test');

    // When
    await page.keyboard.press('Enter');

    // Then
    await expect(page.locator('#status-mode-value')).toHaveText('Ready');

    // After Enter, selection should be at A2 (Enter moves down)
    await expect(page.locator('[data-id="A2"]')).toHaveClass(/selected/);

    // Arrow should navigate, not type
    await page.keyboard.press('ArrowRight');
    // From A2, ArrowRight should move to B2
    await expect(page.locator('[data-id="B2"]')).toHaveClass(/selected/);
  });

  // ===== Scenario Group: Formula Bar Synchronization =====

  test('Scenario 10.1: Formula bar updates while typing', async ({ page }) => {
    // Given
    await page.locator('[data-id="A1"]').click();

    // When & Then
    await page.keyboard.type('T');
    await expect(page.locator('#formula-input')).toHaveValue('T');

    await page.keyboard.type('e');
    await expect(page.locator('#formula-input')).toHaveValue('Te');

    await page.keyboard.type('st');
    await expect(page.locator('#formula-input')).toHaveValue('Test');
  });
});
