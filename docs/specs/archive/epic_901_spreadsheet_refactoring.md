# Technical Refactoring Plan: spreadsheet.js

## Executive Summary

This plan addresses the critical architectural issue in `spreadsheet.js` - a 1,100+ line "God Class" that handles all UI concerns. The refactoring will decompose it into 5 focused modules while maintaining backward compatibility and existing functionality.

**Estimated Effort:** 3-5 days for a developer with context, 5-8 days for a new developer.

---

## Current State Analysis

### Problems Identified
1. **Single Responsibility Violation**: One class handles grid rendering, selection, editing, resizing, dragging, keyboard navigation, and integration
2. **Untestable**: DOM-coupled logic makes unit testing impossible
3. **High Coupling**: Direct manipulation of DOM, state, and external services in the same methods
4. **State Fragmentation**: State exists in multiple places (spreadsheet.cellData, fileManager, worker)
5. **Blocks Future Work**: Adding features like rich text editing or cell formatting requires untangling 1,100 lines

### Dependencies to Preserve
- `HistoryManager` and `UpdateCellsCommand` (history)
- `Logger` (utils)
- `FileManager` (data layer)
- `FormulaBar` (UI integration)
- `FormulaWorker` (calculation engine)

---

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Spreadsheet.js                          │
│                   (Coordinator/Facade)                       │
│  • Initializes modules                                       │
│  • Routes events between modules                             │
│  • Maintains public API                                      │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────┼──────────┬──────────┬────────────┐
        │          │           │          │            │
        ▼          ▼           ▼          ▼            ▼
   ┌────────┐ ┌────────┐ ┌─────────┐ ┌────────┐ ┌─────────┐
   │ Grid   │ │Selection│ │Grid     │ │Editor  │ │Clipboard│
   │Renderer│ │Manager  │ │Resizer  │ │Manager │ │Manager  │
   └────────┘ └────────┘ └─────────┘ └────────┘ └─────────┘
```

### Module Responsibilities

1. **Spreadsheet.js** (Coordinator - ~250 lines)
   - Module initialization and lifecycle
   - Event routing between modules
   - Integration with FileManager, FormulaBar, FormulaWorker
   - Public API surface

2. **GridRenderer.js** (~200 lines)
   - DOM creation for grid, headers, cells
   - Applying styles (column widths, row heights)
   - Visual updates (cell content, selection highlights)

3. **SelectionManager.js** (~300 lines)
   - Selection state machine
   - Keyboard navigation logic
   - Selection rendering coordination

4. **GridResizer.js** (~200 lines)
   - Column/row resizing logic
   - Header mouse interaction detection
   - Size calculations

5. **EditorManager.js** (~150 lines)
   - Cell editor lifecycle (start, commit, cancel)
   - Editor positioning and display
   - Edit mode state

6. **ClipboardManager.js** (~100 lines)
   - Copy/paste operations
   - Clipboard state management
   - Visual copy indicators

---

## Implementation Plan

### Phase 1: Preparation (Day 1)

#### Step 1.1: Create Module Files
Create empty module files with basic structure:

```bash
touch js/ui/GridRenderer.js
touch js/ui/SelectionManager.js
touch js/ui/GridResizer.js
touch js/ui/EditorManager.js
touch js/ui/ClipboardManager.js
```

#### Step 1.2: Define Module Interfaces
Create interface documentation for each module (comments at top of each file):

**GridRenderer.js:**
```javascript
/**
 * GridRenderer - Handles all DOM creation and visual rendering
 * 
 * Public Methods:
 * - constructor(container, config)
 * - createGrid() -> void
 * - updateCellContent(cellId, value) -> void
 * - applyCellStyles(cellId, styles) -> void
 * - getGridDimensions() -> { rows, cols }
 * - getCellElement(cellId) -> HTMLElement
 * - destroy() -> void
 * 
 * Events Emitted:
 * - 'cellClicked' -> { cellElement, event }
 * - 'cellDoubleClicked' -> { cellElement, event }
 * - 'headerClicked' -> { type: 'col'|'row', index, event }
 */
```

Repeat for all modules (see detailed specs below).

#### Step 1.3: Create Test Files
```bash
touch tests/ui/GridRenderer.test.js
touch tests/ui/SelectionManager.test.js
touch tests/ui/GridResizer.test.js
touch tests/ui/EditorManager.test.js
touch tests/ui/ClipboardManager.test.js
```

---

### Phase 2: Extract GridRenderer (Day 1-2)

#### Step 2.1: Implement GridRenderer Core
Extract these methods from `spreadsheet.js`:
- `_createGrid()` → `createGrid()`
- `_createColumnHeaders()` → `_createColumnHeaders()` (private)
- `_createRowHeaders()` → `_createRowHeaders()` (private)
- `_createCells()` → `_createCells()` (private)
- `_applyGridStyles()` → `applyGridStyles()`
- `_syncScroll()` → `_setupScrollSync()` (private)
- `_getCellElement()` → `getCellElement()`
- `_scrollCellIntoView()` → `scrollCellIntoView()`

**Implementation:**

```javascript
// js/ui/GridRenderer.js
import { Logger } from '../engine/utils/Logger.js';

