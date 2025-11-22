import { Logger } from '../engine/utils/Logger.js';

export class GridRenderer {
  /**
   * @param {HTMLElement} container - The DOM element containing the spreadsheet structure
   * @param {Object} config - Configuration options
   * @param {number} [config.rows=100] - Number of rows
   * @param {number} [config.cols=26] - Number of columns
   * @param {number} [config.defaultColWidth=94] - Default column width in pixels
   * @param {number} [config.defaultRowHeight=20] - Default row height in pixels
   */
  constructor(container, config = {}) {
    this.container = container;
    
    // 1. Store Configuration
    this.ROWS = config.rows || 100;
    this.COLS = config.cols || 26;
    this.DEFAULT_COL_WIDTH = config.defaultColWidth || 94;
    this.DEFAULT_ROW_HEIGHT = config.defaultRowHeight || 20;

    // 2. Initialize DOM References
    // We assume the HTML structure already exists (loaded from index.html)
    this.columnHeadersContainer = this.container.querySelector('#column-headers');
    this.rowHeadersContainer = this.container.querySelector('#row-headers');
    this.cellGridContainer = this.container.querySelector('#cell-grid');

    if (!this.columnHeadersContainer || !this.rowHeadersContainer || !this.cellGridContainer) {
      Logger.error('GridRenderer', 'Required DOM elements not found inside container');
      throw new Error('Invalid Spreadsheet DOM structure');
    }

    // 3. Initialize State for Dimensions
    // We fill these arrays with the default values initially.
    this.columnWidths = Array(this.COLS).fill(this.DEFAULT_COL_WIDTH);
    this.rowHeights = Array(this.ROWS).fill(this.DEFAULT_ROW_HEIGHT);

    // 4. Event Callbacks
    // The Coordinator (Spreadsheet.js) will register functions here later.
    this.callbacks = {
      onCellClick: null,
      onCellDoubleClick: null,
      onCellMouseDown: null,
      onCellMouseOver: null,
      onHeaderClick: null,
      onHeaderMouseMove: null,
      onHeaderMouseDown: null
    };
    
    Logger.log('GridRenderer', 'Initialized');
  }

  /**
   * Creates the entire grid structure and applies initial styles.
   * This is the main entry point for rendering.
   */
  createGrid() {
    this._createColumnHeaders();
    this._createRowHeaders();
    this._createCells();
    this.applyGridStyles();
    this._setupScrollSync();
    this._attachEventListeners();
    
    Logger.log('GridRenderer', 'Grid DOM structure created');
  }

  /**
   * Updates the text content of a specific cell.
   * @param {string} cellId - The ID of the cell (e.g., "A1")
   * @param {string|number} value - The value to display
   */
  updateCellContent(cellId, value) {
    const cell = this.getCellElement(cellId);
    if (cell) {
      // Ensure null/undefined becomes empty string
      cell.textContent = (value === undefined || value === null) ? '' : value;
    }
  }

  /**
   * Retrieves a cell DOM element by its ID.
   * @param {string} cellId - e.g., "A1"
   * @returns {HTMLElement|null}
   */
  getCellElement(cellId) {
    // Using querySelector is safe because we control the data-id format
    return this.cellGridContainer.querySelector(`[data-id='${cellId}']`);
  }

  /**
   * Retrieves a cell DOM element by its grid coordinates.
   * @param {number} row - 1-based row index
   * @param {number} col - 0-based column index
   * @returns {HTMLElement|null}
   */
  getCellElementByCoords(row, col) {
    return this.cellGridContainer.querySelector(
      `[data-col='${col}'][data-row='${row}']`
    );
  }

  /**
   * Scrolls the grid container so the specified cell is visible.
   * Handles partial visibility logic.
   * @param {HTMLElement} cellElement 
   */
  scrollCellIntoView(cellElement) {
    if (!cellElement) return;

    const grid = this.cellGridContainer;
    const cellRect = cellElement.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();

    // Check vertical visibility
    if (cellRect.bottom > gridRect.bottom) {
      grid.scrollTop += cellRect.bottom - gridRect.bottom;
    } else if (cellRect.top < gridRect.top) {
      grid.scrollTop -= gridRect.top - cellRect.top;
    }

    // Check horizontal visibility
    if (cellRect.right > gridRect.right) {
      grid.scrollLeft += cellRect.right - gridRect.right;
    } else if (cellRect.left < gridRect.left) {
      grid.scrollLeft -= gridRect.left - cellRect.left;
    }
  }

  /**
   * Clears ALL selection classes from cells and headers.
   * This is called before re-drawing selections.
   */
  clearAllHighlights() {
    // 1. Clear Header Highlights
    const highlightedHeaders = this.container.querySelectorAll('.header-highlight');
    highlightedHeaders.forEach(h => h.classList.remove('header-highlight'));
    
    // 2. Clear Cell Selection Classes
    // These correspond to the CSS classes in spreadsheet.css
    const selectionClasses = [
      'selected',
      'range-border-top', 'range-border-right',
      'range-border-bottom', 'range-border-left',
      'range-selected-1', 'range-selected-2', 'range-selected-3',
      'range-selected-4', 'range-selected-5', 'range-selected-6',
      'range-selected-7', 'range-selected-8'
    ];
    
    // Optimization: only query things that might have classes
    const selectedCells = this.container.querySelectorAll('.cell[class*="selected"], .cell[class*="range-"]');
    selectedCells.forEach(c => c.classList.remove(...selectionClasses));
  }

