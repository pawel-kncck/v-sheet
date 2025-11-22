// Core Dependencies
import { HistoryManager } from './history/HistoryManager.js';
import { UpdateCellsCommand } from './history/commands/UpdateCellsCommand.js';
import { MoveRangeCommand } from './history/commands/MoveRangeCommand.js';
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
    // We pass a getter so ClipboardManager can lazy-load values
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

    // External Dependencies (injected via setters later)
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

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  setFileManager(fileManager) {
    this.fileManager = fileManager;
  }

  setFormulaBar(formulaBar) {
    this.formulaBar = formulaBar;
    // Sync initial state
    if (this.selectionManager.activeCell) {
      this._updateFormulaBar();
    }
  }

  /**
   * Loads data from a file object.
   * Delegates to modules to reset their state.
   */
  loadFromFile(fileData) {
    if (!fileData) return;

    // 1. Reset History
    this.historyManager.clear();

    // 2. Reset Modules
    this.selectionManager.clear();
    // We intentionally don't clear clipboard on file load (allows copy-paste between files)

    // Explicitly clear all visual cell content to prevent "ghost" data
    // from the previous file persisting in the DOM.
    const cells = this.renderer.cellGridContainer.querySelectorAll('.cell');
    cells.forEach(cell => cell.textContent = '');

    // 3. Apply Structure (Widths/Heights)
    if (fileData.columnWidths) {
      this.renderer.setColumnWidths(fileData.columnWidths);
    }
    if (fileData.rowHeights) {
      this.renderer.setRowHeights(fileData.rowHeights);
    }

    // 4. Load Data into Worker
    // The worker will calculate values and send back an 'updates' message
    // which triggers renderer.updateCellContent()
    if (this.formulaWorker) {
      this.formulaWorker.postMessage({
        type: 'load',
        payload: { fileCellData: fileData.cells || {} },
      });
    }

    // 5. Restore Metadata (Selection)
    if (fileData.metadata?.lastActiveCell) {
      const coords = this._cellIdToCoords(fileData.metadata.lastActiveCell);
      if (coords) {
        this.selectionManager.selectCell(coords);
      }
    }
  }

  /**
   * Clears the spreadsheet (e.g. for "New File")
   */
  clear() {
    // Clear DOM
    this.renderer.createGrid(); // Re-creates empty grid
    
    // Clear State
    this.selectionManager.clear();
    this.historyManager.clear();
    this.selectionManager.selectCell({ row: 1, col: 0 }); // Reset to A1
  }

  // ==========================================================================
  // EVENT WIRING (The "Glue")
  // ==========================================================================

  _setupEventWiring() {
    // --- GridRenderer Events ---
    
    // 1. Cell Selection (Click / Drag)
    this.renderer.on('cellMouseDown', ({ cellElement, event }) => {
      this.renderer.cellGridContainer.focus()
      if (this.editor.isEditing) return; // Don't select if editing
      
      const coords = this._getCellCoordsFromElement(cellElement);

      // --- NEW DRAG LOGIC START ---
      const cursor = this.selectionManager.getCursorForCell(coords, event, cellElement);
      
      if (cursor === 'grab') {
        this.isDraggingCells = true;
        
        // Get the active selection range
        const ranges = this.selectionManager.ranges;
        const activeRange = ranges[ranges.length - 1];

        // Store drag start data
        this.dragInfo = {
          startX: event.clientX,
          startY: event.clientY,
          startCoords: coords, // Store the exact cell we clicked
          selection: activeRange
        };

        // Show visual ghost
        this.renderer.showDragGhost(activeRange);

        // Attach global listeners
        window.addEventListener('mousemove', this._onDragMouseMove);
        window.addEventListener('mouseup', this._onDragMouseUp, { once: true });
        
        return; // Stop! Do not re-select the cell we just clicked
      }
      
      // Right click? Just select single cell if not in current selection
      if (event.button === 2) {
        // Context menu logic would go here
        return; 
      }

      this.selectionManager.selectCell(coords, event.shiftKey, event.metaKey || event.ctrlKey);
    });

    this.renderer.on('cellMouseOver', ({ cellElement, event }) => {
      if (this.editor.isEditing) return;
      if (this.isDraggingCells) return;

      const coords = this._getCellCoordsFromElement(cellElement);

      if (event.buttons === 1) {
        this.selectionManager.selectCell(coords, true, false);
      } else {
        // PASS EXTRA ARGS HERE
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
      this.selectionManager.selectHeader(type, index, event.shiftKey, event.metaKey || event.ctrlKey);
    });

    this.renderer.on('headerMouseMove', ({ type, event }) => {
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
        // It's a resize interaction
        const index = parseInt(type === 'col' ? target.dataset.col : target.dataset.row, 10);
        const currentSizes = type === 'col' ? this.renderer.columnWidths : this.renderer.rowHeights;
        
        // Determine which indices are being resized (if multiple selected)
        const indices = [index]; 
        // TODO: Add logic to check if `index` is part of a selection group to resize all
        
        this.resizer.startResize(type, indices, currentSizes, event);
      } else {
        // It's a selection interaction -> delegate to SelectionManager
        const index = parseInt(type === 'col' ? target.dataset.col : target.dataset.row, 10);
        this.selectionManager.selectHeader(type, index, event.shiftKey, event.metaKey || event.ctrlKey);
      }
    });

    // --- SelectionManager Events ---

    this.selectionManager.on('activeCellChange', (cellId) => {
      this._updateFormulaBar();
      this._updateMetadata();
    });

    this.selectionManager.on('selectionChange', () => {
      this._updateMetadata();
    });

    // --- GridResizer Events ---

    this.resizer.on('resizeUpdate', ({ type, newSizes }) => {
      if (type === 'col') this.renderer.setColumnWidths(Object.values(newSizes)); // Simplification for V1
      else this.renderer.setRowHeights(Object.values(newSizes));
    });

    this.resizer.on('resizeEnd', ({ type, finalSizes }) => {
      // 1. Apply visually
      if (type === 'col') {
        // This is a simplification. Ideally we merge `finalSizes` into existing array.
        // For V1 we assume single resize or we need a smarter merge method.
        const mergedWidths = [...this.renderer.columnWidths];
        Object.entries(finalSizes).forEach(([idx, size]) => mergedWidths[idx] = size);
        this.renderer.setColumnWidths(mergedWidths);
        
        // 2. Save to FileManager
        if (this.fileManager) this.fileManager.updateColumnWidths(mergedWidths);
      } else {
        const mergedHeights = [...this.renderer.rowHeights];
        Object.entries(finalSizes).forEach(([idx, size]) => mergedHeights[idx] = size);
        this.renderer.setRowHeights(mergedHeights);
        
        if (this.fileManager) this.fileManager.updateRowHeights(mergedHeights);
      }
    });

    // --- EditorManager Events ---

    this.editor.on('commit', ({ cellId, value, moveDirection }) => {
      this._executeCellUpdate(cellId, value);
      
      // Handle post-edit navigation
      if (moveDirection === 'down') this.selectionManager.moveSelection('down');
      else if (moveDirection === 'right') this.selectionManager.moveSelection('right');
      
      // Refocus grid
      this.renderer.cellGridContainer.focus();
    });

    // --- Global Keyboard Events ---
    
    this.renderer.cellGridContainer.tabIndex = 0; // Ensure focusable
    this.renderer.cellGridContainer.addEventListener('keydown', (e) => {
      this._handleGlobalKeydown(e);
    });
  }

  _setupWorkerListeners() {
    if (!this.formulaWorker) return;

    this.formulaWorker.onmessage = (event) => {
      const { type, payload } = event.data;

      if (type === 'updates') {
        // Batch update the DOM
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

    // 1. Find the cell currently under the mouse
    // We hide the ghost momentarily so elementFromPoint sees the cell below it, not the ghost
    const ghost = document.getElementById('drag-ghost');
    if (ghost) ghost.style.display = 'none';
    
    const targetElement = document.elementFromPoint(e.clientX, e.clientY);
    const targetCell = targetElement ? targetElement.closest('.cell') : null;
    
    if (ghost) ghost.style.display = 'block'; // Show ghost again

    // 2. Calculate Snap Delta
    if (targetCell) {
      const startCoords = this.dragInfo.startCoords; // {row, col} where we clicked
      const currentCoords = this._getCellCoordsFromElement(targetCell);

      // Calculate grid-based offset (e.g., moved 2 cols right, 1 row down)
      const colDiff = currentCoords.col - startCoords.col;
      const rowDiff = currentCoords.row - startCoords.row;

      // Don't update if we haven't moved to a new cell
      if (colDiff === 0 && rowDiff === 0) {
        this.renderer.updateDragGhost(0, 0);
        return;
      }

      // 3. Calculate Pixel Delta based on Cell Positions
      // We find the Start Cell Element and the Current Target Cell Element
      // and measure the physical distance between their top-left corners.
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
      // 1. Find the cell under the mouse cursor
      // We hide the ghost first to ensure elementFromPoint sees the cell below it
      this.renderer.hideDragGhost();
      
      const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
      const cell = dropTarget ? dropTarget.closest('.cell') : null;

      if (cell) {
        const dropCoords = this._getCellCoordsFromElement(cell);
        const { selection, startCoords } = this.dragInfo;

        // Safety check: ensure we have startCoords (prevent crash if drag start failed)
        if (!startCoords) {
            console.error('Missing startCoords in dragInfo');
            return;
        }

        // 2. Calculate the offset
        const colOffset = dropCoords.col - startCoords.col;
        const rowOffset = dropCoords.row - startCoords.row;

        // 3. Execute Move (only if we actually moved to a new cell)
        if (colOffset !== 0 || rowOffset !== 0) {
          // Calculate new top-left for the range
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
      // 4. Cleanup - This ALWAYS runs, ensuring the app doesn't get stuck
      this.isDraggingCells = false;
      this.dragInfo = {};
      window.removeEventListener('mousemove', this._onDragMouseMove);
      
      // Reset cursor
      if (this.renderer && this.renderer.cellGridContainer) {
        this.renderer.cellGridContainer.style.cursor = 'default';
      }
    }
  }

  // ==========================================================================
  // LOGIC HELPERS
  // ==========================================================================

  _handleGlobalKeydown(e) {
    if (this.editor.isEditing) return; // Let EditorManager handle it

    const key = e.key;
    const isCmd = e.metaKey || e.ctrlKey;
    const isShift = e.shiftKey;

    // 1. History (Undo/Redo)
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

    // 2. Clipboard
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

    // 3. Navigation (Arrows)
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      e.preventDefault();
      const direction = key.replace('Arrow', '').toLowerCase();
      
      if (isCmd) {
        // Pass the direction AND a way to check data (for finding edges)
        this.selectionManager.jumpToEdge(direction, (cellId) => {
            const val = this.fileManager.getRawCellValue(cellId);
            return val !== '' && val !== null && val !== undefined;
        }); 
      } else {
        this.selectionManager.moveSelection(direction, isShift);
      }
      return;
    }

    // 4. Editing
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

    // 5. Type to overwrite
    // If it's a printable character and no special modifiers
    if (key.length === 1 && !isCmd && !e.altKey) {
      const activeId = this.selectionManager.getActiveCellId();
      if (activeId) {
        e.preventDefault();
        this.editor.startEdit(activeId, '', key); // Start empty, pass trigger key
      }
    }
  }

  _executeCellUpdate(cellId, newValue) {
    const oldValue = this.fileManager.getRawCellValue(cellId);
    
    // Don't update if no change (optimization)
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

    // Get calculations from ClipboardManager
    const updates = this.clipboardManager.getPasteUpdates(activeCellCoords);
    if (updates.length === 0) return;

    // Hydrate updates with oldValues for Undo
    const cellUpdates = updates.map(update => ({
      cellId: update.cellId,
      newValue: update.value,
      oldValue: this.fileManager.getRawCellValue(update.cellId)
    }));

    // Execute unified command
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
  
  // Interface methods required by FormulaBar/Legacy
  setCellValue(cellId, value) {
    this._executeCellUpdate(cellId, value);
  }
  
  selectCell(cellId) {
    const coords = this._cellIdToCoords(cellId);
    if (coords) this.selectionManager.selectCell(coords);
  }
  
  getCellValue(cellId) {
    // Used by formula bar cancel
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

    if (movedData.length === 0) return; // Nothing to move

    // 2. Collect data being overwritten at destination
    const overwrittenData = [];
    const targetMinCol = targetTopLeft.col;
    const targetMinRow = targetTopLeft.row;
    
    // Calculate destination bounds
    const width = maxCol - minCol;
    const height = maxRow - minRow;

    for (let col = targetMinCol; col <= targetMinCol + width; col++) {
      for (let row = targetMinRow; row <= targetMinRow + height; row++) {
        const cellId = this._buildCellId(row, col);
        const value = this.fileManager.getRawCellValue(cellId);
        if (value !== undefined && value !== '') {
          overwrittenData.push({ cellId, value });
        }
      }
    }

    // 3. Create and execute command
    const command = new MoveRangeCommand({
      sourceRange: { minCol, maxCol, minRow, maxRow },
      targetTopLeft,
      movedData,
      overwrittenData,
      fileManager: this.fileManager,
      formulaWorker: this.formulaWorker
    });

    this.historyManager.execute(command);

    // 4. Update selection to follow the moved data
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

  /**
   * Helper to build a cell ID string (e.g., "A1") from coordinates.
   * @param {number} row - 1-based row index
   * @param {number} col - 0-based column index
   */
  _buildCellId(row, col) {
    const colLetter = String.fromCharCode(65 + col);
    return `${colLetter}${row}`;
  }
}


