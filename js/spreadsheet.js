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

    this.columnHeadersContainer = this.container.querySelector('#column-headers');
    this.rowHeadersContainer = this.container.querySelector('#row-headers');
    this.cellGridContainer = this.container.querySelector('#cell-grid');

    this.ROWS = 100;
    this.COLS = 26;

    // --- Advanced Selection State ---
    this.selections = []; // Holds all selection ranges, e.g., [{ start: {col, row}, end: {col, row} }]
    this.selectionAnchor = null; // The first cell clicked in a selection range
    this.activeCell = null; // The cell with the primary focus (blue border)
    this.isMouseDown = false;

    this._createGrid();
    this._syncScroll();
    this._initEventListeners();

    // Set initial selection
    const firstCell = this.cellGridContainer.querySelector("[data-id='A1']");
    this._setActiveCell(firstCell);
    this._handleCellSelection(firstCell, false, false);
  }

  // --- Grid creation and sync methods are unchanged ---

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

  // --- Event Handling and Selection Logic ---

  _initEventListeners() {
    this.cellGridContainer.tabIndex = 0;

    // Mouse listeners for cell selection
    this.cellGridContainer.addEventListener('mousedown', (e) => {
      if (this.isEditing) return;
      if (e.target.classList.contains('cell')) {
        this.isMouseDown = true;
        this._handleCellSelection(e.target, e.shiftKey, e.metaKey || e.ctrlKey);
      }
    });

    this.cellGridContainer.addEventListener('mouseover', (e) => {
      if (this.isMouseDown && e.target.classList.contains('cell')) {
        this._handleCellSelection(e.target, true, false);
      }
    });

    // Listeners for header selection
    this.columnHeadersContainer.addEventListener('mousedown', (e) => {
        if(e.target.classList.contains('header-cell')) {
            this.isMouseDown = true;
            this._handleHeaderSelection(e.target.dataset.col, 'col', e.shiftKey, e.metaKey || e.ctrlKey);
        }
    });
    this.rowHeadersContainer.addEventListener('mousedown', (e) => {
        if(e.target.classList.contains('header-cell')) {
            this.isMouseDown = true;
            this._handleHeaderSelection(e.target.dataset.row, 'row', e.shiftKey, e.metaKey || e.ctrlKey);
        }
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    // Keyboard listener for navigation and editing
    this.cellGridContainer.addEventListener('keydown', (e) => {
      if (this.isEditing) return;

      const key = e.key;
      const isShift = e.shiftKey;
      const isCmd = e.metaKey || e.ctrlKey;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        e.preventDefault();
        if (isCmd) {
          this._handleCmdArrowKey(key);
        } else {
          this._handleArrowKey(key, isShift);
        }
      } else if (key === 'Enter') {
        e.preventDefault();
        this._startEditing(this.activeCell);
      } else if (key === 'Backspace') {
        e.preventDefault();
        this._clearSelectedCells();
      } else if (key.length === 1 && !isCmd && !e.altKey) {
        e.preventDefault();
        this._startEditing(this.activeCell, key);
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

  _handleCellSelection(cell, isShift, isCmd) {
    const coords = this._getCellCoords(cell);

    if (isShift) {
        if (this.selections.length === 0) {
            this.selectionAnchor = this.selectionAnchor || coords;
            this.selections.push({ start: this.selectionAnchor, end: coords });
        } else {
            const lastSelection = this.selections[this.selections.length - 1];
            lastSelection.end = coords;
        }
    } else if (isCmd) {
        this._setActiveCell(cell);
        this.selectionAnchor = coords;
        this.selections.push({ start: coords, end: coords });
    } else {
        this._setActiveCell(cell);
        this.selectionAnchor = coords;
        this.selections = [{ start: coords, end: coords }];
    }
    this._renderSelections();
  }

  _handleHeaderSelection(index, type, isShift, isCmd) {
    let start, end;
    if (type === 'col') {
        start = { col: parseInt(index, 10), row: 1 };
        end = { col: parseInt(index, 10), row: this.ROWS };
    } else { // row
        start = { col: 0, row: parseInt(index, 10) };
        end = { col: this.COLS - 1, row: parseInt(index, 10) };
    }

    if (!isShift) {
        const activeCellElement = this._getCellElement(start);
        this._setActiveCell(activeCellElement);
    }
    
    if (isShift) {
        if (this.selections.length === 0) {
            this.selectionAnchor = start;
            this.selections.push({ start, end });
        } else {
            const lastSelection = this.selections[this.selections.length - 1];
            lastSelection.end = end;
        }
    } else if (isCmd) {
        this.selectionAnchor = start;
        this.selections.push({ start, end });
    } else {
        this.selectionAnchor = start;
        this.selections = [{ start, end }];
    }
    this._renderSelections();
  }

  _renderSelections() {
    this._clearSelections();
    const cellSelectionCounts = {};

    // First, calculate overlaps and highlight headers
    this.selections.forEach(selection => {
        const { start, end } = selection;
        const minCol = Math.min(start.col, end.col);
        const maxCol = Math.max(start.col, end.col);
        const minRow = Math.min(start.row, end.row);
        const maxRow = Math.max(start.row, end.row);

        for (let col = minCol; col <= maxCol; col++) {
            const colHeader = this.columnHeadersContainer.querySelector(`[data-col='${col}']`);
            if (colHeader) colHeader.classList.add('header-highlight');
            for (let row = minRow; row <= maxRow; row++) {
                const rowHeader = this.rowHeadersContainer.querySelector(`[data-row='${row}']`);
                if (rowHeader) rowHeader.classList.add('header-highlight');
                const cellId = `${String.fromCharCode(65 + col)}${row}`;
                cellSelectionCounts[cellId] = (cellSelectionCounts[cellId] || 0) + 1;
            }
        }
    });
    
    // Apply background colors based on overlap count
    for (const cellId in cellSelectionCounts) {
        const cell = this.cellGridContainer.querySelector(`[data-id='${cellId}']`);
        if (cell) {
            const count = Math.min(cellSelectionCounts[cellId], 8); // Cap at 8 for styling
            cell.classList.add(`range-selected-${count}`);
        }
    }

    // Apply perimeter borders for each selection
    this.selections.forEach(selection => {
        const { start, end } = selection;
        const minCol = Math.min(start.col, end.col);
        const maxCol = Math.max(start.col, end.col);
        const minRow = Math.min(start.row, end.row);
        const maxRow = Math.max(start.row, end.row);

        for (let col = minCol; col <= maxCol; col++) {
            for (let row = minRow; row <= maxRow; row++) {
                const cell = this._getCellElement({col, row});
                if (cell) {
                    if (row === minRow) cell.classList.add('range-border-top');
                    if (row === maxRow) cell.classList.add('range-border-bottom');
                    if (col === minCol) cell.classList.add('range-border-left');
                    if (col === maxCol) cell.classList.add('range-border-right');
                }
            }
        }
    });

    // The active cell gets the primary selection border
    if (this.activeCell) {
        this.activeCell.classList.add('selected');
    }
  }

  _clearSelections() {
    this.container.querySelectorAll('.header-highlight').forEach(h => h.classList.remove('header-highlight'));
    const selectionClasses = [
        'selected',
        'range-border-top', 'range-border-right', 'range-border-bottom', 'range-border-left',
        'range-selected-1', 'range-selected-2', 'range-selected-3', 'range-selected-4',
        'range-selected-5', 'range-selected-6', 'range-selected-7', 'range-selected-8'
    ];
    this.container.querySelectorAll('.cell').forEach(c => c.classList.remove(...selectionClasses));
  }


  _handleArrowKey(key, isShift) {
    if (!this.activeCell) return;
    let { row, col } = this._getCellCoords(this.activeCell);

    switch (key) {
      case 'ArrowUp': row = Math.max(1, row - 1); break;
      case 'ArrowDown': row = Math.min(this.ROWS, row + 1); break;
      case 'ArrowLeft': col = Math.max(0, col - 1); break;
      case 'ArrowRight': col = Math.min(this.COLS - 1, col + 1); break;
    }

    const newCell = this._getCellElement({row, col});
    if (newCell) {
        if (!isShift) {
            this._setActiveCell(newCell);
        }
        this._handleCellSelection(newCell, isShift, false);
        this._scrollCellIntoView(newCell);
    }
  }

  _handleCmdArrowKey(key) {
    if (!this.activeCell) return;
    let { row, col } = this._getCellCoords(this.activeCell);
    
    const findTarget = (dr, dc) => {
      const isCurrentCellEmpty = !this.cellData[`${String.fromCharCode(65 + col)}${row}`];
      const nextCell_r = row + dr;
      const nextCell_c = col + dc;
      const nextCellId = `${String.fromCharCode(65 + nextCell_c)}${nextCell_r}`;

      if (!isCurrentCellEmpty && this.cellData[nextCellId]) {
        let lastNonEmpty = { row, col };
        let r = row;
        let c = col;
        while (r >= 1 && r <= this.ROWS && c >= 0 && c < this.COLS) {
          if (!this.cellData[`${String.fromCharCode(65 + c)}${r}`]) {
            return lastNonEmpty;
          }
          lastNonEmpty = { row: r, col: c };
          r += dr;
          c += dc;
        }
        return lastNonEmpty;
      } else {
        let r = row + dr;
        let c = col + dc;
        while (r >= 1 && r <= this.ROWS && c >= 0 && c < this.COLS) {
          if (this.cellData[`${String.fromCharCode(65 + c)}${r}`]) {
            return { row: r, col: c };
          }
          r += dr;
          c += dc;
        }
        if (dr === -1) return { row: 1, col: col };
        if (dr === 1) return { row: this.ROWS, col: col };
        if (dc === -1) return { row: row, col: 0 };
        if (dc === 1) return { row: row, col: this.COLS - 1 };
      }
    };
    
    const targetCoords = findTarget(...{ ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[key]);
    
    const newCell = this._getCellElement(targetCoords);
    if (newCell) {
        this._handleCellSelection(newCell, false, false);
        this._scrollCellIntoView(newCell);
    }
  }

  _setActiveCell(cell) {
      if (cell) {
          this.activeCell = cell;
      }
  }

  // --- Editing and Utility methods ---

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

    this.cellEditor.value = initialValue || this.cellData[cell.dataset.id] || '';
    this.cellEditor.style.display = 'block';
    this.cellEditor.focus();
    this.cellEditor.selectionStart = this.cellEditor.selectionEnd = this.cellEditor.value.length;
  }

  _commitEdit(moveSelection = true) {
    if (!this.editingCell) return;

    const newValue = this.cellEditor.value;
    const cellId = this.editingCell.dataset.id;
    
    if (newValue) {
        this.cellData[cellId] = newValue;
    } else {
        delete this.cellData[cellId];
    }
    this.editingCell.textContent = newValue;

    const previouslyEditingCell = this.editingCell;
    this._cancelEdit();

    if (moveSelection) {
      this._handleArrowKey('ArrowDown', false);
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

  _clearSelectedCells() {
    this.selections.forEach(selection => {
        const { start, end } = selection;
        const minCol = Math.min(start.col, end.col);
        const maxCol = Math.max(start.col, end.col);
        const minRow = Math.min(start.row, end.row);
        const maxRow = Math.max(start.row, end.row);

        for (let col = minCol; col <= maxCol; col++) {
            for (let row = minRow; row <= maxRow; row++) {
                const cell = this._getCellElement({col, row});
                if (cell) {
                    cell.textContent = '';
                    if (this.cellData[cell.dataset.id]) {
                        delete this.cellData[cell.dataset.id];
                    }
                }
            }
        }
    });
  }

  // --- Helper Methods ---

  _getCellCoords(cell) {
    if (!cell) return { row: -1, col: -1 };
    return {
      row: parseInt(cell.dataset.row, 10),
      col: parseInt(cell.dataset.col, 10),
    };
  }
  
  _getCellElement(coords) {
      if (!coords) return null;
      return this.cellGridContainer.querySelector(`[data-col='${coords.col}'][data-row='${coords.row}']`);
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