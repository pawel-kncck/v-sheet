import { Command } from '../Command.js';

/**
 * UpdateCellsCommand - Handles all cell data mutations
 * Now supports both Value and Style updates.
 */
export class UpdateCellsCommand extends Command {
  /**
   * @param {Object} params
   * @param {Array<Object>} params.cellUpdates - Each update: { cellId, newValue, oldValue, newStyle?, oldStyle? }
   * @param {FileManager} params.fileManager
   * @param {Worker} params.formulaWorker
   * @param {GridRenderer} params.renderer - Required for visual style updates
   */
  constructor({ cellUpdates, fileManager, formulaWorker, renderer }) {
    super();

    if (!cellUpdates || cellUpdates.length === 0) {
      throw new Error('UpdateCellsCommand requires at least one cell update');
    }

    this.cellUpdates = cellUpdates;
    this.fileManager = fileManager;
    this.formulaWorker = formulaWorker;
    this.renderer = renderer;
  }

  execute() {
    this._applyUpdates('newValue', 'newStyle');
  }

  undo() {
    this._applyUpdates('oldValue', 'oldStyle');
  }

  /**
   * Applies updates
   * @private
   */
  _applyUpdates(valueKey, styleKey) {
    this.cellUpdates.forEach(update => {
      const { cellId } = update;
      const value = update[valueKey];
      const style = update[styleKey];

      // 1. Update Value (Source of Truth & Worker)
      // Only update if value is provided (undefined means no change)
      if (value !== undefined) {
        this.fileManager.updateCellData(cellId, value);
        this._updateWorker(cellId, value);
      }

      // 2. Update Style (Source of Truth & Visuals)
      // Only update if style is provided
      if (style !== undefined) {
        this.fileManager.updateCellFormat(cellId, style);
        if (this.renderer) {
          this.renderer.updateCellStyle(cellId, style);
        }
      }
    });
  }

  _updateWorker(cellId, value) {
    const stringValue = value === null || value === undefined ? '' : String(value);

    if (stringValue === '') {
      this.formulaWorker.postMessage({
        type: 'clearCell',
        payload: { cellId },
      });
    } else if (stringValue.startsWith('=')) {
      this.formulaWorker.postMessage({
        type: 'setFormula',
        payload: { cellId, formulaString: stringValue },
      });
    } else {
      this.formulaWorker.postMessage({
        type: 'setCellValue',
        payload: { cellId, value: value },
      });
    }
  }
}