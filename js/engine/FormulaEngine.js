import { Tokenizer } from './parser/Tokenizer.js';
import { Parser } from './parser/Parser.js';
import { Evaluator } from './Evaluator.js';
import { DependencyGraph } from './DependencyGraph.js';
import { FunctionRegistry } from './FunctionRegistry.js';
import { registerFunctions } from './functions/register.js';
import { CellHelpers } from './utils/CellHelpers.js';
import { TypeCoercion } from './utils/TypeCoercion.js';
import * as FormulaErrors from './utils/FormulaErrors.js';

/**
 * FormulaEngine (Facade)
 *
 * This is the main "facade" class that the rest of the application
 * (e.g., spreadsheet.js) will interact with. It coordinates all
 * parsing, evaluation, and dependency tracking.
 *
 * It holds the "single source of truth" for all cell data, including
 * the raw formula string, the parsed AST, and the cached calculated value.
 */
class FormulaEngine {
  constructor() {
    /**
     * Stores the state for every cell that has a value or formula.
     * @type {Map<string, {
     * formula: string | null,
     * value: any,
     * ast: Object | null,
     * dependencies: Set<string> | null
     * }>}
     */
    this.cellData = new Map();

    /** @type {FunctionRegistry} */
    this.functionRegistry = new FunctionRegistry();

    /** @type {DependencyGraph} */
    this.dependencyGraph = new DependencyGraph();

    // These are static utility classes, no instance needed
    /** @type {CellHelpers} */
    this.cellHelpers = CellHelpers;
    /** @type {TypeCoercion} */
    this.typeCoercion = TypeCoercion;
    /** @type {FormulaErrors} */
    this.formulaErrors = FormulaErrors;

    /** @type {Evaluator} */
    this.evaluator = new Evaluator({
      // The Evaluator needs to be ablef to "call back" to the engine
      // to get values for cells it doesn't know about.
      getCellValue: this.getCellValue.bind(this),
      getRangeValues: this.getRangeValues.bind(this),
      functionRegistry: this.functionRegistry,
      typeCoercion: this.typeCoercion,
      formulaErrors: this.formulaErrors,
    });

    // Load all the built-in functions (SUM, IF, etc.)
    registerFunctions(this.functionRegistry);
  }

  /**
   * Loads the raw cell data from a file.
   * This clears all existing data and recalculates the sheet.
   * @param {Object} fileCellData - The `cells` object from file-manager.js
   * e.g., { "A1": { "value": "5" }, "B1": { "value": "=A1*2", "formula": true } }
   */
  loadData(fileCellData) {
    this.cellData.clear();
    this.dependencyGraph = new DependencyGraph();
    const formulaTasks = [];

    // Pass 1: Set all non-formula (raw) values first.
    // This ensures that when formulas are calculated, the values they
    // depend on are already in the cache.
    for (const [cellId, data] of Object.entries(fileCellData)) {
      if (!data.formula) {
        // Use a private setter to just store the data without
        // triggering a recalculation cascade.
        this._setCellData(cellId, {
          formula: null,
          value: this.typeCoercion.toNumber(data.value) || data.value, // Simple coercion
          ast: null,
          dependencies: null,
        });
      } else {
        formulaTasks.push([cellId, data.value]); // data.value holds the formula string
      }
    }

    // Pass 2: Now, set all formulas. This will parse, evaluate,
    // and build the dependency graph.
    // We sort to make sure simple cells are set before complex ones
    // (A basic attempt, a full topological sort on load is complex).
    formulaTasks.sort((a, b) => a[1].length - b[1].length);

    for (const [cellId, formulaString] of formulaTasks) {
      // Use the public setFormula method, which handles all logic.
      this.setFormula(cellId, formulaString);
    }
  }

  /**
   * Sets a formula for a cell, triggering all parsing and calculation.
   * This is the primary method for setting a formula.
   * @param {string} cellId - The cell to set (e.g., "B1").
   * @param {string} formulaString - The raw formula string (e.g., "=A1*2").
   * @returns {Object} An "update set" object of all cells that were
   * changed as a result (e.g., { "B1": 10, "C1": 20 }).
   */
  setFormula(cellId, formulaString) {
    // If it's not a formula, treat it as a raw value.
    if (!formulaString || !formulaString.startsWith('=')) {
      return this.setCellValue(cellId, formulaString);
    }

    // ✅ Check if the formula is exactly the same
    const existingData = this.cellData.get(cellId);
    if (existingData && existingData.formula === formulaString) {
      // Formula hasn't changed, return current value without recalculating
      return { [cellId]: existingData.value };
    }

    // 1. Parse the string into an Abstract Syntax Tree (AST)
    let ast;
    try {
      const tokenizer = new Tokenizer(formulaString.substring(1));
      const tokens = tokenizer.tokenize();
      const parser = new Parser(tokens);
      ast = parser.parse();
    } catch (error) {
      // Handle parsing syntax errors (e.g., "=(1+2")
      const syntaxError = new this.formulaErrors.NameError('Syntax Error');
      this._setCellData(cellId, {
        formula: formulaString,
        value: syntaxError,
        ast: null,
        dependencies: null,
      });
      this.dependencyGraph.clear(cellId);
      return { [cellId]: syntaxError };
    }

    // 2. Extract all cell/range dependencies from the AST
    const dependencies = this._extractDependencies(ast);

    // 3. Check for Circular References
    if (this.dependencyGraph.checkForCircularReference(cellId, dependencies)) {
      const circError = new this.formulaErrors.RefError('Circular dependency');
      this._setCellData(cellId, {
        formula: formulaString,
        value: circError,
        ast: null, // Don't store a bad AST
        dependencies: null,
      });
      this.dependencyGraph.clear(cellId);
      return { [cellId]: circError };
    }

    // 4. Update the dependency graph
    this.dependencyGraph.updateDependencies(cellId, dependencies);

    // 5. Evaluate the AST to get the initial value
    const value = this.evaluator.evaluate(ast);

    // 6. Store the new cell state
    this._setCellData(cellId, {
      formula: formulaString,
      value: value,
      ast: ast,
      dependencies: dependencies,
    });

    // 7. Recalculate all cells that depend on this one
    const updates = this._recalculateDependents(cellId);
    updates[cellId] = value; // Add this cell's new value to the update set

    return updates;
  }

