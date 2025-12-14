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

import { ValueError, NumError, DivZeroError, NotAvailableError } from '../utils/FormulaErrors.js';

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

/**
 * ABS: Returns the absolute value of a number.
 *
 * @param {*} value - The number to get the absolute value of.
 * @returns {number} The absolute value.
 */
function ABS(value) {
  const num = this.coerce.toNumber(value);
  return Math.abs(num);
}

/**
 * CEILING: Rounds a number up to the nearest multiple of significance.
 *
 * @param {*} number - The value to round.
 * @param {*} [significance=1] - The multiple to round up to.
 * @returns {number} The rounded number.
 */
function CEILING(number, significance = 1) {
  const num = this.coerce.toNumber(number);
  const sig = this.coerce.toNumber(significance);

  if (sig === 0) {
    return 0;
  }

  // Handle negative numbers with negative significance
  if (num < 0 && sig > 0) {
    return -Math.floor(Math.abs(num) / sig) * sig;
  }

  return Math.ceil(num / sig) * sig;
}

/**
 * FLOOR: Rounds a number down to the nearest multiple of significance.
 *
 * @param {*} number - The value to round.
 * @param {*} [significance=1] - The multiple to round down to.
 * @returns {number} The rounded number.
 */
function FLOOR(number, significance = 1) {
  const num = this.coerce.toNumber(number);
  const sig = this.coerce.toNumber(significance);

  if (sig === 0) {
    return 0;
  }

  // Handle negative numbers with negative significance
  if (num < 0 && sig > 0) {
    return -Math.ceil(Math.abs(num) / sig) * sig;
  }

  return Math.floor(num / sig) * sig;
}

/**
 * INT: Rounds a number down to the nearest integer.
 *
 * @param {*} value - The number to round down.
 * @returns {number} The integer part.
 */
function INT(value) {
  const num = this.coerce.toNumber(value);
  return Math.floor(num);
}

/**
 * MOD: Returns the remainder after division.
 *
 * @param {*} number - The dividend.
 * @param {*} divisor - The divisor.
 * @returns {number} The remainder.
 * @throws {DivZeroError} If divisor is zero.
 */
function MOD(number, divisor) {
  const num = this.coerce.toNumber(number);
  const div = this.coerce.toNumber(divisor);

  if (div === 0) {
    throw new DivZeroError('Cannot divide by zero in MOD');
  }

  // JavaScript's % operator doesn't match Excel's behavior for negative numbers
  // Excel's MOD always returns a value with the same sign as the divisor
  const result = num % div;
  if (result !== 0 && (result < 0) !== (div < 0)) {
    return result + div;
  }
  return result;
}

/**
 * POWER: Returns the result of a number raised to a power.
 *
 * @param {*} number - The base number.
 * @param {*} power - The exponent.
 * @returns {number} The result.
 * @throws {NumError} If the result is not a real number.
 */
function POWER(number, power) {
  const base = this.coerce.toNumber(number);
  const exp = this.coerce.toNumber(power);

  const result = Math.pow(base, exp);

  if (isNaN(result) || !isFinite(result)) {
    throw new NumError('Result is not a real number');
  }

  return result;
}

/**
 * SQRT: Returns the square root of a number.
 *
 * @param {*} value - The number to get the square root of.
 * @returns {number} The square root.
 * @throws {NumError} If the number is negative.
 */
function SQRT(value) {
  const num = this.coerce.toNumber(value);

  if (num < 0) {
    throw new NumError('Cannot calculate square root of negative number');
  }

  return Math.sqrt(num);
}

/**
 * PRODUCT: Multiplies all the numbers given as arguments.
 *
 * @param {...any} args - A variable number of arguments.
 * @returns {number} The product of all numeric values.
 */
function PRODUCT(...args) {
  const values = args.flat(Infinity);

  // Filter only numeric values
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

  return numbers.reduce((acc, val) => acc * this.coerce.toNumber(val), 1);
}

/**
 * COUNTIF: Counts the number of cells that meet a specified criterion.
 *
 * @param {Array} range - The range of cells to count.
 * @param {*} criteria - The condition to test (e.g., ">10", "Apple", 5).
 * @returns {number} The count of cells meeting the criteria.
 */
