import { test, expect } from '@playwright/test';

/**
 * E2E tests for UI bugs documented in ui_bugs.md
 * These tests document the expected behavior and will fail where bugs exist.
 */

test.describe('Bug: Status Bar Selection Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');
  });

  test('status bar should update active cell when navigating with arrow keys', async ({ page }) => {
    // Bug: "the status bar shows correct mode, but the active cell is always A1 and doesn't change"
    const selectionValue = page.locator('#status-selection-value');
    await expect(selectionValue).toHaveText('A1');

    // Navigate down
    await page.keyboard.press('ArrowDown');
    await expect(selectionValue).toHaveText('A2');

    // Navigate right
    await page.keyboard.press('ArrowRight');
    await expect(selectionValue).toHaveText('B2');

    // Navigate up
    await page.keyboard.press('ArrowUp');
    await expect(selectionValue).toHaveText('B1');

    // Navigate left
    await page.keyboard.press('ArrowLeft');
    await expect(selectionValue).toHaveText('A1');
  });

  test('status bar should update when clicking on different cells', async ({ page }) => {
    const selectionValue = page.locator('#status-selection-value');
    
    await page.click('[data-id="C3"]');
    await expect(selectionValue).toHaveText('C3');

    await page.click('[data-id="E5"]');
    await expect(selectionValue).toHaveText('E5');
  });
});


test.describe('Bug: Enter Mode - Backspace Not Working', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');
  });

  test('backspace should delete characters in Enter mode', async ({ page }) => {
    // Bug: "when user starts typing, it's looking good, but backspace doesn't work"
    await page.click('[data-id="A1"]');
    
    // Type some text (triggers Enter mode)
    await page.keyboard.type('Hello');
    
    const editor = page.locator('#cell-editor');
    await expect(editor).toHaveValue('Hello');

    // Press backspace - should delete last character
    await page.keyboard.press('Backspace');
    await expect(editor).toHaveValue('Hell');

    await page.keyboard.press('Backspace');
    await expect(editor).toHaveValue('Hel');
  });

  test('delete key should work in Enter mode', async ({ page }) => {
    await page.click('[data-id="A1"]');
    await page.keyboard.type('Test');
    
    const editor = page.locator('#cell-editor');
    await expect(editor).toHaveValue('Test');

    // Move cursor to beginning and delete forward
    await page.keyboard.press('Home');
    await page.keyboard.press('Delete');
    await expect(editor).toHaveValue('est');
  });
});


test.describe('Bug: Enter Mode - Arrow Key Exit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');
  });

  test('arrow key should commit edit and switch to Ready mode', async ({ page }) => {
    // Bug: "when they exit with an arrow key, the edit is committed (correct), 
    // but they are still in the Enter mode and can't type anything"
    const statusMode = page.locator('#status-mode-value');
    
    await page.click('[data-id="A1"]');
    await expect(statusMode).toHaveText('Ready');

    // Type to enter Enter mode
    await page.keyboard.type('Test');
    await expect(statusMode).toHaveText('Enter');

    // Press arrow down to commit and move
    await page.keyboard.press('ArrowDown');
    
    // Should commit the value
    await expect(page.locator('[data-id="A1"]')).toHaveText('Test');
    
    // Should be in Ready mode now (THIS IS THE BUG - it stays in Enter)
    await expect(statusMode).toHaveText('Ready');
    
    // Should be able to type in the new cell (A2)
    await page.keyboard.type('Next');
    await expect(statusMode).toHaveText('Enter');
    
    const editor = page.locator('#cell-editor');
    await expect(editor).toHaveValue('Next');
  });

  test('arrow right should commit edit and allow typing in next cell', async ({ page }) => {
    const statusMode = page.locator('#status-mode-value');
    
    await page.click('[data-id="B2"]');
    await page.keyboard.type('First');
    
    // Arrow right to commit and move
    await page.keyboard.press('ArrowRight');
    
    // Verify commit
    await expect(page.locator('[data-id="B2"]')).toHaveText('First');
    
    // Should be in Ready mode
    await expect(statusMode).toHaveText('Ready');
    
    // Should be able to immediately type in C2
    await page.keyboard.type('Second');
    await expect(statusMode).toHaveText('Enter');
    
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-id="C2"]')).toHaveText('Second');
  });
});