export class GridRenderer {
  constructor(container, config = {}) {
    this.container = container;
    this.ROWS = config.rows || 100;
    this.COLS = config.cols || 26;
    this.DEFAULT_COL_WIDTH = config.defaultColWidth || 94;
    this.DEFAULT_ROW_HEIGHT = config.defaultRowHeight || 20;
    
    // State
    this.columnWidths = Array(this.COLS).fill(this.DEFAULT_COL_WIDTH);
    this.rowHeights = Array(this.ROWS).fill(this.DEFAULT_ROW_HEIGHT);
    
    // DOM references
    this.columnHeadersContainer = null;
    this.rowHeadersContainer = null;
    this.cellGridContainer = null;
    
    // Event callbacks
    this.callbacks = {
      onCellClick: null,
      onCellDoubleClick: null,
      onCellMouseDown: null,
      onCellMouseOver: null,
      onHeaderClick: null,
      onHeaderMouseMove: null,
    };
  }

  /**
   * Creates the entire grid structure
   */
  createGrid() {
    this.columnHeadersContainer = this.container.querySelector('#column-headers');
    this.rowHeadersContainer = this.container.querySelector('#row-headers');
    this.cellGridContainer = this.container.querySelector('#cell-grid');
    
    if (!this.columnHeadersContainer || !this.rowHeadersContainer || !this.cellGridContainer) {
      Logger.error('GridRenderer', 'Required containers not found in DOM');
      throw new Error('Grid containers not found');
    }
    
    this._createColumnHeaders();
    this._createRowHeaders();
    this._createCells();
    this.applyGridStyles();
    this._setupScrollSync();
    this._attachEventListeners();
    
    Logger.log('GridRenderer', 'Grid created successfully');
  }

  /**
   * Updates a cell's display content
   */
  updateCellContent(cellId, value) {
    const cell = this.getCellElement(cellId);
    if (cell) {
      cell.textContent = value === undefined || value === null ? '' : value;
    }
  }

  /**
   * Gets a cell DOM element by ID
   */
  getCellElement(cellId) {
    return this.cellGridContainer.querySelector(`[data-id='${cellId}']`);
  }

  /**
   * Gets a cell element by coordinates
   */
  getCellElementByCoords(row, col) {
    return this.cellGridContainer.querySelector(
      `[data-col='${col}'][data-row='${row}']`
    );
  }

  /**
   * Applies column widths and row heights to grid
   */
  applyGridStyles() {
    const colTemplate = this.columnWidths.map(w => `${w}px`).join(' ');
    const rowTemplate = this.rowHeights.map(h => `${h}px`).join(' ');
    
    this.columnHeadersContainer.style.gridTemplateColumns = colTemplate;
    this.cellGridContainer.style.gridTemplateColumns = colTemplate;
    
    this.rowHeadersContainer.style.gridTemplateRows = rowTemplate;
    this.cellGridContainer.style.gridTemplateRows = rowTemplate;
  }

  /**
   * Updates column widths
   */
  setColumnWidths(widths) {
    if (widths.length !== this.COLS) {
      Logger.warn('GridRenderer', `Expected ${this.COLS} column widths, got ${widths.length}`);
      return;
    }
    this.columnWidths = [...widths];
    this.applyGridStyles();
  }

  /**
   * Updates row heights
   */
  setRowHeights(heights) {
    if (heights.length !== this.ROWS) {
      Logger.warn('GridRenderer', `Expected ${this.ROWS} row heights, got ${heights.length}`);
      return;
    }
    this.rowHeights = [...heights];
    this.applyGridStyles();
  }

  /**
   * Scrolls a cell into view
   */
  scrollCellIntoView(cellElement) {
    const grid = this.cellGridContainer;
    const cellRect = cellElement.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();

    if (cellRect.bottom > gridRect.bottom) {
      grid.scrollTop += cellRect.bottom - gridRect.bottom;
    } else if (cellRect.top < gridRect.top) {
      grid.scrollTop -= gridRect.top - cellRect.top;
    }

    if (cellRect.right > gridRect.right) {
      grid.scrollLeft += cellRect.right - gridRect.right;
    } else if (cellRect.left < gridRect.left) {
      grid.scrollLeft -= gridRect.left - cellRect.left;
    }
  }

