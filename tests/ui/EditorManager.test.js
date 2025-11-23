import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EditorManager } from '../../js/ui/EditorManager.js';
import { GridRenderer } from '../../js/ui/GridRenderer.js';
import { JSDOM } from 'jsdom';

describe('EditorManager', () => {
    let dom, container, renderer, editorManager;

    beforeEach(() => {
        dom = new JSDOM(`
      <div id="spreadsheet-container">
        <input type="text" id="cell-editor" style="display: none;" />
        <div id="column-headers"></div>
        <div id="row-headers"></div>
        <div id="cell-grid"></div>
      </div>
    `);
        global.document = dom.window.document;
        container = document.getElementById('spreadsheet-container');
        renderer = new GridRenderer(container);
        editorManager = new EditorManager(renderer);
    });

    it('should be defined', () => {
        expect(editorManager).toBeDefined();
    });
});