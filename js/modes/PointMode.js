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
import { FormulaAdjuster } from '../engine/utils/FormulaAdjuster.js';
import { CellHelpers } from '../engine/utils/CellHelpers.js';

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

    /** @private */
    this._suppressFormulaUpdate = false; // Flag to prevent unwanted formula updates
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
    this._baseFormula = triggerKey; // Initialize base formula (could be '=' or full formula like '=SUM(A1+')

    // Start editing with the trigger/formula
    if (this._editorManager && cellId) {
      // If triggerKey is just '=', use it as both initialValue and triggerKey
      // If it's a full formula (from EditMode), use it as initialValue but not as triggerKey
      const isSingleChar = triggerKey.length === 1;
      this._editorManager.startEdit(cellId, triggerKey, isSingleChar ? triggerKey : null);
      this._editorManager.focus();

      // For full formulas, position cursor at end
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

      case INTENTS.TOGGLE_REFERENCE:
        return this._handleToggleReference();

      case INTENTS.DELETE:
        // In PointMode, DELETE (Backspace/Delete) should edit the formula text
        // Return false to let the browser handle it naturally in the input field
        return false;

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

      // CRITICAL FIX: Reset selection back to the editing cell
      // After typing an operator, navigation should start from the editing cell,
      // not from the cell that was just pointed to
      if (this._selectionManager && this._formulaCellId) {
        const parsedCell = CellHelpers.parseCellRef(this._formulaCellId);
        if (parsedCell) {
          // NOTE: SelectionManager uses 1-based rows internally, but CellHelpers returns 0-based
          // So we need to convert: add 1 to the row
          const editingCoords = { row: parsedCell.row + 1, col: parsedCell.col };
          // Temporarily suppress formula updates while we reset the selection
          this._suppressFormulaUpdate = true;
          this._selectionManager.selectCell(editingCoords, false, false);
          this._suppressFormulaUpdate = false;
        }
      }

      Logger.log(this.getName(), `Operator "${char}" appended, staying in point mode, selection reset to editing cell`);
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

    // Skip update if suppressed (when we're just resetting selection position)
    if (this._suppressFormulaUpdate) {
      Logger.log(this.getName(), `Formula update suppressed`);
      return;
    }

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
      // Range reference - normalize to ensure start <= end
      const normalizedRange = this._normalizeRange(start, end);
      const startRef = this._selectionManager.coordsToCellId(normalizedRange.start);
      const endRef = this._selectionManager.coordsToCellId(normalizedRange.end);
      reference = `${startRef}:${endRef}`;
    }

    // UPDATED: Use _baseFormula instead of getValue() to prevent appending loops
    const newFormula = this._baseFormula + reference;
    this._editorManager.setValue(newFormula);

    // Position cursor at the end of the formula
    this._editorManager.setCursorPosition(newFormula.length);

    Logger.log(this.getName(), `Updated formula with reference: ${reference}`);
  }

  /**
   * Handles TOGGLE_REFERENCE intent (F4 key).
   * Cycles the reference format at the end of the formula.
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

    // Update base formula for subsequent navigation
    this._baseFormula = newFormula.substring(0, start + newRef.length);

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

  /**
   * Normalizes a range to ensure start coordinates are less than or equal to end coordinates.
   * @private
   * @param {Object} start - { row, col }
   * @param {Object} end - { row, col }
   * @returns {Object} - { start: { row, col }, end: { row, col } }
   */
  _normalizeRange(start, end) {
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);

    return {
      start: { row: minRow, col: minCol },
      end: { row: maxRow, col: maxCol }
    };
  }
}
