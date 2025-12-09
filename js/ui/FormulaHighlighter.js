import { Logger } from '../engine/utils/Logger.js';
import { CellHelpers } from '../engine/utils/CellHelpers.js';

/**
 * FormulaHighlighter - Manages visual feedback for formula building
 *
 * Features:
 * - Assigns colors to cell references in formulas
 * - Draws colored dashed borders around referenced cells/ranges
 * - Highlights references when cursor hovers over them in the editor
 *
 * @module ui/FormulaHighlighter
 */
export class FormulaHighlighter {
  /**
   * Fixed 12-color palette for cell references
   * Colors are assigned sequentially to unique references
   */
  static COLOR_PALETTE = [
    '#f7981d', // Orange
    '#7e3794', // Purple
    '#11a9cc', // Cyan
    '#a61d4c', // Dark pink
    '#4285f4', // Blue
    '#f4b400', // Yellow
    '#65b045', // Green
    '#795548', // Brown
    '#999999', // Gray
    '#f1ca3a', // Gold
    '#3f5ca9', // Dark blue
    '#c3d03f'  // Lime
  ];

  /**
   * @param {GridRenderer} gridRenderer
   * @param {SelectionManager} selectionManager
   */
  constructor(gridRenderer, selectionManager) {
    this.gridRenderer = gridRenderer;
    this.selectionManager = selectionManager;

    // Current formula and its parsed references
    this.currentFormula = '';
    this.references = []; // Array of { ref: 'A1' or 'A1:B2', color: '#F26419', start: 0, end: 2 }

    // Active state
    this.isActive = false;
    this.hoveredReferenceIndex = -1; // Index of reference under cursor

    // Set up formula bar cursor tracking
    const formulaBar = document.getElementById('formula-input');
    if (formulaBar) {
      formulaBar.addEventListener('click', () => this._updateFormulaBarCursorHighlight());
      formulaBar.addEventListener('keyup', () => this._updateFormulaBarCursorHighlight());
      formulaBar.addEventListener('select', () => this._updateFormulaBarCursorHighlight());
    }

    Logger.log('FormulaHighlighter', 'Initialized');
  }

  /**
   * Activates highlighting for a formula
   * @param {string} formula - The formula to highlight (e.g., "=A1+B2")
   */
  activate(formula) {
    this.isActive = true;
    this.currentFormula = formula;
    this.references = this._parseReferences(formula);
    this._drawReferenceBorders();
    this._drawTextOverlay();
    this._drawFormulaBarOverlay();

    Logger.log('FormulaHighlighter', `Activated with ${this.references.length} references`);
  }

  /**
   * Updates the formula and re-highlights
   * @param {string} formula - Updated formula
   */
  update(formula) {
    if (!this.isActive) return;

    this.currentFormula = formula;
    this.references = this._parseReferences(formula);
    this._drawReferenceBorders();
    this._drawTextOverlay();
    this._drawFormulaBarOverlay();

    Logger.log('FormulaHighlighter', `Updated with ${this.references.length} references`);
  }

  /**
   * Deactivates highlighting and cleans up
   */
  deactivate() {
    this.isActive = false;
    this.currentFormula = '';
    this.references = [];
    this.hoveredReferenceIndex = -1;
    this._clearReferenceBorders();
    this._clearOverlays();
    this._clearTextOverlay();
    this._clearFormulaBarOverlay();

    Logger.log('FormulaHighlighter', 'Deactivated');
  }

  /**
   * Handles cursor position change in editor to show hover effects
   * @param {number} cursorPos - Cursor position in editor
   */
  updateCursorPosition(cursorPos) {
    if (!this.isActive) return;

    // Find which reference the cursor is over
    const newHoveredIndex = this.references.findIndex(ref =>
      cursorPos >= ref.start && cursorPos <= ref.end
    );

    if (newHoveredIndex !== this.hoveredReferenceIndex) {
      this.hoveredReferenceIndex = newHoveredIndex;
      this._updateOverlays();
    }
  }

