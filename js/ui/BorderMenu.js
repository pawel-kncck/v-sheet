import { Logger } from '../engine/utils/Logger.js';

/**
 * BorderMenu
 * Context menu for border formatting options.
 * Manages position selection, color/style/thickness controls, and communicates
 * with the Spreadsheet coordinator to apply border changes.
 */
export class BorderMenu {
  constructor(spreadsheet) {
    this.spreadsheet = spreadsheet;
    this.container = null;
    this.isVisible = false;

    // State
    this.selectedPositions = new Set();
    this.currentColor = '#000000';
    this.currentStyle = 'solid';
    this.currentWidth = 1;

    // Dropdown state
    this.styleDropdownVisible = false;

    // Bound methods for event cleanup
    this._boundDocumentClick = this._handleDocumentClick.bind(this);

    this._createMenu();
  }

  /**
   * Create the menu DOM structure
   */
  _createMenu() {
    this.container = document.createElement('div');
    this.container.className = 'border-menu';
    this.container.style.display = 'none';

    this.container.innerHTML = `
      <div class="border-positions">
        <button class="border-btn" data-position="all" title="All Borders">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M3 3v18h18V3H3zm16 16H5V5h14v14zM7 7h4v4H7V7zm6 0h4v4h-4V7zm-6 6h4v4H7v-4zm6 0h4v4h-4v-4z"/>
          </svg>
        </button>
        <button class="border-btn" data-position="outer" title="Outer Borders">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M3 3v18h18V3H3zm16 16H5V5h14v14z"/>
          </svg>
        </button>
        <button class="border-btn" data-position="inner" title="Inner Borders">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M3 3v18h18V3H3zm8 16H5v-6h6v6zm0-8H5V5h6v6zm8 8h-6v-6h6v6zm0-8h-6V5h6v6zm-7 1h2v6h-2v-6zm0-8h2v6h-2V5zM5 11h6v2H5v-2zm8 0h6v2h-6v-2z"/>
          </svg>
        </button>
        <button class="border-btn" data-position="inner-h" title="Inner Horizontal">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M3 11h18v2H3v-2z"/>
          </svg>
        </button>
        <button class="border-btn" data-position="inner-v" title="Inner Vertical">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M11 3h2v18h-2V3z"/>
          </svg>
        </button>
      </div>

      <div class="border-positions border-positions-edges">
        <button class="border-btn" data-position="top" title="Top Border">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M3 3h18v2H3V3z"/>
          </svg>
        </button>
        <button class="border-btn" data-position="bottom" title="Bottom Border">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M3 19h18v2H3v-2z"/>
          </svg>
        </button>
        <button class="border-btn" data-position="left" title="Left Border">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M3 3h2v18H3V3z"/>
          </svg>
        </button>
        <button class="border-btn" data-position="right" title="Right Border">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M19 3h2v18h-2V3z"/>
          </svg>
        </button>
      </div>

      <div class="border-controls">
        <button class="border-btn border-color-btn" id="border-color-picker" title="Border Color">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
          </svg>
          <div class="border-color-indicator" style="background-color: #000000;"></div>
          <input type="color" class="hidden-color-input" value="#000000">
        </button>

        <button class="border-btn border-style-btn" id="border-style-selector" title="Border Style">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M3 16h5v-2H3v2zm6.5 0h5v-2h-5v2zm6.5 0h5v-2h-5v2zM3 20h2v-2H3v2zm4 0h2v-2H7v2zm4 0h2v-2h-2v2zm4 0h2v-2h-2v2zm4 0h2v-2h-2v2zM3 12h8v-2H3v2zm10 0h8v-2h-8v2zM3 4v4h18V4H3z"/>
          </svg>
        </button>
      </div>

      <div class="border-style-dropdown" style="display: none;">
        <button class="border-style-option" data-style="solid" data-width="1">
          <span class="style-preview solid-thin"></span>
          <span>Thin</span>
        </button>
        <button class="border-style-option" data-style="solid" data-width="2">
          <span class="style-preview solid-medium"></span>
          <span>Medium</span>
        </button>
        <button class="border-style-option" data-style="solid" data-width="3">
          <span class="style-preview solid-thick"></span>
          <span>Thick</span>
        </button>
        <button class="border-style-option" data-style="dashed" data-width="1">
          <span class="style-preview dashed"></span>
          <span>Dashed</span>
        </button>
        <button class="border-style-option" data-style="dotted" data-width="1">
          <span class="style-preview dotted"></span>
          <span>Dotted</span>
        </button>
      </div>

      <div class="border-actions">
        <button class="border-btn border-remove" title="Remove Borders">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
          <span>Clear Borders</span>
        </button>
      </div>
    `;

    // Append to body
    document.body.appendChild(this.container);

    this._attachEventListeners();
  }

