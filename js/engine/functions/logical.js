/**
 * Logical Functions
 *
 * This file contains the implementation for all logical
 * formula functions (e.g., IF, AND, OR, NOT).
 *
 * Each function is designed to be called by the Evaluator,
 * and `this` will be bound to the Evaluator's instance,
 * giving us access to `this.coerce` and other utilities.
 */

import { FormulaError, ValueError, NotAvailableError } from '../utils/FormulaErrors.js';

/**
 * IF: Returns one value if a logical expression is 'true'
 * and another if it is 'false'.
 *
 * @param {*} logical_test - The condition to check.
 * @param {*} value_if_true - The value to return if the condition is true.
 * @param {*} [value_if_false] - Optional. The value to return if the
 * condition is false. Defaults to FALSE.
 * @returns {*} The `value_if_true` or `value_if_false` result.
 */
function IF(logical_test, value_if_true, value_if_false) {
  // `this` is bound to the Evaluator instance

  // 1. Coerce the first argument to a boolean.
  const isTrue = this.coerce.toBoolean(logical_test);

  // 2. Return the correct value based on the test.
  if (isTrue) {
    return value_if_true;
  } else {
    // 3. If value_if_false is not provided, return FALSE.
    return value_if_false === undefined ? false : value_if_false;
  }
}

/**
 * AND: Returns TRUE if all arguments are TRUE.
 *
 * @param {...any} args - Variable number of logical expressions.
 * @returns {boolean} TRUE if all arguments are TRUE, FALSE otherwise.
 */
function AND(...args) {
  // Flatten arguments in case any are arrays (from ranges)
  const values = args.flat(Infinity);

  // If no arguments, return TRUE (Excel behavior)
  if (values.length === 0) {
    return true;
  }

  // Check if all values coerce to TRUE
  for (const value of values) {
    if (!this.coerce.toBoolean(value)) {
      return false;
    }
  }

  return true;
}

/**
 * OR: Returns TRUE if any argument is TRUE.
 *
 * @param {...any} args - Variable number of logical expressions.
 * @returns {boolean} TRUE if any argument is TRUE, FALSE otherwise.
 */
function OR(...args) {
  // Flatten arguments in case any are arrays (from ranges)
  const values = args.flat(Infinity);

  // If no arguments, return FALSE (Excel behavior)
  if (values.length === 0) {
    return false;
  }

  // Check if any value coerces to TRUE
  for (const value of values) {
    if (this.coerce.toBoolean(value)) {
      return true;
    }
  }

  return false;
}

/**
 * NOT: Reverses the logical value of its argument.
 *
 * @param {*} logical - The logical expression to reverse.
 * @returns {boolean} TRUE if the argument is FALSE, FALSE if the argument is TRUE.
 */
function NOT(logical) {
  return !this.coerce.toBoolean(logical);
}

/**
 * IFS: Checks multiple conditions and returns the value corresponding
 * to the first TRUE condition.
 *
 * @param {...any} args - Pairs of (condition, value) arguments.
 * @returns {*} The value corresponding to the first TRUE condition.
 * @throws {NotAvailableError} If no condition is TRUE.
 * @throws {ValueError} If arguments are not in pairs.
 */
function IFS(...args) {
  // Arguments should be in pairs: condition1, value1, condition2, value2, ...
  if (args.length === 0 || args.length % 2 !== 0) {
    throw new ValueError('IFS requires arguments in pairs (condition, value)');
  }

  for (let i = 0; i < args.length; i += 2) {
    const condition = args[i];
    const value = args[i + 1];

    if (this.coerce.toBoolean(condition)) {
      return value;
    }
  }

  // No condition was TRUE
  throw new NotAvailableError('No matching condition in IFS');
}

/**
 * IFERROR: Returns a specified value if a formula evaluates to an error;
 * otherwise, returns the result of the formula.
 *
 * Note: Since we can't actually catch errors from other formula evaluations
 * in this context, this function checks if the value is a FormulaError instance
 * or a string that looks like an error (e.g., "#DIV/0!").
 *
 * @param {*} value - The value or expression to check for an error.
 * @param {*} value_if_error - The value to return if the first argument is an error.
 * @returns {*} The original value if not an error, otherwise value_if_error.
 */
function IFERROR(value, value_if_error) {
  // Check if value is a FormulaError instance
  if (value instanceof FormulaError) {
    return value_if_error;
  }

  // Check if value is a string that looks like an error
  if (typeof value === 'string') {
    const errorPatterns = ['#DIV/0!', '#N/A', '#NAME?', '#NULL!', '#NUM!', '#REF!', '#VALUE!'];
    if (errorPatterns.includes(value.toUpperCase())) {
      return value_if_error;
    }
  }

  return value;
}

// Export all functions as an object
export const logicalFunctions = {
  IF,
  AND,
  OR,
  NOT,
  IFS,
  IFERROR,
};
