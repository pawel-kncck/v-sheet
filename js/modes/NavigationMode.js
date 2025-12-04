/**
 * NavigationMode.js
 *
 * Abstract base class for modes that support grid navigation.
 *
 * This class extracts and centralizes complex navigation logic that would
 * otherwise be duplicated across ReadyMode, EnterMode, and PointMode.
 *
 * Navigation includes:
 * - Arrow key movement (single step)
 * - Ctrl+Arrow jumping to edges
 * - Shift selection extension
 * - Delete/Clear operations
 * - Clipboard operations (Copy/Paste/Cut)
 * - Undo/Redo
 *
 * Subclasses can override navigation methods to add mode-specific behavior
 * (e.g., PointMode updates formula text on navigation).
 *
 * @module modes/NavigationMode
 */

import { AbstractMode } from './AbstractMode.js';
import { INTENTS } from './Intents.js';
import { Logger } from '../engine/utils/Logger.js';

/**
 * Base class for modes with navigation support.
 * @abstract
 */
export class NavigationMode extends AbstractMode {
  /**
   * Creates a new NavigationMode instance.
   *
   * @param {Object} context - Application services and dependencies
   */
  constructor(context) {
    super(context);

    // Validate required dependencies
    if (!this._selectionManager) {
      throw new Error('NavigationMode requires SelectionManager in context');
    }
    if (!this._historyManager) {
      throw new Error('NavigationMode requires HistoryManager in context');
    }
  }

  /**
   * Handles intents common to all navigation modes.
   *
   * Subclasses should call super.handleIntent() for unhandled intents.
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

      case INTENTS.DELETE:
        return this._handleDelete(context);

      case INTENTS.COPY:
        return this._handleCopy();

      case INTENTS.PASTE:
        return this._handlePaste();

      case INTENTS.CUT:
        return this._handleCut();

      case INTENTS.UNDO:
        return this._handleUndo();

      case INTENTS.REDO:
        return this._handleRedo();

      case INTENTS.SELECT_ALL:
        return this._handleSelectAll();

      default:
        // Delegate to parent
        return super.handleIntent(intent, context);
    }
  }

  /**
   * Handles NAVIGATE intent (arrow keys without Ctrl).
   *
   * @protected
   * @param {{ direction: string, shift: boolean }} context
   * @returns {boolean}
   */
  _handleNavigate(context) {
    const { direction, shift } = context;

    if (shift) {
      this._selectionManager.extendSelection(direction);
    } else {
      this._selectionManager.moveSelection(direction);
    }

    Logger.log(this.getName(), `Navigate ${direction}${shift ? ' (extend)' : ''}`);
    return true;
  }

  /**
   * Handles JUMP_TO_EDGE intent (Ctrl+Arrow keys).
   *
   * @protected
   * @param {{ direction: string, shift: boolean }} context
   * @returns {boolean}
   */
  _handleJumpToEdge(context) {
    const { direction, shift } = context;

    // Need a function to check if a cell has a value
    const hasValueFn = (cellId) => {
      const value = this._fileManager?.getRawCellValue(cellId);
      return value !== null && value !== undefined && value !== '';
    };

    if (shift) {
      // Extend selection to edge
      this._selectionManager.extendSelectionToEdge(direction, hasValueFn);
    } else {
      // Jump to edge
      this._selectionManager.jumpToEdge(direction, hasValueFn);
    }

    Logger.log(this.getName(), `Jump to edge ${direction}${shift ? ' (extend)' : ''}`);
    return true;
  }

  /**
   * Handles DELETE intent (Delete/Backspace keys).
   *
   * Clears the content of selected cells.
   *
   * @protected
   * @param {Object} context
   * @returns {boolean}
   */
  _handleDelete(context) {
    const selection = this._selectionManager.getSelection();
    if (!selection || selection.length === 0) {
      return false;
    }

    // Collect all selected cell IDs
    const cellIds = selection.flatMap(range => {
      const cells = [];
      for (let row = range.start.row; row <= range.end.row; row++) {
        for (let col = range.start.col; col <= range.end.col; col++) {
          const cellId = this._selectionManager.coordsToCellId({ row, col });
          cells.push(cellId);
        }
      }
      return cells;
    });

    // Clear cells through the context's executeCellUpdate method
    if (this._context.executeCellUpdate) {
      // Execute a multi-cell clear
      cellIds.forEach(cellId => {
        this._context.executeCellUpdate(cellId, '');
      });
    }

    Logger.log(this.getName(), `Delete ${cellIds.length} cell(s)`);
    return true;
  }

  /**
   * Handles COPY intent (Ctrl+C).
   *
   * @protected
   * @returns {boolean}
   */
  _handleCopy() {
    // Delegate to ClipboardManager if available
    if (this._context.clipboardManager) {
      this._context.clipboardManager.copy();
      Logger.log(this.getName(), 'Copy');
      return true;
    }

    Logger.warn(this.getName(), 'ClipboardManager not available');
    return false;
  }

  /**
   * Handles PASTE intent (Ctrl+V).
   *
   * @protected
   * @returns {boolean}
   */
  _handlePaste() {
    // Delegate to ClipboardManager if available
    if (this._context.clipboardManager) {
      this._context.clipboardManager.paste();
      Logger.log(this.getName(), 'Paste');
      return true;
    }

    Logger.warn(this.getName(), 'ClipboardManager not available');
    return false;
  }

  /**
   * Handles CUT intent (Ctrl+X).
   *
   * @protected
   * @returns {boolean}
   */
  _handleCut() {
    // Copy then delete
    const copied = this._handleCopy();
    if (copied) {
      this._handleDelete({});
      Logger.log(this.getName(), 'Cut');
      return true;
    }

    return false;
  }

  /**
   * Handles UNDO intent (Ctrl+Z).
   *
   * @protected
   * @returns {boolean}
   */
  _handleUndo() {
    if (this._historyManager.canUndo()) {
      this._historyManager.undo();
      Logger.log(this.getName(), 'Undo');
      return true;
    }

    Logger.log(this.getName(), 'Nothing to undo');
    return false;
  }

  /**
   * Handles REDO intent (Ctrl+Y or Ctrl+Shift+Z).
   *
   * @protected
   * @returns {boolean}
   */
  _handleRedo() {
    if (this._historyManager.canRedo()) {
      this._historyManager.redo();
      Logger.log(this.getName(), 'Redo');
      return true;
    }

    Logger.log(this.getName(), 'Nothing to redo');
    return false;
  }

  /**
   * Handles SELECT_ALL intent (Ctrl+A).
   *
   * @protected
   * @returns {boolean}
   */
  _handleSelectAll() {
    // Select all cells in the grid
    const maxRow = this._selectionManager.config.rows - 1;
    const maxCol = this._selectionManager.config.cols - 1;

    this._selectionManager.selectRange(
      { row: 0, col: 0 },
      { row: maxRow, col: maxCol }
    );

    Logger.log(this.getName(), 'Select all');
    return true;
  }
}
