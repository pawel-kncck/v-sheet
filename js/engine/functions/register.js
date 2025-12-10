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
import { textFunctions } from './text.js';
import { lookupFunctions } from './lookup.js';

/**
 * Populates a given FunctionRegistry with all built-in functions.
 *
 * @param {FunctionRegistry} registry - The registry instance to populate.
 */
export function registerFunctions(registry) {
  // 2. Register the Math functions
  registry.register('SUM', mathFunctions.SUM);
  registry.register('AVERAGE', mathFunctions.AVERAGE);
  registry.register('MIN', mathFunctions.MIN);
  registry.register('MAX', mathFunctions.MAX);
  registry.register('COUNT', mathFunctions.COUNT);
  registry.register('COUNTA', mathFunctions.COUNTA);
  registry.register('ROUND', mathFunctions.ROUND);
  registry.register('SUMIF', mathFunctions.SUMIF);
  registry.register('SUMPRODUCT', mathFunctions.SUMPRODUCT);

  // 3. Register the Logical functions
  registry.register('IF', logicalFunctions.IF);
  registry.register('AND', logicalFunctions.AND);
  registry.register('OR', logicalFunctions.OR);
  registry.register('NOT', logicalFunctions.NOT);

  // 4. Register the Text functions
  registry.register('LEN', textFunctions.LEN);
  registry.register('UPPER', textFunctions.UPPER);
  registry.register('LOWER', textFunctions.LOWER);
  registry.register('TRIM', textFunctions.TRIM);
  registry.register('CONCATENATE', textFunctions.CONCATENATE);
  registry.register('LEFT', textFunctions.LEFT);
  registry.register('RIGHT', textFunctions.RIGHT);
  registry.register('MID', textFunctions.MID);

  // 5. Register the Lookup functions
  registry.register('VLOOKUP', lookupFunctions.VLOOKUP);
}

// If using CommonJS (for the worker's importScripts)
// We need to handle this differently since workers don't support ES6 modules
// by default. For the worker, we'll need to adjust its import method.
// For now, this ES6 export is correct for the main engine.
