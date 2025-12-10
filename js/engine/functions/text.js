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
};
