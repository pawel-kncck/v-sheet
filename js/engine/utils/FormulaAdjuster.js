import { Tokenizer } from '../parser/Tokenizer.js';
import { CellHelpers } from './CellHelpers.js';

/**
 * FormulaAdjuster
 *
 * Utility class for manipulating formulas - adjusting references during
 * copy/paste and cycling absolute/relative reference formats (F4 key).
 */
class FormulaAdjuster {
  /**
   * Adjusts all cell references in a formula by the given offset.
   * Respects absolute ($) markers.
   *
   * @param {string} formula - The formula string (e.g., "=A1+$B$2")
   * @param {number} rowOffset - Rows to shift (positive = down)
   * @param {number} colOffset - Columns to shift (positive = right)
   * @returns {string} Adjusted formula
   */
  static adjustFormula(formula, rowOffset, colOffset) {
    if (!formula.startsWith('=')) return formula;

    const tokenizer = new Tokenizer(formula.substring(1));
    const tokens = tokenizer.tokenize();

    let result = '=';
    for (const token of tokens) {
      if (token.type === 'CELL_REF') {
        const parsed = CellHelpers.parseCellRef(token.value);
        if (parsed) {
          result += CellHelpers.resolveRelativeRef(parsed, rowOffset, colOffset);
        } else {
          result += token.value;
        }
      } else {
        result += token.value;
      }
    }
    return result;
  }

  /**
   * Cycles a cell reference through absolute formats.
   * A1 → $A$1 → A$1 → $A1 → A1
   * Also handles range references: B1:B3 → $B$1:$B$3 → B$1:B$3 → $B1:$B3 → B1:B3
   *
   * @param {string} ref - Cell reference string (single cell or range)
   * @returns {string} Next format in cycle
   */
  static cycleReferenceFormat(ref) {
    // Check if this is a range reference
    if (ref.includes(':')) {
      const [start, end] = ref.split(':');
      const cycledStart = this.cycleReferenceFormat(start);
      const cycledEnd = this.cycleReferenceFormat(end);
      return `${cycledStart}:${cycledEnd}`;
    }

    // Single cell reference
    const parsed = CellHelpers.parseCellRef(ref);
    if (!parsed) return ref;

    const { row, col, colAbs, rowAbs } = parsed;

    // Determine next state in cycle
    if (!colAbs && !rowAbs) {
      // A1 → $A$1
      return CellHelpers.buildCellRef(row, col, true, true);
    } else if (colAbs && rowAbs) {
      // $A$1 → A$1
      return CellHelpers.buildCellRef(row, col, false, true);
    } else if (!colAbs && rowAbs) {
      // A$1 → $A1
      return CellHelpers.buildCellRef(row, col, true, false);
    } else {
      // $A1 → A1
      return CellHelpers.buildCellRef(row, col, false, false);
    }
  }
}

export { FormulaAdjuster };
