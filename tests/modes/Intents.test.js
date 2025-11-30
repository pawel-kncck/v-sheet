import { describe, it, expect } from 'vitest';
import {
  INTENTS,
  DIRECTIONS,
  FORMULA_TRIGGERS,
  COMMIT_MOVES,
  createNavigateContext,
  createJumpContext,
  createInputContext,
  createCommitContext,
  createCellSelectContext,
  createHeaderSelectContext,
  createDeleteContext,
  createEditStartContext,
} from '../../js/modes/Intents.js';

describe('Intents', () => {
  describe('INTENTS enum', () => {
    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(INTENTS)).toBe(true);
    });

    it('should contain all expected navigation intents', () => {
      expect(INTENTS.NAVIGATE).toBe('NAVIGATE');
      expect(INTENTS.JUMP_TO_EDGE).toBe('JUMP_TO_EDGE');
    });

    it('should contain all expected editing intents', () => {
      expect(INTENTS.EDIT_START).toBe('EDIT_START');
      expect(INTENTS.COMMIT).toBe('COMMIT');
      expect(INTENTS.CANCEL).toBe('CANCEL');
      expect(INTENTS.INPUT).toBe('INPUT');
      expect(INTENTS.DELETE).toBe('DELETE');
    });

    it('should contain all expected history intents', () => {
      expect(INTENTS.UNDO).toBe('UNDO');
      expect(INTENTS.REDO).toBe('REDO');
    });

    it('should contain all expected clipboard intents', () => {
      expect(INTENTS.COPY).toBe('COPY');
      expect(INTENTS.PASTE).toBe('PASTE');
      expect(INTENTS.CUT).toBe('CUT');
    });

    it('should contain all expected selection intents', () => {
      expect(INTENTS.SELECT_ALL).toBe('SELECT_ALL');
      expect(INTENTS.CELL_SELECT).toBe('CELL_SELECT');
      expect(INTENTS.HEADER_SELECT).toBe('HEADER_SELECT');
    });

    it('should contain formatting intents', () => {
      expect(INTENTS.FORMAT_BOLD).toBe('FORMAT_BOLD');
      expect(INTENTS.FORMAT_ITALIC).toBe('FORMAT_ITALIC');
    });
  });

  describe('DIRECTIONS enum', () => {
    it('should be frozen', () => {
      expect(Object.isFrozen(DIRECTIONS)).toBe(true);
    });

    it('should contain all four directions', () => {
      expect(DIRECTIONS.UP).toBe('up');
      expect(DIRECTIONS.DOWN).toBe('down');
      expect(DIRECTIONS.LEFT).toBe('left');
      expect(DIRECTIONS.RIGHT).toBe('right');
    });
  });

  describe('createNavigateContext', () => {
    it('should create context with default shift=false', () => {
      const ctx = createNavigateContext(DIRECTIONS.RIGHT);
      expect(ctx).toEqual({ direction: 'right', shift: false });
    });

    it('should create context with shift=true', () => {
      const ctx = createNavigateContext(DIRECTIONS.UP, true);
      expect(ctx).toEqual({ direction: 'up', shift: true });
    });

    it('should return frozen object', () => {
      const ctx = createNavigateContext(DIRECTIONS.DOWN);
      expect(Object.isFrozen(ctx)).toBe(true);
    });

    it('should throw on invalid direction', () => {
      expect(() => createNavigateContext('diagonal')).toThrow('Invalid direction');
    });
  });

  describe('createJumpContext', () => {
    it('should create context with default shift=false', () => {
      const ctx = createJumpContext(DIRECTIONS.RIGHT);
      expect(ctx).toEqual({ direction: 'right', shift: false });
    });

    it('should create context with shift=true for Ctrl+Shift+Arrow', () => {
      const ctx = createJumpContext(DIRECTIONS.RIGHT, true);
      expect(ctx).toEqual({ direction: 'right', shift: true });
    });

    it('should throw on invalid direction', () => {
      expect(() => createJumpContext('nowhere')).toThrow('Invalid direction');
    });
  });

  describe('createInputContext', () => {
    it('should identify regular characters', () => {
      const ctx = createInputContext('a');
      expect(ctx).toEqual({ char: 'a', isFormulaTrigger: false });
    });

    it('should identify = as formula trigger', () => {
      const ctx = createInputContext('=');
      expect(ctx).toEqual({ char: '=', isFormulaTrigger: true });
    });

    it('should identify + as formula trigger', () => {
      const ctx = createInputContext('+');
      expect(ctx).toEqual({ char: '+', isFormulaTrigger: true });
    });

    it('should identify - as formula trigger', () => {
      const ctx = createInputContext('-');
      expect(ctx).toEqual({ char: '-', isFormulaTrigger: true });
    });

    it('should return frozen object', () => {
      const ctx = createInputContext('x');
      expect(Object.isFrozen(ctx)).toBe(true);
    });

    it('should throw on non-string input', () => {
      expect(() => createInputContext(123)).toThrow('Invalid char');
    });

    it('should throw on multi-character string', () => {
      expect(() => createInputContext('ab')).toThrow('Invalid char');
    });

    it('should throw on empty string', () => {
      expect(() => createInputContext('')).toThrow('Invalid char');
    });
  });

  describe('createCommitContext', () => {
    it('should default to move down', () => {
      const ctx = createCommitContext();
      expect(ctx).toEqual({ moveDirection: 'down' });
    });

    it('should accept right direction for Tab', () => {
      const ctx = createCommitContext(COMMIT_MOVES.RIGHT);
      expect(ctx).toEqual({ moveDirection: 'right' });
    });

    it('should accept none direction for click-away', () => {
      const ctx = createCommitContext(COMMIT_MOVES.NONE);
      expect(ctx).toEqual({ moveDirection: 'none' });
    });

    it('should throw on invalid direction', () => {
      expect(() => createCommitContext('up')).toThrow('Invalid moveDirection');
    });
  });

  describe('createCellSelectContext', () => {
    it('should create context with defaults', () => {
      const ctx = createCellSelectContext({ row: 1, col: 0 });
      expect(ctx).toEqual({
        coords: { row: 1, col: 0 },
        shift: false,
        ctrl: false,
      });
    });

    it('should create context with shift', () => {
      const ctx = createCellSelectContext({ row: 5, col: 3 }, true, false);
      expect(ctx.shift).toBe(true);
      expect(ctx.ctrl).toBe(false);
    });

    it('should create context with ctrl', () => {
      const ctx = createCellSelectContext({ row: 2, col: 1 }, false, true);
      expect(ctx.shift).toBe(false);
      expect(ctx.ctrl).toBe(true);
    });

    it('should freeze coords deeply', () => {
      const ctx = createCellSelectContext({ row: 1, col: 1 });
      expect(Object.isFrozen(ctx.coords)).toBe(true);
    });

    it('should throw on invalid coords', () => {
      expect(() => createCellSelectContext(null)).toThrow('Invalid coords');
      expect(() => createCellSelectContext({ row: 'A', col: 1 })).toThrow('Invalid coords');
      expect(() => createCellSelectContext({ row: 1 })).toThrow('Invalid coords');
    });
  });

  describe('createHeaderSelectContext', () => {
    it('should create column header context', () => {
      const ctx = createHeaderSelectContext('col', 2);
      expect(ctx).toEqual({ type: 'col', index: 2, shift: false, ctrl: false });
    });

    it('should create row header context', () => {
      const ctx = createHeaderSelectContext('row', 5, true, false);
      expect(ctx).toEqual({ type: 'row', index: 5, shift: true, ctrl: false });
    });

    it('should throw on invalid type', () => {
      expect(() => createHeaderSelectContext('cell', 1)).toThrow('Invalid header type');
    });

    it('should throw on negative index', () => {
      expect(() => createHeaderSelectContext('col', -1)).toThrow('Invalid index');
    });
  });

  describe('createDeleteContext', () => {
    it('should create backspace context', () => {
      const ctx = createDeleteContext('backspace');
      expect(ctx).toEqual({ key: 'backspace' });
    });

    it('should create delete context', () => {
      const ctx = createDeleteContext('Delete');
      expect(ctx).toEqual({ key: 'delete' });
    });

    it('should normalize to lowercase', () => {
      const ctx = createDeleteContext('BACKSPACE');
      expect(ctx.key).toBe('backspace');
    });

    it('should throw on invalid key', () => {
      expect(() => createDeleteContext('remove')).toThrow('Invalid delete key');
    });
  });

  describe('createEditStartContext', () => {
    it('should default to keyboard source', () => {
      const ctx = createEditStartContext();
      expect(ctx).toEqual({ source: 'keyboard' });
    });

    it('should accept mouse source', () => {
      const ctx = createEditStartContext('mouse');
      expect(ctx).toEqual({ source: 'mouse' });
    });

    it('should throw on invalid source', () => {
      expect(() => createEditStartContext('touch')).toThrow('Invalid source');
    });
  });

  describe('FORMULA_TRIGGERS', () => {
    it('should be frozen', () => {
      expect(Object.isFrozen(FORMULA_TRIGGERS)).toBe(true);
    });

    it('should contain =, +, and -', () => {
      expect(FORMULA_TRIGGERS).toContain('=');
      expect(FORMULA_TRIGGERS).toContain('+');
      expect(FORMULA_TRIGGERS).toContain('-');
    });
  });
});