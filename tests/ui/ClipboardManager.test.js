import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClipboardManager } from '../../js/ui/ClipboardManager.js';
import { GridRenderer } from '../../js/ui/GridRenderer.js';
import { JSDOM } from 'jsdom';

describe('ClipboardManager', () => {
    let dom, container, renderer, clipboardManager;

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
        clipboardManager = new ClipboardManager(renderer);
    });

    it('should be defined', () => {
        expect(clipboardManager).toBeDefined();
    });
});
