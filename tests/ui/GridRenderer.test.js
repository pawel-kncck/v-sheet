import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GridRenderer } from '../../js/ui/GridRenderer.js';
import { JSDOM } from 'jsdom';

describe('GridRenderer', () => {
    let dom, container, renderer;

    beforeEach(() => {
        // Create a minimal DOM structure
        dom = new JSDOM(`
      <div id="spreadsheet-container">
        <div id="column-headers"></div>
        <div id="row-headers"></div>
        <div id="cell-grid"></div>
      </div>
    `);

        global.document = dom.window.document;
        container = document.getElementById('spreadsheet-container');

        renderer = new GridRenderer(container, {
            rows: 10,
            cols: 5,
        });
    });

    it('should create grid structure', () => {
        renderer.createGrid();

        const columnHeaders = container.querySelectorAll('#column-headers .header-cell');
        const rowHeaders = container.querySelectorAll('#row-headers .header-cell');
        const cells = container.querySelectorAll('#cell-grid .cell');

        expect(columnHeaders.length).toBe(5);
        expect(rowHeaders.length).toBe(10);
        expect(cells.length).toBe(50);
    });

    it('should get cell element by ID', () => {
        renderer.createGrid();

        const cell = renderer.getCellElement('A1');
        expect(cell).toBeTruthy();
        expect(cell.dataset.id).toBe('A1');
    });

    it('should update cell content', () => {
        renderer.createGrid();

        renderer.updateCellContent('A1', 'Hello');
        const cell = renderer.getCellElement('A1');
        expect(cell.textContent).toBe('Hello');
    });

    it('should apply grid styles', () => {
        renderer.createGrid();

        // Check initial styles
        expect(container.querySelector('#column-headers').style.gridTemplateColumns).toContain('94px');

        // Update widths
        const newWidths = [100, 100, 100, 100, 100];
        renderer.setColumnWidths(newWidths);

        expect(container.querySelector('#column-headers').style.gridTemplateColumns).toContain('100px');
    });

    it('should highlight cells', () => {
        renderer.createGrid();

        renderer.highlightCells(['A1', 'B2'], 'selected');

        const cellA1 = renderer.getCellElement('A1');
        const cellB2 = renderer.getCellElement('B2');

        expect(cellA1.classList.contains('selected')).toBe(true);
        expect(cellB2.classList.contains('selected')).toBe(true);
    });

    it('should clear all highlights', () => {
        renderer.createGrid();

        renderer.highlightCells(['A1'], 'selected');
        renderer.highlightColumnHeader(0);

        renderer.clearAllHighlights();

        const cellA1 = renderer.getCellElement('A1');
        const header = container.querySelector('#column-headers .header-cell[data-col="0"]');

        expect(cellA1.classList.contains('selected')).toBe(false);
        expect(header.classList.contains('header-highlight')).toBe(false);
    });

    it('should emit cell click events', () => {
        renderer.createGrid();
        const callback = vi.fn();
        renderer.on('cellClick', callback);

        const cell = renderer.getCellElement('A1');
        cell.click();

        expect(callback).toHaveBeenCalled();
        expect(callback.mock.calls[0][0].cellElement).toBe(cell);
    });
});
