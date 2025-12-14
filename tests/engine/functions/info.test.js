import { describe, it, expect, beforeEach } from 'vitest';
import { FunctionRegistry } from '../../../js/engine/FunctionRegistry.js';
import { registerFunctions } from '../../../js/engine/functions/register.js';
import { TypeCoercion } from '../../../js/engine/utils/TypeCoercion.js';
import { FormulaError, DivZeroError, ValueError, NotAvailableError } from '../../../js/engine/utils/FormulaErrors.js';

describe('Information Functions', () => {
  let funcs;
  let mockEvaluator;

  beforeEach(() => {
    const registry = new FunctionRegistry();
    registerFunctions(registry);

    // Mock the evaluator context
    mockEvaluator = {
      coerce: TypeCoercion,
    };

    // Bind info functions to the mock context
    funcs = {
      ISBLANK: registry.get('ISBLANK').bind(mockEvaluator),
      ISERROR: registry.get('ISERROR').bind(mockEvaluator),
      ISNUMBER: registry.get('ISNUMBER').bind(mockEvaluator),
      ISTEXT: registry.get('ISTEXT').bind(mockEvaluator),
      // Medium priority
      ISNA: registry.get('ISNA').bind(mockEvaluator),
      ISLOGICAL: registry.get('ISLOGICAL').bind(mockEvaluator),
      NA: registry.get('NA').bind(mockEvaluator),
      ISEVEN: registry.get('ISEVEN').bind(mockEvaluator),
      ISODD: registry.get('ISODD').bind(mockEvaluator),
      TYPE: registry.get('TYPE').bind(mockEvaluator),
    };
  });

  describe('ISBLANK', () => {
    it('should return TRUE for empty string', () => {
      expect(funcs.ISBLANK('')).toBe(true);
    });

    it('should return TRUE for null', () => {
      expect(funcs.ISBLANK(null)).toBe(true);
    });

    it('should return TRUE for undefined', () => {
      expect(funcs.ISBLANK(undefined)).toBe(true);
    });

    it('should return FALSE for zero', () => {
      expect(funcs.ISBLANK(0)).toBe(false);
    });

    it('should return FALSE for non-empty string', () => {
      expect(funcs.ISBLANK('hello')).toBe(false);
      expect(funcs.ISBLANK(' ')).toBe(false); // Space is not blank
    });

    it('should return FALSE for numbers', () => {
      expect(funcs.ISBLANK(123)).toBe(false);
      expect(funcs.ISBLANK(-1)).toBe(false);
    });

    it('should return FALSE for boolean', () => {
      expect(funcs.ISBLANK(true)).toBe(false);
      expect(funcs.ISBLANK(false)).toBe(false);
    });
  });

  describe('ISERROR', () => {
    it('should return TRUE for FormulaError instances', () => {
      expect(funcs.ISERROR(new DivZeroError())).toBe(true);
      expect(funcs.ISERROR(new ValueError())).toBe(true);
      expect(funcs.ISERROR(new NotAvailableError())).toBe(true);
    });

    it('should return TRUE for error strings', () => {
      expect(funcs.ISERROR('#DIV/0!')).toBe(true);
      expect(funcs.ISERROR('#N/A')).toBe(true);
      expect(funcs.ISERROR('#NAME?')).toBe(true);
      expect(funcs.ISERROR('#NULL!')).toBe(true);
      expect(funcs.ISERROR('#NUM!')).toBe(true);
      expect(funcs.ISERROR('#REF!')).toBe(true);
      expect(funcs.ISERROR('#VALUE!')).toBe(true);
    });

    it('should be case-insensitive for error strings', () => {
      expect(funcs.ISERROR('#div/0!')).toBe(true);
      expect(funcs.ISERROR('#n/a')).toBe(true);
    });

    it('should return FALSE for regular values', () => {
      expect(funcs.ISERROR(123)).toBe(false);
      expect(funcs.ISERROR('hello')).toBe(false);
      expect(funcs.ISERROR(true)).toBe(false);
      expect(funcs.ISERROR(null)).toBe(false);
      expect(funcs.ISERROR('')).toBe(false);
    });

    it('should return FALSE for strings that look similar to errors', () => {
      expect(funcs.ISERROR('DIV/0')).toBe(false);
      expect(funcs.ISERROR('#ERROR')).toBe(false);
      expect(funcs.ISERROR('error')).toBe(false);
    });
  });

  describe('ISNUMBER', () => {
    it('should return TRUE for integers', () => {
      expect(funcs.ISNUMBER(123)).toBe(true);
      expect(funcs.ISNUMBER(0)).toBe(true);
      expect(funcs.ISNUMBER(-456)).toBe(true);
    });

    it('should return TRUE for decimals', () => {
      expect(funcs.ISNUMBER(3.14)).toBe(true);
      expect(funcs.ISNUMBER(-2.5)).toBe(true);
    });

    it('should return FALSE for NaN', () => {
      expect(funcs.ISNUMBER(NaN)).toBe(false);
    });

    it('should return FALSE for Infinity', () => {
      expect(funcs.ISNUMBER(Infinity)).toBe(false);
      expect(funcs.ISNUMBER(-Infinity)).toBe(false);
    });

    it('should return FALSE for numeric strings', () => {
      expect(funcs.ISNUMBER('123')).toBe(false);
      expect(funcs.ISNUMBER('3.14')).toBe(false);
    });

    it('should return FALSE for non-numbers', () => {
      expect(funcs.ISNUMBER('hello')).toBe(false);
      expect(funcs.ISNUMBER(true)).toBe(false);
      expect(funcs.ISNUMBER(null)).toBe(false);
      expect(funcs.ISNUMBER(undefined)).toBe(false);
    });
  });

  describe('ISTEXT', () => {
    it('should return TRUE for strings', () => {
      expect(funcs.ISTEXT('hello')).toBe(true);
      expect(funcs.ISTEXT('')).toBe(true);
      expect(funcs.ISTEXT(' ')).toBe(true);
    });

    it('should return TRUE for numeric strings', () => {
      expect(funcs.ISTEXT('123')).toBe(true);
      expect(funcs.ISTEXT('3.14')).toBe(true);
    });

    it('should return FALSE for numbers', () => {
      expect(funcs.ISTEXT(123)).toBe(false);
      expect(funcs.ISTEXT(0)).toBe(false);
      expect(funcs.ISTEXT(3.14)).toBe(false);
    });

    it('should return FALSE for booleans', () => {
      expect(funcs.ISTEXT(true)).toBe(false);
      expect(funcs.ISTEXT(false)).toBe(false);
    });

    it('should return FALSE for null and undefined', () => {
      expect(funcs.ISTEXT(null)).toBe(false);
      expect(funcs.ISTEXT(undefined)).toBe(false);
    });
  });

  // ============================================
  // MEDIUM PRIORITY INFO FUNCTION TESTS
  // ============================================

  describe('ISNA', () => {
    it('should return TRUE for #N/A string', () => {
      expect(funcs.ISNA('#N/A')).toBe(true);
      expect(funcs.ISNA('#n/a')).toBe(true);
    });

    it('should return TRUE for NotAvailableError', () => {
      expect(funcs.ISNA(new NotAvailableError())).toBe(true);
    });

    it('should return FALSE for other errors', () => {
      expect(funcs.ISNA('#DIV/0!')).toBe(false);
      expect(funcs.ISNA('#VALUE!')).toBe(false);
    });

    it('should return FALSE for regular values', () => {
      expect(funcs.ISNA(123)).toBe(false);
      expect(funcs.ISNA('hello')).toBe(false);
    });
  });

  describe('ISLOGICAL', () => {
    it('should return TRUE for boolean values', () => {
      expect(funcs.ISLOGICAL(true)).toBe(true);
      expect(funcs.ISLOGICAL(false)).toBe(true);
    });

    it('should return FALSE for non-boolean values', () => {
      expect(funcs.ISLOGICAL(1)).toBe(false);
      expect(funcs.ISLOGICAL(0)).toBe(false);
      expect(funcs.ISLOGICAL('true')).toBe(false);
    });
  });

  describe('NA', () => {
    it('should throw NotAvailableError', () => {
      expect(() => funcs.NA()).toThrow(NotAvailableError);
    });
  });

  describe('ISEVEN', () => {
    it('should return TRUE for even numbers', () => {
      expect(funcs.ISEVEN(2)).toBe(true);
      expect(funcs.ISEVEN(0)).toBe(true);
      expect(funcs.ISEVEN(-4)).toBe(true);
    });

    it('should return FALSE for odd numbers', () => {
      expect(funcs.ISEVEN(1)).toBe(false);
      expect(funcs.ISEVEN(3)).toBe(false);
      expect(funcs.ISEVEN(-5)).toBe(false);
    });

    it('should floor decimal numbers', () => {
      expect(funcs.ISEVEN(2.9)).toBe(true);
      expect(funcs.ISEVEN(3.9)).toBe(false);
    });
  });

  describe('ISODD', () => {
    it('should return TRUE for odd numbers', () => {
      expect(funcs.ISODD(1)).toBe(true);
      expect(funcs.ISODD(3)).toBe(true);
      expect(funcs.ISODD(-5)).toBe(true);
    });

    it('should return FALSE for even numbers', () => {
      expect(funcs.ISODD(2)).toBe(false);
      expect(funcs.ISODD(0)).toBe(false);
      expect(funcs.ISODD(-4)).toBe(false);
    });
  });

  describe('TYPE', () => {
    it('should return 1 for numbers', () => {
      expect(funcs.TYPE(123)).toBe(1);
      expect(funcs.TYPE(3.14)).toBe(1);
    });

    it('should return 2 for text', () => {
      expect(funcs.TYPE('hello')).toBe(2);
    });

    it('should return 4 for logical values', () => {
      expect(funcs.TYPE(true)).toBe(4);
      expect(funcs.TYPE(false)).toBe(4);
    });

    it('should return 16 for error values', () => {
      expect(funcs.TYPE('#DIV/0!')).toBe(16);
      expect(funcs.TYPE(new DivZeroError())).toBe(16);
    });

    it('should return 64 for arrays', () => {
      expect(funcs.TYPE([1, 2, 3])).toBe(64);
    });
  });
});
