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

    this._createGrid();
    this._syncScroll();
  }

  /**
   * Creates the entire spreadsheet grid including headers and cells.
   */
  _createGrid() {
    this._createColumnHeaders();
    this._createRowHeaders();
    this._createCells();
  }

  /**
   * Generates the column headers from A to Z.
   */
  _createColumnHeaders() {
    for (let i = 0; i < this.COLS; i++) {
      const header = document.createElement('div');
      header.className = 'header-cell';
      // Convert number to corresponding letter (A, B, C...)
      header.textContent = String.fromCharCode(65 + i);
      this.columnHeadersContainer.appendChild(header);
    }
  }

  /**
   * Generates the row headers from 1 to 100.
   */
  _createRowHeaders() {
    for (let i = 1; i <= this.ROWS; i++) {
      const header = document.createElement('div');
      header.className = 'header-cell';
      header.textContent = i;
      this.rowHeadersContainer.appendChild(header);
    }
  }

  /**
   * Generates the main grid of cells.
   */
  _createCells() {
    // Using a DocumentFragment for performance.
    // This adds all cells to the fragment first, then appends the fragment
    // to the DOM once, causing only a single repaint.
    const fragment = document.createDocumentFragment();

    for (let row = 1; row <= this.ROWS; row++) {
      for (let col = 0; col < this.COLS; col++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        // Add a data attribute for easy identification, e.g., "A1", "B2"
        cell.dataset.id = `${String.fromCharCode(65 + col)}${row}`;
        fragment.appendChild(cell);
      }
    }
    this.cellGridContainer.appendChild(fragment);
  }

  /**
   * Syncs the scrolling of the main cell grid with the headers.
   */
  _syncScroll() {
    this.cellGridContainer.addEventListener('scroll', () => {
      // Sync horizontal scroll for column headers
      this.columnHeadersContainer.scrollLeft = this.cellGridContainer.scrollLeft;
      // Sync vertical scroll for row headers
      this.rowHeadersContainer.scrollTop = this.cellGridContainer.scrollTop;
    });
  }
}
