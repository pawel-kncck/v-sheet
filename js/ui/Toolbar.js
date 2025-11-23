import { Logger } from '../engine/utils/Logger.js';
// FormatRangeCommand import removed (no longer needed here)

export class Toolbar {
  constructor(container, spreadsheet) {
    this.container = container;
    this.spreadsheet = spreadsheet;

    this.items = [
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
      // --- FORMATTING BUTTONS ---
      {
        type: 'button',
        id: 'bold',
        icon: '<path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/>',
        tooltip: 'Bold (Ctrl+B)',
        // DELEGATE TO SPREADSHEET
        action: () => this.spreadsheet.applyRangeFormat({ font: { bold: true } }, 'toggle')
      },
      {
        type: 'button',
        id: 'italic',
        icon: '<path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/>',
        tooltip: 'Italic (Ctrl+I)',
        // DELEGATE TO SPREADSHEET
        action: () => this.spreadsheet.applyRangeFormat({ font: { italic: true } }, 'toggle') 
      },
      { type: 'separator' },
      {
        type: 'button',
        id: 'align-left',
        icon: '<path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z"/>',
        tooltip: 'Align Left',
        action: () => this.spreadsheet.applyRangeFormat({ align: { h: 'left' } })
      },
      {
        type: 'button',
        id: 'align-center',
        icon: '<path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8H18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z"/>',
        tooltip: 'Align Center',
        action: () => this.spreadsheet.applyRangeFormat({ align: { h: 'center' } })
      },
      {
        type: 'button',
        id: 'align-right',
        icon: '<path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z"/>',
        tooltip: 'Align Right',
        action: () => this.spreadsheet.applyRangeFormat({ align: { h: 'right' } })
      }
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
      btn.title = item.tooltip || '';
      
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.innerHTML = item.icon;
      
      btn.appendChild(svg);

      btn.addEventListener('click', (e) => {
        if (item.action) item.action(e);
      });

      this.container.appendChild(btn);
    });
  }
}