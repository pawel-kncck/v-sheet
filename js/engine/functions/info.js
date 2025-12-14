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

import { FormulaError, NotAvailableError } from '../utils/FormulaErrors.js';

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

// ============================================
// MEDIUM PRIORITY INFO FUNCTIONS
// ============================================

/**
 * ISNA: Returns TRUE if the value is the #N/A error.
 *
 * @param {*} value - The value to check.
 * @returns {boolean} TRUE if the value is #N/A, FALSE otherwise.
 */
function ISNA(value) {
  // Check if value is a NotAvailableError instance
  if (value instanceof NotAvailableError) {
    return true;
  }

  // Check if value is the #N/A string
  if (typeof value === 'string' && value.toUpperCase() === '#N/A') {
    return true;
  }

  return false;
}

/**
 * ISLOGICAL: Returns TRUE if the value is a logical value (TRUE or FALSE).
 *
 * @param {*} value - The value to check.
 * @returns {boolean} TRUE if the value is a logical, FALSE otherwise.
 */
function ISLOGICAL(value) {
  return typeof value === 'boolean';
}

/**
 * NA: Returns the #N/A error value.
 *
 * @returns {NotAvailableError} The #N/A error.
 */
function NA() {
  throw new NotAvailableError('NA() function called');
}

/**
 * ISEVEN: Returns TRUE if the number is even.
 *
 * @param {*} number - The number to check.
 * @returns {boolean} TRUE if even, FALSE otherwise.
 */
function ISEVEN(number) {
  const num = this.coerce.toNumber(number);
  return Math.floor(Math.abs(num)) % 2 === 0;
}

/**
 * ISODD: Returns TRUE if the number is odd.
 *
 * @param {*} number - The number to check.
 * @returns {boolean} TRUE if odd, FALSE otherwise.
 */
function ISODD(number) {
  const num = this.coerce.toNumber(number);
  return Math.floor(Math.abs(num)) % 2 === 1;
}

/**
 * TYPE: Returns the type of a value as a number.
 *
 * @param {*} value - The value to check.
 * @returns {number} 1 = number, 2 = text, 4 = logical, 16 = error, 64 = array.
 */
function TYPE(value) {
  if (Array.isArray(value)) {
    return 64; // Array
  }
  if (value instanceof FormulaError) {
    return 16; // Error
  }
  if (typeof value === 'string') {
    // Check for error strings
    const errorPatterns = ['#DIV/0!', '#N/A', '#NAME?', '#NULL!', '#NUM!', '#REF!', '#VALUE!'];
    if (errorPatterns.includes(value.toUpperCase())) {
      return 16; // Error
    }
    return 2; // Text
  }
  if (typeof value === 'boolean') {
    return 4; // Logical
  }
  if (typeof value === 'number') {
    return 1; // Number
  }
  return 1; // Default to number for null/undefined
}

// Export all functions as an object
export const infoFunctions = {
  ISBLANK,
  ISERROR,
  ISNUMBER,
  ISTEXT,
  // Medium priority
  ISNA,
  ISLOGICAL,
  NA,
  ISEVEN,
  ISODD,
  TYPE,
};
