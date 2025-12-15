import { Logger } from '../engine/utils/Logger.js';

/**
 * EditorManager - WYSIWYG Rich Text Editor Controller
 *
 * Responsibilities:
 * - Position and show/hide the contenteditable editor
 * - Manage rich text content with inline styling
 * - Track and apply active style for new text
 * - Sync plain text with formula bar
 * - Provide selection/cursor tracking for formatting
 *
 * Does NOT handle:
 * - Keyboard events (handled by InputController)
 * - Business logic (handled by modes)
 * - State transitions (handled by ModeManager)
 */
export class EditorManager {
  /**
   * @param {GridRenderer} gridRenderer
   * @param {FormulaHighlighter} formulaHighlighter - Optional highlighter for formula visual feedback
   */
  constructor(gridRenderer, formulaHighlighter = null) {
    this.renderer = gridRenderer;
    this.cellEditor = document.getElementById('cell-editor');
    this.formulaHighlighter = formulaHighlighter;

    if (!this.cellEditor) {
      Logger.error('EditorManager', 'Cell editor (#cell-editor) not found');
    }

    // State
    this.isEditing = false;
    this.editingCellId = null;
    this.isFormula = false;

    // Active style for new text (text-level formatting)
    this._activeStyle = null;

    // Cell-level style (inheritance source)
    this._cellStyle = null;

    // StyleManager reference (set when editing starts)
    this._styleManager = null;

    // Rich text runs (for tracking formatting during edit)
    this._richTextRuns = [];

    // Callback for value changes (for formula bar sync)
    this.onValueChange = null;

    // Setup event listeners
    this._setupEventListeners();

    Logger.log('EditorManager', 'Initialized (WYSIWYG Rich Text Mode)');
  }

