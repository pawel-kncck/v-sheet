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

/**
 * The single, global instance of the FormulaEngine for this worker.
 * @type {FormulaEngine}
 */
let engine;

try {
  engine = new FormulaEngine();
  console.log('Formula Worker: Engine initialized successfully.');
} catch (e) {
  console.error('Worker failed to instantiate FormulaEngine', e);
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
      case 'load':
        engine.loadData(payload.fileCellData);
        self.postMessage({ type: 'loadComplete' });
        break;

      case 'setFormula': {
        const { cellId, formulaString } = payload;
        const updates = engine.setFormula(cellId, formulaString);
        self.postMessage({ type: 'updates', payload: { updates } });
        break;
      }

      case 'setCellValue': {
        const { cellId, value } = payload;
        const updates = engine.setCellValue(cellId, value);
        self.postMessage({ type: 'updates', payload: { updates } });
        break;
      }

      case 'clearCell': {
        const { cellId } = payload;
        const updates = engine.clearCell(cellId);
        self.postMessage({ type: 'updates', payload: { updates } });
        break;
      }

      default:
        console.warn(`Worker: Unknown message type received: ${type}`);
    }
  } catch (e) {
    // Catch any unexpected errors during processing
    console.error(`Worker: Error processing ${type}`, e);
    self.postMessage({
      type: 'error',
      payload: { message: e.message, stack: e.stack },
    });
  }
};

// Send a "ready" message to the main thread to signal
// that the worker has loaded and is ready to receive data.
self.postMessage({ type: 'ready' });
