/**
 * Lookup Functions
 *
 * This file contains the implementation for lookup and reference
 * formula functions (e.g., VLOOKUP, HLOOKUP, INDEX, MATCH).
 *
 * Each function is designed to be called by the Evaluator,
 * and `this` will be bound to the Evaluator's instance,
 * giving us access to `this.coerce` and other utilities.
 */

import { NotAvailableError, RefError, ValueError } from '../utils/FormulaErrors.js';

/**
 * VLOOKUP: Searches for a value in the first column of a range and returns
 * a value in the same row from a specified column.
 *
 * V1 Implementation: Only supports exact match (range_lookup = FALSE).
 *
 * @param {*} search_key - The value to search for in the first column.
 * @param {Array} range - The range (2D array) to search in.
 * @param {*} index - The column index (1-based) to return the value from.
 * @param {*} [range_lookup=false] - If FALSE (default), exact match only.
 * @returns {*} The value from the specified column in the matching row.
 * @throws {NotAvailableError} If the value is not found.
 * @throws {RefError} If the index is out of range.
 * @throws {ValueError} If range_lookup is TRUE (not supported in V1).
 */
function VLOOKUP(search_key, range, index, range_lookup = false) {
  // Validate range_lookup parameter (V1 only supports exact match)
  const exactMatch = !this.coerce.toBoolean(range_lookup);
  if (!exactMatch) {
    throw new ValueError('VLOOKUP approximate match (TRUE) is not supported in V1');
  }

  // Validate that range is a 2D array
  if (!Array.isArray(range) || range.length === 0) {
    throw new RefError('Invalid range for VLOOKUP');
  }

  // Ensure all rows are arrays (2D structure)
  if (!Array.isArray(range[0])) {
    // If range is 1D, convert it to a single-column 2D array
    range = range.map(val => [val]);
  }

  // Validate index
  const colIndex = this.coerce.toNumber(index);
  if (colIndex < 1 || colIndex > range[0].length) {
    throw new RefError('Column index is out of range');
  }

  // Convert search_key for comparison
  const searchValue = search_key;

  // Linear search through the first column
  for (let row = 0; row < range.length; row++) {
    const firstColValue = range[row][0];

    // Exact match comparison
    // Handle type-sensitive comparison
    if (this._areValuesEqual(searchValue, firstColValue)) {
      // Return value from the specified column (convert from 1-based to 0-based)
      return range[row][Math.floor(colIndex) - 1];
    }
  }

  // Value not found
  throw new NotAvailableError(`Value "${search_key}" not found in lookup range`);
}

/**
 * Helper method to compare two values for exact equality.
 * This is used by VLOOKUP for exact match.
 *
 * @private
 * @param {*} a - First value
 * @param {*} b - Second value
 * @returns {boolean} True if values are equal
 */
function _areValuesEqual(a, b) {
  // Handle null/undefined
  if (a === null || a === undefined) a = '';
  if (b === null || b === undefined) b = '';

  // If types match, use direct comparison
  if (typeof a === typeof b) {
    // Case-insensitive string comparison (Excel behavior)
    if (typeof a === 'string') {
      return a.toLowerCase() === b.toLowerCase();
    }
    return a === b;
  }

  // Try numeric comparison if both can be coerced to numbers
  const aNum = this.coerce.toNumber(a);
  const bNum = this.coerce.toNumber(b);

  // Check if both were successfully converted to numbers
  if (!isNaN(aNum) && !isNaN(bNum)) {
    return aNum === bNum;
  }

  // Fall back to string comparison
  return this.coerce.toString(a).toLowerCase() === this.coerce.toString(b).toLowerCase();
}

// Export all functions as an object
export const lookupFunctions = {
  VLOOKUP,
  _areValuesEqual, // Export for testing
};