  /**
   * Parses formula and extracts all cell references with their positions and colors
   * @private
   * @param {string} formula - Formula string
   * @returns {Array} Array of reference objects
   */
  _parseReferences(formula) {
    if (!formula || !formula.startsWith('=')) return [];

    const references = [];
    const uniqueRefs = new Map(); // Track unique refs for color assignment

    // Regex to match cell references and ranges
    const refRegex = /\$?[A-Z]+\$?[0-9]+(?::\$?[A-Z]+\$?[0-9]+)?/gi;
    let match;

    while ((match = refRegex.exec(formula)) !== null) {
      const refString = match[0];
      const start = match.index;
      const end = start + refString.length;

      // Assign color based on unique reference (case-insensitive)
      const refKey = refString.toUpperCase();
      if (!uniqueRefs.has(refKey)) {
        const colorIndex = uniqueRefs.size % FormulaHighlighter.COLOR_PALETTE.length;
        uniqueRefs.set(refKey, FormulaHighlighter.COLOR_PALETTE[colorIndex]);
      }

      references.push({
        ref: refString,
        color: uniqueRefs.get(refKey),
        start,
        end
      });
    }

    return references;
  }

  /**
   * Draws colored dashed borders around all referenced cells/ranges
   * @private
   */
  _drawReferenceBorders() {
    this._clearReferenceBorders();

    if (!this.isActive || this.references.length === 0) return;

    // Create or get the overlay container
    let overlayContainer = document.getElementById('formula-highlight-overlay');
    if (!overlayContainer) {
      overlayContainer = document.createElement('div');
      overlayContainer.id = 'formula-highlight-overlay';
      overlayContainer.style.position = 'absolute';
      overlayContainer.style.top = '0';
      overlayContainer.style.left = '0';
      overlayContainer.style.width = '100%';
      overlayContainer.style.height = '100%';
      overlayContainer.style.pointerEvents = 'none';
      overlayContainer.style.zIndex = '50'; // Below editor (z-index: 100) but above cells
      overlayContainer.style.visibility = 'visible';
      this.gridRenderer.cellGridContainer.appendChild(overlayContainer);
    }

    // Show the overlay when drawing borders
    overlayContainer.style.display = 'block';

    // Draw border for each reference
    this.references.forEach((reference, index) => {
      const coords = this._parseReferenceToCoords(reference.ref);
      if (!coords) return;

      coords.forEach(coord => {
        const border = this._createReferenceBorder(coord, reference.color, index);
        if (border) {
          overlayContainer.appendChild(border);
        }
      });
    });
  }

  /**
   * Creates a dashed border element for a cell or range
   * @private
   * @param {Object} coord - { startRow, startCol, endRow, endCol }
   * @param {string} color - Hex color
   * @param {number} index - Reference index
   * @returns {HTMLElement} Border element
   */
  _createReferenceBorder(coord, color, index) {
    const { startRow, startCol, endRow, endCol } = coord;

    // Get cell elements to calculate position
    const startCellId = CellHelpers.buildCellRef(startRow, startCol);
    const endCellId = CellHelpers.buildCellRef(endRow, endCol);

    const startCell = this.gridRenderer.getCellElement(startCellId);
    const endCell = this.gridRenderer.getCellElement(endCellId);

    if (!startCell || !endCell) return null;

    const gridContainer = this.gridRenderer.cellGridContainer;
    const scrollLeft = gridContainer.scrollLeft;
    const scrollTop = gridContainer.scrollTop;

    const startRect = startCell.getBoundingClientRect();
    const endRect = endCell.getBoundingClientRect();
    const gridRect = gridContainer.getBoundingClientRect();

    // Calculate position relative to grid
    const left = startCell.offsetLeft - scrollLeft;
    const top = startCell.offsetTop - scrollTop;
    const width = endCell.offsetLeft - startCell.offsetLeft + endCell.offsetWidth;
    const height = endCell.offsetTop - startCell.offsetTop + endCell.offsetHeight;

    const border = document.createElement('div');
    border.className = 'formula-reference-border';
    border.dataset.referenceIndex = index;
    border.style.position = 'absolute';
    border.style.left = `${left}px`;
    border.style.top = `${top}px`;
    border.style.width = `${width}px`;
    border.style.height = `${height}px`;
    border.style.border = `1px dashed ${color}`;
    border.style.borderRadius = '2px';
    border.style.pointerEvents = 'none';
    border.style.boxSizing = 'border-box';

    return border;
  }

