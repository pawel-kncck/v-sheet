/**
 * HistoryManager - Manages undo/redo stacks using the Command pattern
 *
 * This class maintains two stacks:
 * - undoStack: Commands that can be undone
 * - redoStack: Commands that can be redone
 *
 * When a new command is executed, it's added to undoStack and redoStack is cleared.
 * When undo is called, the command is moved from undoStack to redoStack.
 * When redo is called, the command is moved from redoStack back to undoStack.
 */
export class HistoryManager {
  /**
   * @param {number} maxStackSize - Maximum number of commands to keep in history
   */
  constructor(maxStackSize = 100) {
    /** @type {Command[]} */
    this.undoStack = [];

    /** @type {Command[]} */
    this.redoStack = [];

    /** @type {number} */
    this.maxStackSize = maxStackSize;
  }

  /**
   * Executes a command and adds it to the undo stack
   * Clears the redo stack (new action invalidates redo history)
   *
   * @param {Command} command - The command to execute
   */
  execute(command) {
    // Execute the command
    command.execute();

    // Add to undo stack
    this.undoStack.push(command);

    // Clear redo history (new action invalidates any redoable commands)
    this.redoStack = [];

    // Enforce stack size limit to prevent unbounded memory growth
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift(); // Remove oldest command
    }
  }

  /**
   * Undoes the last command
   * @returns {boolean} True if undo was performed, false if stack empty
   */
  undo() {
    if (this.undoStack.length === 0) {
      console.warn('Nothing to undo');
      return false;
    }

    // Pop command from undo stack
    const command = this.undoStack.pop();

    // Reverse the command
    command.undo();

    // Add to redo stack
    this.redoStack.push(command);

    return true;
  }

  /**
   * Redoes the last undone command
   * @returns {boolean} True if redo was performed, false if stack empty
   */
  redo() {
    if (this.redoStack.length === 0) {
      console.warn('Nothing to redo');
      return false;
    }

    // Pop command from redo stack
    const command = this.redoStack.pop();

    // Re-execute the command
    command.execute();

    // Add back to undo stack
    this.undoStack.push(command);

    return true;
  }

  /**
   * Checks if undo is available
   * @returns {boolean} True if there are commands to undo
   */
  canUndo() {
    return this.undoStack.length > 0;
  }

  /**
   * Checks if redo is available
   * @returns {boolean} True if there are commands to redo
   */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * Clears all history (useful for file load)
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Gets the current size of the undo stack
   * @returns {number}
   */
  getUndoStackSize() {
    return this.undoStack.length;
  }

  /**
   * Gets the current size of the redo stack
   * @returns {number}
   */
  getRedoStackSize() {
    return this.redoStack.length;
  }
}
