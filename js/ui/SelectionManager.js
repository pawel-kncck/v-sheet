import { Logger } from '../engine/utils/Logger.js';

export class SelectionManager {
  /**
   * @param {GridRenderer} gridRenderer - Reference to the renderer to draw selections
   * @param {Object} config - Grid dimensions
   * @param {number} [config.rows=100]
   * @param {number} [config.cols=26]
   */
  constructor(gridRenderer, config = {}) {
    this.gridRenderer = gridRenderer;
    this.config = {
      rows: config.rows || 100,
      cols: config.cols || 26
    };
    this.ROWS = this.config.rows;
    this.COLS = this.config.cols;

    // --- Selection State ---
    this.activeCell = null; // { row, col }
    this.selectionAnchor = null; // { row, col }
    this.ranges = []; // Array of { start: coords, end: coords }

    // --- Callbacks ---
    this.callbacks = {
      onSelectionChange: null,
      onActiveCellChange: null
    };

    Logger.log('SelectionManager', 'Initialized');
  }

  /**
 * Gets the currently active cell ID
 * @returns {string|null} Cell ID like "A1" or null if none
 */
getActiveCellId() {
  if (!this.activeCell) return null;
  return this._coordsToCellId(this.activeCell);
}

/**
 * Gets all currently selected cell IDs
 * @returns {string[]} Array of cell IDs
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
 * Clears all selections and resets state
 */
clear() {
  this.activeCell = null;
  this.selectionAnchor = null;
  this.ranges = [];
  this.gridRenderer.clearAllHighlights();
}

/**
   * Checks if the mouse is hovering over the border of the selection.
   * @param {Object} coords - { row, col } of the hovered cell
   * @param {MouseEvent} event - The mousemove event
   * @param {HTMLElement} cellElement - The DOM element for the cell
   * @returns {string} 'grab' or 'default'
   */
  getCursorForCell(coords, event, cellElement) {
    const cellId = this._coordsToCellId(coords);

    // Quick check: if cell isn't selected, we don't care
    if (!this.getSelectedCellIds().includes(cellId)) return 'default';

    // NEW: Check for fill handle (bottom-right corner of selection)
    const bounds = this.getSelectionBounds();
    if (bounds && coords.row === bounds.maxRow && coords.col === bounds.maxCol) {
      const rect = cellElement.getBoundingClientRect();
      const x = event.clientX;
      const y = event.clientY;

      // 10px hit zone in bottom-right corner
      const nearBottomRight =
        (rect.right - x) <= 10 &&
        (rect.bottom - y) <= 10;

      if (nearBottomRight) {
        return 'crosshair';
      }
    }

    // Get visual bounds of the cell
    const rect = cellElement.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    const THRESHOLD = 5; // 5px buffer zone

    // Check proximity to edges
    const nearTop = Math.abs(y - rect.top) <= THRESHOLD;
    const nearBottom = Math.abs(y - rect.bottom) <= THRESHOLD;
    const nearLeft = Math.abs(x - rect.left) <= THRESHOLD;
    const nearRight = Math.abs(x - rect.right) <= THRESHOLD;

    // If not near any edge, it's a normal pointer (user can click to select inside)
    if (!nearTop && !nearBottom && !nearLeft && !nearRight) return 'default';

    // Now check if the edge we are near is actually a selection boundary
    // We iterate all ranges to see if this cell is an edge cell for any of them
    for (const range of this.ranges) {
      const { start, end } = range;
      const minCol = Math.min(start.col, end.col);
      const maxCol = Math.max(start.col, end.col);
      const minRow = Math.min(start.row, end.row);
      const maxRow = Math.max(start.row, end.row);

      // Check if current cell is within this range
      if (coords.col >= minCol && coords.col <= maxCol &&
          coords.row >= minRow && coords.row <= maxRow) {

        // Valid Grab conditions:
        // 1. Near Top AND cell is top row of range
        if (nearTop && coords.row === minRow) return 'grab';
        // 2. Near Bottom AND cell is bottom row of range
        if (nearBottom && coords.row === maxRow) return 'grab';
        // 3. Near Left AND cell is left col of range
        if (nearLeft && coords.col === minCol) return 'grab';
        // 4. Near Right AND cell is right col of range
        if (nearRight && coords.col === maxCol) return 'grab';
      }
    }

    return 'default';
  }

  /**
   * Selects a cell, handling shift/cmd modifiers.
   * @param {Object} coords - { row, col }
   * @param {boolean} isShift - Extend current selection?
   * @param {boolean} isCmd - Add new disconnected range?
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
   * Selects an entire column or row header.
   * @param {string} type - 'col' or 'row'
   * @param {number} index - 0-based index
   * @param {boolean} isShift 
   * @param {boolean} isCmd 
   */
  selectHeader(type, index, isShift = false, isCmd = false) {
    let start, end;
    
    if (type === 'col') {
      start = { col: index, row: 1 };
      end = { col: index, row: this.ROWS };
    } else {
      // row
      start = { col: 0, row: index };
      end = { col: this.COLS - 1, row: index };
    }
    
    // If not extending, the top-left of the header becomes the active cell
    if (!isShift) {
      this.setActiveCell(start);
    }
    
    if (isShift) {
      // Extend selection to include this header's end point
      if (this.ranges.length === 0) {
        this.selectionAnchor = start;
        this.ranges.push({ start, end });
      } else {
        // Modify the end of the last range to cover this header
        const lastRange = this.ranges[this.ranges.length - 1];
        lastRange.end = end;
      }
    } else if (isCmd) {
      // Add new range
      this.selectionAnchor = start;
      this.ranges.push({ start, end });
    } else {
      // New single selection
      this.selectionAnchor = start;
      this.ranges = [{ start, end }];
    }
    
    this.render();
    this._notifySelectionChange();
  }

