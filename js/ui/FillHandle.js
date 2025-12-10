/**
 * FillHandle - Renders and manages the fill handle (blue dot) for drag-fill operations
 */
export class FillHandle {
  /**
   * @param {Object} params
   * @param {HTMLElement} params.container - #spreadsheet-container
   * @param {SelectionManager} params.selectionManager
   * @param {GridRenderer} params.gridRenderer
   * @param {Function} params.onFillComplete - Callback with fill data
   */
  constructor({ container, selectionManager, gridRenderer, onFillComplete }) {
    this.container = container;
    this.selectionManager = selectionManager;
    this.gridRenderer = gridRenderer;
    this.onFillComplete = onFillComplete;

    // DOM elements
    this.element = null; // The fill handle dot
    this.previewElement = null; // Preview overlay

    // State
    this.isDragging = false;
    this.dragInfo = {
      sourceSelection: null,
      startCoords: null,
      currentCoords: null
    };
  }

  /**
   * Render the fill handle dot at selection bottom-right
   */
  render() {
    const bounds = this.selectionManager.getSelectionBounds();
    if (!bounds) {
      this.hide();
      return;
    }

    // Get the bottom-right cell element
    const cellElement = this.gridRenderer.getCellElementByCoords(bounds.maxRow, bounds.maxCol);
    if (!cellElement) {
      this.hide();
      return;
    }

    // Create element if it doesn't exist
    if (!this.element) {
      this.element = document.createElement('div');
      this.element.id = 'fill-handle';
      this.container.appendChild(this.element);
    }

    // Position at bottom-right corner of the cell
    const containerRect = this.container.getBoundingClientRect();
    const cellRect = cellElement.getBoundingClientRect();

    this.element.style.left = `${cellRect.right - containerRect.left - 4}px`; // 4px = half width of dot
    this.element.style.top = `${cellRect.bottom - containerRect.top - 4}px`; // 4px = half height of dot
    this.element.style.display = 'block';
  }

  /**
   * Remove the fill handle from DOM
   */
  hide() {
    if (this.element) {
      this.element.style.display = 'none';
    }
    this._hidePreview();
  }

  /**
   * Check if coordinates are over the fill handle
   * @param {number} x - clientX
   * @param {number} y - clientY
   * @returns {boolean}
   */
  isOverFillHandle(x, y) {
    if (!this.element || this.element.style.display === 'none') {
      return false;
    }

    const rect = this.element.getBoundingClientRect();

    // Expand hit zone slightly for easier grabbing (10px area)
    const hitZone = 10;
    return (
      x >= rect.left - hitZone / 2 &&
      x <= rect.right + hitZone / 2 &&
      y >= rect.top - hitZone / 2 &&
      y <= rect.bottom + hitZone / 2
    );
  }

  /**
   * Start fill drag operation
   * @param {MouseEvent} event
   * @param {Object} sourceSelection - Current selection bounds
   */
  startDrag(event, sourceSelection) {
    this.isDragging = true;

    const bounds = this.selectionManager.getSelectionBounds();
    if (!bounds) return;

    this.dragInfo = {
      sourceSelection: bounds,
      startCoords: { x: event.clientX, y: event.clientY },
      currentCoords: { x: event.clientX, y: event.clientY }
    };

    // Hide the fill handle during drag
    if (this.element) {
      this.element.style.display = 'none';
    }
  }

  /**
   * Update fill preview during drag
   * @param {MouseEvent} event
   */
  updateDrag(event) {
    if (!this.isDragging) return;

    this.dragInfo.currentCoords = { x: event.clientX, y: event.clientY };

    // Determine which cell we're hovering over
    const cellElement = document.elementFromPoint(event.clientX, event.clientY);
    if (!cellElement || !cellElement.dataset.cellId) {
      this._hidePreview();
      return;
    }

    const cellId = cellElement.dataset.cellId;
    const coords = this._cellIdToCoords(cellId);

    // Calculate target range based on drag direction
    const targetRange = this._calculateTargetRange(coords);
    if (targetRange) {
      this._renderPreview(targetRange);
    } else {
      this._hidePreview();
    }
  }

