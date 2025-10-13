class Spreadsheet {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container with id "${containerId}" not found.`);
      return;
    }

    this.cellEditor = document.getElementById('cell-editor');
    this.cellData = {};
    this.isEditing = false;
    this.editingCell = null;

    this.columnHeadersContainer = this.container.querySelector(
      '#column-headers'
    );
    this.rowHeadersContainer = this.container.querySelector('#row-headers');
    this.cellGridContainer = this.container.querySelector('#cell-grid');

    this.ROWS = 100;
    this.COLS = 26;

    this.isMouseDown = false;
    this.startCell = null;
    this.endCell = null;

    this._createGrid();
    this._syncScroll();
    this._initEventListeners();
  }

  // ... (creation and sync methods are unchanged) ...

  _createGrid() {
    this._createColumnHeaders();
    this._createRowHeaders();
    this._createCells();
  }

  _createColumnHeaders() {
    for (let i = 0; i < this.COLS; i++) {
      const header = document.createElement('div');
      header.className = 'header-cell';
      header.dataset.col = i;
      header.textContent = String.fromCharCode(65 + i);
      this.columnHeadersContainer.appendChild(header);
    }
  }

  _createRowHeaders() {
    for (let i = 1; i <= this.ROWS; i++) {
      const header = document.createElement('div');
      header.className = 'header-cell';
      header.dataset.row = i;
      header.textContent = i;
      this.rowHeadersContainer.appendChild(header);
    }
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

  _syncScroll() {
    this.cellGridContainer.addEventListener('scroll', () => {
      this.columnHeadersContainer.scrollLeft = this.cellGridContainer.scrollLeft;
      this.rowHeadersContainer.scrollTop = this.cellGridContainer.scrollTop;
    });
  }

  _initEventListeners() {
    this.cellGridContainer.tabIndex = 0;

    // Mouse listeners
    this.cellGridContainer.addEventListener('mousedown', (e) => {
      if (this.isEditing) return;
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

    // Keyboard listener for navigation and editing/deleting
    this.cellGridContainer.addEventListener('keydown', (e) => {
      if (this.isEditing) return;

      const key = e.key;
      const currentCell =
        this.container.querySelector('.selected') ||
        this.cellGridContainer.querySelector("[data-id='A1']");

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        e.preventDefault();
        this._handleArrowKey(key, currentCell);
      } else if (key === 'Enter') {
        e.preventDefault();
        this._startEditing(currentCell);
      }
      // --- NEW: Backspace functionality ---
      else if (key === 'Backspace') {
        e.preventDefault();
        this._clearSelectedCells();
      } else if (key.length === 1 && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this._startEditing(currentCell, key);
      }
    });

    // Double-click to edit
    this.cellGridContainer.addEventListener('dblclick', (e) => {
      if (e.target.classList.contains('cell')) {
        this._startEditing(e.target);
      }
    });

    // Listeners for the cell editor input
    this.cellEditor.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this._commitEdit();
      } else if (e.key === 'Escape') {
        this._cancelEdit();
      }
    });

    this.cellEditor.addEventListener('blur', () => {
      if (this.isEditing) {
        this._commitEdit(false);
      }
    });
  }

  _startEditing(cell, initialValue = '') {
    this.isEditing = true;
    this.editingCell = cell;
    this.editingCell.classList.add('editing');

    const cellRect = cell.getBoundingClientRect();
    const scrollLeft = this.cellGridContainer.scrollLeft;
    const scrollTop = this.cellGridContainer.scrollTop;

    this.cellEditor.style.left = `${cell.offsetLeft - scrollLeft}px`;
    this.cellEditor.style.top = `${cell.offsetTop - scrollTop}px`;
    this.cellEditor.style.width = `${cellRect.width}px`;
    this.cellEditor.style.height = `${cellRect.height}px`;

    this.cellEditor.value =
      initialValue || this.cellData[cell.dataset.id] || '';
    this.cellEditor.style.display = 'block';
    this.cellEditor.focus();
    this.cellEditor.selectionStart = this.cellEditor.selectionEnd = this.cellEditor.value.length;
  }

  _commitEdit(moveSelection = true) {
    if (!this.editingCell) return;

    const newValue = this.cellEditor.value;
    this.cellData[this.editingCell.dataset.id] = newValue;
    this.editingCell.textContent = newValue;

    const previouslyEditingCell = this.editingCell;
    this._cancelEdit();

    if (moveSelection) {
      this._handleArrowKey('ArrowDown', previouslyEditingCell);
    }
  }

  _cancelEdit() {
    if (!this.editingCell) return;

    this.editingCell.classList.remove('editing');
    this.isEditing = false;
    this.editingCell = null;
    this.cellEditor.style.display = 'none';
    this.cellEditor.value = '';

    this.cellGridContainer.focus();
  }

  // --- NEW: Method to clear cell contents ---
  /**
   * Clears the content of all currently selected cells.
   */
  _clearSelectedCells() {
    const selected = this.container.querySelectorAll('.range-selected');
    selected.forEach((cell) => {
      cell.textContent = '';
      // Also remove the data from our data model
      if (this.cellData[cell.dataset.id]) {
        delete this.cellData[cell.dataset.id];
      }
    });
  }

  _handleArrowKey(key, currentCell) {
    const coords = this._getCellCoords(currentCell);
    let { row, col } = coords;

    switch (key) {
      case 'ArrowUp':
        row = Math.max(1, row - 1);
        break;
      case 'ArrowDown':
        row = Math.min(this.ROWS, row + 1);
        break;
      case 'ArrowLeft':
        col = Math.max(0, col - 1);
        break;
      case 'ArrowRight':
        col = Math.min(this.COLS - 1, col + 1);
        break;
    }

    const newCell = this.cellGridContainer.querySelector(
      `[data-col='${col}'][data-row='${row}']`
    );
    if (newCell) {
      this.startCell = newCell;
      this.endCell = newCell;
      this._handleSelection();
      this._scrollCellIntoView(newCell);
    }
  }

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

  _clearSelections() {
    const selectedCell = this.container.querySelector('.selected');
    if (selectedCell) selectedCell.classList.remove('selected');
    this.container
      .querySelectorAll('.range-selected')
      .forEach((cell) => cell.classList.remove('range-selected'));
    this.container
      .querySelectorAll('.header-highlight')
      .forEach((header) => header.classList.remove('header-highlight'));
  }

  _getCellCoords(cell) {
    if (!cell) return { row: -1, col: -1 };
    return {
      row: parseInt(cell.dataset.row, 10),
      col: parseInt(cell.dataset.col, 10),
    };
  }

  _scrollCellIntoView(cell) {
    const grid = this.cellGridContainer;
    const cellRect = cell.getBoundingClientRect();
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
}
