/**
 * TypeCoercion
 *
 * This class provides static utility methods for converting values
 * between types (number, string, boolean) in a way that mimics
 * spreadsheet behavior.
 */
class TypeCoercion {
  /**
   * Converts a value to a number.
   * - Booleans: true=1, false=0
   * - Strings: Parsed as numbers if possible, otherwise 0
   * - null/undefined: 0
   * @param {*} value - The value to convert.
   * @returns {number} The numeric representation.
   */
  static toNumber(value) {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    if (typeof value === 'string') {
      // Try to parse a number, including scientific notation
      const num = parseFloat(value);
      // Check if the string was *only* a number
      return isFinite(num) &&
        /^-?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i.test(value.trim())
        ? num
        : 0;
    }
    // Handle objects or arrays (e.g., from a range)
    // In a simple evaluator, we might just return 0 or the first element's value
    if (Array.isArray(value) && value.length > 0) {
      return this.toNumber(value[0]); // Default to first element
    }
    return 0;
  }

  /**
   * Converts a value to a string.
   * - Booleans: "TRUE" or "FALSE"
   * - null/undefined: "" (empty string)
   * @param {*} value - The value to convert.
   * @returns {string} The string representation.
   */
  static toString(value) {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }
    if (typeof value === 'number') {
      return String(value);
    }
    return String(value);
  }

  /**
   * Converts a value to a boolean.
   * - Numbers: 0=false, all others=true
   * - Strings: ""=false, all others=true
   * - null/undefined: false
   * @param {*} value - The value to convert.
   * @returns {boolean} The boolean representation.
   */
  static toBoolean(value) {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value !== 0;
    }
    if (value === null || value === undefined) {
      return false;
    }
    if (typeof value === 'string') {
      // In spreadsheets, any string (even "FALSE") is true, except empty string
      return value !== '';
    }
    return true; // All other truthy values
  }

  /**
   * Compares two values, a and b.
   * Handles mixed-type comparisons by prioritizing numbers.
   * @param {*} a - Left value.
   * @param {*} b - Right value.
   * @returns {number} - 0 if equal, <0 if a < b, >0 if a > b.
   */
  static compare(a, b) {
    const aType = typeof a;
    const bType = typeof b;

    // If types are different, try to make them numbers
    if (aType !== bType) {
      const aNum = this.toNumber(a);
      const bNum = this.toNumber(b);

      // Check if *both* were convertible to numbers
      if (aNum !== 0 || bNum !== 0 || (a === 0 && b === 0)) {
        return aNum - bNum;
      }
      // Otherwise, fall back to string comparison
    }

    // Number comparison
    if (aType === 'number') {
      return a - b;
    }

    // Boolean comparison
    if (aType === 'boolean') {
      return this.toNumber(a) - this.toNumber(b);
    }

    // Default to string comparison
    return this.toString(a).localeCompare(this.toString(b));
  }
}

// Export the class for ES6 Modules
export { TypeCoercion };
