import { Logger } from '../engine/utils/Logger.js';

export class Toolbar {
  /**
   * @param {HTMLElement} container - The #toolbar-container
   * @param {Spreadsheet} spreadsheet - Reference to main app controller
   */
  constructor(container, spreadsheet) {
    this.container = container;
    this.spreadsheet = spreadsheet;

    // Definition of the Toolbar Layout
    // We can easily add 'bold', 'color', etc. here later
    this.items = [
      {
        type: 'button',
        id: 'undo',
        icon: '<path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>', // Material Undo
        tooltip: 'Undo (Ctrl+Z)',
        action: () => this.spreadsheet.historyManager.undo()
      },
      {
        type: 'button',
        id: 'redo',
        icon: '<path d="M18.4 10.6C16.55 9 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/>', // Material Redo
        tooltip: 'Redo (Ctrl+Y)',
        action: () => this.spreadsheet.historyManager.redo()
      },
      { type: 'separator' },
      {
        type: 'button',
        id: 'print',
        icon: '<path d="M19 8h-1V3H6v5H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zM8 5h8v3H8V5zm8 12v2H8v-4h8v2zm2-2v-2H6v2H4v-4c0-.55.45-1 1-1h14c.55 0 1 .45 1 1v4h-2z"/>',
        tooltip: 'Print',
        action: () => window.print()
      }
      // Future: { type: 'menu', id: 'fillColor', icon: '...', menu: [...] }
    ];

    this.render();
    Logger.log('Toolbar', 'Initialized');
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

      const btn = document.createElement('button');
      btn.className = 'toolbar-btn';
      btn.dataset.id = item.id;
      if (item.tooltip) btn.dataset.tooltip = item.tooltip;
      
      // Create SVG Element
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.innerHTML = item.icon;
      
      btn.appendChild(svg);

      // Attach Click Handler
      btn.addEventListener('click', (e) => {
        if (item.action) {
            // Execute immediate action
            item.action(e);
            // Visual feedback (optional ripple)
        } else if (item.menu) {
            // Logic to open dropdown/popover (For future Color Picker)
            console.log('Open menu for', item.id);
        }
      });

      this.container.appendChild(btn);
    });
  }
  
  /**
   * Updates button states (e.g., disable undo if stack empty, highlight Bold if active)
   */
  updateState() {
      // 1. Check Undo/Redo availability
      // This requires HistoryManager to expose sizes or we try/catch
      // For now, we leave them enabled.
      
      // 2. Check Active Cell Formatting (Future Epic 3 work)
      // const activeStyle = this.spreadsheet.getActiveCellStyle();
      // toggleClass('bold', activeStyle.bold);
  }
}