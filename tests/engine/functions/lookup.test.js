import { describe, it, expect, beforeEach } from 'vitest';
import { FunctionRegistry } from '../../../js/engine/FunctionRegistry.js';
import { registerFunctions } from '../../../js/engine/functions/register.js';
import { TypeCoercion } from '../../../js/engine/utils/TypeCoercion.js';
import { NotAvailableError, RefError, ValueError } from '../../../js/engine/utils/FormulaErrors.js';
import { lookupFunctions } from '../../../js/engine/functions/lookup.js';

describe('Lookup Functions', () => {
  let funcs;
  let mockEvaluator;

  beforeEach(() => {
    const registry = new FunctionRegistry();
    registerFunctions(registry);

    // Mock the evaluator context
    mockEvaluator = {
      coerce: TypeCoercion,
      _areValuesEqual: lookupFunctions._areValuesEqual,
    };

    // Bind lookup functions to the mock context
    funcs = {
      VLOOKUP: registry.get('VLOOKUP').bind(mockEvaluator),
      HLOOKUP: registry.get('HLOOKUP').bind(mockEvaluator),
      INDEX: registry.get('INDEX').bind(mockEvaluator),
      MATCH: registry.get('MATCH').bind(mockEvaluator),
      // Medium priority
      ROW: registry.get('ROW').bind(mockEvaluator),
      COLUMN: registry.get('COLUMN').bind(mockEvaluator),
      ROWS: registry.get('ROWS').bind(mockEvaluator),
      COLUMNS: registry.get('COLUMNS').bind(mockEvaluator),
    };
  });

  describe('VLOOKUP', () => {
    it('should find exact match in 2D array', () => {
      const range = [
        ['Apple', 10, 'Red'],
        ['Banana', 20, 'Yellow'],
        ['Cherry', 30, 'Red'],
      ];
      expect(funcs.VLOOKUP('Banana', range, 2, false)).toBe(20);
      expect(funcs.VLOOKUP('Cherry', range, 3, false)).toBe('Red');
    });

    it('should be case-insensitive for string matching', () => {
      const range = [
        ['Apple', 10],
        ['Banana', 20],
      ];
      expect(funcs.VLOOKUP('apple', range, 2, false)).toBe(10);
      expect(funcs.VLOOKUP('BANANA', range, 2, false)).toBe(20);
    });

    it('should handle numeric search keys', () => {
      const range = [
        [1, 'One'],
        [2, 'Two'],
        [3, 'Three'],
      ];
      expect(funcs.VLOOKUP(2, range, 2, false)).toBe('Two');
    });

    it('should handle first column (index 1)', () => {
      const range = [
        ['Apple', 10],
        ['Banana', 20],
      ];
      expect(funcs.VLOOKUP('Apple', range, 1, false)).toBe('Apple');
    });

    it('should throw #N/A when value not found', () => {
      const range = [
        ['Apple', 10],
        ['Banana', 20],
      ];
      expect(() => funcs.VLOOKUP('Orange', range, 2, false)).toThrow(NotAvailableError);
    });

    it('should throw #REF! when column index is out of range', () => {
      const range = [
        ['Apple', 10],
        ['Banana', 20],
      ];
      expect(() => funcs.VLOOKUP('Apple', range, 3, false)).toThrow(RefError);
      expect(() => funcs.VLOOKUP('Apple', range, 0, false)).toThrow(RefError);
    });

    it('should throw #VALUE! when range_lookup is TRUE', () => {
      const range = [['Apple', 10]];
      expect(() => funcs.VLOOKUP('Apple', range, 2, true)).toThrow(ValueError);
    });

    it('should handle 1D array (convert to single column)', () => {
      const range = ['Apple', 'Banana', 'Cherry'];
      expect(funcs.VLOOKUP('Banana', range, 1, false)).toBe('Banana');
    });

    it('should handle empty cells in range', () => {
      const range = [
        ['Apple', 10],
        ['', 20],
        ['Cherry', 30],
      ];
      expect(funcs.VLOOKUP('', range, 2, false)).toBe(20);
    });

    it('should handle mixed numeric and string searches', () => {
      const range = [
        [1, 'One'],
        ['2', 'Two'],
        [3, 'Three'],
      ];
      // Should find numeric 1 or string "1"
      expect(funcs.VLOOKUP(1, range, 2, false)).toBe('One');
      expect(funcs.VLOOKUP(2, range, 2, false)).toBe('Two'); // Matches "2"
    });

    it('should return first match when duplicates exist', () => {
      const range = [
        ['Apple', 10],
        ['Banana', 20],
        ['Apple', 30],
      ];
      expect(funcs.VLOOKUP('Apple', range, 2, false)).toBe(10);
    });

    it('should handle large ranges', () => {
      const range = Array.from({ length: 100 }, (_, i) => [`Item${i}`, i * 10]);
      expect(funcs.VLOOKUP('Item50', range, 2, false)).toBe(500);
    });

    it('should throw #REF! for invalid range structure', () => {
      expect(() => funcs.VLOOKUP('test', [], 1, false)).toThrow(RefError);
    });

    it('should handle default range_lookup parameter (FALSE)', () => {
      const range = [['Apple', 10]];
      expect(funcs.VLOOKUP('Apple', range, 2)).toBe(10);
    });
  });

  describe('HLOOKUP', () => {
    it('should find exact match in 2D array', () => {
      const range = [
        ['Apple', 'Banana', 'Cherry'],
        [10, 20, 30],
        ['Red', 'Yellow', 'Red'],
      ];
      expect(funcs.HLOOKUP('Banana', range, 2, false)).toBe(20);
      expect(funcs.HLOOKUP('Cherry', range, 3, false)).toBe('Red');
    });

    it('should be case-insensitive for string matching', () => {
      const range = [
        ['Apple', 'Banana'],
        [10, 20],
      ];
      expect(funcs.HLOOKUP('apple', range, 2, false)).toBe(10);
      expect(funcs.HLOOKUP('BANANA', range, 2, false)).toBe(20);
    });

    it('should handle numeric search keys', () => {
      const range = [
        [1, 2, 3],
        ['One', 'Two', 'Three'],
      ];
      expect(funcs.HLOOKUP(2, range, 2, false)).toBe('Two');
    });

    it('should throw #N/A when value not found', () => {
      const range = [
        ['Apple', 'Banana'],
        [10, 20],
      ];
      expect(() => funcs.HLOOKUP('Orange', range, 2, false)).toThrow(NotAvailableError);
    });

    it('should throw #REF! when row index is out of range', () => {
      const range = [
        ['Apple', 'Banana'],
        [10, 20],
      ];
      expect(() => funcs.HLOOKUP('Apple', range, 3, false)).toThrow(RefError);
      expect(() => funcs.HLOOKUP('Apple', range, 0, false)).toThrow(RefError);
    });

    it('should handle 1D array (treat as single row)', () => {
      const range = ['Apple', 'Banana', 'Cherry'];
      expect(funcs.HLOOKUP('Banana', range, 1, false)).toBe('Banana');
    });
  });

  describe('INDEX', () => {
    it('should return value at row and column', () => {
      const array = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ];
      expect(funcs.INDEX(array, 2, 3)).toBe(6);
      expect(funcs.INDEX(array, 1, 1)).toBe(1);
      expect(funcs.INDEX(array, 3, 2)).toBe(8);
    });

    it('should return entire row when col_num is 0', () => {
      const array = [
        [1, 2, 3],
        [4, 5, 6],
      ];
      expect(funcs.INDEX(array, 2, 0)).toEqual([4, 5, 6]);
    });

    it('should return entire column when row_num is 0', () => {
      const array = [
        [1, 2, 3],
        [4, 5, 6],
      ];
      expect(funcs.INDEX(array, 0, 2)).toEqual([2, 5]);
    });

    it('should handle 1D array', () => {
      const array = [10, 20, 30, 40];
      expect(funcs.INDEX(array, 2)).toBe(20);
      expect(funcs.INDEX(array, 4)).toBe(40);
    });

    it('should throw #REF! for invalid row', () => {
      const array = [[1, 2], [3, 4]];
      expect(() => funcs.INDEX(array, 5, 1)).toThrow(RefError);
      expect(() => funcs.INDEX(array, -1, 1)).toThrow(RefError);
    });

    it('should throw #REF! for invalid column', () => {
      const array = [[1, 2], [3, 4]];
      expect(() => funcs.INDEX(array, 1, 5)).toThrow(RefError);
    });

    it('should handle single value', () => {
      expect(funcs.INDEX(42, 1)).toBe(42);
    });
  });

  describe('MATCH', () => {
    it('should find exact match (match_type 0)', () => {
      const array = ['Apple', 'Banana', 'Cherry'];
      expect(funcs.MATCH('Banana', array, 0)).toBe(2);
      expect(funcs.MATCH('Apple', array, 0)).toBe(1);
    });

    it('should be case-insensitive for exact match', () => {
      const array = ['Apple', 'Banana', 'Cherry'];
      expect(funcs.MATCH('banana', array, 0)).toBe(2);
      expect(funcs.MATCH('CHERRY', array, 0)).toBe(3);
    });

    it('should find largest value <= lookup (match_type 1)', () => {
      const array = [10, 20, 30, 40];
      expect(funcs.MATCH(25, array, 1)).toBe(2); // 20 is largest <= 25
      expect(funcs.MATCH(30, array, 1)).toBe(3);
      expect(funcs.MATCH(50, array, 1)).toBe(4);
    });

    it('should find smallest value >= lookup (match_type -1)', () => {
      const array = [40, 30, 20, 10];
      expect(funcs.MATCH(25, array, -1)).toBe(2); // 30 is smallest >= 25
      expect(funcs.MATCH(30, array, -1)).toBe(2);
    });

    it('should throw #N/A for no exact match', () => {
      const array = ['Apple', 'Banana'];
      expect(() => funcs.MATCH('Orange', array, 0)).toThrow(NotAvailableError);
    });

    it('should throw #N/A for no match in sorted array', () => {
      const array = [10, 20, 30];
      expect(() => funcs.MATCH(5, array, 1)).toThrow(NotAvailableError);
    });

    it('should handle nested arrays', () => {
      const array = [[10], [20], [30]];
      expect(funcs.MATCH(20, array, 0)).toBe(2);
    });

    it('should default to match_type 1', () => {
      const array = [10, 20, 30];
      expect(funcs.MATCH(25, array)).toBe(2);
    });

    it('should throw error for invalid match_type', () => {
      expect(() => funcs.MATCH(1, [1, 2], 2)).toThrow(ValueError);
    });
  });

  // ============================================
  // MEDIUM PRIORITY LOOKUP FUNCTION TESTS
  // ============================================

  describe('ROW', () => {
    it('should return 1 for no argument', () => {
      expect(funcs.ROW()).toBe(1);
    });

    it('should return row numbers for array', () => {
      expect(funcs.ROW([[1, 2], [3, 4], [5, 6]])).toEqual([1, 2, 3]);
    });

    it('should return 1 for single value', () => {
      expect(funcs.ROW(42)).toBe(1);
    });
  });

  describe('COLUMN', () => {
    it('should return 1 for no argument', () => {
      expect(funcs.COLUMN()).toBe(1);
    });

    it('should return column numbers for 2D array', () => {
      expect(funcs.COLUMN([[1, 2, 3], [4, 5, 6]])).toEqual([1, 2, 3]);
    });

    it('should return 1 for single value', () => {
      expect(funcs.COLUMN(42)).toBe(1);
    });
  });

  describe('ROWS', () => {
    it('should return number of rows in 2D array', () => {
      expect(funcs.ROWS([[1, 2], [3, 4], [5, 6]])).toBe(3);
    });

    it('should return length for 1D array', () => {
      expect(funcs.ROWS([1, 2, 3, 4])).toBe(4);
    });

    it('should return 1 for single value', () => {
      expect(funcs.ROWS(42)).toBe(1);
    });
  });

  describe('COLUMNS', () => {
    it('should return number of columns in 2D array', () => {
      expect(funcs.COLUMNS([[1, 2, 3], [4, 5, 6]])).toBe(3);
    });

    it('should return length for 1D array', () => {
      expect(funcs.COLUMNS([1, 2, 3, 4])).toBe(4);
    });

    it('should return 1 for single value', () => {
      expect(funcs.COLUMNS(42)).toBe(1);
    });
  });
});
