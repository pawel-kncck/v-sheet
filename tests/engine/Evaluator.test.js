import { describe, it, expect, vi } from 'vitest';
import { Tokenizer } from '../../js/engine/parser/Tokenizer.js';
import { Parser } from '../../js/engine/parser/Parser.js';
import { Evaluator } from '../../js/engine/Evaluator.js';
import { FunctionRegistry } from '../../js/engine/FunctionRegistry.js';
import { DivZeroError } from '../../js/engine/utils/FormulaErrors.js';
import { registerFunctions } from '../../js/engine/functions/register.js';

// Helper function to evaluate a formula string
const evaluate = (formula, cellValues = {}) => {
  // 1. Setup mocks
  const mockGetCellValue = (cellId) => cellValues[cellId];
  const mockGetRangeValues = vi.fn(); // Not needed for these tests

  // 2. Setup registry
  const registry = new FunctionRegistry();
  registerFunctions(registry); // Load SUM, IF, etc.

  // 3. Setup evaluator
  const evaluator = new Evaluator({
    getCellValue: mockGetCellValue,
    getRangeValues: mockGetRangeValues,
    functionRegistry: registry,
  });

  // 4. Parse and evaluate
  const tokenizer = new Tokenizer(formula);
  const tokens = tokenizer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  return evaluator.evaluate(ast);
};

describe('Evaluator', () => {
  it('should evaluate all binary operators', () => {
    expect(evaluate('1 + 2')).toBe(3);
    expect(evaluate('10 - 3')).toBe(7);
    expect(evaluate('4 * 5')).toBe(20);
    expect(evaluate('20 / 4')).toBe(5);
    expect(evaluate('2 ^ 3')).toBe(8);
    expect(evaluate('"Hello" & " " & "World"')).toBe('Hello World');
    expect(evaluate('5 > 1')).toBe(true);
    expect(evaluate('5 < 1')).toBe(false);
    expect(evaluate('5 = 5')).toBe(true);
    expect(evaluate('5 <> 1')).toBe(true);
    expect(evaluate('5 <= 5')).toBe(true);
    expect(evaluate('5 >= 4')).toBe(true);
  });

  it('should handle division by zero', () => {
    const result = evaluate('1 / 0');
    expect(result).toBeInstanceOf(DivZeroError);
    expect(result.toString()).toBe('#DIV/0!');
  });
});