test.describe('Bug: Point Mode - Reference Replacement', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');
  });

  test('arrow navigation in Point mode should replace reference, not append', async ({ page }) => {
    // Bug: "when they navigate to another cell, the new reference appends the existing one, 
    // instead of replacing it... =B1C1D1 but in the correct behaviour they should get =D1"
    await page.click('[data-id="A1"]');
    await page.keyboard.type('=');
    
    const editor = page.locator('#cell-editor');
    await expect(editor).toHaveValue('=');

    // Arrow right should add B1 reference
    await page.keyboard.press('ArrowRight');
    await expect(editor).toHaveValue('=B1');

    // Arrow right again should REPLACE with C1, not append
    await page.keyboard.press('ArrowRight');
    await expect(editor).toHaveValue('=C1');

    // Arrow down should REPLACE with C2
    await page.keyboard.press('ArrowDown');
    await expect(editor).toHaveValue('=C2');

    // Arrow left should REPLACE with B2
    await page.keyboard.press('ArrowLeft');
    await expect(editor).toHaveValue('=B2');
  });

  test('multiple navigations should result in single reference', async ({ page }) => {
    await page.click('[data-id="A1"]');
    await page.keyboard.type('=');
    
    const editor = page.locator('#cell-editor');

    // Navigate multiple times
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    
    // Should only have one reference: D3 (not =B1C1D1D2D3)
    await expect(editor).toHaveValue('=D3');
  });

  test('operator should lock reference and allow new pointing', async ({ page }) => {
    await page.click('[data-id="A1"]');
    await page.keyboard.type('=');

    const editor = page.locator('#cell-editor');

    // Navigate to B1
    await page.keyboard.press('ArrowRight');
    await expect(editor).toHaveValue('=B1');

    // Type operator to lock the reference
    await page.keyboard.type('+');
    await expect(editor).toHaveValue('=B1+');

    // After typing operator, navigation resets to editing cell (A1)
    // So ArrowRight from A1 goes to B1, not C1
    await page.keyboard.press('ArrowRight');
    await expect(editor).toHaveValue('=B1+B1');

    // Navigate more - should replace only the second reference
    await page.keyboard.press('ArrowDown');
    await expect(editor).toHaveValue('=B1+B2');
  });
});


test.describe('Bug: Point Mode - Mouse Click', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');
  });

  test('clicking a cell in Point mode should insert reference', async ({ page }) => {
    // Bug: "in the point mode, mouse doesn't work at all"
    await page.click('[data-id="A1"]');
    await page.keyboard.type('=');
    
    const editor = page.locator('#cell-editor');
    await expect(editor).toHaveValue('=');

    // Click on D5 - should insert reference
    await page.click('[data-id="D5"]');
    await expect(editor).toHaveValue('=D5');
  });

  test('clicking multiple cells should replace reference', async ({ page }) => {
    await page.click('[data-id="A1"]');
    await page.keyboard.type('=');
    
    const editor = page.locator('#cell-editor');

    await page.click('[data-id="B2"]');
    await expect(editor).toHaveValue('=B2');

    // Click on C3 - should replace, not append
    await page.click('[data-id="C3"]');
    await expect(editor).toHaveValue('=C3');
  });

  test('click after operator should add new reference', async ({ page }) => {
    await page.click('[data-id="A1"]');
    await page.keyboard.type('=');
    
    const editor = page.locator('#cell-editor');

    await page.click('[data-id="B1"]');
    await expect(editor).toHaveValue('=B1');

    await page.keyboard.type('*');
    await expect(editor).toHaveValue('=B1*');

    await page.click('[data-id="C1"]');
    await expect(editor).toHaveValue('=B1*C1');
  });
});


