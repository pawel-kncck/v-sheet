/**
 * InputController.js
 *
 * The single point of contact with the DOM for keyboard and mouse events.
 *
 * This class acts as an "Event Gateway" that:
 * 1. Captures raw DOM events (keydown, mousedown, etc.)
 * 2. Normalizes platform differences (Cmd vs Ctrl)
 * 3. Translates events into semantic intents
 * 4. Delegates intents to the ModeManager
 *
 * By centralizing event handling, we:
 * - Eliminate scattered event listeners
 * - Make keyboard shortcuts easy to remap
 * - Enable platform-agnostic mode logic
 * - Improve testability
 *
 * @module ui/InputController
 */

import {
  INTENTS,
  DIRECTIONS,
  COMMIT_MOVES,
  createNavigateContext,
  createJumpContext,
  createInputContext,
  createCommitContext,
  createDeleteContext,
  createEditStartContext
} from '../modes/Intents.js';
import { Logger } from '../engine/utils/Logger.js';

/**
 * Input event gateway and normalizer.
 */
export class InputController {
  /**
   * Creates a new InputController.
   *
   * @param {HTMLElement} container - DOM element to attach listeners to
   * @param {ModeManager} modeManager - Mode manager to delegate intents to
   */
  constructor(container, modeManager) {
    if (!container) {
      throw new Error('InputController requires a container element');
    }
    if (!modeManager) {
      throw new Error('InputController requires a ModeManager');
    }

    /** @private */
    this._container = container;

    /** @private */
    this._modeManager = modeManager;

    /** @private */
    this._attached = false;

    // Bind methods for event listener removal
    this._boundHandleKeyDown = this._handleKeyDown.bind(this);
    this._boundHandleMouseDown = this._handleMouseDown.bind(this);

    Logger.log('InputController', 'Initialized');
  }

  /**
   * Attaches all DOM event listeners.
   */
  attach() {
    if (this._attached) {
      Logger.warn('InputController', 'Already attached');
      return;
    }

    this._container.addEventListener('keydown', this._boundHandleKeyDown);
    this._container.addEventListener('mousedown', this._boundHandleMouseDown);
    this._attached = true;

    Logger.log('InputController', 'Event listeners attached');
  }

  /**
   * Removes all DOM event listeners.
   */
  detach() {
    if (!this._attached) {
      Logger.warn('InputController', 'Not attached');
      return;
    }

    this._container.removeEventListener('keydown', this._boundHandleKeyDown);
    this._container.removeEventListener('mousedown', this._boundHandleMouseDown);
    this._attached = false;

    Logger.log('InputController', 'Event listeners detached');
  }

