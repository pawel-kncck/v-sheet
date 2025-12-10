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

import { ValueError, NumError } from '../utils/FormulaErrors.js';

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

/**
 * AVERAGE: Calculates the average of all numbers in a range.
 *
 * @param {...any} args - A variable number of arguments.
 * @returns {number} The average of all numeric values.
 */
function AVERAGE(...args) {
  const values = args.flat(Infinity);
  // Only include actual numbers, not text that coerces to 0
  const numbers = values.filter(v => {
    if (typeof v === 'number') return true;
    if (typeof v === 'string' && v !== '') {
      const num = parseFloat(v);
      return !isNaN(num) && /^-?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i.test(v.trim());
    }
    return false;
  });

  if (numbers.length === 0) {
    return 0;
  }

  const sum = numbers.reduce((acc, val) => acc + this.coerce.toNumber(val), 0);
  return sum / numbers.length;
}

/**
 * MIN: Returns the minimum value from a range.
 *
 * @param {...any} args - A variable number of arguments.
 * @returns {number} The minimum numeric value.
 */
function MIN(...args) {
  const values = args.flat(Infinity);
  // Only include actual numbers, not text that coerces to 0
  const numbers = values.filter(v => {
    if (typeof v === 'number') return true;
    if (typeof v === 'string' && v !== '') {
      const num = parseFloat(v);
      return !isNaN(num) && /^-?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i.test(v.trim());
    }
    return false;
  }).map(v => this.coerce.toNumber(v));

  if (numbers.length === 0) {
    return 0;
  }

  return Math.min(...numbers);
}

/**
 * MAX: Returns the maximum value from a range.
 *
 * @param {...any} args - A variable number of arguments.
 * @returns {number} The maximum numeric value.
 */
function MAX(...args) {
  const values = args.flat(Infinity);
  // Only include actual numbers, not text that coerces to 0
  const numbers = values.filter(v => {
    if (typeof v === 'number') return true;
    if (typeof v === 'string' && v !== '') {
      const num = parseFloat(v);
      return !isNaN(num) && /^-?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i.test(v.trim());
    }
    return false;
  }).map(v => this.coerce.toNumber(v));

  if (numbers.length === 0) {
    return 0;
  }

  return Math.max(...numbers);
}

/**
 * COUNT: Counts the number of cells that contain numbers.
 *
 * @param {...any} args - A variable number of arguments.
 * @returns {number} The count of numeric values.
 */
function COUNT(...args) {
  const values = args.flat(Infinity);
  return values.filter(v => {
    const num = this.coerce.toNumber(v);
    // Only count if it's actually a number type or a valid numeric string
    return typeof v === 'number' || (typeof v === 'string' && v !== '' && !isNaN(num) && num !== 0);
  }).length;
}

/**
 * COUNTA: Counts the number of non-empty cells.
 *
 * @param {...any} args - A variable number of arguments.
 * @returns {number} The count of non-empty values.
 */
function COUNTA(...args) {
  const values = args.flat(Infinity);
  return values.filter(v => {
    // Count anything that's not null, undefined, or empty string
    return v !== null && v !== undefined && v !== '';
  }).length;
}

/**
 * ROUND: Rounds a number to a specified number of decimal places.
 *
 * @param {*} value - The number to round.
 * @param {*} [num_digits=0] - The number of decimal places (default is 0).
 * @returns {number} The rounded number.
 */
function ROUND(value, num_digits = 0) {
  // Check if value is a non-numeric string before coercing
  if (typeof value === 'string' && value !== '' && isNaN(parseFloat(value))) {
    throw new ValueError('Invalid number for ROUND');
  }

  const num = this.coerce.toNumber(value);
  const digits = this.coerce.toNumber(num_digits);

  const multiplier = Math.pow(10, Math.floor(digits));
  return Math.round(num * multiplier) / multiplier;
}

/**
 * SUMIF: Sums the values in a range that meet a specified criterion.
 *
 * Supports two forms:
 * - SUMIF(range, criteria) - sums cells in range that meet criteria
 * - SUMIF(criteria_range, criteria, sum_range) - checks criteria_range, sums sum_range
 *
 * @param {Array} range_or_criteria_range - The range to evaluate against criteria.
 * @param {*} criteria - The condition to test (e.g., ">10", "Apple", 5).
 * @param {Array} [sum_range] - Optional. The range to sum (if different from criteria range).
 * @returns {number} The sum of values that meet the criteria.
 */
