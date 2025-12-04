/**
 * EnterMode.js
 *
 * "Quick entry" mode where typing overwrites cell, arrows commit and move.
 *
 * This mode is entered when:
 * - User types a regular character (not a formula trigger) in ReadyMode
 *
 * In this mode:
 * - The initial character overwrites the cell content
 * - Arrow keys commit the entry and move in that direction
 * - Enter/Tab commits and moves (down/right)
 * - Escape cancels and returns to ReadyMode
 * - F2 switches to EditMode for fine-tuning
 *
 * This provides the "Excel-like" quick data entry experience where
 * you can type numbers/text and immediately arrow to the next cell.
 *
 * @module modes/EnterMode
 */

import { NavigationMode } from './NavigationMode.js';
import { INTENTS } from './Intents.js';
import { Logger } from '../engine/utils/Logger.js';

/**
 * Quick entry mode.
 */
export class EnterMode extends NavigationMode {
  /**
   * Creates a new EnterMode instance.
   *
   * @param {Object} context - Application services and dependencies
   */
  constructor(context) {
    super(context);

    /** @private */
    this._enteringCellId = null;

    /** @private */
    this._initialValue = '';
  }

  /**
   * Returns the mode identifier.
   *
   * @returns {string}
   */
  getName() {
    return 'enter';
  }

  /**
   * Called when entering enter mode.
   *
   * @param {{ cellId: string, triggerKey: string }} payload
   */
  onEnter(payload) {
    super.onEnter(payload);

    const { cellId, triggerKey = '' } = payload || {};

    this._enteringCellId = cellId;
    this._initialValue = triggerKey;

    // Start editing with the trigger character
    if (this._editorManager && cellId) {
      // Clear the cell and start with the trigger key
      this._editorManager.startEdit(cellId, triggerKey, triggerKey);
      this._editorManager.focus();
    }

    // Update UI to show enter state
    if (this._context.updateModeDisplay) {
      this._context.updateModeDisplay('Enter');
    }

    Logger.log(this.getName(), `Enter mode for cell ${cellId} with "${triggerKey}"`);
  }

  /**
   * Called when exiting enter mode.
   */
  onExit() {
    super.onExit();

    // Clean up state
    this._enteringCellId = null;
    this._initialValue = '';
  }

  /**
   * Handles intents specific to enter mode.
   *
   * Key behavior: NAVIGATE commits the entry first, then moves.
   *
   * @param {string} intent - The intent identifier
   * @param {Object} context - Intent context data
   * @returns {boolean} True if handled
   */
  handleIntent(intent, context) {
    switch (intent) {
      case INTENTS.NAVIGATE:
        // Commit then navigate
        return this._handleNavigateWithCommit(context);

      case INTENTS.JUMP_TO_EDGE:
        // Commit then jump
        return this._handleJumpWithCommit(context);

      case INTENTS.COMMIT:
        return this._handleCommit(context);

      case INTENTS.CANCEL:
        return this._handleCancel();

      case INTENTS.EDIT_START:
        // F2 switches to edit mode for fine-tuning
        return this._handleSwitchToEdit();

      case INTENTS.INPUT:
        // Additional input is handled by the editor's native input
        // Return false to allow browser to handle character input
        return false;

      default:
        // Delegate to NavigationMode parent for other intents
        // (Copy, Paste, Undo, etc.)
        return super.handleIntent(intent, context);
    }
  }

  /**
   * Handles NAVIGATE intent with commit-first behavior.
   *
   * Commits the current entry, then navigates.
   *
   * @private
   * @param {{ direction: string, shift: boolean }} context
   * @returns {boolean}
   */
  _handleNavigateWithCommit(context) {
    // Commit the entry
    this._commitEntry();

    // Now delegate to parent's navigation
    return super._handleNavigate(context);
  }

  /**
   * Handles JUMP_TO_EDGE intent with commit-first behavior.
   *
   * @private
   * @param {{ direction: string, shift: boolean }} context
   * @returns {boolean}
   */
  _handleJumpWithCommit(context) {
    // Commit the entry
    this._commitEntry();

    // Now delegate to parent's jump
    return super._handleJumpToEdge(context);
  }

  /**
   * Handles COMMIT intent (Enter/Tab).
   *
   * Commits the entry and transitions to ReadyMode.
   *
   * @private
   * @param {{ moveDirection: string }} context
   * @returns {boolean}
   */
  _handleCommit(context) {
    if (!this._editorManager || !this._enteringCellId) {
      Logger.warn(this.getName(), 'Cannot commit: no active entry');
      return false;
    }

    // Commit the entry
    this._commitEntry();

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
   * Cancels the entry and transitions to ReadyMode.
   *
   * @private
   * @returns {boolean}
   */
  _handleCancel() {
    if (!this._editorManager) {
      Logger.warn(this.getName(), 'Cannot cancel: no editor manager');
      return false;
    }

    // Hide editor without committing
    this._editorManager.hide();

    Logger.log(this.getName(), `Cancelled entry for ${this._enteringCellId}`);

    // Return to ready mode
    this._requestModeSwitch('ready');

    return true;
  }

  /**
   * Handles EDIT_START intent (F2).
   *
   * Switches to EditMode for fine-tuning the entry.
   *
   * @private
   * @returns {boolean}
   */
  _handleSwitchToEdit() {
    if (!this._editorManager || !this._enteringCellId) {
      return false;
    }

    const currentValue = this._editorManager.getValue();

    Logger.log(this.getName(), `Switching to EditMode for fine-tuning`);

    // Switch to edit mode with current value
    this._requestModeSwitch('edit', {
      cellId: this._enteringCellId,
      initialValue: currentValue,
      isFormula: currentValue.startsWith('=')
    });

    return true;
  }

  /**
   * Commits the current entry to the cell.
   *
   * @private
   */
  _commitEntry() {
    if (!this._editorManager || !this._enteringCellId) {
      return;
    }

    // Get the entered value
    const newValue = this._editorManager.getValue();

    // Only commit if value changed
    if (newValue !== '') {
      if (this._context.executeCellUpdate) {
        this._context.executeCellUpdate(this._enteringCellId, newValue);
      }

      Logger.log(this.getName(), `Committed entry for ${this._enteringCellId}:`, newValue);
    }

    // Hide editor
    this._editorManager.hide();
  }
}
