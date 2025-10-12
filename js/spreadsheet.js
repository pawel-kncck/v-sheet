class Spreadsheet {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container with id "${containerId}" not found.`);
      return;
    }

    this.columnHeadersContainer = this.container.querySelector(
      '#column-headers'
    );
    this.rowHeadersContainer = this.container.querySelector('#row-headers');
    this.cellGridContainer = this.container.querySelector('#cell-grid');

    this.ROWS = 100;
    this.COLS = 26; // A-Z

    this.isMouseDown = false;
    this.startCell = null;
    this.endCell = null;

    this._createGrid();
    this._syncScroll();
    this._initEventListeners();
  }

  /**
   * Creates the entire spreadsheet grid.
   */
  _createGrid() {
    this._createColumnHeaders();
    this._createRowHeaders();
    this._createCells();
  }

  /**
   * Generates column headers (A-Z).
   */
  _createColumnHeaders() {
    for (let i = 0; i < this.COLS; i++) {
      const header = document.createElement('div');
      header.className = 'header-cell';
      header.dataset.col = i;
      header.textContent = String.fromCharCode(65 + i);
      this.columnHeadersContainer.appendChild(header);
    }
  }

  /**
   * Generates row headers (1-100).
   */
  _createRowHeaders() {
    for (let i = 1; i <= this.ROWS; i++) {
      const header = document.createElement('div');
      header.className = 'header-cell';
      header.dataset.row = i;
      header.textContent = i;
      this.rowHeadersContainer.appendChild(header);
    }
  }

  /**
   * Generates the main grid of cells.
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
    this.cellGridContainer.appendChild(fragment);
  }

  /**
   * Syncs header scrolling with the main grid.
   */
  _syncScroll() {
    this.cellGridContainer.addEventListener('scroll', () => {
      this.columnHeadersContainer.scrollLeft = this.cellGridContainer.scrollLeft;
      this.rowHeadersContainer.scrollTop = this.cellGridContainer.scrollTop;
    });
  }

  /**
   * Initializes all event listeners.
   */
  _initEventListeners() {
    // Mouse listeners
    this.cellGridContainer.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('cell')) {
        this.isMouseDown = true;
        this.startCell = e.target;
        this.endCell = e.target;
        this._handleSelection();
      }
    });

    this.cellGridContainer.addEventListener('mouseover', (e) => {
      if (this.isMouseDown && e.target.classList.contains('cell')) {
        this.endCell = e.target;
        this._handleSelection();
      }
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    // --- NEW: Keyboard listener ---
    window.addEventListener('keydown', (e) => {
      // We only want to handle arrow keys
      if (
        !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
      ) {
        return;
      }

      // Prevent the browser's default behavior (scrolling the page)
      e.preventDefault();

      // If no cell is selected, select A1 as the starting point
      const currentCell =
        this.container.querySelector('.selected') ||
        this.cellGridContainer.querySelector("[data-id='A1']");

      this._handleArrowKey(e.key, currentCell);
    });
  }

  // --- NEW: Method to handle arrow key logic ---

  /**
   * Handles the logic for moving the selection with arrow keys.
   * @param {string} key - The key that was pressed ('ArrowUp', etc.).
   * @param {HTMLElement} currentCell - The currently selected cell.
   */
  _handleArrowKey(key, currentCell) {
    const coords = this._getCellCoords(currentCell);
    let { row, col } = coords;

    // Calculate the new coordinates based on the key pressed
    switch (key) {
      case 'ArrowUp':
        row = Math.max(1, row - 1); // Boundary check: min row is 1
        break;
      case 'ArrowDown':
        row = Math.min(this.ROWS, row + 1); // Boundary check: max row
        break;
      case 'ArrowLeft':
        col = Math.max(0, col - 1); // Boundary check: min col is 0
        break;
      case 'ArrowRight':
        col = Math.min(this.COLS - 1, col + 1); // Boundary check: max col
        break;
    }

    // Find the new cell element based on the calculated coordinates
    const newCell = this.cellGridContainer.querySelector(
      `[data-col='${col}'][data-row='${row}']`
    );

    if (newCell) {
      // Update the selection state
      this.startCell = newCell;
      this.endCell = newCell;

      // Apply the selection styles
      this._handleSelection();

      // Scroll the new cell into view if it's not visible
      this._scrollCellIntoView(newCell);
    }
  }

  /**
   * Main function to handle applying selection styles.
   */
  _handleSelection() {
    this._clearSelections();

    if (this.startCell) {
      this.startCell.classList.add('selected');
    }

    const startCoords = this._getCellCoords(this.startCell);
    const endCoords = this._getCellCoords(this.endCell);

    const minCol = Math.min(startCoords.col, endCoords.col);
    const maxCol = Math.max(startCoords.col, endCoords.col);
    const minRow = Math.min(startCoords.row, endCoords.row);
    const maxRow = Math.max(startCoords.row, endCoords.row);

    for (let col = minCol; col <= maxCol; col++) {
      const colHeader = this.columnHeadersContainer.querySelector(
        `[data-col='${col}']`
      );
      if (colHeader) colHeader.classList.add('header-highlight');

      for (let row = minRow; row <= maxRow; row++) {
        const rowHeader = this.rowHeadersContainer.querySelector(
          `[data-row='${row}']`
        );
        if (rowHeader) rowHeader.classList.add('header-highlight');

        const cell = this.cellGridContainer.querySelector(
          `[data-col='${col}'][data-row='${row}']`
        );
        if (cell) cell.classList.add('range-selected');
      }
    }
  }

  /**
   * Removes all selection-related CSS classes.
   */
  _clearSelections() {
    const selectedCell = this.container.querySelector('.selected');
    if (selectedCell) selectedCell.classList.remove('selected');

    this.container.querySelectorAll('.range-selected').forEach((cell) => {
      cell.classList.remove('range-selected');
    });

    this.container.querySelectorAll('.header-highlight').forEach((header) => {
      header.classList.remove('header-highlight');
    });
  }

  /**
   * Helper to get coordinates from a cell element.
   */
  _getCellCoords(cell) {
    if (!cell) return { row: -1, col: -1 };
    return {
      row: parseInt(cell.dataset.row, 10),
      col: parseInt(cell.dataset.col, 10),
    };
  }

  // --- NEW: Method to scroll the grid ---

  /**
   * Ensures the given cell is visible within the scrollable grid area.
   * @param {HTMLElement} cell - The cell to bring into view.
   */
  _scrollCellIntoView(cell) {
    const grid = this.cellGridContainer;
    const cellRect = cell.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();

    // Check vertical scroll
    if (cellRect.bottom > gridRect.bottom) {
      grid.scrollTop += cellRect.bottom - gridRect.bottom;
    } else if (cellRect.top < gridRect.top) {
      grid.scrollTop -= gridRect.top - cellRect.top;
    }

    // Check horizontal scroll
    if (cellRect.right > gridRect.right) {
      grid.scrollLeft += cellRect.right - gridRect.right;
    } else if (cellRect.left < gridRect.left) {
      grid.scrollLeft -= gridRect.left - cellRect.left;
    }
  }
}
