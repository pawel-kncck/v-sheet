/**
 * FileManager class handles all file operations and API communication
 * for the spreadsheet application
 */
import { StyleManager } from './StyleManager.js'; // <--- NEW IMPORT

class FileManager {
  constructor() {
    this.baseUrl = `${window.location.origin}/api`;
    this.currentFile = null;
    this.files = [];
    this.saveTimeout = null;
    this.saveDelay = 500; // 500ms debounce for autosave
    this.isSaving = false;
    this.hasUnsavedChanges = false;
    
    this.styleManager = null; // <--- NEW: Style Manager instance

    // Callbacks for UI updates
    this.onFileListUpdate = null;
    this.onCurrentFileChange = null;
    this.onSaveStatusChange = null;
    this.onError = null;
  }

  /**
   * Initialize the file manager and load the recent file
   */
  async initialize() {
    try {
      // First check if the server is accessible
      const healthCheck = await fetch(`${window.location.origin}/health`).catch(
        () => null
      );
      if (!healthCheck || !healthCheck.ok) {
        throw new Error('Backend server is not accessible at ' + this.baseUrl);
      }

      // Load the list of files
      await this.loadFileList();

      // Get the most recent file
      const recentFile = await this.getRecentFile();

      if (recentFile && recentFile.recentFileId) {
        // Load the recent file
        await this.loadFile(recentFile.recentFileId);
      } else if (this.files.length > 0) {
        // Load the first available file
        await this.loadFile(this.files[0].id);
      } else {
        // Create a new file if none exist
        await this.createNewFile('My First Spreadsheet');
      }

      return true;
    } catch (error) {
      this.handleError('Failed to initialize file manager', error);
      // Show more specific error to user
      if (error.message.includes('Backend server is not accessible')) {
        alert(
          'Cannot connect to backend server. Please ensure the Flask server is running on port 5000.'
        );
      }
      return false;
    }
  }

  /**
   * Load the list of all available files
   */
  async loadFileList() {
    try {
      const response = await fetch(`${this.baseUrl}/files`);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      this.files = data.files || [];

      if (this.onFileListUpdate) {
        this.onFileListUpdate(this.files);
      }

      return this.files;
    } catch (error) {
      this.handleError('Failed to load file list', error);
      throw error;
    }
  }

  /**
   * Get the most recently accessed file ID
   */
  async getRecentFile() {
    try {
      const response = await fetch(`${this.baseUrl}/recent`);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      return await response.json();
    } catch (error) {
      this.handleError('Failed to get recent file', error);
      return null;
    }
  }

  /**
   * Load a specific file by ID
   */
  async loadFile(fileId) {
    try {
      // Save current file if there are unsaved changes
      if (this.hasUnsavedChanges && this.currentFile) {
        await this.saveCurrentFile();
      }

      this.setSaveStatus('loading');

      const response = await fetch(`${this.baseUrl}/files/${fileId}`);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const fileData = await response.json();
      this.currentFile = fileData;
      this.hasUnsavedChanges = false;

      // --- NEW: Initialize StyleManager ---
      // Use existing styles or create empty object if migrating old file
      if (!this.currentFile.data.styles) {
        this.currentFile.data.styles = {};
      }
      this.styleManager = new StyleManager(this.currentFile.data.styles);

      // Update recent file tracking
      await this.updateRecentFile(fileId);

      if (this.onCurrentFileChange) {
        this.onCurrentFileChange(this.currentFile);
      }

      this.setSaveStatus('saved');

      return this.currentFile;
    } catch (error) {
      this.handleError('Failed to load file', error);
      this.setSaveStatus('error');
      throw error;
    }
  }

