# Implementation Plan: Cell/Range Border Formatting

**Status**: Planning Complete
**Date**: 2025-12-09
**Epic Dependencies**: Epic 3 (Cell Formatting), Epic 1 (History Management)

## Overview

Implement comprehensive border formatting for cells and ranges with:
1. **Border Menu UI**: Context menu with position selectors (all, outer, inner, top, bottom, left, right, etc.)
2. **Border Customization**: Style (solid, dashed, dotted), color, and thickness controls
3. **Multi-Position Selection**: Users can select multiple border positions simultaneously
4. **Command Pattern**: Full undo/redo support via BorderFormatCommand
5. **Persistence**: Borders stored in StyleManager palette and saved to file

---

## Architecture Overview

### Data Model

Borders are stored as part of the cell's style object in the StyleManager palette:

```javascript
{
  border: {
    top: { style: 'solid', color: '#000000', width: 1 },
    right: { style: 'solid', color: '#000000', width: 1 },
    bottom: { style: 'solid', color: '#000000', width: 1 },
    left: { style: 'solid', color: '#000000', width: 1 }
  }
}
```

- Each side (top, right, bottom, left) can be independently styled or `null`
- Style options: `'solid'`, `'dashed'`, `'dotted'`
- Color: Any valid CSS color (hex, rgb, etc.)
- Width: Numeric value in pixels (typically 1-5px)

### Component Architecture

```
Toolbar (border button)
    ↓
BorderMenu (UI component)
    ↓
Spreadsheet.applyBorderFormat()
    ↓
BorderResolver (logic layer)
    ↓
BorderFormatCommand (history)
    ↓
StyleManager → FileManager → GridRenderer
```

### Key Classes

1. **BorderMenu** (`js/ui/BorderMenu.js`)
   - Manages context menu visibility and positioning
   - Tracks selected positions (multi-select state)
   - Emits events when settings change
   - Handles toggle logic for position buttons

2. **BorderResolver** (`js/ui/BorderResolver.js`)
   - Converts high-level selections to cell-specific border changes
   - Maps positions (all, outer, inner, etc.) to individual cell borders
   - Returns map of cellId → border changes

3. **BorderFormatCommand** (`js/history/commands/BorderFormatCommand.js`)
   - Extends Command class
   - Applies border changes to cells
   - Stores old/new styleIds for undo/redo
   - Updates FileManager and GridRenderer

---

## Phase 1: Core Infrastructure

### 1.1 Create BorderResolver Utility

**File**: `js/ui/BorderResolver.js`

**Purpose**: Convert high-level border position selections into cell-specific border changes.

**Key Method**:
```javascript
static resolveBorderChanges(selection, positions, borderStyle) {
  // selection: { start: {row, col}, end: {row, col} }
  // positions: ['top', 'bottom', 'outer', ...]
  // borderStyle: { style: 'solid', color: '#000', width: 1 }
  // Returns: Map<cellId, borderChanges>
}
```

**Position Logic**:
- `'all'`: Every cell gets borders on all 4 sides
- `'outer'`: Only perimeter cells get borders (top row gets top, etc.)
- `'inner'`: Only borders between cells (excludes outer edges)
- `'inner-h'`: Horizontal borders between rows (excludes top/bottom edges)
- `'inner-v'`: Vertical borders between columns (excludes left/right edges)
- `'top'`: Top edge of range gets top border
- `'bottom'`: Bottom edge of range gets bottom border
- `'left'`: Left edge of range gets left border
- `'right'`: Right edge of range gets right border

**Example Return Value**:
```javascript
{
  'A1': {
    border: {
      top: { style: 'solid', color: '#000', width: 1 },
      left: { style: 'solid', color: '#000', width: 1 }
    }
  },
  'B1': {
    border: {
      top: { style: 'solid', color: '#000', width: 1 },
      right: { style: 'solid', color: '#000', width: 1 }
    }
  }
}
```

### 1.2 Create BorderFormatCommand

**File**: `js/history/commands/BorderFormatCommand.js`

**Extends**: `Command`