  /**
   * Clears all reference borders
   * @private
   */
  _clearReferenceBorders() {
    const overlay = document.getElementById('formula-highlight-overlay');
    if (overlay) {
      overlay.innerHTML = '';
      // Hide the overlay when empty to prevent it from blocking interactions
      overlay.style.display = 'none';
    }
  }

  /**
   * Updates overlays based on hovered reference
   * @private
   */
  _updateOverlays() {
    this._clearOverlays();

    if (this.hoveredReferenceIndex === -1 || !this.isActive) return;

    const reference = this.references[this.hoveredReferenceIndex];
    if (!reference) return;

    const coords = this._parseReferenceToCoords(reference.ref);
    if (!coords) return;

    // Create overlay container
    let overlayContainer = document.getElementById('formula-hover-overlay');
    if (!overlayContainer) {
      overlayContainer = document.createElement('div');
      overlayContainer.id = 'formula-hover-overlay';
      overlayContainer.style.position = 'absolute';
      overlayContainer.style.top = '0';
      overlayContainer.style.left = '0';
      overlayContainer.style.width = '100%';
      overlayContainer.style.height = '100%';
      overlayContainer.style.pointerEvents = 'none';
      overlayContainer.style.zIndex = '50';
      overlayContainer.style.visibility = 'visible';
      this.gridRenderer.cellGridContainer.appendChild(overlayContainer);
    }

    // Show the overlay when drawing hover effects
    overlayContainer.style.display = 'block';

    // Add overlay for each cell in the reference
    coords.forEach(coord => {
      const overlay = this._createReferenceOverlay(coord, reference.color);
      if (overlay) {
        overlayContainer.appendChild(overlay);
      }
    });
  }

  /**
   * Creates an overlay element for a cell or range (hover effect)
   * @private
   * @param {Object} coord - { startRow, startCol, endRow, endCol }
   * @param {string} color - Hex color
   * @returns {HTMLElement} Overlay element
   */
  _createReferenceOverlay(coord, color) {
    const { startRow, startCol, endRow, endCol } = coord;

    const startCellId = CellHelpers.buildCellRef(startRow, startCol);
    const endCellId = CellHelpers.buildCellRef(endRow, endCol);

    const startCell = this.gridRenderer.getCellElement(startCellId);
    const endCell = this.gridRenderer.getCellElement(endCellId);

    if (!startCell || !endCell) return null;

    const gridContainer = this.gridRenderer.cellGridContainer;
    const scrollLeft = gridContainer.scrollLeft;
    const scrollTop = gridContainer.scrollTop;

    const left = startCell.offsetLeft - scrollLeft;
    const top = startCell.offsetTop - scrollTop;
    const width = endCell.offsetLeft - startCell.offsetLeft + endCell.offsetWidth;
    const height = endCell.offsetTop - startCell.offsetTop + endCell.offsetHeight;

    const overlay = document.createElement('div');
    overlay.className = 'formula-reference-overlay';
    overlay.style.position = 'absolute';
    overlay.style.left = `${left}px`;
    overlay.style.top = `${top}px`;
    overlay.style.width = `${width}px`;
    overlay.style.height = `${height}px`;
    overlay.style.backgroundColor = this._hexToRgba(color, 0.3);
    overlay.style.pointerEvents = 'none';
    overlay.style.borderRadius = '2px';

    return overlay;
  }

  /**
   * Clears all hover overlays
   * @private
   */
  _clearOverlays() {
    const overlay = document.getElementById('formula-hover-overlay');
    if (overlay) {
      overlay.innerHTML = '';
      // Hide the overlay when empty
      overlay.style.display = 'none';
    }
  }

