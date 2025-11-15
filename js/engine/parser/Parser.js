/**
 * Formula Parser
 *
 * This class takes an array of tokens from the Tokenizer and builds an
 * Abstract Syntax Tree (AST) representing the formula's structure and
 * order of operations.
 *
 * Example:
 * Input Tokens:
 * [
 * { type: 'CELL_REF', value: 'A1' },
 * { type: 'OPERATOR', value: '+' },
 * { type: 'NUMBER',   value: 5 }
 * ]
 *
 * Output AST:
 * {
 * type: 'operator',
 * op: '+',
 * left: { type: 'cell', ref: 'A1' },
 * right: { type: 'number', value: 5 }
 * }
 */
class Parser {
  /**
   * Creates a new Parser instance.
   * @param {Array<Object>} tokens - The array of tokens from the Tokenizer.
   */
  constructor(tokens) {
    this.tokens = tokens;
    this.position = 0;
  }

  /**
   * Public method to parse the tokens into an AST.
   * @returns {Object} The root node of the Abstract Syntax Tree.
   */
  parse() {
    if (this.isAtEnd()) {
      return { type: 'literal', value: '' }; // Handle empty formula
    }

    const ast = this.parseExpression();

    // After parsing, we should be at the end of the token list.
    // If not, it means there are trailing tokens, which is a syntax error.
    if (!this.isAtEnd()) {
      throw new Error(
        `Unexpected token at end of formula: ${this.peek().type}`
      );
    }

    return ast;
  }

  // --- Grammar Implementation (Recursive Descent) ---
  // The order of operations is defined by this chain of methods,
  // from lowest precedence (parseExpression) to highest (parsePrimary).

  /**
   * Entry point for the grammar.
   * Currently, this just forwards to the lowest precedence level.
   * (e.g., comparison)
   */
  parseExpression() {
    return this.parseComparison();
  }

  /**
   * Handles Comparison operators (e.g., =, <, >, <=, >=, <>).
   * Lowest precedence.
   */
  parseComparison() {
    let left = this.parseConcatenation();

    while (this.match('OPERATOR', '=', '<>', '!=', '<', '<=', '>', '>=')) {
      const operator = this.previous();
      const right = this.parseConcatenation();
      left = { type: 'operator', op: operator.value, left, right };
    }

    return left;
  }

  /**
   * Handles Concatenation operator (&).
   */
  parseConcatenation() {
    let left = this.parseAddition();

    while (this.match('OPERATOR', '&')) {
      const operator = this.previous();
      const right = this.parseAddition();
      left = { type: 'operator', op: operator.value, left, right };
    }

    return left;
  }

  /**
   * Handles Addition and Subtraction operators (+, -).
   */
  parseAddition() {
    let left = this.parseMultiplication();

    while (this.match('OPERATOR', '+', '-')) {
      const operator = this.previous();
      const right = this.parseMultiplication();
      left = { type: 'operator', op: operator.value, left, right };
    }

    return left;
  }

  /**
   * Handles Multiplication and Division operators (*, /).
   */
  parseMultiplication() {
    let left = this.parsePower();

    while (this.match('OPERATOR', '*', '/')) {
      const operator = this.previous();
      const right = this.parsePower();
      left = { type: 'operator', op: operator.value, left, right };
    }

    return left;
  }

  /**
   * Handles Exponentiation operator (^).
   * (Note: Excel/Sheets are right-associative, but we'll use left-associative
   * for simplicity for now, which is standard for simple parsers).
   */
  parsePower() {
    let left = this.parseUnary();

    while (this.match('OPERATOR', '^')) {
      const operator = this.previous();
      const right = this.parseUnary();
      left = { type: 'operator', op: operator.value, left, right };
    }

    return left;
  }

  /**
   * Handles Unary operators (e.g., -5, +A1).
   */
  parseUnary() {
    if (this.match('OPERATOR', '-', '+')) {
      const operator = this.previous();
      const operand = this.parseUnary(); // Unary operators can stack (e.g., --5)
      return { type: 'unary', op: operator.value, operand };
    }

    return this.parsePrimary();
  }

  /**
   * Handles primary expressions (the "leaves" of the tree).
   * This includes literals, cell references, function calls, and parentheses.
   */
  parsePrimary() {
    // Literals
    if (this.match('NUMBER')) {
      return { type: 'number', value: this.previous().value };
    }
    if (this.match('STRING')) {
      return { type: 'string', value: this.previous().value };
    }
    if (this.match('BOOLEAN')) {
      return { type: 'boolean', value: this.previous().value };
    }

    // Cell Reference or Range
    if (this.match('CELL_REF')) {
      const startCell = this.previous();

      // Check for a range (e.g., A1:B2)
      if (this.match('COLON')) {
        if (!this.match('CELL_REF')) {
          throw new Error('Expected cell reference after : in range');
        }
        const endCell = this.previous();
        return {
          type: 'range',
          start: startCell.value,
          end: endCell.value,
        };
      }

      // Just a single cell
      return { type: 'cell', ref: startCell.value };
    }

    // Function Call (e.g., SUM(...))
    if (this.match('IDENTIFIER')) {
      const identifier = this.previous();

      if (this.match('LEFT_PAREN')) {
        const args = this.parseArgumentList();
        if (!this.match('RIGHT_PAREN')) {
          throw new Error('Expected ) after function arguments');
        }
        return { type: 'function', name: identifier.value, args };
      }

      // If it's an identifier NOT followed by '(', it's invalid
      // (or a named range, which we don't support yet).
      throw new Error(`Unexpected identifier: ${identifier.value}`);
    }

    // Grouping (e.g., (1 + 2))
    if (this.match('LEFT_PAREN')) {
      const expression = this.parseExpression();
      if (!this.match('RIGHT_PAREN')) {
        throw new Error('Expected ) after expression in parentheses');
      }
      return { type: 'group', expression };
    }

    // If we get here, we don't know what this token is.
    throw new Error(`Unexpected token: ${this.peek().type}`);
  }

  /**
   * Helper to parse comma-separated arguments in a function call.
   */
  parseArgumentList() {
    const args = [];

    // Check for empty arguments (e.g., NOW())
    if (this.peek().type === 'RIGHT_PAREN') {
      return args;
    }

    // Parse the first argument
    args.push(this.parseExpression());

    // Parse subsequent arguments
    while (this.match('COMMA')) {
      args.push(this.parseExpression());
    }

    return args;
  }

  // --- Utility Methods ---

  /**
   * Checks if the current token matches any of the given types/values.
   * If it matches, consumes the token and returns true.
   * @param {string} type - The token type to check (e.g., 'OPERATOR').
   * @param  {...string} values - Optional values to match (e.g., '+', '-').
   */
  match(type, ...values) {
    if (this.isAtEnd()) return false;

    const token = this.peek();
    if (token.type !== type) return false;

    if (values.length > 0 && !values.includes(token.value)) {
      return false;
    }

    this.consume(); // Token matched, so consume it
    return true;
  }

  /**
   * Returns the current token without consuming it.
   */
  peek() {
    return this.tokens[this.position];
  }

  /**
   * Returns the previous token.
   */
  previous() {
    return this.tokens[this.position - 1];
  }

  /**
   * Consumes and returns the current token, advancing the parser.
   */
  consume() {
    if (!this.isAtEnd()) {
      this.position++;
    }
    return this.previous();
  }

  /**
   * Checks if we have consumed all tokens.
   */
  isAtEnd() {
    return this.position >= this.tokens.length;
  }
}

// Export the class for ES6 Modules
export { Parser };
