import { Logger } from '../engine/utils/Logger.js';
import { FormulaAdjuster } from '../engine/utils/FormulaAdjuster.js';

export class ClipboardManager {
  /**
   * @param {GridRenderer} gridRenderer
   * @param {Function} dataGetter - Function(cellId) -> { value, style }
   * @param {SelectionManager} selectionManager - Optional selection manager for getting ranges
   * Updated signature: dataGetter now returns object with value AND style
   */
  constructor(gridRenderer, dataGetter, selectionManager = null) {
    this.renderer = gridRenderer;
    this.dataGetter = dataGetter;
    this.selectionManager = selectionManager;

    this.clipboard = {
      data: null,
      sourceRange: null,
      copiedCellIds: new Set(),
      isCut: false
    };
  }

  copy(ranges = null) {
    this.clearVisuals();

    // If no ranges provided, get from SelectionManager
    if (!ranges && this.selectionManager) {
      ranges = this.selectionManager.ranges;
    }

    console.log('[ClipboardManager] copy() called, ranges:', JSON.stringify(ranges));

    if (!ranges || ranges.length === 0) return;

    const primaryRange = ranges[ranges.length - 1];
    const { start, end } = primaryRange;

    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);

    console.log('[ClipboardManager] Range: minRow=', minRow, 'maxRow=', maxRow, 'minCol=', minCol, 'maxCol=', maxCol);

    const copiedData = [];
    const cellsForSystemClipboard = [];

    for (let r = minRow; r <= maxRow; r++) {
      const rowData = [];
      for (let c = minCol; c <= maxCol; c++) {
        const cellId = this._coordsToCellId(r, c);

        // UPDATED: Get both Value and resolved Style Object
        const cellData = this.dataGetter(cellId);

        console.log('[ClipboardManager] Getting data for', cellId, ':', cellData.value);

        copiedData.push({
          originalCellId: cellId,
          value: cellData.value,
          style: cellData.style, // <--- Store full style object
          relativePos: { row: r - minRow, col: c - minCol }
        });

        rowData.push(cellData.value || '');
        this.clipboard.copiedCellIds.add(cellId);
      }
      cellsForSystemClipboard.push(rowData);
    }

    this.clipboard.data = copiedData;
    this.clipboard.sourceRange = { minRow, maxRow, minCol, maxCol };

    this.renderer.highlightCells(Array.from(this.clipboard.copiedCellIds), 'copy-source');
    this._writeToSystemClipboard(cellsForSystemClipboard);

    Logger.log('ClipboardManager', `Copied ${copiedData.length} cells`);
  }

  /**
   * Returns data for paste operation
   * @returns {Array} Array of { cellId, value, style }
   */
  getPasteUpdates(targetCell) {
    if (!this.clipboard.data) return [];

    const updates = [];
    const { row: targetRow, col: targetCol } = targetCell;

    // Calculate offsets from source to destination
    const sourceRow = this.clipboard.sourceRange.minRow;
    const sourceCol = this.clipboard.sourceRange.minCol;
    const rowOffset = targetRow - sourceRow;
    const colOffset = targetCol - sourceCol;

    console.log('[ClipboardManager] paste() target:', targetCell, 'offsets:', rowOffset, colOffset);
    console.log('[ClipboardManager] clipboard.data:', JSON.stringify(this.clipboard.data));

    this.clipboard.data.forEach(item => {
      const destRow = targetRow + item.relativePos.row;
      const destCol = targetCol + item.relativePos.col;

      // Simple bounds check
      if (destRow > 100 || destCol >= 26) return;

      const destCellId = this._coordsToCellId(destRow, destCol);

      let value = item.value;

      // Adjust formula references if this is a formula
      if (typeof value === 'string' && value.startsWith('=')) {
        value = FormulaAdjuster.adjustFormula(value, rowOffset, colOffset);
      }

      updates.push({
        cellId: destCellId,
        value: value,
        style: item.style // <--- Pass style along
      });
    });

    return updates;
  }

  /**
   * Paste clipboard data to active cell
   * @returns {Array} Array of { cellId, value, style } updates
   */
  paste() {
    if (!this.clipboard.data || !this.selectionManager) {
      Logger.warn('ClipboardManager', 'Cannot paste: no data or no selection');
      return [];
    }

    const activeCellCoords = this.selectionManager.activeCell;
    if (!activeCellCoords) return [];

    return this.getPasteUpdates(activeCellCoords);
  }

  /**
   * Cut selected cells (copy + mark for deletion)
   * @param {Array} ranges - Optional ranges to cut (defaults to current selection)
   */
  cut(ranges = null) {
    // Copy first
    this.copy(ranges);
    // Mark for cut (delete after paste)
    this.clipboard.isCut = true;
    Logger.log('ClipboardManager', 'Cut operation - cells marked for removal');
  }

  // ... existing helpers ...

  clearVisuals() {
    if (this.clipboard.copiedCellIds.size > 0) {
      const cellsToRemove = Array.from(this.clipboard.copiedCellIds);
      cellsToRemove.forEach(cellId => {
        const el = this.renderer.getCellElement(cellId);
        if (el) el.classList.remove('copy-source');
      });
      this.clipboard.copiedCellIds.clear();
    }
  }

  async _writeToSystemClipboard(data2D) {
    try {
      const text = data2D.map(row => row.join('\t')).join('\n');
      await navigator.clipboard.writeText(text);
    } catch (err) {
      Logger.warn('ClipboardManager', 'System clipboard write failed', err);
    }
  }

  _coordsToCellId(row, col) {
    const colLetter = String.fromCharCode(65 + col);
    return `${colLetter}${row}`;
  }
}