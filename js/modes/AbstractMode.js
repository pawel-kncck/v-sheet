/**
 * AbstractMode.js
 * 
 * Base class for all application modes (Ready, Edit, Enter, Point, etc.).
 * 
 * This implements the Strategy Pattern: each mode encapsulates a specific
 * set of behaviors for handling user intents. The ModeManager delegates
 * intent handling to the currently active mode.
 * 
 * ## Lifecycle
 * 
 * 1. Mode is instantiated by ModeManager (once, then cached)
 * 2. `onEnter(payload)` is called when mode becomes active
 * 3. `handleIntent(intent, context)` is called for each user action
 * 4. `onExit()` is called when switching to another mode
 * 
 * ## Subclass Contract
 * 
 * Concrete modes MUST:
 * - Call `super(context)` in constructor
 * - Override `getName()` to return a unique identifier
 * 
 * Concrete modes SHOULD:
 * - Override `handleIntent()` to handle mode-specific intents
 * - Override `onEnter()` if setup is needed (e.g., showing editor)
 * - Override `onExit()` if cleanup is needed (e.g., committing changes)
 * 
 * @module modes/AbstractMode
 */

import { Logger } from '../engine/utils/Logger.js';

/**
 * Base class for all application modes.
 * @abstract
 */
export class AbstractMode {
  /**
   * Creates a new mode instance.
   * 
   * @param {Object} context - Application services and dependencies
   * @param {SelectionManager} context.selectionManager - Manages cell selection state
   * @param {EditorManager} context.editorManager - Manages cell editing UI
   * @param {HistoryManager} context.historyManager - Manages undo/redo stack
   * @param {FileManager} context.fileManager - Manages file persistence
   * @param {Worker} context.formulaWorker - Web Worker for formula calculation
   * @param {GridRenderer} context.renderer - Renders the grid UI
   * @param {Function} context.switchMode - Callback to request mode transition
   */
  constructor(context) {
    if (new.target === AbstractMode) {
      throw new Error('AbstractMode is abstract and cannot be instantiated directly');
    }

    if (!context) {
      throw new Error('AbstractMode requires a context object');
    }

    /** @protected */
    this._selectionManager = context.selectionManager;
    
    /** @protected */
    this._editorManager = context.editorManager;
    
    /** @protected */
    this._historyManager = context.historyManager;
    
    /** @protected */
    this._fileManager = context.fileManager;
    
    /** @protected */
    this._formulaWorker = context.formulaWorker;
    
    /** @protected */
    this._renderer = context.renderer;
    
    /** @protected */
    this._switchMode = context.switchMode;

    /** @protected */
    this._context = context;

    Logger.log('AbstractMode', `${this.constructor.name} instantiated`);
  }

  /**
   * Returns the unique identifier for this mode.
   * 
   * @abstract
   * @returns {string} Mode identifier (e.g., 'ready', 'edit', 'point')
   */
  getName() {
    throw new Error(`${this.constructor.name} must implement getName()`);
  }

  /**
   * Called when this mode becomes the active mode.
   * 
   * @param {*} [payload] - Optional data passed from the previous mode or trigger
   */
  onEnter(payload) {
    Logger.log(this.getName(), `Entering mode`, payload ? { payload } : '');
  }

  /**
   * Called when this mode is being deactivated.
   */
  onExit() {
    Logger.log(this.getName(), `Exiting mode`);
  }

  /**
   * Handles a semantic intent from the InputController.
   * 
   * @param {string} intent - The intent identifier from INTENTS enum
   * @param {Object} [context] - Additional data about the intent
   * @returns {boolean} True if handled, false to allow default behavior
   */
  handleIntent(intent, context) {
    Logger.log(this.getName(), `Unhandled intent: ${intent}`, context || '');
    return false;
  }

  /**
   * Requests a transition to another mode.
   * 
   * @protected
   * @param {string} modeName - Name of the mode to switch to
   * @param {*} [payload] - Data to pass to the new mode's onEnter()
   */
  _requestModeSwitch(modeName, payload) {
    if (!this._switchMode) {
      Logger.warn(this.getName(), 'Cannot switch mode: switchMode callback not provided');
      return;
    }
    
    Logger.log(this.getName(), `Requesting switch to "${modeName}"`, payload ? { payload } : '');
    this._switchMode(modeName, payload);
  }

  /**
   * Gets the currently active cell ID.
   * 
   * @protected
   * @returns {string|null} Cell ID like "A1" or null if none selected
   */
  _getActiveCellId() {
    return this._selectionManager?.getActiveCellId() || null;
  }

  /**
   * Gets the raw value (formula string or text) for a cell.
   * 
   * @protected
   * @param {string} cellId - The cell ID
   * @returns {string} The raw value or empty string
   */
  _getCellValue(cellId) {
    return this._fileManager?.getRawCellValue(cellId) || '';
  }

  /**
   * Executes a cell update through the history system.
   * 
   * @protected
   * @param {string} cellId - The cell to update
   * @param {string} newValue - The new value
   */
  _executeCellUpdate(cellId, newValue) {
    if (!this._context.executeCellUpdate) {
      Logger.warn(this.getName(), 'executeCellUpdate not available in context');
      return;
    }
    this._context.executeCellUpdate(cellId, newValue);
  }
}