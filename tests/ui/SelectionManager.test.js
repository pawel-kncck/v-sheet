import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SelectionManager } from '../../js/ui/SelectionManager.js';
import { GridRenderer } from '../../js/ui/GridRenderer.js';
import { JSDOM } from 'jsdom';

describe('SelectionManager', () => {
    let dom, container, renderer, selectionManager;

    beforeEach(() => {
        dom = new JSDOM(`
      <div id="spreadsheet-container">
        <div id="column-headers"></div>
        <div id="row-headers"></div>
        <div id="cell-grid"></div>
      </div>
    `);
        global.document = dom.window.document;
        container = document.getElementById('spreadsheet-container');
        renderer = new GridRenderer(container);
        selectionManager = new SelectionManager(renderer);
    });

    it('should be defined', () => {
        expect(selectionManager).toBeDefined();
    });
});
