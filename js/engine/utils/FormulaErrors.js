/**
 * FormulaErrors
 *
 * This file defines custom error classes for spreadsheet-specific errors.
 *
 * Using custom classes allows the Evaluator to 'throw' an error
 * and the engine to 'catch' it and display it as a value in the cell
 * without halting all calculations.
 */

/**
 * Base class for all formula-related errors.
 */
class FormulaError extends Error {
  /**
   * @param {string} name - The error name (e.g., "#DIV/0!").
   * @param {string} [message] - An optional, more descriptive message.
   */
  constructor(name, message) {
    super(message || name);
    this.name = name;
  }

  /**
   * Overrides the default toString method to return the error name.
   * This is what will be displayed in the cell.
   * @returns {string} The error name (e.g., "#DIV/0!").
   */
  toString() {
    return this.name;
  }
}

// --- Specific Formula Error Classes ---

/**
 * #DIV/0! - Division by zero error.
 */
class DivZeroError extends FormulaError {
  constructor(message = 'Division by zero') {
    super('#DIV/0!', message);
  }
}

/**
 * #N/A - Not Available error.
 * Used when a value is not available for a function or operation.
 */
class NotAvailableError extends FormulaError {
  constructor(message = 'Value not available') {
    super('#N/A', message);
  }
}

/**
 * #NAME? - Invalid name error.
 * Used when a function name or named range is not recognized.
 */
class NameError extends FormulaError {
  constructor(message = 'Invalid name') {
    super('#NAME?', message);
  }
}

/**
 * #NULL! - Null range error.
 * Used when a range intersection results in no cells.
 */
class NullError extends FormulaError {
  constructor(message = 'Null range') {
    super('#NULL!', message);
  }
}

/**
 * #NUM! - Number error.
 * Used for invalid numeric arguments (e.g., sqrt(-1)).
 */
class NumError extends FormulaError {
  constructor(message = 'Invalid number') {
    super('#NUM!', message);
  }
}

/**
 * #REF! - Invalid reference error.
 * Used when a cell reference is invalid (e.g., deleted row).
 */
class RefError extends FormulaError {
  constructor(message = 'Invalid reference') {
    super('#REF!', message);
  }
}

/**
 * #VALUE! - Value error.
 * Used when an incorrect data type is used (e.g., "text" + 1).
 * Note: Our TypeCoercion may handle many of these.
 */
class ValueError extends FormulaError {
  constructor(message = 'Invalid value type') {
    super('#VALUE!', message);
  }
}

// Export all error classes for ES6 Modules
export {
  FormulaError,
  DivZeroError,
  NotAvailableError,
  NameError,
  NullError,
  NumError,
  RefError,
  ValueError,
};
