/**
 * Function Registration
 *
 * This file imports all the individual function definitions from
 * other files (math.js, logical.js, etc.) and exports a
 * single method, `registerFunctions`.
 *
 * The FormulaEngine calls this method to populate its
 * FunctionRegistry with all available functions.
 */

// 1. Import the function implementations
import { mathFunctions } from './math.js';
import { logicalFunctions } from './logical.js';
// We will import text.js, lookup.js, etc. here later

/**
 * Populates a given FunctionRegistry with all built-in functions.
 *
 * @param {FunctionRegistry} registry - The registry instance to populate.
 */
export function registerFunctions(registry) {
  // 2. Register the Math functions
  registry.register('SUM', mathFunctions.SUM);
  // registry.register("AVERAGE", mathFunctions.AVERAGE); // ...etc

  // 3. Register the Logical functions
  registry.register('IF', logicalFunctions.IF);
  // registry.register("AND", logicalFunctions.AND); // ...etc

  // 4. Register other function categories...
}

// If using CommonJS (for the worker's importScripts)
// We need to handle this differently since workers don't support ES6 modules
// by default. For the worker, we'll need to adjust its import method.
// For now, this ES6 export is correct for the main engine.
