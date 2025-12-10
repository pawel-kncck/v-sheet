import { describe, it, expect } from 'vitest';
import { FillPatternDetector } from '../../../js/engine/utils/FillPatternDetector.js';

describe('FillPatternDetector', () => {
  describe('isNumericSequence', () => {
    it('should return true for numeric values', () => {
      const cells = [
        { value: '1', isFormula: false },
        { value: '2', isFormula: false },
        { value: '3', isFormula: false }
      ];
      expect(FillPatternDetector.isNumericSequence(cells)).toBe(true);
    });

    it('should return false for formulas', () => {
      const cells = [
        { value: '=A1+1', isFormula: true },
        { value: '=A2+1', isFormula: true }
      ];
      expect(FillPatternDetector.isNumericSequence(cells)).toBe(false);
    });

    it('should return false for mixed content', () => {
      const cells = [
        { value: '1', isFormula: false },
        { value: 'text', isFormula: false }
      ];
      expect(FillPatternDetector.isNumericSequence(cells)).toBe(false);
    });

    it('should return false for empty cells', () => {
      const cells = [
        { value: '1', isFormula: false },
        { value: '', isFormula: false }
      ];
      expect(FillPatternDetector.isNumericSequence(cells)).toBe(false);
    });

    it('should handle decimal numbers', () => {
      const cells = [
        { value: '1.5', isFormula: false },
        { value: '2.5', isFormula: false }
      ];
      expect(FillPatternDetector.isNumericSequence(cells)).toBe(true);
    });
  });

  describe('calculateLinearRegression', () => {
    it('should calculate slope for increasing sequence', () => {
      const values = [1, 2, 3, 4, 5];
      const result = FillPatternDetector.calculateLinearRegression(values);
      expect(result.slope).toBe(1);
      expect(result.intercept).toBe(1);
    });

    it('should calculate slope for decreasing sequence', () => {
      const values = [10, 8, 6, 4, 2];
      const result = FillPatternDetector.calculateLinearRegression(values);
      expect(result.slope).toBe(-2);
      expect(result.intercept).toBe(10);
    });

    it('should handle constant values', () => {
      const values = [5, 5, 5];
      const result = FillPatternDetector.calculateLinearRegression(values);
      expect(result.slope).toBe(0);
      expect(result.intercept).toBe(5);
    });

    it('should handle single value', () => {
      const values = [42];
      const result = FillPatternDetector.calculateLinearRegression(values);
      expect(result.slope).toBe(0);
      expect(result.intercept).toBe(42);
    });

    it('should handle empty array', () => {
      const values = [];
      const result = FillPatternDetector.calculateLinearRegression(values);
      expect(result.slope).toBe(0);
      expect(result.intercept).toBe(0);
    });

    it('should calculate slope for non-unit increments', () => {
      const values = [2, 5, 8, 11];
      const result = FillPatternDetector.calculateLinearRegression(values);
      expect(result.slope).toBe(3);
      expect(result.intercept).toBe(2);
    });
  });

  describe('generateNumericFill', () => {
    it('should generate forward fill with slope 1', () => {
      const sourceValues = [1, 2, 3];
      const result = FillPatternDetector.generateNumericFill(sourceValues, 3, false);
      expect(result).toEqual([4, 5, 6]);
    });

    it('should generate forward fill with slope 2', () => {
      const sourceValues = [2, 4, 6];
      const result = FillPatternDetector.generateNumericFill(sourceValues, 2, false);
      expect(result).toEqual([8, 10]);
    });

    it('should generate reverse fill', () => {
      const sourceValues = [3, 4, 5];
      const result = FillPatternDetector.generateNumericFill(sourceValues, 2, true);
      expect(result).toEqual([2, 1]);
    });

    it('should generate constant fill for same values', () => {
      const sourceValues = [5, 5, 5];
      const result = FillPatternDetector.generateNumericFill(sourceValues, 3, false);
      expect(result).toEqual([5, 5, 5]);
    });

    it('should handle single value', () => {
      const sourceValues = [10];
      const result = FillPatternDetector.generateNumericFill(sourceValues, 3, false);
      expect(result).toEqual([10, 10, 10]);
    });

    it('should generate reverse fill with decreasing sequence', () => {
      const sourceValues = [10, 8, 6];
      const result = FillPatternDetector.generateNumericFill(sourceValues, 2, true);
      expect(result).toEqual([12, 14]);
    });
  });

  describe('generateCyclicFill', () => {
    it('should cycle through source values forward', () => {
      const sourceData = [
        { value: 'A', sourceCoords: { row: 1, col: 0 } },
        { value: 'B', sourceCoords: { row: 2, col: 0 } }
      ];
      const result = FillPatternDetector.generateCyclicFill(sourceData, 5, false);
      expect(result.length).toBe(5);
      expect(result.map(r => r.value)).toEqual(['A', 'B', 'A', 'B', 'A']);
    });

    it('should cycle through source values backward', () => {
      const sourceData = [
        { value: 'A', sourceCoords: { row: 1, col: 0 } },
        { value: 'B', sourceCoords: { row: 2, col: 0 } }
      ];
      const result = FillPatternDetector.generateCyclicFill(sourceData, 3, true);
      expect(result.length).toBe(3);
      expect(result.map(r => r.value)).toEqual(['B', 'A', 'B']);
    });

    it('should handle single source value', () => {
      const sourceData = [
        { value: 'X', sourceCoords: { row: 1, col: 0 } }
      ];
      const result = FillPatternDetector.generateCyclicFill(sourceData, 4, false);
      expect(result.length).toBe(4);
      expect(result.map(r => r.value)).toEqual(['X', 'X', 'X', 'X']);
    });

    it('should preserve source coordinates', () => {
      const sourceData = [
        { value: 'A', sourceCoords: { row: 1, col: 0 } },
        { value: 'B', sourceCoords: { row: 2, col: 0 } }
      ];
      const result = FillPatternDetector.generateCyclicFill(sourceData, 3, false);
      expect(result[0].sourceCoords).toEqual({ row: 1, col: 0 });
      expect(result[1].sourceCoords).toEqual({ row: 2, col: 0 });
      expect(result[2].sourceCoords).toEqual({ row: 1, col: 0 });
    });
  });

  describe('generateFillData - Vertical Fill', () => {
    it('should fill down with numeric sequence', () => {
      const sourceRange = [
        { cellId: 'A1', value: '1', isFormula: false, style: null, coords: { row: 1, col: 0 } },
        { cellId: 'A2', value: '2', isFormula: false, style: null, coords: { row: 2, col: 0 } }
      ];
      const targetRange = { minRow: 1, maxRow: 5, minCol: 0, maxCol: 0 };

      const result = FillPatternDetector.generateFillData({
        sourceRange,
        targetRange,
        fillDirection: 'vertical',
        reverse: false
      });

      expect(result.length).toBe(3); // rows 3, 4, 5
      expect(result[0].cellId).toBe('A3');
      expect(result[0].value).toBe('3');
      expect(result[1].value).toBe('4');
      expect(result[2].value).toBe('5');
    });

    it('should fill up with numeric sequence', () => {
      const sourceRange = [
        { cellId: 'A3', value: '3', isFormula: false, style: null, coords: { row: 3, col: 0 } },
        { cellId: 'A4', value: '4', isFormula: false, style: null, coords: { row: 4, col: 0 } }
      ];
      const targetRange = { minRow: 1, maxRow: 4, minCol: 0, maxCol: 0 };

      const result = FillPatternDetector.generateFillData({
        sourceRange,
        targetRange,
        fillDirection: 'vertical',
        reverse: true
      });

      expect(result.length).toBe(2); // rows 1, 2
      expect(result[0].cellId).toBe('A1');
      expect(result[0].value).toBe('1');
      expect(result[1].cellId).toBe('A2');
      expect(result[1].value).toBe('2');
    });

    it('should fill down with cyclic copy for formulas', () => {
      const sourceRange = [
        { cellId: 'A1', value: '=B1', isFormula: true, style: null, coords: { row: 1, col: 0 } },
        { cellId: 'A2', value: '=B2', isFormula: true, style: null, coords: { row: 2, col: 0 } }
      ];
      const targetRange = { minRow: 1, maxRow: 4, minCol: 0, maxCol: 0 };

      const result = FillPatternDetector.generateFillData({
        sourceRange,
        targetRange,
        fillDirection: 'vertical',
        reverse: false
      });

      expect(result.length).toBe(2); // rows 3, 4
      expect(result[0].value).toBe('=B1'); // Cyclic copy
      expect(result[1].value).toBe('=B2');
    });

    it('should preserve styles during fill', () => {
      const style = { font: { bold: true } };
      const sourceRange = [
        { cellId: 'A1', value: '1', isFormula: false, style, coords: { row: 1, col: 0 } }
      ];
      const targetRange = { minRow: 1, maxRow: 3, minCol: 0, maxCol: 0 };

      const result = FillPatternDetector.generateFillData({
        sourceRange,
        targetRange,
        fillDirection: 'vertical',
        reverse: false
      });

      expect(result[0].style).toEqual(style);
    });
  });

  describe('generateFillData - Horizontal Fill', () => {
    it('should fill right with numeric sequence', () => {
      const sourceRange = [
        { cellId: 'A1', value: '10', isFormula: false, style: null, coords: { row: 1, col: 0 } },
        { cellId: 'B1', value: '20', isFormula: false, style: null, coords: { row: 1, col: 1 } }
      ];
      const targetRange = { minRow: 1, maxRow: 1, minCol: 0, maxCol: 4 };

      const result = FillPatternDetector.generateFillData({
        sourceRange,
        targetRange,
        fillDirection: 'horizontal',
        reverse: false
      });

      expect(result.length).toBe(3); // cols C, D, E
      expect(result[0].cellId).toBe('C1');
      expect(result[0].value).toBe('30');
      expect(result[1].value).toBe('40');
      expect(result[2].value).toBe('50');
    });

    it('should fill left with numeric sequence', () => {
      const sourceRange = [
        { cellId: 'C1', value: '3', isFormula: false, style: null, coords: { row: 1, col: 2 } },
        { cellId: 'D1', value: '4', isFormula: false, style: null, coords: { row: 1, col: 3 } }
      ];
      const targetRange = { minRow: 1, maxRow: 1, minCol: 0, maxCol: 3 };

      const result = FillPatternDetector.generateFillData({
        sourceRange,
        targetRange,
        fillDirection: 'horizontal',
        reverse: true
      });

      expect(result.length).toBe(2); // cols A, B
      expect(result[0].cellId).toBe('A1');
      expect(result[0].value).toBe('1');
      expect(result[1].cellId).toBe('B1');
      expect(result[1].value).toBe('2');
    });

    it('should fill right with cyclic copy for text', () => {
      const sourceRange = [
        { cellId: 'A1', value: 'Mon', isFormula: false, style: null, coords: { row: 1, col: 0 } },
        { cellId: 'B1', value: 'Tue', isFormula: false, style: null, coords: { row: 1, col: 1 } }
      ];
      const targetRange = { minRow: 1, maxRow: 1, minCol: 0, maxCol: 4 };

      const result = FillPatternDetector.generateFillData({
        sourceRange,
        targetRange,
        fillDirection: 'horizontal',
        reverse: false
      });

      expect(result.length).toBe(3); // cols C, D, E
      expect(result[0].value).toBe('Mon');
      expect(result[1].value).toBe('Tue');
      expect(result[2].value).toBe('Mon');
    });
  });

  describe('generateFillData - Multi-row/column', () => {
    it('should fill each column independently', () => {
      const sourceRange = [
        { cellId: 'A1', value: '1', isFormula: false, style: null, coords: { row: 1, col: 0 } },
        { cellId: 'A2', value: '2', isFormula: false, style: null, coords: { row: 2, col: 0 } },
        { cellId: 'B1', value: '10', isFormula: false, style: null, coords: { row: 1, col: 1 } },
        { cellId: 'B2', value: '20', isFormula: false, style: null, coords: { row: 2, col: 1 } }
      ];
      const targetRange = { minRow: 1, maxRow: 4, minCol: 0, maxCol: 1 };

      const result = FillPatternDetector.generateFillData({
        sourceRange,
        targetRange,
        fillDirection: 'vertical',
        reverse: false
      });

      expect(result.length).toBe(4); // 2 columns × 2 new rows

      // Column A should continue with slope 1
      const colAResults = result.filter(r => r.cellId.startsWith('A'));
      expect(colAResults[0].value).toBe('3');
      expect(colAResults[1].value).toBe('4');

      // Column B should continue with slope 10
      const colBResults = result.filter(r => r.cellId.startsWith('B'));
      expect(colBResults[0].value).toBe('30');
      expect(colBResults[1].value).toBe('40');
    });

    it('should fill each row independently', () => {
      const sourceRange = [
        { cellId: 'A1', value: '1', isFormula: false, style: null, coords: { row: 1, col: 0 } },
        { cellId: 'B1', value: '2', isFormula: false, style: null, coords: { row: 1, col: 1 } },
        { cellId: 'A2', value: '5', isFormula: false, style: null, coords: { row: 2, col: 0 } },
        { cellId: 'B2', value: '10', isFormula: false, style: null, coords: { row: 2, col: 1 } }
      ];
      const targetRange = { minRow: 1, maxRow: 2, minCol: 0, maxCol: 3 };

      const result = FillPatternDetector.generateFillData({
        sourceRange,
        targetRange,
        fillDirection: 'horizontal',
        reverse: false
      });

      expect(result.length).toBe(4); // 2 rows × 2 new columns

      // Row 1 should continue with slope 1
      const row1Results = result.filter(r => r.cellId.endsWith('1'));
      expect(row1Results[0].value).toBe('3');
      expect(row1Results[1].value).toBe('4');

      // Row 2 should continue with slope 5
      const row2Results = result.filter(r => r.cellId.endsWith('2'));
      expect(row2Results[0].value).toBe('15');
      expect(row2Results[1].value).toBe('20');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty source range', () => {
      const result = FillPatternDetector.generateFillData({
        sourceRange: [],
        targetRange: { minRow: 1, maxRow: 3, minCol: 0, maxCol: 0 },
        fillDirection: 'vertical',
        reverse: false
      });

      expect(result).toEqual([]);
    });

    it('should skip cells within source range', () => {
      const sourceRange = [
        { cellId: 'A1', value: '1', isFormula: false, style: null, coords: { row: 1, col: 0 } },
        { cellId: 'A2', value: '2', isFormula: false, style: null, coords: { row: 2, col: 0 } }
      ];
      const targetRange = { minRow: 1, maxRow: 3, minCol: 0, maxCol: 0 };

      const result = FillPatternDetector.generateFillData({
        sourceRange,
        targetRange,
        fillDirection: 'vertical',
        reverse: false
      });

      // Should only fill row 3, not rows 1-2 (source)
      expect(result.length).toBe(1);
      expect(result[0].cellId).toBe('A3');
    });
  });
});