  /**
   * Clears all visual selection indicators
   */
  clearAllHighlights() {
    // Remove header highlights
    this.container
      .querySelectorAll('.header-highlight')
      .forEach(h => h.classList.remove('header-highlight'));
    
    // Remove cell selection classes
    const selectionClasses = [
      'selected',
      'range-border-top', 'range-border-right',
      'range-border-bottom', 'range-border-left',
      'range-selected-1', 'range-selected-2', 'range-selected-3',
      'range-selected-4', 'range-selected-5', 'range-selected-6',
      'range-selected-7', 'range-selected-8'
    ];
    
    this.container
      .querySelectorAll('.cell')
      .forEach(c => c.classList.remove(...selectionClasses));
  }

  /**
   * Applies selection highlighting to cells
   */
  highlightCells(cellIds, className) {
    cellIds.forEach(cellId => {
      const cell = this.getCellElement(cellId);
      if (cell) {
        cell.classList.add(className);
      }
    });
  }

  /**
   * Highlights a column header
   */
  highlightColumnHeader(colIndex) {
    const header = this.columnHeadersContainer.querySelector(`[data-col='${colIndex}']`);
    if (header) {
      header.classList.add('header-highlight');
    }
  }

  /**
   * Highlights a row header
   */
  highlightRowHeader(rowIndex) {
    const header = this.rowHeadersContainer.querySelector(`[data-row='${rowIndex}']`);
    if (header) {
      header.classList.add('header-highlight');
    }
  }

  // --- Private Methods ---

