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

/**
 * HLOOKUP: Searches for a value in the first row of a range and returns
 * a value in the same column from a specified row.
 *
 * V1 Implementation: Only supports exact match (range_lookup = FALSE).
 *
 * @param {*} search_key - The value to search for in the first row.
 * @param {Array} range - The range (2D array) to search in.
 * @param {*} index - The row index (1-based) to return the value from.
 * @param {*} [range_lookup=false] - If FALSE (default), exact match only.
 * @returns {*} The value from the specified row in the matching column.
 * @throws {NotAvailableError} If the value is not found.
 * @throws {RefError} If the index is out of range.
 * @throws {ValueError} If range_lookup is TRUE (not supported in V1).
 */
function HLOOKUP(search_key, range, index, range_lookup = false) {
  // Validate range_lookup parameter (V1 only supports exact match)
  const exactMatch = !this.coerce.toBoolean(range_lookup);
  if (!exactMatch) {
    throw new ValueError('HLOOKUP approximate match (TRUE) is not supported in V1');
  }

  // Validate that range is a 2D array
  if (!Array.isArray(range) || range.length === 0) {
    throw new RefError('Invalid range for HLOOKUP');
  }

  // Ensure all rows are arrays (2D structure)
  if (!Array.isArray(range[0])) {
    // If range is 1D, treat it as a single row
    range = [range];
  }

  // Validate index
  const rowIndex = this.coerce.toNumber(index);
  if (rowIndex < 1 || rowIndex > range.length) {
    throw new RefError('Row index is out of range');
  }

  // Convert search_key for comparison
  const searchValue = search_key;

  // Linear search through the first row
  const firstRow = range[0];
  for (let col = 0; col < firstRow.length; col++) {
    const firstRowValue = firstRow[col];

    // Exact match comparison
    if (this._areValuesEqual(searchValue, firstRowValue)) {
      // Return value from the specified row (convert from 1-based to 0-based)
      return range[Math.floor(rowIndex) - 1][col];
    }
  }

  // Value not found
  throw new NotAvailableError(`Value "${search_key}" not found in lookup range`);
}

/**
 * INDEX: Returns a value from a table or range based on row and column numbers.
 *
 * @param {Array} array - The range of cells or array.
 * @param {*} row_num - The row position (1-based). Use 0 to return entire column.
 * @param {*} [col_num=1] - The column position (1-based). Use 0 to return entire row.
 * @returns {*} The value at the specified position, or a row/column array.
 * @throws {RefError} If the position is out of range.
 */
function INDEX(array, row_num, col_num) {
  // Validate array
  if (!Array.isArray(array)) {
    // Single value
    if (row_num === 1 || row_num === undefined) {
      return array;
    }
    throw new RefError('Invalid reference for INDEX');
  }

  // Ensure 2D array
  let data = array;
  if (!Array.isArray(data[0])) {
    // 1D array - treat as single column
    data = data.map(val => [val]);
  }

  const rowCount = data.length;
  const colCount = data[0].length;

  const row = row_num === undefined ? 1 : this.coerce.toNumber(row_num);
  const col = col_num === undefined ? 1 : this.coerce.toNumber(col_num);

  // Handle row = 0 (return entire column)
  if (row === 0) {
    if (col < 1 || col > colCount) {
      throw new RefError('Column index out of range');
    }
    return data.map(r => r[col - 1]);
  }

  // Handle col = 0 (return entire row)
  if (col === 0) {
    if (row < 1 || row > rowCount) {
      throw new RefError('Row index out of range');
    }
    return data[row - 1];
  }

  // Validate row and column
  if (row < 1 || row > rowCount) {
    throw new RefError('Row index out of range');
  }
  if (col < 1 || col > colCount) {
    throw new RefError('Column index out of range');
  }

  return data[Math.floor(row) - 1][Math.floor(col) - 1];
}

/**
 * MATCH: Returns the relative position of an item in an array that matches a specified value.
 *
 * @param {*} lookup_value - The value to search for.
 * @param {Array} lookup_array - The range to search (must be 1D or single row/column).
 * @param {*} [match_type=1] - The type of match:
 *   1 = finds largest value <= lookup_value (array must be sorted ascending)
 *   0 = exact match
 *   -1 = finds smallest value >= lookup_value (array must be sorted descending)
 * @returns {number} The position (1-based) of the found item.
 * @throws {NotAvailableError} If no match is found.
 */
function MATCH(lookup_value, lookup_array, match_type = 1) {
  // Flatten the array to 1D
  let values = lookup_array;
  if (Array.isArray(values)) {
    values = values.flat(Infinity);
  } else {
    values = [values];
  }

  const matchMode = this.coerce.toNumber(match_type);

  if (matchMode === 0) {
    // Exact match
    for (let i = 0; i < values.length; i++) {
      if (this._areValuesEqual(lookup_value, values[i])) {
        return i + 1; // 1-based index
      }
    }
    throw new NotAvailableError('No exact match found');
  }

  if (matchMode === 1) {
    // Find largest value <= lookup_value (sorted ascending)
    const lookupNum = this.coerce.toNumber(lookup_value);
    let lastValidIndex = -1;

    for (let i = 0; i < values.length; i++) {
      const val = this.coerce.toNumber(values[i]);
      if (val <= lookupNum) {
        lastValidIndex = i;
      } else {
        // Since array is sorted ascending, we can stop here
        break;
      }
    }

    if (lastValidIndex === -1) {
      throw new NotAvailableError('No match found');
    }
    return lastValidIndex + 1;
  }

  if (matchMode === -1) {
    // Find smallest value >= lookup_value (sorted descending)
    const lookupNum = this.coerce.toNumber(lookup_value);
    let lastValidIndex = -1;

    for (let i = 0; i < values.length; i++) {
      const val = this.coerce.toNumber(values[i]);
      if (val >= lookupNum) {
        lastValidIndex = i;
      } else {
        // Since array is sorted descending, we can stop here
        break;
      }
    }

    if (lastValidIndex === -1) {
      throw new NotAvailableError('No match found');
    }
    return lastValidIndex + 1;
  }

  throw new ValueError('match_type must be -1, 0, or 1');
}

// Export all functions as an object
export const lookupFunctions = {
  VLOOKUP,
  HLOOKUP,
  INDEX,
  MATCH,
  _areValuesEqual, // Export for testing
};
