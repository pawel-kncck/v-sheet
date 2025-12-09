/**
 * StatusBar.js
 *
 * Manages the bottom status bar that displays:
 * - Current application mode (Ready, Edit, Enter, Point)
 * - Active cell or selected range
 *
 * This provides real-time feedback for testing and debugging,
 * showing the internal state of the mode system and selection.
 *
 * @module status-bar
 */

import { Logger } from './engine/utils/Logger.js';

export class StatusBar {
  /**
   * Creates a new StatusBar instance.
   *
   * @param {Spreadsheet} spreadsheet - Reference to the main spreadsheet instance
   */
  constructor(spreadsheet) {
    this.spreadsheet = spreadsheet;

    // Store references to DOM elements
    this.elements = {
      modeValue: document.getElementById('status-mode-value'),
      selectionValue: document.getElementById('status-selection-value')
    };

    // Validate DOM elements exist
    if (!this.elements.modeValue || !this.elements.selectionValue) {
      Logger.error('StatusBar', 'Required DOM elements not found');
      throw new Error('StatusBar: Required DOM elements not found');
    }

    this.init();
    Logger.log('StatusBar', 'Initialized');
  }

  /**
   * Initializes the status bar by setting up callbacks.
   */
  init() {
    this.setupCallbacks();
  }

  /**
   * Sets up callbacks to listen for mode and selection changes.
   */
  setupCallbacks() {
    // Hook into SelectionManager for selection changes
    if (this.spreadsheet.selectionManager) {
      this.spreadsheet.selectionManager.on('selectionChange', (data) => {
        this.updateSelection(data);
      });

      this.spreadsheet.selectionManager.on('activeCellChange', (cellId) => {
        // Update selection display when active cell changes
        const data = {
          ranges: this.spreadsheet.selectionManager.ranges,
          activeCell: this.spreadsheet.selectionManager.activeCell
        };
        this.updateSelection(data);
      });
    }

    Logger.log('StatusBar', 'Callbacks registered');
  }

  /**
   * Updates the mode display.
   *
   * @param {string} modeName - Name of the current mode ('ready', 'edit', 'enter', 'point')
   */
  updateMode(modeName) {
    if (!modeName) return;

    // Capitalize and format mode name (ready -> Ready, edit -> Edit)
    const displayName = modeName.charAt(0).toUpperCase() + modeName.slice(1);
    this.elements.modeValue.textContent = displayName;

    Logger.log('StatusBar', `Mode updated to: ${displayName}`);
  }

  /**
   * Updates the selection display.
   *
   * Formats the selection intelligently:
   * - Single cell: "A1"
   * - Single range: "A1:B5"
   * - Multiple ranges: "A1:B5 (+2 more)"
   * - Large selections: Include cell count for clarity
   *
   * @param {Object} selectionData - Selection data from SelectionManager
   * @param {Array} selectionData.ranges - Array of range objects { start, end }
   * @param {Object} selectionData.activeCell - Active cell coordinates { row, col }
   */
  updateSelection(selectionData) {
    if (!selectionData || !selectionData.ranges || selectionData.ranges.length === 0) {
      // No selection, show active cell or default
      if (selectionData && selectionData.activeCell) {
        const cellId = this._coordsToCellId(selectionData.activeCell);
        this.elements.selectionValue.textContent = cellId;
      } else {
        this.elements.selectionValue.textContent = 'A1';
      }
      return;
    }

    const ranges = selectionData.ranges;

    if (ranges.length === 1) {
      // Single selection
      const range = ranges[0];
      const displayText = this._formatRange(range);
      this.elements.selectionValue.textContent = displayText;
    } else {
      // Multiple selections - show first range + count
      const firstRange = this._formatRange(ranges[0]);
      const remainingCount = ranges.length - 1;
      this.elements.selectionValue.textContent = `${firstRange} (+${remainingCount} more)`;
    }
  }

  /**
   * Formats a range object into a display string.
   *
   * @private
   * @param {Object} range - Range object with start and end coords
   * @returns {string} Formatted range string (e.g., "A1" or "A1:B5")
   */
  _formatRange(range) {
    let { start, end } = range;

    // Check if it's a single cell
    if (start.row === end.row && start.col === end.col) {
      return this._coordsToCellId(start);
    }

    // It's a range - normalize to ensure start <= end
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);

    start = { row: minRow, col: minCol };
    end = { row: maxRow, col: maxCol };

    const startId = this._coordsToCellId(start);
    const endId = this._coordsToCellId(end);
    return `${startId}:${endId}`;
  }

  /**
   * Converts coordinates to cell ID.
   *
   * @private
   * @param {Object} coords - Coordinates { row, col }
   * @returns {string} Cell ID (e.g., "A1")
   */
  _coordsToCellId(coords) {
    const colLetter = String.fromCharCode(65 + coords.col);
    return `${colLetter}${coords.row}`;
  }
}
