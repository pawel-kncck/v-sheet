import { test, expect } from '@playwright/test';

test.describe('Epic 10: Function Library Expansion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse('**/api/recent');
  });

  test.describe('Math Functions', () => {
    test('AVERAGE should calculate average of numbers', async ({ page }) => {
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('10');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="A2"]').click();
      await page.keyboard.type('20');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="A3"]').click();
      await page.keyboard.type('30');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="B1"]').click();
      await page.keyboard.type('=AVERAGE(A1:A3)');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="B1"]')).toHaveText('20');
    });

    test('COUNT should count numeric cells', async ({ page }) => {
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('10');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="A2"]').click();
      await page.keyboard.type('text');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="A3"]').click();
      await page.keyboard.type('30');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="B1"]').click();
      await page.keyboard.type('=COUNT(A1:A3)');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="B1"]')).toHaveText('2');
    });

    test('COUNTA should count non-empty cells', async ({ page }) => {
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('10');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="A2"]').click();
      await page.keyboard.type('text');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="A3"]').click();
      await page.keyboard.type('hello');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="A4"]').click();
      // A4 is empty

      await page.locator('[data-id="B1"]').click();
      await page.keyboard.type('=COUNTA(A1:A4)');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="B1"]')).toHaveText('3');
    });

    test('ROUND should round numbers correctly', async ({ page }) => {
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('=ROUND(3.14159, 2)');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="A1"]')).toHaveText('3.14');

      await page.locator('[data-id="A2"]').click();
      await page.keyboard.type('=ROUND(123.456, -1)');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="A2"]')).toHaveText('120');
    });

    test('SUMIF should sum values meeting criteria', async ({ page }) => {
      // Set up data
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('10');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="A2"]').click();
      await page.keyboard.type('20');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="A3"]').click();
      await page.keyboard.type('30');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="A4"]').click();
      await page.keyboard.type('40');
      await page.keyboard.press('Enter');

      // Put criteria in a cell
      await page.locator('[data-id="C1"]').click();
      await page.keyboard.type('>20');
      await page.keyboard.press('Enter');

      // Test SUMIF with cell reference to criteria
      await page.locator('[data-id="B1"]').click();
      await page.keyboard.type('=SUMIF(A1:A4, C1)');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="B1"]')).toHaveText('70');
    });

    test('SUMIF should work with text criteria and separate sum range', async ({ page }) => {
      // Category column
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('A');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="A2"]').click();
      await page.keyboard.type('B');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="A3"]').click();
      await page.keyboard.type('A');
      await page.keyboard.press('Enter');

      // Values column
      await page.locator('[data-id="B1"]').click();
      await page.keyboard.type('10');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="B2"]').click();
      await page.keyboard.type('20');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="B3"]').click();
      await page.keyboard.type('30');
      await page.keyboard.press('Enter');

      // Create a reference cell with the criteria
      await page.locator('[data-id="D1"]').click();
      await page.keyboard.type('A');
      await page.keyboard.press('Enter');

      // Test SUMIF with cell reference for text criteria
      await page.locator('[data-id="C1"]').click();
      await page.keyboard.type('=SUMIF(A1:A3, D1, B1:B3)');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="C1"]')).toHaveText('40');
    });

    test('SUMPRODUCT should calculate sum of products', async ({ page }) => {
      // First array
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('1');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="A2"]').click();
      await page.keyboard.type('2');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="A3"]').click();
      await page.keyboard.type('3');
      await page.keyboard.press('Enter');

      // Second array
      await page.locator('[data-id="B1"]').click();
      await page.keyboard.type('4');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="B2"]').click();
      await page.keyboard.type('5');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="B3"]').click();
      await page.keyboard.type('6');
      await page.keyboard.press('Enter');

      // Calculate SUMPRODUCT
      await page.locator('[data-id="C1"]').click();
      await page.keyboard.type('=SUMPRODUCT(A1:A3, B1:B3)');
      await page.keyboard.press('Enter');

      // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
      await expect(page.locator('[data-id="C1"]')).toHaveText('32');
    });
  });

  test.describe('Logical Functions', () => {
    test('AND should return TRUE when all conditions are true', async ({ page }) => {
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('=AND(5>3, 10>5, 2>1)');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="A1"]')).toHaveText('TRUE');
    });

    test('AND should return FALSE when any condition is false', async ({ page }) => {
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('=AND(5>3, 10<5, 2>1)');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="A1"]')).toHaveText('FALSE');
    });

    test('OR should return TRUE when any condition is true', async ({ page }) => {
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('=OR(5<3, 10>5, 2<1)');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="A1"]')).toHaveText('TRUE');
    });

    test('OR should return FALSE when all conditions are false', async ({ page }) => {
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('=OR(5<3, 10<5, 2<1)');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="A1"]')).toHaveText('FALSE');
    });

    test('NOT should reverse boolean value', async ({ page }) => {
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('=NOT(5>3)');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="A1"]')).toHaveText('FALSE');

      await page.locator('[data-id="A2"]').click();
      await page.keyboard.type('=NOT(5<3)');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="A2"]')).toHaveText('TRUE');
    });

    test('should combine AND, OR, NOT with IF', async ({ page }) => {
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('10');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="B1"]').click();
      await page.keyboard.type('=IF(AND(A1>5, A1<20), "OK", "Error")');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="B1"]')).toHaveText('OK');
    });
  });

  test.describe('Text Functions', () => {
    test('UPPER and LOWER should change case', async ({ page }) => {
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('hello');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="B1"]').click();
      await page.keyboard.type('=UPPER(A1)');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="B1"]')).toHaveText('HELLO');

      await page.locator('[data-id="B2"]').click();
      await page.keyboard.type('=LOWER("WORLD")');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="B2"]')).toHaveText('world');
    });

    test('LEN should return length of text', async ({ page }) => {
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('hello');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="B1"]').click();
      await page.keyboard.type('=LEN(A1)');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="B1"]')).toHaveText('5');
    });

    test('TRIM should remove extra spaces', async ({ page }) => {
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('  hello    world  ');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="B1"]').click();
      await page.keyboard.type('=TRIM(A1)');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="B1"]')).toHaveText('hello world');
    });

    test('LEFT and RIGHT should extract characters', async ({ page }) => {
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('hello world');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="B1"]').click();
      await page.keyboard.type('=LEFT(A1, 5)');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="B1"]')).toHaveText('hello');

      await page.locator('[data-id="B2"]').click();
      await page.keyboard.type('=RIGHT(A1, 5)');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="B2"]')).toHaveText('world');
    });

    test('MID should extract substring', async ({ page }) => {
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('hello world');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="B1"]').click();
      await page.keyboard.type('=MID(A1, 7, 5)');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="B1"]')).toHaveText('world');
    });

    test('CONCATENATE should join strings', async ({ page }) => {
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('Hello');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="A2"]').click();
      await page.keyboard.type('World');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="B1"]').click();
      await page.keyboard.type('=CONCATENATE(A1, " ", A2)');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="B1"]')).toHaveText('Hello World');
    });

    test('should combine text functions', async ({ page }) => {
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('  hello  ');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="B1"]').click();
      await page.keyboard.type('=UPPER(TRIM(A1))');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="B1"]')).toHaveText('HELLO');
    });
  });

  test.describe('Lookup Functions', () => {
    test('VLOOKUP should find exact match', async ({ page }) => {
      // Create a simple lookup table
      // Column A: Keys
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('Apple');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="A2"]').click();
      await page.keyboard.type('Banana');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="A3"]').click();
      await page.keyboard.type('Cherry');
      await page.keyboard.press('Enter');

      // Column B: Values
      await page.locator('[data-id="B1"]').click();
      await page.keyboard.type('10');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="B2"]').click();
      await page.keyboard.type('20');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="B3"]').click();
      await page.keyboard.type('30');
      await page.keyboard.press('Enter');

      // Put search key in D1
      await page.locator('[data-id="D1"]').click();
      await page.keyboard.type('Banana');
      await page.keyboard.press('Enter');

      // Lookup using cell reference
      await page.locator('[data-id="E1"]').click();
      await page.keyboard.type('=VLOOKUP(D1, A1:B3, 2)');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="E1"]')).toHaveText('20');
    });

    test('VLOOKUP should return #N/A when not found', async ({ page }) => {
      // Create a simple lookup table
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('Apple');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="B1"]').click();
      await page.keyboard.type('10');
      await page.keyboard.press('Enter');

      // Search for nonexistent value
      await page.locator('[data-id="D1"]').click();
      await page.keyboard.type('Orange');
      await page.keyboard.press('Enter');

      // Lookup using cell reference
      await page.locator('[data-id="E1"]').click();
      await page.keyboard.type('=VLOOKUP(D1, A1:B1, 2)');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="E1"]')).toHaveText('#N/A');
    });

    test('VLOOKUP should be case-insensitive', async ({ page }) => {
      // Create a simple lookup table
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('Apple');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="B1"]').click();
      await page.keyboard.type('10');
      await page.keyboard.press('Enter');

      // Search with different case
      await page.locator('[data-id="D1"]').click();
      await page.keyboard.type('APPLE');
      await page.keyboard.press('Enter');

      // Lookup using cell reference
      await page.locator('[data-id="E1"]').click();
      await page.keyboard.type('=VLOOKUP(D1, A1:B1, 2)');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="E1"]')).toHaveText('10');
    });
  });

  test.describe('Complex Function Combinations', () => {
    test('should combine multiple function types', async ({ page }) => {
      // Test: IF(AVERAGE(...) > 10, SUMIF(...), VLOOKUP(...))
      // Set up data
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('10');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="A2"]').click();
      await page.keyboard.type('20');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="A3"]').click();
      await page.keyboard.type('30');
      await page.keyboard.press('Enter');

      // Calculate with nested functions
      await page.locator('[data-id="B1"]').click();
      await page.keyboard.type('=IF(AVERAGE(A1:A3)>15, SUM(A1:A3), 0)');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="B1"]')).toHaveText('60');
    });

    test('should use text functions with logical operators', async ({ page }) => {
      await page.locator('[data-id="A1"]').click();
      await page.keyboard.type('  apple  ');
      await page.keyboard.press('Enter');

      await page.locator('[data-id="B1"]').click();
      await page.keyboard.type('=IF(LEN(TRIM(A1))>3, UPPER(TRIM(A1)), "Short")');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-id="B1"]')).toHaveText('APPLE');
    });
  });
});
