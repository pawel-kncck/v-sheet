// Core Dependencies
import { HistoryManager } from './history/HistoryManager.js';
import { UpdateCellsCommand } from './history/commands/UpdateCellsCommand.js';
import { MoveRangeCommand } from './history/commands/MoveRangeCommand.js';
import { ResizeCommand } from './history/commands/ResizeCommand.js';
import { FormatRangeCommand } from './history/commands/FormatRangeCommand.js';
import { BorderFormatCommand } from './history/commands/BorderFormatCommand.js';
import { FillRangeCommand } from './history/commands/FillRangeCommand.js';
import { Logger } from './engine/utils/Logger.js';
import { CellHelpers } from './engine/utils/CellHelpers.js';
import { BorderResolver } from './ui/BorderResolver.js';
import { FillPatternDetector } from './engine/utils/FillPatternDetector.js';
import { FormulaAdjuster } from './engine/utils/FormulaAdjuster.js';

// UI Modules
import { GridRenderer } from './ui/GridRenderer.js';
import { SelectionManager } from './ui/SelectionManager.js';
import { GridResizer } from './ui/GridResizer.js';
import { EditorManager } from './ui/EditorManager.js';
import { ClipboardManager } from './ui/ClipboardManager.js';
import { InputController } from './ui/InputController.js';
import { FormulaHighlighter } from './ui/FormulaHighlighter.js';
import { BorderMenu } from './ui/BorderMenu.js';
import { FillHandle } from './ui/FillHandle.js';

// Mode System
import { ModeManager } from './modes/ModeManager.js';
import { ReadyMode } from './modes/ReadyMode.js';
import { EditMode } from './modes/EditMode.js';
import { EnterMode } from './modes/EnterMode.js';
import { FormulaMode } from './modes/FormulaMode.js';
import { INTENTS, createEditStartContext } from './modes/Intents.js';

// Status Bar
import { StatusBar } from './status-bar.js';

