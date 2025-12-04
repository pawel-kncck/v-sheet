import { Logger } from '../engine/utils/Logger.js';

/**
 * EditorManager - "Dumb" DOM controller for the cell editor.
 *
 * Responsibilities:
 * - Position and show/hide the editor
 * - Sync styles with the cell being edited
 * - Provide getValue/setValue for modes to query/set editor content
 *
 * Does NOT handle:
 * - Keyboard events (handled by InputController)
 * - Business logic (handled by modes)
 * - State transitions (handled by ModeManager)
 */
export class EditorManager {
  /**
   * @param {GridRenderer} gridRenderer
   */
  constructor(gridRenderer) {
    this.renderer = gridRenderer;
    this.cellEditor = document.getElementById('cell-editor');

    if (!this.cellEditor) {
      Logger.error('EditorManager', 'Cell editor input (#cell-editor) not found');
    }

    // State
    this.isEditing = false;
    this.editingCellId = null; // "A1"

    Logger.log('EditorManager', 'Initialized (Mode-based)');
  }

  /**
   * Starts the editing process for a specific cell.
   * @param {string} cellId - The ID of the cell to edit (e.g., "A1")
   * @param {string} initialValue - The value to populate (formula or raw text)
   * @param {string} [triggerKey] - If user pressed a key to start (e.g., "a"), start with that.
   */
  startEdit(cellId, initialValue = '', triggerKey = null) {
    const cellElement = this.renderer.getCellElement(cellId);
    if (!cellElement) return;

    this.isEditing = true;
    this.editingCellId = cellId;

    // 1. Position the editor over the cell
    const gridContainer = this.renderer.cellGridContainer;
    const cellRect = cellElement.getBoundingClientRect();

    // Calculate offsets based on scroll position
    const scrollLeft = gridContainer.scrollLeft;
    const scrollTop = gridContainer.scrollTop;

    this.cellEditor.style.left = `${cellElement.offsetLeft - scrollLeft}px`;
    this.cellEditor.style.top = `${cellElement.offsetTop - scrollTop}px`;
    this.cellEditor.style.width = `${cellRect.width}px`;
    this.cellEditor.style.height = `${cellRect.height}px`;
    this.cellEditor.style.display = 'block';

    // Sync styles from cell
    const computedStyle = window.getComputedStyle(cellElement);
    this.cellEditor.style.fontFamily = computedStyle.fontFamily;
    this.cellEditor.style.fontSize = computedStyle.fontSize;
    this.cellEditor.style.fontWeight = computedStyle.fontWeight;
    this.cellEditor.style.fontStyle = computedStyle.fontStyle;
    this.cellEditor.style.color = computedStyle.color;
    this.cellEditor.style.textAlign = computedStyle.textAlign;
    this.cellEditor.style.backgroundColor = computedStyle.backgroundColor;

    // 2. Set Value
    this.cellEditor.value = triggerKey ? triggerKey : initialValue;

    // 3. Visuals
    cellElement.classList.add('editing');

    // If not a trigger key start (e.g. double click), select all text
    if (!triggerKey) {
      setTimeout(() => {
        this.cellEditor.select();
      }, 0);
    }

    Logger.log('EditorManager', `Started edit for ${cellId}`);
  }

  /**
   * Hides the editor without committing.
   * Modes are responsible for committing values.
   */
  hide() {
    if (this.editingCellId) {
      const cell = this.renderer.getCellElement(this.editingCellId);
      if (cell) cell.classList.remove('editing');
    }

    this.isEditing = false;
    this.editingCellId = null;
    this.cellEditor.style.display = 'none';
    this.cellEditor.value = '';

    // Reset styles to avoid leaking to next edit
    this.cellEditor.style.fontFamily = '';
    this.cellEditor.style.fontSize = '';
    this.cellEditor.style.fontWeight = '';
    this.cellEditor.style.fontStyle = '';
    this.cellEditor.style.color = '';
    this.cellEditor.style.textAlign = '';
    this.cellEditor.style.backgroundColor = '';

    this.renderer.cellGridContainer.focus();

    Logger.log('EditorManager', 'Editor hidden');
  }

  /**
   * Focuses the editor input.
   */
  focus() {
    if (this.cellEditor) {
      this.cellEditor.focus();
    }
  }

  /**
   * Gets the current value in the editor.
   * @returns {string}
   */
  getValue() {
    return this.cellEditor ? this.cellEditor.value : '';
  }

  /**
   * Sets the value in the editor.
   * @param {string} value
   */
  setValue(value) {
    if (this.cellEditor) {
      this.cellEditor.value = value;
    }
  }

  /**
   * Checks if the editor is currently visible.
   * @returns {boolean}
   */
  isVisible() {
    return this.isEditing;
  }
}