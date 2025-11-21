import { Logger } from '../engine/utils/Logger.js';

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
    this.isIntentionalEdit = false; // True if user typed a char, False if just double-clicked/Enter

    // Callbacks
    this.callbacks = {
      onCommit: null, // Fired when user saves (Enter, Tab, click away)
      onCancel: null  // Fired on Escape
    };

    this._bindEvents();
    Logger.log('EditorManager', 'Initialized');
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
    this.isIntentionalEdit = !!triggerKey;

    // 1. Position the editor over the cell
    // We need to calculate position relative to the scrolled grid container
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

    // 2. Set Value
    // If triggerKey exists (e.g., user typed '5'), replace value. Otherwise use existing.
    this.cellEditor.value = triggerKey ? triggerKey : initialValue;

    // 3. Visuals
    cellElement.classList.add('editing');
    this.cellEditor.focus();
    
    // If not a trigger key start (e.g. double click), select all text
    if (!triggerKey) {
      // Timeout ensures focus logic completes before selection
      setTimeout(() => {
        this.cellEditor.select();
      }, 0);
    }
  }

  /**
   * Commits the current value and closes the editor.
   * @param {string} moveDirection - Optional direction to move after commit ('down', 'right', 'none')
   */
  commitEdit(moveDirection = 'down') {
    if (!this.isEditing) return;

    const newValue = this.cellEditor.value;
    const cellId = this.editingCellId;

    this._closeEditor();

    if (this.callbacks.onCommit) {
      this.callbacks.onCommit({ 
        cellId, 
        value: newValue,
        moveDirection
      });
    }
  }

  /**
   * Cancels editing without saving changes.
   */
  cancelEdit() {
    if (!this.isEditing) return;
    
    this._closeEditor();
    
    if (this.callbacks.onCancel) {
      this.callbacks.onCancel();
    }
  }

  /**
   * Internal cleanup to hide the editor.
   * @private
   */
  _closeEditor() {
    if (this.editingCellId) {
      const cell = this.renderer.getCellElement(this.editingCellId);
      if (cell) cell.classList.remove('editing');
    }

    this.isEditing = false;
    this.editingCellId = null;
    this.cellEditor.style.display = 'none';
    this.cellEditor.value = '';
    
    // Return focus to the grid so keyboard nav works immediately
    this.renderer.cellGridContainer.focus();
  }

  _bindEvents() {
    // Handle keys inside the input
    this.cellEditor.addEventListener('keydown', (e) => {
      const key = e.key;

      if (key === 'Enter') {
        e.preventDefault();
        this.commitEdit('down'); // Default Excel behavior
      } else if (key === 'Tab') {
        e.preventDefault();
        this.commitEdit('right');
      } else if (key === 'Escape') {
        e.preventDefault();
        this.cancelEdit();
      }
      // Note: Arrow keys currently just move cursor in input.
      // In "Formula Building UX" epic, this is where we will inject logic 
      // to let arrows navigate the grid instead.
    });

    // Commit on blur (clicking away)
    this.cellEditor.addEventListener('blur', () => {
      if (this.isEditing) {
        this.commitEdit('none'); // Don't move selection on blur
      }
    });
  }

  /**
   * Register callbacks
   * @param {string} eventName - 'commit', 'cancel'
   * @param {Function} callback 
   */
  on(eventName, callback) {
    const callbackKey = `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;
    if (callbackKey in this.callbacks) {
      this.callbacks[callbackKey] = callback;
    }
  }
}