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

// ============================================
// MEDIUM PRIORITY DATE/TIME FUNCTIONS
// ============================================

/**
 * HOUR: Extracts the hour from a serial date number.
 *
 * @param {*} serial_number - The date/time serial number.
 * @returns {number} The hour (0-23).
 */
function HOUR(serial_number) {
  const serial = this.coerce.toNumber(serial_number);

  if (serial < 0) {
    throw new NumError('Date serial number cannot be negative');
  }

  const date = serialToDate(serial);
  return date.getUTCHours();
}

/**
 * MINUTE: Extracts the minute from a serial date number.
 *
 * @param {*} serial_number - The date/time serial number.
 * @returns {number} The minute (0-59).
 */
function MINUTE(serial_number) {
  const serial = this.coerce.toNumber(serial_number);

  if (serial < 0) {
    throw new NumError('Date serial number cannot be negative');
  }

  const date = serialToDate(serial);
  return date.getUTCMinutes();
}

/**
 * SECOND: Extracts the second from a serial date number.
 *
 * @param {*} serial_number - The date/time serial number.
 * @returns {number} The second (0-59).
 */
function SECOND(serial_number) {
  const serial = this.coerce.toNumber(serial_number);

  if (serial < 0) {
    throw new NumError('Date serial number cannot be negative');
  }

  const date = serialToDate(serial);
  return date.getUTCSeconds();
}

/**
 * TIME: Creates a time from hour, minute, and second components.
 *
 * @param {*} hour - The hour (0-23).
 * @param {*} minute - The minute (0-59).
 * @param {*} second - The second (0-59).
 * @returns {number} The time as a decimal (fraction of a day).
 */
function TIME(hour, minute, second) {
  const h = this.coerce.toNumber(hour);
  const m = this.coerce.toNumber(minute);
  const s = this.coerce.toNumber(second);

  // Validate ranges (allow overflow like Excel)
  if (h < 0 || h >= 32768) {
    throw new NumError('Hour out of range');
  }

  // Calculate time as fraction of a day
  return (h * 3600 + m * 60 + s) / 86400;
}

/**
 * WEEKDAY: Returns the day of the week for a date.
 *
 * @param {*} serial_number - The date serial number.
 * @param {*} [return_type=1] - Determines the return value type:
 *   1 = Sunday=1 through Saturday=7
 *   2 = Monday=1 through Sunday=7
 *   3 = Monday=0 through Sunday=6
 * @returns {number} The day of the week.
 */
function WEEKDAY(serial_number, return_type = 1) {
  const serial = this.coerce.toNumber(serial_number);
  const type = this.coerce.toNumber(return_type);

  if (serial < 0) {
    throw new NumError('Date serial number cannot be negative');
  }

  const date = serialToDate(serial);
  const day = date.getUTCDay(); // 0 = Sunday, 6 = Saturday

  switch (type) {
    case 1:
      // Sunday = 1, Saturday = 7
      return day + 1;
    case 2:
      // Monday = 1, Sunday = 7
      return day === 0 ? 7 : day;
    case 3:
      // Monday = 0, Sunday = 6
      return day === 0 ? 6 : day - 1;
    default:
      throw new NumError('Invalid return_type for WEEKDAY');
  }
}

/**
 * DATEDIF: Calculates the difference between two dates.
 *
 * @param {*} start_date - The start date serial number.
 * @param {*} end_date - The end date serial number.
 * @param {*} unit - The unit of time:
 *   "Y" = complete years
 *   "M" = complete months
 *   "D" = days
 *   "MD" = days, ignoring months and years
 *   "YM" = months, ignoring years
 *   "YD" = days, ignoring years
 * @returns {number} The difference in the specified unit.
 */