  /**
   * Sets a raw value for a cell (text, number).
   * This clears any existing formula and triggers recalculation.
   * @param {string} cellId - The cell to set (e.g., "A1").
   * @param {*} value - The raw value to set (e.g., 5).
   * @returns {Object} An "update set" of all changed cells.
   */
  setCellValue(cellId, value) {
    // Clear any old formulas/dependencies
    this.dependencyGraph.clear(cellId);

    // Store the new raw value
    this._setCellData(cellId, {
      formula: null,
      value: value,
      ast: null,
      dependencies: null,
    });

    // Recalculate all cells that *used* to depend on this
    const updates = this._recalculateDependents(cellId);
    updates[cellId] = value;

    return updates;
  }

  /**
   * Clears a cell's formula and value.
   * @param {string} cellId - The cell to clear.
   * @returns {Object} An "update set" of all changed cells.
   */
  clearCell(cellId) {
    this.dependencyGraph.clear(cellId);
    this.cellData.delete(cellId);

    // Recalculate dependents, which will now get `undefined`
    const updates = this._recalculateDependents(cellId);
    updates[cellId] = undefined; // Mark this cell as cleared

    return updates;
  }

  /**
   * Gets the calculated (cached) value for a cell.
   * This is the main "getter" for the Evaluator and the Spreadsheet.
   * @param {string} cellId
   * @returns {*} The calculated value, or `undefined` if empty.
   */
  getCellValue(cellId) {
    // Normalize cell ID to strip $ markers (e.g., "$A$1" → "A1")
    const normalizedId = this.cellHelpers.normalizeCellId(cellId);
    const data = this.cellData.get(normalizedId);
    return data ? data.value : undefined;
  }

  /**
   * Gets the raw formula string for a cell (for the formula bar).
   * @param {string} cellId
   * @returns {string} The formula string (e.g., "=A1+B1") or raw value.
   */
  getFormulaString(cellId) {
    const data = this.cellData.get(cellId);
    if (!data) return '';
    return data.formula || data.value;
  }

  /**
   * Gets an array of values for a range.
   * @param {string} startCell - e.g., "A1" or "$A$1"
   * @param {string} endCell - e.g., "B2" or "$B$2"
   * @returns {Array<*>} A 1D array of values.
   */
  getRangeValues(startCell, endCell) {
    // Normalize range endpoints to strip $ markers before expanding
    const normalizedStart = this.cellHelpers.normalizeCellId(startCell);
    const normalizedEnd = this.cellHelpers.normalizeCellId(endCell);
    const cellIds = this.cellHelpers.expandRange(normalizedStart, normalizedEnd);
    return cellIds.map((id) => this.getCellValue(id));
  }

  // --- Private Helper Methods ---

  /**
   * Recalculates all cells that depend on a changed cell.
   * @param {string} cellId - The cell that just changed.
   * @returns {Object} The "update set" (e.g., { "C1": 20 }).
   * @private
   */
  _recalculateDependents(cellId) {
    const updates = {};
    const order = this.dependencyGraph.getRecalculationOrder(cellId);

    for (const depCellId of order) {
      const data = this.cellData.get(depCellId);

      // Only recalculate cells that are formulas
      if (data && data.ast) {
        const newValue = this.evaluator.evaluate(data.ast);
        // Update the cache *and* the updates object
        data.value = newValue;
        updates[depCellId] = newValue;
      }
    }
    return updates;
  }

  /**
   * Safely sets the data for a cell in the internal cache.
   * @param {string} cellId
   * @param {Object} data
   * @private
   */
  _setCellData(cellId, data) {
    this.cellData.set(cellId, data);
  }

  /**
   * Recursively walks an AST to find all cell and range dependencies.
   * @param {Object} ast - The Abstract Syntax Tree node.
   * @returns {Set<string>} A Set of all dependent cell IDs.
   * @private
   */
  _extractDependencies(ast) {
    const dependencies = new Set();
    const visit = (node) => {
      if (!node) return;

      switch (node.type) {
        case 'cell':
          // Normalize cell ID to strip $ markers before adding to dependencies
          dependencies.add(this.cellHelpers.normalizeCellId(node.ref));
          return;
        case 'range':
          // Normalize range endpoints before expanding
          const normalizedStart = this.cellHelpers.normalizeCellId(node.start);
          const normalizedEnd = this.cellHelpers.normalizeCellId(node.end);
          this.cellHelpers
            .expandRange(normalizedStart, normalizedEnd)
            .forEach((id) => dependencies.add(id));
          return;

        // --- Recursive Cases ---
        case 'operator':
          visit(node.left);
          visit(node.right);
          return;
        case 'unary':
          visit(node.operand);
          return;
        case 'group':
          visit(node.expression);
          return;
        case 'function':
          node.args.forEach(visit);
          return;
      }
    };
    visit(ast);
    return dependencies;
  }
}

// Export the class for ES6 Modules
export { FormulaEngine };
