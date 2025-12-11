# Fill Handle Test Scenarios

This document provides comprehensive test scenarios for the fill handle feature in the v-sheet application.

**Related Documentation**:
- **Feature Spec**: [docs/features/fill-handle.md](../features/fill-handle.md)
- **Implementation Plan**: [docs/roadmap/implementation_plan_fill_handle.md](../roadmap/implementation_plan_fill_handle.md)
- **Architecture**: FillHandle (`js/ui/FillHandle.js`), FillPatternDetector (`js/engine/utils/FillPatternDetector.js`)

---

## Visual & Interaction Scenarios

### Scenario FH-1: Fill Handle Appears on Selection

**Given** the grid is loaded with default state
**When** user clicks on cell C5 (single cell selection)
**Then**
- A small blue dot (8x8px) appears at the bottom-right corner of C5
- The dot is positioned on the outer edge of the selection border
- The dot has a white border for contrast

**Playwright Implementation**:
```javascript
test('Fill handle appears on single cell selection', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-id="C5"]').click();

  const fillHandle = page.locator('#fill-handle');
  await expect(fillHandle).toBeVisible();

  // Check position is at bottom-right of C5
  const cell = page.locator('[data-id="C5"]');
  const cellBox = await cell.boundingBox();
  const handleBox = await fillHandle.boundingBox();

  // Handle should be near bottom-right corner
  expect(handleBox.x).toBeCloseTo(cellBox.x + cellBox.width, 10);
  expect(handleBox.y).toBeCloseTo(cellBox.y + cellBox.height, 10);
});
```

---

### Scenario FH-2: Fill Handle Appears on Range Selection

**Given** the grid is loaded
**When** user selects range B2:D4
**Then**
- Fill handle appears at the bottom-right corner of D4
- Fill handle is not visible on B2, C4, or other cells

**Playwright Implementation**:
```javascript
test('Fill handle appears at bottom-right of range', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-id="B2"]').click();
  await page.locator('[data-id="D4"]').click({ modifiers: ['Shift'] });

  const fillHandle = page.locator('#fill-handle');
  await expect(fillHandle).toBeVisible();

  // Should be at D4's bottom-right corner
  const d4 = page.locator('[data-id="D4"]');
  const d4Box = await d4.boundingBox();
  const handleBox = await fillHandle.boundingBox();

  expect(handleBox.x).toBeCloseTo(d4Box.x + d4Box.width, 10);
  expect(handleBox.y).toBeCloseTo(d4Box.y + d4Box.height, 10);
});
```

---

### Scenario FH-3: Crosshair Cursor on Fill Handle Hover

**Given** user has selected cell C5
**When** user hovers over the fill handle dot
**Then**
- Cursor changes to `crosshair`

**Playwright Implementation**:
```javascript
test('Crosshair cursor on fill handle hover', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-id="C5"]').click();

  const fillHandle = page.locator('#fill-handle');
  await fillHandle.hover();

  // Check cursor style
  const cursor = await fillHandle.evaluate(el =>
    window.getComputedStyle(el).cursor
  );
  expect(cursor).toBe('crosshair');
});
```

---

### Scenario FH-4: Fill Handle Hidden During Edit Mode

**Given** user has selected cell C5
**And** fill handle is visible
**When** user presses F2 to enter Edit mode
**Then**
- Fill handle is hidden
- Fill handle reappears when user commits with Enter

**Playwright Implementation**:
```javascript
test('Fill handle hidden during edit mode', async ({ page }) => {
  await page.goto('/');
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
```

---

### Scenario FH-5: Fill Preview During Drag

**Given** user has selected cell A1 with value "100"
**When** user starts dragging the fill handle downward toward A3
**Then**
- A dashed blue preview overlay appears covering A2:A3
- Preview updates as mouse moves