test.describe('Bug: Edit Mode - Double Click', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');
  });

  test('double-click should enter Edit mode and allow editing', async ({ page }) => {
    // Bug: "double click 'sort of does' - text in the cell is selected, but nothing can be done - no edits"
    await page.click('[data-id="A1"]');
    await page.keyboard.type('Hello');
    await page.keyboard.press('Enter');
    
    const statusMode = page.locator('#status-mode-value');
    await expect(statusMode).toHaveText('Ready');

    // Double-click to edit
    await page.dblclick('[data-id="A1"]');
    
    // Should be in Edit mode
    await expect(statusMode).toHaveText('Edit');
    
    const editor = page.locator('#cell-editor');
    await expect(editor).toBeVisible();
    await expect(editor).toHaveValue('Hello');
    
    // Should be able to type additional content
    await page.keyboard.type(' World');
    await expect(editor).toHaveValue('Hello World');
  });

  test('arrow keys in Edit mode should move cursor, not cell selection', async ({ page }) => {
    // Bug: "Arrow keys, that were supposed to get back to default behaviour, are still moving active cell across the grid"
    await page.click('[data-id="B2"]');
    await page.keyboard.type('Testing');
    await page.keyboard.press('Enter');
    
    await page.dblclick('[data-id="B2"]');
    
    const statusMode = page.locator('#status-mode-value');
    await expect(statusMode).toHaveText('Edit');
    
    // Arrow keys should NOT change mode or move selection
    await page.keyboard.press('ArrowLeft');
    await expect(statusMode).toHaveText('Edit');
    
    await page.keyboard.press('ArrowRight');
    await expect(statusMode).toHaveText('Edit');
    
    // Selection should still be on B2
    const selectionValue = page.locator('#status-selection-value');
    await expect(selectionValue).toHaveText('B2');
  });

  test('mode should change to Edit on double-click', async ({ page }) => {
    // Bug: "The mode doesn't change"
    await page.click('[data-id="A1"]');
    await page.keyboard.type('Content');
    await page.keyboard.press('Enter');
    
    const statusMode = page.locator('#status-mode-value');
    await expect(statusMode).toHaveText('Ready');
    
    await page.dblclick('[data-id="A1"]');
    
    // Mode MUST change to Edit
    await expect(statusMode).toHaveText('Edit');
  });
});


test.describe('Bug: Edit Mode - Escape Key', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');
  });

  test('Escape in Edit mode should cancel edit and return to Ready', async ({ page }) => {
    // Bug: "It's also impossible to exit a cell - ESC doesn't work"
    await page.click('[data-id="A1"]');
    await page.keyboard.type('Original');
    await page.keyboard.press('Enter');
    
    await page.dblclick('[data-id="A1"]');
    
    const statusMode = page.locator('#status-mode-value');
    await expect(statusMode).toHaveText('Edit');
    
    // Modify the content
    const editor = page.locator('#cell-editor');
    await editor.fill('Modified');
    
    // Press Escape - should cancel and revert
    await page.keyboard.press('Escape');
    
    // Should be back in Ready mode
    await expect(statusMode).toHaveText('Ready');
    
    // Content should be reverted to original
    await expect(page.locator('[data-id="A1"]')).toHaveText('Original');
  });
});


test.describe('Bug: Edit Mode - Selection and Content Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');
  });

  test('exiting edit mode via arrow keys should not leave stale selection', async ({ page }) => {
    // Bug: "when exiting a cell via arrow keys, the selection remains"
    await page.click('[data-id="B2"]');
    await page.keyboard.type('First Cell');
    await page.keyboard.press('Enter');
    
    await page.dblclick('[data-id="B2"]');
    
    // Exit via arrow (even though this shouldn't work in true Edit mode)
    await page.keyboard.press('ArrowDown');
    
    // Navigate to another cell
    await page.click('[data-id="C3"]');
    
    // Original cell should retain content
    await expect(page.locator('[data-id="B2"]')).toHaveText('First Cell');
  });

  test('typing in another cell should not clear previously edited cell', async ({ page }) => {
    // Bug: "when user starts typing in another cell, which triggers Enter mode, 
    // the content of the cell that was supposed to be edited disappears"
    await page.click('[data-id="A1"]');
    await page.keyboard.type('Preserved');
    await page.keyboard.press('Enter');
    
    // Try to edit A1 via double-click
    await page.dblclick('[data-id="A1"]');
    
    // Navigate away and type in B1
    await page.click('[data-id="B1"]');
    await page.keyboard.type('New Content');
    await page.keyboard.press('Enter');
    
    // A1 should still have its original content (THIS IS THE BUG)
    await expect(page.locator('[data-id="A1"]')).toHaveText('Preserved');
    
    // B1 should have new content
    await expect(page.locator('[data-id="B1"]')).toHaveText('New Content');
  });
});


