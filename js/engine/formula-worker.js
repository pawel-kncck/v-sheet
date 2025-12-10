/**
 * Formula Worker (Background Thread)
 *
 * This script runs as an ES6 Module. It imports the FormulaEngine,
 * which in turn imports all its own dependencies (parser, functions, etc.).
 *
 * It communicates with the main thread via message passing.
 */

// 1. Import the *one* class we need.
// The FormulaEngine will handle importing all its own dependencies.
import { FormulaEngine } from './FormulaEngine.js';
import { Logger } from './utils/Logger.js';

/**
 * The single, global instance of the FormulaEngine for this worker.
 * @type {FormulaEngine}
 */
let engine;

/**
 * Serializes update values, converting error objects to their string representation.
 * This is necessary because postMessage doesn't preserve custom toString() methods.
 * Also converts boolean values to "TRUE"/"FALSE" strings (standard spreadsheet behavior).
 * @param {Object} updates - Map of cellId to value
 * @returns {Object} - Map of cellId to serialized value
 */
function serializeUpdates(updates) {
  const serialized = {};
  for (const [cellId, value] of Object.entries(updates)) {
    // If value is an Error-like object with a toString method, use it
    if (value && typeof value === 'object' && typeof value.toString === 'function' && value.name && value.name.startsWith('#')) {
      serialized[cellId] = value.toString();
    } else if (typeof value === 'boolean') {
      // Convert booleans to "TRUE" or "FALSE" strings (Excel/GSheets behavior)
      serialized[cellId] = value ? 'TRUE' : 'FALSE';
    } else {
      serialized[cellId] = value;
    }
  }
  return serialized;
}

try {
  engine = new FormulaEngine();
  Logger.log('FormulaWorker', 'Engine initialized successfully.'); // <-- CHANGE
} catch (e) {
  Logger.error('FormulaWorker', 'Failed to instantiate FormulaEngine', e); // <-- CHANGE
  self.postMessage({
    type: 'error',
    payload: { message: 'Engine instantiation failed: ' + e.message },
  });
  throw e;
}

/**
 * The main "front door" for the worker.
 * This listens for messages from the main thread.
 *
 * @param {MessageEvent} event
 */
self.onmessage = (event) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'setDebugFlag':
        Logger.setDebugFlag(payload.isEnabled);
        Logger.log(
          'FormulaWorker',
          `Debug logging set to: ${payload.isEnabled}`
        );
        break;
      case 'load':
        engine.loadData(payload.fileCellData);

        const initialUpdates = {};
        for (const [cellId, cellData] of engine.cellData.entries()) {
          initialUpdates[cellId] = cellData.value;
        }

        const serializedInitialUpdates = serializeUpdates(initialUpdates);
        self.postMessage({
          type: 'updates',
          payload: { updates: serializedInitialUpdates },
        });

        self.postMessage({ type: 'loadComplete' });
        break;

      case 'setFormula': {
        const { cellId, formulaString } = payload;
        const updates = engine.setFormula(cellId, formulaString);
        // Convert error objects to their string representation
        const serializedUpdates = serializeUpdates(updates);
        self.postMessage({ type: 'updates', payload: { updates: serializedUpdates } });
        break;
      }

      case 'setCellValue': {
        const { cellId, value } = payload;
        const updates = engine.setCellValue(cellId, value);
        const serializedUpdates = serializeUpdates(updates);
        self.postMessage({ type: 'updates', payload: { updates: serializedUpdates } });
        break;
      }

      case 'clearCell': {
        const { cellId } = payload;
        const updates = engine.clearCell(cellId);
        const serializedUpdates = serializeUpdates(updates);
        self.postMessage({ type: 'updates', payload: { updates: serializedUpdates } });
        break;
      }

      default:
        Logger.warn('FormulaWorker', `Unknown message type received: ${type}`);
    }
  } catch (e) {
    // Catch any unexpected errors during processing
    Logger.error('FormulaWorker', `Error processing ${type}`, e);
    self.postMessage({
      type: 'error',
      payload: { message: e.message, stack: e.stack },
    });
  }
};

// Send a "ready" message to the main thread to signal
// that the worker has loaded and is ready to receive data.
self.postMessage({ type: 'ready' });
