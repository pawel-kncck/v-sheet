import { Command } from '../Command.js';

/**
 * UpdateCellsCommand - Handles all cell data mutations
 * Supports Value, Style, and Rich Text updates.
 */
export class UpdateCellsCommand extends Command {
  /**
   * @param {Object} params
   * @param {Array<Object>} params.cellUpdates - Each update: { cellId, newValue, oldValue, newStyle?, oldStyle?, newRichText?, oldRichText? }
   * @param {FileManager} params.fileManager
   * @param {Worker} params.formulaWorker
   * @param {GridRenderer} params.renderer - Required for visual style updates
   */
  constructor({ cellUpdates, fileManager, formulaWorker, renderer }) {
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
    this.renderer = renderer;
  }

  execute() {
    this._applyUpdates('new');
  }

  undo() {
    this._applyUpdates('old');
  }

  /**
   * Applies updates
   * @private
   * @param {string} prefix - 'new' or 'old'
   */
  _applyUpdates(prefix) {
    const valueKey = `${prefix}Value`;
    const styleKey = `${prefix}Style`;
    const richTextKey = `${prefix}RichText`;

    this.cellUpdates.forEach(update => {
      const { cellId } = update;
      const value = update[valueKey];
      const style = update[styleKey];
      const richText = update[richTextKey];

      let needsContentRerender = false;

      // 1. Update Value (Source of Truth & Worker)
      // Only update if value is provided (undefined means no change)
      if (value !== undefined) {
        this.fileManager.updateCellData(cellId, value);
        this._updateWorker(cellId, value);
        needsContentRerender = true;
      }

      // 2. Update Style (Source of Truth & Visuals)
      // Only update if style is provided
      if (style !== undefined) {
        this.fileManager.updateCellFormat(cellId, style);
        if (this.renderer) {
          this.renderer.updateCellStyle(cellId, style);
        }
      }

      // 3. Update Rich Text (Text-level formatting)
      // Only update if richText is provided (even null is a valid value to clear)
      if (richText !== undefined) {
        this.fileManager.updateCellRichText(cellId, richText);
        needsContentRerender = true;
      }

      // Re-render cell content if value or richText changed
      // This ensures rich text is preserved when value updates
      if (needsContentRerender && this.renderer) {
        const cellStyle = this.fileManager.getCellStyle(cellId);
        const displayValue = value !== undefined ? value : this.fileManager.getRawCellValue(cellId);
        // Always get richText from FileManager - it has processed styleIds
        // (updateCellRichText converts inline styles to styleIds)
        const currentRichText = this.fileManager.getCellRichText(cellId);

        this.renderer.updateCellContent(
          cellId,
          displayValue,
          currentRichText,
          cellStyle,
          this.fileManager.styleManager
        );
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