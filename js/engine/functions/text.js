/**
 * Text Functions
 *
 * This file contains the implementation for all text-related
 * formula functions (e.g., LEFT, RIGHT, MID, LEN, UPPER, LOWER, TRIM, CONCATENATE).
 *
 * Each function is designed to be called by the Evaluator,
 * and `this` will be bound to the Evaluator's instance,
 * giving us access to `this.coerce` and other utilities.
 */

import { ValueError, NumError } from '../utils/FormulaErrors.js';

/**
 * LEN: Returns the length of a string.
 *
 * @param {*} text - The text to measure.
 * @returns {number} The number of characters in the text.
 */
function LEN(text) {
  const str = this.coerce.toString(text);
  return str.length;
}

/**
 * UPPER: Converts text to uppercase.
 *
 * @param {*} text - The text to convert.
 * @returns {string} The text in uppercase.
 */
function UPPER(text) {
  const str = this.coerce.toString(text);
  return str.toUpperCase();
}

/**
 * LOWER: Converts text to lowercase.
 *
 * @param {*} text - The text to convert.
 * @returns {string} The text in lowercase.
 */
function LOWER(text) {
  const str = this.coerce.toString(text);
  return str.toLowerCase();
}

/**
 * TRIM: Removes leading and trailing spaces from text,
 * and reduces multiple spaces between words to a single space.
 *
 * @param {*} text - The text to trim.
 * @returns {string} The trimmed text.
 */
function TRIM(text) {
  const str = this.coerce.toString(text);
  // Remove leading/trailing spaces and collapse multiple spaces to one
  return str.trim().replace(/\s+/g, ' ');
}

/**
 * CONCATENATE: Joins several text strings into one.
 *
 * @param {...any} args - Variable number of text arguments to join.
 * @returns {string} The concatenated text.
 */
function CONCATENATE(...args) {
  // Flatten in case any args are arrays (from ranges)
  const values = args.flat(Infinity);
  return values.map(v => this.coerce.toString(v)).join('');
}

/**
 * LEFT: Returns the leftmost characters from a text string.
 *
 * @param {*} text - The text containing the characters you want to extract.
 * @param {*} [num_chars=1] - The number of characters to extract (default is 1).
 * @returns {string} The leftmost characters.
 */
function LEFT(text, num_chars = 1) {
  const str = this.coerce.toString(text);
  const num = this.coerce.toNumber(num_chars);

  if (num < 0) {
    throw new ValueError('num_chars must be non-negative');
  }

  return str.substring(0, Math.floor(num));
}

/**
 * RIGHT: Returns the rightmost characters from a text string.
 *
 * @param {*} text - The text containing the characters you want to extract.
 * @param {*} [num_chars=1] - The number of characters to extract (default is 1).
 * @returns {string} The rightmost characters.
 */
function RIGHT(text, num_chars = 1) {
  const str = this.coerce.toString(text);
  const num = this.coerce.toNumber(num_chars);

  if (num < 0) {
    throw new ValueError('num_chars must be non-negative');
  }

  return str.substring(str.length - Math.floor(num));
}

/**
 * MID: Returns characters from the middle of a text string.
 *
 * @param {*} text - The text containing the characters you want to extract.
 * @param {*} start_num - The position of the first character (1-based).
 * @param {*} num_chars - The number of characters to extract.
 * @returns {string} The extracted characters.
 */
function MID(text, start_num, num_chars) {
  const str = this.coerce.toString(text);
  const start = this.coerce.toNumber(start_num);
  const num = this.coerce.toNumber(num_chars);

  if (start < 1) {
    throw new ValueError('start_num must be at least 1');
  }

  if (num < 0) {
    throw new ValueError('num_chars must be non-negative');
  }

  // Convert from 1-based to 0-based indexing
  return str.substring(Math.floor(start) - 1, Math.floor(start) - 1 + Math.floor(num));
}

/**
 * FIND: Returns the starting position of one text string within another (case-sensitive).
 *
 * @param {*} find_text - The text to find.
 * @param {*} within_text - The text to search within.
 * @param {*} [start_num=1] - The position to start searching from (1-based).
 * @returns {number} The position of the first occurrence (1-based).
 * @throws {ValueError} If the text is not found or start_num is invalid.
 */
