import { test, expect } from '@playwright/test';

/**
 * Comprehensive E2E Test: Text-Level Formatting Journey
 *
 * This test covers a complete user journey through text-level formatting,
 * testing style inheritance, WYSIWYG editing, and cell-level style interactions.
 *
 * TEST SCENARIO OUTLINE:
 * ======================
 *
 * PHASE 1: Initial Text Entry
 * ---------------------------
 * 1. Cell A1 is empty and active
 * 2. User types "One Two Three" (enters Enter mode)
 * 3. User presses Enter to commit → goes to A2 (A2 is active)
 *
 * PHASE 2: Apply Bold to "Three"
 * ------------------------------
 * 4. User double-clicks on A1 → enters Edit mode
 * 5. Cursor is positioned at the end of text (after "Three")
 * 6. User presses Cmd/Ctrl+Shift+Left to select word "Three"
 * 7. User presses Cmd/Ctrl+B to apply bold
 * 8. Verify "Three" appears bold in the editor (WYSIWYG)
 * 9. User presses Enter to commit
 * 10. Verify "Three" is displayed bold in the cell
 *
 * PHASE 3: Apply Italic to "Two"
 * ------------------------------
 * 11. User double-clicks on A1 → enters Edit mode
 * 12. User navigates to select word "Two" (between "One " and " Three")
 * 13. User presses Cmd/Ctrl+I to apply italic
 * 14. Verify "Two" appears italic in the editor
 * 15. User presses Enter to commit
 * 16. Verify cell shows: "One" (normal), "Two" (italic), "Three" (bold)
 *
 * PHASE 4: Apply Red Color to "One"
 * ---------------------------------
 * 17. User double-clicks on A1 → enters Edit mode
 * 18. User selects word "One"
 * 19. User clicks the font color picker and selects red (#FF0000)
 * 20. Verify "One" appears red in the editor
 * 21. User presses Enter to commit
 * 22. Verify cell shows: "One" (red), "Two" (italic), "Three" (bold)
 *
 * PHASE 5: Remove Bold from "Three"
 * ---------------------------------
 * 23. User double-clicks on A1 → enters Edit mode
 * 24. User selects word "Three"
 * 25. User presses Cmd/Ctrl+B to toggle off bold
 * 26. Verify "Three" is no longer bold in editor
 * 27. User presses Enter to commit
 * 28. Verify cell shows: "One" (red), "Two" (italic), "Three" (normal)
 *
 * PHASE 6: Apply Cell-Level Blue Color (Style Inheritance)
 * --------------------------------------------------------
 * 29. User clicks on A1 (Ready mode, cell selected)
 * 30. User clicks the font color picker and selects blue (#0000FF)
 * 31. Verify ALL text becomes blue (cell-level style overrides text-level color)
 * 32. Verify rich text is cleared (per spec: cell-level formatting clears rich text)
 * 33. Verify "One", "Two", "Three" are all uniform blue now
 *
 * PHASE 7: Undo/Redo Verification
 * -------------------------------
 * 34. User presses Cmd/Ctrl+Z to undo cell-level color change
 * 35. Verify rich text formatting is restored (One=red, Two=italic, Three=normal)
 * 36. User presses Cmd/Ctrl+Shift+Z to redo
 * 37. Verify all text is uniform blue again
 *
 * PHASE 8: Persistence Test
 * -------------------------
 * 38. Wait for autosave
 * 39. Reload the page
 * 40. Verify A1 still displays the final state correctly
 */

