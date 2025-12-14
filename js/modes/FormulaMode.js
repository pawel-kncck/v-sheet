/**
 * FormulaMode.js
 *
 * Unified formula-building mode that handles both reference pointing and text editing.
 *
 * This mode is entered when:
 * - User types a formula trigger ('=', '+', '-') in ReadyMode
 * - User presses F2 on an existing formula cell
 *
 * The mode has two internal states controlled by `_isPointing`:
 * - Pointing (true): Arrow keys navigate grid and insert/update cell references
 * - Editing (false): Arrow keys move the text cursor within the formula
 *
 * State transitions:
 * - Pointing → Editing: User types a letter/number (e.g., typing function names)
 * - Editing → Pointing: User types an operator (e.g., +, -, (, ,)
 * - Either → Ready: User commits (Enter/Tab) or cancels (Escape)
 *
 * @module modes/FormulaMode
 */

import { NavigationMode } from './NavigationMode.js';
import { INTENTS } from './Intents.js';
import { Logger } from '../engine/utils/Logger.js';
import { FormulaAdjuster } from '../engine/utils/FormulaAdjuster.js';
import { CellHelpers } from '../engine/utils/CellHelpers.js';

// ============================================================================
// Formula Character Constants
// ============================================================================

/**
 * Operators that trigger pointing state transitions.
 * When user types these in editing state, we switch to pointing mode to expect a cell reference.
 * When user types these in pointing state, we stay in pointing mode.
 * @readonly
 */
export const POINTING_TRIGGERS = Object.freeze([
  '+', '-', '*', '/', '(', ',', ':', '<', '>', '=', '&', '^'
]);

/**
 * Formula mode for building and editing formulas.
 */
export class FormulaMode extends NavigationMode {
  /**
   * Creates a new FormulaMode instance.
   *
   * @param {Object} context - Application services and dependencies
   */
  constructor(context) {
    super(context);

    /** @private Cell ID where the formula is being entered */
    this._formulaCellId = null;

    /** @private Base formula text (anchor for reference insertion) */
    this._baseFormula = '';

    /** @private Original value for cancel/restore */
    this._originalValue = '';

    /** @private Whether arrow keys point to cells (true) or move cursor (false) */
    this._isPointing = true;

    /** @private Flag to suppress formula updates during selection reset */
    this._suppressFormulaUpdate = false;
  }

  /**
   * Returns the mode identifier.
   *
   * @returns {string}
   */
  getName() {
    return 'formula';
  }

  /**
   * Called when entering formula mode.
   *
   * @param {{ cellId: string, triggerKey: string, startInEditingState: boolean }} payload
   */
  onEnter(payload) {
    super.onEnter(payload);

    const { cellId, triggerKey = '=', startInEditingState = false } = payload || {};

    this._formulaCellId = cellId;
    this._baseFormula = triggerKey;
    this._originalValue = this._fileManager?.getRawCellValue(cellId) || '';
    this._isPointing = !startInEditingState;

    // Hide fill handle during formula editing
    if (this._selectionManager && this._selectionManager._fillHandle) {
      this._selectionManager._fillHandle.hide();
    }

    // Start editing with the trigger/formula
    if (this._editorManager && cellId) {
      const isSingleChar = triggerKey.length === 1;
      this._editorManager.startEdit(cellId, triggerKey, isSingleChar ? triggerKey : null);
      this._editorManager.focus();

      // For full formulas (e.g., F2 on existing formula), position cursor at end
      if (!isSingleChar) {
        const editor = document.getElementById('cell-editor');
        if (editor) {
          setTimeout(() => {
            const len = editor.value.length;
            editor.setSelectionRange(len, len);
          }, 0);
        }
      }
    }

    // Update UI to show current state
    this._updateModeDisplay();

    Logger.log(this.getName(), `Formula mode for ${cellId}, pointing=${this._isPointing}, formula="${triggerKey}"`);
  }

  /**
   * Called when exiting formula mode.
   */
  onExit() {
    super.onExit();

    // Clean up state
    this._formulaCellId = null;
    this._baseFormula = '';
    this._originalValue = '';
    this._isPointing = true;
    this._suppressFormulaUpdate = false;

    // Show fill handle again after editing
    if (this._selectionManager && this._selectionManager._fillHandle) {
      this._selectionManager._fillHandle.render();
    }
  }

  /**
   * Handles intents for formula mode.
   *
   * @param {string} intent - The intent identifier
   * @param {Object} context - Intent context data
   * @returns {boolean} True if handled
   */
  handleIntent(intent, context) {
    switch (intent) {
      case INTENTS.NAVIGATE:
        return this._handleNavigate(context);

      case INTENTS.JUMP_TO_EDGE:
        return this._handleJumpToEdge(context);

      case INTENTS.COMMIT:
        return this._handleCommit(context);

      case INTENTS.CANCEL:
        return this._handleCancel();

      case INTENTS.INPUT:
        return this._handleInput(context);

      case INTENTS.CELL_SELECT:
        return this._handleCellSelect(context);

      case INTENTS.EDIT_START:
        // F2 toggles between pointing and editing
        return this._handleTogglePointingState();

      case INTENTS.TOGGLE_REFERENCE:
        return this._handleToggleReference();

      case INTENTS.DELETE:
        // Let browser handle delete/backspace in the input field
        return false;

      default:
        return super.handleIntent(intent, context);
    }
  }

