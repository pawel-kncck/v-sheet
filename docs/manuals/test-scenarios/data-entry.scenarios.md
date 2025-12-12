# Data Entry Test Scenarios

This document contains test scenarios for data entry workflows in Given-When-Then format, ready for implementation in Playwright e2e tests.

---

## Scenario Group: Quick Entry with Tab

### Scenario 1.1: Single value entry with Tab

**Given** the user has selected cell B2
**When** the user types "100" and presses Tab
**Then**:
- Cell B2 displays "100"
- Cell C2 is now selected (active cell)
- Mode indicator shows "Ready"
- Formula bar shows C2's content (empty if new cell)

**Playwright Implementation**:
```javascript
test('single value entry with Tab', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Given
  await page.locator('[data-cell="B2"]').click();

  // When
  await page.keyboard.type('100');
  await page.keyboard.press('Tab');

  // Then
  await expect(page.locator('[data-cell="B2"]')).toHaveText('100');
  await expect(page.locator('[data-cell="C2"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-testid="mode-indicator"]')).toHaveText('Ready');
});
```

---

### Scenario 1.2: Horizontal data entry with Tab

**Given** the user has selected cell A1
**When** the user:
1. Types "Apple" and presses Tab
2. Types "Banana" and presses Tab
3. Types "Cherry" and presses Enter

**Then**:
- Cell A1 contains "Apple"
- Cell B1 contains "Banana"
- Cell C1 contains "Cherry"
- Cell C2 is selected (Enter moved down from C1)

**Playwright Implementation**:
```javascript
test('horizontal data entry with Tab', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();

  await page.keyboard.type('Apple');
  await page.keyboard.press('Tab');

  await page.keyboard.type('Banana');
  await page.keyboard.press('Tab');

  await page.keyboard.type('Cherry');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-cell="A1"]')).toHaveText('Apple');
  await expect(page.locator('[data-cell="B1"]')).toHaveText('Banana');
  await expect(page.locator('[data-cell="C1"]')).toHaveText('Cherry');
  await expect(page.locator('[data-cell="C2"]')).toHaveClass(/selected/);
});
```

---

## Scenario Group: Quick Entry with Enter

### Scenario 2.1: Vertical data entry with Enter

**Given** the user has selected cell A1
**When** the user:
1. Types "10" and presses Enter
2. Types "20" and presses Enter
3. Types "30" and presses Enter

**Then**:
- Cell A1 contains "10"
- Cell A2 contains "20"
- Cell A3 contains "30"
- Cell A4 is selected

**Playwright Implementation**:
```javascript
test('vertical data entry with Enter', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();

  await page.keyboard.type('10');
  await page.keyboard.press('Enter');

  await page.keyboard.type('20');
  await page.keyboard.press('Enter');

  await page.keyboard.type('30');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-cell="A1"]')).toHaveText('10');
  await expect(page.locator('[data-cell="A2"]')).toHaveText('20');
  await expect(page.locator('[data-cell="A3"]')).toHaveText('30');
  await expect(page.locator('[data-cell="A4"]')).toHaveClass(/selected/);
});
```

---

## Scenario Group: Arrow Key Commits in EnterMode

### Scenario 3.1: Arrow Right commits and moves

**Given** the user has selected cell B2
**When** the user types "100" and presses Arrow Right
**Then**:
- Cell B2 contains "100"
- Cell C2 is selected
- Mode is ReadyMode (not EnterMode)

**Implementation**:
```javascript
test('Arrow Right commits and moves in EnterMode', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="B2"]').click();
  await page.keyboard.type('100');
  await page.keyboard.press('ArrowRight');

  await expect(page.locator('[data-cell="B2"]')).toHaveText('100');
  await expect(page.locator('[data-cell="C2"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-testid="mode-indicator"]')).toHaveText('Ready');
});
```

---

### Scenario 3.2: Arrow Down commits and moves

**Given** the user is typing in cell A1
**When** the user types "Test" and presses Arrow Down
**Then**:
- Cell A1 contains "Test"
- Cell A2 is selected
- User can immediately start typing in A2 (mode is Ready)

**Implementation**:
```javascript
test('Arrow Down commits and moves in EnterMode', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('Test');
  await page.keyboard.press('ArrowDown');

  await expect(page.locator('[data-cell="A1"]')).toHaveText('Test');
  await expect(page.locator('[data-cell="A2"]')).toHaveClass(/selected/);

  // Verify ready for next input
  await page.keyboard.type('Next');
  await expect(page.locator('[data-testid="mode-indicator"]')).toHaveText('Enter');
});
```