**Playwright Implementation**:
```javascript
test('Fill preview overlay during drag', async ({ page }) => {
  await page.goto('/');

  // Set up source cell
  await page.locator('[data-id="A1"]').click();
  await page.keyboard.type('100');
  await page.keyboard.press('Enter');
  await page.locator('[data-id="A1"]').click();

  // Start drag
  const fillHandle = page.locator('#fill-handle');
  const a3 = page.locator('[data-id="A3"]');

  await fillHandle.hover();
  await page.mouse.down();
  await a3.hover();

  // Check preview is visible
  const preview = page.locator('#fill-preview');
  await expect(preview).toBeVisible();

  await page.mouse.up();
});
```

---

## Single Cell Fill Scenarios

### Scenario FH-10: Fill Single Cell Value Downward

**Given** A1 = "Hello"
**When** user selects A1, drags fill handle to A3
**Then**
- A2 = "Hello"
- A3 = "Hello"
- Styles are copied if present

**Playwright Implementation**:
```javascript
test('Fill single cell value downward', async ({ page }) => {
  await page.goto('/');

  await page.locator('[data-id="A1"]').click();
  await page.keyboard.type('Hello');
  await page.keyboard.press('Enter');
  await page.locator('[data-id="A1"]').click();

  // Drag fill handle to A3
  const fillHandle = page.locator('#fill-handle');
  const a3 = page.locator('[data-id="A3"]');

  await fillHandle.hover();
  await page.mouse.down();
  await a3.hover();
  await page.mouse.up();

  // Verify fill
  await expect(page.locator('[data-id="A2"]')).toHaveText('Hello');
  await expect(page.locator('[data-id="A3"]')).toHaveText('Hello');
});
```

---

### Scenario FH-11: Fill Single Formula with Reference Adjustment

**Given** A1 = 10, A2 = 20
**And** B1 = "=A1+5"
**When** user selects B1, drags fill handle to B2
**Then**
- B1 = 15 (unchanged)
- B2 = "=A2+5" = 25

**Playwright Implementation**:
```javascript
test('Fill single formula with reference adjustment', async ({ page }) => {
  await page.goto('/');

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

  // Verify B1
  await expect(page.locator('[data-id="B1"]')).toHaveText('15');

  // Fill to B2
  await page.locator('[data-id="B1"]').click();
  const fillHandle = page.locator('#fill-handle');
  const b2 = page.locator('[data-id="B2"]');

  await fillHandle.hover();
  await page.mouse.down();
  await b2.hover();
  await page.mouse.up();

  // Verify B2 has adjusted formula
  await expect(page.locator('[data-id="B2"]')).toHaveText('25');
});
```

---

### Scenario FH-12: Fill Single Formula with Absolute Reference

**Given** A1 = 10
**And** B1 = "=$A$1*2"
**When** user selects B1, drags fill handle to B3
**Then**
- B2 = "=$A$1*2" = 20
- B3 = "=$A$1*2" = 20
- Absolute reference does not adjust

**Playwright Implementation**:
```javascript
test('Fill single formula with absolute reference unchanged', async ({ page }) => {
  await page.goto('/');

  await page.locator('[data-id="A1"]').click();
  await page.keyboard.type('10');
  await page.keyboard.press('Enter');

  await page.locator('[data-id="B1"]').click();
  await page.keyboard.type('=$A$1*2');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-id="B1"]')).toHaveText('20');

  // Fill to B3
  await page.locator('[data-id="B1"]').click();
  const fillHandle = page.locator('#fill-handle');
  const b3 = page.locator('[data-id="B3"]');

  await fillHandle.hover();
  await page.mouse.down();
  await b3.hover();
  await page.mouse.up();

  // Both should show 20 (absolute ref unchanged)
  await expect(page.locator('[data-id="B2"]')).toHaveText('20');
  await expect(page.locator('[data-id="B3"]')).toHaveText('20');
});
```

---

## Numeric Sequence Fill Scenarios (Linear Regression)

### Scenario FH-20: Fill Ascending Numeric Sequence Downward

**Given** A1 = 1, A2 = 2, A3 = 3
**When** user selects A1:A3, drags fill handle to A6
**Then**
- A4 = 4
- A5 = 5
- A6 = 6
- Linear regression with slope=1 continues the pattern

