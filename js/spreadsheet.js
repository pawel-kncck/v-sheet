// Core Dependencies
import { HistoryManager } from './history/HistoryManager.js';
import { UpdateCellsCommand } from './history/commands/UpdateCellsCommand.js';
import { MoveRangeCommand } from './history/commands/MoveRangeCommand.js';
import { ResizeCommand } from './history/commands/ResizeCommand.js';
import { Logger } from './engine/utils/Logger.js';
import { CellHelpers } from './engine/utils/CellHelpers.js';

// UI Modules
import { GridRenderer } from './ui/GridRenderer.js';
import { SelectionManager } from './ui/SelectionManager.js';
import { GridResizer } from './ui/GridResizer.js';
import { EditorManager } from './ui/EditorManager.js';
import { ClipboardManager } from './ui/ClipboardManager.js';

export class Spreadsheet {
  constructor(containerId, formulaWorker) {
    const container = document.getElementById(containerId);
    if (!container) {
      Logger.error('Spreadsheet', `Container "${containerId}" not found.`);
      throw new Error(`Container "${containerId}" not found.`);
    }

    // Configuration
    this.config = {
      rows: 100,
      cols: 26,
      defaultColWidth: 94,
      defaultRowHeight: 20
    };

    // --- 1. Initialize Modules ---
    
    // Visual Layer
    this.renderer = new GridRenderer(container, this.config);
    
    // Logic Layer
    this.selectionManager = new SelectionManager(this.renderer, this.config);
    this.resizer = new GridResizer();
    this.editor = new EditorManager(this.renderer);
    
    // Data Layer
    this.clipboardManager = new ClipboardManager(this.renderer, (cellId) => {
      return this.fileManager ? this.fileManager.getRawCellValue(cellId) : '';
    });

    // History
    this.historyManager = new HistoryManager(100);

    // State for Drag-and-Drop
    this.isDraggingCells = false;
    this.dragInfo = {};

    // Bind drag handlers to this instance
    this._onDragMouseMove = this._onDragMouseMove.bind(this);
    this._onDragMouseUp = this._onDragMouseUp.bind(this);

    // External Dependencies
    this.fileManager = null;
    this.formulaBar = null;
    this.formulaWorker = formulaWorker;

    // --- 2. Setup ---
    this.renderer.createGrid();
    this._setupEventWiring();
    this._setupWorkerListeners();
    
    // Set initial selection
    this.selectionManager.selectCell({ row: 1, col: 0 }); // A1

    Logger.log('Spreadsheet', 'Coordinator initialized');
  }

  setFileManager(fileManager) {
    this.fileManager = fileManager;
  }

  setFormulaBar(formulaBar) {
    this.formulaBar = formulaBar;
    if (this.selectionManager.activeCell) {
      this._updateFormulaBar();
    }
  }

  loadFromFile(fileData) {
    if (!fileData) return;

    this.historyManager.clear();
    this.selectionManager.clear();

    const cells = this.renderer.cellGridContainer.querySelectorAll('.cell');
    cells.forEach(cell => cell.textContent = '');

    if (fileData.columnWidths) {
      this.renderer.setColumnWidths(fileData.columnWidths);
    }
    if (fileData.rowHeights) {
      this.renderer.setRowHeights(fileData.rowHeights);
    }

    if (this.formulaWorker) {
      this.formulaWorker.postMessage({
        type: 'load',
        payload: { fileCellData: fileData.cells || {} },
      });
    }

    if (fileData.metadata?.lastActiveCell) {
      const coords = this._cellIdToCoords(fileData.metadata.lastActiveCell);
      if (coords) {
        this.selectionManager.selectCell(coords);
      }
    }
  }

  clear() {
    this.renderer.createGrid();
    this.selectionManager.clear();
    this.historyManager.clear();
    this.selectionManager.selectCell({ row: 1, col: 0 });
  }

  // ==========================================================================
  // EVENT WIRING
  // ==========================================================================

