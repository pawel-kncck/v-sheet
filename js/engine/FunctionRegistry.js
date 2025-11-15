/**
 * FunctionRegistry
 *
 * This class acts as a central "dictionary" for all built-in and custom
 * formula functions. It stores a mapping between a function's name
 * (e.g., "SUM") and its JavaScript implementation.
 *
 * It ensures all function names are treated case-insensitively by
 * normalizing them to uppercase.
 *
 * The Evaluator will use this class to look up and execute functions.
 */
class FunctionRegistry {
  constructor() {
    /**
     * @type {Map<string, Function>}
     * A Map to store the function implementations.
     * Key: Function name in uppercase (e.g., "SUM").
     * Value: The JavaScript function to execute.
     */
    this.functions = new Map();
  }

  /**
   * Registers a new function in the registry.
   * If a function with the same name already exists, it will be overwritten.
   *
   * @param {string} name - The name of the function (e.g., "SUM", "IF").
   * @param {Function} implementation - The JavaScript function that performs
   * the calculation. This function will be called by the Evaluator.
   */
  register(name, implementation) {
    const upperName = name.toUpperCase();
    this.functions.set(upperName, implementation);
  }

  /**
   * Retrieves a function's implementation by its name.
   *
   * @param {string} name - The name of the function to retrieve (case-insensitive).
   * @returns {Function|undefined} The function implementation if found,
   * or undefined if the function is not registered.
   *
   * The Evaluator is responsible for handling the `undefined` case and
   * returning a #NAME? error.
   */
  get(name) {
    const upperName = name.toUpperCase();
    return this.functions.get(upperName);
  }

  /**
   * Checks if a function is registered.
   * @param {string} name - The name of the function to check (case-insensitive).
   * @returns {boolean} True if the function is registered, false otherwise.
   */
  has(name) {
    const upperName = name.toUpperCase();
    return this.functions.has(upperName);
  }

  /**
   * Returns a list of all registered function names.
   * Useful for UI hints, autocomplete, or documentation.
   * @returns {Array<string>} An array of all function names (e.g., ["SUM", "IF", ...]).
   */
  list() {
    return Array.from(this.functions.keys());
  }
}

// Export the class for ES6 Modules
export { FunctionRegistry };
