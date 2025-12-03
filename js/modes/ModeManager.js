/**
 * ModeManager.js
 * 
 * The central Finite State Machine (FSM) controller for the spreadsheet application.
 * 
 * ModeManager implements the State Pattern by:
 * 1. Maintaining a reference to the currently active mode
 * 2. Delegating all intent handling to that mode
 * 3. Managing transitions between modes with proper lifecycle hooks
 * 
 * ## Responsibilities
 * 
 * - Mode Registration: Stores mode classes for lazy instantiation
 * - Mode Caching: Instantiates each mode once, then reuses
 * - Transition Management: Calls onExit() → onEnter() in correct order
 * - Intent Delegation: Routes all intents to the current mode
 * 
 * @module modes/ModeManager
 */

import { Logger } from '../engine/utils/Logger.js';

/**
 * Central controller for application modes.
 */
export class ModeManager {
  /**
   * Creates a new ModeManager instance.
   * 
   * @param {Object} context - Application services and dependencies
   * @param {SelectionManager} context.selectionManager - Manages cell selection state
   * @param {EditorManager} context.editorManager - Manages cell editing UI
   * @param {HistoryManager} context.historyManager - Manages undo/redo stack
   * @param {FileManager} context.fileManager - Manages file persistence
   * @param {Worker} context.formulaWorker - Web Worker for formula calculation
   * @param {GridRenderer} context.renderer - Renders the grid UI
   * @param {Function} [context.executeCellUpdate] - Callback to update cell values
   */
  constructor(context) {
    if (!context) {
      throw new Error('ModeManager requires a context object');
    }

    /**
     * Application context passed to all modes.
     * @private
     */
    this._context = {
      ...context,
      switchMode: this.switchMode.bind(this)
    };

    /**
     * Registry of mode classes (not instances).
     * @private
     * @type {Map<string, typeof AbstractMode>}
     */
    this._modeRegistry = new Map();

    /**
     * Cache of instantiated mode instances.
     * @private
     * @type {Map<string, AbstractMode>}
     */
    this._modeInstances = new Map();

    /**
     * The currently active mode instance.
     * @private
     * @type {AbstractMode|null}
     */
    this._currentMode = null;

    /**
     * The name of the currently active mode.
     * @private
     * @type {string|null}
     */
    this._currentModeName = null;

    Logger.log('ModeManager', 'Initialized');
  }

  /**
   * Registers a mode class with the manager.
   * 
   * @param {string} name - Unique identifier for the mode
   * @param {typeof AbstractMode} ModeClass - The mode class constructor
   * @throws {Error} If name is empty or ModeClass is not a constructor
   */
  registerMode(name, ModeClass) {
    if (!name || typeof name !== 'string') {
      throw new Error('Mode name must be a non-empty string');
    }

    if (typeof ModeClass !== 'function') {
      throw new Error(`Mode class for "${name}" must be a constructor function`);
    }

    if (this._modeRegistry.has(name)) {
      Logger.warn('ModeManager', `Overwriting existing mode registration: "${name}"`);
    }

    this._modeRegistry.set(name, ModeClass);
    Logger.log('ModeManager', `Registered mode: "${name}"`);
  }

  /**
   * Gets an existing mode instance or creates one if it doesn't exist.
   * 
   * @private
   * @param {string} modeName - The name of the mode to get/create
   * @returns {AbstractMode} The mode instance
   * @throws {Error} If the mode is not registered
   */
  _getOrCreateMode(modeName) {
    if (this._modeInstances.has(modeName)) {
      return this._modeInstances.get(modeName);
    }

    const ModeClass = this._modeRegistry.get(modeName);
    if (!ModeClass) {
      throw new Error(
        `Mode "${modeName}" is not registered. ` +
        `Available modes: ${Array.from(this._modeRegistry.keys()).join(', ') || 'none'}`
      );
    }

    Logger.log('ModeManager', `Instantiating mode: "${modeName}"`);
    const instance = new ModeClass(this._context);
    this._modeInstances.set(modeName, instance);

    return instance;
  }

  /**
   * Transitions to a new mode.
   * 
   * @param {string} modeName - The name of the mode to switch to
   * @param {*} [payload] - Optional data to pass to the new mode's onEnter()
   * @throws {Error} If modeName is not registered
   */
  switchMode(modeName, payload) {
    if (!this._modeRegistry.has(modeName)) {
      throw new Error(
        `Cannot switch to unregistered mode: "${modeName}". ` +
        `Available modes: ${Array.from(this._modeRegistry.keys()).join(', ') || 'none'}`
      );
    }

    Logger.log(
      'ModeManager',
      `Switching mode: "${this._currentModeName || 'none'}" → "${modeName}"`,
      payload ? { payload } : ''
    );

    // Step 1: Exit current mode
    if (this._currentMode) {
      this._currentMode.onExit();
    }

    // Step 2: Get or create new mode
    const newMode = this._getOrCreateMode(modeName);

    // Step 3: Update internal state
    this._currentMode = newMode;
    this._currentModeName = modeName;

    // Step 4: Enter new mode
    newMode.onEnter(payload);

    Logger.log('ModeManager', `Now in mode: "${modeName}"`);
  }

  /**
   * Delegates an intent to the currently active mode.
   * 
   * @param {string} intent - The intent identifier from INTENTS enum
   * @param {Object} [context] - Additional data about the intent
   * @returns {boolean} True if the intent was handled, false otherwise
   */
  handleIntent(intent, context) {
    if (!this._currentMode) {
      Logger.warn('ModeManager', `No active mode to handle intent: ${intent}`);
      return false;
    }

    return this._currentMode.handleIntent(intent, context);
  }

  /**
   * Returns the currently active mode instance.
   * 
   * @returns {AbstractMode|null} The current mode instance, or null if none active
   */
  getCurrentMode() {
    return this._currentMode;
  }

  /**
   * Returns the name of the currently active mode.
   * 
   * @returns {string|null} The current mode name, or null if none
   */
  getCurrentModeName() {
    return this._currentModeName;
  }

  /**
   * Checks if a mode is registered.
   * 
   * @param {string} modeName - The mode name to check
   * @returns {boolean} True if the mode is registered
   */
  hasMode(modeName) {
    return this._modeRegistry.has(modeName);
  }

  /**
   * Returns a list of all registered mode names.
   * 
   * @returns {string[]} Array of registered mode names
   */
  getRegisteredModes() {
    return Array.from(this._modeRegistry.keys());
  }

  /**
   * Checks if the manager is currently in a specific mode.
   * 
   * @param {string} modeName - The mode name to check
   * @returns {boolean} True if currently in the specified mode
   */
  isInMode(modeName) {
    return this._currentModeName === modeName;
  }

  /**
   * Resets the ModeManager to its initial state.
   * 
   * @param {boolean} [clearRegistry=false] - If true, also clears mode registrations
   */
  reset(clearRegistry = false) {
    if (this._currentMode) {
      this._currentMode.onExit();
    }

    this._currentMode = null;
    this._currentModeName = null;
    this._modeInstances.clear();

    if (clearRegistry) {
      this._modeRegistry.clear();
    }

    Logger.log('ModeManager', `Reset complete (clearRegistry: ${clearRegistry})`);
  }
}