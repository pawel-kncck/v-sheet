import { describe, it, expect, beforeEach } from 'vitest';
import { FunctionRegistry } from '../../../js/engine/FunctionRegistry.js';
import { registerFunctions } from '../../../js/engine/functions/register.js';
import { TypeCoercion } from '../../../js/engine/utils/TypeCoercion.js';
import { ValueError } from '../../../js/engine/utils/FormulaErrors.js';

describe('Text Functions', () => {
  let funcs;
  let mockEvaluator;

  beforeEach(() => {
    const registry = new FunctionRegistry();
    registerFunctions(registry);

    // Mock the evaluator context
    mockEvaluator = {
      coerce: TypeCoercion,
    };

    // Bind all text functions to the mock context
    funcs = {
      LEN: registry.get('LEN').bind(mockEvaluator),
      UPPER: registry.get('UPPER').bind(mockEvaluator),
      LOWER: registry.get('LOWER').bind(mockEvaluator),
      TRIM: registry.get('TRIM').bind(mockEvaluator),
      CONCATENATE: registry.get('CONCATENATE').bind(mockEvaluator),
      LEFT: registry.get('LEFT').bind(mockEvaluator),
      RIGHT: registry.get('RIGHT').bind(mockEvaluator),
      MID: registry.get('MID').bind(mockEvaluator),
    };
  });

  describe('LEN', () => {
    it('should return the length of a text string', () => {
      expect(funcs.LEN('hello')).toBe(5);
      expect(funcs.LEN('world')).toBe(5);
      expect(funcs.LEN('a')).toBe(1);
    });

    it('should handle empty strings', () => {
      expect(funcs.LEN('')).toBe(0);
    });

    it('should coerce numbers to strings', () => {
      expect(funcs.LEN(123)).toBe(3);
      expect(funcs.LEN(12.34)).toBe(5);
    });

    it('should handle booleans', () => {
      expect(funcs.LEN(true)).toBe(4); // "TRUE"
      expect(funcs.LEN(false)).toBe(5); // "FALSE"
    });

    it('should handle spaces', () => {
      expect(funcs.LEN('  hello  ')).toBe(9);
    });
  });

  describe('UPPER', () => {
    it('should convert text to uppercase', () => {
      expect(funcs.UPPER('hello')).toBe('HELLO');
      expect(funcs.UPPER('World')).toBe('WORLD');
      expect(funcs.UPPER('abc123')).toBe('ABC123');
    });

    it('should handle already uppercase text', () => {
      expect(funcs.UPPER('HELLO')).toBe('HELLO');
    });

    it('should handle empty strings', () => {
      expect(funcs.UPPER('')).toBe('');
    });

    it('should coerce numbers to strings', () => {
      expect(funcs.UPPER(123)).toBe('123');
    });

    it('should handle mixed case', () => {
      expect(funcs.UPPER('HeLLo WoRLd')).toBe('HELLO WORLD');
    });
  });

  describe('LOWER', () => {
    it('should convert text to lowercase', () => {
      expect(funcs.LOWER('HELLO')).toBe('hello');
      expect(funcs.LOWER('World')).toBe('world');
      expect(funcs.LOWER('ABC123')).toBe('abc123');
    });

    it('should handle already lowercase text', () => {
      expect(funcs.LOWER('hello')).toBe('hello');
    });

    it('should handle empty strings', () => {
      expect(funcs.LOWER('')).toBe('');
    });

    it('should handle mixed case', () => {
      expect(funcs.LOWER('HeLLo WoRLd')).toBe('hello world');
    });
  });

  describe('TRIM', () => {
    it('should remove leading and trailing spaces', () => {
      expect(funcs.TRIM('  hello  ')).toBe('hello');
      expect(funcs.TRIM('   world')).toBe('world');
      expect(funcs.TRIM('test   ')).toBe('test');
    });

    it('should reduce multiple internal spaces to one', () => {
      expect(funcs.TRIM('hello    world')).toBe('hello world');
      expect(funcs.TRIM('a  b  c')).toBe('a b c');
    });

    it('should handle both leading/trailing and internal spaces', () => {
      expect(funcs.TRIM('  hello    world  ')).toBe('hello world');
    });

    it('should handle strings with no extra spaces', () => {
      expect(funcs.TRIM('hello')).toBe('hello');
      expect(funcs.TRIM('hello world')).toBe('hello world');
    });

    it('should handle empty strings', () => {
      expect(funcs.TRIM('')).toBe('');
    });
  });

  describe('CONCATENATE', () => {
    it('should join multiple strings', () => {
      expect(funcs.CONCATENATE('hello', ' ', 'world')).toBe('hello world');
      expect(funcs.CONCATENATE('a', 'b', 'c')).toBe('abc');
    });

    it('should handle single argument', () => {
      expect(funcs.CONCATENATE('hello')).toBe('hello');
    });

    it('should handle empty strings', () => {
      expect(funcs.CONCATENATE('hello', '', 'world')).toBe('helloworld');
    });

    it('should coerce numbers to strings', () => {
      expect(funcs.CONCATENATE('Value: ', 123)).toBe('Value: 123');
      expect(funcs.CONCATENATE(1, 2, 3)).toBe('123');
    });

    it('should handle booleans', () => {
      expect(funcs.CONCATENATE('Result: ', true)).toBe('Result: TRUE');
    });

    it('should handle arrays (from ranges)', () => {
      expect(funcs.CONCATENATE('a', ['b', 'c'], 'd')).toBe('abcd');
    });
  });

  describe('LEFT', () => {
    it('should extract leftmost characters', () => {
      expect(funcs.LEFT('hello', 3)).toBe('hel');
      expect(funcs.LEFT('world', 2)).toBe('wo');
    });

    it('should handle default num_chars (1)', () => {
      expect(funcs.LEFT('hello')).toBe('h');
    });

    it('should handle num_chars larger than string length', () => {
      expect(funcs.LEFT('hi', 10)).toBe('hi');
    });

    it('should handle num_chars of 0', () => {
      expect(funcs.LEFT('hello', 0)).toBe('');
    });

    it('should handle empty strings', () => {
      expect(funcs.LEFT('', 5)).toBe('');
    });

    it('should throw error for negative num_chars', () => {
      expect(() => funcs.LEFT('hello', -1)).toThrow(ValueError);
    });

    it('should coerce num_chars to number', () => {
      expect(funcs.LEFT('hello', '3')).toBe('hel');
    });

    it('should handle decimal num_chars (floor)', () => {
      expect(funcs.LEFT('hello', 2.9)).toBe('he');
    });
  });

  describe('RIGHT', () => {
    it('should extract rightmost characters', () => {
      expect(funcs.RIGHT('hello', 3)).toBe('llo');
      expect(funcs.RIGHT('world', 2)).toBe('ld');
    });

    it('should handle default num_chars (1)', () => {
      expect(funcs.RIGHT('hello')).toBe('o');
    });

    it('should handle num_chars larger than string length', () => {
      expect(funcs.RIGHT('hi', 10)).toBe('hi');
    });

    it('should handle num_chars of 0', () => {
      expect(funcs.RIGHT('hello', 0)).toBe('');
    });

    it('should handle empty strings', () => {
      expect(funcs.RIGHT('', 5)).toBe('');
    });

    it('should throw error for negative num_chars', () => {
      expect(() => funcs.RIGHT('hello', -1)).toThrow(ValueError);
    });

    it('should handle decimal num_chars (floor)', () => {
      expect(funcs.RIGHT('hello', 2.9)).toBe('lo');
    });
  });

  describe('MID', () => {
    it('should extract characters from middle', () => {
      expect(funcs.MID('hello', 2, 3)).toBe('ell');
      expect(funcs.MID('world', 3, 2)).toBe('rl');
    });

    it('should handle start_num at beginning (1)', () => {
      expect(funcs.MID('hello', 1, 3)).toBe('hel');
    });

    it('should handle num_chars beyond string length', () => {
      expect(funcs.MID('hello', 3, 10)).toBe('llo');
    });

    it('should handle num_chars of 0', () => {
      expect(funcs.MID('hello', 2, 0)).toBe('');
    });

    it('should handle start_num beyond string length', () => {
      expect(funcs.MID('hello', 10, 3)).toBe('');
    });

    it('should throw error for start_num < 1', () => {
      expect(() => funcs.MID('hello', 0, 3)).toThrow(ValueError);
      expect(() => funcs.MID('hello', -1, 3)).toThrow(ValueError);
    });

    it('should throw error for negative num_chars', () => {
      expect(() => funcs.MID('hello', 2, -1)).toThrow(ValueError);
    });

    it('should handle decimal values (floor)', () => {
      expect(funcs.MID('hello', 2.9, 2.9)).toBe('el');
    });

    it('should coerce arguments to proper types', () => {
      expect(funcs.MID('hello', '2', '3')).toBe('ell');
    });
  });
});