function COUNTIF(range, criteria) {
  // Flatten the range
  const values = Array.isArray(range) ? range.flat(Infinity) : [range];

  // Parse the criteria
  const criteriaTest = this._parseCriteria(criteria);

  // Count values where criteria is met
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    if (criteriaTest(values[i])) {
      count++;
    }
  }

  return count;
}

/**
 * MEDIAN: Returns the median of the given numbers.
 *
 * @param {...any} args - A variable number of arguments.
 * @returns {number} The median value.
 */
function MEDIAN(...args) {
  const values = args.flat(Infinity);

  // Filter only numeric values
  const numbers = values.filter(v => {
    if (typeof v === 'number') return true;
    if (typeof v === 'string' && v !== '') {
      const num = parseFloat(v);
      return !isNaN(num) && /^-?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i.test(v.trim());
    }
    return false;
  }).map(v => this.coerce.toNumber(v));

  if (numbers.length === 0) {
    throw new NumError('MEDIAN requires at least one numeric value');
  }

  // Sort numbers
  numbers.sort((a, b) => a - b);

  const mid = Math.floor(numbers.length / 2);

  if (numbers.length % 2 === 0) {
    // Even number of values - average of two middle values
    return (numbers[mid - 1] + numbers[mid]) / 2;
  } else {
    // Odd number of values - middle value
    return numbers[mid];
  }
}

// ============================================
// MEDIUM PRIORITY MATH FUNCTIONS
// ============================================

/**
 * ROUNDUP: Rounds a number up, away from zero.
 *
 * @param {*} number - The number to round.
 * @param {*} [num_digits=0] - The number of decimal places.
 * @returns {number} The rounded number.
 */
function ROUNDUP(number, num_digits = 0) {
  const num = this.coerce.toNumber(number);
  const digits = this.coerce.toNumber(num_digits);
  const multiplier = Math.pow(10, Math.floor(digits));

  if (num >= 0) {
    return Math.ceil(num * multiplier) / multiplier;
  } else {
    return Math.floor(num * multiplier) / multiplier;
  }
}

/**
 * ROUNDDOWN: Rounds a number down, toward zero.
 *
 * @param {*} number - The number to round.
 * @param {*} [num_digits=0] - The number of decimal places.
 * @returns {number} The rounded number.
 */
function ROUNDDOWN(number, num_digits = 0) {
  const num = this.coerce.toNumber(number);
  const digits = this.coerce.toNumber(num_digits);
  const multiplier = Math.pow(10, Math.floor(digits));

  if (num >= 0) {
    return Math.floor(num * multiplier) / multiplier;
  } else {
    return Math.ceil(num * multiplier) / multiplier;
  }
}

/**
 * TRUNC: Truncates a number to an integer by removing the decimal part.
 *
 * @param {*} number - The number to truncate.
 * @param {*} [num_digits=0] - The number of decimal places to keep.
 * @returns {number} The truncated number.
 */
function TRUNC(number, num_digits = 0) {
  const num = this.coerce.toNumber(number);
  const digits = this.coerce.toNumber(num_digits);
  const multiplier = Math.pow(10, Math.floor(digits));

  return Math.trunc(num * multiplier) / multiplier;
}

/**
 * SIGN: Returns the sign of a number (-1, 0, or 1).
 *
 * @param {*} number - The number to check.
 * @returns {number} -1 if negative, 0 if zero, 1 if positive.
 */
function SIGN(number) {
  const num = this.coerce.toNumber(number);
  return Math.sign(num);
}

/**
 * RAND: Returns a random number between 0 (inclusive) and 1 (exclusive).
 *
 * @returns {number} A random number.
 */
function RAND() {
  return Math.random();
}

/**
 * RANDBETWEEN: Returns a random integer between two values (inclusive).
 *
 * @param {*} bottom - The minimum value.
 * @param {*} top - The maximum value.
 * @returns {number} A random integer.
 * @throws {NumError} If bottom > top.
 */