**Playwright Implementation**:
```javascript
test('Fill ascending numeric sequence downward', async ({ page }) => {
  await page.goto('/');

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

  // Drag to A6
  const fillHandle = page.locator('#fill-handle');
  const a6 = page.locator('[data-id="A6"]');

  await fillHandle.hover();
  await page.mouse.down();
  await a6.hover();
  await page.mouse.up();

  // Verify linear regression
  await expect(page.locator('[data-id="A4"]')).toHaveText('4');
  await expect(page.locator('[data-id="A5"]')).toHaveText('5');
  await expect(page.locator('[data-id="A6"]')).toHaveText('6');
});
```

---

### Scenario FH-21: Fill Descending Numeric Sequence (Drag Upward)

**Given** B4 = 1, B5 = 2, B6 = 3
**When** user selects B4:B6, drags fill handle upward to B2
**Then**
- B3 = 0 (extrapolate backward: 1 - 1 = 0)
- B2 = -1 (extrapolate backward: 0 - 1 = -1)

**Playwright Implementation**:
```javascript
test('Fill numeric sequence upward (reverse)', async ({ page }) => {
  await page.goto('/');

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

  // Drag to B2
  const fillHandle = page.locator('#fill-handle');
  const b2 = page.locator('[data-id="B2"]');

  await fillHandle.hover();
  await page.mouse.down();
  await b2.hover();
  await page.mouse.up();

  // Verify backward extrapolation
  await expect(page.locator('[data-id="B3"]')).toHaveText('0');
  await expect(page.locator('[data-id="B2"]')).toHaveText('-1');
});
```

---

### Scenario FH-22: Fill Non-Integer Step Sequence

**Given** A1 = 1, A2 = 3, A3 = 5
**When** user selects A1:A3, drags fill handle to A5
**Then**
- A4 = 7 (slope = 2)
- A5 = 9

**Playwright Implementation**:
```javascript
test('Fill non-integer step sequence', async ({ page }) => {
  await page.goto('/');

  await page.locator('[data-id="A1"]').click();
  await page.keyboard.type('1');
  await page.keyboard.press('Enter');
  await page.keyboard.type('3');
  await page.keyboard.press('Enter');
  await page.keyboard.type('5');
  await page.keyboard.press('Enter');

  await page.locator('[data-id="A1"]').click();
  await page.locator('[data-id="A3"]').click({ modifiers: ['Shift'] });

  const fillHandle = page.locator('#fill-handle');
  const a5 = page.locator('[data-id="A5"]');

  await fillHandle.hover();
  await page.mouse.down();
  await a5.hover();
  await page.mouse.up();

  await expect(page.locator('[data-id="A4"]')).toHaveText('7');
  await expect(page.locator('[data-id="A5"]')).toHaveText('9');
});
```

---

### Scenario FH-23: Fill Constant Sequence (All Same Values)

**Given** A1 = 5, A2 = 5, A3 = 5
**When** user selects A1:A3, drags fill handle to A5
**Then**
- A4 = 5 (slope = 0)
- A5 = 5

**Playwright Implementation**:
```javascript
test('Fill constant sequence', async ({ page }) => {
  await page.goto('/');

  await page.locator('[data-id="A1"]').click();
  await page.keyboard.type('5');
  await page.keyboard.press('Enter');
  await page.keyboard.type('5');
  await page.keyboard.press('Enter');
  await page.keyboard.type('5');
  await page.keyboard.press('Enter');

  await page.locator('[data-id="A1"]').click();
  await page.locator('[data-id="A3"]').click({ modifiers: ['Shift'] });

  const fillHandle = page.locator('#fill-handle');
  const a5 = page.locator('[data-id="A5"]');

  await fillHandle.hover();
  await page.mouse.down();
  await a5.hover();
  await page.mouse.up();

  await expect(page.locator('[data-id="A4"]')).toHaveText('5');
  await expect(page.locator('[data-id="A5"]')).toHaveText('5');
});
```

---

### Scenario FH-24: Fill Numeric Sequence Horizontally

**Given** A1 = 10, B1 = 20, C1 = 30
**When** user selects A1:C1, drags fill handle to E1
**Then**
- D1 = 40
- E1 = 50