  /**
   * Handles keyboard events and converts them to intents.
   *
   * @private
   * @param {KeyboardEvent} event - The keyboard event
   */
  _handleKeyDown(event) {
    // Normalize modifiers
    const modifiers = this._normalizeModifiers(event);

    // Map key + modifiers to intent
    const intentData = this._mapKeyToIntent(event.key, modifiers, event);

    if (!intentData) {
      // No intent mapped, allow default behavior
      return;
    }

    const { intent, context } = intentData;

    Logger.log('InputController', `Key "${event.key}" → Intent "${intent}"`, context || '');

    // Delegate to ModeManager
    const handled = this._modeManager.handleIntent(intent, context);

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  /**
   * Handles mouse events and converts them to intents.
   *
   * @private
   * @param {MouseEvent} event - The mouse event
   */
  _handleMouseDown(event) {
    // This will be implemented in Phase 4, Chunk 4.4
    // For now, leave mouse events to be handled by existing system
  }

  /**
   * Normalizes modifier keys across platforms.
   *
   * @private
   * @param {KeyboardEvent|MouseEvent} event - The event
   * @returns {{ ctrl: boolean, shift: boolean, alt: boolean, meta: boolean }}
   */
  _normalizeModifiers(event) {
    return {
      // Treat Cmd (Mac) and Ctrl (Windows/Linux) as equivalent
      ctrl: event.ctrlKey || event.metaKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey
    };
  }

  /**
   * Maps a key + modifiers to an intent and context.
   *
   * @private
   * @param {string} key - The key name from event.key
   * @param {Object} modifiers - Normalized modifiers
   * @param {KeyboardEvent} event - Original event for additional context
   * @returns {{ intent: string, context: Object }|null}
   */
  _mapKeyToIntent(key, modifiers, event) {
    const { ctrl, shift, alt } = modifiers;

    // Navigation: Arrow keys
    if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
      const directionMap = {
        'ArrowUp': DIRECTIONS.UP,
        'ArrowDown': DIRECTIONS.DOWN,
        'ArrowLeft': DIRECTIONS.LEFT,
        'ArrowRight': DIRECTIONS.RIGHT
      };
      const direction = directionMap[key];

      // Ctrl/Cmd + Arrow = Jump to edge
      if (ctrl) {
        return {
          intent: INTENTS.JUMP_TO_EDGE,
          context: createJumpContext(direction, shift)
        };
      }

      // Regular arrow navigation
      return {
        intent: INTENTS.NAVIGATE,
        context: createNavigateContext(direction, shift)
      };
    }

    // Enter: Commit (with down move) or Edit Start (context-dependent)
    if (key === 'Enter') {
      return {
        intent: INTENTS.COMMIT,
        context: createCommitContext(COMMIT_MOVES.DOWN)
      };
    }

    // Tab: Commit with right move
    if (key === 'Tab') {
      return {
        intent: INTENTS.COMMIT,
        context: createCommitContext(COMMIT_MOVES.RIGHT)
      };
    }

    // Escape: Cancel
    if (key === 'Escape') {
      return {
        intent: INTENTS.CANCEL,
        context: null
      };
    }

    // Delete/Backspace: Delete
    if (key === 'Delete' || key === 'Backspace') {
      return {
        intent: INTENTS.DELETE,
        context: createDeleteContext(key)
      };
    }

    // F2: Edit Start
    if (key === 'F2') {
      return {
        intent: INTENTS.EDIT_START,
        context: createEditStartContext('keyboard')
      };
    }

    // Ctrl+Z: Undo
    if (ctrl && !shift && key === 'z') {
      return {
        intent: INTENTS.UNDO,
        context: null
      };
    }

    // Ctrl+Y or Ctrl+Shift+Z: Redo
    if ((ctrl && key === 'y') || (ctrl && shift && key === 'z')) {
      return {
        intent: INTENTS.REDO,
        context: null
      };
    }

    // Ctrl+C: Copy
    if (ctrl && key === 'c') {
      return {
        intent: INTENTS.COPY,
        context: null
      };
    }

    // Ctrl+V: Paste
    if (ctrl && key === 'v') {
      return {
        intent: INTENTS.PASTE,
        context: null
      };
    }

    // Ctrl+X: Cut
    if (ctrl && key === 'x') {
      return {
        intent: INTENTS.CUT,
        context: null
      };
    }

    // Ctrl+A: Select All
    if (ctrl && key === 'a') {
      return {
        intent: INTENTS.SELECT_ALL,
        context: null
      };
    }

    // Ctrl+B: Bold
    if (ctrl && key === 'b') {
      return {
        intent: INTENTS.FORMAT_BOLD,
        context: null
      };
    }

    // Ctrl+I: Italic
    if (ctrl && key === 'i') {
      return {
        intent: INTENTS.FORMAT_ITALIC,
        context: null
      };
    }

    // Regular character input (letters, numbers, symbols)
    if (key.length === 1 && !ctrl && !alt) {
      return {
        intent: INTENTS.INPUT,
        context: createInputContext(key)
      };
    }

    // No intent mapping for this key combination
    return null;
  }
}