  // ============================================================================
  // Navigation Handlers
  // ============================================================================

  /**
   * Handles NAVIGATE intent.
   * In pointing state: navigates grid and updates formula reference.
   * In editing state: lets browser handle cursor movement.
   *
   * @private
   * @param {{ direction: string, shift: boolean }} context
   * @returns {boolean}
   */
  _handleNavigate(context) {
    if (this._isPointing) {
      // Navigate grid and insert/update reference
      super._handleNavigate(context);
      this._updateFormulaWithCurrentSelection();
      return true;
    } else {
      // Let browser handle cursor movement
      return false;
    }
  }

  /**
   * Handles JUMP_TO_EDGE intent.
   * In pointing state: jumps to edge and updates formula reference.
   * In editing state: lets browser handle cursor movement.
   *
   * @private
   * @param {{ direction: string, shift: boolean }} context
   * @returns {boolean}
   */
  _handleJumpToEdge(context) {
    if (this._isPointing) {
      super._handleJumpToEdge(context);
      this._updateFormulaWithCurrentSelection();
      return true;
    } else {
      return false;
    }
  }

  // ============================================================================
  // Input Handlers
  // ============================================================================

  /**
   * Handles INPUT intent.
   *
   * In pointing state:
   * - Operators: append and stay in pointing (reset selection to formula cell)
   * - Letters/numbers: append and switch to editing state
   *
   * In editing state:
   * - Operators: append and switch to pointing state
   * - Letters/numbers: let browser handle
   *
   * @private
   * @param {{ char: string }} context
   * @returns {boolean}
   */
  _handleInput(context) {
    const { char } = context;
    const isOperator = POINTING_TRIGGERS.includes(char);

    if (isOperator) {
      // Operator typed - append, ensure pointing state, reset selection
      const currentValue = this._editorManager.getValue();
      const newValue = currentValue + char;
      this._editorManager.setValue(newValue);
      this._baseFormula = newValue;

      // Switch to pointing state if not already
      if (!this._isPointing) {
        this._isPointing = true;
        this._updateModeDisplay();
      }

      this._resetSelectionToFormulaCell();
      Logger.log(this.getName(), `Operator "${char}" → pointing state`);
      return true;
    }

    if (this._isPointing) {
      // Non-operator in pointing state - append and switch to editing
      const currentValue = this._editorManager.getValue();
      this._editorManager.setValue(currentValue + char);
      this._isPointing = false;
      this._updateModeDisplay();

      Logger.log(this.getName(), `Character "${char}" → editing state`);
      return true;
    }

    // Non-operator in editing state - let browser handle
    return false;
  }

  // ============================================================================
  // Cell Selection Handler
  // ============================================================================

  /**
   * Handles CELL_SELECT intent (mouse click on cell).
   *
   * In pointing state: inserts cell reference into formula.
   * In editing state: commits formula and selects new cell.
   *
   * @private
   * @param {{ coords: Object, shift: boolean, ctrl: boolean }} context
   * @returns {boolean}
   */
  _handleCellSelect(context) {
    const { coords, shift } = context;

    if (this._isPointing) {
      // Select cell and insert reference
      this._selectionManager.selectCell(coords, shift, false);
      this._updateFormulaWithCurrentSelection();
      return true;
    } else {
      // Commit and select new cell
      this._commitFormula();
      this._selectionManager.selectCell(coords, shift, false);
      this._requestModeSwitch('ready');
      return true;
    }
  }

  // ============================================================================
  // Commit / Cancel
  // ============================================================================

  /**
   * Handles COMMIT intent (Enter/Tab).
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

    this._commitFormula();

    // Handle post-commit navigation
    const { moveDirection } = context || {};
    if (moveDirection === 'down') {
      this._selectionManager.moveSelection('down');
    } else if (moveDirection === 'right') {
      this._selectionManager.moveSelection('right');
    }

    this._requestModeSwitch('ready');
    return true;
  }

  /**
   * Handles CANCEL intent (Escape).
   *
   * @private
   * @returns {boolean}
   */
  _handleCancel() {
    if (!this._editorManager) {
      Logger.warn(this.getName(), 'Cannot cancel: no editor manager');
      return false;
    }

    // Restore original value and hide editor
    this._editorManager.setValue(this._originalValue);
    this._editorManager.hide();

    // Reset selection to formula cell
    this._resetSelectionToFormulaCell();

    Logger.log(this.getName(), `Cancelled formula for ${this._formulaCellId}`);

    this._requestModeSwitch('ready');
    return true;
  }

  /**
   * Commits the current formula value.
   *
   * @private
   */
  _commitFormula() {
    const formulaValue = this._editorManager.getValue();

    if (this._context.executeCellUpdate) {
      this._context.executeCellUpdate(this._formulaCellId, formulaValue);
    }

    this._editorManager.hide();
    Logger.log(this.getName(), `Committed formula for ${this._formulaCellId}:`, formulaValue);
  }