  _createColumnHeaders() {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < this.COLS; i++) {
      const header = document.createElement('div');
      header.className = 'header-cell';
      header.dataset.col = i;
      header.textContent = String.fromCharCode(65 + i);
      fragment.appendChild(header);
    }
    this.columnHeadersContainer.appendChild(fragment);
  }

  _createRowHeaders() {
    const fragment = document.createDocumentFragment();
    for (let i = 1; i <= this.ROWS; i++) {
      const header = document.createElement('div');
      header.className = 'header-cell';
      header.dataset.row = i;
      header.textContent = i;
      fragment.appendChild(header);
    }
    this.rowHeadersContainer.appendChild(fragment);
  }

  _createCells() {
    const fragment = document.createDocumentFragment();
    for (let row = 1; row <= this.ROWS; row++) {
      for (let col = 0; col < this.COLS; col++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        const colName = String.fromCharCode(65 + col);
        cell.dataset.id = `${colName}${row}`;
        cell.dataset.col = col;
        cell.dataset.row = row;
        fragment.appendChild(cell);
      }
    }
    this.cellGridContainer.appendChild(fragment);
  }

  _setupScrollSync() {
    this.cellGridContainer.addEventListener('scroll', () => {
      this.columnHeadersContainer.scrollLeft = this.cellGridContainer.scrollLeft;
      this.rowHeadersContainer.scrollTop = this.cellGridContainer.scrollTop;
    });
  }

  _attachEventListeners() {
    // Cell clicks
    this.cellGridContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('cell') && this.callbacks.onCellClick) {
        this.callbacks.onCellClick({ cellElement: e.target, event: e });
      }
    });

    // Cell double clicks
    this.cellGridContainer.addEventListener('dblclick', (e) => {
      if (e.target.classList.contains('cell') && this.callbacks.onCellDoubleClick) {
        this.callbacks.onCellDoubleClick({ cellElement: e.target, event: e });
      }
    });

    // Cell mousedown
    this.cellGridContainer.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('cell') && this.callbacks.onCellMouseDown) {
        this.callbacks.onCellMouseDown({ cellElement: e.target, event: e });
      }
    });

    // Cell mouseover
    this.cellGridContainer.addEventListener('mouseover', (e) => {
      if (e.target.classList.contains('cell') && this.callbacks.onCellMouseOver) {
        this.callbacks.onCellMouseOver({ cellElement: e.target, event: e });
      }
    });

    // Header clicks
    this.columnHeadersContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('header-cell') && this.callbacks.onHeaderClick) {
        this.callbacks.onHeaderClick({ 
          type: 'col', 
          index: parseInt(e.target.dataset.col, 10), 
          event: e 
        });
      }
    });

    this.rowHeadersContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('header-cell') && this.callbacks.onHeaderClick) {
        this.callbacks.onHeaderClick({ 
          type: 'row', 
          index: parseInt(e.target.dataset.row, 10), 
          event: e 
        });
      }
    });

    // Header mouse move (for resize cursor)
    this.columnHeadersContainer.addEventListener('mousemove', (e) => {
      if (this.callbacks.onHeaderMouseMove) {
        this.callbacks.onHeaderMouseMove({ type: 'col', event: e });
      }
    });

    this.rowHeadersContainer.addEventListener('mousemove', (e) => {
      if (this.callbacks.onHeaderMouseMove) {
        this.callbacks.onHeaderMouseMove({ type: 'row', event: e });
      }
    });
  }

  /**
   * Register callback functions
   */
  on(eventName, callback) {
    const callbackKey = `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;
    if (callbackKey in this.callbacks) {
      this.callbacks[callbackKey] = callback;
    } else {
      Logger.warn('GridRenderer', `Unknown event: ${eventName}`);
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    // Remove event listeners if needed
    this.columnHeadersContainer = null;
    this.rowHeadersContainer = null;
    this.cellGridContainer = null;
  }
}
```

#### Step 2.2: Write Tests for GridRenderer
```javascript
// tests/ui/GridRenderer.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GridRenderer } from '../../js/ui/GridRenderer.js';
import { JSDOM } from 'jsdom';

describe('GridRenderer', () => {
  let dom, container, renderer;

  beforeEach(() => {
    // Create a minimal DOM structure
    dom = new JSDOM(`
      <div id="spreadsheet-container">
        <div id="column-headers"></div>
        <div id="row-headers"></div>
        <div id="cell-grid"></div>
      </div>
    `);
    
    global.document = dom.window.document;
    container = document.getElementById('spreadsheet-container');
    
    renderer = new GridRenderer(container, {
      rows: 10,
      cols: 5,
    });
  });

  it('should create grid structure', () => {
    renderer.createGrid();
    
    const columnHeaders = container.querySelectorAll('#column-headers .header-cell');
    const rowHeaders = container.querySelectorAll('#row-headers .header-cell');
    const cells = container.querySelectorAll('#cell-grid .cell');
    
    expect(columnHeaders.length).toBe(5);
    expect(rowHeaders.length).toBe(10);
    expect(cells.length).toBe(50);
  });

  it('should get cell element by ID', () => {
    renderer.createGrid();
    
    const cell = renderer.getCellElement('A1');
    expect(cell).toBeTruthy();
    expect(cell.dataset.id).toBe('A1');
  });

  it('should update cell content', () => {
    renderer.createGrid();
    
    renderer.updateCellContent('A1', 'Hello');
    const cell = renderer.getCellElement('A1');
    expect(cell.textContent).toBe('Hello');
  });

  // Add more tests...
});
```

#### Step 2.3: Integrate GridRenderer into Spreadsheet.js
Update `spreadsheet.js` constructor:

```javascript
// In spreadsheet.js constructor, replace grid creation:
import { GridRenderer } from './ui/GridRenderer.js';

constructor(containerId) {
  this.container = document.getElementById(containerId);
  // ... other initialization ...
  
  // NEW: Create GridRenderer
  this.gridRenderer = new GridRenderer(this.container, {
    rows: this.ROWS,
    cols: this.COLS,
    defaultColWidth: this.DEFAULT_COL_WIDTH,
    defaultRowHeight: this.DEFAULT_ROW_HEIGHT,
  });
  
  // Setup callbacks
  this.gridRenderer.on('cellClick', this._handleCellClick.bind(this));
  this.gridRenderer.on('cellDoubleClick', this._handleCellDoubleClick.bind(this));
  // ... more callbacks ...
  
  // Create the grid
  this.gridRenderer.createGrid();
  
  // OLD CODE TO DELETE:
  // this._createGrid();
}
```

Update methods that interact with rendering:
```javascript
// REPLACE: this._updateCell(cell, value)
// WITH: this.gridRenderer.updateCellContent(cellId, value)

// REPLACE: this._getCellElement(coords)
// WITH: this.gridRenderer.getCellElementByCoords(row, col)

// REPLACE: this._scrollCellIntoView(cell)
// WITH: this.gridRenderer.scrollCellIntoView(cell)

// REPLACE: this._clearSelections()
// WITH: this.gridRenderer.clearAllHighlights()
```

**Validation:** Run `npm test` and `npm run e2e` to ensure nothing broke.

---

### Phase 3: Extract SelectionManager (Day 2-3)

#### Step 3.1: Design Selection State Structure
```javascript
/**
 * Selection state structure:
 * {
 *   activeCell: { row: 1, col: 0 },  // The cell with focus
 *   selectionAnchor: { row: 1, col: 0 },  // Where selection started
 *   ranges: [
 *     { start: { row: 1, col: 0 }, end: { row: 3, col: 2 } }
 *   ]
 * }
 */
```

#### Step 3.2: Implement SelectionManager
Extract these methods from `spreadsheet.js`:
- `_handleCellSelection()` → `selectCell()`
- `_handleHeaderSelection()` → `selectHeader()`
- `_handleArrowKey()` → `moveSelection()`
- `_handleCmdArrowKey()` → `jumpToEdge()`
- `_handleCmdShiftArrowKey()` → `extendToEdge()`
- `_renderSelections()` → `render()`
- `_setActiveCell()` → `setActiveCell()`
- `_getCellCoords()` → `getCellCoords()` (static utility)

**Implementation:**

```javascript
// js/ui/SelectionManager.js
import { Logger } from '../engine/utils/Logger.js';

export class SelectionManager {
  constructor(gridRenderer, config = {}) {
    this.gridRenderer = gridRenderer;
    this.ROWS = config.rows || 100;
    this.COLS = config.cols || 26;
    
    // Selection state
    this.activeCell = null;  // { row, col }
    this.selectionAnchor = null;  // { row, col }
    this.ranges = [];  // Array of { start: {row, col}, end: {row, col} }
    
    // Callbacks
    this.callbacks = {
      onSelectionChange: null,
      onActiveCellChange: null,
    };
  }

  /**
   * Selects a cell, handling shift/cmd modifiers
   */
  selectCell(coords, isShift = false, isCmd = false) {
    if (isShift) {
      this._extendSelection(coords);
    } else if (isCmd) {
      this._addRangeToSelection(coords);
    } else {
      this._selectSingleCell(coords);
    }
    
    this.render();
    this._notifySelectionChange();
  }

  /**
   * Selects an entire column or row
   */
  selectHeader(type, index, isShift = false, isCmd = false) {
    let start, end;
    
    if (type === 'col') {
      start = { col: index, row: 1 };
      end = { col: index, row: this.ROWS };
    } else {
      start = { col: 0, row: index };
      end = { col: this.COLS - 1, row: index };
    }
    
    if (!isShift) {
      this.setActiveCell(start);
    }
    
    if (isShift) {
      this._extendSelection(end);
    } else if (isCmd) {
      this.selectionAnchor = start;
      this.ranges.push({ start, end });
    } else {
      this.selectionAnchor = start;
      this.ranges = [{ start, end }];
    }
    
    this.render();
    this._notifySelectionChange();
  }

  /**
   * Moves selection by one cell in a direction
   */
  moveSelection(direction, isShift = false) {
    if (!this.activeCell) return;
    
    let { row, col } = isShift && this.ranges.length > 0
      ? this.ranges[this.ranges.length - 1].end
      : this.activeCell;
    
    switch (direction) {
      case 'up':
        row = Math.max(1, row - 1);
        break;
      case 'down':
        row = Math.min(this.ROWS, row + 1);
        break;
      case 'left':
        col = Math.max(0, col - 1);
        break;
      case 'right':
        col = Math.min(this.COLS - 1, col + 1);
        break;
    }
    
    const newCoords = { row, col };
    
    if (!isShift) {
      this.setActiveCell(newCoords);
    }
    
    this.selectCell(newCoords, isShift, false);
    
    // Scroll into view
    const cellElement = this.gridRenderer.getCellElementByCoords(row, col);
    if (cellElement) {
      this.gridRenderer.scrollCellIntoView(cellElement);
    }
  }

  /**
   * Jumps to edge of data region (Cmd+Arrow)
   */
  jumpToEdge(direction, cellDataGetter) {
    if (!this.activeCell) return;
    
    const target = this._findEdgeCell(this.activeCell, direction, cellDataGetter);
    this.selectCell(target, false, false);
    
    const cellElement = this.gridRenderer.getCellElementByCoords(target.row, target.col);
    if (cellElement) {
      this.gridRenderer.scrollCellIntoView(cellElement);
    }
  }

  /**
   * Extends selection to edge (Cmd+Shift+Arrow)
   */
  extendToEdge(direction, cellDataGetter) {
    if (!this.activeCell) return;
    
    let { row, col } = this.ranges.length > 0
      ? this.ranges[this.ranges.length - 1].end
      : this.activeCell;
    
    const target = this._findEdgeCell({ row, col }, direction, cellDataGetter);
    this.selectCell(target, true, false);
    
    const cellElement = this.gridRenderer.getCellElementByCoords(target.row, target.col);
    if (cellElement) {
      this.gridRenderer.scrollCellIntoView(cellElement);
    }
  }

  /**
   * Sets the active cell (the one with focus)
   */
  setActiveCell(coords) {
    this.activeCell = coords;
    
    if (this.callbacks.onActiveCellChange) {
      const cellId = this._coordsToCellId(coords);
      this.callbacks.onActiveCellChange(cellId, coords);
    }
  }

  /**
   * Gets current selection as array of cell IDs
   */
  getSelectedCellIds() {
    const cellIds = new Set();
    
    this.ranges.forEach(range => {
      const { start, end } = range;
      const minCol = Math.min(start.col, end.col);
      const maxCol = Math.max(start.col, end.col);
      const minRow = Math.min(start.row, end.row);
      const maxRow = Math.max(start.row, end.row);
      
      for (let col = minCol; col <= maxCol; col++) {
        for (let row = minRow; row <= maxRow; row++) {
          cellIds.add(this._coordsToCellId({ row, col }));
        }
      }
    });
    
    return Array.from(cellIds);
  }

  /**
   * Gets the active cell ID
   */
  getActiveCellId() {
    return this.activeCell ? this._coordsToCellId(this.activeCell) : null;
  }

  /**
   * Renders current selection state to the grid
   */
  render() {
    // Clear all highlights first
    this.gridRenderer.clearAllHighlights();
    
    // Calculate cell selection counts for overlap visualization
    const cellSelectionCounts = {};
    
    this.ranges.forEach(range => {
      const { start, end } = range;
      const minCol = Math.min(start.col, end.col);
      const maxCol = Math.max(start.col, end.col);
      const minRow = Math.min(start.row, end.row);
      const maxRow = Math.max(start.row, end.row);
      
      // Highlight headers
      for (let col = minCol; col <= maxCol; col++) {
        this.gridRenderer.highlightColumnHeader(col);
        for (let row = minRow; row <= maxRow; row++) {
          this.gridRenderer.highlightRowHeader(row);
          const cellId = this._coordsToCellId({ row, col });
          cellSelectionCounts[cellId] = (cellSelectionCounts[cellId] || 0) + 1;
        }
      }
    });
    
    // Apply background colors based on overlap
    for (const cellId in cellSelectionCounts) {
      const count = Math.min(cellSelectionCounts[cellId], 8);
      this.gridRenderer.highlightCells([cellId], `range-selected-${count}`);
    }
    
    // Apply perimeter borders for each range
    this.ranges.forEach(range => {
      const { start, end } = range;
      const minCol = Math.min(start.col, end.col);
      const maxCol = Math.max(start.col, end.col);
      const minRow = Math.min(start.row, end.row);
      const maxRow = Math.max(start.row, end.row);
      
      for (let col = minCol; col <= maxCol; col++) {
        for (let row = minRow; row <= maxRow; row++) {
          const cellElement = this.gridRenderer.getCellElementByCoords(row, col);
          if (cellElement) {
            if (row === minRow) cellElement.classList.add('range-border-top');
            if (row === maxRow) cellElement.classList.add('range-border-bottom');
            if (col === minCol) cellElement.classList.add('range-border-left');
            if (col === maxCol) cellElement.classList.add('range-border-right');
          }
        }
      }
    });
    
    // Highlight active cell
    if (this.activeCell) {
      const activeCellElement = this.gridRenderer.getCellElementByCoords(
        this.activeCell.row,
        this.activeCell.col
      );
      if (activeCellElement) {
        activeCellElement.classList.add('selected');
      }
    }
  }

  /**
   * Clears all selections
   */
  clear() {
    this.ranges = [];
    this.selectionAnchor = null;
    this.render();
    this._notifySelectionChange();
  }

  // --- Private Methods ---

  _selectSingleCell(coords) {
    this.setActiveCell(coords);
    this.selectionAnchor = coords;
    this.ranges = [{ start: coords, end: coords }];
  }

  _extendSelection(coords) {
    if (this.ranges.length === 0) {
      this.selectionAnchor = this.selectionAnchor || this.activeCell;
      this.ranges.push({ start: this.selectionAnchor, end: coords });
    } else {
      const lastRange = this.ranges[this.ranges.length - 1];
      lastRange.end = coords;
    }
  }

  _addRangeToSelection(coords) {
    this.setActiveCell(coords);
    this.selectionAnchor = coords;
    this.ranges.push({ start: coords, end: coords });
  }

  _findEdgeCell(fromCoords, direction, cellDataGetter) {
    const { row, col } = fromCoords;
    const currentCellId = this._coordsToCellId(fromCoords);
    const isCurrentEmpty = !cellDataGetter(currentCellId);
    
    const [dr, dc] = {
      up: [-1, 0],
      down: [1, 0],
      left: [0, -1],
      right: [0, 1],
    }[direction];
    
    const nextRow = row + dr;
    const nextCol = col + dc;
    const nextCellId = this._coordsToCellId({ row: nextRow, col: nextCol });
    
    if (!isCurrentEmpty && cellDataGetter(nextCellId)) {
      // Current is filled, next is filled -> find last filled cell
      let lastFilled = { row, col };
      let r = row;
      let c = col;
      
      while (r >= 1 && r <= this.ROWS && c >= 0 && c < this.COLS) {
        const cellId = this._coordsToCellId({ row: r, col: c });
        if (!cellDataGetter(cellId)) {
          return lastFilled;
        }
        lastFilled = { row: r, col: c };
        r += dr;
        c += dc;
      }
      return lastFilled;
    } else {
      // Find next filled cell
      let r = row + dr;
      let c = col + dc;
      
      while (r >= 1 && r <= this.ROWS && c >= 0 && c < this.COLS) {
        const cellId = this._coordsToCellId({ row: r, col: c });
        if (cellDataGetter(cellId)) {
          return { row: r, col: c };
        }
        r += dr;
        c += dc;
      }
      
      // Hit edge
      if (dr === -1) return { row: 1, col };
      if (dr === 1) return { row: this.ROWS, col };
      if (dc === -1) return { row, col: 0 };
      if (dc === 1) return { row, col: this.COLS - 1 };
    }
  }

  _coordsToCellId(coords) {
    const colLetter = String.fromCharCode(65 + coords.col);
    return `${colLetter}${coords.row}`;
  }

  _cellIdToCoords(cellId) {
    const match = cellId.match(/([A-Z]+)(\d+)/);
    if (!match) return null;
    
    const col = match[1].charCodeAt(0) - 65;
    const row = parseInt(match[2], 10);
    return { row, col };
  }

  _notifySelectionChange() {
    if (this.callbacks.onSelectionChange) {
      this.callbacks.onSelectionChange({
        ranges: this.ranges,
        activeCell: this.activeCell,
        cellIds: this.getSelectedCellIds(),
      });
    }
  }

  on(eventName, callback) {
    const callbackKey = `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;
    if (callbackKey in this.callbacks) {
      this.callbacks[callbackKey] = callback;
    }
  }
}
```

#### Step 3.3: Integrate SelectionManager

```javascript
// In spreadsheet.js constructor:
import { SelectionManager } from './ui/SelectionManager.js';

