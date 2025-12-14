import { Command } from '../Command.js';

/**
 * FormatTextCommand
 * Handles applying text-level formatting changes within a cell.
 * Supports Undo/Redo by tracking the old and new rich text runs.
 */
export class FormatTextCommand extends Command {
  /**
   * @param {Object} params
   * @param {string} params.cellId - The cell to format
   * @param {string} params.value - The plain text value
   * @param {Array} params.newRichText - New rich text runs
   * @param {Array} params.oldRichText - Old rich text runs (for undo)
   * @param {FileManager} params.fileManager
   * @param {GridRenderer} params.renderer
   */
  constructor({ cellId, value, newRichText, oldRichText, fileManager, renderer }) {
    super();
    this.cellId = cellId;
    this.value = value;
    this.newRichText = newRichText;
    this.oldRichText = oldRichText;
    this.fileManager = fileManager;
    this.renderer = renderer;
  }

  execute() {
    this._applyRichText(this.newRichText);
  }

  undo() {
    this._applyRichText(this.oldRichText);
  }

  /**
   * Applies rich text runs to the cell
   * @private
   * @param {Array|null} richText - Rich text runs to apply
   */
  _applyRichText(richText) {
    const cells = this.fileManager.currentFile.data.cells;

    if (!cells[this.cellId]) {
      cells[this.cellId] = {};
    }

    // Update rich text runs
    if (richText && richText.length > 0) {
      // Convert inline styles to styleIds
      const processedRuns = this._processRichTextRuns(richText);
      cells[this.cellId].richText = processedRuns;
    } else {
      // Remove rich text (cell becomes plain text)
      delete cells[this.cellId].richText;
    }

    // Update visual rendering
    const cellStyle = this.fileManager.getCellStyle(this.cellId);
    const styleManager = this.fileManager.styleManager;

    this.renderer.updateCellContent(
      this.cellId,
      this.value,
      richText,
      cellStyle,
      styleManager
    );

    // Mark as modified and queue autosave
    this.fileManager.markAsModified();
    this.fileManager.queueAutosave();
  }

  /**
   * Processes rich text runs, converting inline styles to styleIds
   * @private
   * @param {Array} runs - Raw rich text runs (may have inline styles)
   * @returns {Array} Processed runs with styleIds
   */
  _processRichTextRuns(runs) {
    const styleManager = this.fileManager.styleManager;

    return runs.map(run => {
      const processedRun = {
        start: run.start,
        end: run.end
      };

      // If run has inline style, convert to styleId
      if (run.style) {
        const styleId = styleManager.addStyle(run.style);
        processedRun.styleId = styleId;
      } else if (run.styleId) {
        // Already has styleId
        processedRun.styleId = run.styleId;
      }
      // If no style, run inherits from cell style (no styleId needed)

      return processedRun;
    });
  }
}
