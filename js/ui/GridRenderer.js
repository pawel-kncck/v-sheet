import { Logger } from '../engine/utils/Logger.js';

export class GridRenderer {
  constructor(container, config = {}) {
    this.container = container;
    this.ROWS = config.rows || 100;
    this.COLS = config.cols || 26;
    this.DEFAULT_COL_WIDTH = config.defaultColWidth || 94;
    this.DEFAULT_ROW_HEIGHT = config.defaultRowHeight || 20;
    
    // State
    this.columnWidths = Array(this.COLS).fill(this.DEFAULT_COL_WIDTH);
    this.rowHeights = Array(this.ROWS).fill(this.DEFAULT_ROW_HEIGHT);
    
    // DOM references
    this.columnHeadersContainer = null;
    this.rowHeadersContainer = null;
    this.cellGridContainer = null;
    
    // Event callbacks
    this.callbacks = {
      onCellClick: null,
      onCellDoubleClick: null,
      onCellMouseDown: null,
      onCellMouseOver: null,
      onHeaderClick: null,
      onHeaderMouseMove: null,
      onHeaderMouseDown: null // Added based on existing code
    };
  }

  // ... [Existing createGrid, updateCellContent, getCellElement, etc. methods remain unchanged] ...

  /**
   * Creates the entire grid structure
   */
  createGrid() {
    this.columnHeadersContainer = this.container.querySelector('#column-headers');
    this.rowHeadersContainer = this.container.querySelector('#row-headers');
    this.cellGridContainer = this.container.querySelector('#cell-grid');
    
    if (!this.columnHeadersContainer || !this.rowHeadersContainer || !this.cellGridContainer) {
      Logger.error('GridRenderer', 'Required containers not found in DOM');
      throw new Error('Grid containers not found');
    }
    
    this._createColumnHeaders();
    this._createRowHeaders();
    this._createCells();
    this.applyGridStyles();
    this._setupScrollSync();
    this._attachEventListeners();
    
    Logger.log('GridRenderer', 'Grid created successfully');
  }

  updateCellContent(cellId, value) {
    const cell = this.getCellElement(cellId);
    if (cell) {
      cell.textContent = value === undefined || value === null ? '' : value;
    }
  }

  getCellElement(cellId) {
    return this.cellGridContainer.querySelector(`[data-id='${cellId}']`);
  }

  getCellElementByCoords(row, col) {
    return this.cellGridContainer.querySelector(
      `[data-col='${col}'][data-row='${row}']`
    );
  }

  applyGridStyles() {
    const colTemplate = this.columnWidths.map(w => `${w}px`).join(' ');
    const rowTemplate = this.rowHeights.map(h => `${h}px`).join(' ');
    
    this.columnHeadersContainer.style.gridTemplateColumns = colTemplate;
    this.cellGridContainer.style.gridTemplateColumns = colTemplate;
    
    this.rowHeadersContainer.style.gridTemplateRows = rowTemplate;
    this.cellGridContainer.style.gridTemplateRows = rowTemplate;
  }

  setColumnWidths(widths) {
    if (widths.length !== this.COLS) return;
    this.columnWidths = [...widths];
    this.applyGridStyles();
  }

  setRowHeights(heights) {
    if (heights.length !== this.ROWS) return;
    this.rowHeights = [...heights];
    this.applyGridStyles();
  }

  /**
   * --- NEW: Apply visual styles to a cell ---
   * Maps the internal style object to CSS properties.
   * @param {string} cellId 
   * @param {Object|null} style 
   */
  updateCellStyle(cellId, style) {
    const cell = this.getCellElement(cellId);
    if (!cell) return;

    // 1. Reset base styles to defaults
    cell.style.fontWeight = '';
    cell.style.fontStyle = '';
    cell.style.textDecoration = '';
    cell.style.color = '';
    cell.style.backgroundColor = '';
    cell.style.textAlign = '';
    cell.style.fontSize = '';
    cell.style.fontFamily = '';
    cell.style.whiteSpace = 'nowrap'; // Default
    // Reset Flex properties for vertical align
    cell.style.display = '';
    cell.style.alignItems = '';
    cell.style.justifyContent = '';

    if (!style) return;

    // 2. Apply Font Styles
    if (style.font) {
      if (style.font.bold) cell.style.fontWeight = 'bold';
      if (style.font.italic) cell.style.fontStyle = 'italic';
      if (style.font.underline) cell.style.textDecoration = 'underline'; // Todo: handle strikethrough combo
      if (style.font.strikethrough) {
          if (cell.style.textDecoration === 'underline') {
              cell.style.textDecoration = 'underline line-through';
          } else {
              cell.style.textDecoration = 'line-through';
          }
      }
      if (style.font.color) cell.style.color = style.font.color;
      if (style.font.size) cell.style.fontSize = `${style.font.size}px`;
      if (style.font.family) cell.style.fontFamily = style.font.family;
    }

    // 3. Apply Fill
    if (style.fill && style.fill.color) {
      cell.style.backgroundColor = style.fill.color;
    }

    // 4. Apply Alignment
    if (style.align) {
      if (style.align.h) cell.style.textAlign = style.align.h;
      
      // Vertical alignment requires flexbox since cells are divs
      if (style.align.v) {
        cell.style.display = 'flex';
        
        // Horizontal alignment in flex
        const hMap = { 'left': 'flex-start', 'center': 'center', 'right': 'flex-end' };
        // If text-align was set above, flex justifies content differently
        cell.style.justifyContent = hMap[style.align.h || 'left'];

        // Vertical alignment
        const vMap = { 'top': 'flex-start', 'middle': 'center', 'bottom': 'flex-end' };
        cell.style.alignItems = vMap[style.align.v];
      }
    }

    // 5. Apply Text Wrap
    if (style.wrap) {
      cell.style.whiteSpace = 'normal';
      cell.style.wordBreak = 'break-word';
    }
  }

