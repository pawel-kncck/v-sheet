/**
 * FillPatternDetector - Analyzes source data and generates fill values
 *
 * Supports:
 * - Numeric sequences (linear regression)
 * - Cyclic copy (formulas/text)
 * - Mixed content (per-column/per-row analysis)
 */
export class FillPatternDetector {
  /**
   * Determine if a sequence is numeric-only (eligible for linear regression)
   * @param {Array<{value: string, isFormula: boolean}>} cells
   * @returns {boolean}
   */
  static isNumericSequence(cells) {
    if (cells.length === 0) return false;

    return cells.every(cell => {
      // Empty cells don't make it numeric
      if (!cell.value && cell.value !== 0) return false;

      // Formulas don't make it numeric (they get cyclic copy)
      if (cell.isFormula) return false;

      // Check if it's a valid number
      const num = parseFloat(cell.value);
      return !isNaN(num) && isFinite(num);
    });
  }

  /**
   * Calculate linear regression parameters
   * @param {number[]} values - Numeric values in order
   * @returns {{slope: number, intercept: number}}
   */
  static calculateLinearRegression(values) {
    if (values.length === 0) {
      return { slope: 0, intercept: 0 };
    }

    if (values.length === 1) {
      return { slope: 0, intercept: values[0] };
    }

    // Simple linear regression: slope = (last - first) / (n - 1)
    const n = values.length;
    const slope = (values[n - 1] - values[0]) / (n - 1);
    const intercept = values[0];

    return { slope, intercept };
  }

  /**
   * Generate fill values for a numeric sequence
   * @param {number[]} sourceValues - Source numeric values
   * @param {number} count - Number of values to generate
   * @param {boolean} reverse - Fill in reverse direction
   * @returns {number[]}
   */
  static generateNumericFill(sourceValues, count, reverse = false) {
    const { slope, intercept } = this.calculateLinearRegression(sourceValues);
    const result = [];

    const n = sourceValues.length;

    for (let i = 0; i < count; i++) {
      let position;
      if (reverse) {
        // Fill backwards: -1, -2, -3, ...
        position = -(i + 1);
      } else {
        // Fill forwards: n, n+1, n+2, ...
        position = n + i;
      }

      const value = intercept + slope * position;
      result.push(value);
    }

    return result;
  }

  /**
   * Generate fill values for cyclic copy (formulas/text)
   * @param {Array<{value: string, sourceCoords: {row, col}}>} sourceData
   * @param {number} count - Number of values to generate
   * @param {boolean} reverse - Fill in reverse direction
   * @returns {Array<{value: string, sourceCoords: {row, col}}>}
   */
  static generateCyclicFill(sourceData, count, reverse = false) {
    const result = [];
    const n = sourceData.length;

    for (let i = 0; i < count; i++) {
      let sourceIndex;
      if (reverse) {
        // Cycle backwards through source
        sourceIndex = ((n - 1) - (i % n) + n) % n;
      } else {
        // Cycle forwards through source
        sourceIndex = i % n;
      }

      result.push({
        value: sourceData[sourceIndex].value,
        sourceCoords: sourceData[sourceIndex].sourceCoords
      });
    }

    return result;
  }

  /**
   * Main entry point - analyze source and generate fill data
   * @param {Object} params
   * @param {Array} params.sourceRange - Source cells with values [{cellId, value, isFormula, style, coords}]
   * @param {Object} params.targetRange - Target range bounds {minRow, maxRow, minCol, maxCol}
   * @param {'horizontal'|'vertical'} params.fillDirection
   * @param {boolean} params.reverse - Filling backwards
   * @returns {Array<{cellId, value, style, sourceRow, sourceCol, targetRow, targetCol}>}
   */
  static generateFillData(params) {
    const { sourceRange, targetRange, fillDirection, reverse } = params;
    const result = [];

    if (!sourceRange || sourceRange.length === 0) {
      return result;
    }

    // Organize source data by rows/columns
    const sourceByRowCol = this._organizeSourceData(sourceRange);

    if (fillDirection === 'vertical') {
      // Fill down or up
      result.push(...this._generateVerticalFill(sourceByRowCol, targetRange, reverse));
    } else {
      // Fill right or left
      result.push(...this._generateHorizontalFill(sourceByRowCol, targetRange, reverse));
    }

    return result;
  }

  /**
   * Organize source data into a 2D structure
   * @private
   */
  static _organizeSourceData(sourceRange) {
    const byRow = new Map();
    const byCol = new Map();

    let minRow = Infinity, maxRow = -Infinity;
    let minCol = Infinity, maxCol = -Infinity;

    for (const cell of sourceRange) {
      const { row, col } = cell.coords;

      minRow = Math.min(minRow, row);
      maxRow = Math.max(maxRow, row);
      minCol = Math.min(minCol, col);
      maxCol = Math.max(maxCol, col);

      if (!byRow.has(row)) byRow.set(row, []);
      if (!byCol.has(col)) byCol.set(col, []);

      byRow.get(row).push(cell);
      byCol.get(col).push(cell);
    }

    // Sort cells within each row/column
    for (const cells of byRow.values()) {
      cells.sort((a, b) => a.coords.col - b.coords.col);
    }
    for (const cells of byCol.values()) {
      cells.sort((a, b) => a.coords.row - b.coords.row);
    }

    return { byRow, byCol, minRow, maxRow, minCol, maxCol };
  }

