import { Command } from '../Command.js';

/**
 * ResizeCommand - Handles column/row resizing with Undo/Redo
 */
export class ResizeCommand extends Command {
  /**
   * @param {Object} params
   * @param {string} params.type - 'col' or 'row'
   * @param {Array<number>} params.indices - Indices of columns/rows being resized
   * @param {Object} params.newSizes - Map of index -> new size
   * @param {Object} params.oldSizes - Map of index -> old size
   * @param {FileManager} params.fileManager
   * @param {GridRenderer} params.renderer
   */
  constructor({ type, indices, newSizes, oldSizes, fileManager, renderer }) {
    super();
    this.type = type;
    this.indices = indices;
    this.newSizes = newSizes;
    this.oldSizes = oldSizes;
    this.fileManager = fileManager;
    this.renderer = renderer;
  }

  execute() {
    this._applySizes(this.newSizes);
  }

  undo() {
    this._applySizes(this.oldSizes);
  }

  /**
   * Applies size changes to renderer and fileManager
   * @private
   */
  _applySizes(sizes) {
    if (this.type === 'col') {
      // 1. Update Renderer State
      const currentWidths = [...this.renderer.columnWidths];
      this.indices.forEach((idx) => {
        currentWidths[idx] = sizes[idx];
      });
      
      // 2. Apply Visuals
      this.renderer.setColumnWidths(currentWidths);
      
      // 3. Persist Data
      if (this.fileManager) {
        this.fileManager.updateColumnWidths(currentWidths);
      }
    } else {
      // Row logic
      const currentHeights = [...this.renderer.rowHeights];
      this.indices.forEach((idx) => {
        currentHeights[idx] = sizes[idx];
      });
      
      this.renderer.setRowHeights(currentHeights);
      
      if (this.fileManager) {
        this.fileManager.updateRowHeights(currentHeights);
      }
    }
  }
}