function SUMIF(range_or_criteria_range, criteria, sum_range) {
  let criteriaRange = range_or_criteria_range;
  let sumRange = sum_range;

  // If sum_range is not provided, use criteria_range for both
  if (sumRange === undefined) {
    sumRange = criteriaRange;
  }

  // Flatten both ranges
  const criteriaValues = Array.isArray(criteriaRange) ? criteriaRange.flat(Infinity) : [criteriaRange];
  const sumValues = Array.isArray(sumRange) ? sumRange.flat(Infinity) : [sumRange];

  // Validate that ranges have the same length
  if (criteriaValues.length !== sumValues.length) {
    throw new ValueError('SUMIF ranges must be the same size');
  }

  // Parse the criteria
  const criteriaTest = this._parseCriteria(criteria);

  // Sum values where criteria is met
  let sum = 0;
  for (let i = 0; i < criteriaValues.length; i++) {
    if (criteriaTest(criteriaValues[i])) {
      sum += this.coerce.toNumber(sumValues[i]);
    }
  }

  return sum;
}

/**
 * Helper function to parse SUMIF/COUNTIF criteria strings.
 * Supports formats like: ">10", "<=5", "Apple", 10, etc.
 *
 * @private
 * @param {*} criteria - The criteria to parse.
 * @returns {Function} A test function that returns true/false for a value.
 */
function _parseCriteria(criteria) {
  // If criteria is a number or boolean, test for exact equality
  if (typeof criteria === 'number' || typeof criteria === 'boolean') {
    return (value) => this.coerce.toNumber(value) === this.coerce.toNumber(criteria);
  }

  // Convert criteria to string for parsing
  const criteriaStr = this.coerce.toString(criteria);

  // Check for comparison operators (order matters - check multi-char operators first)
  const comparisonRegex = /^(>=|<=|<>|>|<|=)(.*)$/;
  const match = criteriaStr.match(comparisonRegex);

  if (match) {
    const operator = match[1];
    const operand = match[2].trim();
    const operandNum = parseFloat(operand);

    return (value) => {
      const valueNum = this.coerce.toNumber(value);
      const valueStr = this.coerce.toString(value);

      // Try numeric comparison first if operand is a number
      if (!isNaN(operandNum) && operand !== '') {
        switch (operator) {
          case '>': return valueNum > operandNum;
          case '<': return valueNum < operandNum;
          case '>=': return valueNum >= operandNum;
          case '<=': return valueNum <= operandNum;
          case '<>': return valueNum !== operandNum;
          case '=': return valueNum === operandNum;
        }
      }

      // Fall back to string comparison
      switch (operator) {
        case '>': return valueStr > operand;
        case '<': return valueStr < operand;
        case '>=': return valueStr >= operand;
        case '<=': return valueStr <= operand;
        case '<>': return valueStr !== operand;
        case '=': return valueStr.toLowerCase() === operand.toLowerCase();
      }
    };
  }

  // No operator - test for exact match (case-insensitive for strings)
  return (value) => {
    const valueStr = this.coerce.toString(value).toLowerCase();
    const criteriaLower = criteriaStr.toLowerCase();
    return valueStr === criteriaLower;
  };
}

/**
 * SUMPRODUCT: Multiplies corresponding components in arrays and returns the sum.
 *
 * @param {...Array} arrays - Two or more arrays of equal size.
 * @returns {number} The sum of products.
 * @throws {ValueError} If arrays are not the same size.
 */
function SUMPRODUCT(...arrays) {
  if (arrays.length === 0) {
    return 0;
  }

  // Flatten each array to 1D
  const flatArrays = arrays.map(arr => {
    if (!Array.isArray(arr)) {
      return [arr];
    }
    return arr.flat(Infinity);
  });

  // Verify all arrays have the same length
  const length = flatArrays[0].length;
  for (let i = 1; i < flatArrays.length; i++) {
    if (flatArrays[i].length !== length) {
      throw new ValueError('SUMPRODUCT arrays must be the same size');
    }
  }

  // Calculate sum of products
  let sum = 0;
  for (let i = 0; i < length; i++) {
    let product = 1;
    for (let j = 0; j < flatArrays.length; j++) {
      product *= this.coerce.toNumber(flatArrays[j][i]);
    }
    sum += product;
  }

  return sum;
}

// Export all functions as an object
export const mathFunctions = {
  SUM,
  AVERAGE,
  MIN,
  MAX,
  COUNT,
  COUNTA,
  ROUND,
  SUMIF,
  SUMPRODUCT,
  _parseCriteria, // Export for testing
};
