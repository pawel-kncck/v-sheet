import { CellHelpers } from '../engine/utils/CellHelpers.js';

/**
 * BorderResolver
 * Converts high-level border position selections into cell-specific border changes.
 *
 * Position Logic:
 * - 'all': Every cell gets borders on all 4 sides
 * - 'outer': Only perimeter cells get borders (top row gets top, etc.)
 * - 'inner': Only borders between cells (excludes outer edges)
 * - 'inner-h': Horizontal borders between rows (excludes top/bottom edges)
 * - 'inner-v': Vertical borders between columns (excludes left/right edges)
 * - 'top': Top edge of range gets top border
 * - 'bottom': Bottom edge of range gets bottom border
 * - 'left': Left edge of range gets left border
 * - 'right': Right edge of range gets right border
 * - 'none': Clear all borders
 */
export class BorderResolver {
  /**
   * Resolves border position selections to cell-specific border changes
   * @param {Object} selection - { start: {row, col}, end: {row, col} }
   * @param {string[]} positions - Array of position names ['top', 'bottom', 'outer', ...]
   * @param {Object|null} borderStyle - { style: 'solid', color: '#000', width: 1 } or null to clear
   * @returns {Object} Map of cellId → { border: { top?, right?, bottom?, left? } }
   */
  static resolveBorderChanges(selection, positions, borderStyle) {
    const changes = {};

    // Normalize selection bounds
    const minRow = Math.min(selection.start.row, selection.end.row);
    const maxRow = Math.max(selection.start.row, selection.end.row);
    const minCol = Math.min(selection.start.col, selection.end.col);
    const maxCol = Math.max(selection.start.col, selection.end.col);

    // Process each position
    for (const position of positions) {
      switch (position) {
        case 'all':
          this._applyAll(changes, minRow, maxRow, minCol, maxCol, borderStyle);
          break;
        case 'outer':
          this._applyOuter(changes, minRow, maxRow, minCol, maxCol, borderStyle);
          break;
        case 'inner':
          this._applyInner(changes, minRow, maxRow, minCol, maxCol, borderStyle);
          break;
        case 'inner-h':
          this._applyInnerHorizontal(changes, minRow, maxRow, minCol, maxCol, borderStyle);
          break;
        case 'inner-v':
          this._applyInnerVertical(changes, minRow, maxRow, minCol, maxCol, borderStyle);
          break;
        case 'top':
          this._applyTop(changes, minRow, minCol, maxCol, borderStyle);
          break;
        case 'bottom':
          this._applyBottom(changes, maxRow, minCol, maxCol, borderStyle);
          break;
        case 'left':
          this._applyLeft(changes, minRow, maxRow, minCol, borderStyle);
          break;
        case 'right':
          this._applyRight(changes, minRow, maxRow, maxCol, borderStyle);
          break;
        case 'none':
          this._clearAll(changes, minRow, maxRow, minCol, maxCol);
          break;
      }
    }

    return changes;
  }

