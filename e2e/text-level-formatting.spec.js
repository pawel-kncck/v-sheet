import { test, expect } from '@playwright/test';

test.describe('Text-Level Formatting', () => {
  // Helper function to clear cells
  async function clearCells(page, cells) {
    for (const cellId of cells) {
      await page.locator(`[data-id="${cellId}"]`).click();
      await page.keyboard.press('Delete');
    }
  }

  // Helper to get the editor element
  function getEditor(page) {
    return page.locator('#cell-editor');
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Clear test cells
    const testCells = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2'];
    await clearCells(page, testCells);
  });

  test.describe('Edit Mode - Text Selection Formatting', () => {
    test('should apply bold to selected text in Edit mode', async ({ page }) => {
      // Enter text in cell
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('Hello World');
      await page.keyboard.press('Enter');

      // Double-click to enter Edit mode
      await page.locator('[data-id="A1"]').dblclick();

      // Select "Hello" (first 5 characters)
      const editor = getEditor(page);
      await expect(editor).toBeVisible();

      // Select all text first, then we'll select just "Hello"
      await page.keyboard.press('Home');
      await page.keyboard.press('Shift+End');

      // Apply bold
      await page.keyboard.press('Control+b');

      // Commit
      await page.keyboard.press('Enter');

      // Check that the cell contains a span with bold styling
      const cell = page.locator('[data-id="A1"]');
      const boldSpan = cell.locator('span').first();
      await expect(boldSpan).toHaveCSS('font-weight', '700');
    });

    test('should apply italic to selected text in Edit mode', async ({ page }) => {
      // Enter text in cell
      await page.locator('[data-id="A2"]').click();
      await page.keyboard.type('Sample Text');
      await page.keyboard.press('Enter');

      // Double-click to enter Edit mode
      await page.locator('[data-id="A2"]').dblclick();

      // Select all text
      await page.keyboard.press('Control+a');

      // Apply italic
      await page.keyboard.press('Control+i');

      // Commit
      await page.keyboard.press('Enter');

      // Check that the cell contains a span with italic styling
      const cell = page.locator('[data-id="A2"]');
      const italicSpan = cell.locator('span').first();
      await expect(italicSpan).toHaveCSS('font-style', 'italic');
    });
  });

  test.describe('Enter Mode - Active Style', () => {
    test('should apply active style to new text in Enter mode', async ({ page }) => {
      // Click cell and start typing to enter Enter mode
      await page.locator('[data-id="B1"]').click();

      // Type first part without formatting
      await page.keyboard.type('Normal');

      // Toggle bold active style
      await page.keyboard.press('Control+b');

      // Type second part (should be bold)
      await page.keyboard.type('Bold');

      // Commit
      await page.keyboard.press('Enter');

      // Check the cell has mixed formatting
      const cell = page.locator('[data-id="B1"]');
      await expect(cell).toContainText('NormalBold');

      // The cell should have spans for rich text
      const spans = cell.locator('span');
      const spanCount = await spans.count();
      expect(spanCount).toBeGreaterThanOrEqual(1);
    });

    test('should toggle active style multiple times', async ({ page }) => {
      await page.locator('[data-id="B2"]').click();

      // Type with toggling bold
      await page.keyboard.type('A');
      await page.keyboard.press('Control+b');
      await page.keyboard.type('B');
      await page.keyboard.press('Control+b');
      await page.keyboard.type('C');

      // Commit
      await page.keyboard.press('Enter');

      // Cell should have "ABC"
      const cell = page.locator('[data-id="B2"]');
      await expect(cell).toContainText('ABC');
    });
  });

  test.describe('Toolbar State', () => {
    test('should show bold button active when cell has bold style', async ({ page }) => {
      // Enter text and apply cell-level bold
      await page.locator('[data-id="C1"]').click();
      await page.keyboard.type('Bold Cell');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="C1"]').click();
      await page.click('button[data-id="bold"]');

      // Select another cell then come back
      await page.locator('[data-id="C2"]').click();
      await page.locator('[data-id="C1"]').click();

      // Check that bold button has active class
      const boldBtn = page.locator('button[data-id="bold"]');
      await expect(boldBtn).toHaveClass(/active/);
    });

    test('should not show bold button active for unformatted cell', async ({ page }) => {
      // Enter text without formatting
      await page.locator('[data-id="C2"]').click();
      await page.keyboard.type('Plain');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="C2"]').click();

      // Check that bold button does NOT have active class
      const boldBtn = page.locator('button[data-id="bold"]');
      await expect(boldBtn).not.toHaveClass(/active/);
    });

    test('should update toolbar state when navigating between cells', async ({ page }) => {
      // Create a bold cell
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('Bold');
      await page.keyboard.press('Enter');
      await page.locator('[data-id="A1"]').click();
      await page.click('button[data-id="bold"]');

      // Create a plain cell
      await page.locator('[data-id="A2"]').click();
      await page.keyboard.type('Plain');
      await page.keyboard.press('Enter');

      // Navigate to bold cell
      await page.locator('[data-id="A1"]').click();
      const boldBtn = page.locator('button[data-id="bold"]');
      await expect(boldBtn).toHaveClass(/active/);

      // Navigate to plain cell
      await page.keyboard.press('ArrowDown');
      await expect(boldBtn).not.toHaveClass(/active/);

      // Navigate back to bold cell
      await page.keyboard.press('ArrowUp');
      await expect(boldBtn).toHaveClass(/active/);
    });
  });

  test.describe('Formula Mode - Formatting Disabled', () => {
    test('should ignore formatting shortcuts in Formula mode', async ({ page }) => {
      // Start a formula
      await page.locator('[data-id="A3"]').click();
      await page.keyboard.type('=1+1');

      // Try to apply bold (should be ignored)
      await page.keyboard.press('Control+b');

      // Commit
      await page.keyboard.press('Enter');

      // Check the cell displays the result
      const cell = page.locator('[data-id="A3"]');
      await expect(cell).toHaveText('2');

      // Select and check it's not bold (cell-level)
      await page.locator('[data-id="A3"]').click();
      await expect(cell).toHaveCSS('font-weight', '400');
    });
  });

  test.describe('Cell-Level Formatting in Ready Mode', () => {
    test('should clear rich text when applying cell-level formatting', async ({ page }) => {
      // Create cell with rich text
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('Part');
      await page.keyboard.press('Control+b');
      await page.keyboard.type('Bold');
      await page.keyboard.press('Enter');

      // Now in Ready mode, apply italic to entire cell
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.press('Control+i');

      // The entire cell should now be italic, rich text cleared
      const cell = page.locator('[data-id="A1"]');
      await expect(cell).toHaveCSS('font-style', 'italic');
    });
  });

  test.describe('Rich Text Copy/Paste', () => {
    test('should copy and paste rich text formatting', async ({ page }) => {
      // Create cell with bold text
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.press('Control+b');
      await page.keyboard.type('BoldText');
      await page.keyboard.press('Enter');

      // Copy the cell
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.press('Control+c');

      // Paste to another cell
      await page.locator('[data-id="B1"]').click();
      await page.keyboard.press('Control+v');

      // Check that pasted cell has bold formatting
      const cell = page.locator('[data-id="B1"]');
      await expect(cell).toContainText('BoldText');

      // Check for bold span
      const boldSpan = cell.locator('span').first();
      await expect(boldSpan).toHaveCSS('font-weight', '700');
    });
  });

  test.describe('Rich Text Persistence', () => {
    test('should persist rich text after reload', async ({ page }) => {
      // Create cell with rich text
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('Normal');
      await page.keyboard.press('Control+b');
      await page.keyboard.type('Bold');
      await page.keyboard.press('Enter');

      // Wait for autosave
      await page.waitForTimeout(1500);

      // Reload
      await page.reload();
      await page.waitForResponse('**/api/files/*');

      // Check the cell still has the content
      const cell = page.locator('[data-id="A1"]');
      await expect(cell).toContainText('NormalBold');

      // Check for rich text spans
      const spans = cell.locator('span');
      const spanCount = await spans.count();
      expect(spanCount).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('WYSIWYG Editor', () => {
    test('should display rich text in editor while editing', async ({ page }) => {
      // Create cell with bold text
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.press('Control+b');
      await page.keyboard.type('Bold');
      await page.keyboard.press('Enter');

      // Re-enter edit mode
      await page.locator('[data-id="A1"]').dblclick();

      // Check editor shows bold text
      const editor = getEditor(page);
      await expect(editor).toBeVisible();

      // The editor should contain a bold span
      const boldSpan = editor.locator('span').first();
      await expect(boldSpan).toHaveCSS('font-weight', '700');

      // Escape to cancel
      await page.keyboard.press('Escape');
    });
  });
});