this.selectionManager = new SelectionManager(this.gridRenderer, {
  rows: this.ROWS,
  cols: this.COLS,
});

this.selectionManager.on('selectionChange', (data) => {
  // Update FileManager metadata
  if (this.fileManager) {
    this.fileManager.updateMetadata({
      lastActiveCell: this.selectionManager.getActiveCellId(),
      selections: data.ranges,
    });
  }
});

this.selectionManager.on('activeCellChange', (cellId, coords) => {
  // Update FormulaBar
  if (this.formulaBar) {
    this.formulaBar.updateCellReference(cellId);
    const rawValue = this.fileManager.getRawCellValue(cellId);
    this.formulaBar.updateFormulaInput(rawValue);
  }
});

// Update GridRenderer callbacks to use SelectionManager:
this.gridRenderer.on('cellClick', ({ cellElement, event }) => {
  if (this.isEditing) return;
  
  const coords = this._cellElementToCoords(cellElement);
  this.selectionManager.selectCell(coords, event.shiftKey, event.metaKey || event.ctrlKey);
});
```

---

### Phase 4: Extract Remaining Modules (Day 3-4)

Follow similar pattern for:

#### Step 4.1: GridResizer
Extract resizing logic with these key methods:
- `startResize(type, indices)`
- `updateResize(delta)`
- `stopResize()`
- `getSelectedHeaderIndices(type, clickedIndex)`

#### Step 4.2: EditorManager
Extract editing logic:
- `startEdit(cellId, initialValue)`
- `commitEdit()`
- `cancelEdit()`
- `isEditing()`

#### Step 4.3: ClipboardManager
Extract clipboard logic:
- `copy(cellIds, cellDataGetter)`
- `paste(targetCellId)`
- `showCopyIndicators(cellIds)`
- `clearCopyIndicators()`

---

### Phase 5: Finalize Integration (Day 4-5)

#### Step 5.1: Update Spreadsheet.js
Spreadsheet.js should now be a thin coordinator:

```javascript
// Simplified spreadsheet.js structure:
class Spreadsheet {
  constructor(containerId) {
    this._initializeModules();
    this._setupEventRouting();
    this._initializeGrid();
  }

