import { Command } from '../Command.js';

/**
 * FormatRangeCommand
 * Handles applying formatting changes to a range of cells.
 * Supports Undo/Redo by tracking the old and new style IDs for each affected cell.
 */
export class FormatRangeCommand extends Command {
  /**
   * @param {Object} params
   * @param {Array<string>} params.cellIds - List of cell IDs to format
   * @param {Object} params.styleChanges - The style changes to apply (e.g. { font: { bold: true } })
   * @param {FileManager} params.fileManager
   * @param {GridRenderer} params.renderer
   */
  constructor({ cellIds, styleChanges, fileManager, renderer }) {
    super();
    this.cellIds = cellIds;
    this.styleChanges = styleChanges;
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
      // Note: getStyle returns null if ID is null/undefined, which clears the style
      const styleObject = this.fileManager.styleManager.getStyle(oldStyleId);
      this.renderer.updateCellStyle(cellId, styleObject);
    });
  }

  // --- Helpers ---

  _prepareData() {
    this.cellIds.forEach(cellId => {
      // 1. Get current state
      const oldStyleObject = this.fileManager.getCellStyle(cellId) || {};
      // We need the ID specifically for the data layer
      const cellData = this.fileManager.getCurrentFileData().cells[cellId];
      const oldStyleId = cellData ? cellData.styleId : null;

      // 2. Merge changes to create new state
      // Deep merge logic is needed for nested objects like { font: { bold: true } }
      const newStyleObject = this._deepMerge({}, oldStyleObject, this.styleChanges);

      // 3. Get (or create) the ID for this new style via the Flyweight StyleManager
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
    // Note: We don't trigger a full save here for performance, 
    // we rely on the caller or batch these updates in a real app. 
    // For V1, we'll assumeFileManager.markAsModified() is called by the HistoryManager or Coordinator.
    this.fileManager.markAsModified(); 
    this.fileManager.queueAutosave();
  }

  _deepMerge(target, ...sources) {
    // Simple recursive merge for style objects
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