import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BorderFormatCommand } from '../../../js/history/commands/BorderFormatCommand.js';

describe('BorderFormatCommand', () => {
  let mockFileManager, mockRenderer, mockStyleManager;

  beforeEach(() => {
    mockStyleManager = {
      addStyle: vi.fn().mockReturnValue('new-style-id'),
      getStyle: vi.fn().mockReturnValue({
        border: {
          top: { style: 'solid', color: '#000000', width: 1 }
        }
      }),
    };

    mockFileManager = {
      currentFile: {
        data: {
          cells: {
            'A1': { value: 'Test', styleId: 'old-style-id' }
          }
        }
      },
      styleManager: mockStyleManager,
      getCellStyle: vi.fn().mockReturnValue({ font: { bold: true } }), // Existing style without borders
      getCurrentFileData: vi.fn().mockReturnValue({
        cells: { 'A1': { value: 'Test', styleId: 'old-style-id' } }
      }),
      markAsModified: vi.fn(),
      queueAutosave: vi.fn()
    };

    mockRenderer = {
      updateCellStyle: vi.fn()
    };
  });

  it('should apply border styles on execute', () => {
    const cellBorderChanges = {
      'A1': {
        border: {
          top: { style: 'solid', color: '#000000', width: 1 },
          bottom: { style: 'solid', color: '#000000', width: 1 }
        }
      }
    };

    const command = new BorderFormatCommand({
      cellBorderChanges,
      fileManager: mockFileManager,
      renderer: mockRenderer
    });

    command.execute();

    // 1. Check StyleManager interaction - should merge with existing style
    expect(mockStyleManager.addStyle).toHaveBeenCalledWith({
      font: { bold: true },
      border: {
        top: { style: 'solid', color: '#000000', width: 1 },
        bottom: { style: 'solid', color: '#000000', width: 1 }
      }
    });

    // 2. Check Data Update
    expect(mockFileManager.currentFile.data.cells['A1'].styleId).toBe('new-style-id');
    expect(mockFileManager.markAsModified).toHaveBeenCalled();

    // 3. Check Renderer Update
    expect(mockRenderer.updateCellStyle).toHaveBeenCalledWith('A1', {
      border: {
        top: { style: 'solid', color: '#000000', width: 1 }
      }
    });
  });

  it('should restore old style on undo', () => {
    const cellBorderChanges = {
      'A1': {
        border: {
          top: { style: 'solid', color: '#000000', width: 1 }
        }
      }
    };

    const command = new BorderFormatCommand({
      cellBorderChanges,
      fileManager: mockFileManager,
      renderer: mockRenderer
    });

    command.execute();

    // Reset mocks to verify undo actions specifically
    mockRenderer.updateCellStyle.mockClear();
    mockStyleManager.getStyle.mockReturnValue({ font: { bold: true } }); // Old style obj

    command.undo();

    // 1. Check Data Restore
    expect(mockFileManager.currentFile.data.cells['A1'].styleId).toBe('old-style-id');

    // 2. Check Renderer Restore
    expect(mockRenderer.updateCellStyle).toHaveBeenCalledWith('A1', { font: { bold: true } });
  });

  it('should handle multiple cells', () => {
    const cellBorderChanges = {
      'A1': {
        border: {
          top: { style: 'solid', color: '#000000', width: 1 }
        }
      },
      'B1': {
        border: {
          top: { style: 'solid', color: '#000000', width: 1 }
        }
      }
    };

    // Add B1 to mock data
    mockFileManager.currentFile.data.cells['B1'] = { value: 'Test2' };
    mockFileManager.getCurrentFileData.mockReturnValue({
      cells: {
        'A1': { value: 'Test', styleId: 'old-style-id' },
        'B1': { value: 'Test2' }
      }
    });

    const command = new BorderFormatCommand({
      cellBorderChanges,
      fileManager: mockFileManager,
      renderer: mockRenderer
    });

    command.execute();

    // Both cells should be updated
    expect(mockRenderer.updateCellStyle).toHaveBeenCalledTimes(2);
    expect(mockFileManager.currentFile.data.cells['A1'].styleId).toBe('new-style-id');
    expect(mockFileManager.currentFile.data.cells['B1'].styleId).toBe('new-style-id');
  });

  it('should remove null borders from style', () => {
    const cellBorderChanges = {
      'A1': {
        border: {
          top: null,
          bottom: { style: 'solid', color: '#000000', width: 1 }
        }
      }
    };

    mockFileManager.getCellStyle.mockReturnValue({
      border: {
        top: { style: 'solid', color: '#ff0000', width: 2 }
      }
    });

    const command = new BorderFormatCommand({
      cellBorderChanges,
      fileManager: mockFileManager,
      renderer: mockRenderer
    });

    command.execute();

    // addStyle should be called with cleaned border (no null values)
    expect(mockStyleManager.addStyle).toHaveBeenCalledWith({
      border: {
        bottom: { style: 'solid', color: '#000000', width: 1 }
      }
    });
  });

  it('should handle clearing all borders', () => {
    const cellBorderChanges = {
      'A1': {
        border: {
          top: null,
          right: null,
          bottom: null,
          left: null
        }
      }
    };

    mockFileManager.getCellStyle.mockReturnValue({
      font: { bold: true },
      border: {
        top: { style: 'solid', color: '#000000', width: 1 }
      }
    });

    const command = new BorderFormatCommand({
      cellBorderChanges,
      fileManager: mockFileManager,
      renderer: mockRenderer
    });

    command.execute();

    // addStyle should be called without border property (all null = empty = removed)
    expect(mockStyleManager.addStyle).toHaveBeenCalledWith({
      font: { bold: true }
    });
  });

  it('should handle cell without existing style', () => {
    const cellBorderChanges = {
      'C1': {
        border: {
          top: { style: 'solid', color: '#000000', width: 1 }
        }
      }
    };

    mockFileManager.getCellStyle.mockReturnValue(null);
    mockFileManager.getCurrentFileData.mockReturnValue({
      cells: {}
    });

    const command = new BorderFormatCommand({
      cellBorderChanges,
      fileManager: mockFileManager,
      renderer: mockRenderer
    });

    command.execute();

    // Should create new cell with style
    expect(mockFileManager.currentFile.data.cells['C1'].styleId).toBe('new-style-id');
  });
});