function FIND(find_text, within_text, start_num = 1) {
  const findStr = this.coerce.toString(find_text);
  const withinStr = this.coerce.toString(within_text);
  const start = this.coerce.toNumber(start_num);

  if (start < 1) {
    throw new ValueError('start_num must be at least 1');
  }

  if (start > withinStr.length) {
    throw new ValueError('start_num exceeds text length');
  }

  // Convert to 0-based index for JavaScript
  const position = withinStr.indexOf(findStr, start - 1);

  if (position === -1) {
    throw new ValueError('Text not found');
  }

  // Return 1-based position
  return position + 1;
}

/**
 * SEARCH: Returns the starting position of one text string within another (case-insensitive).
 * Also supports wildcards: ? matches any single character, * matches any sequence.
 *
 * @param {*} find_text - The text to find (can include wildcards).
 * @param {*} within_text - The text to search within.
 * @param {*} [start_num=1] - The position to start searching from (1-based).
 * @returns {number} The position of the first occurrence (1-based).
 * @throws {ValueError} If the text is not found or start_num is invalid.
 */
function SEARCH(find_text, within_text, start_num = 1) {
  const findStr = this.coerce.toString(find_text);
  const withinStr = this.coerce.toString(within_text);
  const start = this.coerce.toNumber(start_num);

  if (start < 1) {
    throw new ValueError('start_num must be at least 1');
  }

  if (start > withinStr.length) {
    throw new ValueError('start_num exceeds text length');
  }

  // Convert wildcards to regex pattern
  // ? matches any single character, * matches any sequence
  let pattern = findStr
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars (except ? and *)
    .replace(/\?/g, '.') // ? -> match any single char
    .replace(/\*/g, '.*'); // * -> match any sequence

  try {
    const regex = new RegExp(pattern, 'i'); // Case-insensitive
    const searchStr = withinStr.substring(start - 1);
    const match = searchStr.match(regex);

    if (!match) {
      throw new ValueError('Text not found');
    }

    // Return 1-based position
    return match.index + start;
  } catch (e) {
    if (e instanceof ValueError) throw e;
    throw new ValueError('Invalid search pattern');
  }
}

/**
 * SUBSTITUTE: Replaces occurrences of old_text with new_text in a string.
 *
 * @param {*} text - The text to modify.
 * @param {*} old_text - The text to replace.
 * @param {*} new_text - The replacement text.
 * @param {*} [instance_num] - Optional. Which occurrence to replace. If omitted, replaces all.
 * @returns {string} The modified text.
 */
function SUBSTITUTE(text, old_text, new_text, instance_num) {
  const str = this.coerce.toString(text);
  const oldStr = this.coerce.toString(old_text);
  const newStr = this.coerce.toString(new_text);

  if (oldStr === '') {
    return str;
  }

  if (instance_num === undefined) {
    // Replace all occurrences
    return str.split(oldStr).join(newStr);
  }

  const instanceNumber = this.coerce.toNumber(instance_num);

  if (instanceNumber < 1) {
    throw new ValueError('instance_num must be at least 1');
  }

  // Replace specific occurrence
  let count = 0;
  let result = '';
  let remaining = str;
  let pos;

  while ((pos = remaining.indexOf(oldStr)) !== -1) {
    count++;
    if (count === instanceNumber) {
      result += remaining.substring(0, pos) + newStr;
      remaining = remaining.substring(pos + oldStr.length);
      result += remaining;
      return result;
    }
    result += remaining.substring(0, pos) + oldStr;
    remaining = remaining.substring(pos + oldStr.length);
  }

  // If we didn't find the specific instance, return original
  return str;
}

/**
 * REPLACE: Replaces part of a text string with a different text string,
 * based on the position and number of characters.
 *
 * @param {*} old_text - The text to modify.
 * @param {*} start_num - The position to start replacing (1-based).
 * @param {*} num_chars - The number of characters to replace.
 * @param {*} new_text - The replacement text.
 * @returns {string} The modified text.
 */
function REPLACE(old_text, start_num, num_chars, new_text) {
  const str = this.coerce.toString(old_text);
  const start = this.coerce.toNumber(start_num);
  const numChars = this.coerce.toNumber(num_chars);
  const newStr = this.coerce.toString(new_text);

  if (start < 1) {
    throw new ValueError('start_num must be at least 1');
  }

  if (numChars < 0) {
    throw new ValueError('num_chars must be non-negative');
  }

  // Convert to 0-based index
  const startIndex = Math.floor(start) - 1;
  const endIndex = startIndex + Math.floor(numChars);

  return str.substring(0, startIndex) + newStr + str.substring(endIndex);
}

