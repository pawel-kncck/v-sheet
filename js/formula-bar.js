/**
 * FormulaBar class manages the formula bar UI including:
 * - File selector dropdown
 * - Cell reference display
 * - Formula input field
 * - Synchronization with spreadsheet
 */
class FormulaBar {
  constructor(fileManager, spreadsheet) {
    this.fileManager = fileManager;
    this.spreadsheet = spreadsheet;

    // UI Elements
    this.elements = {
      // File selector
      fileSelectorButton: document.getElementById('file-selector-button'),
      currentFileName: document.getElementById('current-file-name'),
      fileDropdown: document.getElementById('file-dropdown'),
      fileSearch: document.getElementById('file-search'),
      fileList: document.getElementById('file-list'),
      newFileBtn: document.getElementById('new-file-btn'),
      renameFileBtn: document.getElementById('rename-file-btn'),
      deleteFileBtn: document.getElementById('delete-file-btn'),

      // Formula bar
      cellReference: document.getElementById('cell-reference'),
      formulaInput: document.getElementById('formula-input'),
    };

    // State
    this.isDropdownOpen = false;
    this.currentCell = 'A1';
    this.isEditingFormula = false;

    // Initialize
    this.init();
  }

  /**
   * Initialize the formula bar
   */
  init() {
    this.setupEventListeners();
    this.setupFileManagerCallbacks();
    this.setupSpreadsheetCallbacks();
  }