**Playwright Implementation**:
```javascript
test('Fill numeric sequence horizontally', async ({ page }) => {
  await page.goto('/');

  await page.locator('[data-id="A1"]').click();
  await page.keyboard.type('10');
  await page.keyboard.press('Tab');
  await page.keyboard.type('20');
  await page.keyboard.press('Tab');
  await page.keyboard.type('30');
  await page.keyboard.press('Enter');

  await page.locator('[data-id="A1"]').click();
  await page.locator('[data-id="C1"]').click({ modifiers: ['Shift'] });

  const fillHandle = page.locator('#fill-handle');
  const e1 = page.locator('[data-id="E1"]');

  await fillHandle.hover();
  await page.mouse.down();
  await e1.hover();
  await page.mouse.up();

  await expect(page.locator('[data-id="D1"]')).toHaveText('40');
  await expect(page.locator('[data-id="E1"]')).toHaveText('50');
});
```

---

## Formula Range Fill Scenarios (Cyclic Copy)

### Scenario FH-30: Fill Formula Range with Cyclic Copy

**Given** A1 = "=2+1", A2 = "=2+2", A3 = "=2+3"
**When** user selects A1:A3, drags fill handle to A7
**Then**
- A4 = "=2+1" (from A1)
- A5 = "=2+2" (from A2)
- A6 = "=2+3" (from A3)
- A7 = "=2+1" (from A1, cycled)
- Values: A4=3, A5=4, A6=5, A7=3

**Playwright Implementation**:
```javascript
test('Fill formula range with cyclic copy', async ({ page }) => {
  await page.goto('/');

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

  const fillHandle = page.locator('#fill-handle');
  const a7 = page.locator('[data-id="A7"]');

  await fillHandle.hover();
  await page.mouse.down();
  await a7.hover();
  await page.mouse.up();

  // Verify cyclic copy
  await expect(page.locator('[data-id="A4"]')).toHaveText('3');
  await expect(page.locator('[data-id="A5"]')).toHaveText('4');
  await expect(page.locator('[data-id="A6"]')).toHaveText('5');
  await expect(page.locator('[data-id="A7"]')).toHaveText('3'); // Cycled back
});
```

---

### Scenario FH-31: Fill Formula Range Upward (Reverse Cyclic)

**Given** B4 = "=X1", B5 = "=X2", B6 = "=X3"
**When** user selects B4:B6, drags fill handle upward to B2
**Then**
- B3 = "=X3" (from B6)
- B2 = "=X2" (from B5)
- Cycle starts from end of range and goes backward

**Playwright Implementation**:
```javascript
test('Fill formula range upward (reverse cyclic)', async ({ page }) => {
  await page.goto('/');

  // Set up X1, X2, X3 for reference
  await page.locator('[data-id="X1"]').click();
  await page.keyboard.type('100');
  await page.keyboard.press('Enter');
  await page.keyboard.type('200');
  await page.keyboard.press('Enter');
  await page.keyboard.type('300');
  await page.keyboard.press('Enter');

  // Create formulas
  await page.locator('[data-id="B4"]').click();
  await page.keyboard.type('=X1');
  await page.keyboard.press('Enter');
  await page.keyboard.type('=X2');
  await page.keyboard.press('Enter');
  await page.keyboard.type('=X3');
  await page.keyboard.press('Enter');

  await page.locator('[data-id="B4"]').click();
  await page.locator('[data-id="B6"]').click({ modifiers: ['Shift'] });

  const fillHandle = page.locator('#fill-handle');
  const b2 = page.locator('[data-id="B2"]');

  await fillHandle.hover();
  await page.mouse.down();
  await b2.hover();
  await page.mouse.up();

  // B3 gets formula from B6, B2 gets formula from B5
  await expect(page.locator('[data-id="B3"]')).toHaveText('300');
  await expect(page.locator('[data-id="B2"]')).toHaveText('200');
});
```

---

## Text Range Fill Scenarios

### Scenario FH-40: Fill Text Range with Cyclic Copy

