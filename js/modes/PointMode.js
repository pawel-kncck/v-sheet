/**
 * PointMode.js
 *
 * Formula-building mode where arrow keys select cells to insert references.
 *
 * This mode is entered when:
 * - User types '=' in ReadyMode
 * - User types an operator in EditMode while editing a formula
 *
 * In this mode:
 * - Arrow keys navigate and update the formula reference
 * - Mouse clicks insert cell references into the formula
 * - Operators (comma, plus, multiply, divide) keep you in point mode but lock the current reference
 * - Regular letters/numbers switch to EditMode (formula variant)
 * - Enter/Tab commits the formula
 * - Escape cancels
 *
 * This is a foundation for Epic 7's full formula-building UX with:
 * - Multi-colored reference highlighting
 * - Live formula parsing
 * - Cross-sheet selection
 *
 * @module modes/PointMode
 */

import { NavigationMode } from './NavigationMode.js';
import { INTENTS } from './Intents.js';
import { Logger } from '../engine/utils/Logger.js';

/**
 * Point mode for formula building.
 */
export class PointMode extends NavigationMode {
  /**
   * Creates a new PointMode instance.
   *
   * @param {Object} context - Application services and dependencies
   */
  constructor(context) {
    super(context);

    /** @private */
    this._formulaCellId = null;

/** @private */
    this._baseFormula = ''; // Changed from _initialFormula to clarify usage
  }

/**
   * Returns the mode identifier.
   *
   * @returns {string}
   */
  getName() {
    return 'point';
  }

  /**
   * Called when entering point mode.
   *
   * @param {{ cellId: string, triggerKey: string }} payload
   */
  onEnter(payload) {
    super.onEnter(payload);

    const { cellId, triggerKey = '=' } = payload || {};

    this._formulaCellId = cellId;
    this._baseFormula = triggerKey; // Initialize base formula

    // Start editing with the trigger character (usually '=')
    if (this._editorManager && cellId) {
      this._editorManager.startEdit(cellId, triggerKey, triggerKey);
      this._editorManager.focus();
    }

    // Update UI to show point state
    if (this._context.updateModeDisplay) {
      this._context.updateModeDisplay('Point');
    }

    Logger.log(this.getName(), `Point mode for formula in ${cellId} starting with "${triggerKey}"`);
  }

  /**
   * Called when exiting point mode.
   */
  onExit() {
    super.onExit();

    // Clean up state
    this._formulaCellId = null;
    this._initialFormula = '';
  }

  /**
   * Handles intents specific to point mode.
   *
   * Key behavior: NAVIGATE updates the formula text with the selected cell reference.
   *
   * @param {string} intent - The intent identifier
   * @param {Object} context - Intent context data
   * @returns {boolean} True if handled
   */
  handleIntent(intent, context) {
    switch (intent) {
      case INTENTS.NAVIGATE:
        // Navigate and update formula reference
        return this._handleNavigateWithReference(context);

      case INTENTS.JUMP_TO_EDGE:
        // Jump and update formula reference
        return this._handleJumpWithReference(context);

      case INTENTS.COMMIT:
        return this._handleCommit(context);

      case INTENTS.CANCEL:
        return this._handleCancel();

      case INTENTS.INPUT:
        return this._handleInput(context);

      case INTENTS.CELL_SELECT:
        return this._handleCellSelectInPointMode(context);

      case INTENTS.EDIT_START:
        // F2 switches to edit mode
        return this._handleSwitchToEdit();

      default:
        // Delegate to NavigationMode parent for other intents
        // (Copy, Paste, Undo are disabled in point mode for now)
        return super.handleIntent(intent, context);
    }
  }

  /**
   * Handles NAVIGATE intent with formula reference update.
   *
   * Navigates the selection and appends/updates the cell reference in the formula.
   *
   * @private
   * @param {{ direction: string, shift: boolean }} context
   * @returns {boolean}
   */
  _handleNavigateWithReference(context) {
    // First, perform the navigation
    super._handleNavigate(context);

    // Then update the formula with the new reference
    this._updateFormulaWithCurrentSelection();

    return true;
  }

  /**
   * Handles JUMP_TO_EDGE intent with formula reference update.
   *
   * @private
   * @param {{ direction: string, shift: boolean }} context
   * @returns {boolean}
   */
  _handleJumpWithReference(context) {
    // First, perform the jump
    super._handleJumpToEdge(context);

    // Then update the formula with the new reference
    this._updateFormulaWithCurrentSelection();

    return true;
  }