---

### Scenario 3.3: Directional data entry pattern

**Given** the user starts at cell B2
**When** the user:
1. Types "100" and presses Arrow Right
2. Types "200" and presses Arrow Down
3. Types "300" and presses Arrow Left
4. Types "400" and presses Arrow Up

**Then**:
- B2 = "100", C2 = "200", C3 = "300", B3 = "400"
- Cell B2 is selected (ended up back where we started)

**Implementation**:
```javascript
test('directional data entry pattern', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="B2"]').click();

  await page.keyboard.type('100');
  await page.keyboard.press('ArrowRight');

  await page.keyboard.type('200');
  await page.keyboard.press('ArrowDown');

  await page.keyboard.type('300');
  await page.keyboard.press('ArrowLeft');

  await page.keyboard.type('400');
  await page.keyboard.press('ArrowUp');

  await expect(page.locator('[data-cell="B2"]')).toHaveText('100');
  await expect(page.locator('[data-cell="C2"]')).toHaveText('200');
  await expect(page.locator('[data-cell="C3"]')).toHaveText('300');
  await expect(page.locator('[data-cell="B3"]')).toHaveText('400');
  await expect(page.locator('[data-cell="B2"]')).toHaveClass(/selected/);
});
```

---

## Scenario Group: Backspace and Delete in EnterMode

### Scenario 4.1: Backspace removes last character

**Given** the user is typing in cell A1
**When** the user:
1. Types "Hello"
2. Presses Backspace twice

**Then**:
- Cell A1 shows "Hel"
- Formula bar shows "Hel"
- Mode is still EnterMode

**Implementation**:
```javascript
test('Backspace removes characters in EnterMode', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('Hello');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');

  await expect(page.locator('[data-cell="A1"]')).toHaveText('Hel');
  await expect(page.locator('[data-testid="formula-bar"]')).toHaveValue('Hel');
  await expect(page.locator('[data-testid="mode-indicator"]')).toHaveText('Enter');
});
```

---

### Scenario 4.2: Delete key works in EnterMode

**Given** the user is typing in cell A1
**When** the user:
1. Types "Test"
2. Presses Delete

**Then**:
- Last character is removed (same as Backspace)
- Cell shows "Tes"

**Implementation**:
```javascript
test('Delete key works in EnterMode', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('Test');
  await page.keyboard.press('Delete');

  await expect(page.locator('[data-cell="A1"]')).toHaveText('Tes');
});
```

---

## Scenario Group: Escape Cancels Entry

### Scenario 5.1: Escape discards EnterMode changes

**Given** the user has selected cell A1 (empty)
**When** the user:
1. Types "Will be cancelled"
2. Presses Escape

**Then**:
- Cell A1 remains empty
- Selection stays on A1
- Mode is ReadyMode
- No command added to history

**Implementation**:
```javascript
test('Escape cancels EnterMode entry', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('Will be cancelled');
  await page.keyboard.press('Escape');

  await expect(page.locator('[data-cell="A1"]')).toBeEmpty();
  await expect(page.locator('[data-cell="A1"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-testid="mode-indicator"]')).toHaveText('Ready');
});
```

---

### Scenario 5.2: Escape on cell with existing value

**Given** cell A1 contains "Original"
**When** the user:
1. Starts typing (enters EnterMode with "Modified")
2. Presses Escape

**Then**:
- Cell A1 still shows "Original" (unchanged)
- No history command created

**Implementation**:
```javascript
test('Escape restores original value', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Setup: create cell with original value
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('Original');
  await page.keyboard.press('Enter');

  // Test: modify and cancel
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('Modified');
  await page.keyboard.press('Escape');

  await expect(page.locator('[data-cell="A1"]')).toHaveText('Original');
});
```

---

## Scenario Group: EnterMode to EditMode Transition

### Scenario 6.1: F2 switches to EditMode

**Given** the user is in EnterMode with "Hello"
**When** the user presses F2
**Then**:
- Mode changes to EditMode
- Arrow keys now move cursor (not grid)
- Text cursor is visible

**Implementation**:
```javascript
test('F2 switches from EnterMode to EditMode', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('Hello');
  await page.keyboard.press('F2');

  await expect(page.locator('[data-testid="mode-indicator"]')).toHaveText('Edit');

  // Arrow should move cursor, not commit
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.type('X');

  // Should insert in middle: HelXlo
  await expect(page.locator('[data-cell="A1"]')).toHaveText('HelXlo');
});
```