  _setupEventWiring() {
    // 1. Cell Selection (Click / Drag)
    this.renderer.on('cellMouseDown', ({ cellElement, event }) => {
      this.renderer.cellGridContainer.focus()
      if (this.editor.isEditing) return;
      if (this.resizer.isResizing) return;
      
      const coords = this._getCellCoordsFromElement(cellElement);

      const cursor = this.selectionManager.getCursorForCell(coords, event, cellElement);
      
      if (cursor === 'grab') {
        this.isDraggingCells = true;
        
        const ranges = this.selectionManager.ranges;
        const activeRange = ranges[ranges.length - 1];

        this.dragInfo = {
          startX: event.clientX,
          startY: event.clientY,
          startCoords: coords, 
          selection: activeRange
        };

        this.renderer.showDragGhost(activeRange);

        window.addEventListener('mousemove', this._onDragMouseMove);
        window.addEventListener('mouseup', this._onDragMouseUp, { once: true });
        
        return;
      }
      
      if (event.button === 2) {
        return; 
      }

      this.selectionManager.selectCell(coords, event.shiftKey, event.metaKey || event.ctrlKey);
    });

    this.renderer.on('cellMouseOver', ({ cellElement, event }) => {
      if (this.editor.isEditing) return;
      if (this.isDraggingCells) return;
      if (this.resizer.isResizing) return;

      const coords = this._getCellCoordsFromElement(cellElement);

      if (event.buttons === 1) {
        this.selectionManager.selectCell(coords, true, false);
      } else {
        const cursor = this.selectionManager.getCursorForCell(coords, event, cellElement);
        cellElement.style.cursor = cursor;
      }
    });

    this.renderer.on('cellDoubleClick', ({ cellElement }) => {
      const cellId = cellElement.dataset.id;
      const rawValue = this.fileManager.getRawCellValue(cellId);
      this.editor.startEdit(cellId, rawValue);
    });

    // 2. Header Selection
    this.renderer.on('headerClick', ({ type, index, event }) => {
      // FIX: Bug 3 - Don't select if we just finished resizing
      if (this.resizer.isResizing || this.resizer.justFinishedResizing) return;
      this.selectionManager.selectHeader(type, index, event.shiftKey, event.metaKey || event.ctrlKey);
    });

    this.renderer.on('headerMouseMove', ({ type, event }) => {
      if (this.resizer.isResizing) return;
      const target = event.target.closest('.header-cell');
      if (target) {
        const cursor = this.resizer.getCursorForHeader(target, event);
        target.style.cursor = cursor;
      }
    });

    // 3. Resizing
    this.renderer.on('headerMouseDown', ({ type, event }) => {
      this.renderer.cellGridContainer.focus()
      const target = event.target.closest('.header-cell');
      const cursor = this.resizer.getCursorForHeader(target, event);
      
      if (cursor !== 'default') {
        event.preventDefault(); 
        event.stopPropagation();
        let index = parseInt(type === 'col' ? target.dataset.col : target.dataset.row, 10);
        
        if (type === 'row') {
            index = index - 1;
        }

        const currentSizes = type === 'col' ? this.renderer.columnWidths : this.renderer.rowHeights;
        this.resizer.startResize(type, [index], currentSizes, event);
      } else {
        const rawIndex = parseInt(type === 'col' ? target.dataset.col : target.dataset.row, 10);
        this.selectionManager.selectHeader(type, rawIndex, event.shiftKey, event.metaKey || event.ctrlKey);
      }
    });

    // Resizer Events
    this.resizer.on('resizeStart', ({ type, index }) => {
        this.renderer.showResizeGuide(type, index);
    });

    this.resizer.on('resizeUpdate', ({ type, delta }) => {
        this.renderer.updateResizeGuide(type, delta);
    });

    this.resizer.on('resizeEnd', ({ type, finalSizes }) => {
        this.renderer.hideResizeGuide();

        const oldSizes = {};
        const indices = Object.keys(finalSizes).map(k => parseInt(k, 10));
        
        indices.forEach(idx => {
            if (type === 'col') oldSizes[idx] = this.renderer.columnWidths[idx];
            else oldSizes[idx] = this.renderer.rowHeights[idx];
        });

        const command = new ResizeCommand({
            type,
            indices,
            newSizes: finalSizes,
            oldSizes,
            fileManager: this.fileManager,
            renderer: this.renderer
        });

        this.historyManager.execute(command);
        this.renderer.cellGridContainer.focus();
    });

    // SelectionManager Events
    this.selectionManager.on('activeCellChange', (cellId) => {
      this._updateFormulaBar();
      this._updateMetadata();
    });

    this.selectionManager.on('selectionChange', () => {
      this._updateMetadata();
    });
    
    // EditorManager Events
    this.editor.on('commit', ({ cellId, value, moveDirection }) => {
      this._executeCellUpdate(cellId, value);
      
      if (moveDirection === 'down') this.selectionManager.moveSelection('down');
      else if (moveDirection === 'right') this.selectionManager.moveSelection('right');
      
      this.renderer.cellGridContainer.focus();
    });

    // Global Keyboard Events
    this.renderer.cellGridContainer.tabIndex = 0;
    this.renderer.cellGridContainer.addEventListener('keydown', (e) => {
      this._handleGlobalKeydown(e);
    });
  }