  /**
   * Draws colored text overlay for cell references in the editor
   * @private
   */
  _drawTextOverlay() {
    this._clearTextOverlay();

    if (!this.isActive) return;

    const editor = document.getElementById('cell-editor');
    if (!editor) return;

    // Create or get the text overlay container
    let textOverlay = document.getElementById('formula-text-overlay');
    if (!textOverlay) {
      textOverlay = document.createElement('div');
      textOverlay.id = 'formula-text-overlay';
      textOverlay.style.position = 'absolute';
      textOverlay.style.pointerEvents = 'none';
      textOverlay.style.whiteSpace = 'nowrap';
      textOverlay.style.overflow = 'hidden';
      textOverlay.style.zIndex = '101'; // Above editor (z-index: 100)

      // Insert after the editor in DOM
      editor.parentNode.insertBefore(textOverlay, editor.nextSibling);
    }

    // Match editor's position and styling
    const editorStyle = window.getComputedStyle(editor);
    textOverlay.style.left = editor.style.left;
    textOverlay.style.top = editor.style.top;
    textOverlay.style.width = editor.style.width;
    textOverlay.style.height = editor.style.height;
    textOverlay.style.fontFamily = editorStyle.fontFamily;
    textOverlay.style.fontSize = editorStyle.fontSize;
    textOverlay.style.fontWeight = editorStyle.fontWeight;
    textOverlay.style.fontStyle = editorStyle.fontStyle;
    textOverlay.style.padding = editorStyle.padding;
    textOverlay.style.letterSpacing = editorStyle.letterSpacing;
    textOverlay.style.display = 'block';

    // Build the colored text HTML
    const formula = this.currentFormula;
    let html = '';

    if (this.references.length === 0) {
      // No references - just show the formula in black
      html = `<span style="color: #000000;">${this._escapeHtml(formula)}</span>`;
    } else {
      // Sort references by start position
      const sortedRefs = [...this.references].sort((a, b) => a.start - b.start);
      let lastIndex = 0;

      for (const reference of sortedRefs) {
        // Add text before this reference (in black)
        if (reference.start > lastIndex) {
          const beforeText = this._escapeHtml(formula.substring(lastIndex, reference.start));
          html += `<span style="color: #000000;">${beforeText}</span>`;
        }

        // Add the reference in its assigned color
        const refText = this._escapeHtml(reference.ref);
        html += `<span style="color: ${reference.color};">${refText}</span>`;

        lastIndex = reference.end;
      }

      // Add remaining text after last reference
      if (lastIndex < formula.length) {
        const afterText = this._escapeHtml(formula.substring(lastIndex));
        html += `<span style="color: #000000;">${afterText}</span>`;
      }
    }

    textOverlay.innerHTML = html;
  }

  /**
   * Clears the text overlay
   * @private
   */
  _clearTextOverlay() {
    const textOverlay = document.getElementById('formula-text-overlay');
    if (textOverlay) {
      textOverlay.style.display = 'none';
      textOverlay.innerHTML = '';
    }
  }

  /**
   * Escapes HTML special characters
   * @private
   * @param {string} text
   * @returns {string}
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Draws colored text overlay for formula bar
   * This works independently of the editing state - formula bar always shows colored text
   * @private
   */
  _drawFormulaBarOverlay() {
    const formulaBar = document.getElementById('formula-input');
    if (!formulaBar) return;

    const formula = formulaBar.value;
    if (!formula || !formula.startsWith('=')) {
      this._clearFormulaBarOverlay();
      return;
    }

    // Parse references directly from formula bar (independent of this.references)
    const references = this._parseReferences(formula);

    // Create or get the formula bar text overlay
    let textOverlay = document.getElementById('formula-bar-text-overlay');
    if (!textOverlay) {
      textOverlay = document.createElement('div');
      textOverlay.id = 'formula-bar-text-overlay';
      textOverlay.style.position = 'absolute';
      textOverlay.style.pointerEvents = 'none';
      textOverlay.style.whiteSpace = 'nowrap';
      textOverlay.style.overflow = 'hidden';
      textOverlay.style.zIndex = '101';

      formulaBar.parentNode.insertBefore(textOverlay, formulaBar.nextSibling);
    }

    // Match formula bar's position and styling
    const formulaBarStyle = window.getComputedStyle(formulaBar);
    const rect = formulaBar.getBoundingClientRect();
    const parentRect = formulaBar.parentNode.getBoundingClientRect();

    textOverlay.style.left = `${formulaBar.offsetLeft}px`;
    textOverlay.style.top = `${formulaBar.offsetTop}px`;
    textOverlay.style.width = `${rect.width}px`;
    textOverlay.style.height = `${rect.height}px`;
    textOverlay.style.fontFamily = formulaBarStyle.fontFamily;
    textOverlay.style.fontSize = formulaBarStyle.fontSize;
    textOverlay.style.fontWeight = formulaBarStyle.fontWeight;
    textOverlay.style.fontStyle = formulaBarStyle.fontStyle;
    textOverlay.style.padding = formulaBarStyle.padding;
    textOverlay.style.letterSpacing = formulaBarStyle.letterSpacing;
    textOverlay.style.display = 'flex';
    textOverlay.style.alignItems = 'center'; // Vertically center the text
    textOverlay.style.boxSizing = 'border-box';

    // Build colored HTML
    let html = '';
    if (references.length === 0) {
      html = `<span style="color: #000000;">${this._escapeHtml(formula)}</span>`;
    } else {
      const sortedRefs = [...references].sort((a, b) => a.start - b.start);
      let lastIndex = 0;

      for (const reference of sortedRefs) {
        if (reference.start > lastIndex) {
          const beforeText = this._escapeHtml(formula.substring(lastIndex, reference.start));
          html += `<span style="color: #000000;">${beforeText}</span>`;
        }

        const refText = this._escapeHtml(reference.ref);
        html += `<span style="color: ${reference.color};">${refText}</span>`;

        lastIndex = reference.end;
      }

      if (lastIndex < formula.length) {
        const afterText = this._escapeHtml(formula.substring(lastIndex));
        html += `<span style="color: #000000;">${afterText}</span>`;
      }
    }

    textOverlay.innerHTML = html;

    // Make formula bar text transparent
    formulaBar.style.color = 'transparent';
    formulaBar.style.caretColor = '#000000';
  }