export class Spreadsheet {
  constructor(containerId, formulaWorker) {
    const container = document.getElementById(containerId);
    if (!container) {
      Logger.error('Spreadsheet', `Container "${containerId}" not found.`);
      throw new Error(`Container "${containerId}" not found.`);
    }

    this.config = {
      rows: 100,
      cols: 26,
      defaultColWidth: 94,
      defaultRowHeight: 20
    };

    this.renderer = new GridRenderer(container, this.config);
    this.selectionManager = new SelectionManager(this.renderer, this.config);
    this.resizer = new GridResizer();
    this.formulaHighlighter = new FormulaHighlighter(this.renderer, this.selectionManager);
    this.editor = new EditorManager(this.renderer, this.formulaHighlighter);
    
    // Return Value, Style, and RichText for Copy operations
    this.clipboardManager = new ClipboardManager(this.renderer, (cellId) => {
      if (!this.fileManager) return { value: '', style: null, richText: null };
      return {
        value: this.fileManager.getRawCellValue(cellId),
        style: this.fileManager.getCellStyle(cellId),
        richText: this.fileManager.getCellRichText(cellId)
      };
    }, this.selectionManager);

    this.historyManager = new HistoryManager(100);
    this.isDraggingCells = false;
    this.isFilling = false;
    this.dragInfo = {};

    this._onDragMouseMove = this._onDragMouseMove.bind(this);
    this._onDragMouseUp = this._onDragMouseUp.bind(this);
    this._onFillMouseMove = this._onFillMouseMove.bind(this);
    this._onFillMouseUp = this._onFillMouseUp.bind(this);

    this.fileManager = null;
    this.formulaBar = null;
    this.formulaWorker = formulaWorker;

    // Initialize Status Bar (before mode system so it can receive mode updates)
    this.statusBar = new StatusBar(this);

    // Initialize Border Menu
    this.borderMenu = new BorderMenu(this);

    // Initialize Mode System
    const modeContext = {
      selectionManager: this.selectionManager,
      editorManager: this.editor,
      historyManager: this.historyManager,
      formulaHighlighter: this.formulaHighlighter,
      fileManager: null, // Will be set later via setFileManager
      formulaWorker: this.formulaWorker,
      renderer: this.renderer,
      clipboardManager: this.clipboardManager,
      executeCellUpdate: this._executeCellUpdate.bind(this),
      executePaste: this._handlePaste.bind(this),
      applyRangeFormat: this.applyRangeFormat.bind(this),
      updateModeDisplay: (modeName) => {
        this.statusBar.updateMode(modeName);
      },
      updateToolbarState: (style, disabled) => {
        if (this.toolbar) {
          this.toolbar.updateState(style, disabled);
        }
      }
    };

    this.modeManager = new ModeManager(modeContext);

    // Register modes
    this.modeManager.registerMode('ready', ReadyMode);
    this.modeManager.registerMode('edit', EditMode);
    this.modeManager.registerMode('enter', EnterMode);
    this.modeManager.registerMode('formula', FormulaMode);

    // Create grid first (so cellGridContainer exists)
    this.renderer.createGrid();

    // Initialize Fill Handle
    this.fillHandle = new FillHandle({
      container: this.renderer.cellGridContainer.parentElement,
      selectionManager: this.selectionManager,
      gridRenderer: this.renderer,
      onFillComplete: (fillData) => this._executeFill(fillData),
      onFillStart: (event) => {
        this.isFilling = true;
        window.addEventListener('mousemove', this._onFillMouseMove);
        window.addEventListener('mouseup', this._onFillMouseUp, { once: true });
      }
    });

    // Pass fill handle to SelectionManager
    this.selectionManager._fillHandle = this.fillHandle;

    // Initialize InputController after grid is created
    this.inputController = new InputController(
      this.renderer.cellGridContainer,
      this.modeManager
    );

    this._setupEventWiring();
    this._setupWorkerListeners();

    // Start in ready mode
    this.modeManager.switchMode('ready');

    // Select A1 after mode is initialized
    this.selectionManager.selectCell({ row: 1, col: 0 });

    Logger.log('Spreadsheet', 'Coordinator initialized with Mode System');
  }

  // ... [setFileManager, setFormulaBar methods same as before] ...
  setFileManager(fileManager) {
    this.fileManager = fileManager;

    // Update mode context with fileManager
    if (this.modeManager && this.modeManager._context) {
      this.modeManager._context.fileManager = fileManager;
    }
  }

  setFormulaBar(formulaBar) {
    this.formulaBar = formulaBar;

    // Pass the formula highlighter to the formula bar
    if (this.formulaHighlighter && formulaBar.setFormulaHighlighter) {
      formulaBar.setFormulaHighlighter(this.formulaHighlighter);
    }

    // Wire up editor value change callback to sync with formula bar
    if (this.editor) {
      this.editor.onValueChange = (value) => {
        if (this.formulaBar && !this.formulaBar.isEditingFormula) {
          this.formulaBar.updateFormulaInput(value);
        }
      };
    }

    if (this.selectionManager.activeCell) {
      this._updateFormulaBar();
    }
  }

  setToolbar(toolbar) {
    this.toolbar = toolbar;
  }

