import { describe, it, expect } from 'vitest';
import { Tokenizer } from '../../../js/engine/parser/Tokenizer.js';

describe('Tokenizer', () => {
  it('should tokenize a simple formula', () => {
    const formula = 'A1 + 5.5';
    const tokenizer = new Tokenizer(formula);
    const tokens = tokenizer.tokenize();
    expect(tokens).toEqual([
      { type: 'CELL_REF', value: 'A1' },
      { type: 'OPERATOR', value: '+' },
      { type: 'NUMBER', value: 5.5 },
    ]);
  });

  it('should tokenize a function call with a range and string', () => {
    const formula = 'SUM(A1:B2, "Hello")';
    const tokenizer = new Tokenizer(formula);
    const tokens = tokenizer.tokenize();
    expect(tokens).toEqual([
      { type: 'IDENTIFIER', value: 'SUM' },
      { type: 'LEFT_PAREN', value: '(' },
      { type: 'CELL_REF', value: 'A1' },
      { type: 'COLON', value: ':' },
      { type: 'CELL_REF', value: 'B2' },
      { type: 'COMMA', value: ',' },
      { type: 'STRING', value: 'Hello' },
      { type: 'RIGHT_PAREN', value: ')' },
    ]);
  });

  it('should tokenize booleans and absolute references', () => {
    const formula = 'IF(TRUE, $A$1, FALSE)';
    const tokenizer = new Tokenizer(formula);
    const tokens = tokenizer.tokenize();
    expect(tokens).toEqual([
      { type: 'IDENTIFIER', value: 'IF' },
      { type: 'LEFT_PAREN', value: '(' },
      { type: 'BOOLEAN', value: true },
      { type: 'COMMA', value: ',' },
      { type: 'CELL_REF', value: '$A$1' },
      { type: 'COMMA', value: ',' },
      { type: 'BOOLEAN', value: false },
      { type: 'RIGHT_PAREN', value: ')' },
    ]);
  });
});
