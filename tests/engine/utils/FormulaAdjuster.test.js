import { describe, it, expect } from 'vitest';
import { FormulaAdjuster } from '../../../js/engine/utils/FormulaAdjuster.js';

describe('FormulaAdjuster', () => {
  describe('adjustFormula', () => {
    it('adjusts simple relative formula', () => {
      expect(FormulaAdjuster.adjustFormula('=A1+A2', 0, 1)).toBe('=B1+B2');
    });

    it('preserves fully absolute references', () => {
      expect(FormulaAdjuster.adjustFormula('=$A$1+$A$2', 0, 1)).toBe('=$A$1+$A$2');
    });

    it('handles mixed references', () => {
      expect(FormulaAdjuster.adjustFormula('=$A$1+B2', 1, 1)).toBe('=$A$1+C3');
    });

    it('handles column-absolute reference', () => {
      expect(FormulaAdjuster.adjustFormula('=$A1', 1, 1)).toBe('=$A2');
    });

    it('handles row-absolute reference', () => {
      expect(FormulaAdjuster.adjustFormula('=A$1', 1, 1)).toBe('=B$1');
    });

    it('handles range references', () => {
      expect(FormulaAdjuster.adjustFormula('=SUM(A1:B2)', 1, 1)).toBe('=SUM(B2:C3)');
    });

    it('handles range with absolute markers', () => {
      expect(FormulaAdjuster.adjustFormula('=SUM($A$1:B2)', 1, 1)).toBe('=SUM($A$1:C3)');
    });

    it('returns non-formula values unchanged', () => {
      expect(FormulaAdjuster.adjustFormula('hello', 1, 1)).toBe('hello');
    });

    it('clamps negative references to grid bounds', () => {
      expect(FormulaAdjuster.adjustFormula('=A1', -5, -5)).toBe('=A1');
    });

    it('handles complex formula with multiple references', () => {
      expect(FormulaAdjuster.adjustFormula('=A1+B2*C3-D4', 1, 1)).toBe('=B2+C3*D4-E5');
    });

    it('handles formula with functions and mixed references', () => {
      expect(FormulaAdjuster.adjustFormula('=SUM($A1:A$5)+B1', 2, 1)).toBe('=SUM($A3:B$5)+C3');
    });

    it('preserves operators and parentheses', () => {
      expect(FormulaAdjuster.adjustFormula('=(A1+B2)*C3', 1, 1)).toBe('=(B2+C3)*D4');
    });

    it('handles negative row offset', () => {
      expect(FormulaAdjuster.adjustFormula('=C5', -2, -1)).toBe('=B3');
    });

    it('handles zero offset', () => {
      expect(FormulaAdjuster.adjustFormula('=A1+$B$2', 0, 0)).toBe('=A1+$B$2');
    });
  });

  describe('cycleReferenceFormat', () => {
    it('A1 → $A$1', () => {
      expect(FormulaAdjuster.cycleReferenceFormat('A1')).toBe('$A$1');
    });

    it('$A$1 → A$1', () => {
      expect(FormulaAdjuster.cycleReferenceFormat('$A$1')).toBe('A$1');
    });

    it('A$1 → $A1', () => {
      expect(FormulaAdjuster.cycleReferenceFormat('A$1')).toBe('$A1');
    });

    it('$A1 → A1', () => {
      expect(FormulaAdjuster.cycleReferenceFormat('$A1')).toBe('A1');
    });

    it('handles multi-letter columns', () => {
      expect(FormulaAdjuster.cycleReferenceFormat('AA10')).toBe('$AA$10');
    });

    it('handles large row numbers', () => {
      expect(FormulaAdjuster.cycleReferenceFormat('Z999')).toBe('$Z$999');
    });

    it('cycles multi-letter column with absolute', () => {
      expect(FormulaAdjuster.cycleReferenceFormat('$AB$5')).toBe('AB$5');
    });

    it('handles lowercase input', () => {
      expect(FormulaAdjuster.cycleReferenceFormat('a1')).toBe('$A$1');
    });

    it('returns invalid reference unchanged', () => {
      expect(FormulaAdjuster.cycleReferenceFormat('INVALID')).toBe('INVALID');
    });

    it('completes full cycle back to relative', () => {
      let ref = 'B5';
      ref = FormulaAdjuster.cycleReferenceFormat(ref); // → $B$5
      ref = FormulaAdjuster.cycleReferenceFormat(ref); // → B$5
      ref = FormulaAdjuster.cycleReferenceFormat(ref); // → $B5
      ref = FormulaAdjuster.cycleReferenceFormat(ref); // → B5
      expect(ref).toBe('B5');
    });

    // Range reference cycling tests
    it('cycles range B1:B3 → $B$1:$B$3', () => {
      expect(FormulaAdjuster.cycleReferenceFormat('B1:B3')).toBe('$B$1:$B$3');
    });

    it('cycles range $B$1:$B$3 → B$1:B$3', () => {
      expect(FormulaAdjuster.cycleReferenceFormat('$B$1:$B$3')).toBe('B$1:B$3');
    });

    it('cycles range B$1:B$3 → $B1:$B3', () => {
      expect(FormulaAdjuster.cycleReferenceFormat('B$1:B$3')).toBe('$B1:$B3');
    });

    it('cycles range $B1:$B3 → B1:B3', () => {
      expect(FormulaAdjuster.cycleReferenceFormat('$B1:$B3')).toBe('B1:B3');
    });

    it('completes full cycle for range', () => {
      let ref = 'A1:C3';
      ref = FormulaAdjuster.cycleReferenceFormat(ref); // → $A$1:$C$3
      expect(ref).toBe('$A$1:$C$3');
      ref = FormulaAdjuster.cycleReferenceFormat(ref); // → A$1:C$3
      expect(ref).toBe('A$1:C$3');
      ref = FormulaAdjuster.cycleReferenceFormat(ref); // → $A1:$C3
      expect(ref).toBe('$A1:$C3');
      ref = FormulaAdjuster.cycleReferenceFormat(ref); // → A1:C3
      expect(ref).toBe('A1:C3');
    });

    it('cycles each part of range independently', () => {
      // When a range has mixed formats, each part cycles independently
      // $A1 → A1 and B$2 → $B2
      expect(FormulaAdjuster.cycleReferenceFormat('$A1:B$2')).toBe('A1:$B2');
    });
  });
});