  /**
   * Clears the formula bar overlay
   * @private
   */
  _clearFormulaBarOverlay() {
    const textOverlay = document.getElementById('formula-bar-text-overlay');
    if (textOverlay) {
      textOverlay.style.display = 'none';
      textOverlay.innerHTML = '';
    }

    const formulaBar = document.getElementById('formula-input');
    if (formulaBar) {
      formulaBar.style.color = '';
      formulaBar.style.caretColor = '';
    }
  }

  /**
   * Updates hover overlay based on formula bar cursor position
   * Only shows cell overlays when actively editing (this.isActive === true)
   * @private
   */
  _updateFormulaBarCursorHighlight() {
    const formulaBar = document.getElementById('formula-input');
    if (!formulaBar || !formulaBar.value.startsWith('=')) return;

    // Only show cell overlays when actively editing
    if (!this.isActive) return;

    const cursorPos = formulaBar.selectionStart;
    const formula = formulaBar.value;
    const references = this._parseReferences(formula);

    // Find which reference the cursor is over
    const newHoveredIndex = references.findIndex(ref =>
      cursorPos >= ref.start && cursorPos <= ref.end
    );

    if (newHoveredIndex !== this.hoveredReferenceIndex) {
      this.hoveredReferenceIndex = newHoveredIndex;
      this._updateOverlays();
    }
  }

  /**
   * Parses a reference string to grid coordinates
   * @private
   * @param {string} ref - Reference like "A1" or "A1:B2"
   * @returns {Array} Array of coord objects { startRow, startCol, endRow, endCol }
   */
  _parseReferenceToCoords(ref) {
    if (ref.includes(':')) {
      // Range reference
      const [start, end] = ref.split(':');
      const startParsed = CellHelpers.parseCellRef(start);
      const endParsed = CellHelpers.parseCellRef(end);

      if (!startParsed || !endParsed) return null;

      return [{
        startRow: startParsed.row,
        startCol: startParsed.col,
        endRow: endParsed.row,
        endCol: endParsed.col
      }];
    } else {
      // Single cell reference
      const parsed = CellHelpers.parseCellRef(ref);
      if (!parsed) return null;

      return [{
        startRow: parsed.row,
        startCol: parsed.col,
        endRow: parsed.row,
        endCol: parsed.col
      }];
    }
  }

  /**
   * Converts hex color to rgba with alpha
   * @private
   * @param {string} hex - Hex color like "#F26419"
   * @param {number} alpha - Alpha value 0-1
   * @returns {string} RGBA string
   */
  _hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Gets the color assigned to a specific reference
   * @param {string} ref - Reference string
   * @returns {string|null} Color or null if not found
   */
  getColorForReference(ref) {
    const reference = this.references.find(r => r.ref === ref);
    return reference ? reference.color : null;
  }
}
