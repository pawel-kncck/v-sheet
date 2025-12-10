import { describe, it, expect, vi } from 'vitest';
import { Evaluator } from '../../../js/engine/Evaluator.js';
import { FunctionRegistry } from '../../../js/engine/FunctionRegistry.js';
import { registerFunctions } from '../../../js/engine/functions/register.js';
import { TypeCoercion } from '../../../js/engine/utils/TypeCoercion.js';

describe('Logical Functions', () => {
  let funcs;
  let mockEvaluator;

  beforeEach(() => {
    const registry = new FunctionRegistry();
    registerFunctions(registry);

    mockEvaluator = {
      coerce: TypeCoercion,
    };

    // Bind all logical functions to the mock context
    funcs = {
      IF: registry.get('IF').bind(mockEvaluator),
      AND: registry.get('AND').bind(mockEvaluator),
      OR: registry.get('OR').bind(mockEvaluator),
      NOT: registry.get('NOT').bind(mockEvaluator),
    };
  });

  describe('IF', () => {
    it('should return value_if_true when condition is true', () => {
      expect(funcs.IF(true, 'A', 'B')).toBe('A');
      expect(funcs.IF(1, 'A', 'B')).toBe('A');
      expect(funcs.IF('hello', 'A', 'B')).toBe('A');
    });

    it('should return value_if_false when condition is false', () => {
      expect(funcs.IF(false, 'A', 'B')).toBe('B');
      expect(funcs.IF(0, 'A', 'B')).toBe('B');
    });

    it('should return FALSE when condition is false and no value_if_false is given', () => {
      expect(funcs.IF(false, 'A')).toBe(false);
    });
  });

  describe('AND', () => {
    it('should return TRUE when all arguments are TRUE', () => {
      expect(funcs.AND(true, true, true)).toBe(true);
      expect(funcs.AND(1, 'hello', true)).toBe(true);
    });

    it('should return FALSE when any argument is FALSE', () => {
      expect(funcs.AND(true, false, true)).toBe(false);
      expect(funcs.AND(1, 0, 1)).toBe(false);
      expect(funcs.AND(false, false)).toBe(false);
    });

    it('should return TRUE for no arguments', () => {
      expect(funcs.AND()).toBe(true);
    });

    it('should handle single argument', () => {
      expect(funcs.AND(true)).toBe(true);
      expect(funcs.AND(false)).toBe(false);
    });

    it('should coerce values to boolean', () => {
      expect(funcs.AND(1, 2, 3)).toBe(true);
      expect(funcs.AND(1, 0, 1)).toBe(false);
      expect(funcs.AND('a', 'b')).toBe(true);
      expect(funcs.AND('a', '')).toBe(false);
    });

    it('should handle arrays (from ranges)', () => {
      expect(funcs.AND([true, true], true)).toBe(true);
      expect(funcs.AND([true, false], true)).toBe(false);
    });
  });

  describe('OR', () => {
    it('should return TRUE when any argument is TRUE', () => {
      expect(funcs.OR(false, true, false)).toBe(true);
      expect(funcs.OR(0, 1, 0)).toBe(true);
      expect(funcs.OR(true, true)).toBe(true);
    });

    it('should return FALSE when all arguments are FALSE', () => {
      expect(funcs.OR(false, false, false)).toBe(false);
      expect(funcs.OR(0, 0, 0)).toBe(false);
      expect(funcs.OR('', 0)).toBe(false);
    });

    it('should return FALSE for no arguments', () => {
      expect(funcs.OR()).toBe(false);
    });

    it('should handle single argument', () => {
      expect(funcs.OR(true)).toBe(true);
      expect(funcs.OR(false)).toBe(false);
    });

    it('should coerce values to boolean', () => {
      expect(funcs.OR(0, 0, 1)).toBe(true);
      expect(funcs.OR('', 'hello')).toBe(true);
      expect(funcs.OR('', 0)).toBe(false);
    });

    it('should handle arrays (from ranges)', () => {
      expect(funcs.OR([false, true], false)).toBe(true);
      expect(funcs.OR([false, false], 0)).toBe(false);
    });
  });

  describe('NOT', () => {
    it('should reverse TRUE to FALSE', () => {
      expect(funcs.NOT(true)).toBe(false);
      expect(funcs.NOT(1)).toBe(false);
      expect(funcs.NOT('hello')).toBe(false);
    });

    it('should reverse FALSE to TRUE', () => {
      expect(funcs.NOT(false)).toBe(true);
      expect(funcs.NOT(0)).toBe(true);
      expect(funcs.NOT('')).toBe(true);
    });

    it('should handle various types', () => {
      expect(funcs.NOT(100)).toBe(false);
      expect(funcs.NOT(-1)).toBe(false);
      expect(funcs.NOT(0.0)).toBe(true);
    });
  });
});
