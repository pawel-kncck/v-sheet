import { describe, it, expect, vi } from 'vitest';
import { Evaluator } from '../../../js/engine/Evaluator.js';
import { FunctionRegistry } from '../../../js/engine/FunctionRegistry.js';
import { registerFunctions } from '../../../js/engine/functions/register.js';
import { TypeCoercion } from '../../../js/engine/utils/TypeCoercion.js';

describe('Logical Functions', () => {
  let evaluator;

  beforeEach(() => {
    const registry = new FunctionRegistry();
    registerFunctions(registry);

    const mockEvaluator = {
      coerce: TypeCoercion,
      // ...
    };

    const ifFunc = registry.get('IF').bind(mockEvaluator);
    evaluator = { IF: ifFunc };
  });

  it('IF should return value_if_true when condition is true', () => {
    expect(evaluator.IF(true, 'A', 'B')).toBe('A');
    expect(evaluator.IF(1, 'A', 'B')).toBe('A');
    expect(evaluator.IF('hello', 'A', 'B')).toBe('A');
  });

  it('IF should return value_if_false when condition is false', () => {
    expect(evaluator.IF(false, 'A', 'B')).toBe('B');
    expect(evaluator.IF(0, 'A', 'B')).toBe('B');
  });

  it('IF should return FALSE when condition is false and no value_if_false is given', () => {
    expect(evaluator.IF(false, 'A')).toBe(false);
  });
});
