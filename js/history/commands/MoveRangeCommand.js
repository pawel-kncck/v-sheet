import { Command } from '../Command.js';

/**
 * MoveRangeCommand - Handles drag-to-move operations
 * * This command manages moving a range of cells to a new location, including:
 * 1. Clearing the source cells
 * 2. Writing data to the target cells
 * 3. Handling undo/redo by restoring source data and any overwritten target data
 */
export class MoveRangeCommand extends Command {
  /**
   * @param {Object} params
   * @param {Object} params.sourceRange - { minCol, maxCol, minRow, maxRow }
   * @param {Object} params.targetTopLeft - { col, row } (Target drop position)
   * @param {Array} params.movedData - [{ cellId, value }, ...] (Data being moved)
   * @param {Array} params.overwrittenData - [{ cellId, value }, ...] (Data being overwritten at target)
   * @param {FileManager} params.fileManager
   * @param {Worker} params.formulaWorker
   */
  constructor({
    sourceRange,
    targetTopLeft,
    movedData,
    overwrittenData,
    fileManager,
    formulaWorker
  }) {
    super();
    this.sourceRange = sourceRange;
    this.targetTopLeft = targetTopLeft;
    this.movedData = movedData;
    this.overwrittenData = overwrittenData;
    this.fileManager = fileManager;
    this.formulaWorker = formulaWorker;
  }

  /**
   * Executes the move: clears source and populates target.
   */
  execute() {
    const updates = [];

    // 1. Clear source cells
    // We set them to empty string. We track what was there in this.movedData for undo.
    this.movedData.forEach(({ cellId }) => {
      updates.push({
        cellId,
        newValue: ''
      });
    });

    // 2. Write to target cells
    // Calculate the offset from the source range top-left
    const { col: targetCol, row: targetRow } = this.targetTopLeft;
    const { minCol, minRow } = this.sourceRange;

    this.movedData.forEach(({ cellId, value }) => {
      // Parse source cell coordinates to calculate relative position
      const coords = this._parseCellId(cellId);
      if (!coords) return;

      const offsetCol = coords.col - minCol;
      const offsetRow = coords.row - minRow;
      
      const newCol = targetCol + offsetCol;
      const newRow = targetRow + offsetRow;

      const targetCellId = this._buildCellId(newRow, newCol);

      updates.push({
        cellId: targetCellId,
        newValue: value
      });
    });

    // Apply all updates (clears and writes) in one go
    this._applyUpdates(updates);
  }

  /**
   * Reverses the move: restores moved data to source and overwritten data to target.
   */
  undo() {
    const updates = [];

    // 1. Restore source cells (put the moved data back)
    this.movedData.forEach(({ cellId, value }) => {
      updates.push({
        cellId,
        newValue: value
      });
    });

    // 2. Restore overwritten target cells (if any existed)
    // If nothing was overwritten, we still need to clear the target cells 
    // (which effectively restores them to "empty").
    // However, `overwrittenData` should capture specific values. 
    // Ideally, we also need to clear the *new* locations if they weren't overwriting anything.
    
    // Strategy: We essentially perform a "reverse move" logic or just restore explicitly known states.
    // The safest way for Undo is to restore EXACTLY what was known to be there.
    
    // First, assume everything at target needs to be cleared/reset to overwritten state.
    // But simpler: logic is "Write X to Location Y".
    // If we write the old "overwritten" values back to target, we are good.
    // BUT: what about target cells that were empty and are now filled?
    // We need to clear them. 
    
    // For V1 Simplicity: We will write back `overwrittenData`. 
    // NOTE: This implies `overwrittenData` must contain entries for EVERY cell in the target range, 
    // even if empty (value: ''). If the caller didn't provide empty entries, we might leave "ghosts".
    // Ensure the caller (Spreadsheet.js) populates overwrittenData for the whole range.
    
    this.overwrittenData.forEach(({ cellId, value }) => {
      updates.push({
        cellId,
        newValue: value
      });
    });

    this._applyUpdates(updates);
  }

  /**
   * Helper to send updates to FileManager and FormulaWorker
   * @private
   */
  _applyUpdates(updates) {
    updates.forEach(({ cellId, newValue }) => {
      // 1. Update FileManager (Source of Truth)
      this.fileManager.updateCellData(cellId, newValue);

      // 2. Update Worker (Calculation)
      // Normalize value
      const strValue = newValue === null || newValue === undefined ? '' : String(newValue);

      if (strValue === '') {
        this.formulaWorker.postMessage({
          type: 'clearCell',
          payload: { cellId },
        });
      } else if (strValue.startsWith('=')) {
        this.formulaWorker.postMessage({
          type: 'setFormula',
          payload: { cellId, formulaString: strValue },
        });
      } else {
        this.formulaWorker.postMessage({
          type: 'setCellValue',
          payload: { cellId, value: newValue },
        });
      }
    });
  }

  // --- Helpers ---

  /**
   * @param {string} cellId "A1"
   * @returns {Object} { row: 1, col: 0 }
   */
  _parseCellId(cellId) {
    const match = cellId.match(/([A-Z]+)(\d+)/);
    if (!match) return null;
    
    // Convert column letters to index (A=0, B=1)
    let col = 0;
    const chars = match[1];
    for (let i = 0; i < chars.length; i++) {
      col = col * 26 + (chars.charCodeAt(i) - 64);
    }
    
    return {
      col: col - 1,
      row: parseInt(match[2], 10)
    };
  }

  /**
   * @param {number} row 1-based index
   * @param {number} col 0-based index
   * @returns {string} "A1"
   */
  _buildCellId(row, col) {
    // Convert index to column letters
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