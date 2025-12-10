import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Evaluator } from '../../../js/engine/Evaluator.js';
import { FunctionRegistry } from '../../../js/engine/FunctionRegistry.js';
import { registerFunctions } from '../../../js/engine/functions/register.js';
import { TypeCoercion } from '../../../js/engine/utils/TypeCoercion.js';
import { ValueError } from '../../../js/engine/utils/FormulaErrors.js';
import { mathFunctions } from '../../../js/engine/functions/math.js';

describe('Math Functions', () => {
  let funcs;
  let mockEvaluator;

  beforeEach(() => {
    const registry = new FunctionRegistry();
    registerFunctions(registry);

    // Mock the evaluator context
    mockEvaluator = {
      coerce: TypeCoercion,
      getCellValue: vi.fn(),
      getRangeValues: vi.fn(),
      _parseCriteria: mathFunctions._parseCriteria,
    };

    // Bind all math functions to the mock context
    funcs = {
      SUM: registry.get('SUM').bind(mockEvaluator),
      AVERAGE: registry.get('AVERAGE').bind(mockEvaluator),
      MIN: registry.get('MIN').bind(mockEvaluator),
      MAX: registry.get('MAX').bind(mockEvaluator),
      COUNT: registry.get('COUNT').bind(mockEvaluator),
      COUNTA: registry.get('COUNTA').bind(mockEvaluator),
      ROUND: registry.get('ROUND').bind(mockEvaluator),
      SUMIF: registry.get('SUMIF').bind(mockEvaluator),
      SUMPRODUCT: registry.get('SUMPRODUCT').bind(mockEvaluator),
    };
  });

  describe('SUM', () => {
    it('should add numbers', () => {
      expect(funcs.SUM(1, 2, 3)).toBe(6);
    });

    it('should coerce non-numeric values', () => {
      // true = 1, "hello" = 0, false = 0
      expect(funcs.SUM(5, true, 'hello', false)).toBe(6);
    });

    it('should handle nested arrays (from ranges)', () => {
      expect(funcs.SUM(1, [2, [3, 'ignore']], 4)).toBe(10);
    });
  });

  describe('AVERAGE', () => {
    it('should calculate average of numbers', () => {
      expect(funcs.AVERAGE(1, 2, 3, 4)).toBe(2.5);
      expect(funcs.AVERAGE(10, 20, 30)).toBe(20);
    });

    it('should ignore non-numeric values', () => {
      expect(funcs.AVERAGE(1, 2, 'text', 3)).toBe(2);
    });

    it('should handle nested arrays', () => {
      expect(funcs.AVERAGE([1, 2], [3, 4])).toBe(2.5);
    });

    it('should return 0 for no valid numbers', () => {
      expect(funcs.AVERAGE('text', 'more text')).toBe(0);
    });
  });

  describe('MIN', () => {
    it('should find minimum value', () => {
      expect(funcs.MIN(5, 2, 8, 1, 9)).toBe(1);
      expect(funcs.MIN(10, 20, 5)).toBe(5);
    });

    it('should handle negative numbers', () => {
      expect(funcs.MIN(-5, 0, 5)).toBe(-5);
    });

    it('should ignore non-numeric values', () => {
      expect(funcs.MIN(5, 'text', 2, 8)).toBe(2);
    });

    it('should return 0 for no valid numbers', () => {
      expect(funcs.MIN('text')).toBe(0);
    });
  });

  describe('MAX', () => {
    it('should find maximum value', () => {
      expect(funcs.MAX(5, 2, 8, 1, 9)).toBe(9);
      expect(funcs.MAX(10, 20, 5)).toBe(20);
    });

    it('should handle negative numbers', () => {
      expect(funcs.MAX(-5, -10, -2)).toBe(-2);
    });

    it('should ignore non-numeric values', () => {
      expect(funcs.MAX(5, 'text', 10, 8)).toBe(10);
    });

    it('should return 0 for no valid numbers', () => {
      expect(funcs.MAX('text')).toBe(0);
    });
  });

  describe('COUNT', () => {
    it('should count numeric values', () => {
      expect(funcs.COUNT(1, 2, 3)).toBe(3);
      expect(funcs.COUNT(1, 'text', 2, 'more', 3)).toBe(3);
    });

    it('should count numeric strings', () => {
      expect(funcs.COUNT('123', '456')).toBe(2);
    });

    it('should not count text', () => {
      expect(funcs.COUNT('hello', 'world')).toBe(0);
    });

    it('should not count empty strings', () => {
      expect(funcs.COUNT('', '', 1)).toBe(1);
    });

    it('should handle arrays', () => {
      expect(funcs.COUNT([1, 2], ['text', 3])).toBe(3);
    });
  });

  describe('COUNTA', () => {
    it('should count non-empty values', () => {
      expect(funcs.COUNTA(1, 2, 'text', true)).toBe(4);
    });

    it('should not count empty strings', () => {
      expect(funcs.COUNTA('', 1, '', 2)).toBe(2);
    });

    it('should not count null or undefined', () => {
      expect(funcs.COUNTA(null, undefined, 1, 2)).toBe(2);
    });

    it('should count zeros', () => {
      expect(funcs.COUNTA(0, 1, 2)).toBe(3);
    });

    it('should handle arrays', () => {
      expect(funcs.COUNTA([1, 'text'], [null, 2, ''])).toBe(3);
    });
  });

  describe('ROUND', () => {
    it('should round to specified decimal places', () => {
      expect(funcs.ROUND(3.14159, 2)).toBe(3.14);
      expect(funcs.ROUND(3.14159, 3)).toBe(3.142);
    });

    it('should round to integer when num_digits is 0', () => {
      expect(funcs.ROUND(3.7)).toBe(4);
      expect(funcs.ROUND(3.4)).toBe(3);
    });

    it('should handle negative num_digits', () => {
      expect(funcs.ROUND(123.456, -1)).toBe(120);
      expect(funcs.ROUND(123.456, -2)).toBe(100);
    });

    it('should handle negative numbers', () => {
      expect(funcs.ROUND(-3.7, 0)).toBe(-4);
      expect(funcs.ROUND(-3.4, 0)).toBe(-3);
    });

    it('should throw error for invalid number', () => {
      expect(() => funcs.ROUND('not a number', 2)).toThrow(ValueError);
    });
  });

  describe('SUMIF', () => {
    it('should sum values meeting numeric criteria (2-arg form)', () => {
      expect(funcs.SUMIF([10, 20, 30, 40], '>20')).toBe(70);
      expect(funcs.SUMIF([10, 20, 30, 40], '>=20')).toBe(90);
    });

    it('should sum values meeting exact match criteria', () => {
      expect(funcs.SUMIF([10, 20, 10, 30], 10)).toBe(20);
      expect(funcs.SUMIF(['apple', 'banana', 'apple'], 'apple')).toBe(0);
    });

    it('should sum values with 3-arg form', () => {
      expect(funcs.SUMIF(['A', 'B', 'A', 'C'], 'A', [10, 20, 30, 40])).toBe(40);
    });

    it('should handle < and <= operators', () => {
      expect(funcs.SUMIF([10, 20, 30, 40], '<30')).toBe(30);
      expect(funcs.SUMIF([10, 20, 30, 40], '<=30')).toBe(60);
    });

    it('should handle <> (not equal) operator', () => {
      expect(funcs.SUMIF([10, 20, 10, 30], '<>10')).toBe(50);
    });

    it('should handle text criteria', () => {
      expect(funcs.SUMIF(['A', 'B', 'A', 'B'], 'A', [10, 20, 30, 40])).toBe(40);
    });

    it('should throw error if ranges are different sizes', () => {
      expect(() => funcs.SUMIF([1, 2], '>', [1, 2, 3])).toThrow(ValueError);
    });

    it('should handle case-insensitive text matching', () => {
      expect(funcs.SUMIF(['Apple', 'banana', 'APPLE'], 'apple', [10, 20, 30])).toBe(40);
    });
  });

  describe('SUMPRODUCT', () => {
    it('should calculate sum of products for two arrays', () => {
      expect(funcs.SUMPRODUCT([1, 2, 3], [4, 5, 6])).toBe(32); // 1*4 + 2*5 + 3*6
    });

    it('should handle three or more arrays', () => {
      expect(funcs.SUMPRODUCT([2, 3], [4, 5], [6, 7])).toBe(153); // 2*4*6 + 3*5*7
    });

    it('should handle single values', () => {
      expect(funcs.SUMPRODUCT([5], [10])).toBe(50);
    });

    it('should coerce non-numeric values to numbers', () => {
      expect(funcs.SUMPRODUCT([1, 2], ['3', 4])).toBe(11); // 1*3 + 2*4
    });

    it('should throw error if arrays are different sizes', () => {
      expect(() => funcs.SUMPRODUCT([1, 2], [1, 2, 3])).toThrow(ValueError);
    });

    it('should handle nested arrays (2D ranges)', () => {
      expect(funcs.SUMPRODUCT([[1, 2], [3, 4]], [[5, 6], [7, 8]])).toBe(70);
      // 1*5 + 2*6 + 3*7 + 4*8 = 5 + 12 + 21 + 32 = 70
    });

    it('should return 0 for empty arrays', () => {
      expect(funcs.SUMPRODUCT()).toBe(0);
    });
  });
});
