/**
 * Intents.js
 * 
 * Defines the semantic vocabulary for user interactions in the spreadsheet.
 * 
 * The Intent system decouples "what the user pressed" (raw DOM events) from
 * "what the user wants to do" (semantic actions). This allows:
 * 
 * 1. InputController to normalize platform differences (Cmd vs Ctrl)
 * 2. Modes to handle intents without knowing about specific keys
 * 3. Easy remapping of keyboard shortcuts in the future
 * 
 * @module modes/Intents
 */

/**
 * Enumeration of all semantic intents in the application.
 * @readonly
 * @enum {string}
 */
export const INTENTS = Object.freeze({
  // Navigation
  NAVIGATE: 'NAVIGATE',
  JUMP_TO_EDGE: 'JUMP_TO_EDGE',
  
  // Editing Lifecycle
  EDIT_START: 'EDIT_START',
  COMMIT: 'COMMIT',
  CANCEL: 'CANCEL',
  
  // Text Input
  INPUT: 'INPUT',
  
  // Deletion
  DELETE: 'DELETE',
  
  // History
  UNDO: 'UNDO',
  REDO: 'REDO',
  
  // Clipboard
  COPY: 'COPY',
  PASTE: 'PASTE',
  CUT: 'CUT',
  
  // Selection
  SELECT_ALL: 'SELECT_ALL',
  CELL_SELECT: 'CELL_SELECT',
  HEADER_SELECT: 'HEADER_SELECT',
  
  // Formatting
  FORMAT_BOLD: 'FORMAT_BOLD',
  FORMAT_ITALIC: 'FORMAT_ITALIC',

  // Formula Editing
  TOGGLE_REFERENCE: 'TOGGLE_REFERENCE',
});

/**
 * Valid directions for navigation intents.
 * @readonly
 * @enum {string}
 */
export const DIRECTIONS = Object.freeze({
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
});

/**
 * Characters that trigger formula mode when typed in Ready state.
 * @readonly
 */
export const FORMULA_TRIGGERS = Object.freeze(['=', '+', '-']);

/**
 * Valid move directions after commit.
 * @readonly
 * @enum {string}
 */
export const COMMIT_MOVES = Object.freeze({
  DOWN: 'down',
  RIGHT: 'right',
  NONE: 'none',
});

// ============================================================================
// Context Factory Functions
// ============================================================================

/**
 * Creates a context object for NAVIGATE intents.
 */
export function createNavigateContext(direction, shift = false) {
  if (!Object.values(DIRECTIONS).includes(direction)) {
    throw new Error(`Invalid direction: ${direction}. Must be one of: ${Object.values(DIRECTIONS).join(', ')}`);
  }
  return Object.freeze({ direction, shift });
}

/**
 * Creates a context object for JUMP_TO_EDGE intents.
 */
export function createJumpContext(direction, shift = false) {
  if (!Object.values(DIRECTIONS).includes(direction)) {
    throw new Error(`Invalid direction: ${direction}. Must be one of: ${Object.values(DIRECTIONS).join(', ')}`);
  }
  return Object.freeze({ direction, shift });
}

/**
 * Creates a context object for INPUT intents.
 */
export function createInputContext(char) {
  if (typeof char !== 'string' || char.length !== 1) {
    throw new Error(`Invalid char: expected single character string, got ${typeof char}: ${char}`);
  }
  return Object.freeze({
    char,
    isFormulaTrigger: FORMULA_TRIGGERS.includes(char),
  });
}

/**
 * Creates a context object for COMMIT intents.
 */
export function createCommitContext(moveDirection = COMMIT_MOVES.DOWN) {
  if (!Object.values(COMMIT_MOVES).includes(moveDirection)) {
    throw new Error(`Invalid moveDirection: ${moveDirection}. Must be one of: ${Object.values(COMMIT_MOVES).join(', ')}`);
  }
  return Object.freeze({ moveDirection });
}

/**
 * Creates a context object for CELL_SELECT intents.
 */
export function createCellSelectContext(coords, shift = false, ctrl = false) {
  if (!coords || typeof coords.row !== 'number' || typeof coords.col !== 'number') {
    throw new Error(`Invalid coords: expected { row: number, col: number }, got ${JSON.stringify(coords)}`);
  }
  return Object.freeze({
    coords: Object.freeze({ ...coords }),
    shift,
    ctrl,
  });
}

/**
 * Creates a context object for HEADER_SELECT intents.
 */
export function createHeaderSelectContext(type, index, shift = false, ctrl = false) {
  if (type !== 'row' && type !== 'col') {
    throw new Error(`Invalid header type: ${type}. Must be 'row' or 'col'`);
  }
  if (typeof index !== 'number' || index < 0) {
    throw new Error(`Invalid index: ${index}. Must be non-negative number`);
  }
  return Object.freeze({ type, index, shift, ctrl });
}

/**
 * Creates a context object for DELETE intents.
 */
export function createDeleteContext(key) {
  const normalizedKey = key.toLowerCase();
  if (normalizedKey !== 'backspace' && normalizedKey !== 'delete') {
    throw new Error(`Invalid delete key: ${key}. Must be 'backspace' or 'delete'`);
  }
  return Object.freeze({ key: normalizedKey });
}

/**
 * Creates a context object for EDIT_START intents.
 */
export function createEditStartContext(source = 'keyboard') {
  if (source !== 'keyboard' && source !== 'mouse' && source !== 'formulaBar') {
    throw new Error(`Invalid source: ${source}. Must be 'keyboard', 'mouse', or 'formulaBar'`);
  }
  return Object.freeze({ source });
}