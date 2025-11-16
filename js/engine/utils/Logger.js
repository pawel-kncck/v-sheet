/**
 * Logger.js
 *
 * A simple, standardized logging utility.
 * It provides context-aware logging and can be
 * enabled/disabled via sessionStorage (on the main thread).
 *
 * To enable debug logs, run this in the browser console:
 * sessionStorage.setItem('vsheet-debug', 'true')
 */

let globalDebugFlag = false;

try {
  // This will work in the main thread (Window context)
  // and throw a ReferenceError in the Worker context.
  globalDebugFlag = sessionStorage.getItem('vsheet-debug') === 'true';
} catch (e) {
  // We are in the worker, sessionStorage is not defined.
  // The flag will remain 'false' until the main thread tells us otherwise.
  globalDebugFlag = false;
}

class Logger {
  /**
   * Manually sets the debug flag state.
   * This is used by the worker to receive the flag from the main thread.
   */
  static setDebugFlag(isEnabled) {
    globalDebugFlag = !!isEnabled;
  }

  /**
   * Logs a debug message.
   * Only outputs to console if the debug flag is true.
   * @param {string} context - The module or class logging the message.
   * @param {...any} args - The messages or objects to log.
   */
  static log(context, ...args) {
    if (globalDebugFlag) {
      console.log(`[${context}]`, ...args);
    }
  }

  /**
   * Logs a warning message.
   * Always outputs to console.
   * @param {string} context - The module or class logging the warning.
   * @param {...any} args - The messages or objects to log.
   */
  static warn(context, ...args) {
    console.warn(`[${context}]`, ...args);
  }

  /**
   * Logs an error message.
   * Always outputs to console.
   * @param {string} context - The module or class logging the error.
   * @param {...any} args - The messages or objects to log.
   */
  static error(context, ...args) {
    console.error(`[${context}]`, ...args);
  }
}

export { Logger };
