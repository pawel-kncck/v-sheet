import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FormulaBar } from '../../js/formula-bar.js';
import { JSDOM } from 'jsdom';

describe('FormulaBar Interactions', () => {
  let dom, mockFileManager, mockSpreadsheet;

  beforeEach(() => {
    // Setup DOM
    dom = new JSDOM(`
      <div id="formula-bar-container">
        <div id="file-selector-wrapper">
          <button id="file-selector-button"></button>
          <span id="current-file-name">Loading...</span>
          <div id="file-dropdown" class="hidden">
            <input id="file-search" />
            <div class="file-dropdown-actions">
               <button id="new-file-btn"></button>
               <button id="rename-file-btn"></button>
               <button id="delete-file-btn"></button>
            </div>
            <div id="file-list"></div>
          </div>
        </div>
        <div id="cell-reference"></div>
        <input id="formula-input" />
      </div>
    `);
    global.document = dom.window.document;
    global.window = dom.window;

    // Mock FileManager
    mockFileManager = {
      files: [
        { id: '1', name: 'File A', modified: new Date().toISOString() },
        { id: '2', name: 'File B', modified: new Date().toISOString() }
      ],
      currentFile: { id: '1', name: 'File A' },
      getCurrentFileId: vi.fn().mockReturnValue('1'), // Default to File A
      getCurrentFileData: vi.fn(),
      loadFile: vi.fn(),
      onFileListUpdate: null,
      onCurrentFileChange: null,
      onSaveStatusChange: null,
      onError: null,
    };

    // Mock Spreadsheet
    mockSpreadsheet = {
      loadFromFile: vi.fn(),
    };
  });

  it('should hydrate current file name on init (Fix Start Empty)', () => {
    // Act
    new FormulaBar(mockFileManager, mockSpreadsheet);

    // Assert
    const fileNameDisplay = document.getElementById('current-file-name');
    expect(fileNameDisplay.textContent).toBe('File A');
    expect(fileNameDisplay.textContent).not.toBe('Loading...');
  });

  it('should always close dropdown even if load fails (Fix Stuck Dropdown)', async () => {
    const formulaBar = new FormulaBar(mockFileManager, mockSpreadsheet);
    
    // Simulate dropdown open
    formulaBar.elements.fileDropdown.classList.remove('hidden');
    
    // Mock loadFile failure
    mockFileManager.loadFile.mockRejectedValue(new Error('Network Error'));
    
    // Get file items (Item 2 is File B)
    const items = document.getElementById('file-list').querySelectorAll('.file-item');
    
    // Act: Click File B
    await items[1].click();

    // Assert: Dropdown should be hidden despite the error
    expect(formulaBar.elements.fileDropdown.classList.contains('hidden')).toBe(true);
  });

  it('should use fresh currentId when clicking (Fix Stale Closure)', async () => {
    const formulaBar = new FormulaBar(mockFileManager, mockSpreadsheet);
    
    // 1. Initial State: Current is '1'. We click '2'.
    const items = document.getElementById('file-list').querySelectorAll('.file-item');
    
    // 2. CHANGE State: Mock that FileManager has switched to '2' 
    // (Simulating a previous action that didn't re-render the list)
    mockFileManager.getCurrentFileId.mockReturnValue('2');
    
    // 3. Act: Click Item '2' again. 
    // If using stale closure (id='1'), it would try to load '2'.
    // If using fresh check (id='2'), it should skip loading.
    await items[1].click();

    // Assert: Should NOT call loadFile because it's already current
    expect(mockFileManager.loadFile).not.toHaveBeenCalled();
  });
});