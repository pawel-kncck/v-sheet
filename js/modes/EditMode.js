/**
 * EditMode.js
 *
 * In-cell editing mode for non-formula content.
 *
 * This mode is entered when:
 * - User presses F2 on a cell with non-formula content
 * - User double-clicks a cell with non-formula content
 *
 * In this mode:
 * - Arrow keys move the text cursor (NOT the cell selection)
 * - Enter/Tab commits the edit and returns to ReadyMode
 * - Escape cancels the edit and returns to ReadyMode
 * - Text input is handled by the browser's native input element
 *
 * Note: Formula editing is handled by FormulaMode, not EditMode.
 * If user starts typing '=' in this mode, they will transition to FormulaMode.
 *
 * Key difference: EditMode does NOT extend NavigationMode because
 * arrow keys should control the cursor, not navigate cells.
 *
 * @module modes/EditMode
 */

import { AbstractMode } from './AbstractMode.js';
import { INTENTS, FORMULA_TRIGGERS } from './Intents.js';
import { Logger } from '../engine/utils/Logger.js';

/**
 * Edit mode for in-cell text editing (non-formula).
 */
export class EditMode extends AbstractMode {
  /**
   * Creates a new EditMode instance.
   *
   * @param {Object} context - Application services and dependencies
   */
  constructor(context) {
    super(context);

    /** @private */
    this._editingCellId = null;

    /** @private */
    this._initialValue = null;
  }

  /**
   * Returns the mode identifier.
   *
   * @returns {string}
   */
  getName() {
    return 'edit';
  }

  /**
   * Called when entering edit mode.
   *
   * @param {{ cellId: string, initialValue: string, cursorPosition: number }} payload
   */
  onEnter(payload) {
    super.onEnter(payload);

    const { cellId, initialValue = '', cursorPosition } = payload || {};

    this._editingCellId = cellId;
    this._initialValue = initialValue;

    // Hide fill handle during editing
    if (this._selectionManager && this._selectionManager._fillHandle) {
      this._selectionManager._fillHandle.hide();
    }

    // Start editing through EditorManager
    if (this._editorManager && cellId) {
      this._editorManager.startEdit(cellId, initialValue, null);

      // If cursor position was provided (e.g., transitioning from EnterMode), restore it
      if (typeof cursorPosition === 'number') {
        setTimeout(() => {
          const editor = document.getElementById('cell-editor');
          if (editor) {
            editor.setSelectionRange(cursorPosition, cursorPosition);
          }
        }, 0);
      }

      // Focus the editor
      this._editorManager.focus();
    }

    // Update UI to show edit state
    if (this._context.updateModeDisplay) {
      this._context.updateModeDisplay('Edit');
    }

    // Update toolbar to show cell style (initially)
    this._updateToolbarState();

    Logger.log(this.getName(), `Editing cell ${cellId}`);
  }

  /**
   * Called when exiting edit mode.
   */
  onExit() {
    super.onExit();

    // Clean up editor state (but don't commit - that's handled by the commit intent)
    this._editingCellId = null;
    this._initialValue = null;

    // Show fill handle again after editing
    if (this._selectionManager && this._selectionManager._fillHandle) {
      this._selectionManager._fillHandle.render();
    }
  }

  /**
   * Updates toolbar state based on current editor style.
   * Shows active style or selection style.
   *
   * @private
   */
  _updateToolbarState() {
    if (!this._context.updateToolbarState) {
      return;
    }

    // Get current style from editor (active style or selection style)
    const activeStyle = this._editorManager?.getActiveStyle();
    if (activeStyle) {
      this._context.updateToolbarState({ font: activeStyle }, false);
    } else {
      // Fall back to cell style
      const cellStyle = this._context.fileManager?.getCellStyle(this._editingCellId);
      this._context.updateToolbarState(cellStyle || {}, false);
    }
  }

  /**
   * Handles intents specific to edit mode.
   *
   * @param {string} intent - The intent identifier
   * @param {Object} context - Intent context data
   * @returns {boolean} True if handled
   */
  handleIntent(intent, context) {
    switch (intent) {
      case INTENTS.INPUT:
        return this._handleInput(context);

      case INTENTS.COMMIT:
        return this._handleCommit(context);

      case INTENTS.CANCEL:
        return this._handleCancel();

      case INTENTS.CELL_SELECT:
        // User clicked another cell while editing - commit and select
        return this._handleCellSelectWhileEditing(context);

      case INTENTS.NAVIGATE:
        // EditMode does NOT handle navigation - let browser move text cursor
        return false;

      case INTENTS.JUMP_TO_EDGE:
        // Also don't handle Ctrl+Arrow in edit mode
        return false;

      // Text-level formatting support
      case INTENTS.FORMAT_BOLD:
        return this._handleTextFormat({ bold: true });

      case INTENTS.FORMAT_ITALIC:
        return this._handleTextFormat({ italic: true });

      default:
        return super.handleIntent(intent, context);
    }
  }