  /**
   * Applies a specific CSS class to a list of cell IDs.
   * @param {string[]} cellIds - Array of cell IDs
   * @param {string} className - The class to add (e.g., 'selected', 'range-selected-1')
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
   * Adds highlighting to a column header.
   * @param {number} colIndex 
   */
  highlightColumnHeader(colIndex) {
    const header = this.columnHeadersContainer.querySelector(`[data-col='${colIndex}']`);
    if (header) {
      header.classList.add('header-highlight');
    }
  }

  /**
   * Adds highlighting to a row header.
   * @param {number} rowIndex 
   */
  highlightRowHeader(rowIndex) {
    const header = this.rowHeadersContainer.querySelector(`[data-row='${rowIndex}']`);
    if (header) {
      header.classList.add('header-highlight');
    }
  }

  /**
   * Sets new column widths and re-applies styles.
   * @param {number[]} widths 
   */
  setColumnWidths(widths) {
    if (widths.length === this.COLS) {
      this.columnWidths = [...widths];
      this.applyGridStyles();
    }
  }

  /**
   * Sets new row heights and re-applies styles.
   * @param {number[]} heights 
   */
  setRowHeights(heights) {
    if (heights.length === this.ROWS) {
      this.rowHeights = [...heights];
      this.applyGridStyles();
    }
  }

  // --- Event Handling ---

  /**
   * Attaches native DOM event listeners to the containers.
   * Uses event delegation to avoid listeners on every cell.
   * @private
   */
  _attachEventListeners() {
    // 1. Cell Interactions
    this.cellGridContainer.addEventListener('click', (e) => {
      const cell = e.target.closest('.cell');
      if (cell && this.callbacks.onCellClick) {
        this.callbacks.onCellClick({ cellElement: cell, event: e });
      }
    });

    this.cellGridContainer.addEventListener('dblclick', (e) => {
      const cell = e.target.closest('.cell');
      if (cell && this.callbacks.onCellDoubleClick) {
        this.callbacks.onCellDoubleClick({ cellElement: cell, event: e });
      }
    });

    this.cellGridContainer.addEventListener('mousedown', (e) => {
      const cell = e.target.closest('.cell');
      if (cell && this.callbacks.onCellMouseDown) {
        this.callbacks.onCellMouseDown({ cellElement: cell, event: e });
      }
    });

    this.cellGridContainer.addEventListener('mouseover', (e) => {
      const cell = e.target.closest('.cell');
      if (cell && this.callbacks.onCellMouseOver) {
        this.callbacks.onCellMouseOver({ cellElement: cell, event: e });
      }
    });

    // 2. Header Interactions (Selection)
    // We delegate clicks to the container
    const handleHeaderClick = (e, type) => {
      const header = e.target.closest('.header-cell');
      if (header && this.callbacks.onHeaderClick) {
        const index = parseInt(type === 'col' ? header.dataset.col : header.dataset.row, 10);
        this.callbacks.onHeaderClick({ type, index, event: e });
      }
    };

    this.columnHeadersContainer.addEventListener('click', (e) => handleHeaderClick(e, 'col'));
    this.rowHeadersContainer.addEventListener('click', (e) => handleHeaderClick(e, 'row'));

    // 3. Header Interactions (Resizing & Dragging)
    // We track mouse moves over headers to show resize cursors
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

    // Mouse down on header (could be resize start or selection start)
    this.columnHeadersContainer.addEventListener('mousedown', (e) => {
      if (this.callbacks.onHeaderMouseDown) {
        this.callbacks.onHeaderMouseDown({ type: 'col', event: e });
      }
    });

    this.rowHeadersContainer.addEventListener('mousedown', (e) => {
      if (this.callbacks.onHeaderMouseDown) {
        this.callbacks.onHeaderMouseDown({ type: 'row', event: e });
      }
    });
  }

