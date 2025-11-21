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
    this.ROWS = config.rows || 100;
    this.COLS = config.cols || 26;

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