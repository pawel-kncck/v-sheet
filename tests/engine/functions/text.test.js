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
      FIND: registry.get('FIND').bind(mockEvaluator),
      SEARCH: registry.get('SEARCH').bind(mockEvaluator),
      SUBSTITUTE: registry.get('SUBSTITUTE').bind(mockEvaluator),
      REPLACE: registry.get('REPLACE').bind(mockEvaluator),
      TEXT: registry.get('TEXT').bind(mockEvaluator),
      VALUE: registry.get('VALUE').bind(mockEvaluator),
      // Medium priority
      REPT: registry.get('REPT').bind(mockEvaluator),
      PROPER: registry.get('PROPER').bind(mockEvaluator),
      EXACT: registry.get('EXACT').bind(mockEvaluator),
      TEXTJOIN: registry.get('TEXTJOIN').bind(mockEvaluator),
      SPLIT: registry.get('SPLIT').bind(mockEvaluator),
      // Low priority
      T: registry.get('T').bind(mockEvaluator),
      CHAR: registry.get('CHAR').bind(mockEvaluator),
      CODE: registry.get('CODE').bind(mockEvaluator),
      CLEAN: registry.get('CLEAN').bind(mockEvaluator),
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

  describe('FIND', () => {
    it('should find text position (case-sensitive)', () => {
      expect(funcs.FIND('l', 'hello')).toBe(3);
      expect(funcs.FIND('o', 'hello')).toBe(5);
    });

    it('should find substring position', () => {
      expect(funcs.FIND('ell', 'hello')).toBe(2);
    });

    it('should be case-sensitive', () => {
      expect(() => funcs.FIND('L', 'hello')).toThrow(ValueError);
    });

    it('should support start_num parameter', () => {
      expect(funcs.FIND('l', 'hello', 4)).toBe(4);
    });

    it('should throw error if text not found', () => {
      expect(() => funcs.FIND('x', 'hello')).toThrow(ValueError);
    });

    it('should throw error for invalid start_num', () => {
      expect(() => funcs.FIND('l', 'hello', 0)).toThrow(ValueError);
      expect(() => funcs.FIND('l', 'hello', 10)).toThrow(ValueError);
    });
  });

  describe('SEARCH', () => {
    it('should find text position (case-insensitive)', () => {
      expect(funcs.SEARCH('L', 'hello')).toBe(3);
      expect(funcs.SEARCH('HELLO', 'hello')).toBe(1);
    });

    it('should support wildcards - ?', () => {
      expect(funcs.SEARCH('h?llo', 'hello')).toBe(1);
      expect(funcs.SEARCH('h?llo', 'hallo')).toBe(1);
    });

    it('should support wildcards - *', () => {
      expect(funcs.SEARCH('h*o', 'hello')).toBe(1);
      expect(funcs.SEARCH('h*', 'hello')).toBe(1);
    });

    it('should support start_num parameter', () => {
      expect(funcs.SEARCH('l', 'hello', 4)).toBe(4);
    });

    it('should throw error if text not found', () => {
      expect(() => funcs.SEARCH('x', 'hello')).toThrow(ValueError);
    });
  });

  describe('SUBSTITUTE', () => {
    it('should replace all occurrences by default', () => {
      expect(funcs.SUBSTITUTE('hello hello', 'hello', 'hi')).toBe('hi hi');
      expect(funcs.SUBSTITUTE('aaa', 'a', 'b')).toBe('bbb');
    });

    it('should replace specific occurrence', () => {
      expect(funcs.SUBSTITUTE('hello hello hello', 'hello', 'hi', 2)).toBe('hello hi hello');
    });

    it('should return original if old_text not found', () => {
      expect(funcs.SUBSTITUTE('hello', 'x', 'y')).toBe('hello');
    });

    it('should return original if old_text is empty', () => {
      expect(funcs.SUBSTITUTE('hello', '', 'x')).toBe('hello');
    });

    it('should handle empty new_text', () => {
      expect(funcs.SUBSTITUTE('hello', 'l', '')).toBe('heo');
    });

    it('should throw error for invalid instance_num', () => {
      expect(() => funcs.SUBSTITUTE('hello', 'l', 'x', 0)).toThrow(ValueError);
    });
  });

  describe('REPLACE', () => {
    it('should replace characters by position', () => {
      expect(funcs.REPLACE('hello', 2, 3, 'XYZ')).toBe('hXYZo');
      expect(funcs.REPLACE('hello', 1, 1, 'H')).toBe('Hello');
    });

    it('should handle inserting without removing', () => {
      expect(funcs.REPLACE('hello', 3, 0, 'X')).toBe('heXllo');
    });

    it('should handle removing without inserting', () => {
      expect(funcs.REPLACE('hello', 2, 3, '')).toBe('ho');
    });

    it('should handle replacing beyond string length', () => {
      expect(funcs.REPLACE('hi', 3, 5, 'there')).toBe('hithere');
    });

    it('should throw error for invalid start_num', () => {
      expect(() => funcs.REPLACE('hello', 0, 1, 'x')).toThrow(ValueError);
    });

    it('should throw error for negative num_chars', () => {
      expect(() => funcs.REPLACE('hello', 1, -1, 'x')).toThrow(ValueError);
    });
  });

  describe('TEXT', () => {
    it('should format numbers with decimal places', () => {
      expect(funcs.TEXT(1234.567, '0.00')).toBe('1234.57');
      expect(funcs.TEXT(1234.5, '0.000')).toBe('1234.500');
    });

    it('should format percentages', () => {
      expect(funcs.TEXT(0.25, '0%')).toBe('25%');
      expect(funcs.TEXT(0.1234, '0.00%')).toBe('12.34%');
    });

    it('should format currency', () => {
      expect(funcs.TEXT(1234.5, '$0.00')).toBe('$1234.50');
    });

    it('should format with thousands separator', () => {
      expect(funcs.TEXT(1234567, '#,##0')).toBe('1,234,567');
    });

    it('should pad with leading zeros', () => {
      expect(funcs.TEXT(42, '0000')).toBe('0042');
    });
  });

  describe('VALUE', () => {
    it('should convert numeric strings to numbers', () => {
      expect(funcs.VALUE('123')).toBe(123);
      expect(funcs.VALUE('12.34')).toBe(12.34);
      expect(funcs.VALUE('-50')).toBe(-50);
    });

    it('should handle strings with commas', () => {
      expect(funcs.VALUE('1,234')).toBe(1234);
      expect(funcs.VALUE('1,234,567.89')).toBe(1234567.89);
    });

    it('should handle percentages', () => {
      expect(funcs.VALUE('50%')).toBe(0.5);
      expect(funcs.VALUE('12.5%')).toBe(0.125);
    });

    it('should handle currency', () => {
      expect(funcs.VALUE('$100')).toBe(100);
      expect(funcs.VALUE('$1,234.56')).toBe(1234.56);
    });

    it('should handle whitespace', () => {
      expect(funcs.VALUE('  123  ')).toBe(123);
    });

    it('should return 0 for empty string', () => {
      expect(funcs.VALUE('')).toBe(0);
    });

    it('should throw error for non-numeric strings', () => {
      expect(() => funcs.VALUE('hello')).toThrow(ValueError);
      expect(() => funcs.VALUE('abc123')).toThrow(ValueError);
    });
  });

  // ============================================
  // MEDIUM PRIORITY TEXT FUNCTION TESTS
  // ============================================

  describe('REPT', () => {
    it('should repeat text specified times', () => {
      expect(funcs.REPT('ab', 3)).toBe('ababab');
      expect(funcs.REPT('*', 5)).toBe('*****');
    });

    it('should return empty string for 0 times', () => {
      expect(funcs.REPT('hello', 0)).toBe('');
    });

    it('should throw error for negative times', () => {
      expect(() => funcs.REPT('hello', -1)).toThrow(ValueError);
    });
  });

  describe('PROPER', () => {
    it('should capitalize first letter of each word', () => {
      expect(funcs.PROPER('hello world')).toBe('Hello World');
      expect(funcs.PROPER('JOHN DOE')).toBe('John Doe');
    });

    it('should handle single word', () => {
      expect(funcs.PROPER('javascript')).toBe('Javascript');
    });

    it('should handle mixed case', () => {
      expect(funcs.PROPER('hELLO wORLD')).toBe('Hello World');
    });
  });

  describe('EXACT', () => {
    it('should return TRUE for identical strings', () => {
      expect(funcs.EXACT('hello', 'hello')).toBe(true);
    });

    it('should return FALSE for different strings', () => {
      expect(funcs.EXACT('hello', 'world')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(funcs.EXACT('Hello', 'hello')).toBe(false);
    });
  });

  describe('TEXTJOIN', () => {
    it('should join strings with delimiter', () => {
      expect(funcs.TEXTJOIN(', ', false, 'a', 'b', 'c')).toBe('a, b, c');
    });

    it('should ignore empty when set to true', () => {
      expect(funcs.TEXTJOIN(', ', true, 'a', '', 'c')).toBe('a, c');
    });

    it('should include empty when set to false', () => {
      expect(funcs.TEXTJOIN(', ', false, 'a', '', 'c')).toBe('a, , c');
    });

    it('should handle arrays', () => {
      expect(funcs.TEXTJOIN('-', false, ['a', 'b'], 'c')).toBe('a-b-c');
    });
  });

  describe('SPLIT', () => {
    it('should split text by delimiter', () => {
      expect(funcs.SPLIT('a,b,c', ',')).toEqual(['a', 'b', 'c']);
    });

    it('should split by each character when split_by_each is true', () => {
      expect(funcs.SPLIT('a,b;c', ',;', true)).toEqual(['a', 'b', 'c']);
    });

    it('should return original string when delimiter is empty', () => {
      expect(funcs.SPLIT('hello', '')).toEqual(['hello']);
    });
  });

  // ============================================
  // LOW PRIORITY TEXT FUNCTION TESTS
  // ============================================

  describe('T', () => {
    it('should return text if value is text', () => {
      expect(funcs.T('hello')).toBe('hello');
    });

    it('should return empty string for non-text', () => {
      expect(funcs.T(123)).toBe('');
      expect(funcs.T(true)).toBe('');
      expect(funcs.T(null)).toBe('');
    });
  });

  describe('CHAR', () => {
    it('should return character for code', () => {
      expect(funcs.CHAR(65)).toBe('A');
      expect(funcs.CHAR(97)).toBe('a');
      expect(funcs.CHAR(32)).toBe(' ');
    });

    it('should throw error for invalid code', () => {
      expect(() => funcs.CHAR(0)).toThrow(ValueError);
      expect(() => funcs.CHAR(256)).toThrow(ValueError);
    });
  });

  describe('CODE', () => {
    it('should return code for first character', () => {
      expect(funcs.CODE('A')).toBe(65);
      expect(funcs.CODE('ABC')).toBe(65);
      expect(funcs.CODE('a')).toBe(97);
    });

    it('should throw error for empty string', () => {
      expect(() => funcs.CODE('')).toThrow(ValueError);
    });
  });

  describe('CLEAN', () => {
    it('should remove non-printable characters', () => {
      expect(funcs.CLEAN('hello\x00world')).toBe('helloworld');
      expect(funcs.CLEAN('test\x1F')).toBe('test');
    });

    it('should preserve printable characters', () => {
      expect(funcs.CLEAN('hello world')).toBe('hello world');
    });
  });
});