  /**
   * Sets up event listeners for the contenteditable editor
   * @private
   */
  _setupEventListeners() {
    if (!this.cellEditor) return;

    // Input event for value synchronization
    this.cellEditor.addEventListener('input', () => {
      this._handleInput();
    });

    // Track cursor/selection changes
    this.cellEditor.addEventListener('keyup', () => this._handleSelectionChange());
    this.cellEditor.addEventListener('click', () => this._handleSelectionChange());
    this.cellEditor.addEventListener('mouseup', () => this._handleSelectionChange());

    // Prevent default formatting from browser shortcuts (we handle them in modes)
    this.cellEditor.addEventListener('keydown', (e) => {
      // Prevent browser's native bold/italic which would insert <b>/<i> tags
      if ((e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'i')) {
        e.preventDefault();
      }
    });

    // Handle paste - strip formatting from external sources
    this.cellEditor.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      this._insertTextAtCursor(text);
    });
  }

  /**
   * Handles input events - syncs with formula bar and updates rich text tracking
   * @private
   */
  _handleInput() {
    const plainText = this.getPlainText();

    // Sync with formula bar
    if (this.onValueChange) {
      this.onValueChange(plainText);
    }

    // Auto-resize editor
    this._resizeEditor();

    // Update formula highlighting if active
    if (this.formulaHighlighter && plainText.startsWith('=')) {
      this.isFormula = true;
      this.formulaHighlighter.update(plainText);
    } else {
      this.isFormula = false;
    }

    // Update rich text runs from DOM
    this._syncRichTextFromDOM();
  }

  /**
   * Handles selection/cursor changes - updates active style based on position
   * @private
   */
  _handleSelectionChange() {
    if (this.formulaHighlighter && this.isFormula) {
      const cursorPos = this.getCursorPosition();
      this.formulaHighlighter.updateCursorPosition(cursorPos);
    }
  }

  /**
   * Dynamically resizes the editor based on its content.
   * @private
   */
  _resizeEditor() {
    if (!this.cellEditor || !this.isEditing) return;

    const span = document.createElement('span');
    span.style.visibility = 'hidden';
    span.style.position = 'absolute';
    span.style.whiteSpace = 'nowrap';
    span.style.fontFamily = this.cellEditor.style.fontFamily || 'Arial';
    span.style.fontSize = this.cellEditor.style.fontSize || '13px';
    span.textContent = this.getPlainText() || ' ';

    document.body.appendChild(span);
    const textWidth = span.offsetWidth;
    document.body.removeChild(span);

    const padding = 22; // Account for padding and borders
    const minWidth = parseFloat(this.cellEditor.style.minWidth) || 100;
    const calculatedWidth = Math.max(minWidth, textWidth + padding);

    this.cellEditor.style.width = `${calculatedWidth}px`;
  }

  /**
   * Starts the editing process for a specific cell.
   * @param {string} cellId - The ID of the cell to edit
   * @param {string} initialValue - The value to populate
   * @param {string} [triggerKey] - If user pressed a key to start
   * @param {boolean} [selectAll] - Whether to select all text
   * @param {Object} [options] - Additional options
   * @param {Object} [options.cellStyle] - Cell-level style for inheritance
   * @param {Object} [options.styleManager] - StyleManager for resolving styles
   * @param {Array} [options.richText] - Existing rich text runs
   */
  startEdit(cellId, initialValue = '', triggerKey = null, selectAll = false, options = {}) {
    const cellElement = this.renderer.getCellElement(cellId);
    if (!cellElement) return;

    this.isEditing = true;
    this.editingCellId = cellId;
    this.isFormula = initialValue.startsWith('=');

    // Store references for styling
    this._cellStyle = options.cellStyle || null;
    this._styleManager = options.styleManager || null;
    this._richTextRuns = options.richText ? [...options.richText] : [];

    // Initialize active style from cell style
    this._activeStyle = this._cellStyle ? this._extractActiveStyle(this._cellStyle) : null;

    // Position the editor over the cell
    this._positionEditor(cellElement);

    // Set content
    if (triggerKey) {
      // User typed a character to start - use active style
      this._setContentWithActiveStyle(triggerKey);
    } else if (this._richTextRuns.length > 0 && this._styleManager && !this.isFormula) {
      // Has rich text - render with formatting
      this._renderRichTextContent(initialValue, this._richTextRuns);
    } else {
      // Plain text or formula
      this.cellEditor.textContent = initialValue;
    }

    // Sync with formula bar
    if (this.onValueChange) {
      this.onValueChange(this.getPlainText());
    }

    // Resize to fit content
    this._resizeEditor();

    // Activate formula highlighting if needed
    if (this.formulaHighlighter && this.isFormula) {
      this.formulaHighlighter.activate(initialValue);
      this.cellEditor.style.color = 'transparent';
      this.cellEditor.style.caretColor = '#000000';
    }

    // Visual indicator
    cellElement.classList.add('editing');

    // Handle cursor position
    if (selectAll) {
      setTimeout(() => this._selectAll(), 0);
    } else if (!triggerKey) {
      setTimeout(() => this._moveCursorToEnd(), 0);
    }

    Logger.log('EditorManager', `Started edit for ${cellId}`);
  }

  /**
   * Positions the editor over a cell element
   * @private
   */
  _positionEditor(cellElement) {
    const gridContainer = this.renderer.cellGridContainer;
    const cellRect = cellElement.getBoundingClientRect();
    const scrollLeft = gridContainer.scrollLeft;
    const scrollTop = gridContainer.scrollTop;

    this.cellEditor.style.left = `${cellElement.offsetLeft - scrollLeft}px`;
    this.cellEditor.style.top = `${cellElement.offsetTop - scrollTop}px`;
    this.cellEditor.style.minWidth = `${cellRect.width}px`;
    this.cellEditor.style.width = `${cellRect.width}px`;
    this.cellEditor.style.height = `${cellRect.height}px`;
    this.cellEditor.style.display = 'block';

    // Sync base styles from cell
    const computedStyle = window.getComputedStyle(cellElement);
    this.cellEditor.style.fontFamily = computedStyle.fontFamily;
    this.cellEditor.style.fontSize = computedStyle.fontSize;
    this.cellEditor.style.textAlign = computedStyle.textAlign;
    this.cellEditor.style.backgroundColor = '#ffffff';

    // Apply cell-level font styles as defaults
    if (this._cellStyle?.font) {
      if (this._cellStyle.font.bold) this.cellEditor.style.fontWeight = 'bold';
      if (this._cellStyle.font.italic) this.cellEditor.style.fontStyle = 'italic';
      if (this._cellStyle.font.color) this.cellEditor.style.color = this._cellStyle.font.color;
    } else {
      this.cellEditor.style.fontWeight = '';
      this.cellEditor.style.fontStyle = '';
      this.cellEditor.style.color = '';
    }
  }

  /**
   * Extracts active style properties from a cell style
   * @private
   */
  _extractActiveStyle(cellStyle) {
    if (!cellStyle?.font) return null;

    return {
      bold: cellStyle.font.bold || false,
      italic: cellStyle.font.italic || false,
      underline: cellStyle.font.underline || false,
      strikethrough: cellStyle.font.strikethrough || false,
      color: cellStyle.font.color || null,
      size: cellStyle.font.size || null,
      family: cellStyle.font.family || null
    };
  }

  /**
   * Sets content with the active style applied
   * @private
   */
  _setContentWithActiveStyle(text) {
    this.cellEditor.innerHTML = '';

    if (this._activeStyle && this._hasActiveStyleProperties()) {
      const span = document.createElement('span');
      span.textContent = text;
      this._applyStyleToElement(span, this._activeStyle);
      this.cellEditor.appendChild(span);
    } else {
      this.cellEditor.textContent = text;
    }

    this._moveCursorToEnd();
  }

  /**
   * Checks if active style has any non-default properties (truthy values only).
   * Use _hasActiveStyleOverrides() to check for explicit overrides including false values.
   * @private
   */
  _hasActiveStyleProperties() {
    if (!this._activeStyle) return false;
    return this._activeStyle.bold ||
           this._activeStyle.italic ||
           this._activeStyle.underline ||
           this._activeStyle.strikethrough ||
           this._activeStyle.color ||
           this._activeStyle.size ||
           this._activeStyle.family;
  }

  /**
   * Checks if active style has any explicit overrides (including false values).
   * This is used to determine if we need a span to override cell-level formatting.
   * @private
   */
  _hasActiveStyleOverrides() {
    if (!this._activeStyle) return false;
    // Check if any property has been explicitly set (even to false)
    return Object.keys(this._activeStyle).some(key =>
      this._activeStyle[key] !== undefined
    );
  }

  /**
   * Renders rich text content with formatting spans
   * @private
   */
  _renderRichTextContent(value, richText) {
    this.cellEditor.innerHTML = '';

    for (const run of richText) {
      const span = document.createElement('span');
      span.textContent = value.substring(run.start, run.end);

      if (run.styleId && this._styleManager) {
        const runStyle = this._styleManager.getStyle(run.styleId);
        const effectiveStyle = this._styleManager.resolveStyle(this._cellStyle, runStyle);
        this._applyStyleToElement(span, effectiveStyle.font);
      }

      this.cellEditor.appendChild(span);
    }
  }

  /**
   * Applies style properties to an element.
   * If applyExplicitOverrides is true, also applies explicit "normal" values for false properties.
   * @private
   * @param {HTMLElement} element - Element to style
   * @param {Object} style - Style properties
   * @param {boolean} applyExplicitOverrides - If true, apply "normal" for explicitly false values
   */
  _applyStyleToElement(element, style, applyExplicitOverrides = false) {
    if (!style) return;

    // Bold: apply both true and explicit false
    if (style.bold) {
      element.style.fontWeight = 'bold';
    } else if (applyExplicitOverrides && style.bold === false) {
      element.style.fontWeight = 'normal';
    }

    // Italic: apply both true and explicit false
    if (style.italic) {
      element.style.fontStyle = 'italic';
    } else if (applyExplicitOverrides && style.italic === false) {
      element.style.fontStyle = 'normal';
    }

    const decorations = [];
    if (style.underline) decorations.push('underline');
    if (style.strikethrough) decorations.push('line-through');
    if (decorations.length > 0) {
      element.style.textDecoration = decorations.join(' ');
    } else if (applyExplicitOverrides && (style.underline === false || style.strikethrough === false)) {
      element.style.textDecoration = 'none';
    }

    if (style.color) element.style.color = style.color;
    if (style.size) element.style.fontSize = `${style.size}px`;
    if (style.family) element.style.fontFamily = style.family;
  }

  /**
   * Inserts text at cursor position with active style
   * @private
   */
  _insertTextAtCursor(text) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();

    // Create styled text node or span
    let node;
    if (this._activeStyle && this._hasActiveStyleProperties()) {
      // Active style has positive formatting (bold, italic, etc.)
      node = document.createElement('span');
      node.textContent = text;
      this._applyStyleToElement(node, this._activeStyle);
    } else if (this._activeStyle && this._hasActiveStyleOverrides() && this._cellStyle) {
      // Active style has explicit overrides (e.g., bold=false) and cell has formatting
      // Create span with explicit "normal" values to prevent inheritance
      node = document.createElement('span');
      node.textContent = text;
      this._applyStyleToElement(node, this._activeStyle, true); // Pass true for explicit overrides
    } else {
      node = document.createTextNode(text);
    }

    range.insertNode(node);

    // Move cursor after inserted text
    range.setStartAfter(node);
    range.setEndAfter(node);
    selection.removeAllRanges();
    selection.addRange(range);

    // Trigger input event
    this._handleInput();
  }

  /**
   * Syncs rich text runs from the current DOM structure.
   * Recursively walks nested spans to properly extract all formatting.
   * @private
   */
  _syncRichTextFromDOM() {
    const runs = [];

    /**
     * Recursively extracts runs from a node and its children.
     * @param {Node} node - The node to process
     * @param {Object|null} inheritedStyle - Style inherited from parent spans
     * @param {Object} state - Mutable state object with current offset
     */
    const extractRuns = (node, inheritedStyle, state) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (text.length > 0) {
          runs.push({
            start: state.offset,
            end: state.offset + text.length,
            style: inheritedStyle // Use inherited style from parent spans
          });
          state.offset += text.length;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SPAN') {
        // Get this span's own style
        const ownStyle = this._extractStyleFromElement(node);

        // Merge inherited style with own style
        let effectiveStyle;
        if (inheritedStyle && ownStyle) {
          // Merge: own style overrides inherited
          effectiveStyle = {
            font: {
              ...(inheritedStyle.font || inheritedStyle || {}),
              ...(ownStyle.font || ownStyle || {})
            }
          };
        } else {
          effectiveStyle = ownStyle || inheritedStyle;
        }

        // Recursively process children with merged style
        for (const child of node.childNodes) {
          extractRuns(child, effectiveStyle, state);
        }
      }
    };

    // Start extraction from editor's direct children
    const state = { offset: 0 };
    for (const node of this.cellEditor.childNodes) {
      extractRuns(node, null, state);
    }

    // Normalize: merge adjacent runs with identical styles
    this._richTextRuns = this._normalizeRuns(runs);
  }

  /**
   * Merges adjacent runs with identical styles.
   * @private
   * @param {Array} runs - Array of rich text runs
   * @returns {Array} Normalized runs
   */
  _normalizeRuns(runs) {
    if (runs.length <= 1) return runs;

    const normalized = [];
    let current = { ...runs[0] };

    for (let i = 1; i < runs.length; i++) {
      const next = runs[i];

      // Check if styles are identical
      if (this._stylesEqual(current.style, next.style) &&
          current.styleId === next.styleId) {
        // Merge runs
        current.end = next.end;
      } else {
        // Push current and start new
        normalized.push(current);
        current = { ...next };
      }
    }

    // Push the last run
    normalized.push(current);

    return normalized;
  }

  /**
   * Compares two style objects for equality.
   * @private
   */
  _stylesEqual(style1, style2) {
    if (style1 === style2) return true;
    if (!style1 || !style2) return false;

    const font1 = style1.font || {};
    const font2 = style2.font || {};

    return font1.bold === font2.bold &&
           font1.italic === font2.italic &&
           font1.underline === font2.underline &&
           font1.strikethrough === font2.strikethrough &&
           font1.color === font2.color &&
           font1.size === font2.size &&
           font1.family === font2.family;
  }

  /**
   * Extracts style properties from a DOM element.
   * Includes explicit "normal" values as false (for overriding cell-level styles).
   * @private
   */
  _extractStyleFromElement(element) {
    const style = {};
    const computed = element.style;

    // Bold: check for both true and explicit false
    if (computed.fontWeight === 'bold') {
      style.bold = true;
    } else if (computed.fontWeight === 'normal') {
      style.bold = false;
    }

    // Italic: check for both true and explicit false
    if (computed.fontStyle === 'italic') {
      style.italic = true;
    } else if (computed.fontStyle === 'normal') {
      style.italic = false;
    }

    // Text decoration
    if (computed.textDecoration?.includes('underline')) style.underline = true;
    if (computed.textDecoration?.includes('line-through')) style.strikethrough = true;
    if (computed.textDecoration === 'none') {
      style.underline = false;
      style.strikethrough = false;
    }

    if (computed.color) style.color = computed.color;
    if (computed.fontSize) style.size = parseInt(computed.fontSize, 10);
    if (computed.fontFamily) style.family = computed.fontFamily;

    return Object.keys(style).length > 0 ? { font: style } : null;
  }

  /**
   * Hides the editor without committing.
   */
  hide() {
    if (this.editingCellId) {
      const cell = this.renderer.getCellElement(this.editingCellId);
      if (cell) cell.classList.remove('editing');
    }

    this.isEditing = false;
    this.editingCellId = null;
    this.isFormula = false;
    this._activeStyle = null;
    this._cellStyle = null;
    this._styleManager = null;
    this._richTextRuns = [];

    this.cellEditor.style.display = 'none';
    this.cellEditor.innerHTML = '';

    // Deactivate formula highlighting
    if (this.formulaHighlighter) {
      this.formulaHighlighter.deactivate();
    }

    // Reset styles
    this.cellEditor.style.fontFamily = '';
    this.cellEditor.style.fontSize = '';
    this.cellEditor.style.fontWeight = '';
    this.cellEditor.style.fontStyle = '';
    this.cellEditor.style.color = '';
    this.cellEditor.style.caretColor = '';
    this.cellEditor.style.textAlign = '';
    this.cellEditor.style.backgroundColor = '';
    this.cellEditor.style.width = '';
    this.cellEditor.style.minWidth = '';

    this.renderer.cellGridContainer.focus();

    Logger.log('EditorManager', 'Editor hidden');
  }

  /**
   * Focuses the editor.
   */
  focus() {
    if (this.cellEditor) {
      this.cellEditor.focus();
    }
  }

  /**
   * Gets the plain text value (without formatting).
   * @returns {string}
   */
  getPlainText() {
    return this.cellEditor ? this.cellEditor.textContent : '';
  }

  /**
   * Alias for getPlainText for backward compatibility.
   * @returns {string}
   */
  getValue() {
    return this.getPlainText();
  }

  /**
   * Sets the plain text value (clears formatting).
   * @param {string} value
   */
  setValue(value) {
    if (!this.cellEditor) return;

    this.cellEditor.textContent = value;

    if (this.onValueChange) {
      this.onValueChange(value);
    }

    this._resizeEditor();

    if (this.formulaHighlighter && value.startsWith('=')) {
      this.isFormula = true;
      this.formulaHighlighter.update(value);
      this.cellEditor.style.color = 'transparent';
      this.cellEditor.style.caretColor = '#000000';
    } else {
      this.isFormula = false;
      this.cellEditor.style.color = '';
      this.cellEditor.style.caretColor = '';
    }
  }

  /**
   * Checks if the editor is currently visible.
   * @returns {boolean}
   */
  isVisible() {
    return this.isEditing;
  }

  /**
   * Gets the current cursor position.
   * @returns {number}
   */
  getCursorPosition() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return 0;

    const range = selection.getRangeAt(0);
    const preRange = range.cloneRange();
    preRange.selectNodeContents(this.cellEditor);
    preRange.setEnd(range.startContainer, range.startOffset);

    return preRange.toString().length;
  }

  /**
   * Sets the cursor position.
   * @param {number} position
   */
  setCursorPosition(position) {
    const textNode = this._getTextNodeAtPosition(position);
    if (!textNode) return;

    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(textNode.node, textNode.offset);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  /**
   * Gets the text node and offset for a given position
   * @private
   */
  _getTextNodeAtPosition(targetPosition) {
    let currentPosition = 0;

    const walker = document.createTreeWalker(
      this.cellEditor,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while ((node = walker.nextNode())) {
      const nodeLength = node.textContent.length;
      if (currentPosition + nodeLength >= targetPosition) {
        return {
          node: node,
          offset: targetPosition - currentPosition
        };
      }
      currentPosition += nodeLength;
    }

    return null;
  }

  /**
   * Selects all text in the editor
   * @private
   */
  _selectAll() {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(this.cellEditor);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  /**
   * Moves cursor to end of content
   * @private
   */
  _moveCursorToEnd() {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(this.cellEditor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  // ==========================================================================
  // ACTIVE STYLE MANAGEMENT (for text-level formatting)
  // ==========================================================================

  /**
   * Gets the current active style.
   * @returns {Object|null}
   */
  getActiveStyle() {
    return this._activeStyle;
  }

  /**
   * Sets the active style for new text.
   * @param {Object} style - Style properties to set
   */
  setActiveStyle(style) {
    this._activeStyle = { ...this._activeStyle, ...style };
  }

  /**
   * Toggles a style property in the active style.
   * @param {string} property - Property name (e.g., 'bold', 'italic')
   * @returns {boolean} The new value of the property
   */
  toggleActiveStyleProperty(property) {
    if (!this._activeStyle) {
      this._activeStyle = {};
    }

    this._activeStyle[property] = !this._activeStyle[property];
    return this._activeStyle[property];
  }

  /**
   * Checks if there is a text selection (vs just cursor).
   * @returns {boolean}
   */
  hasSelection() {
    const selection = window.getSelection();
    return selection.rangeCount > 0 && !selection.getRangeAt(0).collapsed;
  }

  /**
   * Gets the current text selection range.
   * @returns {{start: number, end: number}|null}
   */
  getSelectionRange() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;

    const range = selection.getRangeAt(0);

    // Get start position
    const startRange = range.cloneRange();
    startRange.selectNodeContents(this.cellEditor);
    startRange.setEnd(range.startContainer, range.startOffset);
    const start = startRange.toString().length;

    // Get end position
    const endRange = range.cloneRange();
    endRange.selectNodeContents(this.cellEditor);
    endRange.setEnd(range.endContainer, range.endOffset);
    const end = endRange.toString().length;

    return { start, end };
  }

  /**
   * Applies formatting to the current selection.
   * @param {Object} styleChanges - Style changes to apply
   */
  applyFormatToSelection(styleChanges) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    if (range.collapsed) {
      // No selection - update active style instead
      this.setActiveStyle(styleChanges);
      return;
    }

    // Check if we should toggle off (selection already has this formatting)
    const shouldToggleOff = this._selectionHasFormatting(range, styleChanges);

    if (shouldToggleOff) {
      // Remove the formatting
      this._removeFormatFromSelection(range, styleChanges);
    } else {
      // Apply the formatting
      this._applyFormatToRange(range, styleChanges);
    }

    this._handleInput();
  }

  /**
   * Checks if the selection already has the given formatting
   * @private
   */
  _selectionHasFormatting(range, styleChanges) {
    // Clone the range to avoid modifying the actual selection
    const testRange = range.cloneRange();
    const fragment = testRange.cloneContents();

    // Check all elements in the selection
    const walker = document.createTreeWalker(
      fragment,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      null
    );

    let hasFormatting = false;
    let node;

    // If we have only text nodes (no spans), check the parent element
    const firstChild = fragment.firstChild;
    if (firstChild && firstChild.nodeType === Node.TEXT_NODE && !fragment.querySelector('span')) {
      // Plain text - check parent
      const container = range.commonAncestorContainer;
      const element = container.nodeType === Node.TEXT_NODE
        ? container.parentElement
        : container;

      if (element && element !== this.cellEditor) {
        for (const prop in styleChanges) {
          if (prop === 'bold') {
            const fontWeight = window.getComputedStyle(element).fontWeight;
            if (fontWeight === 'bold' || fontWeight === '700') {
              hasFormatting = true;
              break;
            }
          }
          if (prop === 'italic') {
            const fontStyle = window.getComputedStyle(element).fontStyle;
            if (fontStyle === 'italic') {
              hasFormatting = true;
              break;
            }
          }
        }
      }
      return hasFormatting;
    }

    // Check all span elements in the selection
    while (node = walker.nextNode()) {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SPAN') {
        for (const prop in styleChanges) {
          if (prop === 'bold' && node.style.fontWeight === 'bold') {
            hasFormatting = true;
            break;
          }
          if (prop === 'italic' && node.style.fontStyle === 'italic') {
            hasFormatting = true;
            break;
          }
          if (prop === 'underline' && node.style.textDecoration && node.style.textDecoration.includes('underline')) {
            hasFormatting = true;
            break;
          }
          if (prop === 'strikethrough' && node.style.textDecoration && node.style.textDecoration.includes('line-through')) {
            hasFormatting = true;
            break;
          }
        }
        if (hasFormatting) break;
      }
    }

    return hasFormatting;
  }

  /**
   * Removes formatting from selection
   * @private
   */
  _removeFormatFromSelection(range, styleChanges) {
    const selection = window.getSelection();

    // Extract the contents
    const fragment = range.extractContents();

    // Remove the specific styling from the fragment
    this._removeStyleFromFragment(fragment, styleChanges);

    // Re-insert the fragment
    range.insertNode(fragment);

    // Normalize to merge adjacent text nodes
    this.cellEditor.normalize();

    // Collapse cursor to the end of where we just inserted
    // Don't try to restore the selection - just place cursor after the modified text
    const newRange = document.createRange();
    newRange.setStartAfter(fragment.lastChild || fragment);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }

  /**
   * Removes specific styles from a document fragment
   * @private
   */
  _removeStyleFromFragment(fragment, styleChanges) {
    // Get all spans in the fragment
    const spans = Array.from(fragment.querySelectorAll('span'));

    spans.forEach(span => {
      // Remove the requested style properties
      for (const prop in styleChanges) {
        if (prop === 'bold') {
          span.style.fontWeight = '';
        }
        if (prop === 'italic') {
          span.style.fontStyle = '';
        }
        if (prop === 'underline') {
          // Remove underline but preserve strikethrough if present
          const decorations = span.style.textDecoration.split(' ').filter(d => d !== 'underline');
          span.style.textDecoration = decorations.join(' ');
        }
        if (prop === 'strikethrough') {
          // Remove strikethrough but preserve underline if present
          const decorations = span.style.textDecoration.split(' ').filter(d => d !== 'line-through');
          span.style.textDecoration = decorations.join(' ');
        }
        if (prop === 'color') {
          span.style.color = '';
        }
        if (prop === 'size') {
          span.style.fontSize = '';
        }
        if (prop === 'family') {
          span.style.fontFamily = '';
        }
      }

      // If span has no more inline styles, unwrap it
      if (!span.style.cssText || span.style.cssText.trim() === '') {
        // Replace span with its children
        const parent = span.parentNode;
        while (span.firstChild) {
          parent.insertBefore(span.firstChild, span);
        }
        parent.removeChild(span);
      }
    });
  }

  /**
   * Applies formatting to a range by splitting existing spans to avoid nesting.
   * @private
   */
  _applyFormatToRange(range, styleChanges) {
    try {
      // Check if selection is inside an existing span
      const parentSpan = this._getParentSpan(range.commonAncestorContainer);

      if (parentSpan && parentSpan !== this.cellEditor) {
        // Selection is inside an existing span - split it
        this._splitSpanAndApplyFormat(range, parentSpan, styleChanges);
      } else {
        // Selection is at top level or spans multiple elements
        this._wrapRangeWithStyle(range, styleChanges);
      }

      // Normalize to merge adjacent text nodes
      this.cellEditor.normalize();
    } catch (e) {
      Logger.warn('EditorManager', 'Failed to apply format to selection', e);
    }
  }

  /**
   * Gets the parent span element of a node, if any.
   * @private
   * @param {Node} node - The node to check
   * @returns {HTMLElement|null} The parent span or null
   */
  _getParentSpan(node) {
    while (node && node !== this.cellEditor) {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SPAN') {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  /**
   * Splits an existing span and applies formatting to the selected portion.
   * Creates up to 3 new spans: before, selected (with new style), after.
   * @private
   * @param {Range} range - The selection range
   * @param {HTMLElement} parentSpan - The span containing the selection
   * @param {Object} styleChanges - The style changes to apply
   */
  _splitSpanAndApplyFormat(range, parentSpan, styleChanges) {
    const selection = window.getSelection();
    const fullText = parentSpan.textContent;

    // Calculate offsets relative to the parent span
    const preRange = document.createRange();
    preRange.selectNodeContents(parentSpan);
    preRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = preRange.toString().length;
    const endOffset = startOffset + range.toString().length;

    // Get original style from parent span
    const originalStyle = this._extractStyleFromElement(parentSpan);

    // Create new spans as direct children of the editor
    const fragments = [];

    // Before selection (keep original style)
    if (startOffset > 0) {
      const beforeSpan = document.createElement('span');
      beforeSpan.textContent = fullText.substring(0, startOffset);
      if (originalStyle) {
        this._applyStyleToElement(beforeSpan, originalStyle.font || originalStyle);
      }
      fragments.push(beforeSpan);
    }

    // Selected portion (merge original style with new style)
    const selectedSpan = document.createElement('span');
    selectedSpan.textContent = fullText.substring(startOffset, endOffset);
    const mergedStyle = this._mergeStyles(originalStyle, styleChanges);
    this._applyStyleToElement(selectedSpan, mergedStyle);
    fragments.push(selectedSpan);

    // After selection (keep original style)
    if (endOffset < fullText.length) {
      const afterSpan = document.createElement('span');
      afterSpan.textContent = fullText.substring(endOffset);
      if (originalStyle) {
        this._applyStyleToElement(afterSpan, originalStyle.font || originalStyle);
      }
      fragments.push(afterSpan);
    }

    // Replace parent span with new fragments
    const parent = parentSpan.parentNode;
    fragments.forEach(frag => parent.insertBefore(frag, parentSpan));
    parent.removeChild(parentSpan);

    // Restore selection to the styled span
    const newRange = document.createRange();
    newRange.selectNodeContents(selectedSpan);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }

  /**
   * Merges original style with new style changes.
   * @private
   * @param {Object|null} originalStyle - The original style (may have {font: {...}} wrapper)
   * @param {Object} newStyleChanges - The new style properties to apply
   * @returns {Object} Merged style object
   */
  _mergeStyles(originalStyle, newStyleChanges) {
    if (!originalStyle) {
      return newStyleChanges;
    }

    // Extract font properties from original (handle both wrapped and unwrapped)
    const origFont = originalStyle.font || originalStyle;

    return {
      ...origFont,
      ...newStyleChanges
    };
  }

  /**
   * Wraps a range with a styled span, handling overlapping spans properly.
   * If the selection crosses span boundaries, flattens nested spans after wrapping.
   * @private
   * @param {Range} range - The selection range
   * @param {Object} styleChanges - The style changes to apply
   */
  _wrapRangeWithStyle(range, styleChanges) {
    const selection = window.getSelection();

    // Check if selection crosses span boundaries
    const hasSpansInSelection = this._selectionContainsSpans(range);

    const span = document.createElement('span');
    this._applyStyleToElement(span, styleChanges);

    span.appendChild(range.extractContents());
    range.insertNode(span);

    // If we extracted spans, we now have nested spans - flatten them
    if (hasSpansInSelection) {
      this._flattenNestedSpans();
    }

    // Collapse selection after operation
    selection.removeAllRanges();
  }

  /**
   * Checks if a range selection contains any span elements.
   * @private
   * @param {Range} range - The selection range
   * @returns {boolean} True if selection contains spans
   */
  _selectionContainsSpans(range) {
    const container = range.commonAncestorContainer;
    if (container.nodeType === Node.ELEMENT_NODE) {
      return container.querySelector('span') !== null;
    }
    // For text nodes, check siblings within the range
    const fragment = range.cloneContents();
    return fragment.querySelector('span') !== null;
  }

  /**
   * Flattens nested spans in the editor to ensure all spans are direct children.
   * Merges styles from parent spans into child spans.
   * @private
   */
  _flattenNestedSpans() {
    const flatChildren = [];

    // Process each direct child
    for (const node of Array.from(this.cellEditor.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        // Keep text nodes as-is
        if (node.textContent.length > 0) {
          flatChildren.push(node.cloneNode());
        }
      } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SPAN') {
        // Check if span has nested spans
        const nestedSpans = node.querySelectorAll('span');
        if (nestedSpans.length > 0) {
          // Has nested spans - flatten them
          const flattened = this._flattenSpan(node);
          flatChildren.push(...flattened);
        } else {
          // No nesting - keep as-is
          flatChildren.push(node.cloneNode(true));
        }
      }
    }

    // Replace editor content with flattened children
    this.cellEditor.innerHTML = '';
    flatChildren.forEach(child => this.cellEditor.appendChild(child));
  }

  /**
   * Flattens a span that may contain nested spans.
   * Returns an array of flat spans with merged styles.
   * @private
   * @param {HTMLElement} span - The span to flatten
   * @returns {Array<Node>} Array of flattened nodes
   */
  _flattenSpan(span) {
    const result = [];
    const parentStyle = this._extractStyleFromElement(span);

    // Walk through all child nodes of this span
    const processNode = (node, inheritedStyle) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (text.length > 0) {
          // Create span with inherited style
          const newSpan = document.createElement('span');
          newSpan.textContent = text;
          if (inheritedStyle) {
            this._applyStyleToElement(newSpan, inheritedStyle.font || inheritedStyle);
          }
          result.push(newSpan);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SPAN') {
        // Merge parent style with this span's style
        const nodeStyle = this._extractStyleFromElement(node);
        const mergedStyle = this._mergeStyles(inheritedStyle, nodeStyle?.font || nodeStyle);

        // Check if this span has nested spans
        const hasNestedSpans = node.querySelector('span');
        if (hasNestedSpans) {
          // Recurse into nested spans
          for (const child of node.childNodes) {
            processNode(child, mergedStyle ? { font: mergedStyle } : inheritedStyle);
          }
        } else {
          // Leaf span - create flat span with merged style
          const text = node.textContent;
          if (text.length > 0) {
            const newSpan = document.createElement('span');
            newSpan.textContent = text;
            if (mergedStyle) {
              this._applyStyleToElement(newSpan, mergedStyle);
            } else if (inheritedStyle) {
              this._applyStyleToElement(newSpan, inheritedStyle.font || inheritedStyle);
            }
            result.push(newSpan);
          }
        }
      }
    };

    // Process all children of the span
    for (const child of span.childNodes) {
      processNode(child, parentStyle);
    }

    return result;
  }

  /**
   * Gets the rich text runs for the current content.
   * @returns {Array}
   */
  getRichTextRuns() {
    this._syncRichTextFromDOM();
    return this._richTextRuns;
  }

  /**
   * Checks if the current content has any text-level formatting.
   * @returns {boolean}
   */
  hasRichTextFormatting() {
    // Sync runs before checking
    this._syncRichTextFromDOM();
    return this._richTextRuns.some(run => run.style != null || run.styleId != null);
  }
}