test.describe('Bug: Edit Mode - Enter Key Trigger', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');
  });

  test('pressing Enter on a cell with content should enter Edit mode', async ({ page }) => {
    // Bug: "Currently pressing Enter doesn't work"
    await page.click('[data-id="A1"]');
    await page.keyboard.type('Content');
    await page.keyboard.press('Enter');
    
    // Navigate back to A1
    await page.click('[data-id="A1"]');
    
    const statusMode = page.locator('#status-mode-value');
    await expect(statusMode).toHaveText('Ready');
    
    // Press Enter to edit
    await page.keyboard.press('Enter');
    
    // Should be in Edit mode with editor visible
    await expect(statusMode).toHaveText('Edit');
    
    const editor = page.locator('#cell-editor');
    await expect(editor).toBeVisible();
    await expect(editor).toHaveValue('Content');
  });

  test('F2 should enter Edit mode', async ({ page }) => {
    await page.click('[data-id="A1"]');
    await page.keyboard.type('Test Content');
    await page.keyboard.press('Enter');
    
    await page.click('[data-id="A1"]');
    
    const statusMode = page.locator('#status-mode-value');
    await expect(statusMode).toHaveText('Ready');
    
    // Press F2 to edit
    await page.keyboard.press('F2');
    
    await expect(statusMode).toHaveText('Edit');
    
    const editor = page.locator('#cell-editor');
    await expect(editor).toBeVisible();
    await expect(editor).toHaveValue('Test Content');
  });
});


test.describe('Bug: Formula Bar Editing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');
  });

  test('clicking formula bar should enter Edit mode for active cell', async ({ page }) => {
    // Bug: Edit mode should work "by clicking on the formula bar"
    await page.click('[data-id="A1"]');
    await page.keyboard.type('Original');
    await page.keyboard.press('Enter');
    
    await page.click('[data-id="A1"]');
    
    // Click on formula bar
    const formulaInput = page.locator('#formula-input');
    await formulaInput.click();
    
    const statusMode = page.locator('#status-mode-value');
    await expect(statusMode).toHaveText('Edit');
    
    await expect(formulaInput).toBeFocused();
    await expect(formulaInput).toHaveValue('Original');
    
    // Should be able to edit
    await formulaInput.fill('Modified');
    await page.keyboard.press('Enter');
    
    await expect(page.locator('[data-id="A1"]')).toHaveText('Modified');
  });
});


test.describe('Bug: Jump to Edge After File Load', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');
  });

  test('Ctrl+Arrow should detect data edges immediately after load', async ({ page }) => {
    // Bug: "It doesn't detect the edge after loading a new file, however after first edit, it starts working correctly"
    
    // Create some data with gaps
    await page.click('[data-id="A1"]');
    await page.keyboard.type('1');
    await page.keyboard.press('Enter');
    
    await page.click('[data-id="A2"]');
    await page.keyboard.type('2');
    await page.keyboard.press('Enter');
    
    await page.click('[data-id="A3"]');
    await page.keyboard.type('3');
    await page.keyboard.press('Enter');
    
    // Leave A4 empty, put data in A5
    await page.click('[data-id="A5"]');
    await page.keyboard.type('5');
    await page.keyboard.press('Enter');
    
    // Wait for autosave
    await page.waitForTimeout(1000);
    
    // Reload the page to simulate "loading a new file"
    await page.reload();
    await page.waitForResponse('**/api/files/*');
    
    // Start from A1 - WITHOUT making any edits first
    await page.click('[data-id="A1"]');
    
    const selectionValue = page.locator('#status-selection-value');
    await expect(selectionValue).toHaveText('A1');
    
    // Ctrl+Down should jump to A3 (last cell before empty)
    await page.keyboard.press('Control+ArrowDown');
    await expect(selectionValue).toHaveText('A3');
    
    // Ctrl+Down again should jump to A5 (next data cell)
    await page.keyboard.press('Control+ArrowDown');
    await expect(selectionValue).toHaveText('A5');
  });

  test('Ctrl+Right should work with horizontal data immediately after load', async ({ page }) => {
    // Create horizontal data
    await page.click('[data-id="A1"]');
    await page.keyboard.type('A');
    await page.keyboard.press('Tab');
    
    await page.keyboard.type('B');
    await page.keyboard.press('Tab');
    
    await page.keyboard.type('C');
    await page.keyboard.press('Enter');
    
    // Wait for autosave
    await page.waitForTimeout(1000);
    
    // Reload
    await page.reload();
    await page.waitForResponse('**/api/files/*');
    
    // Start from A1 - no edits
    await page.click('[data-id="A1"]');
    
    const selectionValue = page.locator('#status-selection-value');
    
    // Ctrl+Right should jump to C1 (last cell with data in row)
    await page.keyboard.press('Control+ArrowRight');
    await expect(selectionValue).toHaveText('C1');
  });
});