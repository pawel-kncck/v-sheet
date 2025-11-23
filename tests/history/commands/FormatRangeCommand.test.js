import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FormatRangeCommand } from '../../../js/history/commands/FormatRangeCommand.js';

describe('FormatRangeCommand', () => {
  let mockFileManager, mockRenderer, mockStyleManager;

  beforeEach(() => {
    mockStyleManager = {
      addStyle: vi.fn().mockReturnValue('new-style-id'),
      getStyle: vi.fn().mockReturnValue({ font: { bold: true } }),
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
      getCellStyle: vi.fn().mockReturnValue({ font: { italic: true } }), // Old style
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

  it('should apply new style on execute', () => {
    const command = new FormatRangeCommand({
      cellIds: ['A1'],
      styleChanges: { font: { bold: true } },
      fileManager: mockFileManager,
      renderer: mockRenderer
    });

    command.execute();

    // 1. Check StyleManager interaction
    // Should attempt to add the MERGED style (italic + bold)
    expect(mockStyleManager.addStyle).toHaveBeenCalledWith({
      font: { italic: true, bold: true }
    });

    // 2. Check Data Update
    expect(mockFileManager.currentFile.data.cells['A1'].styleId).toBe('new-style-id');
    expect(mockFileManager.markAsModified).toHaveBeenCalled();

    // 3. Check Renderer Update
    expect(mockRenderer.updateCellStyle).toHaveBeenCalledWith('A1', { font: { bold: true } });
  });

  it('should restore old style on undo', () => {
    const command = new FormatRangeCommand({
      cellIds: ['A1'],
      styleChanges: { font: { bold: true } },
      fileManager: mockFileManager,
      renderer: mockRenderer
    });

    command.execute();
    
    // Reset mocks to verify undo actions specifically
    mockRenderer.updateCellStyle.mockClear();
    mockStyleManager.getStyle.mockReturnValue({ font: { italic: true } }); // Old style obj

    command.undo();

    // 1. Check Data Restore
    expect(mockFileManager.currentFile.data.cells['A1'].styleId).toBe('old-style-id');

    // 2. Check Renderer Restore
    expect(mockRenderer.updateCellStyle).toHaveBeenCalledWith('A1', { font: { italic: true } });
  });
});