  _initializeModules() {
    this.gridRenderer = new GridRenderer(...);
    this.selectionManager = new SelectionManager(...);
    this.gridResizer = new GridResizer(...);
    this.editorManager = new EditorManager(...);
    this.clipboardManager = new ClipboardManager(...);
  }

  _setupEventRouting() {
    // Route events between modules
    // Example: When selection changes, update formula bar
  }

  // Public API methods (unchanged)
  loadFromFile(fileData) { ... }
  setCellValue(cellId, value) { ... }
  selectCell(cellId) { ... }
}
```

#### Step 5.2: Update Tests
Ensure all existing E2E tests pass:
```bash
npm run e2e
```

Add new unit tests for each module:
```bash
npm test
```

#### Step 5.3: Update Documentation
Create README in `js/ui/`:
```markdown
# UI Modules

## Architecture
[Diagram]

## Module Responsibilities
[List each module]

## Integration Points
[Show how modules communicate]

## Testing Strategy
[Explain how to test each module]
```

---

## Module Interface Specifications

### Complete Interface Contracts

```javascript
// GridRenderer
class GridRenderer {
  // Creation
  createGrid(): void
  
  // Queries
  getCellElement(cellId: string): HTMLElement
  getCellElementByCoords(row: number, col: number): HTMLElement
  getColumnHeader(colIndex: number): HTMLElement
  getRowHeader(rowIndex: number): HTMLElement
  