  /**
   * Complete fill operation
   * @param {MouseEvent} event
   * @returns {{sourceSelection, targetRange, fillDirection, reverse}|null}
   */
  endDrag(event) {
    if (!this.isDragging) return null;

    this.isDragging = false;
    this._hidePreview();

    // Show the fill handle again
    this.render();

    // Determine final target cell
    const cellElement = document.elementFromPoint(event.clientX, event.clientY);
    if (!cellElement || !cellElement.dataset.cellId) {
      return null;
    }

    const cellId = cellElement.dataset.cellId;
    const coords = this._cellIdToCoords(cellId);

    // Calculate target range
    const targetRange = this._calculateTargetRange(coords);
    if (!targetRange) {
      return null;
    }

    // Determine fill direction and reverse flag
    const { fillDirection, reverse } = this._determineFillDirection(coords);

    return {
      sourceSelection: this.dragInfo.sourceSelection,
      targetRange,
      fillDirection,
      reverse
    };
  }

  /**
   * Calculate target range based on drag position
   * @private
   */
  _calculateTargetRange(coords) {
    const source = this.dragInfo.sourceSelection;
    if (!source) return null;

    const { row, col } = coords;

    // Determine if dragging vertically or horizontally (whichever distance is greater)
    const verticalDistance = Math.abs(row - source.maxRow);
    const horizontalDistance = Math.abs(col - source.maxCol);

    if (verticalDistance === 0 && horizontalDistance === 0) {
      return null; // No drag
    }

    let targetRange;

    if (verticalDistance > horizontalDistance) {
      // Vertical drag
      if (row > source.maxRow) {
        // Dragging down
        targetRange = {
          minRow: source.minRow,
          maxRow: row,
          minCol: source.minCol,
          maxCol: source.maxCol
        };
      } else if (row < source.minRow) {
        // Dragging up
        targetRange = {
          minRow: row,
          maxRow: source.maxRow,
          minCol: source.minCol,
          maxCol: source.maxCol
        };
      } else {
        return null; // Within source range
      }
    } else {
      // Horizontal drag
      if (col > source.maxCol) {
        // Dragging right
        targetRange = {
          minRow: source.minRow,
          maxRow: source.maxRow,
          minCol: source.minCol,
          maxCol: col
        };
      } else if (col < source.minCol) {
        // Dragging left
        targetRange = {
          minRow: source.minRow,
          maxRow: source.maxRow,
          minCol: col,
          maxCol: source.maxCol
        };
      } else {
        return null; // Within source range
      }
    }

    return targetRange;
  }

  /**
   * Determine fill direction and reverse flag
   * @private
   */
  _determineFillDirection(coords) {
    const source = this.dragInfo.sourceSelection;
    const { row, col } = coords;

    const verticalDistance = Math.abs(row - source.maxRow);
    const horizontalDistance = Math.abs(col - source.maxCol);

    if (verticalDistance > horizontalDistance) {
      return {
        fillDirection: 'vertical',
        reverse: row < source.minRow
      };
    } else {
      return {
        fillDirection: 'horizontal',
        reverse: col < source.minCol
      };
    }
  }

  /**
   * Show/update fill preview overlay
   * @private
   */
  _renderPreview(targetRange) {
    if (!this.previewElement) {
      this.previewElement = document.createElement('div');
      this.previewElement.id = 'fill-preview';
      this.container.appendChild(this.previewElement);
    }

    // Get start and end cells
    const startCell = this.gridRenderer.getCellElementByCoords(targetRange.minRow, targetRange.minCol);
    const endCell = this.gridRenderer.getCellElementByCoords(targetRange.maxRow, targetRange.maxCol);

    if (!startCell || !endCell) {
      this._hidePreview();
      return;
    }

    const containerRect = this.container.getBoundingClientRect();
    const startRect = startCell.getBoundingClientRect();
    const endRect = endCell.getBoundingClientRect();

    this.previewElement.style.left = `${startRect.left - containerRect.left}px`;
    this.previewElement.style.top = `${startRect.top - containerRect.top}px`;
    this.previewElement.style.width = `${endRect.right - startRect.left}px`;
    this.previewElement.style.height = `${endRect.bottom - startRect.top}px`;
    this.previewElement.style.display = 'block';
  }

  /**
   * Hide fill preview overlay
   * @private
   */
  _hidePreview() {
    if (this.previewElement) {
      this.previewElement.style.display = 'none';
    }
  }

  /**
   * Convert cellId to coordinates
   * @private
   */
  _cellIdToCoords(cellId) {
    const match = cellId.match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;

    const col = match[1].charCodeAt(0) - 65; // 'A' = 0
    const row = parseInt(match[2], 10);

    return { row, col };
  }
}
