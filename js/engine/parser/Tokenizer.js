/**
 * Formula Tokenizer
 *
 * This class scans a raw formula string (e.g., "SUM(A1:B2, 5.5) * 2")
 * and converts it into an array of token objects.
 *
 * Example:
 * Input: "A1 + 5"
 * Output:
 * [
 * { type: 'CELL_REF', value: 'A1' },
 * { type: 'OPERATOR', value: '+' },
 * { type: 'NUMBER',   value: 5 }
 * ]
 */
class Tokenizer {
  /**
   * Creates a new Tokenizer instance.
   * @param {string} input - The raw formula string (e.g., "A1+B1").
   */
  constructor(input) {
    this.input = input;
    this.position = 0;
  }

  /**
   * Public method to tokenize the entire input string.
   * @returns {Array<Object>} An array of token objects.
   */
  tokenize() {
    const tokens = [];
    while (this.position < this.input.length) {
      const char = this.input[this.position];

      // 1. Skip Whitespace
      if (this.isWhitespace(char)) {
        this.position++;
        continue;
      }

      // 2. Handle Numbers
      if (this.isDigit(char)) {
        tokens.push(this.readNumber());
        continue;
      }

      // 3. Handle Strings (delimited by quotes)
      if (char === '"' || char === "'") {
        tokens.push(this.readString(char));
        continue;
      }

      // 4. Handle Identifiers, Cell Refs, and Booleans
      // (must start with a letter or '$' for cell refs)
      if (this.isLetter(char) || char === '$') {
        tokens.push(this.readIdentifierOrCellRef());
        continue;
      }

      // 5. Handle Operators
      if (this.isOperator(char)) {
        tokens.push(this.readOperator());
        continue;
      }

      // 6. Handle Punctuation
      if (char === '(') {
        tokens.push({ type: 'LEFT_PAREN', value: '(' });
        this.position++;
        continue;
      }
      if (char === ')') {
        tokens.push({ type: 'RIGHT_PAREN', value: ')' });
        this.position++;
        continue;
      }
      if (char === ',') {
        tokens.push({ type: 'COMMA', value: ',' });
        this.position++;
        continue;
      }
      if (char === ':') {
        tokens.push({ type: 'COLON', value: ':' });
        this.position++;
        continue;
      }

      // If we've reached here, it's an unknown character
      throw new Error(`Unexpected character at pos ${this.position}: ${char}`);
    }

    return tokens;
  }

  // --- Reader Methods ---

  /**
   * Reads a number token (e.g., 123, 45.6).
   */
  readNumber() {
    let numberStr = '';
    while (this.position < this.input.length) {
      const char = this.input[this.position];
      if (this.isDigit(char) || char === '.') {
        numberStr += char;
        this.position++;
      } else {
        break;
      }
    }
    return { type: 'NUMBER', value: parseFloat(numberStr) };
  }

  /**
   * Reads a string token (e.g., "hello", 'world').
   * Handles escaped quotes (e.g., "a \"test\"")
   */
  readString(quoteType) {
    this.position++; // Skip opening quote
    let str = '';

    while (this.position < this.input.length) {
      const char = this.input[this.position];

      if (char === quoteType) {
        this.position++; // Skip closing quote
        return { type: 'STRING', value: str };
      }

      // Handle escape character \
      if (char === '\\' && this.position + 1 < this.input.length) {
        this.position++; // Skip backslash
        str += this.input[this.position]; // Add the escaped char
      } else {
        str += char;
      }
      this.position++;
    }

    throw new Error('Unterminated string');
  }

  /**
   * Reads an Identifier (SUM, IF), Cell Reference (A1, $B$10), or Boolean (TRUE, FALSE).
   */
  readIdentifierOrCellRef() {
    let text = '';
    while (this.position < this.input.length) {
      const char = this.input[this.position];
      // A token can contain letters, numbers, underscores, and dollar signs
      if (
        this.isLetter(char) ||
        this.isDigit(char) ||
        char === '_' ||
        char === '$'
      ) {
        text += char;
        this.position++;
      } else {
        break;
      }
    }

    const upperText = text.toUpperCase();

    // 1. Check for Booleans
    if (upperText === 'TRUE' || upperText === 'FALSE') {
      return { type: 'BOOLEAN', value: upperText === 'TRUE' };
    }

    // 2. Check for Cell Reference
    // Regex: Optional $, one+ letters, optional $, one+ numbers. Must match the *entire* string.
    const cellRefRegex = /^\$?([A-Z]+)\$?([0-9]+)$/;
    if (cellRefRegex.test(upperText)) {
      return { type: 'CELL_REF', value: upperText };
    }

    // 3. Check for valid Identifier (e.g., function name)
    // Must start with a letter or underscore.
    const identifierRegex = /^[A-Z_][A-Z0-9_]*$/;
    if (identifierRegex.test(upperText)) {
      return { type: 'IDENTIFIER', value: upperText };
    }

    throw new Error(`Invalid identifier or cell reference: ${text}`);
  }

  /**
   * Reads an operator token.
   * Handles multi-character operators (e.g., <>, <=, >=).
   */
  readOperator() {
    const char = this.input[this.position];
    const nextChar =
      this.position + 1 < this.input.length
        ? this.input[this.position + 1]
        : '';

    let op = char;

    if (
      (char === '<' && nextChar === '>') ||
      (char === '!' && nextChar === '=')
    ) {
      op = '<>'; // Normalize '!=' to '<>'
      this.position += 2;
      return { type: 'OPERATOR', value: op };
    }
    if ((char === '<' || char === '>') && nextChar === '=') {
      op = char + nextChar;
      this.position += 2;
      return { type: 'OPERATOR', value: op };
    }

    // Single character operator
    this.position++;
    return { type: 'OPERATOR', value: op };
  }

  // --- Character Checkers ---

  isWhitespace(char) {
    return /\s/.test(char);
  }

  isDigit(char) {
    return /[0-9]/.test(char);
  }

  isLetter(char) {
    return /[a-zA-Z]/.test(char);
  }

  isOperator(char) {
    return /[+\-*/^&=<>!]/.test(char);
  }
}

// Export the class for ES6 Modules
export { Tokenizer };