  /**
   * Handles CELL_SELECT intent in point mode.
   *
   * Clicking a cell in point mode inserts its reference into the formula.
   *
   * @private
   * @param {{ coords: Object, shift: boolean, ctrl: boolean }} context
   * @returns {boolean}
   */
  _handleCellSelectInPointMode(context) {
    const { coords, shift } = context;

    // Select the cell
    this._selectionManager.selectCell(coords, shift, false);

    // Update formula with the new selection
    this._updateFormulaWithCurrentSelection();

    return true;
  }

  /**
   * Handles INPUT intent.
   *
   * Operators keep you in point mode.
   * Letters/numbers switch to EditMode for fine-tuning.
   *
   * @private
   * @param {{ char: string }} context
   * @returns {boolean}
   */
_handleInput(context) {
    const { char } = context;

    // Operators that keep you in point mode
    const operators = ['+', '-', '*', '/', '(', ')', ',', '^', '&', ':', '<', '>', '='];

    if (operators.includes(char)) {
      // Append operator to formula and stay in point mode
      if (this._editorManager) {
        const currentValue = this._editorManager.getValue();
        const newValue = currentValue + char;
        this._editorManager.setValue(newValue);
        
        // NEW: Update base formula so next navigation appends to THIS state
        this._baseFormula = newValue;
      }

      Logger.log(this.getName(), `Operator "${char}" appended, staying in point mode`);
      return true;
    } else {
      // Letter/number - switch to edit mode
      // Append the character first
      if (this._editorManager) {
        const currentValue = this._editorManager.getValue();
        this._editorManager.setValue(currentValue + char);
      }

      Logger.log(this.getName(), `Character "${char}" → EditMode`);

      this._requestModeSwitch('edit', {
        cellId: this._formulaCellId,
        initialValue: this._editorManager.getValue(),
        isFormula: true
      });

      return true;
    }
  }

  /**
   * Handles COMMIT intent (Enter/Tab).
   *
   * Commits the formula and transitions to ReadyMode.
   *
   * @private
   * @param {{ moveDirection: string }} context
   * @returns {boolean}
   */
  _handleCommit(context) {
    if (!this._editorManager || !this._formulaCellId) {
      Logger.warn(this.getName(), 'Cannot commit: no active formula');
      return false;
    }

    // Get the formula value
    const formulaValue = this._editorManager.getValue();

    // Commit through context
    if (this._context.executeCellUpdate) {
      this._context.executeCellUpdate(this._formulaCellId, formulaValue);
    }

    // Hide editor
    this._editorManager.hide();

    Logger.log(this.getName(), `Committed formula for ${this._formulaCellId}:`, formulaValue);

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
   * Cancels the formula and transitions to ReadyMode.
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

    Logger.log(this.getName(), `Cancelled formula for ${this._formulaCellId}`);

    // Return to ready mode
    this._requestModeSwitch('ready');

    return true;
  }

  /**
   * Handles EDIT_START intent (F2).
   *
   * Switches to EditMode for fine-tuning the formula.
   *
   * @private
   * @returns {boolean}
   */
  _handleSwitchToEdit() {
    if (!this._editorManager || !this._formulaCellId) {
      return false;
    }

    const currentValue = this._editorManager.getValue();

    Logger.log(this.getName(), `Switching to EditMode for fine-tuning`);

    // Switch to edit mode with current formula
    this._requestModeSwitch('edit', {
      cellId: this._formulaCellId,
      initialValue: currentValue,
      isFormula: true
    });

    return true;
  }

  /**
   * Updates the formula text with the currently selected cell/range reference.
   *
   * @private
   */
  _updateFormulaWithCurrentSelection() {
    if (!this._editorManager) return;

    // Get current selection
    const selection = this._selectionManager.getSelection();
    if (!selection || selection.length === 0) return;

    // Get the last range (most recent selection)
    const lastRange = selection[selection.length - 1];
    const { start, end } = lastRange;

    // Build cell reference string
    let reference = '';

    if (start.row === end.row && start.col === end.col) {
      // Single cell reference
      reference = this._selectionManager.coordsToCellId(start);
    } else {
      // Range reference
      const startRef = this._selectionManager.coordsToCellId(start);
      const endRef = this._selectionManager.coordsToCellId(end);
      reference = `${startRef}:${endRef}`;
    }

    // UPDATED: Use _baseFormula instead of getValue() to prevent appending loops
    this._editorManager.setValue(this._baseFormula + reference);

    Logger.log(this.getName(), `Updated formula with reference: ${reference}`);
  }
}
