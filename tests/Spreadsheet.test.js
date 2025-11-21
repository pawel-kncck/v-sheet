import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Spreadsheet } from '../js/spreadsheet.js';
import { JSDOM } from 'jsdom';

describe('Spreadsheet Integration', () => {
    let dom, container;

    beforeEach(() => {
        dom = new JSDOM(`
      <div id="spreadsheet-container">
        <div id="column-headers"></div>
        <div id="row-headers"></div>
        <div id="cell-grid"></div>
      </div>
    `);
        global.document = dom.window.document;
        global.window = dom.window;
        global.HTMLElement = dom.window.HTMLElement;
        container = document.getElementById('spreadsheet-container');
    });

    it('should instantiate Spreadsheet without errors', () => {
        const spreadsheet = new Spreadsheet('spreadsheet-container');
        expect(spreadsheet).toBeDefined();
    });
});
