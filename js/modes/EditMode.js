/**
 * EditMode.js
 *
 * In-cell editing mode with text cursor movement.
 *
 * This mode is entered when:
 * - User presses F2 on a cell
 * - User double-clicks a cell
 * - User starts editing an existing formula
 *
 * In this mode:
 * - Arrow keys move the text cursor (NOT the cell selection)
 * - Enter/Tab commits the edit and returns to ReadyMode
 * - Escape cancels the edit and returns to ReadyMode
 * - Text input is handled by the browser's native input element
 *
 * Key difference: EditMode does NOT extend NavigationMode because
 * arrow keys should control the cursor, not navigate cells.
 *
 * @module modes/EditMode
 */

import { AbstractMode } from './AbstractMode.js';
import { INTENTS } from './Intents.js';
import { Logger } from '../engine/utils/Logger.js';
import { FormulaAdjuster } from '../engine/utils/FormulaAdjuster.js';

/**
 * Edit mode for in-cell text editing.
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

    /** @private */
    this._isFormula = false;
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
   * @param {{ cellId: string, initialValue: string, isFormula: boolean, cursorPosition: number }} payload
   */
  onEnter(payload) {
    super.onEnter(payload);

    const { cellId, initialValue = '', isFormula = false, cursorPosition } = payload || {};

    this._editingCellId = cellId;
    this._initialValue = initialValue;
    this._isFormula = isFormula;

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

    Logger.log(this.getName(), `Editing cell ${cellId}`, { isFormula });
  }

  /**
   * Called when exiting edit mode.
   *
   * Ensures any pending changes are committed.
   */
  onExit() {
    super.onExit();

    // Clean up editor state (but don't commit - that's handled by the commit intent)
    this._editingCellId = null;
    this._initialValue = null;
    this._isFormula = false;
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
        // Important: EditMode does NOT handle navigation
        // This allows arrow keys to move the text cursor
        return false;

      case INTENTS.JUMP_TO_EDGE:
        // Also don't handle Ctrl+Arrow in edit mode
        return false;

      case INTENTS.TOGGLE_REFERENCE:
        return this._handleToggleReference();

      default:
        // Delegate to parent (which will log unhandled intents)
        return super.handleIntent(intent, context);
    }
  }

  /**
   * Handles INPUT intent - may switch to PointMode for operators in formulas.
   *
   * @private
   * @param {{ char: string }} context
   * @returns {boolean}
   */
  _handleInput(context) {
    const { char } = context;

    // Check if we're editing a formula
    const currentValue = this._editorManager ? this._editorManager.getValue() : '';
    const isFormula = currentValue.startsWith('=');

    if (!isFormula) {
      // Not a formula, let browser handle normally
      return false;
    }

    // Check if this is an operator that should trigger PointMode
    const pointModeTriggers = ['+', '-', '*', '/', '(', ',', ':', '<', '>', '=', '&', '^'];

    if (pointModeTriggers.includes(char)) {
      // Append the operator first
      const newValue = currentValue + char;
      this._editorManager.setValue(newValue);

      Logger.log(this.getName(), `Operator "${char}" in formula -> PointMode`);

      // Switch to PointMode with the current formula as base
      this._requestModeSwitch('point', {
        cellId: this._editingCellId,
        triggerKey: newValue  // Pass entire formula as trigger
      });

      return true;
    }

    // Regular character in formula - let browser handle
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

    // Get the edited value
    const newValue = this._editorManager.getValue();

    // Execute cell update through context
    if (this._context.executeCellUpdate) {
      this._context.executeCellUpdate(this._editingCellId, newValue);
    }

    // Hide editor
    this._editorManager.hide();

    Logger.log(this.getName(), `Committed edit for ${this._editingCellId}:`, newValue);

    // Handle post-commit navigation
    const { moveDirection } = context || {};
    if (moveDirection === 'down') {
      // Move to cell below
      this._selectionManager.moveSelection('down');
    } else if (moveDirection === 'right') {
      // Move to cell right
      this._selectionManager.moveSelection('right');
    }
    // If moveDirection is 'none', stay on current cell

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
    if (this._editorManager) {
      this._editorManager.setValue(this._initialValue || '');
      this._editorManager.hide();
    }

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

  /**
   * Handles TOGGLE_REFERENCE intent (F4 key).
   * Cycles the reference format at the cursor position.
   *
   * @private
   * @returns {boolean} True if handled
   */
  _handleToggleReference() {
    if (!this._editorManager) return false;

    const formula = this._editorManager.getValue();
    const cursorPos = this._editorManager.getCursorPosition();

    // Find the reference at or before cursor
    const { ref, start, end } = this._findReferenceAtCursor(formula, cursorPos);
    if (!ref) return false;

    // Cycle the reference format
    const newRef = FormulaAdjuster.cycleReferenceFormat(ref);

    // Replace in formula
    const newFormula = formula.substring(0, start) + newRef + formula.substring(end);
    this._editorManager.setValue(newFormula);

    // Set cursor position after the cycled reference
    this._editorManager.setCursorPosition(start + newRef.length);

    Logger.log(this.getName(), `Cycled reference: ${ref} → ${newRef}`);
    return true;
  }

  /**
   * Finds a cell reference at or before the cursor position.
   * Supports both single cell references (A1, $A$1) and range references (B1:B3, $B$1:$B$3).
   *
   * @private
   * @param {string} formula - The formula string
   * @param {number} cursorPos - Current cursor position
   * @returns {{ ref: string|null, start: number, end: number }}
   */
  _findReferenceAtCursor(formula, cursorPos) {
    // Use regex to find all cell references (including ranges) with their positions
    // Pattern matches: A1, $A$1, A1:B2, $A$1:$B$2, etc.
    const refRegex = /\$?[A-Z]+\$?[0-9]+(?::\$?[A-Z]+\$?[0-9]+)?/gi;
    let match;
    let lastMatchBeforeCursor = null;

    while ((match = refRegex.exec(formula)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      // Check if cursor is within this reference or immediately after it
      if (cursorPos >= start && cursorPos <= end) {
        return { ref: match[0], start, end };
      }

      // Keep track of the last reference before cursor for fallback
      if (end < cursorPos) {
        lastMatchBeforeCursor = { ref: match[0], start, end };
      }
    }

    // If cursor is immediately after a reference (common in PointMode), use that reference
    if (lastMatchBeforeCursor && (cursorPos - lastMatchBeforeCursor.end === 1)) {
      return lastMatchBeforeCursor;
    }

    return { ref: null, start: -1, end: -1 };
  }
}