  /**
   * Apply borders on all 4 sides of every cell in range
   */
  static _applyAll(changes, minRow, maxRow, minCol, maxCol, borderStyle) {
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const cellId = this._getCellId(row, col);
        this._ensureCell(changes, cellId);
        changes[cellId].border.top = borderStyle ? { ...borderStyle } : null;
        changes[cellId].border.right = borderStyle ? { ...borderStyle } : null;
        changes[cellId].border.bottom = borderStyle ? { ...borderStyle } : null;
        changes[cellId].border.left = borderStyle ? { ...borderStyle } : null;
      }
    }
  }

  /**
   * Apply borders only on the outer perimeter of the range
   */
  static _applyOuter(changes, minRow, maxRow, minCol, maxCol, borderStyle) {
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const cellId = this._getCellId(row, col);
        this._ensureCell(changes, cellId);

        // Top edge
        if (row === minRow) {
          changes[cellId].border.top = borderStyle ? { ...borderStyle } : null;
        }
        // Bottom edge
        if (row === maxRow) {
          changes[cellId].border.bottom = borderStyle ? { ...borderStyle } : null;
        }
        // Left edge
        if (col === minCol) {
          changes[cellId].border.left = borderStyle ? { ...borderStyle } : null;
        }
        // Right edge
        if (col === maxCol) {
          changes[cellId].border.right = borderStyle ? { ...borderStyle } : null;
        }
      }
    }
  }

  /**
   * Apply borders only between cells (excludes outer edges)
   */
  static _applyInner(changes, minRow, maxRow, minCol, maxCol, borderStyle) {
    // For single cell, inner borders don't apply
    if (minRow === maxRow && minCol === maxCol) {
      return;
    }

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const cellId = this._getCellId(row, col);
        this._ensureCell(changes, cellId);

        // Inner horizontal borders (bottom of each cell except last row)
        if (row < maxRow) {
          changes[cellId].border.bottom = borderStyle ? { ...borderStyle } : null;
        }
        // Inner vertical borders (right of each cell except last column)
        if (col < maxCol) {
          changes[cellId].border.right = borderStyle ? { ...borderStyle } : null;
        }
      }
    }
  }

  /**
   * Apply only horizontal borders between rows
   */
  static _applyInnerHorizontal(changes, minRow, maxRow, minCol, maxCol, borderStyle) {
    // For single row, no horizontal inner borders
    if (minRow === maxRow) {
      return;
    }

    for (let row = minRow; row < maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const cellId = this._getCellId(row, col);
        this._ensureCell(changes, cellId);
        changes[cellId].border.bottom = borderStyle ? { ...borderStyle } : null;
      }
    }
  }

  /**
   * Apply only vertical borders between columns
   */
  static _applyInnerVertical(changes, minRow, maxRow, minCol, maxCol, borderStyle) {
    // For single column, no vertical inner borders
    if (minCol === maxCol) {
      return;
    }

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col < maxCol; col++) {
        const cellId = this._getCellId(row, col);
        this._ensureCell(changes, cellId);
        changes[cellId].border.right = borderStyle ? { ...borderStyle } : null;
      }
    }
  }

  /**
   * Apply top border to the top edge of range
   */
  static _applyTop(changes, row, minCol, maxCol, borderStyle) {
    for (let col = minCol; col <= maxCol; col++) {
      const cellId = this._getCellId(row, col);
      this._ensureCell(changes, cellId);
      changes[cellId].border.top = borderStyle ? { ...borderStyle } : null;
    }
  }

  /**
   * Apply bottom border to the bottom edge of range
   */
  static _applyBottom(changes, row, minCol, maxCol, borderStyle) {
    for (let col = minCol; col <= maxCol; col++) {
      const cellId = this._getCellId(row, col);
      this._ensureCell(changes, cellId);
      changes[cellId].border.bottom = borderStyle ? { ...borderStyle } : null;
    }
  }

  /**
   * Apply left border to the left edge of range
   */
  static _applyLeft(changes, minRow, maxRow, col, borderStyle) {
    for (let row = minRow; row <= maxRow; row++) {
      const cellId = this._getCellId(row, col);
      this._ensureCell(changes, cellId);
      changes[cellId].border.left = borderStyle ? { ...borderStyle } : null;
    }
  }

  /**
   * Apply right border to the right edge of range
   */
  static _applyRight(changes, minRow, maxRow, col, borderStyle) {
    for (let row = minRow; row <= maxRow; row++) {
      const cellId = this._getCellId(row, col);
      this._ensureCell(changes, cellId);
      changes[cellId].border.right = borderStyle ? { ...borderStyle } : null;
    }
  }

  /**
   * Clear all borders from all cells in range
   */
  static _clearAll(changes, minRow, maxRow, minCol, maxCol) {
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const cellId = this._getCellId(row, col);
        this._ensureCell(changes, cellId);
        changes[cellId].border = {
          top: null,
          right: null,
          bottom: null,
          left: null
        };
      }
    }
  }

  /**
   * Ensure cell exists in changes map with border structure
   */
  static _ensureCell(changes, cellId) {
    if (!changes[cellId]) {
      changes[cellId] = { border: {} };
    }
    if (!changes[cellId].border) {
      changes[cellId].border = {};
    }
  }

  /**
   * Convert row/col to cell ID
   */
  static _getCellId(row, col) {
    const colLetter = String.fromCharCode(65 + col);
    return `${colLetter}${row}`;
  }
}