**Given** A1 = "Red", A2 = "Green", A3 = "Blue"
**When** user selects A1:A3, drags fill handle to A6
**Then**
- A4 = "Red" (from A1)
- A5 = "Green" (from A2)
- A6 = "Blue" (from A3)

**Playwright Implementation**:
```javascript
test('Fill text range with cyclic copy', async ({ page }) => {
  await page.goto('/');

  await page.locator('[data-id="A1"]').click();
  await page.keyboard.type('Red');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Green');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Blue');
  await page.keyboard.press('Enter');

  await page.locator('[data-id="A1"]').click();
  await page.locator('[data-id="A3"]').click({ modifiers: ['Shift'] });

  const fillHandle = page.locator('#fill-handle');
  const a6 = page.locator('[data-id="A6"]');

  await fillHandle.hover();
  await page.mouse.down();
  await a6.hover();
  await page.mouse.up();

  await expect(page.locator('[data-id="A4"]')).toHaveText('Red');
  await expect(page.locator('[data-id="A5"]')).toHaveText('Green');
  await expect(page.locator('[data-id="A6"]')).toHaveText('Blue');
});
```

---

## Multi-Column/Row Fill Scenarios

### Scenario FH-50: Fill Multi-Column Range Downward

**Given**
- A1 = 1, B1 = 2
- A2 = 2, B2 = 4
- A3 = 3, B3 = 6
**When** user selects A1:B3, drags fill handle to row 4
**Then**
- A4 = 4 (linear regression of A1:A3)
- B4 = 8 (linear regression of B1:B3)
- Each column extends independently

**Playwright Implementation**:
```javascript
test('Fill multi-column range downward', async ({ page }) => {
  await page.goto('/');

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

  const fillHandle = page.locator('#fill-handle');
  const b4 = page.locator('[data-id="B4"]');

  await fillHandle.hover();
  await page.mouse.down();
  await b4.hover();
  await page.mouse.up();

  // Each column extends independently
  await expect(page.locator('[data-id="A4"]')).toHaveText('4');
  await expect(page.locator('[data-id="B4"]')).toHaveText('8');
});
```

---

### Scenario FH-51: Fill Multi-Row Range Rightward

**Given**
- A1 = 1, B1 = 2
- A2 = 2, B2 = 4
- A3 = 3, B3 = 6
**When** user selects A1:B3, drags fill handle to column C
**Then**
- C1 = 3 (linear regression of A1:B1)
- C2 = 6 (linear regression of A2:B2)
- C3 = 9 (linear regression of A3:B3)
- Each row extends independently

**Playwright Implementation**:
```javascript
test('Fill multi-row range rightward', async ({ page }) => {
  await page.goto('/');

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

  const fillHandle = page.locator('#fill-handle');
  const c3 = page.locator('[data-id="C3"]');

  await fillHandle.hover();
  await page.mouse.down();
  await c3.hover();
  await page.mouse.up();

  // Each row extends independently
  await expect(page.locator('[data-id="C1"]')).toHaveText('3');
  await expect(page.locator('[data-id="C2"]')).toHaveText('6');
  await expect(page.locator('[data-id="C3"]')).toHaveText('9');
});
```

---

## Undo/Redo Scenarios

### Scenario FH-60: Undo Fill Operation

**Given** A1 = 1, A2 = 2, A3 = 3
**And** user has filled A1:A3 to A5 (A4=4, A5=5)
**When** user presses Ctrl+Z
**Then**
- A4 is empty
- A5 is empty
- A1:A3 remain unchanged

**Playwright Implementation**:
```javascript
test('Undo fill operation', async ({ page }) => {
  await page.goto('/');

  await page.locator('[data-id="A1"]').click();
  await page.keyboard.type('1');
  await page.keyboard.press('Enter');
  await page.keyboard.type('2');
  await page.keyboard.press('Enter');
  await page.keyboard.type('3');
  await page.keyboard.press('Enter');

  await page.locator('[data-id="A1"]').click();
  await page.locator('[data-id="A3"]').click({ modifiers: ['Shift'] });

  const fillHandle = page.locator('#fill-handle');
  const a5 = page.locator('[data-id="A5"]');

  await fillHandle.hover();
  await page.mouse.down();
  await a5.hover();
  await page.mouse.up();

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
```

