import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FunctionRegistry } from '../../../js/engine/FunctionRegistry.js';
import { registerFunctions } from '../../../js/engine/functions/register.js';
import { TypeCoercion } from '../../../js/engine/utils/TypeCoercion.js';
import { NumError, ValueError } from '../../../js/engine/utils/FormulaErrors.js';
import { datetimeFunctions } from '../../../js/engine/functions/datetime.js';

describe('Date/Time Functions', () => {
  let funcs;
  let mockEvaluator;

  beforeEach(() => {
    const registry = new FunctionRegistry();
    registerFunctions(registry);

    // Mock the evaluator context
    mockEvaluator = {
      coerce: TypeCoercion,
    };

    // Bind datetime functions to the mock context
    funcs = {
      TODAY: registry.get('TODAY').bind(mockEvaluator),
      NOW: registry.get('NOW').bind(mockEvaluator),
      DATE: registry.get('DATE').bind(mockEvaluator),
      YEAR: registry.get('YEAR').bind(mockEvaluator),
      MONTH: registry.get('MONTH').bind(mockEvaluator),
      DAY: registry.get('DAY').bind(mockEvaluator),
      // Medium priority
      HOUR: registry.get('HOUR').bind(mockEvaluator),
      MINUTE: registry.get('MINUTE').bind(mockEvaluator),
      SECOND: registry.get('SECOND').bind(mockEvaluator),
      TIME: registry.get('TIME').bind(mockEvaluator),
      WEEKDAY: registry.get('WEEKDAY').bind(mockEvaluator),
      DATEDIF: registry.get('DATEDIF').bind(mockEvaluator),
      EDATE: registry.get('EDATE').bind(mockEvaluator),
      EOMONTH: registry.get('EOMONTH').bind(mockEvaluator),
    };
  });

  describe('TODAY', () => {
    it('should return an integer (no time component)', () => {
      const result = funcs.TODAY();
      expect(Number.isInteger(result)).toBe(true);
    });

    it('should return a reasonable serial date', () => {
      // Today should be somewhere after 2020 (serial ~43831) and before 2100 (serial ~73050)
      const result = funcs.TODAY();
      expect(result).toBeGreaterThan(43831);
      expect(result).toBeLessThan(73050);
    });
  });

  describe('NOW', () => {
    it('should return a number with decimal (time component)', () => {
      const result = funcs.NOW();
      expect(typeof result).toBe('number');
    });

    it('should return a value greater than TODAY', () => {
      const today = funcs.TODAY();
      const now = funcs.NOW();
      expect(now).toBeGreaterThanOrEqual(today);
      expect(now).toBeLessThan(today + 1);
    });
  });

  describe('DATE', () => {
    it('should create a date from year, month, day', () => {
      // January 1, 2020 should be serial 43831
      const result = funcs.DATE(2020, 1, 1);
      expect(result).toBe(43831);
    });

    it('should handle month overflow', () => {
      // February 2020 (month 2)
      const feb = funcs.DATE(2020, 2, 1);
      // Month 14 should roll over to February of next year
      const feb_overflow = funcs.DATE(2020, 14, 1);
      expect(feb_overflow).toBe(feb + 366); // 2020 is a leap year
    });

    it('should handle day overflow', () => {
      // January 31, 2020
      const jan31 = funcs.DATE(2020, 1, 31);
      // January 32 should be February 1
      const jan32 = funcs.DATE(2020, 1, 32);
      expect(jan32).toBe(jan31 + 1);
    });

    it('should handle two-digit years (1900-1999)', () => {
      const year99 = funcs.DATE(99, 1, 1);
      const year1999 = funcs.DATE(1999, 1, 1);
      expect(year99).toBe(year1999);
    });

    it('should throw error for invalid year', () => {
      expect(() => funcs.DATE(1800, 1, 1)).toThrow(NumError);
      expect(() => funcs.DATE(10000, 1, 1)).toThrow(NumError);
    });
  });

  describe('YEAR', () => {
    it('should extract year from serial date', () => {
      // January 1, 2020 = 43831
      expect(funcs.YEAR(43831)).toBe(2020);
    });

    it('should work with DATE function', () => {
      const serial = funcs.DATE(2023, 6, 15);
      expect(funcs.YEAR(serial)).toBe(2023);
    });

    it('should throw error for negative serial', () => {
      expect(() => funcs.YEAR(-1)).toThrow(NumError);
    });
  });

  describe('MONTH', () => {
    it('should extract month from serial date', () => {
      // January 1, 2020 = 43831
      expect(funcs.MONTH(43831)).toBe(1);
    });

    it('should work with DATE function', () => {
      const serial = funcs.DATE(2023, 6, 15);
      expect(funcs.MONTH(serial)).toBe(6);
    });

    it('should return values 1-12', () => {
      for (let month = 1; month <= 12; month++) {
        const serial = funcs.DATE(2020, month, 15);
        expect(funcs.MONTH(serial)).toBe(month);
      }
    });

    it('should throw error for negative serial', () => {
      expect(() => funcs.MONTH(-1)).toThrow(NumError);
    });
  });

  describe('DAY', () => {
    it('should extract day from serial date', () => {
      // January 1, 2020 = 43831
      expect(funcs.DAY(43831)).toBe(1);
    });

    it('should work with DATE function', () => {
      const serial = funcs.DATE(2023, 6, 15);
      expect(funcs.DAY(serial)).toBe(15);
    });

    it('should handle end of month', () => {
      const serial = funcs.DATE(2020, 1, 31);
      expect(funcs.DAY(serial)).toBe(31);
    });

    it('should throw error for negative serial', () => {
      expect(() => funcs.DAY(-1)).toThrow(NumError);
    });
  });

  describe('Round-trip DATE -> YEAR/MONTH/DAY', () => {
    it('should preserve date components', () => {
      const testCases = [
        [2020, 1, 1],
        [2023, 12, 31],
        [2024, 2, 29], // Leap year
        [2000, 6, 15],
      ];

      for (const [year, month, day] of testCases) {
        const serial = funcs.DATE(year, month, day);
        expect(funcs.YEAR(serial)).toBe(year);
        expect(funcs.MONTH(serial)).toBe(month);
        expect(funcs.DAY(serial)).toBe(day);
      }
    });
  });

  // ============================================
  // MEDIUM PRIORITY DATETIME FUNCTION TESTS
  // ============================================

  describe('HOUR', () => {
    it('should extract hour from time serial', () => {
      // 0.5 = noon (12:00)
      expect(funcs.HOUR(0.5)).toBe(12);
      // 0.25 = 6:00 AM
      expect(funcs.HOUR(0.25)).toBe(6);
    });

    it('should throw error for negative serial', () => {
      expect(() => funcs.HOUR(-1)).toThrow(NumError);
    });
  });

  describe('MINUTE', () => {
    it('should extract minute from time serial', () => {
      // 0.5 + 30 minutes = 12:30
      const serial = 0.5 + (30 / 1440);
      expect(funcs.MINUTE(serial)).toBe(30);
    });
  });

  describe('SECOND', () => {
    it('should extract second from time serial', () => {
      // 30 seconds = 30/86400
      const serial = 30 / 86400;
      expect(funcs.SECOND(serial)).toBe(30);
    });
  });

  describe('TIME', () => {
    it('should create time from components', () => {
      // 12:00:00 = 0.5
      expect(funcs.TIME(12, 0, 0)).toBe(0.5);
      // 6:00:00 = 0.25
      expect(funcs.TIME(6, 0, 0)).toBe(0.25);
    });

    it('should handle minutes and seconds', () => {
      // 0:30:0 = 30 minutes = 30/1440
      expect(funcs.TIME(0, 30, 0)).toBeCloseTo(30 / 1440, 10);
    });
  });

  describe('WEEKDAY', () => {
    it('should return day of week (type 1: Sunday=1)', () => {
      // January 1, 2020 was a Wednesday
      const serial = funcs.DATE(2020, 1, 1);
      expect(funcs.WEEKDAY(serial, 1)).toBe(4); // Wednesday = 4 in type 1
    });

    it('should return day of week (type 2: Monday=1)', () => {
      const serial = funcs.DATE(2020, 1, 1);
      expect(funcs.WEEKDAY(serial, 2)).toBe(3); // Wednesday = 3 in type 2
    });

    it('should return day of week (type 3: Monday=0)', () => {
      const serial = funcs.DATE(2020, 1, 1);
      expect(funcs.WEEKDAY(serial, 3)).toBe(2); // Wednesday = 2 in type 3
    });
  });

  describe('DATEDIF', () => {
    it('should calculate days difference', () => {
      const start = funcs.DATE(2020, 1, 1);
      const end = funcs.DATE(2020, 1, 31);
      expect(funcs.DATEDIF(start, end, 'D')).toBe(30);
    });

    it('should calculate months difference', () => {
      const start = funcs.DATE(2020, 1, 15);
      const end = funcs.DATE(2020, 4, 15);
      expect(funcs.DATEDIF(start, end, 'M')).toBe(3);
    });

    it('should calculate years difference', () => {
      const start = funcs.DATE(2020, 1, 1);
      const end = funcs.DATE(2023, 1, 1);
      expect(funcs.DATEDIF(start, end, 'Y')).toBe(3);
    });

    it('should throw error if start > end', () => {
      const start = funcs.DATE(2023, 1, 1);
      const end = funcs.DATE(2020, 1, 1);
      expect(() => funcs.DATEDIF(start, end, 'D')).toThrow(NumError);
    });
  });

  describe('EDATE', () => {
    it('should add months to date', () => {
      const start = funcs.DATE(2020, 1, 15);
      const result = funcs.EDATE(start, 3);
      expect(funcs.MONTH(result)).toBe(4);
      expect(funcs.DAY(result)).toBe(15);
    });

    it('should subtract months with negative value', () => {
      const start = funcs.DATE(2020, 6, 15);
      const result = funcs.EDATE(start, -3);
      expect(funcs.MONTH(result)).toBe(3);
    });
  });

  describe('EOMONTH', () => {
    it('should return end of month', () => {
      const start = funcs.DATE(2020, 1, 15);
      const result = funcs.EOMONTH(start, 0);
      expect(funcs.DAY(result)).toBe(31);
    });

    it('should return end of month after adding months', () => {
      const start = funcs.DATE(2020, 1, 15);
      const result = funcs.EOMONTH(start, 1); // February 2020 (leap year)
      expect(funcs.MONTH(result)).toBe(2);
      expect(funcs.DAY(result)).toBe(29);
    });

    it('should handle negative months', () => {
      const start = funcs.DATE(2020, 3, 15);
      const result = funcs.EOMONTH(start, -1); // February 2020
      expect(funcs.MONTH(result)).toBe(2);
      expect(funcs.DAY(result)).toBe(29);
    });
  });
});
