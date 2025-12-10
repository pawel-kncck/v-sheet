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

// We will import TypeCoercion and Error types in the final
// version. For now, we assume `this.coerce` is available.

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

// Export all functions as an object
export const logicalFunctions = {
  IF,
  AND,
  OR,
  NOT,
};
