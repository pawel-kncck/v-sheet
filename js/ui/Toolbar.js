import { Logger } from '../engine/utils/Logger.js';

export class Toolbar {
  constructor(container, spreadsheet) {
    this.container = container;
    this.spreadsheet = spreadsheet;

    // Track button elements for state updates
    this._buttons = {};

    this.items = [
      // ... Undo/Redo buttons ...
      {
        type: 'button',
        id: 'undo',
        icon: '<path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>',
        tooltip: 'Undo (Ctrl+Z)',
        action: () => this.spreadsheet.historyManager.undo()
      },
      {
        type: 'button',
        id: 'redo',
        icon: '<path d="M18.4 10.6C16.55 9 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/>',
        tooltip: 'Redo (Ctrl+Y)',
        action: () => this.spreadsheet.historyManager.redo()
      },
      { type: 'separator' },
      
      // --- FONT FAMILY ---
      {
        type: 'select',
        id: 'font-family',
        tooltip: 'Font Family',
        options: [
          { value: 'Arial', text: 'Arial' },
          { value: 'Verdana', text: 'Verdana' },
          { value: 'Times New Roman', text: 'Times' },
          { value: 'Courier New', text: 'Courier' },
          { value: 'Georgia', text: 'Georgia' }
        ],
        action: (val) => this.spreadsheet.applyRangeFormat({ font: { family: val } })
      },

      // --- FONT SIZE ---
      {
        type: 'select',
        id: 'font-size',
        tooltip: 'Font Size',
        options: [
          { value: '10', text: '10' },
          { value: '11', text: '11' },
          { value: '12', text: '12' },
          { value: '14', text: '14' },
          { value: '18', text: '18' },
          { value: '24', text: '24' }
        ],
        action: (val) => this.spreadsheet.applyRangeFormat({ font: { size: val } })
      },
      
      { type: 'separator' },

      // ... Bold/Italic buttons ...
      {
        type: 'button',
        id: 'bold',
        icon: '<path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/>',
        tooltip: 'Bold (Ctrl+B)',
        action: () => this.spreadsheet.applyRangeFormat({ font: { bold: true } }, 'toggle')
      },
      {
        type: 'button',
        id: 'italic',
        icon: '<path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/>',
        tooltip: 'Italic (Ctrl+I)',
        action: () => this.spreadsheet.applyRangeFormat({ font: { italic: true } }, 'toggle')
      },

      // --- TEXT COLOR ---
      {
        type: 'color',
        id: 'text-color',
        icon: '<path d="M0 20h24v4H0z"/><path style="fill:currentColor" d="M11 3L5.5 17h2.25l1.12-3h6.25l1.12 3h2.25L13 3h-2zm-1.38 9L12 5.67 14.38 12H9.62z"/>',
        tooltip: 'Text Color',
        value: '#000000',
        action: (val) => this.spreadsheet.applyRangeFormat({ font: { color: val } })
      },

      // --- FILL COLOR ---
      {
        type: 'color',
        id: 'fill-color',
        icon: '<path d="M16.56 8.94L7.62 0 6.21 1.41l2.38 2.38-5.15 5.15c-.59.59-.59 1.54 0 2.12l5.5 5.5c.29.29.68.44 1.06.44s.77-.15 1.06-.44l5.5-5.5c.59-.58.59-1.53 0-2.12zM5.21 10L10 5.21 14.79 10H5.21zM19 11.5s-2 2.17-2 3.5c0 1.1.9 2 2 2s2-.9 2-2c0-1.33-2-3.5-2-3.5zM0 20h24v4H0z"/>',
        tooltip: 'Fill Color',
        value: '#ffffff',
        action: (val) => this.spreadsheet.applyRangeFormat({ fill: { color: val } })
      },

      // --- BORDERS ---
      {
        type: 'border',
        id: 'borders',
        icon: '<path d="M3 3v18h18V3H3zm16 16H5V5h14v14zM7 7h4v4H7V7zm6 0h4v4h-4V7zm-6 6h4v4H7v-4zm6 0h4v4h-4v-4z"/>',
        tooltip: 'Borders'
      },

      { type: 'separator' },
      // ... Align buttons ...
      {
        type: 'button',
        id: 'align-left',
        icon: '<path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z"/>',
        tooltip: 'Align Left',
        action: () => this.spreadsheet.applyRangeFormat({ align: { h: 'left' } })
      },
      // ... (Center/Right align buttons) ...
    ];

    this.render();
  }

