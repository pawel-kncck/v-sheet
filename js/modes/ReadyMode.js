/**
 * ReadyMode.js
 *
 * The default "ready" state where the user is navigating the grid but not editing.
 *
 * In this mode:
 * - Arrow keys navigate the grid
 * - Typing a character starts input (EnterMode or PointMode)
 * - F2 or double-click starts editing (EditMode)
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
        // In ready mode, Enter on a non-formula cell means "start editing"
        // Check if current cell has a formula
        const activeCellId = this._getActiveCellId();
        if (activeCellId) {
          const value = this._getCellValue(activeCellId);
          if (value && value.startsWith('=')) {
            // It's a formula, start formula editing
            return this._handleEditStart({ source: 'keyboard' });
          }
        }
        // Not a formula, move down (default Enter behavior in ready mode)
        return this._handleNavigate({ direction: 'down', shift: false });

      default:
        // Delegate to NavigationMode parent
        return super.handleIntent(intent, context);
    }
  }

  /**
   * Handles INPUT intent (character typed).
   *
   * Transitions to EnterMode or PointMode depending on the character.
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
      // Start formula mode (PointMode)
      Logger.log(this.getName(), `Formula trigger "${char}" → PointMode`);
      this._requestModeSwitch('point', {
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
   * Transitions to EditMode.
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

    const currentValue = this._getCellValue(activeCellId);
    const isFormula = currentValue && currentValue.startsWith('=');

    Logger.log(this.getName(), `Edit start (${context.source}) → EditMode`);

    // Transition to EditMode
    this._requestModeSwitch('edit', {
      cellId: activeCellId,
      initialValue: currentValue,
      isFormula: isFormula
    });

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
