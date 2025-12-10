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
});
