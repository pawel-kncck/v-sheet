import { describe, it, expect } from 'vitest';
import { BorderResolver } from '../../js/ui/BorderResolver.js';

describe('BorderResolver', () => {
  const borderStyle = { style: 'solid', color: '#000000', width: 1 };

  describe('resolveBorderChanges', () => {
    describe('single cell operations', () => {
      const singleCellSelection = {
        start: { row: 1, col: 0 },
        end: { row: 1, col: 0 }
      };

      it('should apply all borders to a single cell', () => {
        const changes = BorderResolver.resolveBorderChanges(
          singleCellSelection,
          ['all'],
          borderStyle
        );

        expect(changes['A1']).toBeDefined();
        expect(changes['A1'].border.top).toEqual(borderStyle);
        expect(changes['A1'].border.right).toEqual(borderStyle);
        expect(changes['A1'].border.bottom).toEqual(borderStyle);
        expect(changes['A1'].border.left).toEqual(borderStyle);
      });

      it('should apply outer borders to a single cell (same as all)', () => {
        const changes = BorderResolver.resolveBorderChanges(
          singleCellSelection,
          ['outer'],
          borderStyle
        );

        expect(changes['A1']).toBeDefined();
        expect(changes['A1'].border.top).toEqual(borderStyle);
        expect(changes['A1'].border.right).toEqual(borderStyle);
        expect(changes['A1'].border.bottom).toEqual(borderStyle);
        expect(changes['A1'].border.left).toEqual(borderStyle);
      });

      it('should return empty for inner borders on single cell', () => {
        const changes = BorderResolver.resolveBorderChanges(
          singleCellSelection,
          ['inner'],
          borderStyle
        );

        // Single cell has no inner borders
        expect(Object.keys(changes).length).toBe(0);
      });

      it('should apply only top border', () => {
        const changes = BorderResolver.resolveBorderChanges(
          singleCellSelection,
          ['top'],
          borderStyle
        );

        expect(changes['A1'].border.top).toEqual(borderStyle);
        expect(changes['A1'].border.right).toBeUndefined();
        expect(changes['A1'].border.bottom).toBeUndefined();
        expect(changes['A1'].border.left).toBeUndefined();
      });

      it('should apply only bottom border', () => {
        const changes = BorderResolver.resolveBorderChanges(
          singleCellSelection,
          ['bottom'],
          borderStyle
        );

        expect(changes['A1'].border.bottom).toEqual(borderStyle);
        expect(changes['A1'].border.top).toBeUndefined();
      });

      it('should apply only left border', () => {
        const changes = BorderResolver.resolveBorderChanges(
          singleCellSelection,
          ['left'],
          borderStyle
        );

        expect(changes['A1'].border.left).toEqual(borderStyle);
        expect(changes['A1'].border.right).toBeUndefined();
      });

      it('should apply only right border', () => {
        const changes = BorderResolver.resolveBorderChanges(
          singleCellSelection,
          ['right'],
          borderStyle
        );

        expect(changes['A1'].border.right).toEqual(borderStyle);
        expect(changes['A1'].border.left).toBeUndefined();
      });
    });

    describe('range operations', () => {
      const rangeSelection = {
        start: { row: 1, col: 0 },
        end: { row: 3, col: 2 }  // A1:C3 (3x3 range)
      };

      it('should apply all borders to all cells in range', () => {
        const changes = BorderResolver.resolveBorderChanges(
          rangeSelection,
          ['all'],
          borderStyle
        );

        // All 9 cells should have borders
        expect(Object.keys(changes).length).toBe(9);

        // Check corner cells
        expect(changes['A1'].border.top).toEqual(borderStyle);
        expect(changes['A1'].border.left).toEqual(borderStyle);
        expect(changes['C3'].border.bottom).toEqual(borderStyle);
        expect(changes['C3'].border.right).toEqual(borderStyle);

        // Check middle cell
        expect(changes['B2'].border.top).toEqual(borderStyle);
        expect(changes['B2'].border.right).toEqual(borderStyle);
        expect(changes['B2'].border.bottom).toEqual(borderStyle);
        expect(changes['B2'].border.left).toEqual(borderStyle);
      });

      it('should apply outer borders only to perimeter cells', () => {
        const changes = BorderResolver.resolveBorderChanges(
          rangeSelection,
          ['outer'],
          borderStyle
        );

        // Top row should have top border
        expect(changes['A1'].border.top).toEqual(borderStyle);
        expect(changes['B1'].border.top).toEqual(borderStyle);
        expect(changes['C1'].border.top).toEqual(borderStyle);

        // Bottom row should have bottom border
        expect(changes['A3'].border.bottom).toEqual(borderStyle);
        expect(changes['B3'].border.bottom).toEqual(borderStyle);
        expect(changes['C3'].border.bottom).toEqual(borderStyle);

        // Left column should have left border
        expect(changes['A1'].border.left).toEqual(borderStyle);
        expect(changes['A2'].border.left).toEqual(borderStyle);
        expect(changes['A3'].border.left).toEqual(borderStyle);

        // Right column should have right border
        expect(changes['C1'].border.right).toEqual(borderStyle);
        expect(changes['C2'].border.right).toEqual(borderStyle);
        expect(changes['C3'].border.right).toEqual(borderStyle);

        // Middle cell (B2) should have no borders from outer
        // It may exist with an empty border object, or not exist at all
        if (changes['B2']) {
          expect(Object.keys(changes['B2'].border).length).toBe(0);
        }
      });

      it('should apply inner borders between cells', () => {
        const changes = BorderResolver.resolveBorderChanges(
          rangeSelection,
          ['inner'],
          borderStyle
        );

        // Inner vertical borders (right side of A and B columns, not C)
        expect(changes['A1'].border.right).toEqual(borderStyle);
        expect(changes['B1'].border.right).toEqual(borderStyle);
        expect(changes['A2'].border.right).toEqual(borderStyle);
        expect(changes['B2'].border.right).toEqual(borderStyle);

        // Inner horizontal borders (bottom side of rows 1 and 2, not 3)
        expect(changes['A1'].border.bottom).toEqual(borderStyle);
        expect(changes['B1'].border.bottom).toEqual(borderStyle);
        expect(changes['C1'].border.bottom).toEqual(borderStyle);
        expect(changes['A2'].border.bottom).toEqual(borderStyle);

        // Last row should NOT have bottom border
        expect(changes['A3']?.border.bottom).toBeUndefined();
        expect(changes['B3']?.border.bottom).toBeUndefined();
        expect(changes['C3']?.border.bottom).toBeUndefined();

        // Last column should NOT have right border
        expect(changes['C1']?.border.right).toBeUndefined();
        expect(changes['C2']?.border.right).toBeUndefined();
      });

      it('should apply inner-h borders (horizontal only)', () => {
        const changes = BorderResolver.resolveBorderChanges(
          rangeSelection,
          ['inner-h'],
          borderStyle
        );

        // Bottom borders between rows
        expect(changes['A1'].border.bottom).toEqual(borderStyle);
        expect(changes['B1'].border.bottom).toEqual(borderStyle);
        expect(changes['C1'].border.bottom).toEqual(borderStyle);
        expect(changes['A2'].border.bottom).toEqual(borderStyle);
        expect(changes['B2'].border.bottom).toEqual(borderStyle);
        expect(changes['C2'].border.bottom).toEqual(borderStyle);

        // No vertical borders
        expect(changes['A1'].border.right).toBeUndefined();
        expect(changes['B1'].border.right).toBeUndefined();
      });

      it('should apply inner-v borders (vertical only)', () => {
        const changes = BorderResolver.resolveBorderChanges(
          rangeSelection,
          ['inner-v'],
          borderStyle
        );

        // Right borders between columns
        expect(changes['A1'].border.right).toEqual(borderStyle);
        expect(changes['B1'].border.right).toEqual(borderStyle);
        expect(changes['A2'].border.right).toEqual(borderStyle);
        expect(changes['B2'].border.right).toEqual(borderStyle);
        expect(changes['A3'].border.right).toEqual(borderStyle);
        expect(changes['B3'].border.right).toEqual(borderStyle);

        // No horizontal borders
        expect(changes['A1'].border.bottom).toBeUndefined();
        expect(changes['B1'].border.bottom).toBeUndefined();
      });

      it('should apply top border to entire top edge', () => {
        const changes = BorderResolver.resolveBorderChanges(
          rangeSelection,
          ['top'],
          borderStyle
        );

        expect(changes['A1'].border.top).toEqual(borderStyle);
        expect(changes['B1'].border.top).toEqual(borderStyle);
        expect(changes['C1'].border.top).toEqual(borderStyle);

        // Other cells should not have top border
        expect(changes['A2']).toBeUndefined();
        expect(changes['A3']).toBeUndefined();
      });

      it('should apply bottom border to entire bottom edge', () => {
        const changes = BorderResolver.resolveBorderChanges(
          rangeSelection,
          ['bottom'],
          borderStyle
        );

        expect(changes['A3'].border.bottom).toEqual(borderStyle);
        expect(changes['B3'].border.bottom).toEqual(borderStyle);
        expect(changes['C3'].border.bottom).toEqual(borderStyle);

        // Top row should not have bottom border
        expect(changes['A1']).toBeUndefined();
      });
    });

    describe('multiple positions', () => {
      const rangeSelection = {
        start: { row: 1, col: 0 },
        end: { row: 2, col: 1 }  // A1:B2 (2x2 range)
      };

      it('should apply multiple border positions', () => {
        const changes = BorderResolver.resolveBorderChanges(
          rangeSelection,
          ['top', 'bottom'],
          borderStyle
        );

        // Top edge should have top border
        expect(changes['A1'].border.top).toEqual(borderStyle);
        expect(changes['B1'].border.top).toEqual(borderStyle);

        // Bottom edge should have bottom border
        expect(changes['A2'].border.bottom).toEqual(borderStyle);
        expect(changes['B2'].border.bottom).toEqual(borderStyle);
      });

      it('should combine all and inner correctly', () => {
        const changes = BorderResolver.resolveBorderChanges(
          rangeSelection,
          ['all'],
          borderStyle
        );

        // All cells should have all borders
        expect(changes['A1'].border.top).toEqual(borderStyle);
        expect(changes['A1'].border.right).toEqual(borderStyle);
        expect(changes['A1'].border.bottom).toEqual(borderStyle);
        expect(changes['A1'].border.left).toEqual(borderStyle);
      });
    });

    describe('clearing borders', () => {
      const singleCellSelection = {
        start: { row: 1, col: 0 },
        end: { row: 1, col: 0 }
      };

      it('should clear borders with null borderStyle', () => {
        const changes = BorderResolver.resolveBorderChanges(
          singleCellSelection,
          ['all'],
          null
        );

        expect(changes['A1'].border.top).toBeNull();
        expect(changes['A1'].border.right).toBeNull();
        expect(changes['A1'].border.bottom).toBeNull();
        expect(changes['A1'].border.left).toBeNull();
      });

      it('should clear all borders with none position', () => {
        const changes = BorderResolver.resolveBorderChanges(
          singleCellSelection,
          ['none'],
          borderStyle  // borderStyle ignored for 'none'
        );

        expect(changes['A1'].border.top).toBeNull();
        expect(changes['A1'].border.right).toBeNull();
        expect(changes['A1'].border.bottom).toBeNull();
        expect(changes['A1'].border.left).toBeNull();
      });
    });

    describe('reversed selection', () => {
      it('should handle reversed selection (end before start)', () => {
        const reversedSelection = {
          start: { row: 3, col: 2 },
          end: { row: 1, col: 0 }  // Selected from C3 to A1
        };

        const changes = BorderResolver.resolveBorderChanges(
          reversedSelection,
          ['outer'],
          borderStyle
        );

        // Should still process as A1:C3
        expect(changes['A1'].border.top).toEqual(borderStyle);
        expect(changes['A1'].border.left).toEqual(borderStyle);
        expect(changes['C3'].border.bottom).toEqual(borderStyle);
        expect(changes['C3'].border.right).toEqual(borderStyle);
      });
    });

    describe('edge cases', () => {
      it('should handle single row range for inner-h', () => {
        const singleRowSelection = {
          start: { row: 1, col: 0 },
          end: { row: 1, col: 2 }  // A1:C1
        };

        const changes = BorderResolver.resolveBorderChanges(
          singleRowSelection,
          ['inner-h'],
          borderStyle
        );

        // No inner horizontal borders for single row
        expect(Object.keys(changes).length).toBe(0);
      });

      it('should handle single column range for inner-v', () => {
        const singleColSelection = {
          start: { row: 1, col: 0 },
          end: { row: 3, col: 0 }  // A1:A3
        };

        const changes = BorderResolver.resolveBorderChanges(
          singleColSelection,
          ['inner-v'],
          borderStyle
        );

        // No inner vertical borders for single column
        expect(Object.keys(changes).length).toBe(0);
      });

      it('should handle 2x2 range inner borders correctly', () => {
        const selection = {
          start: { row: 1, col: 0 },
          end: { row: 2, col: 1 }  // A1:B2
        };

        const changes = BorderResolver.resolveBorderChanges(
          selection,
          ['inner'],
          borderStyle
        );

        // A1 should have right and bottom
        expect(changes['A1'].border.right).toEqual(borderStyle);
        expect(changes['A1'].border.bottom).toEqual(borderStyle);

        // B1 should have bottom only (no right - it's on the edge)
        expect(changes['B1'].border.bottom).toEqual(borderStyle);
        expect(changes['B1'].border.right).toBeUndefined();

        // A2 should have right only (no bottom - it's on the edge)
        expect(changes['A2'].border.right).toEqual(borderStyle);
        expect(changes['A2'].border.bottom).toBeUndefined();

        // B2 should have no inner borders (corner cell)
        // It may exist with an empty border object, or not exist at all
        if (changes['B2']) {
          expect(Object.keys(changes['B2'].border).length).toBe(0);
        }
      });
    });
  });
});
