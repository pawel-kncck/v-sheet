/**
 * ReadyMode.js
 *
 * The default "ready" state where the user is navigating the grid but not editing.
 *
 * In this mode:
 * - Arrow keys navigate the grid
 * - Typing a formula trigger starts FormulaMode
 * - Typing other characters starts EnterMode
 * - F2 or double-click starts editing (EditMode for non-formulas, FormulaMode for formulas)
 * - All clipboard and history operations work
 * - Cell selection works normally
 *
 * This is the "idle" state that the application returns to after committing
 * or canceling edits.
 *
 * @module modes/ReadyMode
 */

import { NavigationMode } from './NavigationMode.js';
import { INTENTS, FORMULA_TRIGGERS } from './Intents.js';
import { Logger } from '../engine/utils/Logger.js';

/**
 * Ready (idle/navigation) mode.
 */
export class ReadyMode extends NavigationMode {
  /**
   * Creates a new ReadyMode instance.
   *
   * @param {Object} context - Application services and dependencies
   */
  constructor(context) {
    super(context);
  }

  /**
   * Returns the mode identifier.
   *
   * @returns {string}
   */
  getName() {
    return 'ready';
  }

  /**
   * Called when entering ready mode.
   *
   * @param {*} payload - Optional data from previous mode
   */
  onEnter(payload) {
    super.onEnter(payload);

    // Ensure editor is hidden
    if (this._editorManager) {
      this._editorManager.hide();
    }

    // Update UI to show ready state
    if (this._context.updateModeDisplay) {
      this._context.updateModeDisplay('Ready');
    }

    // Update toolbar to show active cell's style
    this._updateToolbarState();
  }

  /**
   * Updates toolbar state based on active cell's style.
   *
   * @private
   */
  _updateToolbarState() {
    if (!this._context.updateToolbarState || !this._context.fileManager) {
      return;
    }

    const activeCellId = this._getActiveCellId();
    if (!activeCellId) {
      this._context.updateToolbarState({}, false);
      return;
    }

    const style = this._context.fileManager.getCellStyle(activeCellId);
    this._context.updateToolbarState(style, false);
  }

  /**
   * Overrides navigation to update toolbar state after movement.
   *
   * @protected
   * @param {{ direction: string, shift: boolean }} context
   * @returns {boolean}
   */
  _handleNavigate(context) {
    const result = super._handleNavigate(context);
    this._updateToolbarState();
    return result;
  }

  /**
   * Overrides jump to edge to update toolbar state after movement.
   *
   * @protected
   * @param {{ direction: string, shift: boolean }} context
   * @returns {boolean}
   */
  _handleJumpToEdge(context) {
    const result = super._handleJumpToEdge(context);
    this._updateToolbarState();
    return result;
  }

  /**
   * Handles intents specific to ready mode.
   *
   * @param {string} intent - The intent identifier
   * @param {Object} context - Intent context data
   * @returns {boolean} True if handled
   */
  handleIntent(intent, context) {
    switch (intent) {
      case INTENTS.INPUT:
        return this._handleInput(context);

      case INTENTS.EDIT_START:
        return this._handleEditStart(context);

      case INTENTS.CELL_SELECT:
        return this._handleCellSelect(context);

      case INTENTS.HEADER_SELECT:
        return this._handleHeaderSelect(context);

      case INTENTS.COMMIT:
        // In ready mode, Enter on a cell with content means "start editing"
        const activeCellId = this._getActiveCellId();
        if (activeCellId) {
          const value = this._getCellValue(activeCellId);
          if (value) {
            // Cell has content, start editing
            return this._handleEditStart({ source: 'keyboard' });
          }
        }
        // Empty cell, move down (default Enter behavior in ready mode)
        return this._handleNavigate({ direction: 'down', shift: false });

      default:
        // Delegate to NavigationMode parent
        return super.handleIntent(intent, context);
    }
  }

  /**
   * Handles INPUT intent (character typed).
   *
   * Transitions to FormulaMode or EnterMode depending on the character.
   *
   * @private
   * @param {{ char: string, isFormulaTrigger: boolean }} context
   * @returns {boolean}
   */
  _handleInput(context) {
    const { char, isFormulaTrigger } = context;
    const activeCellId = this._getActiveCellId();

    if (!activeCellId) {
      Logger.warn(this.getName(), 'No active cell for input');
      return false;
    }

    if (isFormulaTrigger) {
      // Start formula mode
      Logger.log(this.getName(), `Formula trigger "${char}" → FormulaMode`);
      this._requestModeSwitch('formula', {
        cellId: activeCellId,
        triggerKey: char
      });
    } else {
      // Start quick entry mode (EnterMode)
      Logger.log(this.getName(), `Character "${char}" → EnterMode`);
      this._requestModeSwitch('enter', {
        cellId: activeCellId,
        triggerKey: char
      });
    }

    return true;
  }

  /**
   * Handles EDIT_START intent (F2 or double-click).
   *
   * Transitions to FormulaMode for formulas, EditMode for non-formulas.
   *
   * @private
   * @param {{ source: string }} context
   * @returns {boolean}
   */
  _handleEditStart(context) {
    const activeCellId = this._getActiveCellId();

    if (!activeCellId) {
      Logger.warn(this.getName(), 'No active cell for edit');
      return false;
    }

    const currentValue = this._getCellValue(activeCellId) || '';
    const isFormula = currentValue.startsWith('=');

    if (isFormula) {
      // Formula cell - use FormulaMode in editing state
      Logger.log(this.getName(), `Edit start (${context.source}) → FormulaMode (editing)`);
      this._requestModeSwitch('formula', {
        cellId: activeCellId,
        triggerKey: currentValue,
        startInEditingState: true
      });
    } else {
      // Non-formula cell - use EditMode
      Logger.log(this.getName(), `Edit start (${context.source}) → EditMode`);
      this._requestModeSwitch('edit', {
        cellId: activeCellId,
        initialValue: currentValue
      });
    }

    return true;
  }

  /**
   * Handles CELL_SELECT intent (mouse click on cell).
   *
   * @private
   * @param {{ coords: Object, shift: boolean, ctrl: boolean }} context
   * @returns {boolean}
   */
  _handleCellSelect(context) {
    const { coords, shift, ctrl } = context;

    this._selectionManager.selectCell(coords, shift, ctrl);

    // Update toolbar to reflect new selection's style
    this._updateToolbarState();

    Logger.log(this.getName(), `Cell select at (${coords.row}, ${coords.col})`);
    return true;
  }

  /**
   * Handles HEADER_SELECT intent (click on row/column header).
   *
   * @private
   * @param {{ type: string, index: number, shift: boolean, ctrl: boolean }} context
   * @returns {boolean}
   */
  _handleHeaderSelect(context) {
    const { type, index, shift, ctrl } = context;

    this._selectionManager.selectHeader(type, index, shift, ctrl);

    Logger.log(this.getName(), `${type} header select at ${index}`);
    return true;
  }
}
