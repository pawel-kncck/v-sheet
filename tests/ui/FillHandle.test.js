import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FillHandle } from '../../js/ui/FillHandle.js';

describe('FillHandle', () => {
  let container;
  let selectionManager;
  let gridRenderer;
  let onFillComplete;
  let fillHandle;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = '<div id="test-container"></div>';
    container = document.getElementById('test-container');

    // Mock SelectionManager
    selectionManager = {
      getSelectionBounds: vi.fn()
    };

    // Mock GridRenderer
    gridRenderer = {
      getCellElementByCoords: vi.fn()
    };

    // Mock callback
    onFillComplete = vi.fn();

    fillHandle = new FillHandle({
      container,
      selectionManager,
      gridRenderer,
      onFillComplete
    });
  });

  describe('render', () => {
    it('should not render if no selection bounds', () => {
      selectionManager.getSelectionBounds.mockReturnValue(null);

      fillHandle.render();

      expect(fillHandle.element).toBeNull();
    });

    it('should not render if cell element not found', () => {
      selectionManager.getSelectionBounds.mockReturnValue({
        minRow: 1,
        maxRow: 2,
        minCol: 0,
        maxCol: 1
      });
      gridRenderer.getCellElementByCoords.mockReturnValue(null);

      fillHandle.render();

      const element = container.querySelector('#fill-handle');
      expect(element).toBeNull();
    });

    it('should create and position fill handle element', () => {
      const mockCell = document.createElement('div');
      mockCell.style.position = 'absolute';
      mockCell.style.left = '100px';
      mockCell.style.top = '50px';
      mockCell.style.width = '94px';
      mockCell.style.height = '20px';
      container.appendChild(mockCell);

      selectionManager.getSelectionBounds.mockReturnValue({
        minRow: 1,
        maxRow: 1,
        minCol: 0,
        maxCol: 0
      });
      gridRenderer.getCellElementByCoords.mockReturnValue(mockCell);

      fillHandle.render();

      const element = container.querySelector('#fill-handle');
      expect(element).toBeTruthy();
      expect(element.id).toBe('fill-handle');
      expect(element.style.display).toBe('block');
    });

    it('should reuse existing element on subsequent renders', () => {
      const mockCell = document.createElement('div');
      container.appendChild(mockCell);

      selectionManager.getSelectionBounds.mockReturnValue({
        minRow: 1,
        maxRow: 1,
        minCol: 0,
        maxCol: 0
      });
      gridRenderer.getCellElementByCoords.mockReturnValue(mockCell);

      fillHandle.render();
      const firstElement = fillHandle.element;

      fillHandle.render();
      const secondElement = fillHandle.element;

      expect(firstElement).toBe(secondElement);
      expect(container.querySelectorAll('#fill-handle').length).toBe(1);
    });
  });

  describe('hide', () => {
    it('should hide the fill handle element', () => {
      const mockCell = document.createElement('div');
      container.appendChild(mockCell);

      selectionManager.getSelectionBounds.mockReturnValue({
        minRow: 1,
        maxRow: 1,
        minCol: 0,
        maxCol: 0
      });
      gridRenderer.getCellElementByCoords.mockReturnValue(mockCell);

      fillHandle.render();
      expect(fillHandle.element.style.display).toBe('block');

      fillHandle.hide();
      expect(fillHandle.element.style.display).toBe('none');
    });

    it('should not error if element does not exist', () => {
      expect(() => fillHandle.hide()).not.toThrow();
    });
  });

  describe('isOverFillHandle', () => {
    it('should return false if element is not rendered', () => {
      expect(fillHandle.isOverFillHandle(100, 100)).toBe(false);
    });

    it('should return false if element is hidden', () => {
      fillHandle.element = document.createElement('div');
      fillHandle.element.style.display = 'none';
      container.appendChild(fillHandle.element);

      expect(fillHandle.isOverFillHandle(100, 100)).toBe(false);
    });

    it('should return true if coordinates are over fill handle', () => {
      fillHandle.element = document.createElement('div');
      fillHandle.element.style.position = 'absolute';
      fillHandle.element.style.left = '100px';
      fillHandle.element.style.top = '100px';
      fillHandle.element.style.width = '8px';
      fillHandle.element.style.height = '8px';
      fillHandle.element.style.display = 'block';
      container.appendChild(fillHandle.element);

      // Mock getBoundingClientRect
      fillHandle.element.getBoundingClientRect = vi.fn(() => ({
        left: 100,
        top: 100,
        right: 108,
        bottom: 108
      }));

      // Coordinates within expanded hit zone (10px)
      expect(fillHandle.isOverFillHandle(105, 105)).toBe(true);
    });

    it('should return false if coordinates are outside fill handle', () => {
      fillHandle.element = document.createElement('div');
      fillHandle.element.style.display = 'block';
      container.appendChild(fillHandle.element);

      fillHandle.element.getBoundingClientRect = vi.fn(() => ({
        left: 100,
        top: 100,
        right: 108,
        bottom: 108
      }));

      // Coordinates far outside
      expect(fillHandle.isOverFillHandle(200, 200)).toBe(false);
    });
  });

  describe('startDrag', () => {
    it('should set dragging state', () => {
      const event = { clientX: 100, clientY: 150 };
      const sourceSelection = {
        minRow: 1,
        maxRow: 2,
        minCol: 0,
        maxCol: 1
      };
      selectionManager.getSelectionBounds.mockReturnValue(sourceSelection);

      fillHandle.startDrag(event, sourceSelection);

      expect(fillHandle.isDragging).toBe(true);
      expect(fillHandle.dragInfo.startCoords).toEqual({ x: 100, y: 150 });
    });

    it('should hide fill handle during drag', () => {
      fillHandle.element = document.createElement('div');
      fillHandle.element.style.display = 'block';
      container.appendChild(fillHandle.element);

      const event = { clientX: 100, clientY: 150 };
      selectionManager.getSelectionBounds.mockReturnValue({
        minRow: 1,
        maxRow: 1,
        minCol: 0,
        maxCol: 0
      });

      fillHandle.startDrag(event, {});

      expect(fillHandle.element.style.display).toBe('none');
    });
  });

  describe('updateDrag', () => {
    it('should not update if not dragging', () => {
      fillHandle.isDragging = false;

      const event = { clientX: 200, clientY: 200 };
      fillHandle.updateDrag(event);

      expect(fillHandle.dragInfo.currentCoords).toBeUndefined();
    });

    it('should update current coordinates', () => {
      fillHandle.isDragging = true;
      fillHandle.dragInfo = { sourceSelection: {} };

      const event = { clientX: 200, clientY: 250 };
      fillHandle.updateDrag(event);

      expect(fillHandle.dragInfo.currentCoords).toEqual({ x: 200, y: 250 });
    });
  });

  describe('endDrag', () => {
    it('should reset dragging state', () => {
      fillHandle.isDragging = true;
      fillHandle.element = document.createElement('div');
      container.appendChild(fillHandle.element);

      selectionManager.getSelectionBounds.mockReturnValue({
        minRow: 1,
        maxRow: 1,
        minCol: 0,
        maxCol: 0
      });
      gridRenderer.getCellElementByCoords.mockReturnValue(document.createElement('div'));

      const event = { clientX: 100, clientY: 100 };
      fillHandle.endDrag(event);

      expect(fillHandle.isDragging).toBe(false);
    });

    it('should return null if not dragging', () => {
      fillHandle.isDragging = false;

      const event = { clientX: 100, clientY: 100 };
      const result = fillHandle.endDrag(event);

      expect(result).toBeNull();
    });

    it('should return null if no cell element found', () => {
      fillHandle.isDragging = true;
      fillHandle.dragInfo = {
        sourceSelection: { minRow: 1, maxRow: 2, minCol: 0, maxCol: 0 }
      };

      // Mock elementFromPoint to return null
      global.document.elementFromPoint = vi.fn(() => null);

      const event = { clientX: 100, clientY: 100 };
      const result = fillHandle.endDrag(event);

      expect(result).toBeNull();
    });

    it('should determine vertical fill direction down', () => {
      fillHandle.isDragging = true;
      fillHandle.dragInfo = {
        sourceSelection: { minRow: 1, maxRow: 2, minCol: 0, maxCol: 0 }
      };

      const mockCell = document.createElement('div');
      mockCell.dataset.id = 'A5';

      global.document.elementFromPoint = vi.fn(() => mockCell);

      const event = { clientX: 100, clientY: 200 };
      const result = fillHandle.endDrag(event);

      expect(result).toBeTruthy();
      expect(result.fillDirection).toBe('vertical');
      expect(result.reverse).toBe(false);
      expect(result.targetRange.maxRow).toBe(5);
    });

    it('should determine vertical fill direction up', () => {
      fillHandle.isDragging = true;
      fillHandle.dragInfo = {
        sourceSelection: { minRow: 3, maxRow: 4, minCol: 0, maxCol: 0 }
      };

      const mockCell = document.createElement('div');
      mockCell.dataset.id = 'A1';

      global.document.elementFromPoint = vi.fn(() => mockCell);

      const event = { clientX: 100, clientY: 50 };
      const result = fillHandle.endDrag(event);

      expect(result).toBeTruthy();
      expect(result.fillDirection).toBe('vertical');
      expect(result.reverse).toBe(true);
      expect(result.targetRange.minRow).toBe(1);
    });

    it('should determine horizontal fill direction right', () => {
      fillHandle.isDragging = true;
      fillHandle.dragInfo = {
        sourceSelection: { minRow: 1, maxRow: 1, minCol: 0, maxCol: 1 }
      };

      const mockCell = document.createElement('div');
      mockCell.dataset.id = 'E1';

      global.document.elementFromPoint = vi.fn(() => mockCell);

      const event = { clientX: 300, clientY: 100 };
      const result = fillHandle.endDrag(event);

      expect(result).toBeTruthy();
      expect(result.fillDirection).toBe('horizontal');
      expect(result.reverse).toBe(false);
      expect(result.targetRange.maxCol).toBe(4); // E = col 4
    });

    it('should determine horizontal fill direction left', () => {
      fillHandle.isDragging = true;
      fillHandle.dragInfo = {
        sourceSelection: { minRow: 1, maxRow: 1, minCol: 3, maxCol: 4 }
      };

      const mockCell = document.createElement('div');
      mockCell.dataset.id = 'A1';

      global.document.elementFromPoint = vi.fn(() => mockCell);

      const event = { clientX: 50, clientY: 100 };
      const result = fillHandle.endDrag(event);

      expect(result).toBeTruthy();
      expect(result.fillDirection).toBe('horizontal');
      expect(result.reverse).toBe(true);
      expect(result.targetRange.minCol).toBe(0); // A = col 0
    });
  });

  describe('_cellIdToCoords', () => {
    it('should convert cell ID to coordinates', () => {
      const coords = fillHandle._cellIdToCoords('A1');
      expect(coords).toEqual({ row: 1, col: 0 });
    });

    it('should handle multi-letter columns', () => {
      const coords = fillHandle._cellIdToCoords('Z1');
      expect(coords).toEqual({ row: 1, col: 25 });
    });

    it('should handle different row numbers', () => {
      const coords = fillHandle._cellIdToCoords('B10');
      expect(coords).toEqual({ row: 10, col: 1 });
    });

    it('should return null for invalid cell ID', () => {
      const coords = fillHandle._cellIdToCoords('invalid');
      expect(coords).toBeNull();
    });
  });
});