function DATEDIF(start_date, end_date, unit) {
  const startSerial = this.coerce.toNumber(start_date);
  const endSerial = this.coerce.toNumber(end_date);
  const unitStr = this.coerce.toString(unit).toUpperCase();

  if (startSerial > endSerial) {
    throw new NumError('Start date must be before end date');
  }

  const start = serialToDate(startSerial);
  const end = serialToDate(endSerial);

  const startYear = start.getUTCFullYear();
  const startMonth = start.getUTCMonth();
  const startDay = start.getUTCDate();
  const endYear = end.getUTCFullYear();
  const endMonth = end.getUTCMonth();
  const endDay = end.getUTCDate();

  switch (unitStr) {
    case 'Y':
      // Complete years
      let years = endYear - startYear;
      if (endMonth < startMonth || (endMonth === startMonth && endDay < startDay)) {
        years--;
      }
      return Math.max(0, years);

    case 'M':
      // Complete months
      let months = (endYear - startYear) * 12 + (endMonth - startMonth);
      if (endDay < startDay) {
        months--;
      }
      return Math.max(0, months);

    case 'D':
      // Days
      return Math.floor(endSerial - startSerial);

    case 'MD':
      // Days, ignoring months and years
      let md = endDay - startDay;
      if (md < 0) {
        // Get days in previous month
        const prevMonth = new Date(Date.UTC(endYear, endMonth, 0));
        md += prevMonth.getUTCDate();
      }
      return md;

    case 'YM':
      // Months, ignoring years
      let ym = endMonth - startMonth;
      if (endDay < startDay) {
        ym--;
      }
      if (ym < 0) {
        ym += 12;
      }
      return ym;

    case 'YD':
      // Days, ignoring years
      const startOfYear = new Date(Date.UTC(endYear, startMonth, startDay));
      let yd = Math.floor((end - startOfYear) / MS_PER_DAY);
      if (yd < 0) {
        const startOfPrevYear = new Date(Date.UTC(endYear - 1, startMonth, startDay));
        yd = Math.floor((end - startOfPrevYear) / MS_PER_DAY);
      }
      return yd;

    default:
      throw new ValueError('Invalid unit for DATEDIF');
  }
}

/**
 * EDATE: Returns the date a specified number of months before or after a date.
 *
 * @param {*} start_date - The start date serial number.
 * @param {*} months - The number of months to add (can be negative).
 * @returns {number} The resulting date serial number.
 */
function EDATE(start_date, months) {
  const serial = this.coerce.toNumber(start_date);
  const monthsToAdd = this.coerce.toNumber(months);

  if (serial < 0) {
    throw new NumError('Date serial number cannot be negative');
  }

  const date = serialToDate(serial);
  date.setUTCMonth(date.getUTCMonth() + Math.floor(monthsToAdd));

  return Math.floor(dateToSerial(date));
}

/**
 * EOMONTH: Returns the last day of the month a specified number of months before or after a date.
 *
 * @param {*} start_date - The start date serial number.
 * @param {*} months - The number of months to add (can be negative).
 * @returns {number} The date serial number of the last day of that month.
 */
function EOMONTH(start_date, months) {
  const serial = this.coerce.toNumber(start_date);
  const monthsToAdd = this.coerce.toNumber(months);

  if (serial < 0) {
    throw new NumError('Date serial number cannot be negative');
  }

  const date = serialToDate(serial);
  // Go to the target month, then set day to 0 of the next month (= last day of target month)
  date.setUTCMonth(date.getUTCMonth() + Math.floor(monthsToAdd) + 1, 0);

  return Math.floor(dateToSerial(date));
}

// Export all functions as an object
export const datetimeFunctions = {
  TODAY,
  NOW,
  DATE,
  YEAR,
  MONTH,
  DAY,
  // Medium priority
  HOUR,
  MINUTE,
  SECOND,
  TIME,
  WEEKDAY,
  DATEDIF,
  EDATE,
  EOMONTH,
  // Export helpers for testing
  _dateToSerial: dateToSerial,
  _serialToDate: serialToDate,
};
