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

    // Hide fill handle during editing
    if (this._selectionManager && this._selectionManager._fillHandle) {
      this._selectionManager._fillHandle.hide();
    }

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

    // Update toolbar to show cell style (initially)
    this._updateToolbarState();

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

    // Show fill handle again after editing
    if (this._selectionManager && this._selectionManager._fillHandle) {
      this._selectionManager._fillHandle.render();
    }
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

      // Text-level formatting support - toggle active style (no text selection in Enter mode)
      case INTENTS.FORMAT_BOLD:
        return this._handleTextFormat('bold');

      case INTENTS.FORMAT_ITALIC:
        return this._handleTextFormat('italic');

      // Handle DELETE (Backspace/Delete) explicitly
      case INTENTS.DELETE:
        // In EnterMode, let contenteditable handle deletion
        return false;

      default:
        // Delegate to NavigationMode parent for other intents
        // (Copy, Paste, Undo, etc.)
        return super.handleIntent(intent, context);
    }
  }

  /**
   * Updates toolbar state based on current editor style.
   *
   * @private
   */
  _updateToolbarState() {
    if (!this._context.updateToolbarState) {
      return;
    }

    // Get current style from editor (active style)
    const activeStyle = this._editorManager?.getActiveStyle();
    if (activeStyle) {
      this._context.updateToolbarState({ font: activeStyle }, false);
    } else {
      // Fall back to cell style
      const cellStyle = this._context.fileManager?.getCellStyle(this._enteringCellId);
      this._context.updateToolbarState(cellStyle || {}, false);
    }
  }

  /**
   * Handles text-level formatting in enter mode.
   * Since text selection is not available in Enter mode,
   * formatting always toggles the active style for new text.
   *
   * @private
   * @param {string} property - Style property to toggle (e.g., 'bold')
   * @returns {boolean}
   */
  _handleTextFormat(property) {
    if (!this._editorManager) {
      return false;
    }

    // Toggle active style for new text
    this._editorManager.toggleActiveStyleProperty(property);
    Logger.log(this.getName(), `Toggled active style: ${property}`);

    // Update toolbar to reflect new state
    this._updateToolbarState();

    return true;
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
    super._handleNavigate(context);

    // Switch back to ready mode
    this._requestModeSwitch('ready');

    return true;
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
    super._handleJumpToEdge(context);

    // Switch back to ready mode
    this._requestModeSwitch('ready');

    return true;
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

    // Preserve cursor position when transitioning to EditMode
    const editor = document.getElementById('cell-editor');
    const cursorPosition = editor ? editor.selectionStart : currentValue.length;

    Logger.log(this.getName(), `Switching to EditMode for fine-tuning`);

    // Switch to edit mode with current value and cursor position
    this._requestModeSwitch('edit', {
      cellId: this._enteringCellId,
      initialValue: currentValue,
      isFormula: currentValue.startsWith('='),
      cursorPosition: cursorPosition
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

    // Get the entered value and rich text runs
    const newValue = this._editorManager.getValue();
    const richTextRuns = this._editorManager.hasRichTextFormatting()
      ? this._editorManager.getRichTextRuns()
      : null;

    // Only commit if value changed
    if (newValue !== '') {
      if (this._context.executeCellUpdate) {
        this._context.executeCellUpdate(this._enteringCellId, newValue, richTextRuns);
      }

      Logger.log(this.getName(), `Committed entry for ${this._enteringCellId}:`, newValue);
    }

    // Hide editor
    this._editorManager.hide();
  }
}