  /**
   * Set up DOM event listeners
   */
  setupEventListeners() {
    // File selector dropdown toggle
    this.elements.fileSelectorButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleFileDropdown();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.elements.fileDropdown.contains(e.target)) {
        this.closeFileDropdown();
      }
    });

    // File search
    this.elements.fileSearch.addEventListener('input', (e) => {
      this.filterFileList(e.target.value);
    });

    // Prevent dropdown close when clicking inside
    this.elements.fileDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // File action buttons
    this.elements.newFileBtn.addEventListener('click', () => {
      this.handleNewFile();
    });

    this.elements.renameFileBtn.addEventListener('click', () => {
      this.handleRenameFile();
    });

    this.elements.deleteFileBtn.addEventListener('click', () => {
      this.handleDeleteFile();
    });

    // Formula input
    this.elements.formulaInput.addEventListener('focus', () => {
      this.isEditingFormula = true;
    });

    this.elements.formulaInput.addEventListener('blur', () => {
      this.isEditingFormula = false;
    });

    this.elements.formulaInput.addEventListener('keydown', (e) => {
      this.handleFormulaKeydown(e);
    });

    this.elements.formulaInput.addEventListener('input', (e) => {
      this.handleFormulaInput(e);
    });
  }

  /**
   * Set up FileManager callbacks
   */
  setupFileManagerCallbacks() {
    // Update file list when it changes
    this.fileManager.onFileListUpdate = (files) => {
      this.updateFileList(files);
    };

    // Update current file display
    this.fileManager.onCurrentFileChange = (file) => {
      this.updateCurrentFile(file);
    };

    // Update save status
    this.fileManager.onSaveStatusChange = (status) => {
      this.updateSaveStatus(status);
    };

    // Handle errors
    this.fileManager.onError = (error) => {
      this.showError(error.message);
    };
  }

  /**
   * Set up Spreadsheet callbacks
   */
  setupSpreadsheetCallbacks() {
    // This will be called from the spreadsheet integration
    // For now, we'll define the expected interface
  }

  /**
   * Toggle file dropdown visibility
   */
  toggleFileDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;

    if (this.isDropdownOpen) {
      this.openFileDropdown();
    } else {
      this.closeFileDropdown();
    }
  }

  /**
   * Open file dropdown
   */
  openFileDropdown() {
    this.elements.fileDropdown.classList.remove('hidden');
    this.elements.fileSelectorButton.classList.add('active');
    this.elements.fileSearch.value = '';
    this.elements.fileSearch.focus();
    this.filterFileList('');
  }

  /**
   * Close file dropdown
   */
  closeFileDropdown() {
    this.elements.fileDropdown.classList.add('hidden');
    this.elements.fileSelectorButton.classList.remove('active');
    this.isDropdownOpen = false;
  }

  /**
   * Update the file list in dropdown
   */
  updateFileList(files) {
    this.elements.fileList.innerHTML = '';

    const currentFileId = this.fileManager.getCurrentFileId();

    files.forEach((file) => {
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item';
      fileItem.dataset.fileId = file.id;
      fileItem.dataset.fileName = file.name.toLowerCase();

      // Mark active file
      if (file.id === currentFileId) {
        fileItem.classList.add('active');
      }

      // File name
      const fileName = document.createElement('span');
      fileName.className = 'file-item-name';
      fileName.textContent = file.name;

      // File date
      const fileDate = document.createElement('span');
      fileDate.className = 'file-item-date';
      fileDate.textContent = this.formatDate(file.modified);

      fileItem.appendChild(fileName);
      fileItem.appendChild(fileDate);

      // Click handler to load file
      fileItem.addEventListener('click', async () => {
        if (file.id !== currentFileId) {
          await this.fileManager.loadFile(file.id);
          // Load the spreadsheet data
          if (this.spreadsheet && this.spreadsheet.loadFromFile) {
            this.spreadsheet.loadFromFile(
              this.fileManager.getCurrentFileData()
            );
          }
        }
        this.closeFileDropdown();
      });

      this.elements.fileList.appendChild(fileItem);
    });
  }

  /**
   * Filter file list based on search input
   */
  filterFileList(searchTerm) {
    const term = searchTerm.toLowerCase();
    const fileItems = this.elements.fileList.querySelectorAll('.file-item');

    fileItems.forEach((item) => {
      const fileName = item.dataset.fileName;
      if (fileName.includes(term)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  }

  /**
   * Update current file display
   */
  updateCurrentFile(file) {
    if (file) {
      this.elements.currentFileName.textContent = file.name;

      // Update active state in file list
      const fileItems = this.elements.fileList.querySelectorAll('.file-item');
      fileItems.forEach((item) => {
        if (item.dataset.fileId === file.id) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    }
  }

  /**
   * Update save status indicator
   */
  updateSaveStatus(status) {
    // Add a visual indicator to the file name
    const indicator = '● ';
    let text = this.fileManager.getCurrentFileName();

    switch (status) {
      case 'saved':
        this.elements.currentFileName.textContent = text;
        this.elements.currentFileName.style.color = '#202124';
        break;
      case 'saving':
        this.elements.currentFileName.textContent = indicator + text;
        this.elements.currentFileName.style.color = '#1a73e8';
        break;
      case 'unsaved':
        this.elements.currentFileName.textContent = indicator + text;
        this.elements.currentFileName.style.color = '#ea8600';
        break;
      case 'error':
        this.elements.currentFileName.textContent = '⚠ ' + text;
        this.elements.currentFileName.style.color = '#d93025';
        break;
      case 'loading':
        this.elements.currentFileName.textContent = 'Loading...';
        this.elements.currentFileName.style.color = '#5f6368';
        break;
    }
  }

  /**
   * Handle new file creation
   */
  async handleNewFile() {
    const name = prompt('Enter file name:', 'New Spreadsheet');
    if (name) {
      // Create the new file first
      const newFile = await this.fileManager.createNewFile(name);

      if (newFile) {
        // Only clear and reload after file is successfully created
        if (this.spreadsheet) {
          // Temporarily disconnect the fileManager to prevent metadata updates during clear
          const tempFileManager = this.spreadsheet.fileManager;
          this.spreadsheet.fileManager = null;

          // Clear the spreadsheet
          if (this.spreadsheet.clear) {
            this.spreadsheet.clear();
          }

          // Restore fileManager connection
          this.spreadsheet.fileManager = tempFileManager;

          // Load the new file data
          if (this.spreadsheet.loadFromFile) {
            this.spreadsheet.loadFromFile(
              this.fileManager.getCurrentFileData()
            );
          }
        }
      }

      this.closeFileDropdown();
    }
  }

  /**
   * Handle file rename
   */
  async handleRenameFile() {
    const currentName = this.fileManager.getCurrentFileName();
    const newName = prompt('Enter new name:', currentName);
    if (newName && newName !== currentName) {
      await this.fileManager.renameCurrentFile(newName);
      this.closeFileDropdown();
    }
  }

  /**
   * Handle file deletion
   */
  async handleDeleteFile() {
    const fileName = this.fileManager.getCurrentFileName();
    const confirmMsg = `Are you sure you want to delete "${fileName}"?`;

    if (confirm(confirmMsg)) {
      const fileId = this.fileManager.getCurrentFileId();
      await this.fileManager.deleteFile(fileId);

      // Load the new current file
      if (this.spreadsheet && this.spreadsheet.loadFromFile) {
        this.spreadsheet.loadFromFile(this.fileManager.getCurrentFileData());
      }
      this.closeFileDropdown();
    }
  }

  /**
   * Update cell reference display
   */
  updateCellReference(cellId) {
    this.currentCell = cellId;
    this.elements.cellReference.textContent = cellId;
  }

  /**
   * Update formula input with cell value
   */
  updateFormulaInput(value) {
    if (!this.isEditingFormula) {
      this.elements.formulaInput.value = value || '';
    }
  }

  /**
   * Handle formula input keydown
   */
  handleFormulaKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.commitFormula();

      // Move to next cell if not shift+enter
      if (!e.shiftKey && this.spreadsheet) {
        // Move down one cell
        const match = this.currentCell.match(/([A-Z]+)(\d+)/);
        if (match) {
          const col = match[1];
          const row = parseInt(match[2]) + 1;
          const nextCell = `${col}${row}`;

          // Tell spreadsheet to select next cell
          if (this.spreadsheet.selectCell) {
            this.spreadsheet.selectCell(nextCell);
          }
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.cancelFormulaEdit();
    }
  }

  /**
   * Handle formula input changes
   */
  handleFormulaInput(e) {
    // Live preview of formula (optional)
    // This could show formula syntax highlighting or validation
  }

  /**
   * Commit formula to current cell
   */
  commitFormula() {
    const value = this.elements.formulaInput.value;

    // Update the spreadsheet cell
    if (this.spreadsheet && this.spreadsheet.setCellValue) {
      this.spreadsheet.setCellValue(this.currentCell, value);
    }

    // Update file manager
    this.fileManager.updateCellData(this.currentCell, value);

    // Remove focus from formula input
    this.elements.formulaInput.blur();

    if (this.spreadsheet && this.spreadsheet.cellGridContainer) {
      this.spreadsheet.cellGridContainer.focus();
    }
  }

  /**
   * Cancel formula editing
   */
  cancelFormulaEdit() {
    // Restore original value
    if (this.spreadsheet && this.spreadsheet.getCellValue) {
      const originalValue = this.spreadsheet.getCellValue(this.currentCell);
      this.elements.formulaInput.value = originalValue || '';
    }

    // Remove focus
    this.elements.formulaInput.blur();

    if (this.spreadsheet && this.spreadsheet.cellGridContainer) {
      this.spreadsheet.cellGridContainer.focus();
    }
  }

  /**
   * Focus on formula input for editing
   */
  focusFormulaInput() {
    this.elements.formulaInput.focus();
    this.elements.formulaInput.select();
    this.isEditingFormula = true;
  }

  /**
   * Format date for display
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    // Format as date for older files
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }

  /**
   * Show error message
   */
  showError(message) {
    // Could be enhanced with a toast notification
    console.error('Formula Bar Error:', message);

    // Temporarily show error in file name area
    const originalText = this.elements.currentFileName.textContent;
    const originalColor = this.elements.currentFileName.style.color;

    this.elements.currentFileName.textContent = '⚠ ' + message;
    this.elements.currentFileName.style.color = '#d93025';

    setTimeout(() => {
      this.elements.currentFileName.textContent = originalText;
      this.elements.currentFileName.style.color = originalColor;
    }, 3000);
  }

  /**
   * Clean up event listeners and resources
   */
  destroy() {
    // Remove event listeners if needed
    // This is useful for single-page applications
  }
}

// OLD (remove this):
// if (typeof module !== 'undefined' && module.exports) {
//   module.exports = FormulaBar;
// }

// NEW (use this instead):
export { FormulaBar };