---

### Scenario FH-61: Redo Fill Operation

**Given** user has undone a fill operation (A4, A5 are empty)
**When** user presses Ctrl+Y
**Then**
- A4 = 4
- A5 = 5

**Playwright Implementation**:
```javascript
test('Redo fill operation', async ({ page }) => {
  await page.goto('/');

  // ... same setup as FH-60 ...
  // ... perform fill, then undo ...

  // Redo
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+Shift+Z' : 'Control+Y'
  );

  // Verify redo
  await expect(page.locator('[data-id="A4"]')).toHaveText('4');
  await expect(page.locator('[data-id="A5"]')).toHaveText('5');
});
```

---

## Edge Case Scenarios

### Scenario FH-70: Fill Does Not Exceed Grid Boundaries

**Given** A99 = 1, A100 = 2 (near bottom boundary)
**When** user selects A99:A100, attempts to drag fill handle beyond row 100
**Then**
- Fill stops at row 100
- No error is thrown

---

### Scenario FH-71: Fill Preserves Cell Styles

**Given** A1 = "Bold text" with bold formatting
**When** user fills A1 to A3
**Then**
- A2 and A3 have "Bold text" with bold formatting

---

### Scenario FH-72: Fill with Empty Cells in Source Range

**Given** A1 = 1, A2 = (empty), A3 = 3
**When** user selects A1:A3, drags to A6
**Then**
- Treats as text/formula pattern (not pure numeric)
- A4 = 1 (from A1)
- A5 = "" (from A2)
- A6 = 3 (from A3)

---

### Scenario FH-73: Single Numeric Cell Fill (No Regression)

**Given** A1 = 42
**When** user fills A1 to A3
**Then**
- A2 = 42
- A3 = 42
- Single value is simply copied (slope = 0)

---

## Unit Test Scenarios for FillPatternDetector

### Scenario FPD-1: isNumericSequence Returns True for Numbers Only

```javascript
test('isNumericSequence returns true for numeric values', () => {
  const cells = [
    { value: '1', isFormula: false },
    { value: '2', isFormula: false },
    { value: '3', isFormula: false }
  ];
  expect(FillPatternDetector.isNumericSequence(cells)).toBe(true);
});
```

### Scenario FPD-2: isNumericSequence Returns False for Formulas

```javascript
test('isNumericSequence returns false when formulas present', () => {
  const cells = [
    { value: '=A1', isFormula: true },
    { value: '2', isFormula: false }
  ];
  expect(FillPatternDetector.isNumericSequence(cells)).toBe(false);
});
```

### Scenario FPD-3: calculateLinearRegression Calculates Slope

```javascript
test('calculateLinearRegression calculates correct slope', () => {
  const result = FillPatternDetector.calculateLinearRegression([1, 2, 3]);
  expect(result.slope).toBe(1);
  expect(result.intercept).toBe(1);
});
```

### Scenario FPD-4: generateNumericFill Extends Sequence

```javascript
test('generateNumericFill extends sequence correctly', () => {
  const result = FillPatternDetector.generateNumericFill([1, 2, 3], 3, false);
  expect(result).toEqual([4, 5, 6]);
});
```

### Scenario FPD-5: generateNumericFill Handles Reverse

```javascript
test('generateNumericFill handles reverse direction', () => {
  const result = FillPatternDetector.generateNumericFill([1, 2, 3], 2, true);
  expect(result).toEqual([0, -1]);
});
```

### Scenario FPD-6: generateCyclicFill Cycles Through Values

```javascript
test('generateCyclicFill cycles through source values', () => {
  const source = [
    { value: 'A', sourceCoords: { row: 0, col: 0 } },
    { value: 'B', sourceCoords: { row: 1, col: 0 } }
  ];
  const result = FillPatternDetector.generateCyclicFill(source, 4, false);

  expect(result[0].value).toBe('A');
  expect(result[1].value).toBe('B');
  expect(result[2].value).toBe('A'); // Cycled
  expect(result[3].value).toBe('B'); // Cycled
});
```
