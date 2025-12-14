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
  // Medium priority math functions
  registry.register('ROUNDUP', mathFunctions.ROUNDUP);
  registry.register('ROUNDDOWN', mathFunctions.ROUNDDOWN);
  registry.register('TRUNC', mathFunctions.TRUNC);
  registry.register('SIGN', mathFunctions.SIGN);
  registry.register('RAND', mathFunctions.RAND);
  registry.register('RANDBETWEEN', mathFunctions.RANDBETWEEN);
  registry.register('COUNTBLANK', mathFunctions.COUNTBLANK);
  registry.register('AVERAGEIF', mathFunctions.AVERAGEIF);
  registry.register('MODE', mathFunctions.MODE);
  registry.register('STDEV', mathFunctions.STDEV);
  registry.register('VAR', mathFunctions.VAR);
  // Low priority math functions
  registry.register('PI', mathFunctions.PI);
  registry.register('EXP', mathFunctions.EXP);
  registry.register('LN', mathFunctions.LN);
  registry.register('LOG', mathFunctions.LOG);
  registry.register('LOG10', mathFunctions.LOG10);
  registry.register('SIN', mathFunctions.SIN);
  registry.register('COS', mathFunctions.COS);
  registry.register('TAN', mathFunctions.TAN);
  registry.register('DEGREES', mathFunctions.DEGREES);
  registry.register('RADIANS', mathFunctions.RADIANS);

  // 3. Register the Logical functions
  registry.register('IF', logicalFunctions.IF);
  registry.register('AND', logicalFunctions.AND);
  registry.register('OR', logicalFunctions.OR);
  registry.register('NOT', logicalFunctions.NOT);
  registry.register('IFS', logicalFunctions.IFS);
  registry.register('IFERROR', logicalFunctions.IFERROR);
  // Medium priority logical functions
  registry.register('IFNA', logicalFunctions.IFNA);
  registry.register('XOR', logicalFunctions.XOR);
  registry.register('SWITCH', logicalFunctions.SWITCH);
  registry.register('CHOOSE', logicalFunctions.CHOOSE);
  // Low priority logical functions
  registry.register('TRUE', logicalFunctions.TRUE);
  registry.register('FALSE', logicalFunctions.FALSE);

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
  // Medium priority text functions
  registry.register('REPT', textFunctions.REPT);
  registry.register('PROPER', textFunctions.PROPER);
  registry.register('EXACT', textFunctions.EXACT);
  registry.register('TEXTJOIN', textFunctions.TEXTJOIN);
  registry.register('SPLIT', textFunctions.SPLIT);
  // Low priority text functions
  registry.register('T', textFunctions.T);
  registry.register('CHAR', textFunctions.CHAR);
  registry.register('CODE', textFunctions.CODE);
  registry.register('CLEAN', textFunctions.CLEAN);

  // 5. Register the Lookup functions
  registry.register('VLOOKUP', lookupFunctions.VLOOKUP);
  registry.register('HLOOKUP', lookupFunctions.HLOOKUP);
  registry.register('INDEX', lookupFunctions.INDEX);
  registry.register('MATCH', lookupFunctions.MATCH);
  // Medium priority lookup functions
  registry.register('ROW', lookupFunctions.ROW);
  registry.register('COLUMN', lookupFunctions.COLUMN);
  registry.register('ROWS', lookupFunctions.ROWS);
  registry.register('COLUMNS', lookupFunctions.COLUMNS);

  // 6. Register the Date/Time functions
  registry.register('TODAY', datetimeFunctions.TODAY);
  registry.register('NOW', datetimeFunctions.NOW);
  registry.register('DATE', datetimeFunctions.DATE);
  registry.register('YEAR', datetimeFunctions.YEAR);
  registry.register('MONTH', datetimeFunctions.MONTH);
  registry.register('DAY', datetimeFunctions.DAY);
  // Medium priority datetime functions
  registry.register('HOUR', datetimeFunctions.HOUR);
  registry.register('MINUTE', datetimeFunctions.MINUTE);
  registry.register('SECOND', datetimeFunctions.SECOND);
  registry.register('TIME', datetimeFunctions.TIME);
  registry.register('WEEKDAY', datetimeFunctions.WEEKDAY);
  registry.register('DATEDIF', datetimeFunctions.DATEDIF);
  registry.register('EDATE', datetimeFunctions.EDATE);
  registry.register('EOMONTH', datetimeFunctions.EOMONTH);

  // 7. Register the Information functions
  registry.register('ISBLANK', infoFunctions.ISBLANK);
  registry.register('ISERROR', infoFunctions.ISERROR);
  registry.register('ISNUMBER', infoFunctions.ISNUMBER);
  registry.register('ISTEXT', infoFunctions.ISTEXT);
  // Medium priority info functions
  registry.register('ISNA', infoFunctions.ISNA);
  registry.register('ISLOGICAL', infoFunctions.ISLOGICAL);
  registry.register('NA', infoFunctions.NA);
  registry.register('ISEVEN', infoFunctions.ISEVEN);
  registry.register('ISODD', infoFunctions.ISODD);
  registry.register('TYPE', infoFunctions.TYPE);
}

// If using CommonJS (for the worker's importScripts)
// We need to handle this differently since workers don't support ES6 modules
// by default. For the worker, we'll need to adjust its import method.
// For now, this ES6 export is correct for the main engine.