function RANDBETWEEN(bottom, top) {
  const min = Math.ceil(this.coerce.toNumber(bottom));
  const max = Math.floor(this.coerce.toNumber(top));

  if (min > max) {
    throw new NumError('RANDBETWEEN: bottom must be less than or equal to top');
  }

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * COUNTBLANK: Counts empty cells in a range.
 *
 * @param {...any} args - The range(s) to check.
 * @returns {number} The count of blank cells.
 */
function COUNTBLANK(...args) {
  const values = args.flat(Infinity);
  return values.filter(v => v === null || v === undefined || v === '').length;
}

/**
 * AVERAGEIF: Calculates the average of cells that meet a criterion.
 *
 * @param {Array} range - The range to evaluate.
 * @param {*} criteria - The condition to test.
 * @param {Array} [average_range] - Optional. The range to average.
 * @returns {number} The average of matching values.
 * @throws {DivZeroError} If no cells match the criteria.
 */
function AVERAGEIF(range, criteria, average_range) {
  let criteriaRange = range;
  let avgRange = average_range;

  if (avgRange === undefined) {
    avgRange = criteriaRange;
  }

  const criteriaValues = Array.isArray(criteriaRange) ? criteriaRange.flat(Infinity) : [criteriaRange];
  const avgValues = Array.isArray(avgRange) ? avgRange.flat(Infinity) : [avgRange];

  if (criteriaValues.length !== avgValues.length) {
    throw new ValueError('AVERAGEIF ranges must be the same size');
  }

  const criteriaTest = this._parseCriteria(criteria);

  let sum = 0;
  let count = 0;
  for (let i = 0; i < criteriaValues.length; i++) {
    if (criteriaTest(criteriaValues[i])) {
      sum += this.coerce.toNumber(avgValues[i]);
      count++;
    }
  }

  if (count === 0) {
    throw new DivZeroError('No cells match the criteria in AVERAGEIF');
  }

  return sum / count;
}

/**
 * MODE: Returns the most frequently occurring value.
 *
 * @param {...any} args - The values to check.
 * @returns {number} The most common value.
 * @throws {NotAvailableError} If no duplicate values exist.
 */
function MODE(...args) {
  const values = args.flat(Infinity);

  const numbers = values.filter(v => {
    if (typeof v === 'number') return true;
    if (typeof v === 'string' && v !== '') {
      const num = parseFloat(v);
      return !isNaN(num) && /^-?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i.test(v.trim());
    }
    return false;
  }).map(v => this.coerce.toNumber(v));

  if (numbers.length === 0) {
    throw new NotAvailableError('MODE requires numeric values');
  }

  // Count occurrences
  const counts = new Map();
  for (const num of numbers) {
    counts.set(num, (counts.get(num) || 0) + 1);
  }

  // Find the mode
  let maxCount = 0;
  let mode = null;
  for (const [value, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      mode = value;
    }
  }

  if (maxCount <= 1) {
    throw new NotAvailableError('No repeated values in MODE');
  }

  return mode;
}

/**
 * STDEV: Calculates standard deviation based on a sample.
 *
 * @param {...any} args - The sample values.
 * @returns {number} The standard deviation.
 * @throws {DivZeroError} If fewer than 2 values.
 */
function STDEV(...args) {
  const values = args.flat(Infinity);

  const numbers = values.filter(v => {
    if (typeof v === 'number') return true;
    if (typeof v === 'string' && v !== '') {
      const num = parseFloat(v);
      return !isNaN(num) && /^-?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i.test(v.trim());
    }
    return false;
  }).map(v => this.coerce.toNumber(v));

  if (numbers.length < 2) {
    throw new DivZeroError('STDEV requires at least 2 values');
  }

  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  const squaredDiffs = numbers.map(x => Math.pow(x - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (numbers.length - 1);

  return Math.sqrt(variance);
}

/**
 * VAR: Calculates variance based on a sample.
 *
 * @param {...any} args - The sample values.
 * @returns {number} The variance.
 * @throws {DivZeroError} If fewer than 2 values.
 */
function VAR(...args) {
  const values = args.flat(Infinity);

  const numbers = values.filter(v => {
    if (typeof v === 'number') return true;
    if (typeof v === 'string' && v !== '') {
      const num = parseFloat(v);
      return !isNaN(num) && /^-?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i.test(v.trim());
    }
    return false;
  }).map(v => this.coerce.toNumber(v));

  if (numbers.length < 2) {
    throw new DivZeroError('VAR requires at least 2 values');
  }

  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  const squaredDiffs = numbers.map(x => Math.pow(x - mean, 2));

  return squaredDiffs.reduce((a, b) => a + b, 0) / (numbers.length - 1);
}

// ============================================
// LOW PRIORITY MATH FUNCTIONS
// ============================================

/**
 * PI: Returns the value of π (pi).
 *
 * @returns {number} The value of π.
 */
function PI() {
  return Math.PI;
}

/**
 * EXP: Returns e raised to a power.
 *
 * @param {*} number - The exponent.
 * @returns {number} e^number.
 */
function EXP(number) {
  const num = this.coerce.toNumber(number);
  return Math.exp(num);
}

/**
 * LN: Returns the natural logarithm of a number.
 *
 * @param {*} number - The positive number.
 * @returns {number} The natural logarithm.
 * @throws {NumError} If number <= 0.
 */
function LN(number) {
  const num = this.coerce.toNumber(number);

  if (num <= 0) {
    throw new NumError('LN requires a positive number');
  }

  return Math.log(num);
}

/**
 * LOG: Returns the logarithm of a number to a specified base.
 *
 * @param {*} number - The positive number.
 * @param {*} [base=10] - The base of the logarithm.
 * @returns {number} The logarithm.
 * @throws {NumError} If number <= 0 or base <= 0.
 */
function LOG(number, base = 10) {
  const num = this.coerce.toNumber(number);
  const b = this.coerce.toNumber(base);

  if (num <= 0) {
    throw new NumError('LOG requires a positive number');
  }
  if (b <= 0 || b === 1) {
    throw new NumError('LOG requires a positive base other than 1');
  }

  return Math.log(num) / Math.log(b);
}

/**
 * LOG10: Returns the base-10 logarithm of a number.
 *
 * @param {*} number - The positive number.
 * @returns {number} The base-10 logarithm.
 * @throws {NumError} If number <= 0.
 */
function LOG10(number) {
  const num = this.coerce.toNumber(number);

  if (num <= 0) {
    throw new NumError('LOG10 requires a positive number');
  }

  return Math.log10(num);
}

/**
 * SIN: Returns the sine of an angle (in radians).
 *
 * @param {*} number - The angle in radians.
 * @returns {number} The sine.
 */
function SIN(number) {
  const num = this.coerce.toNumber(number);
  return Math.sin(num);
}

/**
 * COS: Returns the cosine of an angle (in radians).
 *
 * @param {*} number - The angle in radians.
 * @returns {number} The cosine.
 */
function COS(number) {
  const num = this.coerce.toNumber(number);
  return Math.cos(num);
}

/**
 * TAN: Returns the tangent of an angle (in radians).
 *
 * @param {*} number - The angle in radians.
 * @returns {number} The tangent.
 */
function TAN(number) {
  const num = this.coerce.toNumber(number);
  return Math.tan(num);
}

/**
 * DEGREES: Converts radians to degrees.
 *
 * @param {*} angle - The angle in radians.
 * @returns {number} The angle in degrees.
 */
function DEGREES(angle) {
  const rad = this.coerce.toNumber(angle);
  return rad * (180 / Math.PI);
}

/**
 * RADIANS: Converts degrees to radians.
 *
 * @param {*} angle - The angle in degrees.
 * @returns {number} The angle in radians.
 */
function RADIANS(angle) {
  const deg = this.coerce.toNumber(angle);
  return deg * (Math.PI / 180);
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
  ABS,
  CEILING,
  FLOOR,
  INT,
  MOD,
  POWER,
  SQRT,
  PRODUCT,
  COUNTIF,
  MEDIAN,
  // Medium priority
  ROUNDUP,
  ROUNDDOWN,
  TRUNC,
  SIGN,
  RAND,
  RANDBETWEEN,
  COUNTBLANK,
  AVERAGEIF,
  MODE,
  STDEV,
  VAR,
  // Low priority
  PI,
  EXP,
  LN,
  LOG,
  LOG10,
  SIN,
  COS,
  TAN,
  DEGREES,
  RADIANS,
  _parseCriteria, // Export for testing
};
