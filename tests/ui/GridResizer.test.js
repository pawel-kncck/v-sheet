import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GridResizer } from '../../js/ui/GridResizer.js';
import { GridRenderer } from '../../js/ui/GridRenderer.js';
import { JSDOM } from 'jsdom';

describe('GridResizer', () => {
    let dom, container, renderer, resizer;

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
        resizer = new GridResizer(renderer);
    });

    it('should be defined', () => {
        expect(resizer).toBeDefined();
    });
});
