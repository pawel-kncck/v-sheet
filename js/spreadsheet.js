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
    this.DEFAULT_COL_WIDTH = 94;
    this.DEFAULT_ROW_HEIGHT = 20;
    this.MIN_COL_WIDTH = 5;
    this.MIN_ROW_HEIGHT = 5;

    // --- Advanced Selection State ---
    this.selections = []; // Holds all selection ranges
    this.selectionAnchor = null; // The first cell clicked in a selection range
    this.activeCell = null; // The cell with the primary focus (blue border)
    this.isMouseDown = false;

    // --- Resizing State ---
    this.columnWidths = [];
    this.rowHeights = [];
    this.isResizing = false;
    this.resizeInfo = {}; // Stores info about the current resize operation

    // --- NEW: Drag-to-move State ---
    this.isDraggingCells = false;
    this.dragInfo = {};
    this.ghostElement = null;

    // --- NEW: Editing Intent State ---
    this.isEditingIntentionally = false;

    this._createGrid();
    this._syncScroll();
    this._initEventListeners();

    // Set initial selection
    const firstCell = this.cellGridContainer.querySelector("[data-id='A1']");
    this._setActiveCell(firstCell);
    this._handleCellSelection(firstCell, false, false);
  }

  // --- Grid creation and sync methods ---

  _createGrid() {
    this._initColumnWidths();
    this._initRowHeights();
    this._createColumnHeaders();
    this._createRowHeaders();
    this._createCells();
    this._applyGridStyles(); // Apply dynamic styles
  }

  _initColumnWidths() {
    for (let i = 0; i < this.COLS; i++) {
      this.columnWidths[i] = this.DEFAULT_COL_WIDTH;
    }
  }

  _initRowHeights() {
    // Note: rowHeights is 0-indexed (for rows 1-100)
    for (let i = 0; i < this.ROWS; i++) {
      this.rowHeights[i] = this.DEFAULT_ROW_HEIGHT;
    }
  }

  _applyGridStyles() {
    const colTemplate = this.columnWidths.map((w) => `${w}px`).join(' ');
    const rowTemplate = this.rowHeights.map((h) => `${h}px`).join(' ');

    this.columnHeadersContainer.style.gridTemplateColumns = colTemplate;
    this.cellGridContainer.style.gridTemplateColumns = colTemplate;

    this.rowHeadersContainer.style.gridTemplateRows = rowTemplate;
    this.cellGridContainer.style.gridTemplateRows = rowTemplate;
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

      // --- NEW: Check if starting a drag ---
      if (this.cellGridContainer.style.cursor === 'grab') {
        this._initDrag(e);
        return; // Don't start a selection
      }
      // --- END NEW ---

      if (e.target.classList.contains('cell')) {
        this.isMouseDown = true;
        this._handleCellSelection(e.target, e.shiftKey, e.metaKey || e.ctrlKey);
      }
    });

    // --- NEW: Mouse move on grid for drag cursor ---
    this.cellGridContainer.addEventListener(
      'mousemove',
      this._handleGridMouseMove.bind(this)
    );
    // --- END NEW ---

    this.cellGridContainer.addEventListener('mouseover', (e) => {
      if (this.isMouseDown && e.target.classList.contains('cell')) {
        this._handleCellSelection(e.target, true, false);
      }
    });

    // Listeners for header mouse move (to change cursor)
    this.columnHeadersContainer.addEventListener(
      'mousemove',
      this._handleHeaderMouseMove.bind(this)
    );
    this.rowHeadersContainer.addEventListener(
      'mousemove',
      this._handleHeaderMouseMove.bind(this)
    );

    // Listeners for header mouse down (to start selection or resize)
    this.columnHeadersContainer.addEventListener('mousedown', (e) => {
      if (e.currentTarget.style.cursor === 'col-resize') {
        this._initResize(e, 'col');
      } else if (e.target.classList.contains('header-cell')) {
        this.isMouseDown = true;
        this._handleHeaderSelection(
          e.target.dataset.col,
          'col',
          e.shiftKey,
          e.metaKey || e.ctrlKey
        );
      }
    });
    this.rowHeadersContainer.addEventListener('mousedown', (e) => {
      if (e.currentTarget.style.cursor === 'row-resize') {
        this._initResize(e, 'row');
      } else if (e.target.classList.contains('header-cell')) {
        this.isMouseDown = true;
        this._handleHeaderSelection(
          e.target.dataset.row,
          'row',
          e.shiftKey,
          e.metaKey || e.ctrlKey
        );
      }
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;

      if (this.isResizing) {
        this._stopResize();
      }
      // --- NEW: Stop dragging ---
      if (this.isDraggingCells) {
        this._stopDrag();
      }
      // --- END NEW ---
    });

    // Keyboard listener
    this.cellGridContainer.addEventListener('keydown', (e) => {
      if (this.isEditing) return;
      const key = e.key;
      const isShift = e.shiftKey;
      const isCmd = e.metaKey || e.ctrlKey;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        e.preventDefault();
        if (isCmd && isShift) {
          this._handleCmdShiftArrowKey(key);
        } else if (isCmd) {
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
      const key = e.key;

      if (key === 'Enter') {
        e.preventDefault();
        this._commitEdit(true); // Commit and move down
      } else if (key === 'Escape') {
        e.preventDefault();
        this._cancelEdit();
      } else if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)
      ) {
        if (!this.isEditingIntentionally) {
          e.preventDefault();
          this._commitEdit(false);
          this._handleArrowKey(key, false);
          this.cellGridContainer.focus();
        }
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
    } else {
      // row
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
    this.selections.forEach((selection) => {
      const { start, end } = selection;
      const minCol = Math.min(start.col, end.col);
      const maxCol = Math.max(start.col, end.col);
      const minRow = Math.min(start.row, end.row);
      const maxRow = Math.max(start.row, end.row);

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
          const cellId = `${String.fromCharCode(65 + col)}${row}`;
          cellSelectionCounts[cellId] = (cellSelectionCounts[cellId] || 0) + 1;
        }
      }
    });

    // Apply background colors based on overlap count
    for (const cellId in cellSelectionCounts) {
      const cell = this.cellGridContainer.querySelector(
        `[data-id='${cellId}']`
      );
      if (cell) {
        const count = Math.min(cellSelectionCounts[cellId], 8); // Cap at 8 for styling
        cell.classList.add(`range-selected-${count}`);
      }
    }

    // Apply perimeter borders for each selection
    this.selections.forEach((selection) => {
      const { start, end } = selection;
      const minCol = Math.min(start.col, end.col);
      const maxCol = Math.max(start.col, end.col);
      const minRow = Math.min(start.row, end.row);
      const maxRow = Math.max(start.row, end.row);

      for (let col = minCol; col <= maxCol; col++) {
        for (let row = minRow; row <= maxRow; row++) {
          const cell = this._getCellElement({ col, row });
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
    this.container
      .querySelectorAll('.header-highlight')
      .forEach((h) => h.classList.remove('header-highlight'));
    const selectionClasses = [
      'selected',
      'range-border-top',
      'range-border-right',
      'range-border-bottom',
      'range-border-left',
      'range-selected-1',
      'range-selected-2',
      'range-selected-3',
      'range-selected-4',
      'range-selected-5',
      'range-selected-6',
      'range-selected-7',
      'range-selected-8',
    ];
    this.container
      .querySelectorAll('.cell')
      .forEach((c) => c.classList.remove(...selectionClasses));
  }

  _handleArrowKey(key, isShift) {
    if (!this.activeCell) return;

    let { row, col } = this._getCellCoords(this.activeCell);
    if (isShift && this.selections.length > 0) {
      const lastSelection = this.selections[this.selections.length - 1];
      row = lastSelection.end.row;
      col = lastSelection.end.col;
    }

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

    const newCell = this._getCellElement({ row, col });
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
      const isCurrentCellEmpty = !this.cellData[
        `${String.fromCharCode(65 + col)}${row}`
      ];
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

    const targetCoords = findTarget(
      ...{
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      }[key]
    );

    const newCell = this._getCellElement(targetCoords);
    if (newCell) {
      this._handleCellSelection(newCell, false, false);
      this._scrollCellIntoView(newCell);
    }
  }

  _handleCmdShiftArrowKey(key) {
    if (!this.activeCell) return;

    let { row, col } = this._getCellCoords(this.activeCell);
    if (this.selections.length > 0) {
      const lastSelection = this.selections[this.selections.length - 1];
      row = lastSelection.end.row;
      col = lastSelection.end.col;
    }

    const findTarget = (dr, dc) => {
      const isCurrentCellEmpty = !this.cellData[
        `${String.fromCharCode(65 + col)}${row}`
      ];
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
        return lastNonEmpty; // Reached edge of sheet
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

    const targetCoords = findTarget(
      ...{
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      }[key]
    );

    const newCell = this._getCellElement(targetCoords);
    if (newCell) {
      this._handleCellSelection(newCell, true, false); // true = isShift
      this._scrollCellIntoView(newCell);
    }
  }

  _setActiveCell(cell) {
    if (cell) {
      this.activeCell = cell;
    }
  }

  // --- Resizing Methods ---

  _handleHeaderMouseMove(e) {
    if (this.isResizing) return; // Don't change cursor while resizing

    const target = e.target.closest('.header-cell');
    if (!target) {
      e.currentTarget.style.cursor = 'default';
      return;
    }

    const rect = target.getBoundingClientRect();
    const isCol = target.dataset.col !== undefined;

    if (isCol) {
      const nearRightEdge = e.clientX > rect.right - 5;
      e.currentTarget.style.cursor = nearRightEdge ? 'col-resize' : 'default';
    } else {
      const nearBottomEdge = e.clientY > rect.bottom - 5;
      e.currentTarget.style.cursor = nearBottomEdge ? 'row-resize' : 'default';
    }
  }

  _initResize(e, type) {
    e.preventDefault();
    this.isResizing = true;

    const target = e.target.closest('.header-cell');
    const clickedIndex = parseInt(
      type === 'col' ? target.dataset.col : target.dataset.row,
      10
    );

    const indicesToResize = this._getSelectedHeaderIndices(type, clickedIndex);
    const originalSizes = {};
    indicesToResize.forEach((index) => {
      if (type === 'col') {
        originalSizes[index] = this.columnWidths[index];
      } else {
        originalSizes[index] = this.rowHeights[index - 1]; // Row array is 0-indexed
      }
    });

    this.resizeInfo = {
      type: type,
      startPos: type === 'col' ? e.clientX : e.clientY,
      indices: indicesToResize,
      originalSizes: originalSizes,
      clickedIndex: clickedIndex,
    };

    // Bind window listeners
    this._onResize = this._onResize.bind(this);
    this._stopResize = this._stopResize.bind(this);
    window.addEventListener('mousemove', this._onResize);
    window.addEventListener('mouseup', this._stopResize, { once: true });
  }

  _getSelectedHeaderIndices(type, clickedIndex) {
    const indices = new Set([clickedIndex]);
    const checkCol = type === 'col';

    // Helper functions to check if a selection is a full row/col
    const isFullCol = (sel) => {
      const minRow = Math.min(sel.start.row, sel.end.row);
      const maxRow = Math.max(sel.start.row, sel.end.row);
      return minRow === 1 && maxRow === this.ROWS;
    };
    const isFullRow = (sel) => {
      const minCol = Math.min(sel.start.col, sel.end.col);
      const maxCol = Math.max(sel.start.col, sel.end.col);
      return minCol === 0 && maxCol === this.COLS - 1;
    };

    let inSelection = false;

    for (const sel of this.selections) {
      if (checkCol && isFullCol(sel)) {
        const min = Math.min(sel.start.col, sel.end.col);
        const max = Math.max(sel.start.col, sel.end.col);
        if (clickedIndex >= min && clickedIndex <= max) {
          inSelection = true;
          break;
        }
      } else if (!checkCol && isFullRow(sel)) {
        const min = Math.min(sel.start.row, sel.end.row);
        const max = Math.max(sel.start.row, sel.end.row);
        if (clickedIndex >= min && clickedIndex <= max) {
          inSelection = true;
          break;
        }
      }
    }

    if (inSelection) {
      this.selections.forEach((sel) => {
        if (checkCol && isFullCol(sel)) {
          const min = Math.min(sel.start.col, sel.end.col);
          const max = Math.max(sel.start.col, sel.end.col);
          for (let i = min; i <= max; i++) {
            indices.add(i);
          }
        } else if (!checkCol && isFullRow(sel)) {
          const min = Math.min(sel.start.row, sel.end.row);
          const max = Math.max(sel.start.row, sel.end.row);
          for (let i = min; i <= max; i++) {
            indices.add(i);
          }
        }
      });
    }

    return Array.from(indices);
  }

  _onResize(e) {
    if (!this.isResizing) return;

    const {
      type,
      startPos,
      indices,
      originalSizes,
      clickedIndex,
    } = this.resizeInfo;
    const currentPos = type === 'col' ? e.clientX : e.clientY;
    const delta = currentPos - startPos;

    const clickedOriginalSize = originalSizes[clickedIndex];

    let newSize;
    if (type === 'col') {
      newSize = Math.max(this.MIN_COL_WIDTH, clickedOriginalSize + delta);
    } else {
      newSize = Math.max(this.MIN_ROW_HEIGHT, clickedOriginalSize + delta);
    }

    indices.forEach((index) => {
      if (type === 'col') {
        this.columnWidths[index] = newSize;
      } else {
        this.rowHeights[index - 1] = newSize; // Row array is 0-indexed
      }
    });

    this._applyGridStyles();
  }

  _stopResize() {
    this.isResizing = false;
    this.resizeInfo = {};
    window.removeEventListener('mousemove', this._onResize);
  }

  // --- NEW: Drag-to-Move Methods ---

  _handleGridMouseMove(e) {
    // Don't change cursor if resizing, selecting, or already dragging
    if (this.isResizing || this.isMouseDown || this.isDraggingCells) return;

    const cell = e.target.closest('.cell');

    // Check if we are over a selected cell border
    // Note: 'range-selected-1' is a good proxy for "is a cell selected"
    if (
      cell &&
      cell.classList.contains('range-selected-1') &&
      this.selections.length > 0
    ) {
      const rect = cell.getBoundingClientRect();
      const onTop =
        cell.classList.contains('range-border-top') && e.clientY < rect.top + 5;
      const onBottom =
        cell.classList.contains('range-border-bottom') &&
        e.clientY > rect.bottom - 5;
      const onLeft =
        cell.classList.contains('range-border-left') &&
        e.clientX < rect.left + 5;
      const onRight =
        cell.classList.contains('range-border-right') &&
        e.clientX > rect.right - 5;

      if (onTop || onBottom || onLeft || onRight) {
        this.cellGridContainer.style.cursor = 'grab';
      } else {
        this.cellGridContainer.style.cursor = 'default';
      }
    } else {
      this.cellGridContainer.style.cursor = 'default';
    }
  }

  _initDrag(e) {
    e.preventDefault();
    this.isDraggingCells = true;
    this.cellGridContainer.style.cursor = 'grabbing';

    // We drag the last selection in the array
    const selection = this.selections[this.selections.length - 1];

    // Find the dimensions of the selection
    const minCol = Math.min(selection.start.col, selection.end.col);
    const maxCol = Math.max(selection.start.col, selection.end.col);
    const minRow = Math.min(selection.start.row, selection.end.row);
    const maxRow = Math.max(selection.start.row, selection.end.row);

    // Calculate total width and height
    let width = 0;
    for (let c = minCol; c <= maxCol; c++) width += this.columnWidths[c];
    let height = 0;
    for (let r = minRow; r <= maxRow; r++) height += this.rowHeights[r - 1];

    // Create ghost element
    this.ghostElement = document.createElement('div');
    this.ghostElement.id = 'drag-ghost';
    this.ghostElement.style.width = `${width}px`;
    this.ghostElement.style.height = `${height}px`;

    // Position the ghost element
    const startCellEl = this._getCellElement({ col: minCol, row: minRow });
    const gridRect = this.cellGridContainer.getBoundingClientRect();

    // Calculate initial position relative to the container
    const initialLeft =
      startCellEl.offsetLeft - this.cellGridContainer.scrollLeft;
    const initialTop = startCellEl.offsetTop - this.cellGridContainer.scrollTop;

    this.ghostElement.style.left = `${initialLeft}px`;
    this.ghostElement.style.top = `${initialTop}px`;

    this.container.appendChild(this.ghostElement);

    // The drag start position is the top-left of the selection
    const dragStartCoords = { col: minCol, row: minRow };

    this.dragInfo = {
      selection: selection,
      dragStartCoords: dragStartCoords,
      // Store the offset from the mouse cursor to the ghost's top-left
      mouseOffset: {
        x: e.clientX - gridRect.left - initialLeft,
        y: e.clientY - gridRect.top - initialTop,
      },
      lastSnapCoords: null, // --- NEW: For snap-to-grid ---
    };

    // Bind window listeners
    this._onDrag = this._onDrag.bind(this);
    this._stopDrag = this._stopDrag.bind(this);
    window.addEventListener('mousemove', this._onDrag);
    window.addEventListener('mouseup', this._stopDrag, { once: true });
  }

  _onDrag(e) {
    if (!this.isDraggingCells) return;

    // Find the cell element under the mouse
    const dropTarget = document
      .elementFromPoint(e.clientX, e.clientY)
      .closest('.cell');

    if (!dropTarget) return; // Mouse is not over a cell

    const dropCoords = this._getCellCoords(dropTarget);

    // Check if we already snapped to this cell to prevent flickering
    if (
      this.dragInfo.lastSnapCoords &&
      this.dragInfo.lastSnapCoords.row === dropCoords.row &&
      this.dragInfo.lastSnapCoords.col === dropCoords.col
    ) {
      return; // No change
    }
    this.dragInfo.lastSnapCoords = dropCoords;

    // Snap the ghost's top-left corner to the drop target's top-left corner
    const newLeft = dropTarget.offsetLeft - this.cellGridContainer.scrollLeft;
    const newTop = dropTarget.offsetTop - this.cellGridContainer.scrollTop;

    this.ghostElement.style.left = `${newLeft}px`;
    this.ghostElement.style.top = `${newTop}px`;
  }

  _stopDrag() {
    if (!this.isDraggingCells) return;

    // Find drop target
    const ghostRect = this.ghostElement.getBoundingClientRect();
    const dropTarget = document
      .elementFromPoint(
        ghostRect.left + 2, // 2px offset to be inside the cell
        ghostRect.top + 2
      )
      .closest('.cell');

    if (dropTarget) {
      const dropCoords = this._getCellCoords(dropTarget);
      const { dragStartCoords, selection } = this.dragInfo;

      const rowOffset = dropCoords.row - dragStartCoords.row;
      const colOffset = dropCoords.col - dragStartCoords.col;

      if (rowOffset !== 0 || colOffset !== 0) {
        this._moveSelection(selection, colOffset, rowOffset);
      }
    }

    // Cleanup
    this.ghostElement.remove();
    this.ghostElement = null;
    this.isDraggingCells = false;
    this.dragInfo = {};
    this.cellGridContainer.style.cursor = 'default';
    window.removeEventListener('mousemove', this._onDrag);
  }

  _moveSelection(selection, colOffset, rowOffset) {
    const { start, end } = selection;
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);

    const dataToMove = [];

    // 1. Collect all data to be moved
    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        const cell = this._getCellElement({ col, row });
        const data = this.cellData[cell.dataset.id];
        if (data) {
          dataToMove.push({ col, row, data });
        }
      }
    }

    // 2. Clear all original cells (to handle overlaps correctly)
    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        this._updateCell(this._getCellElement({ col, row }), '');
      }
    }

    // 3. Write data to new location
    dataToMove.forEach((item) => {
      const targetCol = item.col + colOffset;
      const targetRow = item.row + rowOffset;

      // Ensure target is within bounds
      if (
        targetCol >= 0 &&
        targetCol < this.COLS &&
        targetRow > 0 &&
        targetRow <= this.ROWS
      ) {
        const targetCell = this._getCellElement({
          col: targetCol,
          row: targetRow,
        });
        this._updateCell(targetCell, item.data);
      }
    });

    // 4. Update the selection to the new location
    const newStart = { col: start.col + colOffset, row: start.row + rowOffset };
    const newEnd = { col: end.col + colOffset, row: end.row + rowOffset };
    this.selections = [{ start: newStart, end: newEnd }];

    // The new selection anchor becomes the top-left of the *original* selection's
    // new position, which matches the dragStartCoords offset.
    const newAnchorCoords = {
      col: this.dragInfo.dragStartCoords.col + colOffset,
      row: this.dragInfo.dragStartCoords.row + rowOffset,
    };
    this.selectionAnchor = newAnchorCoords;
    this._setActiveCell(this._getCellElement(newAnchorCoords));

    this._renderSelections();
  }

  // --- Editing and Utility methods ---

  _startEditing(cell, initialValue = '') {
    this.isEditingIntentionally = initialValue === '';

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
    const cellId = this.editingCell.dataset.id;

    this._updateCell(this.editingCell, newValue); // Use helper

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
    this.selections.forEach((selection) => {
      const { start, end } = selection;
      const minCol = Math.min(start.col, end.col);
      const maxCol = Math.max(start.col, end.col);
      const minRow = Math.min(start.row, end.row);
      const maxRow = Math.max(start.row, end.row);

      for (let col = minCol; col <= maxCol; col++) {
        for (let row = minRow; row <= maxRow; row++) {
          const cell = this._getCellElement({ col, row });
          this._updateCell(cell, ''); // Use helper
        }
      }
    });
  }

  // --- Helper Methods ---

  _updateCell(cell, value) {
    if (!cell) return;

    if (value) {
      this.cellData[cell.dataset.id] = value;
      cell.textContent = value;
    } else {
      delete this.cellData[cell.dataset.id];
      cell.textContent = '';
    }
  }

  _getCellCoords(cell) {
    if (!cell) return { row: -1, col: -1 };
    return {
      row: parseInt(cell.dataset.row, 10),
      col: parseInt(cell.dataset.col, 10),
    };
  }

  _getCellElement(coords) {
    if (!coords) return null;
    return this.cellGridContainer.querySelector(
      `[data-col='${coords.col}'][data-row='${coords.row}']`
    );
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