**Constructor Parameters**:
```javascript
{
  cellBorderChanges,  // From BorderResolver
  fileManager,        // For StyleManager operations
  renderer           // For visual updates
}
```

**Execution Flow**:
1. For each cell in cellBorderChanges:
   - Get current style object from StyleManager
   - Deep merge border changes into existing style
   - Use `styleManager.addStyle()` to get/create styleId (deduplication)
   - Update cell.styleId in FileManager
   - Call `renderer.updateCellStyle(cellId, styleObject)`

**Undo/Redo**:
- Store `backupData`: `[{ cellId, oldStyleId, newStyleId }, ...]`
- Undo: Restore oldStyleIds
- Redo: Apply newStyleIds

**Similar to**: `FormatRangeCommand` but specialized for border logic

### 1.3 Update GridRenderer

**File**: `js/ui/GridRenderer.js`

**Add Method**: `updateCellBorder(cellId, borderStyle)`
```javascript
updateCellBorder(cellId, borderStyle) {
  const cell = this.getCellElement(cellId);
  if (!cell) return;

  // Reset borders
  cell.style.borderTop = '';
  cell.style.borderRight = '';
  cell.style.borderBottom = '';
  cell.style.borderLeft = '';

  // Apply new borders
  if (borderStyle) {
    if (borderStyle.top) {
      cell.style.borderTop = `${borderStyle.top.width}px ${borderStyle.top.style} ${borderStyle.top.color}`;
    }
    if (borderStyle.right) {
      cell.style.borderRight = `${borderStyle.right.width}px ${borderStyle.right.style} ${borderStyle.right.color}`;
    }
    if (borderStyle.bottom) {
      cell.style.borderBottom = `${borderStyle.bottom.width}px ${borderStyle.bottom.style} ${borderStyle.bottom.color}`;
    }
    if (borderStyle.left) {
      cell.style.borderLeft = `${borderStyle.left.width}px ${borderStyle.left.style} ${borderStyle.left.color}`;
    }
  }
}
```

**Modify Method**: `updateCellStyle(cellId, style)`
Add border handling section (after wrap section, around line 204):
```javascript
// 6. Apply Borders
if (style.border) {
  this.updateCellBorder(cellId, style.border);
}
```

---

## Phase 2: UI Components

### 2.1 Create BorderMenu Component

**File**: `js/ui/BorderMenu.js`

**Constructor**:
```javascript
constructor(spreadsheet) {
  this.spreadsheet = spreadsheet;
  this.container = null;  // Created dynamically
  this.isVisible = false;

  // State
  this.selectedPositions = new Set();  // e.g., ['top', 'bottom']
  this.currentColor = '#000000';
  this.currentStyle = 'solid';
  this.currentWidth = 1;

  this._createMenu();
}
```

**UI Structure** (HTML):
```html
<div class="border-menu" style="display: none;">
  <div class="border-positions">
    <button class="border-btn" data-position="all" title="All Borders">
      <svg><!-- grid icon --></svg>
    </button>
    <button class="border-btn" data-position="outer" title="Outer Borders">
      <svg><!-- outer frame icon --></svg>
    </button>
    <button class="border-btn" data-position="inner" title="Inner Borders">
      <svg><!-- inner grid icon --></svg>
    </button>
    <button class="border-btn" data-position="inner-h" title="Inner Horizontal">
      <svg><!-- horizontal lines icon --></svg>
    </button>
    <button class="border-btn" data-position="inner-v" title="Inner Vertical">
      <svg><!-- vertical lines icon --></svg>
    </button>
  </div>

  <div class="border-positions border-positions-edges">
    <button class="border-btn" data-position="top" title="Top Border">
      <svg><!-- top line icon --></svg>
    </button>
    <button class="border-btn" data-position="bottom" title="Bottom Border">
      <svg><!-- bottom line icon --></svg>
    </button>
    <button class="border-btn" data-position="left" title="Left Border">
      <svg><!-- left line icon --></svg>
    </button>
    <button class="border-btn" data-position="right" title="Right Border">
      <svg><!-- right line icon --></svg>
    </button>
  </div>

  <div class="border-controls">
    <button class="border-btn" id="border-color-picker" title="Border Color">
      <svg><!-- color palette icon --></svg>
      <input type="color" class="hidden-color-input" value="#000000">
    </button>

    <button class="border-btn" id="border-style-selector" title="Border Style">
      <svg><!-- line style icon --></svg>
    </button>
  </div>

  <div class="border-style-dropdown" style="display: none;">
    <button data-style="solid" data-width="1">Solid Thin</button>
    <button data-style="solid" data-width="2">Solid Medium</button>
    <button data-style="solid" data-width="3">Solid Thick</button>
    <button data-style="dashed" data-width="1">Dashed</button>
    <button data-style="dotted" data-width="1">Dotted</button>
  </div>

  <div class="border-actions">
    <button class="border-btn border-remove" title="Remove Borders">
      <svg><!-- clear icon --></svg>
    </button>
  </div>
</div>
```

