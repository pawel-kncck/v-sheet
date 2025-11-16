/**
 * Base Command class - All commands must extend this
 *
 * The Command Pattern encapsulates an action as an object,
 * allowing us to undo/redo by storing a history of commands.
 */
export class Command {
  /**
   * Executes the command's action
   * Must be implemented by subclasses
   * @throws {Error} If not implemented
   */
  execute() {
    throw new Error('Command.execute() must be implemented by subclass');
  }

  /**
   * Reverses the command's action
   * Must be implemented by subclasses
   * @throws {Error} If not implemented
   */
  undo() {
    throw new Error('Command.undo() must be implemented by subclass');
  }
}
