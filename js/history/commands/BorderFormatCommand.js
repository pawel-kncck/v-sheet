import { Command } from '../Command.js';

/**
 * BorderFormatCommand
 * Handles applying border changes to cells.
 * Supports Undo/Redo by tracking the old and new style IDs for each affected cell.
 */
export class BorderFormatCommand extends Command {
  /**
   * @param {Object} params
   * @param {Object} params.cellBorderChanges - Map of cellId → { border: { top?, right?, bottom?, left? } }
   * @param {FileManager} params.fileManager
   * @param {GridRenderer} params.renderer
   */
  constructor({ cellBorderChanges, fileManager, renderer }) {
    super();
    this.cellBorderChanges = cellBorderChanges;
    this.fileManager = fileManager;
    this.renderer = renderer;

    // Prepare state for Undo/Redo
    this.backupData = []; // Stores { cellId, oldStyleId, newStyleId }
  }

  execute() {
    // 1. On first execution, calculate and store the state changes
    if (this.backupData.length === 0) {
      this._prepareData();
    }

    // 2. Apply the NEW style IDs
    this.backupData.forEach(({ cellId, newStyleId }) => {
      // Update Data
      this._updateCellData(cellId, newStyleId);

      // Update Visuals
      const styleObject = this.fileManager.styleManager.getStyle(newStyleId);
      this.renderer.updateCellStyle(cellId, styleObject);
    });
  }

  undo() {
    // Restore the OLD style IDs
    this.backupData.forEach(({ cellId, oldStyleId }) => {
      // Update Data
      this._updateCellData(cellId, oldStyleId);

      // Update Visuals
      const styleObject = this.fileManager.styleManager.getStyle(oldStyleId);
      this.renderer.updateCellStyle(cellId, styleObject);
    });
  }

  // --- Helpers ---

  _prepareData() {
    Object.entries(this.cellBorderChanges).forEach(([cellId, changes]) => {
      // 1. Get current state
      const oldStyleObject = this.fileManager.getCellStyle(cellId) || {};
      const cellData = this.fileManager.getCurrentFileData().cells[cellId];
      const oldStyleId = cellData ? cellData.styleId : null;

      // 2. Merge border changes into existing style
      const newStyleObject = this._deepMerge({}, oldStyleObject, changes);

      // 3. Clean up null borders (remove them from the object)
      if (newStyleObject.border) {
        newStyleObject.border = this._cleanBorders(newStyleObject.border);
        // If no borders left, remove the border property entirely
        if (Object.keys(newStyleObject.border).length === 0) {
          delete newStyleObject.border;
        }
      }

      // 4. Get (or create) the ID for this new style via the Flyweight StyleManager
      const newStyleId = this.fileManager.styleManager.addStyle(newStyleObject);

      this.backupData.push({
        cellId,
        oldStyleId,
        newStyleId
      });
    });
  }

  _updateCellData(cellId, styleId) {
    const cells = this.fileManager.currentFile.data.cells;

    if (!cells[cellId]) {
      cells[cellId] = {};
    }

    if (styleId) {
      cells[cellId].styleId = styleId;
    } else {
      delete cells[cellId].styleId;
      // Cleanup empty cell objects if no value exists
      if (cells[cellId].value === undefined && cells[cellId].formula === undefined) {
        delete cells[cellId];
      }
    }

    this.fileManager.markAsModified();
    this.fileManager.queueAutosave();
  }

  /**
   * Remove null border sides from border object
   */
  _cleanBorders(border) {
    const cleaned = {};
    for (const side of ['top', 'right', 'bottom', 'left']) {
      if (border[side] !== null && border[side] !== undefined) {
        cleaned[side] = border[side];
      }
    }
    return cleaned;
  }

  _deepMerge(target, ...sources) {
    sources.forEach(source => {
      if (!source) return;
      Object.keys(source).forEach(key => {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key]) target[key] = {};
          this._deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      });
    });
    return target;
  }
}