  /**
   * Create a new file
   */
  async createNewFile(name = 'Untitled Spreadsheet') {
    try {
      // Save current file if there are unsaved changes
      if (this.hasUnsavedChanges && this.currentFile) {
        await this.saveCurrentFile();
      }

      this.setSaveStatus('loading');

      const response = await fetch(`${this.baseUrl}/files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const fileData = await response.json();
      this.currentFile = fileData;
      this.hasUnsavedChanges = false;

      // --- NEW: Initialize StyleManager ---
      if (!this.currentFile.data.styles) {
        this.currentFile.data.styles = {};
      }
      this.styleManager = new StyleManager(this.currentFile.data.styles);

      // Reload file list to include new file
      await this.loadFileList();

      if (this.onCurrentFileChange) {
        this.onCurrentFileChange(this.currentFile);
      }

      this.setSaveStatus('saved');

      return this.currentFile;
    } catch (error) {
      this.handleError('Failed to create new file', error);
      this.setSaveStatus('error');
      throw error;
    }
  }

  /**
   * Save the current file
   */
  async saveCurrentFile() {
    if (!this.currentFile || !this.hasUnsavedChanges) {
      return;
    }

    if (this.isSaving) {
      // Already saving, queue another save
      this.queueAutosave();
      return;
    }

    try {
      this.isSaving = true;
      this.setSaveStatus('saving');

      // Note: this.currentFile.data.styles is updated in-place by StyleManager
      // so we don't need to manually sync it before saving.

      const response = await fetch(
        `${this.baseUrl}/files/${this.currentFile.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: this.currentFile.name,
            data: this.currentFile.data,
          }),
        }
      );

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();
      this.currentFile.modified = result.modified;
      this.hasUnsavedChanges = false;

      this.setSaveStatus('saved');

