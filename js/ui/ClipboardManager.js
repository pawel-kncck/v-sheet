import { Logger } from '../engine/utils/Logger.js';

export class ClipboardManager {
  /**
   * @param {GridRenderer} gridRenderer - For visual feedback
   * @param {Function} dataGetter - Function(cellId) -> returns raw value/formula
   */
  constructor(gridRenderer, dataGetter) {
    this.renderer = gridRenderer;
    this.dataGetter = dataGetter;

    // Clipboard State
    this.clipboard = {
      data: null,      // Array of { cellId, value, relativePos }
      sourceRange: null, // { minRow, maxRow, minCol, maxCol }
      copiedCellIds: new Set() // Track IDs to clear visual classes later
    };

    // Callbacks
    this.callbacks = {
      onPaste: null // Fired when paste data is ready to be applied
    };

    Logger.log('ClipboardManager', 'Initialized');
  }

  /**
   * Copies the specified ranges to the clipboard.
   * @param {Array} ranges - Array of { start: {row, col}, end: {row, col} }
   */
  copy(ranges) {
    this.clearVisuals();

    if (!ranges || ranges.length === 0) return;

    // 1. Flatten ranges into a list of cells
    // For V1, we'll handle the primary (last selected) range for simplicity, 
    // or merge them. Let's assume single contiguous block for standard copy behavior.
    const primaryRange = ranges[ranges.length - 1];
    const { start, end } = primaryRange;

    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);

    const copiedData = [];
    const cellsForSystemClipboard = []; // 2D array for text conversion

    // Iterate row by row
    for (let r = minRow; r <= maxRow; r++) {
      const rowData = [];
      for (let c = minCol; c <= maxCol; c++) {
        const colLetter = String.fromCharCode(65 + c);
        const cellId = `${colLetter}${r}`;
        
        // Get raw data (formula or value)
        const rawValue = this.dataGetter(cellId);
        
        // Add to internal clipboard
        copiedData.push({
          originalCellId: cellId,
          value: rawValue,
          // Relative position from top-left of selection
          relativePos: { row: r - minRow, col: c - minCol }
        });

        // Add to system clipboard buffer
        rowData.push(rawValue || '');
        
        // Track for visuals
        this.clipboard.copiedCellIds.add(cellId);
      }
      cellsForSystemClipboard.push(rowData);
    }

    // 2. Update State
    this.clipboard.data = copiedData;
    this.clipboard.sourceRange = { minRow, maxRow, minCol, maxCol };

    // 3. Visual Feedback (Marching Ants)
    // We use the renderer to add the 'copy-source' class
    this.renderer.highlightCells(Array.from(this.clipboard.copiedCellIds), 'copy-source');

    // 4. System Clipboard (Text)
    this._writeToSystemClipboard(cellsForSystemClipboard);

    Logger.log('ClipboardManager', `Copied ${copiedData.length} cells`);
  }

  /**
   * Generates updates to paste data into a target location.
   * @param {Object} targetCell - { row, col } (Top-left of paste destination)
   * @returns {Array} Array of { cellId, value } to be applied
   */
  getPasteUpdates(targetCell) {
    if (!this.clipboard.data) {
      Logger.warn('ClipboardManager', 'Clipboard is empty');
      return [];
    }

    const updates = [];
    const { row: targetRow, col: targetCol } = targetCell;

    this.clipboard.data.forEach(item => {
      const destRow = targetRow + item.relativePos.row;
      const destCol = targetCol + item.relativePos.col;

      // Bounds check (assuming 100x26 grid for V1)
      // In a real app, we might ask the renderer/config for limits
      if (destRow > 100 || destCol >= 26) return;

      const colLetter = String.fromCharCode(65 + destCol);
      const destCellId = `${colLetter}${destRow}`;

      updates.push({
        cellId: destCellId,
        value: item.value // Note: In Epic 4, we will add formula adjustment logic here
      });
    });

    return updates;
  }

  /**
   * Clears the 'copy-source' visual indicators.
   */
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

  /**
   * Writes tab-delimited text to the system clipboard.
   * @private
   */
  async _writeToSystemClipboard(data2D) {
    try {
      const text = data2D.map(row => row.join('\t')).join('\n');
      await navigator.clipboard.writeText(text);
    } catch (err) {
      Logger.warn('ClipboardManager', 'Failed to write to system clipboard', err);
    }
  }
}