**Key Methods**:

```javascript
show(anchorElement) {
  // Position menu below anchor
  // Show menu
  // Attach document click handler to close
}

hide() {
  // Hide menu
  // Remove event handlers
}

_handlePositionClick(position) {
  // Toggle position in selectedPositions Set
  // Update button visual state (active class)
  // Trigger border application if positions selected
}

_handleColorChange(color) {
  this.currentColor = color;
  // Apply immediately if positions selected
  this._applyBorders();
}

_handleStyleChange(style, width) {
  this.currentStyle = style;
  this.currentWidth = width;
  // Apply immediately if positions selected
  this._applyBorders();
}

_applyBorders() {
  if (this.selectedPositions.size === 0) return;

  const positions = Array.from(this.selectedPositions);
  const borderStyle = {
    style: this.currentStyle,
    color: this.currentColor,
    width: this.currentWidth
  };

  this.spreadsheet.applyBorderFormat(positions, borderStyle);
}

_handleRemoveBorders() {
  // Apply null borders to clear
  const positions = ['top', 'bottom', 'left', 'right'];
  this.spreadsheet.applyBorderFormat(positions, null);
  this.selectedPositions.clear();
  this._updateButtonStates();
}
```

### 2.2 Update Toolbar

**File**: `js/ui/Toolbar.js`

**Add to `this.items` array** (after fill-color, before separator):
```javascript
{
  type: 'border',
  id: 'borders',
  icon: '<path d="M3 3v18h18V3H3zm16 16H5V5h14v14zM11 7h2v2h-2zM7 7h2v2H7zm8 0h2v2h-2zM7 11h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2zM7 15h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>',
  tooltip: 'Borders',
  action: () => this.spreadsheet.borderMenu.toggle(this.container.querySelector('[data-id="borders"]'))
}
```

**Update `render()` method** to handle border button type:
```javascript
if (item.type === 'border') {
  const btn = document.createElement('button');
  btn.className = 'toolbar-btn';
  btn.dataset.id = item.id;
  btn.title = item.tooltip || '';

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.innerHTML = item.icon;

  btn.appendChild(svg);

  btn.addEventListener('click', (e) => {
    if (item.action) item.action(e);
    // Don't refocus grid - menu needs focus
  });

  this.container.appendChild(btn);
  return;
}
```

### 2.3 Update Spreadsheet Coordinator

**File**: `js/spreadsheet.js`

**Constructor additions**:
```javascript
// After toolbar initialization
import { BorderMenu } from './ui/BorderMenu.js';
this.borderMenu = new BorderMenu(this);
```

**Add method**:
```javascript
applyBorderFormat(positions, borderStyle) {
  // Get current selection
  const selection = this.selectionManager.getSelection();
  if (!selection) return;

  // Resolve positions to cell-specific changes
  const cellBorderChanges = BorderResolver.resolveBorderChanges(
    selection,
    positions,
    borderStyle
  );

  // Create and execute command
  const command = new BorderFormatCommand({
    cellBorderChanges,
    fileManager: this.fileManager,
    renderer: this.renderer
  });

  this.historyManager.execute(command);
}
```

---

## Phase 3: Styling

### 3.1 Update CSS

**File**: `css/spreadsheet.css`

Add at end of file:

