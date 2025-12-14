/**
 * Date/Time Functions
 *
 * This file contains the implementation for all date and time related
 * formula functions (e.g., TODAY, NOW, DATE, YEAR, MONTH, DAY).
 *
 * Each function is designed to be called by the Evaluator,
 * and `this` will be bound to the Evaluator's instance,
 * giving us access to `this.coerce` and other utilities.
 *
 * Excel/Sheets use a serial date system where:
 * - Day 1 = January 1, 1900
 * - Each subsequent day increments by 1
 * - Times are represented as fractional days (0.5 = noon)
 */

import { ValueError, NumError } from '../utils/FormulaErrors.js';

// Excel epoch: January 1, 1900 (but Excel incorrectly considers 1900 a leap year)
// We use the Unix timestamp approach and convert
// Excel serial date 25569 = January 1, 1970 (Unix epoch)
const EXCEL_EPOCH_OFFSET = 25569;
const MS_PER_DAY = 86400000;

/**
 * Converts a JavaScript Date to an Excel serial date number.
 * @private
 * @param {Date} date - The JavaScript Date object.
 * @returns {number} The Excel serial date number.
 */
function dateToSerial(date) {
  return (date.getTime() / MS_PER_DAY) + EXCEL_EPOCH_OFFSET;
}

/**
 * Converts an Excel serial date number to a JavaScript Date.
 * @private
 * @param {number} serial - The Excel serial date number.
 * @returns {Date} The JavaScript Date object.
 */
function serialToDate(serial) {
  return new Date((serial - EXCEL_EPOCH_OFFSET) * MS_PER_DAY);
}

/**
 * TODAY: Returns the current date as a serial date number.
 *
 * @returns {number} The current date as a serial number (no time component).
 */
function TODAY() {
  const now = new Date();
  // Create a date with no time component (midnight UTC)
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  return Math.floor(dateToSerial(today));
}

/**
 * NOW: Returns the current date and time as a serial date number.
 *
 * @returns {number} The current date and time as a serial number.
 */
function NOW() {
  return dateToSerial(new Date());
}

/**
 * DATE: Creates a date from year, month, and day components.
 *
 * @param {*} year - The year (1900-9999). Two-digit years are interpreted as 1900-1999.
 * @param {*} month - The month (1-12). Values outside this range roll over.
 * @param {*} day - The day (1-31). Values outside this range roll over.
 * @returns {number} The serial date number.
 */
function DATE(year, month, day) {
  let y = this.coerce.toNumber(year);
  const m = this.coerce.toNumber(month);
  const d = this.coerce.toNumber(day);

  // Handle two-digit years (0-99 maps to 1900-1999)
  if (y >= 0 && y <= 99) {
    y += 1900;
  }

  if (y < 1900 || y > 9999) {
    throw new NumError('Year must be between 1900 and 9999');
  }

  // JavaScript Date handles month/day overflow automatically
  // Month is 0-indexed in JavaScript, but 1-indexed in Excel
  const date = new Date(Date.UTC(y, m - 1, d));

  return Math.floor(dateToSerial(date));
}

/**
 * YEAR: Extracts the year from a serial date number.
 *
 * @param {*} serial_number - The date serial number.
 * @returns {number} The year (1900-9999).
 */
function YEAR(serial_number) {
  const serial = this.coerce.toNumber(serial_number);

  if (serial < 0) {
    throw new NumError('Date serial number cannot be negative');
  }

  const date = serialToDate(serial);
  return date.getUTCFullYear();
}

/**
 * MONTH: Extracts the month from a serial date number.
 *
 * @param {*} serial_number - The date serial number.
 * @returns {number} The month (1-12).
 */
function MONTH(serial_number) {
  const serial = this.coerce.toNumber(serial_number);

  if (serial < 0) {
    throw new NumError('Date serial number cannot be negative');
  }

  const date = serialToDate(serial);
  return date.getUTCMonth() + 1; // JavaScript months are 0-indexed
}

/**
 * DAY: Extracts the day of the month from a serial date number.
 *
 * @param {*} serial_number - The date serial number.
 * @returns {number} The day of the month (1-31).
 */
function DAY(serial_number) {
  const serial = this.coerce.toNumber(serial_number);

  if (serial < 0) {
    throw new NumError('Date serial number cannot be negative');
  }

  const date = serialToDate(serial);
  return date.getUTCDate();
}

// Export all functions as an object
export const datetimeFunctions = {
  TODAY,
  NOW,
  DATE,
  YEAR,
  MONTH,
  DAY,
  // Export helpers for testing
  _dateToSerial: dateToSerial,
  _serialToDate: serialToDate,
};
