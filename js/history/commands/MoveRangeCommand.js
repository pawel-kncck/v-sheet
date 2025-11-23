import { Command } from '../Command.js';

/**
 * MoveRangeCommand - Handles drag-to-move operations
 * Now moves both Values and Styles.
 */
export class MoveRangeCommand extends Command {
  /**
   * @param {Object} params
   * @param {Object} params.sourceRange
   * @param {Object} params.targetTopLeft
   * @param {Array} params.movedData - [{ cellId, value, style }, ...]
   * @param {Array} params.overwrittenData - [{ cellId, value, style }, ...]
   * @param {FileManager} params.fileManager
   * @param {Worker} params.formulaWorker
   * @param {GridRenderer} params.renderer
   */
  constructor({
    sourceRange,
    targetTopLeft,
    movedData,
    overwrittenData,
    fileManager,
    formulaWorker,
    renderer
  }) {
    super();
    this.sourceRange = sourceRange;
    this.targetTopLeft = targetTopLeft;
    this.movedData = movedData;
    this.overwrittenData = overwrittenData;
    this.fileManager = fileManager;
    this.formulaWorker = formulaWorker;
    this.renderer = renderer;
  }

  execute() {
    const updates = [];

    // 1. Clear source cells
    this.movedData.forEach(({ cellId }) => {
      updates.push({
        cellId,
        newValue: '',
        newStyle: null // Clear style
      });
    });

    // 2. Write to target cells
    const { col: targetCol, row: targetRow } = this.targetTopLeft;
    const { minCol, minRow } = this.sourceRange;

    this.movedData.forEach(({ cellId, value, style }) => {
      const coords = this._parseCellId(cellId);
      if (!coords) return;

      const offsetCol = coords.col - minCol;
      const offsetRow = coords.row - minRow;
      
      const newCol = targetCol + offsetCol;
      const newRow = targetRow + offsetRow;

      const targetCellId = this._buildCellId(newRow, newCol);

      updates.push({
        cellId: targetCellId,
        newValue: value,
        newStyle: style // Move style
      });
    });

    this._applyUpdates(updates);
  }

  undo() {
    const updates = [];

    // 1. Restore source cells
    this.movedData.forEach(({ cellId, value, style }) => {
      updates.push({
        cellId,
        newValue: value,
        newStyle: style
      });
    });

    // 2. Restore overwritten target cells
    this.overwrittenData.forEach(({ cellId, value, style }) => {
      updates.push({
        cellId,
        newValue: value,
        newStyle: style
      });
    });

    this._applyUpdates(updates);
  }

  _applyUpdates(updates) {
    updates.forEach(({ cellId, newValue, newStyle }) => {
      // Value Update
      this.fileManager.updateCellData(cellId, newValue);
      
      // Worker Update
      const strValue = newValue === null || newValue === undefined ? '' : String(newValue);
      if (strValue === '') {
        this.formulaWorker.postMessage({ type: 'clearCell', payload: { cellId } });
      } else if (strValue.startsWith('=')) {
        this.formulaWorker.postMessage({ type: 'setFormula', payload: { cellId, formulaString: strValue } });
      } else {
        this.formulaWorker.postMessage({ type: 'setCellValue', payload: { cellId, value: newValue } });
      }

      // Style Update
      // We always apply style if property exists in update object
      if (newStyle !== undefined) {
          this.fileManager.updateCellFormat(cellId, newStyle);
          if (this.renderer) {
              this.renderer.updateCellStyle(cellId, newStyle);
          }
      }
    });
  }

  _parseCellId(cellId) {
    const match = cellId.match(/([A-Z]+)(\d+)/);
    if (!match) return null;
    let col = 0;
    const chars = match[1];
    for (let i = 0; i < chars.length; i++) col = col * 26 + (chars.charCodeAt(i) - 64);
    return { col: col - 1, row: parseInt(match[2], 10) };
  }

  _buildCellId(row, col) {
    let letter = '';
    let tempCol = col + 1;
    while (tempCol > 0) {
      let remainder = (tempCol - 1) % 26;
      letter = String.fromCharCode(65 + remainder) + letter;
      tempCol = Math.floor((tempCol - 1) / 26);
    }
    return `${letter}${row}`;
  }
}