  // Mutations
  updateCellContent(cellId: string, value: any): void
  setColumnWidths(widths: number[]): void
  setRowHeights(heights: number[]): void
  applyGridStyles(): void
  
  // Selection Rendering
  clearAllHighlights(): void
  highlightCells(cellIds: string[], className: string): void
  highlightColumnHeader(colIndex: number): void
  highlightRowHeader(rowIndex: number): void
  
  // Utilities
  scrollCellIntoView(cellElement: HTMLElement): void
  
  // Events (via .on())
  on('cellClick', callback): void
  on('cellDoubleClick', callback): void
  on('cellMouseDown', callback): void
  on('cellMouseOver', callback): void
  on('headerClick', callback): void
  on('headerMouseMove', callback): void
}

// SelectionManager
class SelectionManager {
  // State Queries
  getActiveCellId(): string
  getSelectedCellIds(): string[]
  getSelectionRanges(): Array<{start, end}>
  
  // Selection Actions
  selectCell(coords: {row, col}, isShift: boolean, isCmd: boolean): void
  selectHeader(type: 'col'|'row', index: number, isShift, isCmd): void
  moveSelection(direction: 'up'|'down'|'left'|'right', isShift): void
  jumpToEdge(direction, cellDataGetter): void
  extendToEdge(direction, cellDataGetter): void
  setActiveCell(coords: {row, col}): void
  clear(): void
  