  /**
   * Handles arrow key navigation.
   * @param {string} direction - 'up', 'down', 'left', 'right'
   * @param {boolean} isShift - True if extending selection
   */
  moveSelection(direction, isShift = false) {
    if (!this.activeCell) return;
    
    // If expanding (Shift), we move the END of the range.
    // If moving (No Shift), we move relative to ACTIVE cell.
    let { row, col } = (isShift && this.ranges.length > 0)
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
    
    // Ensure the new position is visible
    const cellElement = this.gridRenderer.getCellElementByCoords(row, col);
    if (cellElement) {
      this.gridRenderer.scrollCellIntoView(cellElement);
    }
  }

  /**
   * Sets the active cell (the one with focus).
   * @param {Object} coords - { row, col }
   */
  setActiveCell(coords) {
    this.activeCell = coords;
    
    if (this.callbacks.onActiveCellChange) {
      const cellId = this._coordsToCellId(coords);
      this.callbacks.onActiveCellChange(cellId, coords);
    }
  }

  /**
   * Jumps to the edge of the data region.
   * @param {string} direction - 'up', 'down', 'left', 'right'
   * @param {Function} hasValue - Function(cellId) -> boolean. Returns true if cell has data.
   * @param {boolean} shift - If true, extends selection instead of moving
   */
  jumpToEdge(direction, hasValue, shift = false) {
    if (!this.activeCell) return;

    let { row, col } = this.activeCell;
    const startHasValue = hasValue(this._coordsToCellId({ row, col }));

    // Define the step for each direction
    const step = {
      up: { r: -1, c: 0 },
      down: { r: 1, c: 0 },
      left: { r: 0, c: -1 },
      right: { r: 0, c: 1 }
    }[direction];

    // Helper to check if a coordinate is within bounds
    const isValid = (r, c) => r >= 1 && r <= this.ROWS && c >= 0 && c < this.COLS;

    // Peek at the immediate neighbor
    let nextR = row + step.r;
    let nextC = col + step.c;

    if (!isValid(nextR, nextC)) return; // Already at edge

    const neighborHasValue = hasValue(this._coordsToCellId({ row: nextR, col: nextC }));

    // LOGIC:
    // 1. If we are on data and neighbor is data -> Keep going until we hit empty or edge.
    // 2. If we are on data and neighbor is empty -> Keep going until we hit data or edge.
    // 3. If we are on empty -> Keep going until we hit data or edge.
    
    // If we are starting on a value, and the immediate neighbor is empty, 
    // we want to jump across the gap to the next value. 
    // Otherwise, we are moving along a contiguous block (of values or empties).
    const lookForValue = startHasValue && !neighborHasValue ? true : startHasValue;

    while (isValid(nextR, nextC)) {
      const currentId = this._coordsToCellId({ row: nextR, col: nextC });
      const currentIsValue = hasValue(currentId);

      // Stop conditions
      if (startHasValue) {
        if (neighborHasValue) {
           // Case 1: Contiguous Block. Stop if we hit empty.
           if (!currentIsValue) {
             // Step back one to stay on the last value
             nextR -= step.r;
             nextC -= step.c;
             break;
           }
        } else {
           // Case 2: Jumping Gap. Stop if we hit value.
           if (currentIsValue) break;
        }
      } else {
        // Case 3: Starting on empty. Stop if we hit value.
        if (currentIsValue) break;
      }

      // If this is the very last valid cell in this direction, stop here
      if (!isValid(nextR + step.r, nextC + step.c)) break;

      // Keep moving
      nextR += step.r;
      nextC += step.c;
    }

    // Perform the move
    const newCoords = { row: nextR, col: nextC };

    if (shift) {
      // Extend selection
      this.selectCell(newCoords, true, false);
    } else {
      // Move selection
      this.setActiveCell(newCoords);
      this.selectCell(newCoords, false, false);
    }

    // Scroll into view
    const cellElement = this.gridRenderer.getCellElementByCoords(nextR, nextC);
    if (cellElement) {
      this.gridRenderer.scrollCellIntoView(cellElement);
    }
  }

  /**
   * Extends current selection to the edge of the data region.
   * @param {string} direction - 'up', 'down', 'left', 'right'
   * @param {Function} hasValue - Function(cellId) -> boolean. Returns true if cell has data.
   */
  extendSelectionToEdge(direction, hasValue) {
    this.jumpToEdge(direction, hasValue, true);
  }