  // ============================================================================
  // State Toggle
  // ============================================================================

  /**
   * Handles F2 press - toggles between pointing and editing states.
   *
   * @private
   * @returns {boolean}
   */
  _handleTogglePointingState() {
    this._isPointing = !this._isPointing;

    if (this._isPointing) {
      // Switching to pointing - update base formula to current value
      this._baseFormula = this._editorManager.getValue();
    }

    this._updateModeDisplay();
    Logger.log(this.getName(), `Toggled to ${this._isPointing ? 'pointing' : 'editing'} state`);
    return true;
  }

  // ============================================================================
  // Reference Handling
  // ============================================================================

  /**
   * Handles TOGGLE_REFERENCE intent (F4 key).
   * Cycles the reference format at cursor position.
   *
   * @private
   * @returns {boolean}
   */
  _handleToggleReference() {
    if (!this._editorManager) return false;

    const formula = this._editorManager.getValue();
    const cursorPos = this._editorManager.getCursorPosition();

    const { ref, start, end } = this._findReferenceAtCursor(formula, cursorPos);
    if (!ref) return false;

    const newRef = FormulaAdjuster.cycleReferenceFormat(ref);
    const newFormula = formula.substring(0, start) + newRef + formula.substring(end);
    this._editorManager.setValue(newFormula);

    // Update base formula if in pointing state
    if (this._isPointing) {
      this._baseFormula = newFormula.substring(0, start + newRef.length);
    }

    Logger.log(this.getName(), `Cycled reference: ${ref} → ${newRef}`);
    return true;
  }

  /**
   * Updates the formula with the current selection as a cell reference.
   *
   * @private
   */
  _updateFormulaWithCurrentSelection() {
    if (!this._editorManager || this._suppressFormulaUpdate) return;

    const selection = this._selectionManager.getSelection();
    if (!selection || selection.length === 0) return;

    const lastRange = selection[selection.length - 1];
    const { start, end } = lastRange;

    let reference = '';
    if (start.row === end.row && start.col === end.col) {
      reference = this._selectionManager.coordsToCellId(start);
    } else {
      const normalizedRange = this._normalizeRange(start, end);
      const startRef = this._selectionManager.coordsToCellId(normalizedRange.start);
      const endRef = this._selectionManager.coordsToCellId(normalizedRange.end);
      reference = `${startRef}:${endRef}`;
    }

    const newFormula = this._baseFormula + reference;
    this._editorManager.setValue(newFormula);
    this._editorManager.setCursorPosition(newFormula.length);
    this._context.formulaHighlighter._updateOverlays();

    Logger.log(this.getName(), `Updated formula with reference: ${reference}`);
  }

  /**
   * Finds a cell reference at or before cursor position.
   *
   * @private
   * @param {string} formula - The formula string
   * @param {number} cursorPos - Current cursor position
   * @returns {{ ref: string|null, start: number, end: number }}
   */
  _findReferenceAtCursor(formula, cursorPos) {
    const refRegex = /\$?[A-Z]+\$?[0-9]+(?::\$?[A-Z]+\$?[0-9]+)?/gi;
    let match;
    let lastMatchBeforeCursor = null;

    while ((match = refRegex.exec(formula)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      if (cursorPos >= start && cursorPos <= end) {
        return { ref: match[0], start, end };
      }

      if (end < cursorPos) {
        lastMatchBeforeCursor = { ref: match[0], start, end };
      }
    }

    if (lastMatchBeforeCursor && (cursorPos - lastMatchBeforeCursor.end === 1)) {
      return lastMatchBeforeCursor;
    }

    return { ref: null, start: -1, end: -1 };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Resets selection back to the formula cell.
   *
   * @private
   */
  _resetSelectionToFormulaCell() {
    if (!this._selectionManager || !this._formulaCellId) return;

    const parsedCell = CellHelpers.parseCellRef(this._formulaCellId);
    if (parsedCell) {
      // CellHelpers returns 0-based row, SelectionManager uses 1-based
      const coords = { row: parsedCell.row + 1, col: parsedCell.col };
      this._suppressFormulaUpdate = true;
      this._selectionManager.selectCell(coords, false, false);
      this._suppressFormulaUpdate = false;
    }
  }

  /**
   * Updates the mode display in the status bar.
   *
   * @private
   */
  _updateModeDisplay() {
    if (this._context.updateModeDisplay) {
      const displayName = this._isPointing ? 'Formula [Point]' : 'Formula [Edit]';
      this._context.updateModeDisplay(displayName);
    }
  }

  /**
   * Normalizes a range to ensure start <= end.
   *
   * @private
   * @param {Object} start - { row, col }
   * @param {Object} end - { row, col }
   * @returns {Object} - { start, end }
   */
  _normalizeRange(start, end) {
    return {
      start: {
        row: Math.min(start.row, end.row),
        col: Math.min(start.col, end.col)
      },
      end: {
        row: Math.max(start.row, end.row),
        col: Math.max(start.col, end.col)
      }
    };
  }
}
