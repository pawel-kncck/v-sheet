import { Logger } from '../engine/utils/Logger.js';

export class GridResizer {
  /**
   * @param {Object} config
   * @param {number} [config.minColWidth=5]
   * @param {number} [config.minRowHeight=5]
   */
  constructor(config = {}) {
    this.MIN_COL_WIDTH = config.minColWidth || 5;
    this.MIN_ROW_HEIGHT = config.minRowHeight || 5;

    // State
    this.isResizing = false;
    this.resizeInfo = null; 
    // Structure: { type: 'col'|'row', indices: [], startPos: number, originalSizes: {} }

    // Callbacks
    this.callbacks = {
      onResizeUpdate: null, // Called during drag (for visual feedback)
      onResizeEnd: null     // Called on mouseup (to commit changes)
    };

    // Bind methods for event listeners
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);

    Logger.log('GridResizer', 'Initialized');
  }

  /**
   * Starts a resize operation.
   * @param {string} type - 'col' or 'row'
   * @param {number[]} indices - Array of column/row indices to resize
   * @param {Object} currentSizes - Map of index -> size (width or height)
   * @param {MouseEvent} event - The mousedown event that triggered this
   */
  startResize(type, indices, currentSizes, event) {
    this.isResizing = true;

    // Store initial state
    this.resizeInfo = {
      type,
      indices,
      originalSizes: { ...currentSizes }, // Shallow copy
      startPos: type === 'col' ? event.clientX : event.clientY
    };

    // Attach global listeners to handle dragging outside the header area
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup', this._onMouseUp, { once: true });

    Logger.log('GridResizer', `Started ${type} resize on ${indices.length} items`);
  }

  /**
   * Internal handler for mouse movement during resize
   * @private
   */
  _onMouseMove(e) {
    if (!this.isResizing || !this.resizeInfo) return;

    const { type, startPos, indices, originalSizes } = this.resizeInfo;
    
    // Calculate delta
    const currentPos = type === 'col' ? e.clientX : e.clientY;
    const delta = currentPos - startPos;

    // Calculate new sizes
    const newSizes = {};
    
    indices.forEach(index => {
      const originalSize = originalSizes[index];
      // Enforce minimum size
      const limit = type === 'col' ? this.MIN_COL_WIDTH : this.MIN_ROW_HEIGHT;
      newSizes[index] = Math.max(limit, originalSize + delta);
    });

    // Emit update for visual feedback
    if (this.callbacks.onResizeUpdate) {
      this.callbacks.onResizeUpdate({ type, newSizes });
    }
  }

  /**
   * Internal handler for mouse release
   * @private
   */
  _onMouseUp(e) {
    if (!this.isResizing) return;

    // Perform one final update calculation
    this._onMouseMove(e);

    // Clean up
    this.isResizing = false;
    window.removeEventListener('mousemove', this._onMouseMove);
    
    // Emit final event to commit changes
    if (this.callbacks.onResizeEnd && this.resizeInfo) {
      // We need to calculate the final sizes one last time to pass them back
      const { type, indices, startPos, originalSizes } = this.resizeInfo;
      const currentPos = type === 'col' ? e.clientX : e.clientY;
      const delta = currentPos - startPos;
      
      const finalSizes = {};
      indices.forEach(index => {
        const limit = type === 'col' ? this.MIN_COL_WIDTH : this.MIN_ROW_HEIGHT;
        finalSizes[index] = Math.max(limit, originalSizes[index] + delta);
      });

      this.callbacks.onResizeEnd({ type, finalSizes });
    }

    this.resizeInfo = null;
    Logger.log('GridResizer', 'Resize operation completed');
  }

  /**
   * Helper to update the mouse cursor when hovering over headers.
   * This is called by the Coordinator on mousemove.
   * @param {HTMLElement} target - The element being hovered
   * @param {MouseEvent} e 
   * @returns {string} The cursor style ('col-resize', 'row-resize', or 'default')
   */
  getCursorForHeader(target, e) {
    if (!target.classList.contains('header-cell')) return 'default';

    const rect = target.getBoundingClientRect();
    const isCol = target.dataset.col !== undefined;

    if (isCol) {
      const nearRightEdge = e.clientX > rect.right - 5;
      return nearRightEdge ? 'col-resize' : 'default';
    } else {
      const nearBottomEdge = e.clientY > rect.bottom - 5;
      return nearBottomEdge ? 'row-resize' : 'default';
    }
  }

  /**
   * Register event callbacks
   * @param {string} eventName - 'resizeUpdate', 'resizeEnd'
   * @param {Function} callback 
   */
  on(eventName, callback) {
    const callbackKey = `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;
    if (callbackKey in this.callbacks) {
      this.callbacks[callbackKey] = callback;
    }
  }
}