  /**
   * Extends the current selection in a direction.
   * @param {string} direction - 'up', 'down', 'left', 'right'
   */
  extendSelection(direction) {
    this.moveSelection(direction, true);
  }

  /**
   * Selects a rectangular range.
   * @param {Object} start - { row, col }
   * @param {Object} end - { row, col }
   */
  selectRange(start, end) {
    this.setActiveCell(start);
    this.selectionAnchor = start;
    this.ranges = [{ start, end }];
    this.render();
    this._notifySelectionChange();
  }

  /**
   * Gets the current selection ranges.
   * @returns {Array} Array of { start: coords, end: coords }
   */
  getSelection() {
    return this.ranges;
  }

  /**
   * Gets the bounds of the current selection.
   * @returns {{ minRow: number, maxRow: number, minCol: number, maxCol: number }|null}
   */
  getSelectionBounds() {
    if (this.ranges.length === 0) {
      return null;
    }

    let minRow = Infinity;
    let maxRow = -Infinity;
    let minCol = Infinity;
    let maxCol = -Infinity;

    this.ranges.forEach(range => {
      const { start, end } = range;
      minRow = Math.min(minRow, start.row, end.row);
      maxRow = Math.max(maxRow, start.row, end.row);
      minCol = Math.min(minCol, start.col, end.col);
      maxCol = Math.max(maxCol, start.col, end.col);
    });

    return { minRow, maxRow, minCol, maxCol };
  }

  /**
   * Converts coordinates to cell ID (public version).
   * @param {Object} coords - { row, col }
   * @returns {string} Cell ID like "A1"
   */
  coordsToCellId(coords) {
    return this._coordsToCellId(coords);
  }

  /**
   * Renders the current selection state to the grid via GridRenderer.
   */
  render() {
    // 1. Clear previous drawings
    this.gridRenderer.clearAllHighlights();
    
    // 2. Calculate overlaps for background opacity
    const cellSelectionCounts = {};
    
    this.ranges.forEach(range => {
      const { start, end } = range;
      const minCol = Math.min(start.col, end.col);
      const maxCol = Math.max(start.col, end.col);
      const minRow = Math.min(start.row, end.row);
      const maxRow = Math.max(start.row, end.row);
      
      // Highlight headers involved in selection
      for (let col = minCol; col <= maxCol; col++) {
        this.gridRenderer.highlightColumnHeader(col);
        for (let row = minRow; row <= maxRow; row++) {
          // Only highlight row headers once per row loop
          if (col === minCol) {
             this.gridRenderer.highlightRowHeader(row);
          }
          
          const cellId = this._coordsToCellId({ row, col });
          cellSelectionCounts[cellId] = (cellSelectionCounts[cellId] || 0) + 1;
        }
      }
    });
    
    // 3. Apply background colors based on overlap count
    for (const cellId in cellSelectionCounts) {
      const count = Math.min(cellSelectionCounts[cellId], 8);
      this.gridRenderer.highlightCells([cellId], `range-selected-${count}`);
    }
    
    // 4. Apply perimeter borders for each range
    this.ranges.forEach(range => {
      const { start, end } = range;
      const minCol = Math.min(start.col, end.col);
      const maxCol = Math.max(start.col, end.col);
      const minRow = Math.min(start.row, end.row);
      const maxRow = Math.max(start.row, end.row);
      
      // Top Border
      for (let c = minCol; c <= maxCol; c++) {
        this.gridRenderer.highlightCells([this._coordsToCellId({row: minRow, col: c})], 'range-border-top');
        this.gridRenderer.highlightCells([this._coordsToCellId({row: maxRow, col: c})], 'range-border-bottom');
      }
      // Side Borders
      for (let r = minRow; r <= maxRow; r++) {
        this.gridRenderer.highlightCells([this._coordsToCellId({row: r, col: minCol})], 'range-border-left');
        this.gridRenderer.highlightCells([this._coordsToCellId({row: r, col: maxCol})], 'range-border-right');
      }
    });
    
    // 5. Highlight the active cell specifically
    if (this.activeCell) {
      const activeId = this._coordsToCellId(this.activeCell);
      this.gridRenderer.highlightCells([activeId], 'selected');
    }

    // 6. Render fill handle (if single range and fillHandle is set)
    if (this.ranges.length === 1 && this._fillHandle) {
      this._fillHandle.render();
    }
  }

  // --- Private Helpers ---

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

  _coordsToCellId(coords) {
    const colLetter = String.fromCharCode(65 + coords.col);
    return `${colLetter}${coords.row}`;
  }

  _notifySelectionChange() {
    if (this.callbacks.onSelectionChange) {
      this.callbacks.onSelectionChange({
        ranges: this.ranges,
        activeCell: this.activeCell
      });
    }
  }

  /**
   * Register event callbacks
   * @param {string} eventName - 'selectionChange' or 'activeCellChange'
   * @param {Function} callback 
   */
  on(eventName, callback) {
    const callbackKey = `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;
    if (callbackKey in this.callbacks) {
      this.callbacks[callbackKey] = callback;
    }
  }
}