  /**
   * Attach event listeners to menu elements
   */
  _attachEventListeners() {
    // Position buttons
    this.container.querySelectorAll('[data-position]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const position = btn.dataset.position;
        this._handlePositionClick(position, btn);
      });
    });

    // Color picker
    const colorBtn = this.container.querySelector('#border-color-picker');
    const colorInput = colorBtn.querySelector('input[type="color"]');
    colorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      colorInput.click();
    });
    colorInput.addEventListener('input', (e) => {
      this._handleColorChange(e.target.value);
    });
    colorInput.addEventListener('change', (e) => {
      this._handleColorChange(e.target.value);
    });

    // Style selector
    const styleBtn = this.container.querySelector('#border-style-selector');
    const styleDropdown = this.container.querySelector('.border-style-dropdown');
    styleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.styleDropdownVisible = !this.styleDropdownVisible;
      styleDropdown.style.display = this.styleDropdownVisible ? 'block' : 'none';
    });

    // Style options
    this.container.querySelectorAll('.border-style-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const style = btn.dataset.style;
        const width = parseInt(btn.dataset.width, 10);
        this._handleStyleChange(style, width);
        styleDropdown.style.display = 'none';
        this.styleDropdownVisible = false;
      });
    });

    // Remove borders button
    const removeBtn = this.container.querySelector('.border-remove');
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleRemoveBorders();
    });

    // Prevent menu clicks from closing menu
    this.container.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  /**
   * Toggle menu visibility
   * @param {HTMLElement} anchorElement - Element to position menu near
   */
  toggle(anchorElement) {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show(anchorElement);
    }
  }

  /**
   * Show the menu positioned near the anchor element
   * @param {HTMLElement} anchorElement
   */
  show(anchorElement) {
    if (!anchorElement) return;

    const rect = anchorElement.getBoundingClientRect();
    this.container.style.left = `${rect.left}px`;
    this.container.style.top = `${rect.bottom + 4}px`;
    this.container.style.display = 'flex';
    this.isVisible = true;

    // Reset state
    this.selectedPositions.clear();
    this._updateButtonStates();

    // Close style dropdown
    this.styleDropdownVisible = false;
    this.container.querySelector('.border-style-dropdown').style.display = 'none';

    // Add document click handler to close
    setTimeout(() => {
      document.addEventListener('click', this._boundDocumentClick);
    }, 0);

    Logger.log('BorderMenu', 'Menu shown');
  }

  /**
   * Hide the menu
   */
  hide() {
    this.container.style.display = 'none';
    this.isVisible = false;
    this.styleDropdownVisible = false;

    document.removeEventListener('click', this._boundDocumentClick);

    Logger.log('BorderMenu', 'Menu hidden');
  }

  /**
   * Handle document click to close menu
   */
  _handleDocumentClick(e) {
    if (!this.container.contains(e.target)) {
      this.hide();
    }
  }

  /**
   * Handle position button click
   * @param {string} position
   * @param {HTMLElement} btn
   */
  _handlePositionClick(position, btn) {
    // Toggle position in selectedPositions Set
    if (this.selectedPositions.has(position)) {
      this.selectedPositions.delete(position);
    } else {
      this.selectedPositions.add(position);
    }

    // Update button visual state
    this._updateButtonStates();

    // Apply borders immediately
    this._applyBorders();
  }

  /**
   * Handle color change
   * @param {string} color
   */
  _handleColorChange(color) {
    this.currentColor = color;

    // Update indicator
    const indicator = this.container.querySelector('.border-color-indicator');
    if (indicator) {
      indicator.style.backgroundColor = color;
    }

    // Update hidden input
    const colorInput = this.container.querySelector('#border-color-picker input[type="color"]');
    if (colorInput) {
      colorInput.value = color;
    }

    // Apply immediately if positions selected
    if (this.selectedPositions.size > 0) {
      this._applyBorders();
    }
  }

  /**
   * Handle style/thickness change
   * @param {string} style
   * @param {number} width
   */
  _handleStyleChange(style, width) {
    this.currentStyle = style;
    this.currentWidth = width;

    // Apply immediately if positions selected
    if (this.selectedPositions.size > 0) {
      this._applyBorders();
    }
  }

  /**
   * Apply current border settings to selection
   */
  _applyBorders() {
    if (this.selectedPositions.size === 0) return;

    const positions = Array.from(this.selectedPositions);
    const borderStyle = {
      style: this.currentStyle,
      color: this.currentColor,
      width: this.currentWidth
    };

    this.spreadsheet.applyBorderFormat(positions, borderStyle);

    Logger.log('BorderMenu', `Applied borders: ${positions.join(', ')}`);
  }

  /**
   * Remove all borders from selection
   */
  _handleRemoveBorders() {
    // Apply null borders to clear
    this.spreadsheet.applyBorderFormat(['none'], null);
    this.selectedPositions.clear();
    this._updateButtonStates();
    this.hide();

    Logger.log('BorderMenu', 'Borders removed');
  }

  /**
   * Update button active states based on selectedPositions
   */
  _updateButtonStates() {
    this.container.querySelectorAll('[data-position]').forEach(btn => {
      const position = btn.dataset.position;
      if (this.selectedPositions.has(position)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  /**
   * Destroy the menu
   */
  destroy() {
    document.removeEventListener('click', this._boundDocumentClick);
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