  // ... [Existing scrollCellIntoView, clearAllHighlights, highlightCells, highlightColumnHeader, highlightRowHeader methods] ...

  scrollCellIntoView(cellElement) {
    if (!cellElement) return;
    const grid = this.cellGridContainer;
    const cellRect = cellElement.getBoundingClientRect();
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

  clearAllHighlights() {
    this.container.querySelectorAll('.header-highlight').forEach(h => h.classList.remove('header-highlight'));
    
    const selectionClasses = [
      'selected',
      'range-border-top', 'range-border-right',
      'range-border-bottom', 'range-border-left',
      'range-selected-1', 'range-selected-2', 'range-selected-3',
      'range-selected-4', 'range-selected-5', 'range-selected-6',
      'range-selected-7', 'range-selected-8',
      'copy-source' // Ensure copy indicators are cleared too if needed
    ];
    
    // We must query only cells that might have selection classes to be efficient
    // or just all cells if simpler. Given O(N), querying all .cell is fine for 100x26.
    // But safer to target specific classes if possible.
    // For now, standard reset:
    this.cellGridContainer.querySelectorAll('.cell').forEach(c => c.classList.remove(...selectionClasses));
  }

  highlightCells(cellIds, className) {
    cellIds.forEach(cellId => {
      const cell = this.getCellElement(cellId);
      if (cell) cell.classList.add(className);
    });
  }

  highlightColumnHeader(colIndex) {
    const header = this.columnHeadersContainer.querySelector(`[data-col='${colIndex}']`);
    if (header) header.classList.add('header-highlight');
  }

  highlightRowHeader(rowIndex) {
    const header = this.rowHeadersContainer.querySelector(`[data-row='${rowIndex}']`);
    if (header) header.classList.add('header-highlight');
  }

  // ... [Existing drag/resize helper methods if any] ...
  
  showDragGhost(range) {
    // Create ghost element if it doesn't exist
    let ghost = this.container.querySelector('#drag-ghost');
    if (!ghost) {
      ghost = document.createElement('div');
      ghost.id = 'drag-ghost';
      this.container.appendChild(ghost);
    }

    if (!range) {
      ghost.style.display = 'none';
      return;
    }

    const { start, end } = range;
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);

    // Get the bounding cells
    const startCell = this.getCellElementByCoords(minRow, minCol);
    const endCell = this.getCellElementByCoords(maxRow, maxCol);

    if (!startCell || !endCell) {
      ghost.style.display = 'none';
      return;
    }

    // Calculate dimensions
    const startRect = startCell.getBoundingClientRect();
    const endRect = endCell.getBoundingClientRect();

    // Position relative to container
    ghost.style.left = `${startCell.offsetLeft}px`;
    ghost.style.top = `${startCell.offsetTop}px`;
    ghost.style.width = `${endRect.right - startRect.left}px`;
    ghost.style.height = `${endRect.bottom - startRect.top}px`;
    ghost.style.display = 'block';
    ghost.style.transform = 'translate(0, 0)'; // Reset transform

    Logger.log('GridRenderer', `Showing drag ghost for range ${minCol}:${minRow} to ${maxCol}:${maxRow}`);
  }
  
