import { describe, it, expect } from 'vitest';
import { CellHelpers } from '../../../js/engine/utils/CellHelpers.js';

describe('CellHelpers', () => {
  describe('buildCellRef', () => {
    it('builds relative reference', () => {
      expect(CellHelpers.buildCellRef(0, 0)).toBe('A1');
    });

    it('builds fully absolute reference', () => {
      expect(CellHelpers.buildCellRef(0, 0, true, true)).toBe('$A$1');
    });

    it('builds column-absolute reference', () => {
      expect(CellHelpers.buildCellRef(0, 0, true, false)).toBe('$A1');
    });

    it('builds row-absolute reference', () => {
      expect(CellHelpers.buildCellRef(0, 0, false, true)).toBe('A$1');
    });

    it('builds reference for multi-letter column', () => {
      expect(CellHelpers.buildCellRef(9, 26, true, true)).toBe('$AA$10');
    });

    it('builds reference for large row number', () => {
      expect(CellHelpers.buildCellRef(99, 0, false, true)).toBe('A$100');
    });
  });

  describe('resolveRelativeRef with absolute markers', () => {
    it('adjusts relative reference', () => {
      const ref = { row: 0, col: 0, colAbs: false, rowAbs: false };
      expect(CellHelpers.resolveRelativeRef(ref, 1, 1)).toBe('B2');
    });

    it('preserves fully absolute reference', () => {
      const ref = { row: 0, col: 0, colAbs: true, rowAbs: true };
      expect(CellHelpers.resolveRelativeRef(ref, 1, 1)).toBe('$A$1');
    });

    it('preserves column-absolute, adjusts row', () => {
      const ref = { row: 0, col: 0, colAbs: true, rowAbs: false };
      expect(CellHelpers.resolveRelativeRef(ref, 1, 1)).toBe('$A2');
    });

    it('preserves row-absolute, adjusts column', () => {
      const ref = { row: 0, col: 0, colAbs: false, rowAbs: true };
      expect(CellHelpers.resolveRelativeRef(ref, 1, 1)).toBe('B$1');
    });

    it('adjusts relative reference with negative offset', () => {
      const ref = { row: 5, col: 5, colAbs: false, rowAbs: false };
      expect(CellHelpers.resolveRelativeRef(ref, -2, -2)).toBe('D4');
    });

    it('clamps negative results to grid bounds', () => {
      const ref = { row: 0, col: 0, colAbs: false, rowAbs: false };
      expect(CellHelpers.resolveRelativeRef(ref, -5, -5)).toBe('A1');
    });

    it('preserves markers with large offsets', () => {
      const ref = { row: 0, col: 0, colAbs: true, rowAbs: false };
      expect(CellHelpers.resolveRelativeRef(ref, 10, 10)).toBe('$A11');
    });
  });

  describe('parseCellRef with absolute markers', () => {
    it('parses relative reference A1', () => {
      const result = CellHelpers.parseCellRef('A1');
      expect(result).toEqual({ row: 0, col: 0, colAbs: false, rowAbs: false });
    });

    it('parses fully absolute reference $A$1', () => {
      const result = CellHelpers.parseCellRef('$A$1');
      expect(result).toEqual({ row: 0, col: 0, colAbs: true, rowAbs: true });
    });

    it('parses column-absolute reference $A1', () => {
      const result = CellHelpers.parseCellRef('$A1');
      expect(result).toEqual({ row: 0, col: 0, colAbs: true, rowAbs: false });
    });

    it('parses row-absolute reference A$1', () => {
      const result = CellHelpers.parseCellRef('A$1');
      expect(result).toEqual({ row: 0, col: 0, colAbs: false, rowAbs: true });
    });

    it('parses multi-letter column with absolute markers', () => {
      const result = CellHelpers.parseCellRef('$AA$10');
      expect(result).toEqual({ row: 9, col: 26, colAbs: true, rowAbs: true });
    });

    it('handles lowercase input', () => {
      const result = CellHelpers.parseCellRef('$a$1');
      expect(result).toEqual({ row: 0, col: 0, colAbs: true, rowAbs: true });
    });
  });

  describe('normalizeCellId', () => {
    it('returns A1 unchanged', () => {
      expect(CellHelpers.normalizeCellId('A1')).toBe('A1');
    });

    it('strips fully absolute $A$1 to A1', () => {
      expect(CellHelpers.normalizeCellId('$A$1')).toBe('A1');
    });

    it('strips column-absolute $A1 to A1', () => {
      expect(CellHelpers.normalizeCellId('$A1')).toBe('A1');
    });

    it('strips row-absolute A$1 to A1', () => {
      expect(CellHelpers.normalizeCellId('A$1')).toBe('A1');
    });

    it('handles multi-letter columns', () => {
      expect(CellHelpers.normalizeCellId('$AA$100')).toBe('AA100');
    });

    it('handles mixed absolute markers', () => {
      expect(CellHelpers.normalizeCellId('$AB10')).toBe('AB10');
      expect(CellHelpers.normalizeCellId('Z$999')).toBe('Z999');
    });
  });
});
