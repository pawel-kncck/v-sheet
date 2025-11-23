import { Logger } from '../engine/utils/Logger.js';

export class ClipboardManager {
  /**
   * @param {GridRenderer} gridRenderer
   * @param {Function} dataGetter - Function(cellId) -> { value, style }
   * Updated signature: dataGetter now returns object with value AND style
   */
  constructor(gridRenderer, dataGetter) {
    this.renderer = gridRenderer;
    this.dataGetter = dataGetter;

    this.clipboard = {
      data: null,      
      sourceRange: null,
      copiedCellIds: new Set() 
    };
  }

  copy(ranges) {
    this.clearVisuals();
    if (!ranges || ranges.length === 0) return;

    const primaryRange = ranges[ranges.length - 1];
    const { start, end } = primaryRange;

    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);

    const copiedData = [];
    const cellsForSystemClipboard = [];

    for (let r = minRow; r <= maxRow; r++) {
      const rowData = [];
      for (let c = minCol; c <= maxCol; c++) {
        const cellId = this._coordsToCellId(r, c);
        
        // UPDATED: Get both Value and resolved Style Object
        const cellData = this.dataGetter(cellId); 
        
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

    this.clipboard.data.forEach(item => {
      const destRow = targetRow + item.relativePos.row;
      const destCol = targetCol + item.relativePos.col;

      // Simple bounds check
      if (destRow > 100 || destCol >= 26) return;

      const destCellId = this._coordsToCellId(destRow, destCol);

      updates.push({
        cellId: destCellId,
        value: item.value,
        style: item.style // <--- Pass style along
      });
    });

    return updates;
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