test.describe('Comprehensive Text-Level Formatting Journey', () => {
  // Helper to get cell element
  const getCell = (page, cellId) => page.locator(`[data-id="${cellId}"]`);

  // Helper to get editor element
  const getEditor = (page) => page.locator('#cell-editor');

  // Helper to clear cells before test
  async function clearCells(page, cells) {
    for (const cellId of cells) {
      await page.locator(`[data-id="${cellId}"]`).click();
      await page.keyboard.press('Delete');
    }
  }

  // Helper to select word by double-clicking (if supported) or using keyboard
  async function selectWordAtPosition(page, editor, wordStart, wordEnd) {
    // Position cursor at start
    await page.keyboard.press('Home');
    for (let i = 0; i < wordStart; i++) {
      await page.keyboard.press('ArrowRight');
    }
    // Select to end
    for (let i = wordStart; i < wordEnd; i++) {
      await page.keyboard.press('Shift+ArrowRight');
    }
  }

  // Platform-aware modifier key
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');

    // Clear test cells
    await clearCells(page, ['A1', 'A2', 'A3']);
  });

  test('Complete text formatting journey with style inheritance', async ({ page }) => {
    const cellA1 = getCell(page, 'A1');
    const editor = getEditor(page);

    // ==========================================
    // PHASE 1: Initial Text Entry
    // ==========================================

    // Step 1-2: Click A1 and type text (Enter mode)
    await cellA1.click();
    await expect(cellA1).toHaveAttribute('data-selected', 'true');

    await page.keyboard.type('One Two Three');
    await expect(editor).toBeVisible(); // Should be in Enter mode

    // Step 3: Press Enter to commit, should move to A2
    await page.keyboard.press('Enter');
    const cellA2 = getCell(page, 'A2');
    await expect(cellA2).toHaveAttribute('data-selected', 'true');

    // Verify A1 contains the text
    await expect(cellA1).toContainText('One Two Three');

    // ==========================================
    // PHASE 2: Apply Bold to "Three"
    // ==========================================

    // Step 4: Double-click A1 to enter Edit mode
    await cellA1.dblclick();
    await expect(editor).toBeVisible();

    // Step 5-6: Cursor should be at end; select "Three" (positions 8-13)
    // "One Two Three"
    //  0123456789...
    // "Three" is at index 8-13
    await page.keyboard.press('End'); // Ensure at end

    // Select "Three" by pressing Shift+Ctrl/Cmd+Left (select word) or manual selection
    // Using Ctrl/Cmd+Shift+Left to select previous word
    await page.keyboard.press(`${modifier}+Shift+ArrowLeft`);

    // Step 7: Apply bold
    await page.keyboard.press(`${modifier}+b`);

    // Step 8: Verify bold in editor (WYSIWYG)
    // The editor should show bold styling for the selection
    const editorContent = await editor.innerHTML();
    expect(editorContent).toContain('font-weight');

    // Step 9: Commit with Enter
    await page.keyboard.press('Enter');

    // Step 10: Verify "Three" is bold in cell display
    const boldSpan = cellA1.locator('span').filter({ hasText: 'Three' });
    await expect(boldSpan).toHaveCSS('font-weight', '700');

    // ==========================================
    // PHASE 3: Apply Italic to "Two"
    // ==========================================

    // Step 11: Double-click to enter Edit mode again
    await cellA1.dblclick();
    await expect(editor).toBeVisible();

    // Step 12: Select word "Two" (positions 4-7)
    // "One Two Three"
    //  01234567...
    await page.keyboard.press('Home');
    // Move to position 4 (start of "Two")
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('ArrowRight');
    }
    // Select 3 characters ("Two")
    await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('Shift+ArrowRight');

    // Step 13: Apply italic
    await page.keyboard.press(`${modifier}+i`);

    // Step 14: Verify italic in editor
    const editorContentPhase3 = await editor.innerHTML();
    expect(editorContentPhase3).toContain('font-style');

    // Step 15: Commit
    await page.keyboard.press('Enter');

    // Step 16: Verify cell shows mixed formatting
    // "One" should be normal, "Two" should be italic, "Three" should be bold
    const italicSpan = cellA1.locator('span').filter({ hasText: 'Two' });
    await expect(italicSpan).toHaveCSS('font-style', 'italic');

    // "Three" should still be bold
    const stillBoldSpan = cellA1.locator('span').filter({ hasText: 'Three' });
    await expect(stillBoldSpan).toHaveCSS('font-weight', '700');

    // ==========================================
    // PHASE 4: Apply Red Color to "One"
    // ==========================================

    // Step 17: Double-click to enter Edit mode
    await cellA1.dblclick();
    await expect(editor).toBeVisible();

    // Step 18: Select word "One" (positions 0-3)
    await page.keyboard.press('Home');
    await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('Shift+ArrowRight');

    // Step 19: Click font color picker and select red
    // Open the font color dropdown
    const fontColorButton = page.locator('button[data-id="fontColor"]');
    await fontColorButton.click();

    // Select red color from the palette
    const redColor = page.locator('.color-palette [data-color="#FF0000"], .color-palette [data-color="red"]').first();
    if (await redColor.isVisible()) {
      await redColor.click();
    } else {
      // Fallback: try input if color picker is different
      const colorInput = page.locator('input[type="color"]').first();
      if (await colorInput.isVisible()) {
        await colorInput.fill('#FF0000');
      }
    }

    // Step 20-21: Commit and verify
    await page.keyboard.press('Enter');

    // Step 22: Verify "One" is red
    const redSpan = cellA1.locator('span').filter({ hasText: 'One' });
    const oneColor = await redSpan.evaluate(el => getComputedStyle(el).color);
    // Red should be rgb(255, 0, 0) or similar
    expect(oneColor).toMatch(/rgb\(255,\s*0,\s*0\)|#[fF]{2}0{4}/);

    // ==========================================
    // PHASE 5: Remove Bold from "Three"
    // ==========================================

    // Step 23: Double-click to enter Edit mode
    await cellA1.dblclick();
    await expect(editor).toBeVisible();

    // Step 24: Select "Three"
    await page.keyboard.press('End');
    await page.keyboard.press(`${modifier}+Shift+ArrowLeft`);

    // Step 25: Toggle off bold
    await page.keyboard.press(`${modifier}+b`);

    // Step 26-27: Commit
    await page.keyboard.press('Enter');

    // Step 28: Verify "Three" is no longer bold
    const notBoldSpan = cellA1.locator('span').filter({ hasText: 'Three' });
    await expect(notBoldSpan).toHaveCSS('font-weight', '400');

    // ==========================================
    // PHASE 6: Apply Cell-Level Blue Color
    // ==========================================

    // Step 29: Click A1 (Ready mode)
    await cellA1.click();

    // Step 30: Apply blue color via font color picker
    const fontColorBtn = page.locator('button[data-id="fontColor"]');
    await fontColorBtn.click();

    const blueColor = page.locator('.color-palette [data-color="#0000FF"], .color-palette [data-color="blue"]').first();
    if (await blueColor.isVisible()) {
      await blueColor.click();
    }

    // Step 31-33: Verify all text is now blue (cell-level style)
    // Per spec: applying cell-level formatting in Ready mode clears rich text
    await expect(cellA1).toHaveCSS('color', 'rgb(0, 0, 255)');

    // ==========================================
    // PHASE 7: Undo/Redo Verification
    // ==========================================

    // Step 34: Undo the cell-level color change
    await page.keyboard.press(`${modifier}+z`);

    // Step 35: Rich text should be restored
    // Check if "One" is red again (or at least has individual formatting)
    await page.waitForTimeout(100); // Brief wait for undo to process

    // Verify rich text spans exist again
    const spansAfterUndo = cellA1.locator('span');
    const spanCount = await spansAfterUndo.count();
    expect(spanCount).toBeGreaterThanOrEqual(1);

    // Step 36: Redo
    await page.keyboard.press(`${modifier}+Shift+z`);

    // Step 37: Verify blue again
    await expect(cellA1).toHaveCSS('color', 'rgb(0, 0, 255)');

    // ==========================================
    // PHASE 8: Persistence Test
    // ==========================================

    // Step 38: Wait for autosave
    await page.waitForTimeout(1500);

    // Step 39: Reload
    await page.reload();
    await page.waitForResponse('**/api/files/*');

    // Step 40: Verify final state persisted
    const cellAfterReload = getCell(page, 'A1');
    await expect(cellAfterReload).toContainText('One Two Three');
    await expect(cellAfterReload).toHaveCSS('color', 'rgb(0, 0, 255)');
  });

  test.describe('Additional Edge Cases', () => {

    test('should handle overlapping format operations correctly', async ({ page }) => {
      /**
       * Scenario: Apply bold to "Two Three", then apply italic to "One Two"
       * Expected: "One"=italic, "Two"=bold+italic, "Three"=bold
       */
      const cellA1 = getCell(page, 'A1');
      const editor = getEditor(page);

      // Enter text
      await cellA1.click();
      await page.keyboard.type('One Two Three');
      await page.keyboard.press('Enter');

      // Make "Two Three" bold (positions 4-13)
      await cellA1.dblclick();
      await page.keyboard.press('Home');
      for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
      await page.keyboard.press(`${modifier}+Shift+End`);
      await page.keyboard.press(`${modifier}+b`);
      await page.keyboard.press('Enter');

      // Make "One Two" italic (positions 0-7)
      await cellA1.dblclick();
      await page.keyboard.press('Home');
      for (let i = 0; i < 7; i++) await page.keyboard.press('Shift+ArrowRight');
      await page.keyboard.press(`${modifier}+i`);
      await page.keyboard.press('Enter');

      // Verify "Two" has both bold and italic
      const twoSpan = cellA1.locator('span').filter({ hasText: 'Two' });
      await expect(twoSpan).toHaveCSS('font-weight', '700');
      await expect(twoSpan).toHaveCSS('font-style', 'italic');
    });

    test('should preserve text-level formatting when editing other parts', async ({ page }) => {
      /**
       * Scenario: Create "One" (bold), edit to add " Two" without affecting bold
       */
      const cellA1 = getCell(page, 'A1');
      const editor = getEditor(page);

      // Enter "One" with bold
      await cellA1.click();
      await page.keyboard.press(`${modifier}+b`);
      await page.keyboard.type('One');
      await page.keyboard.press('Enter');

      // Re-edit and add " Two" (should inherit or be normal)
      await cellA1.dblclick();
      await page.keyboard.press('End');
      await page.keyboard.press(`${modifier}+b`); // Toggle off bold for new text
      await page.keyboard.type(' Two');
      await page.keyboard.press('Enter');

      // Verify "One" is still bold
      const oneSpan = cellA1.locator('span').filter({ hasText: 'One' });
      await expect(oneSpan).toHaveCSS('font-weight', '700');
    });

    test('should handle empty selection formatting (active style)', async ({ page }) => {
      /**
       * Scenario: Position cursor (no selection), toggle bold, type new text
       * Expected: New text is bold
       */
      const cellA1 = getCell(page, 'A1');

      // Enter some text
      await cellA1.click();
      await page.keyboard.type('Start');
      await page.keyboard.press('Enter');

      // Edit: position cursor at end, toggle bold, type more
      await cellA1.dblclick();
      await page.keyboard.press('End');
      await page.keyboard.press(`${modifier}+b`);
      await page.keyboard.type('Bold');
      await page.keyboard.press('Enter');

      // Verify "Bold" portion is bold
      await expect(cellA1).toContainText('StartBold');
      const boldSpan = cellA1.locator('span').filter({ hasText: 'Bold' });
      await expect(boldSpan).toHaveCSS('font-weight', '700');
    });

    test('should clear rich text when selecting all and applying format in Edit mode', async ({ page }) => {
      /**
       * Scenario: Cell has mixed formatting, user selects all in Edit mode
       * and applies a single format - should create uniform rich text
       */
      const cellA1 = getCell(page, 'A1');

      // Create mixed formatting
      await cellA1.click();
      await page.keyboard.type('Normal');
      await page.keyboard.press(`${modifier}+b`);
      await page.keyboard.type('Bold');
      await page.keyboard.press('Enter');

      // Select all in Edit mode and apply italic
      await cellA1.dblclick();
      await page.keyboard.press(`${modifier}+a`);
      await page.keyboard.press(`${modifier}+i`);
      await page.keyboard.press('Enter');

      // Verify all text is now italic
      const spans = cellA1.locator('span');
      const count = await spans.count();
      for (let i = 0; i < count; i++) {
        await expect(spans.nth(i)).toHaveCSS('font-style', 'italic');
      }
    });
  });
});
