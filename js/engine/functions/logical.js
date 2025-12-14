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

// ============================================
// MEDIUM PRIORITY LOGICAL FUNCTIONS
// ============================================

/**
 * IFNA: Returns a specified value if a formula evaluates to #N/A error;
 * otherwise, returns the result of the formula.
 *
 * @param {*} value - The value or expression to check.
 * @param {*} value_if_na - The value to return if #N/A.
 * @returns {*} The original value if not #N/A, otherwise value_if_na.
 */
function IFNA(value, value_if_na) {
  // Check if value is a NotAvailableError instance
  if (value instanceof NotAvailableError) {
    return value_if_na;
  }

  // Check if value is the #N/A string
  if (typeof value === 'string' && value.toUpperCase() === '#N/A') {
    return value_if_na;
  }

  return value;
}

/**
 * XOR: Returns TRUE if an odd number of arguments are TRUE.
 *
 * @param {...any} args - Variable number of logical expressions.
 * @returns {boolean} TRUE if odd number of args are TRUE, FALSE otherwise.
 */
function XOR(...args) {
  const values = args.flat(Infinity);

  let trueCount = 0;
  for (const value of values) {
    if (this.coerce.toBoolean(value)) {
      trueCount++;
    }
  }

  return trueCount % 2 === 1;
}

/**
 * SWITCH: Evaluates an expression against a list of values and returns
 * the result corresponding to the first matching value.
 *
 * @param {*} expression - The value to match.
 * @param {...any} args - Pairs of (value, result), optionally followed by a default.
 * @returns {*} The result for the matching value.
 * @throws {NotAvailableError} If no match found and no default provided.
 */
function SWITCH(expression, ...args) {
  if (args.length === 0) {
    throw new ValueError('SWITCH requires at least one value-result pair');
  }

  // Check if we have a default value (odd number of remaining args)
  const hasDefault = args.length % 2 === 1;
  const pairs = hasDefault ? args.slice(0, -1) : args;
  const defaultValue = hasDefault ? args[args.length - 1] : undefined;

  // Check each value-result pair
  for (let i = 0; i < pairs.length; i += 2) {
    const matchValue = pairs[i];
    const result = pairs[i + 1];

    // Compare values (case-insensitive for strings)
    if (typeof expression === 'string' && typeof matchValue === 'string') {
      if (expression.toLowerCase() === matchValue.toLowerCase()) {
        return result;
      }
    } else if (expression === matchValue) {
      return result;
    }
  }

  if (hasDefault) {
    return defaultValue;
  }

  throw new NotAvailableError('No match found in SWITCH');
}

/**
 * CHOOSE: Returns a value from a list based on an index number.
 *
 * @param {*} index_num - The index (1-based) of the value to return.
 * @param {...any} values - The list of values to choose from.
 * @returns {*} The selected value.
 * @throws {ValueError} If index is out of range.
 */
function CHOOSE(index_num, ...values) {
  const index = this.coerce.toNumber(index_num);

  if (index < 1 || index > values.length) {
    throw new ValueError('CHOOSE index out of range');
  }

  return values[Math.floor(index) - 1];
}

// ============================================
// LOW PRIORITY LOGICAL FUNCTIONS
// ============================================

/**
 * TRUE: Returns the logical value TRUE.
 *
 * @returns {boolean} TRUE.
 */
function TRUE() {
  return true;
}

/**
 * FALSE: Returns the logical value FALSE.
 *
 * @returns {boolean} FALSE.
 */
function FALSE() {
  return false;
}

// Export all functions as an object
export const logicalFunctions = {
  IF,
  AND,
  OR,
  NOT,
  IFS,
  IFERROR,
  // Medium priority
  IFNA,
  XOR,
  SWITCH,
  CHOOSE,
  // Low priority
  TRUE,
  FALSE,
};