  // ... [loadFromFile method same as before] ...
  loadFromFile(fileData) {
    if (!fileData) return;

    this.historyManager.clear();
    this.selectionManager.clear();

    const cells = this.renderer.cellGridContainer.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.textContent = '';
        cell.innerHTML = ''; // Clear any rich text spans
        cell.removeAttribute('style');
    });

    if (fileData.columnWidths) {
      this.renderer.setColumnWidths(fileData.columnWidths);
    }
    if (fileData.rowHeights) {
      this.renderer.setRowHeights(fileData.rowHeights);
    }

    if (fileData.cells) {
        const styleManager = this.fileManager?.styleManager;

        Object.entries(fileData.cells).forEach(([cellId, cellData]) => {
            if (cellData.value !== undefined) {
                // Get cell-level style for rich text inheritance
                const cellStyle = this.fileManager?.getCellStyle(cellId);

                // Check if cell has rich text formatting (and is not a formula)
                const hasRichText = cellData.richText &&
                                   cellData.richText.length > 0 &&
                                   !cellData.formula;

                // Pass richText, cellStyle and styleManager for rich text rendering
                this.renderer.updateCellContent(
                    cellId,
                    cellData.value,
                    hasRichText ? cellData.richText : null,
                    cellStyle,
                    styleManager
                );
            }
            if (this.fileManager) {
                const style = this.fileManager.getCellStyle(cellId);
                if (style) {
                    this.renderer.updateCellStyle(cellId, style);
                }
            }
        });
    }

    if (this.formulaWorker) {
      this.formulaWorker.postMessage({
        type: 'load',
        payload: { fileCellData: fileData.cells || {} },
      });
    }

    // Use setTimeout to ensure DOM is fully ready before selecting
    setTimeout(() => {
      if (fileData.metadata?.lastActiveCell) {
        const coords = this._cellIdToCoords(fileData.metadata.lastActiveCell);
        if (coords) {
          this.selectionManager.selectCell(coords);
        } else {
          // Invalid coords, default to A1
          this.selectionManager.selectCell({ row: 1, col: 0 });
        }
      } else {
        // No last active cell, default to A1
        this.selectionManager.selectCell({ row: 1, col: 0 });
      }
    }, 0);
  }

  // ... [clear method same as before] ...
  clear() {
    this.renderer.createGrid();
    this.selectionManager.clear();
    this.historyManager.clear();
    // Note: Don't select A1 here - let loadFromFile or caller handle it
  }

  // ... [_setupEventWiring, _setupWorkerListeners, Drag methods same as before] ...
  
  _setupEventWiring() {
    // ... (Same as previous epic) ...
    // Simplified for brevity, assume all listener wiring is present
    this.renderer.on('cellMouseDown', ({ cellElement, event }) => {
      this.renderer.cellGridContainer.focus();
      if (this.editor.isEditing) return;
      if (this.resizer.isResizing) return;

      const coords = this._getCellCoordsFromElement(cellElement);
      const cursor = this.selectionManager.getCursorForCell(coords, event, cellElement);

      if (cursor === 'crosshair') {
        // Start fill operation
        event.preventDefault();
        this.isFilling = true;
        this.fillHandle.startDrag(event, this.selectionManager.getSelection());
        window.addEventListener('mousemove', this._onFillMouseMove);
        window.addEventListener('mouseup', this._onFillMouseUp, { once: true });
        return;
      }

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
      if (event.button === 2) return;
      this.selectionManager.selectCell(coords, event.shiftKey, event.metaKey || event.ctrlKey);
    });

    this.renderer.on('cellMouseOver', ({ cellElement, event }) => {
      if (this.editor.isEditing || this.isDraggingCells || this.isFilling || this.resizer.isResizing) return;
      const coords = this._getCellCoordsFromElement(cellElement);
      if (event.buttons === 1) {
        this.selectionManager.selectCell(coords, true, false);
      } else {
        const cursor = this.selectionManager.getCursorForCell(coords, event, cellElement);
        cellElement.style.cursor = cursor;
      }
    });

// UPDATED: Switch mode instead of just starting editor
    this.renderer.on('cellDoubleClick', ({ cellElement }) => {
      // Don't manually startEdit. Let the Mode system handle the transition.
      // This ensures we enter 'edit' mode properly so arrow keys don't navigate the grid.
      this.modeManager.handleIntent(INTENTS.EDIT_START, createEditStartContext('mouse'));
    });

    this.renderer.on('headerClick', ({ type, index, event }) => {
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

    this.renderer.on('headerMouseDown', ({ type, event }) => {
      this.renderer.cellGridContainer.focus();
      const target = event.target.closest('.header-cell');
      const cursor = this.resizer.getCursorForHeader(target, event);
      if (cursor !== 'default') {
        event.preventDefault(); 
        event.stopPropagation();
        let index = parseInt(type === 'col' ? target.dataset.col : target.dataset.row, 10);
        if (type === 'row') index = index - 1;
        const currentSizes = type === 'col' ? this.renderer.columnWidths : this.renderer.rowHeights;
        this.resizer.startResize(type, [index], currentSizes, event);
      } else {
        const rawIndex = parseInt(type === 'col' ? target.dataset.col : target.dataset.row, 10);
        this.selectionManager.selectHeader(type, rawIndex, event.shiftKey, event.metaKey || event.ctrlKey);
      }
    });

    this.resizer.on('resizeStart', ({ type, index }) => this.renderer.showResizeGuide(type, index));
    this.resizer.on('resizeUpdate', ({ type, delta }) => this.renderer.updateResizeGuide(type, delta));
    this.resizer.on('resizeEnd', ({ type, finalSizes }) => {
        this.renderer.hideResizeGuide();
        const oldSizes = {};
        const indices = Object.keys(finalSizes).map(k => parseInt(k, 10));
        indices.forEach(idx => {
            if (type === 'col') oldSizes[idx] = this.renderer.columnWidths[idx];
            else oldSizes[idx] = this.renderer.rowHeights[idx];
        });
        const command = new ResizeCommand({
            type, indices, newSizes: finalSizes, oldSizes,
            fileManager: this.fileManager, renderer: this.renderer
        });
        this.historyManager.execute(command);
        this.renderer.cellGridContainer.focus();
    });

    this.selectionManager.on('activeCellChange', (cellId) => {
      this._updateFormulaBar();
      this._updateMetadata();
      // Also update status bar
      if (this.statusBar) {
        const data = {
          ranges: this.selectionManager.ranges,
          activeCell: this.selectionManager.activeCell
        };
        this.statusBar.updateSelection(data);
      }
    });
    this.selectionManager.on('selectionChange', () => {
      this._updateMetadata();
      // Also update status bar
      if (this.statusBar) {
        const data = {
          ranges: this.selectionManager.ranges,
          activeCell: this.selectionManager.activeCell
        };
        this.statusBar.updateSelection(data);
      }
    });

    // Editor callbacks removed - modes now handle commit/cancel

    this.renderer.cellGridContainer.tabIndex = 0;

    // Attach InputController for keyboard events
    this.inputController.attach();

    // Keep old keyboard handler for backwards compatibility during migration
    // this.renderer.cellGridContainer.addEventListener('keydown', (e) => this._handleGlobalKeydown(e));
  }

  _setupWorkerListeners() {
    if (!this.formulaWorker) return;
    this.formulaWorker.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'updates') {
        Object.entries(payload.updates).forEach(([cellId, value]) => {
          // Get rich text and style for proper rendering
          const richText = this.fileManager.getCellRichText(cellId);
          const cellStyle = this.fileManager.getCellStyle(cellId);

          this.renderer.updateCellContent(
            cellId,
            value,
            richText,
            cellStyle,
            this.fileManager.styleManager
          );
        });
      } else if (type === 'error') {
        Logger.error('Worker', payload.message);
      }
    };
  }

  _onDragMouseMove(e) {
    if (!this.isDraggingCells) return;
    // ... (Same ghost drag logic) ...
    // Re-implementing simplified ghost logic for completeness
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
      const { selection } = this.dragInfo;
      const rangeWidthCells = Math.abs(selection.end.col - selection.start.col);
      const rangeHeightCells = Math.abs(selection.end.row - selection.start.row);
      const targetStartCol = selection.start.col + colDiff;
      const targetStartRow = selection.start.row + rowDiff;
      const targetEndCol = targetStartCol + rangeWidthCells;
      const targetEndRow = targetStartRow + rangeHeightCells;

      let newWidthPx = 0;
      for(let c = targetStartCol; c <= targetEndCol; c++) {
          if (c >= 0 && c < this.config.cols) newWidthPx += (this.renderer.columnWidths[c] || this.config.defaultColWidth);
      }
      let newHeightPx = 0;
      for(let r = targetStartRow; r <= targetEndRow; r++) {
          if (r >= 1 && r <= this.config.rows) newHeightPx += (this.renderer.rowHeights[r - 1] || this.config.defaultRowHeight);
      }
      if (ghost && newWidthPx > 0 && newHeightPx > 0) {
          ghost.style.width = `${newWidthPx}px`;
          ghost.style.height = `${newHeightPx}px`;
      }
      const startCellEl = this.renderer.getCellElementByCoords(startCoords.row, startCoords.col);
      if (startCellEl && targetCell) {
        const startRect = startCellEl.getBoundingClientRect();
        const targetRect = targetCell.getBoundingClientRect();
        this.renderer.updateDragGhost(targetRect.left - startRect.left, targetRect.top - startRect.top);
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
        if (startCoords) {
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

  _onFillMouseMove(event) {
    if (!this.isFilling) return;
    this.fillHandle.updateDrag(event);
  }

  _onFillMouseUp(event) {
    if (!this.isFilling) return;

    window.removeEventListener('mousemove', this._onFillMouseMove);

    const result = this.fillHandle.endDrag(event);
    this.isFilling = false;

    if (result && result.targetRange) {
      this._executeFill(result);
    }
  }

  // ==========================================================================
  // LOGIC HELPERS
  // ==========================================================================

  _handleGlobalKeydown(e) {
    if (this.editor.isEditing) return; 

    const key = e.key.toLowerCase(); 
    const isCmd = e.metaKey || e.ctrlKey;
    const isShift = e.shiftKey;

    if (isCmd && key === 'z') {
      e.preventDefault();
      if (isShift) this.historyManager.redo();
      else this.historyManager.undo();
      return;
    }
    if (isCmd && key === 'y') {
      e.preventDefault();
      this.historyManager.redo();
      return;
    }
    if (isCmd && key === 'c') {
      e.preventDefault();
      this.clipboardManager.copy(this.selectionManager.ranges);
      return;
    }
    if (isCmd && key === 'v') {
      e.preventDefault();
      this._handlePaste();
      return;
    }
    if (isCmd && key === 'b') {
      e.preventDefault();
      this.applyRangeFormat({ font: { bold: true } }, 'toggle');
      return;
    }
    if (isCmd && key === 'i') {
      e.preventDefault();
      this.applyRangeFormat({ font: { italic: true } }, 'toggle');
      return;
    }

    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      e.preventDefault();
      const direction = e.key.replace('Arrow', '').toLowerCase();
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

    if (e.key === 'Enter') {
      e.preventDefault();
      const activeId = this.selectionManager.getActiveCellId();
      if (activeId) {
        const rawValue = this.fileManager.getRawCellValue(activeId);
        this.editor.startEdit(activeId, rawValue);
      }
      return;
    }
    
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      this._clearSelection();
      return;
    }

    if (e.key.length === 1 && !isCmd && !e.altKey) {
      const activeId = this.selectionManager.getActiveCellId();
      if (activeId) {
        e.preventDefault();
        this.editor.startEdit(activeId, '', e.key); 
      }
    }
  }

  applyRangeFormat(styleChanges, mode = 'set') {
    const cellIds = this.selectionManager.getSelectedCellIds();
    if (cellIds.length === 0) return;

    let finalStyle = styleChanges;

    // Toggle Logic
    if (mode === 'toggle') {
      const activeCellId = this.selectionManager.getActiveCellId();
      const activeStyle = this.fileManager.getCellStyle(activeCellId) || {};
      
      finalStyle = JSON.parse(JSON.stringify(styleChanges));

      const toggleRecursive = (target, source) => {
      for (const key in target) {
        if (typeof target[key] === 'object' && target[key] !== null) {
          // Always recurse into nested objects, passing source[key] if it exists
          toggleRecursive(target[key], source ? source[key] : undefined);
        } else {
          // Toggle: turn OFF if source has it, turn ON if source doesn't
          if (source && source[key]) {
            target[key] = false;
          } else {
            target[key] = true;
          }
        }
      }
    };
      toggleRecursive(finalStyle, activeStyle);
    }

    const command = new FormatRangeCommand({
      cellIds,
      styleChanges: finalStyle,
      fileManager: this.fileManager,
      renderer: this.renderer
    });

    this.historyManager.execute(command);
  }

  /**
   * Apply border formatting to current selection
   * @param {string[]} positions - Array of position names ['top', 'bottom', 'outer', etc.]
   * @param {Object|null} borderStyle - { style: 'solid', color: '#000', width: 1 } or null to clear
   */
  applyBorderFormat(positions, borderStyle) {
    const selection = this.selectionManager.ranges[this.selectionManager.ranges.length - 1];
    if (!selection) return;

    // Resolve positions to cell-specific changes
    const cellBorderChanges = BorderResolver.resolveBorderChanges(
      selection,
      positions,
      borderStyle
    );

    // If no changes, return early
    if (Object.keys(cellBorderChanges).length === 0) return;

    // Create and execute command
    const command = new BorderFormatCommand({
      cellBorderChanges,
      fileManager: this.fileManager,
      renderer: this.renderer
    });

    this.historyManager.execute(command);
  }

  /**
   * Executes a cell update with optional rich text formatting.
   * @param {string} cellId - The cell to update
   * @param {string} newValue - The new plain text value
   * @param {Array|null} newRichText - Optional rich text runs
   */
  _executeCellUpdate(cellId, newValue, newRichText = null) {
    const oldValue = this.fileManager.getRawCellValue(cellId);
    const oldRichText = this.fileManager.getCellRichText(cellId);

    // Check if anything changed
    if (newValue === oldValue && !newRichText && !oldRichText) return;

    const cellUpdate = {
      cellId,
      newValue,
      oldValue
    };

    // Include rich text if provided
    if (newRichText !== null || oldRichText !== null) {
      cellUpdate.newRichText = newRichText;
      cellUpdate.oldRichText = oldRichText;
    }

    const command = new UpdateCellsCommand({
      cellUpdates: [cellUpdate],
      fileManager: this.fileManager,
      formulaWorker: this.formulaWorker,
      renderer: this.renderer
    });

    this.historyManager.execute(command);
  }

  _handlePaste() {
    const activeCellCoords = this.selectionManager.activeCell;
    if (!activeCellCoords) return;

    // Pass current selection ranges to support fill range behavior
    const targetSelection = this.selectionManager.ranges;
    const updates = this.clipboardManager.getPasteUpdates(activeCellCoords, targetSelection);
    if (updates.length === 0) return;

    const cellUpdates = updates.map(update => ({
      cellId: update.cellId,
      newValue: update.value,
      newStyle: update.style, // Include Style
      newRichText: update.richText, // Include RichText
      oldValue: this.fileManager.getRawCellValue(update.cellId),
      oldStyle: this.fileManager.getCellStyle(update.cellId), // Capture Old Style for Undo
      oldRichText: this.fileManager.getCellRichText(update.cellId) // Capture Old RichText for Undo
    }));

    const command = new UpdateCellsCommand({
      cellUpdates,
      fileManager: this.fileManager,
      formulaWorker: this.formulaWorker,
      renderer: this.renderer // Pass renderer
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
        formulaWorker: this.formulaWorker,
        renderer: this.renderer
      });
      this.historyManager.execute(command);
    }
  }

  _updateFormulaBar() {
    if (!this.formulaBar) return;
    const cellId = this.selectionManager.getActiveCellId();
    if (cellId) {
      this.formulaBar.updateCellReference(cellId);
      // Only update formula input if editor is not currently active
      // This prevents overwriting in-progress edits when selection changes
      if (!this.editor.isVisible()) {
        const raw = this.fileManager.getRawCellValue(cellId);
        this.formulaBar.updateFormulaInput(raw);
      }
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

  _executeFill({ sourceSelection, targetRange, fillDirection, reverse }) {
    // Get source data
    const sourceData = this._getSourceDataForFill(sourceSelection);

    // Generate fill values
    const fillData = FillPatternDetector.generateFillData({
      sourceRange: sourceData,
      targetRange,
      fillDirection,
      reverse
    });

    // Apply formula adjustments
    const cellUpdates = fillData.map(fill => {
      let value = fill.value;

      // Adjust formula references if needed
      if (value && value.startsWith('=')) {
        const rowOffset = fill.targetRow - fill.sourceRow;
        const colOffset = fill.targetCol - fill.sourceCol;
        value = FormulaAdjuster.adjustFormula(value, rowOffset, colOffset);
      }

      return {
        cellId: fill.cellId,
        newValue: value,
        oldValue: this.fileManager.getRawCellValue(fill.cellId),
        newStyle: fill.style,
        oldStyle: this.fileManager.getCellStyle(fill.cellId)
      };
    });

    if (cellUpdates.length === 0) return;

    // Execute command
    const command = new FillRangeCommand({
      cellUpdates,
      fileManager: this.fileManager,
      formulaWorker: this.formulaWorker,
      renderer: this.renderer
    });

    this.historyManager.execute(command);

    // Expand selection to include filled cells
    this.selectionManager.selectCell(
      { row: targetRange.minRow, col: targetRange.minCol },
      false,
      false
    );
    this.selectionManager.selectCell(
      { row: targetRange.maxRow, col: targetRange.maxCol },
      true,
      false
    );
  }

  _getSourceDataForFill(sourceSelection) {
    const { minRow, maxRow, minCol, maxCol } = sourceSelection;
    const sourceData = [];

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const cellId = this._buildCellId(row, col);
        const value = this.fileManager.getRawCellValue(cellId);
        const style = this.fileManager.getCellStyle(cellId);

        sourceData.push({
          cellId,
          value: value || '',
          isFormula: value && value.startsWith('='),
          style,
          coords: { row, col }
        });
      }
    }

    return sourceData;
  }

  _executeMoveCommand(selection, colOffset, rowOffset, targetTopLeft) {
    const { start, end } = selection;
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);

    // 1. Collect data being moved (Value AND Style)
    const movedData = [];
    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        const cellId = this._buildCellId(row, col);
        const value = this.fileManager.getRawCellValue(cellId);
        const style = this.fileManager.getCellStyle(cellId);
        
        if ((value !== undefined && value !== '') || style) {
          movedData.push({ cellId, value, style });
        }
      }
    }

    if (movedData.length === 0) return;

    // 2. Collect data being overwritten at destination
    const overwrittenData = [];
    const targetMinCol = targetTopLeft.col;
    const targetMinRow = targetTopLeft.row;
    const width = maxCol - minCol;
    const height = maxRow - minRow;

    for (let col = targetMinCol; col <= targetMinCol + width; col++) {
      for (let row = targetMinRow; row <= targetMinRow + height; row++) {
        const cellId = this._buildCellId(row, col);
        const value = this.fileManager.getRawCellValue(cellId);
        const style = this.fileManager.getCellStyle(cellId);
        
        overwrittenData.push({ 
            cellId, 
            value: value || '',
            style: style // Store overwritten style
        });
      }
    }

    const command = new MoveRangeCommand({
      sourceRange: { minCol, maxCol, minRow, maxRow },
      targetTopLeft,
      movedData,
      overwrittenData,
      fileManager: this.fileManager,
      formulaWorker: this.formulaWorker,
      renderer: this.renderer // Pass renderer
    });

    this.historyManager.execute(command);

    const newStart = { col: start.col + colOffset, row: start.row + rowOffset };
    const newEnd = { col: end.col + colOffset, row: end.row + rowOffset };
    
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