  /**
   * Handles text-level formatting (bold, italic, etc.) in edit mode.
   *
   * If text is selected: applies formatting to selection
   * If no selection (cursor only): toggles active style for new text
   *
   * @private
   * @param {Object} styleChanges - Style properties to apply
   * @returns {boolean}
   */
  _handleTextFormat(styleChanges) {
    if (!this._editorManager) {
      return false;
    }

    // Check if there's a text selection
    if (this._editorManager.hasSelection()) {
      // Apply formatting to selected text
      this._editorManager.applyFormatToSelection(styleChanges);
      Logger.log(this.getName(), 'Applied text-level formatting to selection');
    } else {
      // Toggle active style for new text
      const property = Object.keys(styleChanges)[0]; // e.g., 'bold'
      this._editorManager.toggleActiveStyleProperty(property);
      Logger.log(this.getName(), `Toggled active style: ${property}`);
    }

    // Update toolbar to reflect new state
    this._updateToolbarState();

    return true;
  }

  /**
   * Handles INPUT intent.
   *
   * If user types a formula trigger ('='), switch to FormulaMode.
   * Otherwise, let browser handle the input.
   *
   * @private
   * @param {{ char: string, isFormulaTrigger: boolean }} context
   * @returns {boolean}
   */
  _handleInput(context) {
    const { char, isFormulaTrigger } = context;
    const currentValue = this._editorManager ? this._editorManager.getValue() : '';

    // If cell is empty and user types a formula trigger, switch to FormulaMode
    if (currentValue === '' && isFormulaTrigger) {
      Logger.log(this.getName(), `Formula trigger "${char}" on empty cell → FormulaMode`);

      this._requestModeSwitch('formula', {
        cellId: this._editingCellId,
        triggerKey: char
      });
      return true;
    }

    // Let browser handle normal input
    return false;
  }

  /**
   * Handles COMMIT intent (Enter/Tab).
   *
   * Commits the edit and transitions to ReadyMode.
   *
   * @private
   * @param {{ moveDirection: string }} context
   * @returns {boolean}
   */
  _handleCommit(context) {
    if (!this._editorManager || !this._editingCellId) {
      Logger.warn(this.getName(), 'Cannot commit: no active edit');
      return false;
    }

    // Get the edited value and rich text runs
    const newValue = this._editorManager.getValue();
    const richTextRuns = this._editorManager.hasRichTextFormatting()
      ? this._editorManager.getRichTextRuns()
      : null;

    // Execute cell update through context (with optional rich text)
    if (this._context.executeCellUpdate) {
      this._context.executeCellUpdate(this._editingCellId, newValue, richTextRuns);
    }

    // Hide editor
    this._editorManager.hide();

    Logger.log(this.getName(), `Committed edit for ${this._editingCellId}:`, newValue);

    // Handle post-commit navigation
    const { moveDirection } = context || {};
    if (moveDirection === 'down') {
      this._selectionManager.moveSelection('down');
    } else if (moveDirection === 'right') {
      this._selectionManager.moveSelection('right');
    }

    // Return to ready mode
    this._requestModeSwitch('ready');

    return true;
  }

  /**
   * Handles CANCEL intent (Escape).
   *
   * Cancels the edit and transitions to ReadyMode.
   *
   * @private
   * @returns {boolean}
   */
  _handleCancel() {
    if (!this._editorManager) {
      Logger.warn(this.getName(), 'Cannot cancel: no editor manager');
      return false;
    }

    // Restore original value
    this._editorManager.setValue(this._initialValue || '');
    this._editorManager.hide();

    Logger.log(this.getName(), `Cancelled edit for ${this._editingCellId}`);

    // Return to ready mode
    this._requestModeSwitch('ready');

    return true;
  }

  /**
   * Handles CELL_SELECT intent while editing.
   *
   * Commits current edit and selects the new cell.
   *
   * @private
   * @param {{ coords: Object, shift: boolean, ctrl: boolean }} context
   * @returns {boolean}
   */
  _handleCellSelectWhileEditing(context) {
    if (!this._editorManager || !this._editingCellId) {
      return false;
    }

    // Commit the current edit
    const newValue = this._editorManager.getValue();
    if (this._context.executeCellUpdate) {
      this._context.executeCellUpdate(this._editingCellId, newValue);
    }

    // Hide editor
    this._editorManager.hide();

    // Switch to ready mode
    this._requestModeSwitch('ready');

    // Now select the new cell
    const { coords, shift, ctrl } = context;
    this._selectionManager.selectCell(coords, shift, ctrl);

    Logger.log(this.getName(), `Committed and selected new cell`);

    return true;
  }
}