/**
 * TEXT: Formats a number as text according to a format string.
 * Supports basic number formats.
 *
 * @param {*} value - The number to format.
 * @param {*} format_text - The format pattern.
 * @returns {string} The formatted text.
 */
function TEXT(value, format_text) {
  const num = this.coerce.toNumber(value);
  const format = this.coerce.toString(format_text);

  // Handle common format patterns
  const formatLower = format.toLowerCase();

  // Percentage format
  if (format.includes('%')) {
    const decimalPlaces = (format.match(/0/g) || []).length - 1;
    return (num * 100).toFixed(Math.max(0, decimalPlaces)) + '%';
  }

  // Currency format
  if (format.startsWith('$')) {
    const decimalMatch = format.match(/\.([0#]+)/);
    const decimalPlaces = decimalMatch ? decimalMatch[1].length : 2;
    return '$' + num.toFixed(decimalPlaces);
  }

  // Fixed decimal format (0.00, 0.000, etc.)
  const decimalMatch = format.match(/^(#+)?(0+)?(\.)(0+)$/);
  if (decimalMatch) {
    const decimalPlaces = decimalMatch[4].length;
    return num.toFixed(decimalPlaces);
  }

  // Integer format with commas (#,##0)
  if (format.includes(',')) {
    const parts = format.split('.');
    const decimalPlaces = parts[1] ? parts[1].replace(/[^0#]/g, '').length : 0;
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces
    });
  }

  // Date formats
  if (formatLower === 'yyyy-mm-dd' || formatLower === 'mm/dd/yyyy' || formatLower === 'dd/mm/yyyy') {
    // Treat number as Excel serial date (days since 1900-01-01)
    const date = new Date((num - 25569) * 86400000);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    if (formatLower === 'yyyy-mm-dd') {
      return `${year}-${month}-${day}`;
    } else if (formatLower === 'mm/dd/yyyy') {
      return `${month}/${day}/${year}`;
    } else {
      return `${day}/${month}/${year}`;
    }
  }

  // Simple number of zeros (000, 0000, etc.) - pad with leading zeros
  if (/^0+$/.test(format)) {
    return Math.floor(Math.abs(num)).toString().padStart(format.length, '0');
  }

  // Default: return number as string with basic formatting
  return num.toString();
}

/**
 * VALUE: Converts a text string that represents a number to a number.
 *
 * @param {*} text - The text to convert.
 * @returns {number} The numeric value.
 * @throws {ValueError} If the text cannot be converted to a number.
 */
function VALUE(text) {
  const str = this.coerce.toString(text).trim();

  // Handle empty string
  if (str === '') {
    return 0;
  }

  // Handle percentage
  if (str.endsWith('%')) {
    const numStr = str.slice(0, -1);
    const num = parseFloat(numStr);
    if (isNaN(num)) {
      throw new ValueError('Cannot convert text to number');
    }
    return num / 100;
  }

  // Handle currency
  const currencyMatch = str.match(/^[$€£¥]?\s*([\d,.-]+)\s*[$€£¥]?$/);
  if (currencyMatch) {
    const numStr = currencyMatch[1].replace(/,/g, '');
    const num = parseFloat(numStr);
    if (!isNaN(num)) {
      return num;
    }
  }

  // Handle regular numbers (possibly with commas)
  const cleanStr = str.replace(/,/g, '');
  const num = parseFloat(cleanStr);

  if (isNaN(num)) {
    throw new ValueError('Cannot convert text to number');
  }

  return num;
}

// ============================================
// MEDIUM PRIORITY TEXT FUNCTIONS
// ============================================

/**
 * REPT: Repeats text a given number of times.
 *
 * @param {*} text - The text to repeat.
 * @param {*} number_times - The number of times to repeat.
 * @returns {string} The repeated text.
 * @throws {ValueError} If number_times is negative.
 */
function REPT(text, number_times) {
  const str = this.coerce.toString(text);
  const times = this.coerce.toNumber(number_times);

  if (times < 0) {
    throw new ValueError('number_times must be non-negative');
  }

  return str.repeat(Math.floor(times));
}

/**
 * PROPER: Capitalizes the first letter of each word in a text string.
 *
 * @param {*} text - The text to convert.
 * @returns {string} The text with proper capitalization.
 */
function PROPER(text) {
  const str = this.coerce.toString(text);
  return str.replace(/\w\S*/g, (word) => {
    return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
  });
}

/**
 * EXACT: Checks whether two text strings are exactly the same (case-sensitive).
 *
 * @param {*} text1 - The first text string.
 * @param {*} text2 - The second text string.
 * @returns {boolean} TRUE if the strings are identical, FALSE otherwise.
 */
function EXACT(text1, text2) {
  const str1 = this.coerce.toString(text1);
  const str2 = this.coerce.toString(text2);
  return str1 === str2;
}

/**
 * TEXTJOIN: Joins text strings with a delimiter.
 *
 * @param {*} delimiter - The text to insert between each text string.
 * @param {*} ignore_empty - If TRUE, ignores empty strings.
 * @param {...any} args - The text strings to join.
 * @returns {string} The joined text.
 */
function TEXTJOIN(delimiter, ignore_empty, ...args) {
  const delim = this.coerce.toString(delimiter);
  const ignoreEmpty = this.coerce.toBoolean(ignore_empty);

  // Flatten all arguments
  const values = args.flat(Infinity);

  // Convert to strings and optionally filter empty
  let strings = values.map(v => this.coerce.toString(v));

  if (ignoreEmpty) {
    strings = strings.filter(s => s !== '');
  }

  return strings.join(delim);
}

/**
 * SPLIT: Splits text by a delimiter into an array.
 * Note: This is a Google Sheets function, not in Excel.
 *
 * @param {*} text - The text to split.
 * @param {*} delimiter - The character(s) to split by.
 * @param {*} [split_by_each=false] - If TRUE, splits by each character in delimiter.
 * @returns {Array} An array of strings.
 */
function SPLIT(text, delimiter, split_by_each = false) {
  const str = this.coerce.toString(text);
  const delim = this.coerce.toString(delimiter);
  const byEach = this.coerce.toBoolean(split_by_each);

  if (delim === '') {
    return [str];
  }

  if (byEach) {
    // Split by each character in the delimiter
    const regex = new RegExp('[' + delim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ']');
    return str.split(regex).filter(s => s !== '');
  }

  return str.split(delim);
}

// ============================================
// LOW PRIORITY TEXT FUNCTIONS
// ============================================

/**
 * T: Returns the text referred to by value, or empty string if not text.
 *
 * @param {*} value - The value to check.
 * @returns {string} The text if value is text, otherwise empty string.
 */
function T(value) {
  if (typeof value === 'string') {
    return value;
  }
  return '';
}

/**
 * CHAR: Returns the character specified by a code number.
 *
 * @param {*} number - The character code (1-255).
 * @returns {string} The character.
 * @throws {ValueError} If the code is out of range.
 */
function CHAR(number) {
  const code = this.coerce.toNumber(number);

  if (code < 1 || code > 255) {
    throw new ValueError('Code must be between 1 and 255');
  }

  return String.fromCharCode(Math.floor(code));
}

/**
 * CODE: Returns the numeric code for the first character in a text string.
 *
 * @param {*} text - The text string.
 * @returns {number} The character code.
 * @throws {ValueError} If the text is empty.
 */
function CODE(text) {
  const str = this.coerce.toString(text);

  if (str.length === 0) {
    throw new ValueError('Text cannot be empty');
  }

  return str.charCodeAt(0);
}

/**
 * CLEAN: Removes all non-printable characters from text.
 *
 * @param {*} text - The text to clean.
 * @returns {string} The cleaned text.
 */
function CLEAN(text) {
  const str = this.coerce.toString(text);
  // Remove characters with codes 0-31 (non-printable ASCII)
  return str.replace(/[\x00-\x1F]/g, '');
}

// Export all functions as an object
export const textFunctions = {
  LEN,
  UPPER,
  LOWER,
  TRIM,
  CONCATENATE,
  LEFT,
  RIGHT,
  MID,
  FIND,
  SEARCH,
  SUBSTITUTE,
  REPLACE,
  TEXT,
  VALUE,
  // Medium priority
  REPT,
  PROPER,
  EXACT,
  TEXTJOIN,
  SPLIT,
  // Low priority
  T,
  CHAR,
  CODE,
  CLEAN,
};
