import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateCellsCommand } from '../../../js/history/commands/UpdateCellsCommand.js';

describe('UpdateCellsCommand', () => {
  let mockFileManager;
  let mockWorker;

  beforeEach(() => {
    // Create fresh mocks for each test
    mockFileManager = {
      updateCellData: vi.fn(),
    };

    mockWorker = {
      postMessage: vi.fn(),
    };
  });

  describe('Constructor validation', () => {
    it('throws error if cellUpdates is empty', () => {
      expect(() => {
        new UpdateCellsCommand({
          cellUpdates: [],
          fileManager: mockFileManager,
          formulaWorker: mockWorker,
        });
      }).toThrow('UpdateCellsCommand requires at least one cell update');
    });

    it('throws error if fileManager is missing', () => {
      expect(() => {
        new UpdateCellsCommand({
          cellUpdates: [{ cellId: 'A1', newValue: '5', oldValue: '' }],
          formulaWorker: mockWorker,
        });
      }).toThrow('UpdateCellsCommand requires fileManager');
    });

    it('throws error if formulaWorker is missing', () => {
      expect(() => {
        new UpdateCellsCommand({
          cellUpdates: [{ cellId: 'A1', newValue: '5', oldValue: '' }],
          fileManager: mockFileManager,
        });
      }).toThrow('UpdateCellsCommand requires formulaWorker');
    });
  });

  describe('Execute - single cell', () => {
    it('updates fileManager and worker with raw value', () => {
      const command = new UpdateCellsCommand({
        cellUpdates: [{ cellId: 'A1', newValue: '5', oldValue: '' }],
        fileManager: mockFileManager,
        formulaWorker: mockWorker,
      });

      command.execute();

      // Verify fileManager was updated
      expect(mockFileManager.updateCellData).toHaveBeenCalledWith('A1', '5');
      expect(mockFileManager.updateCellData).toHaveBeenCalledTimes(1);

      // Verify worker was messaged
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'setCellValue',
        payload: { cellId: 'A1', value: '5' },
      });
      expect(mockWorker.postMessage).toHaveBeenCalledTimes(1);
    });

    it('handles formula values correctly', () => {
      const command = new UpdateCellsCommand({
        cellUpdates: [{ cellId: 'B1', newValue: '=A1+10', oldValue: '5' }],
        fileManager: mockFileManager,
        formulaWorker: mockWorker,
      });

      command.execute();

      expect(mockFileManager.updateCellData).toHaveBeenCalledWith(
        'B1',
        '=A1+10'
      );
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'setFormula',
        payload: { cellId: 'B1', formulaString: '=A1+10' },
      });
    });

    it('handles empty values (clear) correctly', () => {
      const command = new UpdateCellsCommand({
        cellUpdates: [{ cellId: 'C1', newValue: '', oldValue: '100' }],
        fileManager: mockFileManager,
        formulaWorker: mockWorker,
      });

      command.execute();

      expect(mockFileManager.updateCellData).toHaveBeenCalledWith('C1', '');
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'clearCell',
        payload: { cellId: 'C1' },
      });
    });

    it('handles numeric values', () => {
      const command = new UpdateCellsCommand({
        cellUpdates: [{ cellId: 'D1', newValue: 42, oldValue: '' }],
        fileManager: mockFileManager,
        formulaWorker: mockWorker,
      });

      command.execute();

      expect(mockFileManager.updateCellData).toHaveBeenCalledWith('D1', 42);
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'setCellValue',
        payload: { cellId: 'D1', value: 42 },
      });
    });
  });

  describe('Execute - multiple cells', () => {
    it('handles multiple cells in one command', () => {
      const command = new UpdateCellsCommand({
        cellUpdates: [
          { cellId: 'A1', newValue: '1', oldValue: '' },
          { cellId: 'A2', newValue: '2', oldValue: '' },
          { cellId: 'A3', newValue: '3', oldValue: '' },
        ],
        fileManager: mockFileManager,
        formulaWorker: mockWorker,
      });

      command.execute();

      // Verify all cells were updated
      expect(mockFileManager.updateCellData).toHaveBeenCalledTimes(3);
      expect(mockWorker.postMessage).toHaveBeenCalledTimes(3);

      expect(mockFileManager.updateCellData).toHaveBeenNthCalledWith(
        1,
        'A1',
        '1'
      );
      expect(mockFileManager.updateCellData).toHaveBeenNthCalledWith(
        2,
        'A2',
        '2'
      );
      expect(mockFileManager.updateCellData).toHaveBeenNthCalledWith(
        3,
        'A3',
        '3'
      );
    });

    it('handles mixed value types (formulas, numbers, text)', () => {
      const command = new UpdateCellsCommand({
        cellUpdates: [
          { cellId: 'A1', newValue: 'Hello', oldValue: '' },
          { cellId: 'B1', newValue: 123, oldValue: '' },
          { cellId: 'C1', newValue: '=A1&B1', oldValue: '' },
        ],
        fileManager: mockFileManager,
        formulaWorker: mockWorker,
      });

      command.execute();

      // Verify correct message types
      expect(mockWorker.postMessage).toHaveBeenNthCalledWith(1, {
        type: 'setCellValue',
        payload: { cellId: 'A1', value: 'Hello' },
      });
      expect(mockWorker.postMessage).toHaveBeenNthCalledWith(2, {
        type: 'setCellValue',
        payload: { cellId: 'B1', value: 123 },
      });
      expect(mockWorker.postMessage).toHaveBeenNthCalledWith(3, {
        type: 'setFormula',
        payload: { cellId: 'C1', formulaString: '=A1&B1' },
      });
    });
  });

  describe('Undo', () => {
    it('restores old values when undoing', () => {
      const command = new UpdateCellsCommand({
        cellUpdates: [{ cellId: 'A1', newValue: '10', oldValue: '5' }],
        fileManager: mockFileManager,
        formulaWorker: mockWorker,
      });

      // Execute first
      command.execute();
      expect(mockFileManager.updateCellData).toHaveBeenCalledWith('A1', '10');

      // Clear mocks
      mockFileManager.updateCellData.mockClear();
      mockWorker.postMessage.mockClear();

      // Undo
      command.undo();

      // Verify old value was restored
      expect(mockFileManager.updateCellData).toHaveBeenCalledWith('A1', '5');
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'setCellValue',
        payload: { cellId: 'A1', value: '5' },
      });
    });

    it('restores empty values when undoing', () => {
      const command = new UpdateCellsCommand({
        cellUpdates: [{ cellId: 'B1', newValue: 'New', oldValue: '' }],
        fileManager: mockFileManager,
        formulaWorker: mockWorker,
      });

      command.execute();
      mockFileManager.updateCellData.mockClear();
      mockWorker.postMessage.mockClear();

      command.undo();

      expect(mockFileManager.updateCellData).toHaveBeenCalledWith('B1', '');
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'clearCell',
        payload: { cellId: 'B1' },
      });
    });

    it('restores multiple cells correctly', () => {
      const command = new UpdateCellsCommand({
        cellUpdates: [
          { cellId: 'A1', newValue: '', oldValue: '1' },
          { cellId: 'A2', newValue: '', oldValue: '2' },
          { cellId: 'A3', newValue: '', oldValue: '3' },
        ],
        fileManager: mockFileManager,
        formulaWorker: mockWorker,
      });

      command.execute();
      mockFileManager.updateCellData.mockClear();
      mockWorker.postMessage.mockClear();

      command.undo();

      expect(mockFileManager.updateCellData).toHaveBeenCalledTimes(3);
      expect(mockFileManager.updateCellData).toHaveBeenNthCalledWith(
        1,
        'A1',
        '1'
      );
      expect(mockFileManager.updateCellData).toHaveBeenNthCalledWith(
        2,
        'A2',
        '2'
      );
      expect(mockFileManager.updateCellData).toHaveBeenNthCalledWith(
        3,
        'A3',
        '3'
      );
    });
  });

  describe('Edge cases', () => {
    it('handles null values', () => {
      const command = new UpdateCellsCommand({
        cellUpdates: [{ cellId: 'A1', newValue: null, oldValue: 'test' }],
        fileManager: mockFileManager,
        formulaWorker: mockWorker,
      });

      command.execute();

      expect(mockFileManager.updateCellData).toHaveBeenCalledWith('A1', null);
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'clearCell',
        payload: { cellId: 'A1' },
      });
    });

    it('handles undefined values', () => {
      const command = new UpdateCellsCommand({
        cellUpdates: [{ cellId: 'A1', newValue: undefined, oldValue: 'test' }],
        fileManager: mockFileManager,
        formulaWorker: mockWorker,
      });

      command.execute();

      expect(mockFileManager.updateCellData).toHaveBeenCalledWith(
        'A1',
        undefined
      );
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'clearCell',
        payload: { cellId: 'A1' },
      });
    });

    it('handles boolean values', () => {
      const command = new UpdateCellsCommand({
        cellUpdates: [{ cellId: 'A1', newValue: true, oldValue: '' }],
        fileManager: mockFileManager,
        formulaWorker: mockWorker,
      });

      command.execute();

      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'setCellValue',
        payload: { cellId: 'A1', value: true },
      });
    });
  });
});