  /**
   * Registers a callback for a specific event.
   * Supported events: 'cellClick', 'cellDoubleClick', 'cellMouseDown', 'cellMouseOver', 'headerClick', 'headerMouseMove', 'headerMouseDown'
   * @param {string} eventName 
   * @param {Function} callback 
   */
  on(eventName, callback) {
    // Convert 'cellClick' -> 'onCellClick'
    const callbackKey = `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;
    
    if (callbackKey in this.callbacks) {
      this.callbacks[callbackKey] = callback;
    } else {
      Logger.warn('GridRenderer', `Attempted to register unknown event: ${eventName}`);
    }
  }

  /**
   * Cleans up references.
   * (Note: We don't strictly need to removeEventListener if we are destroying the whole DOM node,
   * but it's good practice if this component were ever unmounted while the page stays alive)
   */
  destroy() {
    // Clear references to DOM elements
    this.columnHeadersContainer = null;
    this.rowHeadersContainer = null;
    this.cellGridContainer = null;
    this.callbacks = {};
  }

  // --- Private Creation Methods ---

  /**
   * Generates column header cells (A, B, C...)
   * @private
   */
  _createColumnHeaders() {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < this.COLS; i++) {
      const header = document.createElement('div');
      header.className = 'header-cell';
      header.dataset.col = i;
      header.textContent = String.fromCharCode(65 + i);
      fragment.appendChild(header);
    }
    this.columnHeadersContainer.innerHTML = '';
    this.columnHeadersContainer.appendChild(fragment);
  }

  /**
   * Generates row header cells (1, 2, 3...)
   * @private
   */
  _createRowHeaders() {
    const fragment = document.createDocumentFragment();
    for (let i = 1; i <= this.ROWS; i++) {
      const header = document.createElement('div');
      header.className = 'header-cell';
      header.dataset.row = i;
      header.textContent = i;
      fragment.appendChild(header);
    }
    this.rowHeadersContainer.innerHTML = '';
    this.rowHeadersContainer.appendChild(fragment);
  }

  /**
   * Generates the main grid cells.
   * @private
   */
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
    this.cellGridContainer.innerHTML = '';
    this.cellGridContainer.appendChild(fragment);
  }

  /**
   * Applies column widths and row heights to the CSS Grid layout.
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
   * Sets up scroll synchronization.
   * @private
   */
  _setupScrollSync() {
    this.cellGridContainer.addEventListener('scroll', () => {
      this.columnHeadersContainer.scrollLeft = this.cellGridContainer.scrollLeft;
      this.rowHeadersContainer.scrollTop = this.cellGridContainer.scrollTop;
    });
  }

  /**
   * Displays the drag ghost element matching the dimensions of the selected range.
   * @param {Object} range - { start: {col, row}, end: {col, row} }
   */
  showDragGhost(range) {
    // 1. Calculate Geometry
    const minCol = Math.min(range.start.col, range.end.col);
    const maxCol = Math.max(range.start.col, range.end.col);
    const minRow = Math.min(range.start.row, range.end.row);
    const maxRow = Math.max(range.start.row, range.end.row);

    let width = 0;
    for (let c = minCol; c <= maxCol; c++) {
      width += this.columnWidths[c] || this.DEFAULT_COL_WIDTH;
    }

    let height = 0;
    // Note: rowHeights is 0-indexed (row 1 = index 0)
    for (let r = minRow; r <= maxRow; r++) {
      height += this.rowHeights[r - 1] || this.DEFAULT_ROW_HEIGHT;
    }

    // Calculate initial top/left relative to the scrollable grid area
    let top = 0;
    for (let r = 1; r < minRow; r++) {
      top += this.rowHeights[r - 1] || this.DEFAULT_ROW_HEIGHT;
    }

    let left = 0;
    for (let c = 0; c < minCol; c++) {
      left += this.columnWidths[c] || this.DEFAULT_COL_WIDTH;
    }

    // Adjust for current scroll position to make it appear exactly over the source
    const gridRect = this.cellGridContainer.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    
    // The ghost is appended to this.container (the main wrapper), so we calculate 
    // offsets relative to that.
    // Offset = (Grid Screen Pos - Container Screen Pos) + (Cell Logic Pos - Scroll)
    const originX = (gridRect.left - containerRect.left) + (left - this.cellGridContainer.scrollLeft);
    const originY = (gridRect.top - containerRect.top) + (top - this.cellGridContainer.scrollTop);

    // 2. Create or Reuse Element
    let ghost = this.container.querySelector('#drag-ghost');
    if (!ghost) {
      ghost = document.createElement('div');
      ghost.id = 'drag-ghost';
      this.container.appendChild(ghost);
    }

    // 3. Apply Styles
    ghost.style.width = `${width}px`;
    ghost.style.height = `${height}px`;
    ghost.style.left = `${originX}px`;
    ghost.style.top = `${originY}px`;
    ghost.style.display = 'block';
    ghost.style.transform = 'translate(0, 0)'; // Reset transform

    // Store origin for update calculations
    this._dragOrigin = { x: originX, y: originY };
  }

  /**
   * Updates the position of the drag ghost based on mouse movement.
   * @param {number} deltaX - Change in X (pixels)
   * @param {number} deltaY - Change in Y (pixels)
   */
  updateDragGhost(deltaX, deltaY) {
    const ghost = this.container.querySelector('#drag-ghost');
    if (ghost) {
      // Using translate is more performant than updating top/left
      ghost.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    }
  }

  /**
   * Hides and cleans up the drag ghost.
   */
  hideDragGhost() {
    const ghost = this.container.querySelector('#drag-ghost');
    if (ghost) {
      ghost.style.display = 'none';
      // Reset position to avoid flicker on next show
      ghost.style.top = '0px';
      ghost.style.left = '0px';
    }
    this._dragOrigin = null;
  }
}