```css
/* Border Menu */
.border-menu {
  position: absolute;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  padding: 8px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 240px;
}

.border-positions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.border-positions-edges {
  border-top: 1px solid #eee;
  padding-top: 8px;
}

.border-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  transition: all 0.2s;
}

.border-btn:hover {
  background: #f5f5f5;
  border-color: #999;
}

.border-btn.active {
  background: #e3f2fd;
  border-color: #2196f3;
  box-shadow: inset 0 0 0 1px #2196f3;
}

.border-btn svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.border-controls {
  display: flex;
  gap: 4px;
  border-top: 1px solid #eee;
  padding-top: 8px;
}

.border-style-dropdown {
  background: white;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 4px;
}

.border-style-dropdown button {
  width: 100%;
  padding: 6px 12px;
  border: none;
  background: white;
  cursor: pointer;
  text-align: left;
  border-radius: 2px;
}

.border-style-dropdown button:hover {
  background: #f5f5f5;
}

.border-actions {
  border-top: 1px solid #eee;
  padding-top: 8px;
}

.border-remove {
  width: 100%;
  color: #d32f2f;
}

.border-remove:hover {
  background: #ffebee;
}

.hidden-color-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}
```

---

## Phase 4: Testing

### 4.1 Unit Tests

**File**: `tests/ui/BorderResolver.test.js`

Test cases:
- `resolveBorderChanges` with position 'all' on single cell
- `resolveBorderChanges` with position 'all' on range
- `resolveBorderChanges` with position 'outer' on range
- `resolveBorderChanges` with position 'inner' on range
- `resolveBorderChanges` with position 'inner-h' on range
- `resolveBorderChanges` with position 'inner-v' on range
- `resolveBorderChanges` with position 'top' on range
- `resolveBorderChanges` with multiple positions (e.g., ['top', 'bottom'])
- Edge case: Single cell with 'inner' (should return empty)
- Edge case: 2x2 range with 'inner' (should return 4 cells with internal borders)

**File**: `tests/history/commands/BorderFormatCommand.test.js`

Test cases:
- Execute applies borders to cells
- Execute updates StyleManager
- Execute updates renderer
- Undo restores previous styleIds
- Undo updates renderer
- Redo reapplies borders

### 4.2 E2E Tests

**File**: `e2e/border-formatting.spec.js`

See Phase 5 for detailed test scenarios.

---

## Phase 5: E2E Test Scenarios

See `docs/test-scenarios/border-formatting.scenarios.md` for comprehensive test scenarios.

**Key scenarios**:
1. Apply 'all' borders to single cell
2. Apply 'outer' borders to range
3. Apply 'inner' borders to range
4. Apply multiple positions (top + bottom)
5. Change border color
6. Change border style (solid → dashed)
7. Change border thickness
8. Remove borders
9. Undo border formatting
10. Redo border formatting
11. Borders persist after reload
12. Copy/paste preserves borders

---

## Implementation Order

### Sprint 1: Core Infrastructure
1. Create `BorderResolver.js` with unit tests ✓
2. Create `BorderFormatCommand.js` with unit tests ✓
3. Update `GridRenderer.updateCellStyle()` to handle borders ✓
4. Manual testing: Apply borders via console

### Sprint 2: UI Components
5. Create `BorderMenu.js` component ✓
6. Update `Toolbar.js` to add border button ✓
7. Update `Spreadsheet.js` with `applyBorderFormat()` ✓
8. Add CSS styling ✓
9. Manual testing: Use toolbar to apply borders

### Sprint 3: Polish & Testing
10. Add E2E tests ✓
11. Test undo/redo ✓
12. Test persistence ✓
13. Test edge cases (single cell, large ranges) ✓
14. Performance testing (1000+ cell selections) ✓

---

## Edge Cases & Considerations

### Adjacent Cell Border Overlap
When cell A1 has a right border and B1 has a left border, both borders will render. The browser will overlay them (creating a thicker appearance). This is acceptable for v1.

**Future optimization**: Detect shared edges and deduplicate.