  _setupWorkerListeners() {
    if (!this.formulaWorker) return;

    this.formulaWorker.onmessage = (event) => {
      const { type, payload } = event.data;

      if (type === 'updates') {
        Object.entries(payload.updates).forEach(([cellId, value]) => {
          this.renderer.updateCellContent(cellId, value);
        });
      } else if (type === 'error') {
        Logger.error('Worker', payload.message);
      }
    };
  }

  // ==========================================================================
  // DRAG AND DROP HANDLERS
  // ==========================================================================

  _onDragMouseMove(e) {
    if (!this.isDraggingCells) return;

    const ghost = document.getElementById('drag-ghost');
    if (ghost) ghost.style.display = 'none';
    
    const targetElement = document.elementFromPoint(e.clientX, e.clientY);
    const targetCell = targetElement ? targetElement.closest('.cell') : null;
    
    if (ghost) ghost.style.display = 'block';

    if (targetCell) {
      const startCoords = this.dragInfo.startCoords; 
      const currentCoords = this._getCellCoordsFromElement(targetCell);

      const colDiff = currentCoords.col - startCoords.col;
      const rowDiff = currentCoords.row - startCoords.row;

      // FIX: Bug 1 - Update Ghost Size
      const { selection } = this.dragInfo;
      
      // Calculate range dimensions in cells
      const rangeWidthCells = Math.abs(selection.end.col - selection.start.col);
      const rangeHeightCells = Math.abs(selection.end.row - selection.start.row);
      
      // Calculate target range bounds
      const targetStartCol = selection.start.col + colDiff;
      const targetStartRow = selection.start.row + rowDiff;
      const targetEndCol = targetStartCol + rangeWidthCells;
      const targetEndRow = targetStartRow + rangeHeightCells;

      // Sum pixel widths
      let newWidthPx = 0;
      for(let c = targetStartCol; c <= targetEndCol; c++) {
          if (c >= 0 && c < this.config.cols) {
              newWidthPx += (this.renderer.columnWidths[c] || this.config.defaultColWidth);
          }
      }

      // Sum pixel heights
      let newHeightPx = 0;
      for(let r = targetStartRow; r <= targetEndRow; r++) {
          // Rows are 1-based in logic but 0-based in heights array
          // renderer.rowHeights[0] corresponds to Row 1
          if (r >= 1 && r <= this.config.rows) {
              newHeightPx += (this.renderer.rowHeights[r - 1] || this.config.defaultRowHeight);
          }
      }

      // Update Ghost DOM
      if (ghost && newWidthPx > 0 && newHeightPx > 0) {
          ghost.style.width = `${newWidthPx}px`;
          ghost.style.height = `${newHeightPx}px`;
      }

      // Move Ghost
      const startCellEl = this.renderer.getCellElementByCoords(startCoords.row, startCoords.col);
      if (startCellEl && targetCell) {
        const startRect = startCellEl.getBoundingClientRect();
        const targetRect = targetCell.getBoundingClientRect();

        const deltaX = targetRect.left - startRect.left;
        const deltaY = targetRect.top - startRect.top;

        this.renderer.updateDragGhost(deltaX, deltaY);
      }
    }
  }

