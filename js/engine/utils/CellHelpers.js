/**
 * CellHelpers
 *
 * This class provides static utility methods for parsing, manipulating,
 * and expanding cell and range references.
 *
 * All methods are 0-indexed internally (col 0 = 'A', row 0 = '1').
 */
class CellHelpers {
  /**
   * Regular expression to parse a cell reference.
   * Handles absolute ($A$1) and relative (A1) references.
   * Group 1: Optional $ for column
   * Group 2: Column letters (A, B, ... AA, AB, ...)
   * Group 3: Optional $ for row
   * Group 4: Row number (1, 2, ...)
   */
  static cellRefRegex = /^(\$)?([A-Z]+)(\$)?([0-9]+)$/;

  /**
   * Converts a column letter (e.g., "A", "B", "AA") to a 0-based index.
   * @param {string} colStr - The column letter(s).
   * @returns {number} The 0-based column index (A=0, B=1, AA=26).
   */
  static colLetterToIdx(colStr) {
    let index = 0;
    for (let i = 0; i < colStr.length; i++) {
      index = index * 26 + (colStr.charCodeAt(i) - 65 + 1);
    }
    return index - 1; // Adjust to 0-based
  }

  /**
   * Converts a 0-based column index to its letter representation.
   * @param {number} colIdx - The 0-based column index.
   * @returns {string} The column letter(s) (0=A, 1=B, 26=AA).
   */
  static colIdxToLetter(colIdx) {
    let letter = '';
    let num = colIdx + 1; // Adjust to 1-based for calculation
    while (num > 0) {
      let remainder = (num - 1) % 26;
      letter = String.fromCharCode(65 + remainder) + letter;
      num = Math.floor((num - 1) / 26);
    }
    return letter;
  }

  /**
   * Parses a cell reference string (e.g., "$A1") into its components.
   * @param {string} cellId - The cell reference string (e.g., "A1", "$B$10").
   * @returns {Object|null} An object with { col, row, colAbs, rowAbs } or null if invalid.
   * `col` and `row` are 0-based.
   */
  static parseCellRef(cellId) {
    const match = cellId.toUpperCase().match(this.cellRefRegex);

    if (!match) {
      return null; // Invalid format
    }

    const [_, colAbs, colStr, rowAbs, rowStr] = match;
    const col = this.colLetterToIdx(colStr);
    const row = parseInt(rowStr, 10) - 1; // 1-based row to 0-based

    if (row < 0) {
      return null; // Row 0 is invalid, must be 1 or greater
    }

    return {
      col: col,
      row: row,
      colAbs: !!colAbs, // Is the column absolute?
      rowAbs: !!rowAbs, // Is the row absolute?
    };
  }

  /**
   * Creates a cell ID string from 0-based indices.
   * @param {number} row - 0-based row index.
   * @param {number} col - 0-based column index.
   * @returns {string} The cell ID (e.g., "A1").
   */
  static buildCellId(row, col) {
    const colStr = this.colIdxToLetter(col);
    const rowStr = row + 1; // 0-based to 1-based
    return `${colStr}${rowStr}`;
  }

  /**
   * Expands a range (e.g., "A1:B2") into an array of cell IDs.
   * @param {string} startCell - The top-left cell of the range (e.g., "A1").
   * @param {string} endCell - The bottom-right cell of the range (e.g., "B2").
   * @returns {Array<string>} An array of all cell IDs within the range.
   */
  static expandRange(startCell, endCell) {
    const start = this.parseCellRef(startCell);
    const end = this.parseCellRef(endCell);

    if (!start || !end) {
      throw new Error('Invalid range reference');
    }

    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);

    const cells = [];
    for (let c = minCol; c <= maxCol; c++) {
      for (let r = minRow; r <= maxRow; r++) {
        cells.push(this.buildCellId(r, c));
      }
    }
    return cells;
  }

  /**
   * Resolves a cell reference relative to a base cell.
   * (This is a more advanced function for copy/paste and formula filling)
   *
   * @param {Object} ref - The parsed reference (from parseCellRef).
   * @param {Object} base - The parsed base cell { row, col } (from parseCellRef).
   * @param {number} rowOffset - The number of rows to offset (e.g., for copy-paste).
   * @param {number} colOffset - The number of columns to offset.
   * @returns {string} The new, resolved cell ID.
   */
  static resolveRelativeRef(ref, base, rowOffset = 0, colOffset = 0) {
    const newRow = ref.rowAbs ? ref.row : ref.row - base.row + rowOffset;
    const newCol = ref.colAbs ? ref.col : ref.col - base.col + colOffset;

    // Ensure we don't go off the grid (e.g., negative indices)
    const finalRow = Math.max(0, newRow);
    const finalCol = Math.max(0, newCol);

    return this.buildCellId(finalRow, finalCol);
  }
}

// Export the class for ES6 Modules
export { CellHelpers };
