import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FormulaBar } from '../../js/formula-bar.js';
import { JSDOM } from 'jsdom';

describe('FormulaBar', () => {
  let dom;
  let mockFileManager;
  let mockSpreadsheet;

  beforeEach(() => {
    // 1. Setup the DOM structure required by FormulaBar
    dom = new JSDOM(`
      <!DOCTYPE html>
      <body>
        <div id="formula-bar-container">
          <div id="file-selector-wrapper">
            <button id="file-selector-button"></button>
            <span id="current-file-name">Loading...</span>
            <div id="file-dropdown" class="hidden">
              <input id="file-search" type="text" />
              <div class="file-dropdown-actions">
                <button id="new-file-btn"></button>
                <button id="rename-file-btn"></button>
                <button id="delete-file-btn"></button>
              </div>
              <div id="file-list"></div>
            </div>
          </div>
          <div id="cell-reference"></div>
          <input id="formula-input" type="text" />
        </div>
      </body>
    `);
    
    global.document = dom.window.document;
    global.window = dom.window;
    global.confirm = vi.fn(() => true); // Mock confirm dialogs
    global.prompt = vi.fn(() => 'New Name'); // Mock prompt dialogs

    // 2. Setup Mock FileManager with PRE-LOADED files
    // This simulates the state where files are loaded before FormulaBar exists
    mockFileManager = {
      files: [
        { id: '1', name: 'Budget.json', modified: new Date().toISOString() },
        { id: '2', name: 'Notes.json', modified: new Date().toISOString() }
      ],
      // Callback setters
      onFileListUpdate: null,
      onCurrentFileChange: null,
      onSaveStatusChange: null,
      onError: null,
      // Methods
      getCurrentFileId: vi.fn().mockReturnValue('1'),
      getCurrentFileName: vi.fn().mockReturnValue('Budget.json'),
      getCurrentFileData: vi.fn(),
      loadFile: vi.fn(),
      createNewFile: vi.fn(),
      renameCurrentFile: vi.fn(),
      deleteFile: vi.fn(),
      updateCellData: vi.fn(),
    };

    // 3. Setup Mock Spreadsheet
    mockSpreadsheet = {
      loadFromFile: vi.fn(),
      clear: vi.fn(),
      selectCell: vi.fn(),
      setCellValue: vi.fn(),
      getCellValue: vi.fn(),
    };
  });

  it('should immediately populate the file list from existing FileManager data', () => {
    // Act: Initialize FormulaBar
    // If the race-condition fix works, it should read mockFileManager.files immediately
    new FormulaBar(mockFileManager, mockSpreadsheet);

    // Assert: Check the DOM
    const fileList = document.getElementById('file-list');
    const items = fileList.querySelectorAll('.file-item');

    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Budget.json');
    expect(items[1].textContent).toContain('Notes.json');
  });

  it('should still subscribe to future updates', () => {
    // Initialize
    new FormulaBar(mockFileManager, mockSpreadsheet);

    // Verify callback was registered
    expect(mockFileManager.onFileListUpdate).toBeInstanceOf(Function);

    // Act: Simulate a NEW update coming in later
    const newFiles = [
      { id: '3', name: 'Future File.json', modified: new Date().toISOString() }
    ];
    mockFileManager.onFileListUpdate(newFiles);

    // Assert: DOM should reflect the new update
    const items = document.getElementById('file-list').querySelectorAll('.file-item');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('Future File.json');
  });
});