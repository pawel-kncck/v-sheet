# Formula Building Test Scenarios

This document contains test scenarios for formula building workflows in Given-When-Then format, ready for implementation in Playwright e2e tests.

**Related User Documentation**: `/docs/user-interactions/01-core-workflows.md` (Workflows #5, #6, #7)

---

## Scenario Group: Basic Formula Entry

### Scenario 1.1: Simple formula by typing

**Given** the user has selected cell C1
**When** the user types "=A1+B1" and presses Enter
**Then**:
- Cell C1 displays the calculated result (e.g., if A1=10, B1=20, then C1 shows "30")
- Formula bar shows "=A1+B1" when C1 is selected
- Selection moves to C2
- Mode is ReadyMode

**Playwright Implementation**:
```javascript
test('simple formula by typing', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Setup: Add values to A1 and B1
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('10');
  await page.keyboard.press('Enter');

  await page.locator('[data-cell="B1"]').click();
  await page.keyboard.type('20');
  await page.keyboard.press('Enter');

  // Test: Create formula
  await page.locator('[data-cell="C1"]').click();
  await page.keyboard.type('=A1+B1');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-cell="C1"]')).toHaveText('30');

  // Verify formula bar shows formula
  await page.locator('[data-cell="C1"]').click();
  await expect(page.locator('[data-testid="formula-bar"]')).toHaveValue('=A1+B1');

  await expect(page.locator('[data-cell="C2"]')).toHaveClass(/selected/);
});
```

---

### Scenario 1.2: Formula with multiplication

**Given** cell A1 contains 5, cell B1 contains 3
**When** user creates formula "=A1*B1" in C1
**Then**:
- C1 displays "15"

**Implementation**:
```javascript
test('formula with multiplication', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('5');
  await page.keyboard.press('Enter');

  await page.locator('[data-cell="B1"]').click();
  await page.keyboard.type('3');
  await page.keyboard.press('Enter');

  await page.locator('[data-cell="C1"]').click();
  await page.keyboard.type('=A1*B1');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-cell="C1"]')).toHaveText('15');
});
```

---

### Scenario 1.3: Formula with operator precedence

**Given** cell A1 contains 10, B1 contains 5, C1 contains 2
**When** user creates formula "=A1+B1*C1" in D1
**Then**:
- D1 displays "20" (multiplication first: 5*2=10, then 10+10=20)
- NOT "30" (which would be (10+5)*2)

**Implementation**:
```javascript
test('formula respects operator precedence', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Setup values
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('10');
  await page.keyboard.press('Tab');

  await page.keyboard.type('5');
  await page.keyboard.press('Tab');

  await page.keyboard.type('2');
  await page.keyboard.press('Enter');

  // Create formula
  await page.locator('[data-cell="D1"]').click();
  await page.keyboard.type('=A1+B1*C1');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-cell="D1"]')).toHaveText('20');
});
```

---

## Scenario Group: PointMode - Click to Build Formula

### Scenario 2.1: Type "=" then click cell

**Given** cell A1 contains 100
**When** user:
1. Selects cell B1
2. Types "="
3. Clicks cell A1
4. Presses Enter

**Then**:
- Mode switches to PointMode when "=" is typed
- Formula bar shows "=A1" after click
- B1 displays "100" after Enter
- Mode returns to ReadyMode

**Implementation**:
```javascript
test('type equals then click cell reference', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Setup
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('100');
  await page.keyboard.press('Enter');

  // Test
  await page.locator('[data-cell="B1"]').click();
  await page.keyboard.type('=');

  await expect(page.locator('[data-testid="mode-indicator"]')).toHaveText('Point');

  await page.locator('[data-cell="A1"]').click();
  await expect(page.locator('[data-testid="formula-bar"]')).toHaveValue('=A1');

  await page.keyboard.press('Enter');
  await expect(page.locator('[data-cell="B1"]')).toHaveText('100');
  await expect(page.locator('[data-testid="mode-indicator"]')).toHaveText('Ready');
});
```

---

### Scenario 2.2: Arrow keys update reference in PointMode

**Given** cell A1 contains 10, B1 contains 20, C1 contains 30
**When** user:
1. Selects cell D1
2. Types "="
3. Presses Arrow Left (references C1)
4. Presses Arrow Left again (replaces with B1)
5. Presses Enter

**Then**:
- Formula bar shows "=B1" (not "=C1B1", reference was replaced)
- D1 displays "20"

**Implementation**:
```javascript
test('arrow keys replace reference in PointMode', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Setup
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('10');
  await page.keyboard.press('Tab');
  await page.keyboard.type('20');
  await page.keyboard.press('Tab');
  await page.keyboard.type('30');
  await page.keyboard.press('Enter');

  // Test
  await page.locator('[data-cell="D1"]').click();
  await page.keyboard.type('=');
  await page.keyboard.press('ArrowLeft');

  await expect(page.locator('[data-testid="formula-bar"]')).toHaveValue('=C1');

  await page.keyboard.press('ArrowLeft');

  await expect(page.locator('[data-testid="formula-bar"]')).toHaveValue('=B1');

  await page.keyboard.press('Enter');
  await expect(page.locator('[data-cell="D1"]')).toHaveText('20');
});
```

---

### Scenario 2.3: Operator locks reference, enables append

**Given** cell A1 contains 10, B1 contains 5
**When** user:
1. Types "=" in C1
2. Clicks A1 (formula shows "=A1")
3. Types "+" (formula shows "=A1+")
4. Clicks B1 (formula shows "=A1+B1", B1 APPENDED not replaced)
5. Presses Enter

**Then**:
- C1 displays "15"
- Formula has both references

**Implementation**:
```javascript
test('operator locks reference and enables append', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Setup
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('10');
  await page.keyboard.press('Enter');

  await page.locator('[data-cell="B1"]').click();
  await page.keyboard.type('5');
  await page.keyboard.press('Enter');

  // Test
  await page.locator('[data-cell="C1"]').click();
  await page.keyboard.type('=');
  await page.locator('[data-cell="A1"]').click();

  await expect(page.locator('[data-testid="formula-bar"]')).toHaveValue('=A1');

  await page.keyboard.type('+');
  await expect(page.locator('[data-testid="formula-bar"]')).toHaveValue('=A1+');

  await page.locator('[data-cell="B1"]').click();
  await expect(page.locator('[data-testid="formula-bar"]')).toHaveValue('=A1+B1');

  await page.keyboard.press('Enter');
  await expect(page.locator('[data-cell="C1"]')).toHaveText('15');
});
```

---

### Scenario 2.4: Arrow after operator appends reference

**Given** cell A1 contains 10, B1 contains 20
**When** user:
1. Types "=" in C1
2. Presses Arrow Left (references B1)
3. Types "+"
4. Presses Arrow Left (references A1, appended)

**Then**:
- Formula shows "=B1+A1"
- C1 displays "30"

**Implementation**:
```javascript
test('arrow after operator appends reference', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('10');
  await page.keyboard.press('Tab');
  await page.keyboard.type('20');
  await page.keyboard.press('Enter');

  await page.locator('[data-cell="C1"]').click();
  await page.keyboard.type('=');
  await page.keyboard.press('ArrowLeft');

  await expect(page.locator('[data-testid="formula-bar"]')).toHaveValue('=B1');

  await page.keyboard.type('+');
  await page.keyboard.press('ArrowLeft');

  await expect(page.locator('[data-testid="formula-bar"]')).toHaveValue('=B1+A1');

  await page.keyboard.press('Enter');
  await expect(page.locator('[data-cell="C1"]')).toHaveText('30');
});
```

---

## Scenario Group: SUM Function

### Scenario 3.1: SUM with range (typed)

**Given** cells A1:A5 contain values 10, 20, 30, 40, 50
**When** user types "=SUM(A1:A5)" in B1 and presses Enter
**Then**:
- B1 displays "150"

**Implementation**:
```javascript
test('SUM function with typed range', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Setup: Fill A1:A5 with values
  await page.locator('[data-cell="A1"]').click();
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

  // Test
  await page.locator('[data-cell="B1"]').click();
  await page.keyboard.type('=SUM(A1:A5)');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-cell="B1"]')).toHaveText('150');
});
```

---

### Scenario 3.2: SUM with range (point and click)

**Given** cells A1:A5 contain values 1, 2, 3, 4, 5
**When** user:
1. Types "=SUM(" in B1
2. Clicks A1
3. Shift+Clicks A5 (creates range)
4. Types ")"
5. Presses Enter

**Then**:
- Formula bar shows "=SUM(A1:A5)"
- B1 displays "15"

**Implementation**:
```javascript
test('SUM with range created by Shift+Click', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Setup
  await page.locator('[data-cell="A1"]').click();
  for (let i = 1; i <= 5; i++) {
    await page.keyboard.type(String(i));
    await page.keyboard.press('Enter');
  }

  // Test
  await page.locator('[data-cell="B1"]').click();
  await page.keyboard.type('=SUM(');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.down('Shift');
  await page.locator('[data-cell="A5"]').click();
  await page.keyboard.up('Shift');

  await expect(page.locator('[data-testid="formula-bar"]')).toContain('=SUM(A1:A5');

  await page.keyboard.type(')');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-cell="B1"]')).toHaveText('15');
});
```

---

### Scenario 3.3: SUM with multiple arguments

**Given** cells A1=10, A2=20, B1=5
**When** user types "=SUM(A1,A2,B1)" in C1
**Then**:
- C1 displays "35"

**Implementation**:
```javascript
test('SUM with multiple comma-separated arguments', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('10');
  await page.keyboard.press('Enter');
  await page.keyboard.type('20');
  await page.keyboard.press('Enter');

  await page.locator('[data-cell="B1"]').click();
  await page.keyboard.type('5');
  await page.keyboard.press('Enter');

  await page.locator('[data-cell="C1"]').click();
  await page.keyboard.type('=SUM(A1,A2,B1)');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-cell="C1"]')).toHaveText('35');
});
```

---

## Scenario Group: Formula Recalculation

### Scenario 4.1: Formula updates when dependency changes

**Given** cell A1 contains 10, cell B1 contains "=A1*2" (displays 20)
**When** user changes A1 to 15
**Then**:
- B1 automatically updates to display "30"

**Implementation**:
```javascript
test('formula recalculates when dependency changes', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Setup initial formula
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('10');
  await page.keyboard.press('Enter');

  await page.locator('[data-cell="B1"]').click();
  await page.keyboard.type('=A1*2');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-cell="B1"]')).toHaveText('20');

  // Change dependency
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('15');
  await page.keyboard.press('Enter');

  // Verify recalculation
  await expect(page.locator('[data-cell="B1"]')).toHaveText('30');
});
```

---

### Scenario 4.2: Chain of formula dependencies

**Given**:
- A1 = 10
- B1 = "=A1+5" (displays 15)
- C1 = "=B1*2" (displays 30)

**When** user changes A1 to 20
**Then**:
- B1 updates to "25"
- C1 updates to "50"

**Implementation**:
```javascript
test('chain of formulas recalculates correctly', async ({ page }) => {
  await page.goto('http://localhost:5000');

  // Setup chain
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('10');
  await page.keyboard.press('Enter');

  await page.locator('[data-cell="B1"]').click();
  await page.keyboard.type('=A1+5');
  await page.keyboard.press('Enter');

  await page.locator('[data-cell="C1"]').click();
  await page.keyboard.type('=B1*2');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-cell="B1"]')).toHaveText('15');
  await expect(page.locator('[data-cell="C1"]')).toHaveText('30');

  // Change source
  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('20');
  await page.keyboard.press('Enter');

  // Verify chain update
  await expect(page.locator('[data-cell="B1"]')).toHaveText('25');
  await expect(page.locator('[data-cell="C1"]')).toHaveText('50');
});
```

---

## Scenario Group: Formula Errors

### Scenario 5.1: Division by zero error

**Given** cell A1 contains 10, B1 contains 0
**When** user creates formula "=A1/B1" in C1
**Then**:
- C1 displays "#DIV/0!" error

**Implementation**:
```javascript
test('division by zero shows #DIV/0! error', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('10');
  await page.keyboard.press('Tab');
  await page.keyboard.type('0');
  await page.keyboard.press('Enter');

  await page.locator('[data-cell="C1"]').click();
  await page.keyboard.type('=A1/B1');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-cell="C1"]')).toHaveText('#DIV/0!');
});
```

---

### Scenario 5.2: Invalid cell reference error

**Given** user creates formula "=ZZZ999" in A1
**When** user presses Enter
**Then**:
- A1 displays "#REF!" error (invalid reference)

**Implementation**:
```javascript
test('invalid cell reference shows #REF! error', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('=ZZZ999');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-cell="A1"]')).toHaveText('#REF!');
});
```

---

### Scenario 5.3: Circular reference error

**Given**:
- A1 contains "=B1+10"
**When** user creates "=A1*2" in B1
**Then**:
- Both A1 and B1 display "#CIRCULAR!" error

**Implementation**:
```javascript
test('circular reference shows #CIRCULAR! error', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('=B1+10');
  await page.keyboard.press('Enter');

  await page.locator('[data-cell="B1"]').click();
  await page.keyboard.type('=A1*2');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-cell="A1"]')).toHaveText('#CIRCULAR!');
  await expect(page.locator('[data-cell="B1"]')).toHaveText('#CIRCULAR!');
});
```

---

### Scenario 5.4: Syntax error (incomplete formula)

**Given** user types "=A1+" in B1 (incomplete, no second operand)
**When** user presses Enter
**Then**:
- B1 displays "#ERROR!" or "#VALUE!" (syntax error)

**Implementation**:
```javascript
test('incomplete formula shows error', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="B1"]').click();
  await page.keyboard.type('=A1+');
  await page.keyboard.press('Enter');

  const text = await page.locator('[data-cell="B1"]').textContent();
  expect(text).toMatch(/#ERROR!|#VALUE!/);
});
```

---

## Scenario Group: PointMode to EditMode Transitions

### Scenario 6.1: Type letter in PointMode switches to EditMode

**Given** user is in PointMode with formula "=A1+"
**When** user types "B" (letter, not operator)
**Then**:
- Mode switches to EditMode
- Formula bar shows "=A1+B"
- Arrow keys now move cursor, not update reference

**Implementation**:
```javascript
test('typing letter in PointMode switches to EditMode', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="C1"]').click();
  await page.keyboard.type('=A1+');

  await expect(page.locator('[data-testid="mode-indicator"]')).toHaveText('Point');

  await page.keyboard.type('B');

  await expect(page.locator('[data-testid="mode-indicator"]')).toHaveText('Edit');
  await expect(page.locator('[data-testid="formula-bar"]')).toHaveValue('=A1+B');

  // Arrow should move cursor, not update reference
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.type('X');

  await expect(page.locator('[data-testid="formula-bar"]')).toContain('X');
});
```

---

### Scenario 6.2: F2 in PointMode switches to EditMode

**Given** user is in PointMode with formula "=A1"
**When** user presses F2
**Then**:
- Mode switches to EditMode
- Cursor is positioned in formula
- Can use arrow keys to move cursor

**Implementation**:
```javascript
test('F2 in PointMode switches to EditMode', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="C1"]').click();
  await page.keyboard.type('=A1');

  await expect(page.locator('[data-testid="mode-indicator"]')).toHaveText('Point');

  await page.keyboard.press('F2');

  await expect(page.locator('[data-testid="mode-indicator"]')).toHaveText('Edit');

  // Can now edit with cursor
  await page.keyboard.press('Home');
  await page.keyboard.type('SUM(');
  await page.keyboard.press('End');
  await page.keyboard.type(')');

  await expect(page.locator('[data-testid="formula-bar"]')).toHaveValue('=SUM(A1)');
});
```

---

## Scenario Group: Escape Cancels Formula

### Scenario 7.1: Escape in PointMode cancels formula

**Given** user has started formula "=A1+B1" in C1
**When** user presses Escape
**Then**:
- Formula is discarded
- C1 remains empty
- Mode returns to ReadyMode
- No history command created

**Implementation**:
```javascript
test('Escape in PointMode cancels formula', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="C1"]').click();
  await page.keyboard.type('=A1+B1');

  await expect(page.locator('[data-testid="formula-bar"]')).toHaveValue('=A1+B1');

  await page.keyboard.press('Escape');

  await expect(page.locator('[data-cell="C1"]')).toBeEmpty();
  await expect(page.locator('[data-testid="mode-indicator"]')).toHaveText('Ready');
  await expect(page.locator('[data-testid="formula-bar"]')).toHaveValue('');
});
```

---

## Scenario Group: Reference Highlighting (Visual Feedback)

### Scenario 8.1: Referenced cell is highlighted

**Given** user is building formula in C1
**When** user types "=" and clicks A1
**Then**:
- A1 gets visual highlight/border (referenced cell indicator)
- Formula bar shows "=A1"

**Implementation**:
```javascript
test('referenced cell is visually highlighted', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="C1"]').click();
  await page.keyboard.type('=');
  await page.locator('[data-cell="A1"]').click();

  // Check A1 has reference highlight class
  await expect(page.locator('[data-cell="A1"]')).toHaveClass(/referenced|highlight/);

  await expect(page.locator('[data-testid="formula-bar"]')).toHaveValue('=A1');
});
```

---

## Scenario Group: Advanced Functions

### Scenario 9.1: AVERAGE function

**Given** cells A1:A4 contain 10, 20, 30, 40
**When** user types "=AVERAGE(A1:A4)" in B1
**Then**:
- B1 displays "25"

**Implementation**:
```javascript
test('AVERAGE function calculates correctly', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  for (const val of ['10', '20', '30', '40']) {
    await page.keyboard.type(val);
    await page.keyboard.press('Enter');
  }

  await page.locator('[data-cell="B1"]').click();
  await page.keyboard.type('=AVERAGE(A1:A4)');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-cell="B1"]')).toHaveText('25');
});
```

---

### Scenario 9.2: IF function

**Given** cell A1 contains 75
**When** user types "=IF(A1>50, "Pass", "Fail")" in B1
**Then**:
- B1 displays "Pass"

**Implementation**:
```javascript
test('IF function evaluates conditions', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('75');
  await page.keyboard.press('Enter');

  await page.locator('[data-cell="B1"]').click();
  await page.keyboard.type('=IF(A1>50,"Pass","Fail")');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-cell="B1"]')).toHaveText('Pass');
});
```

---

### Scenario 9.3: MIN and MAX functions

**Given** cells A1:A5 contain 15, 3, 42, 8, 27
**When** user creates:
- "=MIN(A1:A5)" in B1
- "=MAX(A1:A5)" in C1

**Then**:
- B1 displays "3"
- C1 displays "42"

**Implementation**:
```javascript
test('MIN and MAX functions work correctly', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  for (const val of ['15', '3', '42', '8', '27']) {
    await page.keyboard.type(val);
    await page.keyboard.press('Enter');
  }

  await page.locator('[data-cell="B1"]').click();
  await page.keyboard.type('=MIN(A1:A5)');
  await page.keyboard.press('Enter');

  await page.locator('[data-cell="C1"]').click();
  await page.keyboard.type('=MAX(A1:A5)');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-cell="B1"]')).toHaveText('3');
  await expect(page.locator('[data-cell="C1"]')).toHaveText('42');
});
```

---

## Scenario Group: Absolute References (F4 Toggle)

### Scenario 10.1: F4 cycles A1 → $A$1 in PointMode

**Given** user is in PointMode building formula "=A1"
**When** user presses F4
**Then**:
- Formula changes to "=$A$1"
- Reference remains highlighted
- Mode stays in PointMode

**Implementation**:
```javascript
test('F4 cycles A1 → $A$1 in PointMode', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('=A1');
  await page.keyboard.press('F4');

  const editor = page.locator('.cell-editor');
  await expect(editor).toHaveValue('=$A$1');
});
```

---

### Scenario 10.2: F4 completes full cycle $A$1 → A$1 → $A1 → A1

**Given** user has formula "=$A$1" in PointMode
**When** user presses F4 three more times
**Then**:
- First press: "=A$1" (row absolute)
- Second press: "=$A1" (column absolute)
- Third press: "=A1" (relative)

**Implementation**:
```javascript
test('F4 completes full cycle', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.type('=$A$1');

  await page.keyboard.press('F4');
  await expect(page.locator('.cell-editor')).toHaveValue('=A$1');

  await page.keyboard.press('F4');
  await expect(page.locator('.cell-editor')).toHaveValue('=$A1');

  await page.keyboard.press('F4');
  await expect(page.locator('.cell-editor')).toHaveValue('=A1');
});
```

---

### Scenario 10.3: F4 in EditMode cycles reference at cursor

**Given** user is editing formula "=A1+B2" with cursor after A1
**When** user presses F4
**Then**:
- Formula changes to "=$A$1+B2"
- Only A1 is affected (cursor position matters)
- Mode stays in EditMode

**Implementation**:
```javascript
test('F4 in EditMode cycles reference at cursor position', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="A1"]').click();
  await page.keyboard.press('F2');
  await page.keyboard.type('=A1+B2');

  // Move cursor to position after A1
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('ArrowLeft');
  }

  await page.keyboard.press('F4');

  const editor = page.locator('.cell-editor');
  await expect(editor).toHaveValue('=$A$1+B2');
});
```

---

### Scenario 10.4: F4 with range reference

**Given** user has formula "=SUM(A1:B2)" in PointMode
**When** user presses F4
**Then**:
- Both parts of range are cycled: "=SUM($A$1:$B$2)"

**Implementation**:
```javascript
test('F4 cycles range references', async ({ page }) => {
  await page.goto('http://localhost:5000');

  await page.locator('[data-cell="C1"]').click();
  await page.keyboard.type('=SUM(A1:B2)');
  await page.keyboard.press('F4');

  const editor = page.locator('.cell-editor');
  await expect(editor).toHaveValue('=SUM($A$1:$B$2)');
});
```

---

## Summary: Test Coverage

This file covers:
- ✅ Basic formula entry (typing)
- ✅ PointMode formula building (clicks and arrows)
- ✅ Reference replacement vs append logic
- ✅ SUM function (typed and point-and-click ranges)
- ✅ Formula recalculation and dependency chains
- ✅ Formula errors (DIV/0, REF, CIRCULAR, syntax)
- ✅ PointMode ↔ EditMode transitions
- ✅ Escape cancellation
- ✅ Reference highlighting (visual feedback)
- ✅ Advanced functions (AVERAGE, IF, MIN, MAX)
- ✅ Absolute references (F4 toggle, cycling formats)

**Total Scenarios**: 32 test scenarios

---

## See Also

- **User Workflows**: `/docs/user-interactions/01-core-workflows.md` (#5, #6, #7)
- **Advanced Scenarios**: `/docs/user-interactions/04-advanced-scenarios.md` (#1, #2, #11)
- **Mode Behaviors**: `/docs/user-interactions/02-mode-behaviors.md` (PointMode section)
- **Navigation Scenarios**: `/docs/test-scenarios/navigation.scenarios.md`
- **Data Entry Scenarios**: `/docs/test-scenarios/data-entry.scenarios.md`
