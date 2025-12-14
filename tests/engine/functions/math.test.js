import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Evaluator } from '../../../js/engine/Evaluator.js';
import { FunctionRegistry } from '../../../js/engine/FunctionRegistry.js';
import { registerFunctions } from '../../../js/engine/functions/register.js';
import { TypeCoercion } from '../../../js/engine/utils/TypeCoercion.js';
import { ValueError, NumError, DivZeroError } from '../../../js/engine/utils/FormulaErrors.js';
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
      ABS: registry.get('ABS').bind(mockEvaluator),
      CEILING: registry.get('CEILING').bind(mockEvaluator),
      FLOOR: registry.get('FLOOR').bind(mockEvaluator),
      INT: registry.get('INT').bind(mockEvaluator),
      MOD: registry.get('MOD').bind(mockEvaluator),
      POWER: registry.get('POWER').bind(mockEvaluator),
      SQRT: registry.get('SQRT').bind(mockEvaluator),
      PRODUCT: registry.get('PRODUCT').bind(mockEvaluator),
      COUNTIF: registry.get('COUNTIF').bind(mockEvaluator),
      MEDIAN: registry.get('MEDIAN').bind(mockEvaluator),
      // Medium priority
      ROUNDUP: registry.get('ROUNDUP').bind(mockEvaluator),
      ROUNDDOWN: registry.get('ROUNDDOWN').bind(mockEvaluator),
      TRUNC: registry.get('TRUNC').bind(mockEvaluator),
      SIGN: registry.get('SIGN').bind(mockEvaluator),
      RAND: registry.get('RAND').bind(mockEvaluator),
      RANDBETWEEN: registry.get('RANDBETWEEN').bind(mockEvaluator),
      COUNTBLANK: registry.get('COUNTBLANK').bind(mockEvaluator),
      AVERAGEIF: registry.get('AVERAGEIF').bind(mockEvaluator),
      MODE: registry.get('MODE').bind(mockEvaluator),
      STDEV: registry.get('STDEV').bind(mockEvaluator),
      VAR: registry.get('VAR').bind(mockEvaluator),
      // Low priority
      PI: registry.get('PI').bind(mockEvaluator),
      EXP: registry.get('EXP').bind(mockEvaluator),
      LN: registry.get('LN').bind(mockEvaluator),
      LOG: registry.get('LOG').bind(mockEvaluator),
      LOG10: registry.get('LOG10').bind(mockEvaluator),
      SIN: registry.get('SIN').bind(mockEvaluator),
      COS: registry.get('COS').bind(mockEvaluator),
      TAN: registry.get('TAN').bind(mockEvaluator),
      DEGREES: registry.get('DEGREES').bind(mockEvaluator),
      RADIANS: registry.get('RADIANS').bind(mockEvaluator),
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

  describe('ABS', () => {
    it('should return absolute value of positive numbers', () => {
      expect(funcs.ABS(5)).toBe(5);
      expect(funcs.ABS(123.45)).toBe(123.45);
    });

    it('should return absolute value of negative numbers', () => {
      expect(funcs.ABS(-5)).toBe(5);
      expect(funcs.ABS(-123.45)).toBe(123.45);
    });

    it('should return 0 for 0', () => {
      expect(funcs.ABS(0)).toBe(0);
    });

    it('should coerce strings to numbers', () => {
      expect(funcs.ABS('-10')).toBe(10);
    });
  });

  describe('CEILING', () => {
    it('should round up to nearest integer by default', () => {
      expect(funcs.CEILING(2.1)).toBe(3);
      expect(funcs.CEILING(2.9)).toBe(3);
    });

    it('should round up to specified significance', () => {
      expect(funcs.CEILING(2.5, 1)).toBe(3);
      expect(funcs.CEILING(2.1, 0.5)).toBe(2.5);
      expect(funcs.CEILING(7, 5)).toBe(10);
    });

    it('should handle negative numbers', () => {
      expect(funcs.CEILING(-2.1, 1)).toBe(-2);
      expect(funcs.CEILING(-2.9, 1)).toBe(-2);
    });

    it('should return 0 for significance of 0', () => {
      expect(funcs.CEILING(5, 0)).toBe(0);
    });
  });

  describe('FLOOR', () => {
    it('should round down to nearest integer by default', () => {
      expect(funcs.FLOOR(2.1)).toBe(2);
      expect(funcs.FLOOR(2.9)).toBe(2);
    });

    it('should round down to specified significance', () => {
      expect(funcs.FLOOR(2.5, 1)).toBe(2);
      expect(funcs.FLOOR(2.7, 0.5)).toBe(2.5);
      expect(funcs.FLOOR(7, 5)).toBe(5);
    });

    it('should handle negative numbers', () => {
      expect(funcs.FLOOR(-2.1, 1)).toBe(-3);
      expect(funcs.FLOOR(-2.9, 1)).toBe(-3);
    });

    it('should return 0 for significance of 0', () => {
      expect(funcs.FLOOR(5, 0)).toBe(0);
    });
  });

  describe('INT', () => {
    it('should round down positive numbers to integer', () => {
      expect(funcs.INT(5.7)).toBe(5);
      expect(funcs.INT(5.1)).toBe(5);
    });

    it('should round down negative numbers to integer', () => {
      expect(funcs.INT(-5.1)).toBe(-6);
      expect(funcs.INT(-5.7)).toBe(-6);
    });

    it('should return integer unchanged', () => {
      expect(funcs.INT(5)).toBe(5);
      expect(funcs.INT(-5)).toBe(-5);
    });
  });

  describe('MOD', () => {
    it('should return remainder of division', () => {
      expect(funcs.MOD(10, 3)).toBe(1);
      expect(funcs.MOD(7, 2)).toBe(1);
      expect(funcs.MOD(8, 4)).toBe(0);
    });

    it('should handle negative dividend with positive divisor', () => {
      // Excel MOD returns value with same sign as divisor
      expect(funcs.MOD(-10, 3)).toBe(2);
    });

    it('should handle positive dividend with negative divisor', () => {
      expect(funcs.MOD(10, -3)).toBe(-2);
    });

    it('should throw error for division by zero', () => {
      expect(() => funcs.MOD(10, 0)).toThrow(DivZeroError);
    });
  });

  describe('POWER', () => {
    it('should raise number to a power', () => {
      expect(funcs.POWER(2, 3)).toBe(8);
      expect(funcs.POWER(5, 2)).toBe(25);
      expect(funcs.POWER(10, 0)).toBe(1);
    });

    it('should handle negative exponents', () => {
      expect(funcs.POWER(2, -1)).toBe(0.5);
      expect(funcs.POWER(4, -0.5)).toBe(0.5);
    });

    it('should handle fractional exponents', () => {
      expect(funcs.POWER(4, 0.5)).toBe(2);
      expect(funcs.POWER(27, 1/3)).toBeCloseTo(3, 10);
    });

    it('should throw error for invalid results', () => {
      expect(() => funcs.POWER(-1, 0.5)).toThrow(NumError);
    });
  });

  describe('SQRT', () => {
    it('should return square root', () => {
      expect(funcs.SQRT(4)).toBe(2);
      expect(funcs.SQRT(9)).toBe(3);
      expect(funcs.SQRT(2)).toBeCloseTo(1.414, 3);
    });

    it('should return 0 for 0', () => {
      expect(funcs.SQRT(0)).toBe(0);
    });

    it('should throw error for negative numbers', () => {
      expect(() => funcs.SQRT(-1)).toThrow(NumError);
    });
  });

  describe('PRODUCT', () => {
    it('should multiply numbers', () => {
      expect(funcs.PRODUCT(2, 3, 4)).toBe(24);
      expect(funcs.PRODUCT(5, 10)).toBe(50);
    });

    it('should handle single number', () => {
      expect(funcs.PRODUCT(5)).toBe(5);
    });

    it('should ignore non-numeric values', () => {
      expect(funcs.PRODUCT(2, 'text', 3)).toBe(6);
    });

    it('should return 0 for no valid numbers', () => {
      expect(funcs.PRODUCT('text')).toBe(0);
    });

    it('should handle arrays', () => {
      expect(funcs.PRODUCT([2, 3], [4, 5])).toBe(120);
    });
  });

  describe('COUNTIF', () => {
    it('should count values meeting numeric criteria', () => {
      expect(funcs.COUNTIF([10, 20, 30, 40], '>20')).toBe(2);
      expect(funcs.COUNTIF([10, 20, 30, 40], '>=20')).toBe(3);
    });

    it('should count exact matches', () => {
      expect(funcs.COUNTIF([10, 20, 10, 30], 10)).toBe(2);
    });

    it('should count text matches (case-insensitive)', () => {
      expect(funcs.COUNTIF(['Apple', 'banana', 'APPLE'], 'apple')).toBe(2);
    });

    it('should handle < and <= operators', () => {
      expect(funcs.COUNTIF([10, 20, 30, 40], '<30')).toBe(2);
      expect(funcs.COUNTIF([10, 20, 30, 40], '<=30')).toBe(3);
    });

    it('should handle <> operator', () => {
      expect(funcs.COUNTIF([10, 20, 10, 30], '<>10')).toBe(2);
    });
  });

  describe('MEDIAN', () => {
    it('should find median of odd count', () => {
      expect(funcs.MEDIAN(1, 2, 3, 4, 5)).toBe(3);
      expect(funcs.MEDIAN(5, 1, 3)).toBe(3);
    });

    it('should find median of even count', () => {
      expect(funcs.MEDIAN(1, 2, 3, 4)).toBe(2.5);
      expect(funcs.MEDIAN(1, 5, 3, 7)).toBe(4);
    });

    it('should handle arrays', () => {
      expect(funcs.MEDIAN([1, 2, 3, 4, 5])).toBe(3);
    });

    it('should ignore non-numeric values', () => {
      expect(funcs.MEDIAN(1, 'text', 3, 5)).toBe(3);
    });

    it('should throw error for no valid numbers', () => {
      expect(() => funcs.MEDIAN('text')).toThrow(NumError);
    });
  });

  // ============================================
  // MEDIUM PRIORITY MATH FUNCTION TESTS
  // ============================================

  describe('ROUNDUP', () => {
    it('should round up positive numbers', () => {
      expect(funcs.ROUNDUP(3.2, 0)).toBe(4);
      expect(funcs.ROUNDUP(3.14159, 2)).toBe(3.15);
    });

    it('should round up negative numbers (away from zero)', () => {
      expect(funcs.ROUNDUP(-3.2, 0)).toBe(-4);
    });

    it('should handle negative num_digits', () => {
      expect(funcs.ROUNDUP(123, -1)).toBe(130);
      expect(funcs.ROUNDUP(123, -2)).toBe(200);
    });
  });

  describe('ROUNDDOWN', () => {
    it('should round down positive numbers', () => {
      expect(funcs.ROUNDDOWN(3.9, 0)).toBe(3);
      expect(funcs.ROUNDDOWN(3.14159, 2)).toBe(3.14);
    });

    it('should round down negative numbers (toward zero)', () => {
      expect(funcs.ROUNDDOWN(-3.9, 0)).toBe(-3);
    });

    it('should handle negative num_digits', () => {
      expect(funcs.ROUNDDOWN(129, -1)).toBe(120);
    });
  });

  describe('TRUNC', () => {
    it('should truncate to integer by default', () => {
      expect(funcs.TRUNC(3.9)).toBe(3);
      expect(funcs.TRUNC(-3.9)).toBe(-3);
    });

    it('should truncate to specified decimal places', () => {
      expect(funcs.TRUNC(3.14159, 2)).toBe(3.14);
    });
  });

  describe('SIGN', () => {
    it('should return 1 for positive numbers', () => {
      expect(funcs.SIGN(5)).toBe(1);
      expect(funcs.SIGN(0.1)).toBe(1);
    });

    it('should return -1 for negative numbers', () => {
      expect(funcs.SIGN(-5)).toBe(-1);
      expect(funcs.SIGN(-0.1)).toBe(-1);
    });

    it('should return 0 for zero', () => {
      expect(funcs.SIGN(0)).toBe(0);
    });
  });

  describe('RAND', () => {
    it('should return a number between 0 and 1', () => {
      const result = funcs.RAND();
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(1);
    });
  });

  describe('RANDBETWEEN', () => {
    it('should return an integer within the range', () => {
      const result = funcs.RANDBETWEEN(1, 10);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(10);
      expect(Number.isInteger(result)).toBe(true);
    });

    it('should handle equal bottom and top', () => {
      expect(funcs.RANDBETWEEN(5, 5)).toBe(5);
    });

    it('should throw error if bottom > top', () => {
      expect(() => funcs.RANDBETWEEN(10, 1)).toThrow(NumError);
    });
  });

  describe('COUNTBLANK', () => {
    it('should count empty cells', () => {
      expect(funcs.COUNTBLANK(['', null, undefined, 'text', 0])).toBe(3);
    });

    it('should not count zero as blank', () => {
      expect(funcs.COUNTBLANK([0, '', 1])).toBe(1);
    });

    it('should handle nested arrays', () => {
      expect(funcs.COUNTBLANK([['', 1], [null, 2]])).toBe(2);
    });
  });

  describe('AVERAGEIF', () => {
    it('should average values meeting criteria', () => {
      expect(funcs.AVERAGEIF([10, 20, 30, 40], '>20')).toBe(35);
    });

    it('should use separate sum range', () => {
      expect(funcs.AVERAGEIF(['A', 'B', 'A', 'B'], 'A', [10, 20, 30, 40])).toBe(20);
    });

    it('should throw error when no values match', () => {
      expect(() => funcs.AVERAGEIF([10, 20], '>100')).toThrow(DivZeroError);
    });
  });

  describe('MODE', () => {
    it('should return most frequent value', () => {
      expect(funcs.MODE(1, 2, 2, 3, 3, 3)).toBe(3);
    });

    it('should return first mode when multiple exist', () => {
      expect(funcs.MODE(1, 1, 2, 2)).toBe(1);
    });

    it('should handle arrays', () => {
      expect(funcs.MODE([1, 2, 2, 3])).toBe(2);
    });
  });

  describe('STDEV', () => {
    it('should calculate sample standard deviation', () => {
      expect(funcs.STDEV(2, 4, 4, 4, 5, 5, 7, 9)).toBeCloseTo(2.138, 3);
    });

    it('should handle arrays', () => {
      expect(funcs.STDEV([1, 2, 3, 4, 5])).toBeCloseTo(1.5811, 3);
    });
  });

  describe('VAR', () => {
    it('should calculate sample variance', () => {
      expect(funcs.VAR(2, 4, 4, 4, 5, 5, 7, 9)).toBeCloseTo(4.571, 3);
    });

    it('should handle arrays', () => {
      expect(funcs.VAR([1, 2, 3, 4, 5])).toBeCloseTo(2.5, 3);
    });
  });

  // ============================================
  // LOW PRIORITY MATH FUNCTION TESTS
  // ============================================

  describe('PI', () => {
    it('should return PI', () => {
      expect(funcs.PI()).toBeCloseTo(3.14159265, 8);
    });
  });

  describe('EXP', () => {
    it('should return e raised to a power', () => {
      expect(funcs.EXP(0)).toBe(1);
      expect(funcs.EXP(1)).toBeCloseTo(2.71828, 4);
      expect(funcs.EXP(2)).toBeCloseTo(7.389, 3);
    });
  });

  describe('LN', () => {
    it('should return natural logarithm', () => {
      expect(funcs.LN(1)).toBe(0);
      expect(funcs.LN(Math.E)).toBeCloseTo(1, 10);
    });

    it('should throw error for non-positive numbers', () => {
      expect(() => funcs.LN(0)).toThrow(NumError);
      expect(() => funcs.LN(-1)).toThrow(NumError);
    });
  });

  describe('LOG', () => {
    it('should return logarithm with base 10 by default', () => {
      expect(funcs.LOG(100)).toBeCloseTo(2, 10);
      expect(funcs.LOG(1000)).toBeCloseTo(3, 10);
    });

    it('should support custom base', () => {
      expect(funcs.LOG(8, 2)).toBeCloseTo(3, 10);
      expect(funcs.LOG(27, 3)).toBeCloseTo(3, 10);
    });
  });

  describe('LOG10', () => {
    it('should return base 10 logarithm', () => {
      expect(funcs.LOG10(100)).toBeCloseTo(2, 10);
      expect(funcs.LOG10(1)).toBe(0);
    });
  });

  describe('SIN', () => {
    it('should return sine of angle in radians', () => {
      expect(funcs.SIN(0)).toBe(0);
      expect(funcs.SIN(Math.PI / 2)).toBeCloseTo(1, 10);
      expect(funcs.SIN(Math.PI)).toBeCloseTo(0, 10);
    });
  });

  describe('COS', () => {
    it('should return cosine of angle in radians', () => {
      expect(funcs.COS(0)).toBe(1);
      expect(funcs.COS(Math.PI / 2)).toBeCloseTo(0, 10);
      expect(funcs.COS(Math.PI)).toBeCloseTo(-1, 10);
    });
  });

  describe('TAN', () => {
    it('should return tangent of angle in radians', () => {
      expect(funcs.TAN(0)).toBe(0);
      expect(funcs.TAN(Math.PI / 4)).toBeCloseTo(1, 10);
    });
  });

  describe('DEGREES', () => {
    it('should convert radians to degrees', () => {
      expect(funcs.DEGREES(Math.PI)).toBeCloseTo(180, 10);
      expect(funcs.DEGREES(Math.PI / 2)).toBeCloseTo(90, 10);
    });
  });

  describe('RADIANS', () => {
    it('should convert degrees to radians', () => {
      expect(funcs.RADIANS(180)).toBeCloseTo(Math.PI, 10);
      expect(funcs.RADIANS(90)).toBeCloseTo(Math.PI / 2, 10);
    });
  });
});
