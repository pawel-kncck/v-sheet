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
import { datetimeFunctions } from './datetime.js';
import { infoFunctions } from './info.js';

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
  registry.register('ABS', mathFunctions.ABS);
  registry.register('CEILING', mathFunctions.CEILING);
  registry.register('FLOOR', mathFunctions.FLOOR);
  registry.register('INT', mathFunctions.INT);
  registry.register('MOD', mathFunctions.MOD);
  registry.register('POWER', mathFunctions.POWER);
  registry.register('SQRT', mathFunctions.SQRT);
  registry.register('PRODUCT', mathFunctions.PRODUCT);
  registry.register('COUNTIF', mathFunctions.COUNTIF);
  registry.register('MEDIAN', mathFunctions.MEDIAN);

  // 3. Register the Logical functions
  registry.register('IF', logicalFunctions.IF);
  registry.register('AND', logicalFunctions.AND);
  registry.register('OR', logicalFunctions.OR);
  registry.register('NOT', logicalFunctions.NOT);
  registry.register('IFS', logicalFunctions.IFS);
  registry.register('IFERROR', logicalFunctions.IFERROR);

  // 4. Register the Text functions
  registry.register('LEN', textFunctions.LEN);
  registry.register('UPPER', textFunctions.UPPER);
  registry.register('LOWER', textFunctions.LOWER);
  registry.register('TRIM', textFunctions.TRIM);
  registry.register('CONCATENATE', textFunctions.CONCATENATE);
  registry.register('LEFT', textFunctions.LEFT);
  registry.register('RIGHT', textFunctions.RIGHT);
  registry.register('MID', textFunctions.MID);
  registry.register('FIND', textFunctions.FIND);
  registry.register('SEARCH', textFunctions.SEARCH);
  registry.register('SUBSTITUTE', textFunctions.SUBSTITUTE);
  registry.register('REPLACE', textFunctions.REPLACE);
  registry.register('TEXT', textFunctions.TEXT);
  registry.register('VALUE', textFunctions.VALUE);

  // 5. Register the Lookup functions
  registry.register('VLOOKUP', lookupFunctions.VLOOKUP);
  registry.register('HLOOKUP', lookupFunctions.HLOOKUP);
  registry.register('INDEX', lookupFunctions.INDEX);
  registry.register('MATCH', lookupFunctions.MATCH);

  // 6. Register the Date/Time functions
  registry.register('TODAY', datetimeFunctions.TODAY);
  registry.register('NOW', datetimeFunctions.NOW);
  registry.register('DATE', datetimeFunctions.DATE);
  registry.register('YEAR', datetimeFunctions.YEAR);
  registry.register('MONTH', datetimeFunctions.MONTH);
  registry.register('DAY', datetimeFunctions.DAY);

  // 7. Register the Information functions
  registry.register('ISBLANK', infoFunctions.ISBLANK);
  registry.register('ISERROR', infoFunctions.ISERROR);
  registry.register('ISNUMBER', infoFunctions.ISNUMBER);
  registry.register('ISTEXT', infoFunctions.ISTEXT);
}

// If using CommonJS (for the worker's importScripts)
// We need to handle this differently since workers don't support ES6 modules
// by default. For the worker, we'll need to adjust its import method.
// For now, this ES6 export is correct for the main engine.
