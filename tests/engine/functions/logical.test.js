import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Evaluator } from '../../../js/engine/Evaluator.js';
import { FunctionRegistry } from '../../../js/engine/FunctionRegistry.js';
import { registerFunctions } from '../../../js/engine/functions/register.js';
import { TypeCoercion } from '../../../js/engine/utils/TypeCoercion.js';
import { ValueError, NotAvailableError, FormulaError, DivZeroError } from '../../../js/engine/utils/FormulaErrors.js';

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
      IFS: registry.get('IFS').bind(mockEvaluator),
      IFERROR: registry.get('IFERROR').bind(mockEvaluator),
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

  describe('IFS', () => {
    it('should return value for first true condition', () => {
      expect(funcs.IFS(true, 'A', true, 'B')).toBe('A');
      expect(funcs.IFS(false, 'A', true, 'B')).toBe('B');
    });

    it('should handle multiple conditions', () => {
      expect(funcs.IFS(false, 'A', false, 'B', true, 'C')).toBe('C');
    });

    it('should work with numeric conditions', () => {
      expect(funcs.IFS(0, 'A', 1, 'B')).toBe('B');
    });

    it('should throw error for no true condition', () => {
      expect(() => funcs.IFS(false, 'A', false, 'B')).toThrow(NotAvailableError);
    });

    it('should throw error for odd number of arguments', () => {
      expect(() => funcs.IFS(true, 'A', true)).toThrow(ValueError);
    });

    it('should throw error for no arguments', () => {
      expect(() => funcs.IFS()).toThrow(ValueError);
    });
  });

  describe('IFERROR', () => {
    it('should return original value if not an error', () => {
      expect(funcs.IFERROR(42, 'error')).toBe(42);
      expect(funcs.IFERROR('hello', 'error')).toBe('hello');
      expect(funcs.IFERROR(0, 'error')).toBe(0);
    });

    it('should return error value for FormulaError instances', () => {
      const divError = new DivZeroError();
      expect(funcs.IFERROR(divError, 'Division error')).toBe('Division error');
    });

    it('should return error value for error strings', () => {
      expect(funcs.IFERROR('#DIV/0!', 0)).toBe(0);
      expect(funcs.IFERROR('#N/A', 'Not found')).toBe('Not found');
      expect(funcs.IFERROR('#VALUE!', 'Invalid')).toBe('Invalid');
      expect(funcs.IFERROR('#REF!', 'Bad ref')).toBe('Bad ref');
    });

    it('should be case-insensitive for error strings', () => {
      expect(funcs.IFERROR('#div/0!', 0)).toBe(0);
      expect(funcs.IFERROR('#n/a', 'Not found')).toBe('Not found');
    });

    it('should not treat normal strings as errors', () => {
      expect(funcs.IFERROR('hello', 'error')).toBe('hello');
      expect(funcs.IFERROR('DIV', 'error')).toBe('DIV');
    });
  });
});