  updateDragGhost(dx, dy) {
      const ghost = this.container.querySelector('#drag-ghost');
      if (ghost) ghost.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  hideDragGhost() {
      const ghost = this.container.querySelector('#drag-ghost');
      if (ghost) ghost.style.display = 'none';
  }

  showResizeGuide(type, index) {
      let guide = this.container.querySelector('.resize-guide');
      if (!guide) {
          guide = document.createElement('div');
          guide.className = 'resize-guide';
          this.container.appendChild(guide);
      }
      guide.className = `resize-guide ${type}`;
      
      let position = 0;
      if (type === 'col') {
          position = 46; // Row header width
          for(let i=0; i <= index; i++) position += this.columnWidths[i];
          guide.style.left = `${position}px`;
          guide.style.top = '0px';
          guide.style.transform = 'translateX(0)';
      } else {
          position = 24; // Col header height
          for(let i=0; i <= index; i++) position += this.rowHeights[i];
          guide.style.top = `${position}px`;
          guide.style.left = '0px';
          guide.style.transform = 'translateY(0)';
      }
      guide.style.display = 'block';
  }

  updateResizeGuide(type, delta) {
      const guide = this.container.querySelector('.resize-guide');
      if (guide) {
          const transform = type === 'col' ? `translateX(${delta}px)` : `translateY(${delta}px)`;
          guide.style.transform = transform;
      }
  }

  hideResizeGuide() {
      const guide = this.container.querySelector('.resize-guide');
      if (guide) guide.style.display = 'none';
  }

  // ... [Existing Private Methods: _createColumnHeaders, etc.] ...

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

  _setupScrollSync() {
    this.cellGridContainer.addEventListener('scroll', () => {
      this.columnHeadersContainer.scrollLeft = this.cellGridContainer.scrollLeft;
      this.rowHeadersContainer.scrollTop = this.cellGridContainer.scrollTop;
    });
  }

  _attachEventListeners() {
    const addListener = (element, eventName, callbackKey, dataExtractor) => {
      element.addEventListener(eventName, (e) => {
        if (this.callbacks[callbackKey]) {
           const data = dataExtractor(e);
           if (data) this.callbacks[callbackKey](data);
        }
      });
    };

    // Cell Events
    addListener(this.cellGridContainer, 'click', 'onCellClick', e => {
        const cell = e.target.closest('.cell');
        return cell ? { cellElement: cell, event: e } : null;
    });
    addListener(this.cellGridContainer, 'dblclick', 'onCellDoubleClick', e => {
        const cell = e.target.closest('.cell');
        return cell ? { cellElement: cell, event: e } : null;
    });
    addListener(this.cellGridContainer, 'mousedown', 'onCellMouseDown', e => {
        const cell = e.target.closest('.cell');
        return cell ? { cellElement: cell, event: e } : null;
    });
    addListener(this.cellGridContainer, 'mouseover', 'onCellMouseOver', e => {
        const cell = e.target.closest('.cell');
        return cell ? { cellElement: cell, event: e } : null;
    });

    // Header Events
    const handleHeader = (e, type) => {
        const header = e.target.closest('.header-cell');
        if (!header) return null;
        const index = parseInt(type === 'col' ? header.dataset.col : header.dataset.row, 10);
        return { type, index, event: e };
    };

    this.columnHeadersContainer.addEventListener('click', e => {
        if(this.callbacks.onHeaderClick) {
            const data = handleHeader(e, 'col');
            if(data) this.callbacks.onHeaderClick(data);
        }
    });
    this.rowHeadersContainer.addEventListener('click', e => {
        if(this.callbacks.onHeaderClick) {
            const data = handleHeader(e, 'row');
            if(data) this.callbacks.onHeaderClick(data);
        }
    });

    this.columnHeadersContainer.addEventListener('mousemove', e => {
        if (this.callbacks.onHeaderMouseMove) this.callbacks.onHeaderMouseMove({ type: 'col', event: e });
    });
    this.rowHeadersContainer.addEventListener('mousemove', e => {
        if (this.callbacks.onHeaderMouseMove) this.callbacks.onHeaderMouseMove({ type: 'row', event: e });
    });
    
    // New: Header MouseDown for resize start
    this.columnHeadersContainer.addEventListener('mousedown', e => {
        if (this.callbacks.onHeaderMouseDown) this.callbacks.onHeaderMouseDown({ type: 'col', event: e });
    });
    this.rowHeadersContainer.addEventListener('mousedown', e => {
        if (this.callbacks.onHeaderMouseDown) this.callbacks.onHeaderMouseDown({ type: 'row', event: e });
    });
  }

  on(eventName, callback) {
    const callbackKey = `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;
    if (callbackKey in this.callbacks) {
      this.callbacks[callbackKey] = callback;
    } else {
      Logger.warn('GridRenderer', `Unknown event: ${eventName}`);
    }
  }

  destroy() {
    this.columnHeadersContainer = null;
    this.rowHeadersContainer = null;
    this.cellGridContainer = null;
  }
}