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
});