  // Rendering
  render(): void
  
  // Events
  on('selectionChange', callback): void
  on('activeCellChange', callback): void
}

// GridResizer
class GridResizer {
  startResize(type: 'col'|'row', indices: number[], startPos: number): void
  updateResize(currentPos: number): void
  stopResize(): {widths: number[], heights: number[]}
  
  on('resizeStart', callback): void
  on('resizeUpdate', callback): void
  on('resizeEnd', callback): void
}

// EditorManager
class EditorManager {
  startEdit(cellId: string, initialValue: string): void
  commitEdit(moveNext: boolean): {cellId, value}
  cancelEdit(): void
  isEditing(): boolean
  getValue(): string
  
  on('editStart', callback): void
  on('editCommit', callback): void
  on('editCancel', callback): void
}

// ClipboardManager
class ClipboardManager {
  copy(cellIds: string[], cellDataGetter: Function): void
  paste(targetCellId: string): Array<{cellId, value}>
  hasCopiedData(): boolean
  
  on('copy', callback): void
  on('paste', callback): void
}
```

---

## Testing Strategy

### Unit Tests (per module)
```javascript
// Example: SelectionManager.test.js
describe('SelectionManager', () => {
  it('should select single cell', () => { ... });
  it('should extend selection with shift', () => { ... });
  it('should add range with cmd', () => { ... });
  it('should handle arrow key navigation', () => { ... });
  it('should jump to data edge with cmd+arrow', () => { ... });
});
```

### Integration Tests
```javascript
// Example: GridRenderer + SelectionManager
describe('Selection Rendering', () => {
  it('should highlight selected cells in DOM', () => { ... });
  it('should clear previous selection', () => { ... });
  it('should highlight headers for full column selection', () => { ... });
});
```

### E2E Tests (existing - must pass)
- `load.spec.js` - Application loading
- `recalc.spec.js` - Formula recalculation

---

## Migration Checklist

### Before Starting
- [ ] Create feature branch: `git checkout -b refactor/spreadsheet-decomposition`
- [ ] Backup current working state
- [ ] Run all tests to establish baseline: `npm test && npm run e2e`

### During Implementation
- [ ] Each module passes its unit tests
- [ ] Integration tests pass after each module addition
- [ ] E2E tests continue to pass
- [ ] No console errors in browser
- [ ] Manual testing of core features

### After Completion
- [ ] All tests pass: `npm test && npm run e2e`
- [ ] Code review with another developer
- [ ] Performance testing (no regression)
- [ ] Documentation updated
- [ ] Merge to main

---

## Risk Mitigation

### Risks & Mitigations

**Risk 1: Breaking existing functionality**
- Mitigation: Incremental refactoring, tests after each step, feature branch

**Risk 2: State synchronization issues**
- Mitigation: Clear module contracts, single source of truth for each state type

**Risk 3: Event handling complexity**
- Mitigation: Centralized event routing in Spreadsheet.js, clear callback contracts

**Risk 4: Performance regression**
- Mitigation: Benchmark before/after, optimize hot paths (selection rendering)

**Risk 5: Testing overhead**
- Mitigation: Focus on critical paths first, add comprehensive tests later

---

## Next Steps After Refactoring

Once refactoring is complete:

1. **Rich Text Editor** (H3 from assessment): Replace input with contenteditable div
2. **Accessibility** (M4): Add ARIA attributes in GridRenderer
3. **Worker Error Handling** (M2): Improve error messaging from FormulaWorker
4. **State Centralization** (C3): Move all state to FileManager

---

## Success Criteria

✅ **Metrics:**
- Spreadsheet.js reduced from 1,100+ lines to ~250 lines
- Each module is under 300 lines
- Unit test coverage for UI modules: >70%
- All E2E tests pass
- No performance regression (< 5% slower)

✅ **Qualitative:**
- New developer can understand each module in < 15 minutes
- Adding new selection behavior requires changing only SelectionManager
- Rendering changes require changing only GridRenderer
- Modules can be tested in isolation