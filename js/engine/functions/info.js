/**
 * Information Functions
 *
 * This file contains the implementation for information and type-checking
 * formula functions (e.g., ISBLANK, ISERROR, ISNUMBER, ISTEXT).
 *
 * Each function is designed to be called by the Evaluator,
 * and `this` will be bound to the Evaluator's instance,
 * giving us access to `this.coerce` and other utilities.
 */

import { FormulaError } from '../utils/FormulaErrors.js';

/**
 * ISBLANK: Returns TRUE if the value is empty/blank.
 *
 * @param {*} value - The value to check.
 * @returns {boolean} TRUE if the value is blank, FALSE otherwise.
 */
function ISBLANK(value) {
  return value === null || value === undefined || value === '';
}

/**
 * ISERROR: Returns TRUE if the value is any error type.
 *
 * @param {*} value - The value to check.
 * @returns {boolean} TRUE if the value is an error, FALSE otherwise.
 */
function ISERROR(value) {
  // Check if value is a FormulaError instance
  if (value instanceof FormulaError) {
    return true;
  }

  // Check if value is a string that looks like an error
  if (typeof value === 'string') {
    const errorPatterns = ['#DIV/0!', '#N/A', '#NAME?', '#NULL!', '#NUM!', '#REF!', '#VALUE!'];
    return errorPatterns.includes(value.toUpperCase());
  }

  return false;
}

/**
 * ISNUMBER: Returns TRUE if the value is a number.
 *
 * @param {*} value - The value to check.
 * @returns {boolean} TRUE if the value is a number, FALSE otherwise.
 */
function ISNUMBER(value) {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * ISTEXT: Returns TRUE if the value is text.
 *
 * @param {*} value - The value to check.
 * @returns {boolean} TRUE if the value is text, FALSE otherwise.
 */
function ISTEXT(value) {
  return typeof value === 'string';
}

// Export all functions as an object
export const infoFunctions = {
  ISBLANK,
  ISERROR,
  ISNUMBER,
  ISTEXT,
};
