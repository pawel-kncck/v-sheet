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
    this.selections = [];
    this.selectionAnchor = null;
    this.activeCell = null;
    this.isMouseDown = false;

    // --- Resizing State ---
    this.columnWidths = [];
    this.rowHeights = [];
    this.isResizing = false;
    this.resizeInfo = {};

    // --- Drag-to-move State ---
    this.isDraggingCells = false;
    this.dragInfo = {};
    this.ghostElement = null;

    // --- Editing Intent State ---
    this.isEditingIntentionally = false;

    // --- Integration with FileManager and FormulaBar ---
    this.fileManager = null;
    this.formulaBar = null;

    this._createGrid();
    this._syncScroll();
    this._initEventListeners();

    // Set initial selection
    const firstCell = this.cellGridContainer.querySelector("[data-id='A1']");
    this._setActiveCell(firstCell);
    this._handleCellSelection(firstCell, false, false);
  }

  // --- New Integration Methods ---

  /**
   * Set the FileManager instance for integration
   */
  setFileManager(fileManager) {
    this.fileManager = fileManager;
  }

  /**
   * Set the FormulaBar instance for integration
   */
  setFormulaBar(formulaBar) {
    this.formulaBar = formulaBar;
    // Update formula bar with initial cell
    if (this.formulaBar) {
      this.formulaBar.updateCellReference('A1');
      this.formulaBar.updateFormulaInput('');
    }
  }

  /**
   * Load spreadsheet data from file
   */
  loadFromFile(fileData) {
    if (!fileData) return;

    // Clear existing data
    this.clear();

    // Load cells
    if (fileData.cells) {
      this.cellData = {};
      Object.entries(fileData.cells).forEach(([cellId, cellInfo]) => {
        this.cellData[cellId] = cellInfo.value;
        const cell = this.cellGridContainer.querySelector(
          `[data-id='${cellId}']`
        );
        if (cell) {
          cell.textContent = cellInfo.value;
        }
      });
    }

    // Load column widths
    if (fileData.columnWidths && fileData.columnWidths.length === this.COLS) {
      this.columnWidths = [...fileData.columnWidths];
      this._applyGridStyles();
    }

    // Load row heights
    if (fileData.rowHeights && fileData.rowHeights.length === this.ROWS) {
      this.rowHeights = [...fileData.rowHeights];
      this._applyGridStyles();
    }

    // Load metadata
    if (fileData.metadata) {
      // Restore last active cell
      if (fileData.metadata.lastActiveCell) {
        this.selectCell(fileData.metadata.lastActiveCell);
      }

      // Restore selections if needed
      if (
        fileData.metadata.selections &&
        fileData.metadata.selections.length > 0
      ) {
        // Optionally restore previous selections
      }
    }
  }

  /**
   * Clear all spreadsheet data
   */
  clear() {
    // Clear cell data
    this.cellData = {};

    // Clear visual cells
    this.cellGridContainer.querySelectorAll('.cell').forEach((cell) => {
      cell.textContent = '';
    });

    // Reset column widths and row heights
    this._initColumnWidths();
    this._initRowHeights();
    this._applyGridStyles();

    // Reset selection to A1
    const firstCell = this.cellGridContainer.querySelector("[data-id='A1']");
    if (firstCell) {
      this._setActiveCell(firstCell);
      this._handleCellSelection(firstCell, false, false);
    }
  }

  /**
   * Get cell value by ID
   */
  getCellValue(cellId) {
    return this.cellData[cellId] || '';
  }

  /**
   * Set cell value by ID
   */
  setCellValue(cellId, value) {
    const cell = this.cellGridContainer.querySelector(`[data-id='${cellId}']`);
    if (cell) {
      this._updateCell(cell, value);
    }
  }

  /**
   * Select a cell by ID
   */
  selectCell(cellId) {
    const cell = this.cellGridContainer.querySelector(`[data-id='${cellId}']`);
    if (cell) {
      this._setActiveCell(cell);
      this._handleCellSelection(cell, false, false);
      this._scrollCellIntoView(cell);
    }
  }

  // --- Modified Grid creation methods ---

  _createGrid() {
    this._initColumnWidths();
    this._initRowHeights();
    this._createColumnHeaders();
    this._createRowHeaders();
    this._createCells();
    this._applyGridStyles();
  }

  _initColumnWidths() {
    for (let i = 0; i < this.COLS; i++) {
      this.columnWidths[i] = this.DEFAULT_COL_WIDTH;
    }
  }

  _initRowHeights() {
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

  // --- Modified Event Handling with Integration ---

  _initEventListeners() {
    this.cellGridContainer.tabIndex = 0;

    // Mouse listeners for cell selection
    this.cellGridContainer.addEventListener('mousedown', (e) => {
      if (this.isEditing) return;

      if (this.cellGridContainer.style.cursor === 'grab') {
        this._initDrag(e);
        return;
      }

      if (e.target.classList.contains('cell')) {
        this.isMouseDown = true;
        this._handleCellSelection(e.target, e.shiftKey, e.metaKey || e.ctrlKey);
      }
    });

    this.cellGridContainer.addEventListener(
      'mousemove',
      this._handleGridMouseMove.bind(this)
    );

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
      if (this.isDraggingCells) {
        this._stopDrag();
      }
    });

    // Keyboard listener with formula bar integration
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
        // Check if formula bar is available and use it for editing
        if (this.formulaBar && !this.isEditing) {
          this.formulaBar.focusFormulaInput();
        } else {
          this._startEditing(this.activeCell);
        }
      } else if (key === 'F2') {
        e.preventDefault();
        // F2 key also starts editing
        if (this.formulaBar && !this.isEditing) {
          this.formulaBar.focusFormulaInput();
        } else {
          this._startEditing(this.activeCell);
        }
      } else if (key === 'Backspace') {
        e.preventDefault();
        this._clearSelectedCells();
      } else if (key === 'Delete') {
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
        this._commitEdit(true);
      } else if (key === 'Tab') {
        e.preventDefault();
        this._commitEdit(false);
        this._handleArrowKey('ArrowRight', false);
        this.cellGridContainer.focus();
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

    // Save on Ctrl+S
    document.addEventListener('keydown', async (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (this.fileManager) {
          await this.fileManager.forceSave();
        }
      }
    });

    // Save before unload
    window.addEventListener('beforeunload', async (e) => {
      if (this.fileManager && this.fileManager.hasChanges()) {
        e.preventDefault();
        e.returnValue =
          'You have unsaved changes. Are you sure you want to leave?';
      }
    });
  }

  // Modified selection handler with formula bar integration
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

      // Update formula bar
      if (this.formulaBar) {
        const cellId = cell.dataset.id;
        this.formulaBar.updateCellReference(cellId);
        this.formulaBar.updateFormulaInput(this.cellData[cellId] || '');
      }
    }
    this._renderSelections();

    // Update FileManager metadata
    if (this.fileManager) {
      this.fileManager.updateMetadata({
        lastActiveCell: cell.dataset.id,
        selections: this.selections,
      });
    }
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
        const count = Math.min(cellSelectionCounts[cellId], 8);
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
      this._handleCellSelection(newCell, true, false);
      this._scrollCellIntoView(newCell);
    }
  }

  _setActiveCell(cell) {
    if (cell) {
      this.activeCell = cell;
    }
  }

  // --- Resizing Methods with FileManager integration ---

  _handleHeaderMouseMove(e) {
    if (this.isResizing) return;

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
        originalSizes[index] = this.rowHeights[index - 1];
      }
    });

    this.resizeInfo = {
      type: type,
      startPos: type === 'col' ? e.clientX : e.clientY,
      indices: indicesToResize,
      originalSizes: originalSizes,
      clickedIndex: clickedIndex,
    };

    this._onResize = this._onResize.bind(this);
    this._stopResize = this._stopResize.bind(this);
    window.addEventListener('mousemove', this._onResize);
    window.addEventListener('mouseup', this._stopResize, { once: true });
  }

  _getSelectedHeaderIndices(type, clickedIndex) {
    const indices = new Set([clickedIndex]);
    const checkCol = type === 'col';

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
        this.rowHeights[index - 1] = newSize;
      }
    });

    this._applyGridStyles();
  }

  _stopResize() {
    this.isResizing = false;
    this.resizeInfo = {};
    window.removeEventListener('mousemove', this._onResize);

    // Save column/row sizes to FileManager
    if (this.fileManager) {
      this.fileManager.updateColumnWidths(this.columnWidths);
      this.fileManager.updateRowHeights(this.rowHeights);
    }
  }

  // --- Drag-to-Move Methods ---

  _handleGridMouseMove(e) {
    if (this.isResizing || this.isMouseDown || this.isDraggingCells) return;

    const cell = e.target.closest('.cell');

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

    const selection = this.selections[this.selections.length - 1];

    const minCol = Math.min(selection.start.col, selection.end.col);
    const maxCol = Math.max(selection.start.col, selection.end.col);
    const minRow = Math.min(selection.start.row, selection.end.row);
    const maxRow = Math.max(selection.start.row, selection.end.row);

    let width = 0;
    for (let c = minCol; c <= maxCol; c++) width += this.columnWidths[c];
    let height = 0;
    for (let r = minRow; r <= maxRow; r++) height += this.rowHeights[r - 1];

    this.ghostElement = document.createElement('div');
    this.ghostElement.id = 'drag-ghost';
    this.ghostElement.style.width = `${width}px`;
    this.ghostElement.style.height = `${height}px`;

    const startCellEl = this._getCellElement({ col: minCol, row: minRow });
    const gridRect = this.cellGridContainer.getBoundingClientRect();

    const initialLeft =
      startCellEl.offsetLeft - this.cellGridContainer.scrollLeft;
    const initialTop = startCellEl.offsetTop - this.cellGridContainer.scrollTop;

    this.ghostElement.style.left = `${initialLeft}px`;
    this.ghostElement.style.top = `${initialTop}px`;

    this.container.appendChild(this.ghostElement);

    const dragStartCoords = { col: minCol, row: minRow };

    this.dragInfo = {
      selection: selection,
      dragStartCoords: dragStartCoords,
      mouseOffset: {
        x: e.clientX - gridRect.left - initialLeft,
        y: e.clientY - gridRect.top - initialTop,
      },
      lastSnapCoords: null,
    };

    this._onDrag = this._onDrag.bind(this);
    this._stopDrag = this._stopDrag.bind(this);
    window.addEventListener('mousemove', this._onDrag);
    window.addEventListener('mouseup', this._stopDrag, { once: true });
  }

  _onDrag(e) {
    if (!this.isDraggingCells) return;

    const dropTarget = document
      .elementFromPoint(e.clientX, e.clientY)
      .closest('.cell');

    if (!dropTarget) return;

    const dropCoords = this._getCellCoords(dropTarget);

    if (
      this.dragInfo.lastSnapCoords &&
      this.dragInfo.lastSnapCoords.row === dropCoords.row &&
      this.dragInfo.lastSnapCoords.col === dropCoords.col
    ) {
      return;
    }
    this.dragInfo.lastSnapCoords = dropCoords;

    const newLeft = dropTarget.offsetLeft - this.cellGridContainer.scrollLeft;
    const newTop = dropTarget.offsetTop - this.cellGridContainer.scrollTop;

    this.ghostElement.style.left = `${newLeft}px`;
    this.ghostElement.style.top = `${newTop}px`;
  }

  _stopDrag() {
    if (!this.isDraggingCells) return;

    const ghostRect = this.ghostElement.getBoundingClientRect();
    const dropTarget = document
      .elementFromPoint(ghostRect.left + 2, ghostRect.top + 2)
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

    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        const cell = this._getCellElement({ col, row });
        const data = this.cellData[cell.dataset.id];
        if (data) {
          dataToMove.push({ col, row, data });
        }
      }
    }

    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        this._updateCell(this._getCellElement({ col, row }), '');
      }
    }

    dataToMove.forEach((item) => {
      const targetCol = item.col + colOffset;
      const targetRow = item.row + rowOffset;

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

    const newStart = { col: start.col + colOffset, row: start.row + rowOffset };
    const newEnd = { col: end.col + colOffset, row: end.row + rowOffset };
    this.selections = [{ start: newStart, end: newEnd }];

    const newAnchorCoords = {
      col: this.dragInfo.dragStartCoords.col + colOffset,
      row: this.dragInfo.dragStartCoords.row + rowOffset,
    };
    this.selectionAnchor = newAnchorCoords;
    this._setActiveCell(this._getCellElement(newAnchorCoords));

    this._renderSelections();
  }

  // --- Modified Editing methods with FileManager integration ---

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

    this._updateCell(this.editingCell, newValue);

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
          this._updateCell(cell, '');
        }
      }
    });
  }

  // --- Modified Helper Methods with FileManager integration ---

  _updateCell(cell, value) {
    if (!cell) return;

    const cellId = cell.dataset.id;

    if (value) {
      this.cellData[cellId] = value;
      cell.textContent = value;
    } else {
      delete this.cellData[cellId];
      cell.textContent = '';
    }

    // Update FileManager
    if (this.fileManager) {
      this.fileManager.updateCellData(cellId, value);
    }

    // Update Formula Bar if this is the active cell
    if (this.formulaBar && this.activeCell === cell) {
      this.formulaBar.updateFormulaInput(value);
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
