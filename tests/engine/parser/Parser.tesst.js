import { describe, it, expect } from 'vitest';
import { Tokenizer } from '../../../js/engine/parser/Tokenizer.js';
import { Parser } from '../../../js/engine/parser/Parser.js';

// Helper function to make tests cleaner
const parse = (formula) => {
  const tokenizer = new Tokenizer(formula);
  const tokens = tokenizer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
};

describe('Parser', () => {
  it('should respect operator precedence (multiplication before addition)', () => {
    const ast = parse('1 + 2 * 3');
    // Root should be '+'
    expect(ast.type).toBe('operator');
    expect(ast.op).toBe('+');
    // Left side should be '1'
    expect(ast.left).toEqual({ type: 'number', value: 1 });
    // Right side should be the '*' operation
    expect(ast.right.type).toBe('operator');
    expect(ast.right.op).toBe('*');
    expect(ast.right.left).toEqual({ type: 'number', value: 2 });
    expect(ast.right.right).toEqual({ type: 'number', value: 3 });
  });

  it('should handle parentheses to override precedence', () => {
    const ast = parse('(1 + 2) * 3');
    // Root should be '*'
    expect(ast.type).toBe('operator');
    expect(ast.op).toBe('*');
    // Left side should be the 'group'
    expect(ast.left.type).toBe('group');
    expect(ast.left.expression.op).toBe('+');
    // Right side should be '3'
    expect(ast.right).toEqual({ type: 'number', value: 3 });
  });

  it('should parse a unary minus', () => {
    const ast = parse('-A1');
    expect(ast.type).toBe('unary');
    expect(ast.op).toBe('-');
    expect(ast.operand).toEqual({ type: 'cell', ref: 'A1' });
  });

  it('should parse a range', () => {
    const ast = parse('A1:B10');
    expect(ast).toEqual({ type: 'range', start: 'A1', end: 'B10' });
  });
});