  render() {
    this.container.innerHTML = '';

    this.items.forEach(item => {
      if (item.type === 'separator') {
        const sep = document.createElement('div');
        sep.className = 'toolbar-separator';
        this.container.appendChild(sep);
        return;
      }

      // 1. Render Select Dropdowns
      if (item.type === 'select') {
        const wrapper = document.createElement('div');
        wrapper.className = 'toolbar-select-wrapper';
        
        const select = document.createElement('select');
        select.className = 'toolbar-select';
        select.title = item.tooltip || '';
        
        item.options.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.text;
          select.appendChild(option);
        });

        select.addEventListener('change', (e) => {
          if (item.action) item.action(e.target.value);
          // Reset focus to grid so keyboard nav works immediately
          this.spreadsheet.renderer.cellGridContainer.focus();
        });

        wrapper.appendChild(select);
        this.container.appendChild(wrapper);
        return;
      }

      // 2. Render Color Pickers
      if (item.type === 'color') {
        const wrapper = document.createElement('div');
        wrapper.className = 'toolbar-btn color-picker-btn';
        wrapper.title = item.tooltip || '';

        // Icon
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.innerHTML = item.icon;
        wrapper.appendChild(svg);

        // Hidden Input
        const input = document.createElement('input');
        input.type = 'color';
        input.value = item.value || '#000000';
        input.className = 'hidden-color-input';

        // Trigger input when wrapper clicked
        wrapper.addEventListener('click', () => input.click());

        // Handle color change
        input.addEventListener('input', (e) => {
          if (item.action) item.action(e.target.value);
        });
        // Refocus grid on close (change event fires on close/commit)
        input.addEventListener('change', () => {
             this.spreadsheet.renderer.cellGridContainer.focus();
        });

        wrapper.appendChild(input);
        this.container.appendChild(wrapper);
        return;
      }

      // 2.5. Render Border Button (opens menu)
      if (item.type === 'border') {
        const btn = document.createElement('button');
        btn.className = 'toolbar-btn';
        btn.dataset.id = item.id;
        btn.title = item.tooltip || '';

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.innerHTML = item.icon;

        btn.appendChild(svg);

        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.spreadsheet.borderMenu) {
            this.spreadsheet.borderMenu.toggle(btn);
          }
          // Don't refocus grid - menu needs focus
        });

        this.container.appendChild(btn);
        return;
      }

      // 3. Render Standard Buttons
      const btn = document.createElement('button');
      btn.className = 'toolbar-btn';
      btn.dataset.id = item.id;
      btn.title = item.tooltip || '';
      
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.innerHTML = item.icon;
      
      btn.appendChild(svg);

      btn.addEventListener('click', (e) => {
        if (item.action) item.action(e);
        // Refocus grid so keyboard shortcuts work immediately
        this.spreadsheet.renderer.cellGridContainer.focus();
      });

      // Track buttons for state updates
      this._buttons[item.id] = btn;

      this.container.appendChild(btn);
    });
  }

  /**
   * Updates toolbar button states based on current style.
   * Called when selection changes or when editor style changes.
   *
   * @param {Object} style - Current effective style with font properties
   * @param {boolean} disabled - Whether formatting should be disabled (e.g., in Point mode)
   */
  updateState(style, disabled = false) {
    const boldBtn = this._buttons['bold'];
    const italicBtn = this._buttons['italic'];

    if (boldBtn) {
      if (disabled) {
        boldBtn.classList.add('disabled');
        boldBtn.classList.remove('active');
      } else {
        boldBtn.classList.remove('disabled');
        if (style?.font?.bold) {
          boldBtn.classList.add('active');
        } else {
          boldBtn.classList.remove('active');
        }
      }
    }

    if (italicBtn) {
      if (disabled) {
        italicBtn.classList.add('disabled');
        italicBtn.classList.remove('active');
      } else {
        italicBtn.classList.remove('disabled');
        if (style?.font?.italic) {
          italicBtn.classList.add('active');
        } else {
          italicBtn.classList.remove('active');
        }
      }
    }

    Logger.log('Toolbar', 'State updated', { bold: style?.font?.bold, italic: style?.font?.italic, disabled });
  }
}