### Performance
Large range selections (e.g., 100x100 cells) generate many style updates. Mitigation:
- Batch DOM updates in renderer
- Use `requestAnimationFrame` for rendering
- Limit border application to visible cells (future optimization)

### Border Removal
To remove borders, apply `null` borderStyle:
- BorderResolver returns border: null for each cell
- GridRenderer clears border CSS
- StyleManager stores updated style without border property

### Persistence
- Borders stored in FileManager's `data.cells[cellId].styleId`
- Palette stored in `data.styles`
- Autosave triggers after border application
- StyleManager handles deduplication

### StyleManager Integration
No changes needed to StyleManager - it already:
- Hashes nested objects (border will be included)
- Deduplicates via reverseLookup
- Manages palette

### Copy/Paste
Borders are part of the style object, so existing copy/paste logic works:
- Copy: Resolves styleId → style object (includes borders)
- Paste: Style object → StyleManager.addStyle() → new styleId

---

## Success Criteria

- ✅ User can apply borders to single cell via toolbar
- ✅ User can apply borders to range via toolbar
- ✅ All position options work correctly (all, outer, inner, top, etc.)
- ✅ User can select multiple positions simultaneously
- ✅ Color, style, and thickness changes apply immediately
- ✅ Border changes are undo-able and redo-able
- ✅ Borders persist after page reload
- ✅ Borders are copied/pasted with cells
- ✅ No performance degradation with large selections (< 500ms for 100x100 range)
- ✅ All E2E tests pass

---

## Open Questions

1. **Should we support border thickness > 5px?**
   - Recommendation: Cap at 5px for UI simplicity

2. **Should we add keyboard shortcuts for borders?**
   - Recommendation: Not in v1. Excel uses Ctrl+Shift+7 for all borders.

3. **Should 'inner' position work on single cells?**
   - Recommendation: No-op (return empty map). User should select a range.

4. **What happens when user selects 'all' then 'top' - should 'top' override or add?**
   - Recommendation: Both are selected. Applying 'all' sets all borders, then 'top' is redundant but harmless.

---

## Documentation Updates

### Files to Update

1. **CLAUDE.md**: Add "Cell Border Formatting" section under "Important Implementation Notes"
2. **Epic 3** (`docs/roadmap/epic_03_cell_formatting.md`): Update to mark borders as complete
3. **Architecture - UI Components** (`docs/architecture/03-ui-components.md`): Add BorderMenu section
4. **Test Scenarios** (`docs/test-scenarios/border-formatting.scenarios.md`): Create new file
5. **Keyboard Shortcuts** (`docs/user-interactions/03-keyboard-shortcuts.md`): Add future shortcuts section
6. **Test Coverage Summary** (`docs/test-scenarios/E2E_TEST_COVERAGE_SUMMARY.md`): Add border formatting row

---

## Dependencies

### Required Before Implementation
- ✅ Epic 3: Cell Formatting (StyleManager, FormatRangeCommand)
- ✅ Epic 1: History Management (Command pattern, HistoryManager)

### Blocked By This Feature
- None (borders are self-contained)

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Border rendering conflicts between adjacent cells | Medium | High | Document expected behavior, consider optimization in v2 |
| Performance issues with large selections | High | Medium | Implement batching, measure with 100x100 test |
| Complex UI state management (multi-select positions) | Medium | Low | Use Set data structure, thorough unit testing |
| StyleManager palette bloat | Low | Low | Existing deduplication handles this |

---

## Timeline Estimate

- **Sprint 1 (Core)**: 3-4 days
- **Sprint 2 (UI)**: 3-4 days
- **Sprint 3 (Testing)**: 2-3 days
- **Total**: 8-11 days

---

## Appendix: Border Style Icons (SVG)

To be created:
- All borders: Grid icon
- Outer borders: Frame icon
- Inner borders: Inner grid icon
- Inner horizontal: Horizontal lines icon
- Inner vertical: Vertical lines icon
- Top border: Top line icon
- Bottom border: Bottom line icon
- Left border: Left line icon
- Right border: Right line icon
- Clear borders: X or eraser icon
- Border color: Color palette icon
- Border style: Line style icon

These can be sourced from Material Icons or custom-designed.
