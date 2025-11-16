import { Command } from '../Command.js';

/**
 * UpdateCellsCommand - Handles all cell data mutations
 *
 * This unified command handles:
 * - Single cell edits (typing in a cell)
 * - Multi-cell clears (selecting range and pressing Delete)
 * - Paste operations (pasting data into cells)
 *
 * The command maintains synchronization across three layers:
 * 1. FileManager (source of truth for raw data)
 * 2. FormulaWorker (calculation engine)
 * 3. DOM (visual representation)
 */
export class UpdateCellsCommand extends Command {
  /**
   * @param {Object} params
   * @param {Array<Object>} params.cellUpdates - Array of cell changes
   *   Each update: { cellId: 'A1', newValue: '=B1+C1', oldValue: '5' }
   * @param {FileManager} params.fileManager - Reference to file manager
   * @param {Worker} params.formulaWorker - Reference to formula worker
   */
  constructor({ cellUpdates, fileManager, formulaWorker }) {
    super();

    if (!cellUpdates || cellUpdates.length === 0) {
      throw new Error('UpdateCellsCommand requires at least one cell update');
    }

    if (!fileManager) {
      throw new Error('UpdateCellsCommand requires fileManager');
    }

    if (!formulaWorker) {
      throw new Error('UpdateCellsCommand requires formulaWorker');
    }

    this.cellUpdates = cellUpdates;
    this.fileManager = fileManager;
    this.formulaWorker = formulaWorker;
  }

  /**
   * Execute the command - apply new values
   */
  execute() {
    this._applyUpdates('newValue');
  }

  /**
   * Undo the command - restore old values
   */
  undo() {
    this._applyUpdates('oldValue');
  }

  /**
   * Applies updates to both fileManager and worker
   * @private
   * @param {string} valueKey - Either 'newValue' or 'oldValue'
   */
  _applyUpdates(valueKey) {
    this.cellUpdates.forEach(({ cellId, [valueKey]: value }) => {
      // 1. Update fileManager (source of truth)
      //    This triggers autosave and keeps the data layer in sync
      this.fileManager.updateCellData(cellId, value);

      // 2. Update worker (calculation engine)
      //    This triggers formula parsing, evaluation, and dependency recalculation
      this._updateWorker(cellId, value);
    });

    // Note: The worker will asynchronously send back an 'updates' message
    // which triggers spreadsheet._applyUpdates() to update the DOM.
    // This happens in ~10-50ms and maintains the 3-tier sync.
  }

  /**
   * Sends appropriate message to worker based on value type
   * @private
   * @param {string} cellId - The cell being updated (e.g., 'A1')
   * @param {*} value - The new value (can be string, number, or empty)
   */
  _updateWorker(cellId, value) {
    // Normalize value to string for comparison
    const stringValue =
      value === null || value === undefined ? '' : String(value);

    if (stringValue === '') {
      // Empty value - clear the cell completely
      // This removes it from the dependency graph and sets calculated value to undefined
      this.formulaWorker.postMessage({
        type: 'clearCell',
        payload: { cellId },
      });
    } else if (stringValue.startsWith('=')) {
      // Formula - send to worker for parsing and evaluation
      // Worker will parse AST, build dependencies, calculate, and return result
      this.formulaWorker.postMessage({
        type: 'setFormula',
        payload: { cellId, formulaString: stringValue },
      });
    } else {
      // Raw value (number, text, boolean)
      // Worker stores it directly and recalculates any dependents
      this.formulaWorker.postMessage({
        type: 'setCellValue',
        payload: { cellId, value: value },
      });
    }
  }
}