  _onDragMouseUp(e) {
    if (!this.isDraggingCells) return;

    try {
      this.renderer.hideDragGhost();
      
      const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
      const cell = dropTarget ? dropTarget.closest('.cell') : null;

      if (cell) {
        const dropCoords = this._getCellCoordsFromElement(cell);
        const { selection, startCoords } = this.dragInfo;

        if (!startCoords) {
            console.error('Missing startCoords in dragInfo');
            return;
        }

        const colOffset = dropCoords.col - startCoords.col;
        const rowOffset = dropCoords.row - startCoords.row;

        if (colOffset !== 0 || rowOffset !== 0) {
          const newTopLeft = {
            col: selection.start.col + colOffset,
            row: selection.start.row + rowOffset
          };
          
          this._executeMoveCommand(selection, colOffset, rowOffset, newTopLeft);
        }
      }
    } catch (error) {
      console.error('Drag operation failed:', error);
    } finally {
      this.isDraggingCells = false;
      this.dragInfo = {};
      window.removeEventListener('mousemove', this._onDragMouseMove);
      
      if (this.renderer && this.renderer.cellGridContainer) {
        this.renderer.cellGridContainer.style.cursor = 'default';
      }
    }
  }

  // ==========================================================================
  // LOGIC HELPERS
  // ==========================================================================

  _handleGlobalKeydown(e) {
    if (this.editor.isEditing) return; 

    const key = e.key;
    const isCmd = e.metaKey || e.ctrlKey;
    const isShift = e.shiftKey;

    if (isCmd && key.toLowerCase() === 'z') {
      e.preventDefault();
      if (isShift) this.historyManager.redo();
      else this.historyManager.undo();
      return;
    }
    if (isCmd && key.toLowerCase() === 'y') {
      e.preventDefault();
      this.historyManager.redo();
      return;
    }

    if (isCmd && key.toLowerCase() === 'c') {
      e.preventDefault();
      this.clipboardManager.copy(this.selectionManager.ranges);
      return;
    }
    if (isCmd && key.toLowerCase() === 'v') {
      e.preventDefault();
      this._handlePaste();
      return;
    }

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      e.preventDefault();
      const direction = key.replace('Arrow', '').toLowerCase();
      
      if (isCmd) {
        this.selectionManager.jumpToEdge(direction, (cellId) => {
            const val = this.fileManager.getRawCellValue(cellId);
            return val !== '' && val !== null && val !== undefined;
        }); 
      } else {
        this.selectionManager.moveSelection(direction, isShift);
      }
      return;
    }

    if (key === 'Enter') {
      e.preventDefault();
      const activeId = this.selectionManager.getActiveCellId();
      if (activeId) {
        const rawValue = this.fileManager.getRawCellValue(activeId);
        this.editor.startEdit(activeId, rawValue);
      }
      return;
    }
    
    if (key === 'Backspace' || key === 'Delete') {
      e.preventDefault();
      this._clearSelection();
      return;
    }

