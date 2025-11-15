/**
 * Math Functions
 *
 * This file contains the implementation for all math-related
 * formula functions (e.g., SUM, AVERAGE, COUNT).
 *
 * Each function is designed to be called by the Evaluator,
 * and `this` will be bound to the Evaluator's instance,
 * giving us access to `this.coerce` and other utilities.
 */

// We will import TypeCoercion and Error types in the final
// version. For now, we assume `this.coerce` is available.

/**
 * SUM: Adds all numbers in a range of cells.
 *
 * @param {...any} args - A variable number of arguments.
 * Can be single values or arrays (from ranges).
 * @returns {number} The sum of all numeric values.
 */
function SUM(...args) {
  // `this` is bound to the Evaluator instance

  // 1. Flatten all arguments. This handles ranges (e.g., A1:B2)
  //    and multiple arguments (e.g., SUM(A1, B2:C10, 5)).
  //    [5, [10, 20], "hello"] becomes [5, 10, 20, "hello"]
  const values = args.flat(Infinity);

  // 2. Reduce the flattened array to a single sum
  return values.reduce((accumulator, currentValue) => {
    // 3. Use the coercer to convert any value (like strings, booleans)
    //    to a number before adding. "hello" will become 0.
    return accumulator + this.coerce.toNumber(currentValue);
  }, 0);
}

// --- Add other math functions here (AVERAGE, COUNT, etc.) ---

// Export all functions as an object
export const mathFunctions = {
  SUM,
  // AVERAGE,
  // COUNT,
};
