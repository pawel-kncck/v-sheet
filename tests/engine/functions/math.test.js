import { describe, it, expect, vi } from 'vitest';
import { Evaluator } from '../../../js/engine/Evaluator.js';
import { FunctionRegistry } from '../../../js/engine/FunctionRegistry.js';
import { registerFunctions } from '../../../js/engine/functions/register.js';
import { TypeCoercion } from '../../../js/engine/utils/TypeCoercion.js';

describe('Math Functions', () => {
  let evaluator;

  beforeEach(() => {
    const registry = new FunctionRegistry();
    registerFunctions(registry);

    // Mock the evaluator context
    const mockEvaluator = {
      coerce: TypeCoercion,
      getCellValue: vi.fn(),
      getRangeValues: vi.fn(),
    };

    // Bind the function to the mock context
    const sumFunc = registry.get('SUM').bind(mockEvaluator);
    evaluator = { SUM: sumFunc };
  });

  it('SUM should add numbers', () => {
    const result = evaluator.SUM(1, 2, 3);
    expect(result).toBe(6);
  });

  it('SUM should coerce non-numeric values', () => {
    // true = 1, "hello" = 0, false = 0
    const result = evaluator.SUM(5, true, 'hello', false);
    expect(result).toBe(6);
  });

  it('SUM should handle nested arrays (from ranges)', () => {
    const result = evaluator.SUM(1, [2, [3, 'ignore']], 4);
    expect(result).toBe(10);
  });
});