      // Update file in the list
      const fileIndex = this.files.findIndex(
        (f) => f.id === this.currentFile.id
      );
      if (fileIndex !== -1) {
        this.files[fileIndex].modified = result.modified;
        if (this.onFileListUpdate) {
          this.onFileListUpdate(this.files);
        }
      }
    } catch (error) {
      this.handleError('Failed to save file', error);
      this.setSaveStatus('error');
      throw error;
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Delete a file by ID
   */
  async deleteFile(fileId) {
    try {
      const confirmDelete = confirm(
        'Are you sure you want to delete this file?'
      );
      if (!confirmDelete) return false;

      this.setSaveStatus('loading');

      const response = await fetch(`${this.baseUrl}/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      // If we deleted the current file, load another one
      if (this.currentFile && this.currentFile.id === fileId) {
        await this.loadFileList();

        if (this.files.length > 0) {
          await this.loadFile(this.files[0].id);
        } else {
          // Create a new file if none left
          await this.createNewFile('New Spreadsheet');
        }
      } else {
        // Just refresh the file list
        await this.loadFileList();
      }

      return true;
    } catch (error) {
      this.handleError('Failed to delete file', error);
      this.setSaveStatus('error');
      return false;
    }
  }

  /**
   * Rename the current file
   */
  async renameCurrentFile(newName) {
    if (!this.currentFile) return false;

    try {
      this.currentFile.name = newName;
      this.markAsModified();
      await this.saveCurrentFile();

      // Update file in the list
      const fileIndex = this.files.findIndex(
        (f) => f.id === this.currentFile.id
      );
      if (fileIndex !== -1) {
        this.files[fileIndex].name = newName;
        if (this.onFileListUpdate) {
          this.onFileListUpdate(this.files);
        }
      }

      if (this.onCurrentFileChange) {
        this.onCurrentFileChange(this.currentFile);
      }

      return true;
    } catch (error) {
      this.handleError('Failed to rename file', error);
      return false;
    }
  }

  /**
   * Update the recent file tracking
   */
  async updateRecentFile(fileId) {
    try {
      // This is handled by the backend when we GET a file
      // but we can also explicitly update it if needed
      return true;
    } catch (error) {
      // Non-critical error, don't propagate
      console.warn('Failed to update recent file tracking:', error);
      return false;
    }
  }

  /**
   * Update cell data in the current file
   */
  updateCellData(cellId, value) {
    if (!this.currentFile) return;

    if (!this.currentFile.data.cells) {
      this.currentFile.data.cells = {};
    }

    // Check if we need to delete the cell or just clear value
    if (value === '' || value === null || value === undefined) {
      const cell = this.currentFile.data.cells[cellId];
      
      // <--- UPDATED LOGIC: Preserve style if present
      if (cell && cell.styleId) {
        delete cell.value;
        delete cell.formula;
        // We keep the cell object because it has a styleId
      } else {
        // No style, safe to remove completely
        delete this.currentFile.data.cells[cellId];
      }
    } else {
      // Ensure cell object exists
      if (!this.currentFile.data.cells[cellId]) {
        this.currentFile.data.cells[cellId] = {};
      }
      
      // Store the cell value
      this.currentFile.data.cells[cellId].value = value;
      this.currentFile.data.cells[cellId].formula = value.toString().startsWith('=');
    }

    this.markAsModified();
    this.queueAutosave();
  }

  /**
   * --- NEW METHOD: Update cell formatting ---
   * Uses Flyweight pattern via StyleManager
   * @param {string} cellId 
   * @param {Object} styleObject 
   */
  updateCellFormat(cellId, styleObject) {
    if (!this.currentFile || !this.styleManager) return;

    if (!this.currentFile.data.cells) {
      this.currentFile.data.cells = {};
    }

    // Get or create the ID for this style
    const styleId = this.styleManager.addStyle(styleObject);

    // Ensure cell exists
    if (!this.currentFile.data.cells[cellId]) {
      this.currentFile.data.cells[cellId] = {};
    }

    // Set the reference ID
    this.currentFile.data.cells[cellId].styleId = styleId;

    this.markAsModified();
    this.queueAutosave();
  }

  /**
   * --- NEW METHOD: Get resolved style object for a cell ---
   * @param {string} cellId 
   * @returns {Object|null} The full style object or null
   */
  getCellStyle(cellId) {
    if (!this.currentFile || !this.styleManager) return null;
    
    const cell = this.currentFile.data.cells?.[cellId];
    if (!cell || !cell.styleId) return null;

    return this.styleManager.getStyle(cell.styleId);
  }

  /**
   * Update column widths
   */
  updateColumnWidths(columnWidths) {
    if (!this.currentFile) return;

    this.currentFile.data.columnWidths = columnWidths;
    this.markAsModified();
    this.queueAutosave();
  }

  /**
   * Update row heights
   */
  updateRowHeights(rowHeights) {
    if (!this.currentFile) return;

    this.currentFile.data.rowHeights = rowHeights;
    this.markAsModified();
    this.queueAutosave();
  }

  /**
   * Update metadata (last active cell, selections, etc.)
   */
  updateMetadata(metadata) {
    if (!this.currentFile) {
      console.warn('Cannot update metadata: no current file loaded');
      return;
    }

    if (!this.currentFile.data) {
      this.currentFile.data = {};
    }

    this.currentFile.data.metadata = {
      ...this.currentFile.data.metadata,
      ...metadata,
    };

    this.markAsModified();
    this.queueAutosave();
  }

  /**
   * Mark the current file as modified
   */
  markAsModified() {
    this.hasUnsavedChanges = true;
    this.setSaveStatus('unsaved');
  }

  /**
   * Queue an autosave with debouncing
   */
  queueAutosave() {
    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Set a new timeout
    this.saveTimeout = setTimeout(() => {
      this.saveCurrentFile();
    }, this.saveDelay);
  }

  /**
   * Force save immediately (e.g., on window unload)
   */
  async forceSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    if (this.hasUnsavedChanges) {
      await this.saveCurrentFile();
    }
  }

  /**
   * Set the save status and notify listeners
   */
  setSaveStatus(status) {
    if (this.onSaveStatusChange) {
      this.onSaveStatusChange(status);
    }
  }

  /**
   * Handle and report errors
   */
  handleError(message, error) {
    console.error(message, error);

    if (this.onError) {
      this.onError({
        message,
        error: error.toString(),
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get current file data
   */
  getCurrentFileData() {
    return this.currentFile ? this.currentFile.data : null;
  }

  /**
   * Get current file name
   */
  getCurrentFileName() {
    return this.currentFile ? this.currentFile.name : 'Untitled';
  }

  /**
   * Get current file ID
   */
  getCurrentFileId() {
    return this.currentFile ? this.currentFile.id : null;
  }

  /**
   * Check if there are unsaved changes
   */
  hasChanges() {
    return this.hasUnsavedChanges;
  }

  /**
   * Get the raw value (formula string or text) for a specific cell.
   * @param {string} cellId - The ID of the cell (e.g., "A1").
   * @returns {string} The raw value (e.g., "=A1+B1" or "5").
   */
  getRawCellValue(cellId) {
    if (
      !this.currentFile ||
      !this.currentFile.data ||
      !this.currentFile.data.cells
    ) {
      return '';
    }
    const cellInfo = this.currentFile.data.cells[cellId];

    // cellInfo.value holds the raw string we saved
    // <--- UPDATED: Safety check for undefined (in case cell only has style)
    return (cellInfo && cellInfo.value !== undefined) ? cellInfo.value : '';
  }

  /**
   * Clear all data (useful for testing or reset)
   */
  clear() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.currentFile = null;
    this.files = [];
    this.hasUnsavedChanges = false;
    this.isSaving = false;
    this.styleManager = null; // Reset
  }
}

export { FileManager };