---

## Scenario Group: Numeric Data Entry

### Scenario 7.1: Integer entry

**Given** the user is at cell A1
**When** the user types "42" and presses Enter
**Then**:
- Cell A1 displays "42"
- Value is stored as number type

**Implementation**:
```javascript
test('integer entry', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('42');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-cell="A1"]')).toHaveText('42');

  // Verify it's treated as number (can be used in formula)
  await page.locator('[data-cell="B1"]').click();
  await page.keyboard.type('=A1+10');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-cell="B1"]')).toHaveText('52');
});
```

---

### Scenario 7.2: Decimal entry

**Given** the user is at cell A1
**When** the user types "3.14" and presses Enter
**Then**:
- Cell A1 displays "3.14"
- Value is stored as decimal number

**Implementation**:
```javascript
test('decimal entry', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('3.14');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-cell="A1"]')).toHaveText('3.14');
});
```

---

### Scenario 7.3: Negative number entry

**Given** the user is at cell A1
**When** the user types "-100" and presses Enter
**Then**:
- Cell A1 displays "-100"
- Value is negative number

**Note**: Typing "-" triggers PointMode (formula), so this tests the system's ability to recognize "-100" as a number vs formula.

**Implementation**:
```javascript
test('negative number entry', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('-100');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-cell="A1"]')).toHaveText('-100');

  // Verify it's a number
  await page.locator('[data-cell="B1"]').click();
  await page.keyboard.type('=A1*-1');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-cell="B1"]')).toHaveText('100');
});
```

---

## Scenario Group: Text Entry

### Scenario 8.1: Simple text entry

**Given** the user is at cell A1
**When** the user types "Hello World" and presses Enter
**Then**:
- Cell A1 displays "Hello World"
- Value is stored as text

**Implementation**:
```javascript
test('simple text entry', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('Hello World');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-cell="A1"]')).toHaveText('Hello World');
});
```

---

### Scenario 8.2: Text with special characters

**Given** the user is at cell A1
**When** the user types "Price: $99.99" and presses Enter
**Then**:
- Cell A1 displays "Price: $99.99"

**Implementation**:
```javascript
test('text with special characters', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('Price: $99.99');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-cell="A1"]')).toHaveText('Price: $99.99');
});
```

---

## Scenario Group: Mode Persistence

### Scenario 9.1: Mode returns to Ready after commit

**Given** the user types a value
**When** the user commits with Enter
**Then**:
- Mode immediately returns to Ready
- User can navigate with arrow keys

**Implementation**:
```javascript
test('mode returns to Ready after commit', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('Test');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-testid="mode-indicator"]')).toHaveText('Ready');

  // Arrow should navigate, not type
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-cell="B1"]')).toHaveClass(/selected/);
});
```

---

## Scenario Group: Formula Bar Synchronization

### Scenario 10.1: Formula bar updates while typing

**Given** the user is at cell A1
**When** the user types "Test" character by character
**Then**:
- Formula bar updates in real-time: "T", "Te", "Tes", "Test"

**Implementation**:
```javascript
test('formula bar syncs with typing', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();

  await page.keyboard.type('T');
  await expect(page.locator('[data-testid="formula-bar"]')).toHaveValue('T');

  await page.keyboard.type('e');
  await expect(page.locator('[data-testid="formula-bar"]')).toHaveValue('Te');

  await page.keyboard.type('st');
  await expect(page.locator('[data-testid="formula-bar"]')).toHaveValue('Test');
});
```

---

## Summary: Test Coverage

This file covers:
- ✅ Tab navigation (horizontal entry)
- ✅ Enter navigation (vertical entry)
- ✅ Arrow key commits in EnterMode
- ✅ Backspace/Delete in EnterMode
- ✅ Escape cancellation
- ✅ EnterMode → EditMode transition (F2)
- ✅ Numeric data entry (integers, decimals, negatives)
- ✅ Text data entry
- ✅ Mode persistence and transitions
- ✅ Formula bar synchronization

**Total Scenarios**: 18 test scenarios

---

## See Also

- **formula-building.scenarios.md** - Formula-specific test scenarios
- **navigation.scenarios.md** - Grid navigation test scenarios
- **/docs/user-interactions/01-core-workflows.md** - User workflow documentation