    if (key.length === 1 && !isCmd && !e.altKey) {
      const activeId = this.selectionManager.getActiveCellId();
      if (activeId) {
        e.preventDefault();
        this.editor.startEdit(activeId, '', key); 
      }
    }
  }

  _executeCellUpdate(cellId, newValue) {
    const oldValue = this.fileManager.getRawCellValue(cellId);
    
    if (newValue === oldValue) return;

    const command = new UpdateCellsCommand({
      cellUpdates: [{ cellId, newValue, oldValue }],
      fileManager: this.fileManager,
      formulaWorker: this.formulaWorker
    });

    this.historyManager.execute(command);
  }

  _handlePaste() {
    const activeCellCoords = this.selectionManager.activeCell;
    if (!activeCellCoords) return;

    const updates = this.clipboardManager.getPasteUpdates(activeCellCoords);
    if (updates.length === 0) return;

    const cellUpdates = updates.map(update => ({
      cellId: update.cellId,
      newValue: update.value,
      oldValue: this.fileManager.getRawCellValue(update.cellId)
    }));

    const command = new UpdateCellsCommand({
      cellUpdates,
      fileManager: this.fileManager,
      formulaWorker: this.formulaWorker
    });

    this.historyManager.execute(command);
    this.clipboardManager.clearVisuals();
  }

  _clearSelection() {
    const cellIds = this.selectionManager.getSelectedCellIds();
    const cellUpdates = [];

    cellIds.forEach(cellId => {
      const oldValue = this.fileManager.getRawCellValue(cellId);
      if (oldValue !== '' && oldValue !== undefined) {
        cellUpdates.push({
          cellId,
          newValue: '',
          oldValue
        });
      }
    });

    if (cellUpdates.length > 0) {
      const command = new UpdateCellsCommand({
        cellUpdates,
        fileManager: this.fileManager,
        formulaWorker: this.formulaWorker
      });
      this.historyManager.execute(command);
    }
  }

  _updateFormulaBar() {
    if (!this.formulaBar) return;
    const cellId = this.selectionManager.getActiveCellId();
    if (cellId) {
      this.formulaBar.updateCellReference(cellId);
      const raw = this.fileManager.getRawCellValue(cellId);
      this.formulaBar.updateFormulaInput(raw);
    }
  }

  _updateMetadata() {
    if (!this.fileManager) return;
    this.fileManager.updateMetadata({
      lastActiveCell: this.selectionManager.getActiveCellId(),
      selections: this.selectionManager.ranges
    });
  }

  _getCellCoordsFromElement(cell) {
    return {
      row: parseInt(cell.dataset.row, 10),
      col: parseInt(cell.dataset.col, 10)
    };
  }

  _cellIdToCoords(cellId) {
    const match = cellId.match(/([A-Z]+)(\d+)/);
    if (!match) return null;
    return {
      col: CellHelpers.colLetterToIdx(match[1]),
      row: parseInt(match[2], 10)
    };
  }
  
  setCellValue(cellId, value) {
    this._executeCellUpdate(cellId, value);
  }
  
  selectCell(cellId) {
    const coords = this._cellIdToCoords(cellId);
    if (coords) this.selectionManager.selectCell(coords);
  }
  
  getCellValue(cellId) {
    return this.fileManager.getRawCellValue(cellId);
  }

  _executeMoveCommand(selection, colOffset, rowOffset, targetTopLeft) {
    const { start, end } = selection;
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);

    // 1. Collect data being moved
    const movedData = [];
    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        const cellId = this._buildCellId(row, col);
        const value = this.fileManager.getRawCellValue(cellId);
        if (value !== undefined && value !== '') {
          movedData.push({ cellId, value });
        }
      }
    }

    if (movedData.length === 0) return;

    // 2. Collect data being overwritten at destination
    // FIX: Bug 2 - Capture ALL target cell states, even if empty
    const overwrittenData = [];
    const targetMinCol = targetTopLeft.col;
    const targetMinRow = targetTopLeft.row;
    
    const width = maxCol - minCol;
    const height = maxRow - minRow;

    for (let col = targetMinCol; col <= targetMinCol + width; col++) {
      for (let row = targetMinRow; row <= targetMinRow + height; row++) {
        const cellId = this._buildCellId(row, col);
        const value = this.fileManager.getRawCellValue(cellId);
        // We store the value, defaulting to '' if undefined, so Undo can restore the "empty" state
        overwrittenData.push({ cellId, value: value || '' });
      }
    }

    const command = new MoveRangeCommand({
      sourceRange: { minCol, maxCol, minRow, maxRow },
      targetTopLeft,
      movedData,
      overwrittenData,
      fileManager: this.fileManager,
      formulaWorker: this.formulaWorker
    });

    this.historyManager.execute(command);

    const newStart = {
      col: start.col + colOffset,
      row: start.row + rowOffset
    };
    const newEnd = {
      col: end.col + colOffset,
      row: end.row + rowOffset
    };
    
    this.selectionManager.ranges = [{ start: newStart, end: newEnd }];
    this.selectionManager.selectionAnchor = newStart;
    this.selectionManager.setActiveCell(newStart);
    this.selectionManager.render();
    this.selectionManager._notifySelectionChange();
  }

  _buildCellId(row, col) {
    const colLetter = String.fromCharCode(65 + col);
    return `${colLetter}${row}`;
  }
}