  /**
   * Generate vertical fill (down or up)
   * @private
   */
  static _generateVerticalFill(sourceByRowCol, targetRange, reverse) {
    const { byCol, minRow, maxRow } = sourceByRowCol;
    const result = [];

    // For each column in the source
    for (const [col, cells] of byCol) {
      if (col < targetRange.minCol || col > targetRange.maxCol) continue;

      // Determine fill count (only cells outside source range)
      let fillCount;
      if (reverse) {
        // Filling upwards: from minRow - 1 down to targetRange.minRow
        fillCount = minRow - targetRange.minRow;
      } else {
        // Filling downwards: from maxRow + 1 down to targetRange.maxRow
        fillCount = targetRange.maxRow - maxRow;
      }

      if (fillCount <= 0) continue; // No fill needed

      // Analyze pattern for this column
      const isNumeric = this.isNumericSequence(cells);

      if (isNumeric) {
        // Linear regression
        const values = cells.map(c => parseFloat(c.value));
        const fillValues = this.generateNumericFill(values, fillCount, reverse);

        for (let i = 0; i < fillCount; i++) {
          const targetRow = reverse ? (targetRange.minRow + i) : (maxRow + 1 + i);
          // When reverse, fillValues are generated for positions -1, -2, -3...
          // but we want to assign them to minRow, minRow+1, minRow+2...
          // So we need to reverse the array index
          const valueIndex = reverse ? (fillCount - 1 - i) : i;

          result.push({
            cellId: this._getCellId(targetRow, col),
            value: fillValues[valueIndex].toString(),
            style: cells[0].style, // Use first source cell's style
            sourceRow: cells[0].coords.row,
            sourceCol: cells[0].coords.col,
            targetRow,
            targetCol: col
          });
        }
      } else {
        // Cyclic copy
        const sourceData = cells.map(c => ({
          value: c.value,
          sourceCoords: c.coords
        }));
        const fillData = this.generateCyclicFill(sourceData, fillCount, reverse);

        for (let i = 0; i < fillCount; i++) {
          const targetRow = reverse ? (targetRange.minRow + i) : (maxRow + 1 + i);

          const sourceIndex = i % cells.length;
          result.push({
            cellId: this._getCellId(targetRow, col),
            value: fillData[i].value,
            style: cells[sourceIndex].style,
            sourceRow: fillData[i].sourceCoords.row,
            sourceCol: fillData[i].sourceCoords.col,
            targetRow,
            targetCol: col
          });
        }
      }
    }

    return result;
  }

  /**
   * Generate horizontal fill (right or left)
   * @private
   */
  static _generateHorizontalFill(sourceByRowCol, targetRange, reverse) {
    const { byRow, minCol, maxCol } = sourceByRowCol;
    const result = [];

    // For each row in the source
    for (const [row, cells] of byRow) {
      if (row < targetRange.minRow || row > targetRange.maxRow) continue;

      // Determine fill count (only cells outside source range)
      let fillCount;
      if (reverse) {
        // Filling leftwards: from minCol - 1 left to targetRange.minCol
        fillCount = minCol - targetRange.minCol;
      } else {
        // Filling rightwards: from maxCol + 1 right to targetRange.maxCol
        fillCount = targetRange.maxCol - maxCol;
      }

      if (fillCount <= 0) continue; // No fill needed

      // Analyze pattern for this row
      const isNumeric = this.isNumericSequence(cells);

      if (isNumeric) {
        // Linear regression
        const values = cells.map(c => parseFloat(c.value));
        const fillValues = this.generateNumericFill(values, fillCount, reverse);

        for (let i = 0; i < fillCount; i++) {
          const targetCol = reverse ? (targetRange.minCol + i) : (maxCol + 1 + i);
          // When reverse, fillValues are generated for positions -1, -2, -3...
          // but we want to assign them to minCol, minCol+1, minCol+2...
          // So we need to reverse the array index
          const valueIndex = reverse ? (fillCount - 1 - i) : i;

          result.push({
            cellId: this._getCellId(row, targetCol),
            value: fillValues[valueIndex].toString(),
            style: cells[0].style,
            sourceRow: cells[0].coords.row,
            sourceCol: cells[0].coords.col,
            targetRow: row,
            targetCol
          });
        }
      } else {
        // Cyclic copy
        const sourceData = cells.map(c => ({
          value: c.value,
          sourceCoords: c.coords
        }));
        const fillData = this.generateCyclicFill(sourceData, fillCount, reverse);

        for (let i = 0; i < fillCount; i++) {
          const targetCol = reverse ? (targetRange.minCol + i) : (maxCol + 1 + i);

          const sourceIndex = i % cells.length;
          result.push({
            cellId: this._getCellId(row, targetCol),
            value: fillData[i].value,
            style: cells[sourceIndex].style,
            sourceRow: fillData[i].sourceCoords.row,
            sourceCol: fillData[i].sourceCoords.col,
            targetRow: row,
            targetCol
          });
        }
      }
    }

    return result;
  }

  /**
   * Convert row/col to cellId (e.g., "A1")
   * @private
   */
  static _getCellId(row, col) {
    const colLetter = String.fromCharCode(65 + col); // 0 = 'A', 1 = 'B', etc.
    return `${colLetter}${row}`; // Row is already 1-indexed
  }
}
