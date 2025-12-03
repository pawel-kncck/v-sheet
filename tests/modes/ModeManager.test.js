import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModeManager } from '../../js/modes/ModeManager.js';
import { AbstractMode } from '../../js/modes/AbstractMode.js';

// Test mode implementations
class TestReadyMode extends AbstractMode {
  constructor(context) {
    super(context);
    this.enterCount = 0;
    this.exitCount = 0;
    this.lastPayload = null;
  }

  getName() {
    return 'ready';
  }

  onEnter(payload) {
    super.onEnter(payload);
    this.enterCount++;
    this.lastPayload = payload;
  }

  onExit() {
    super.onExit();
    this.exitCount++;
  }

  handleIntent(intent, context) {
    if (intent === 'EDIT_START') {
      this._requestModeSwitch('edit', { cellId: 'A1' });
      return true;
    }
    if (intent === 'NAVIGATE') {
      return true;
    }
    return false;
  }
}

class TestEditMode extends AbstractMode {
  constructor(context) {
    super(context);
    this.enterCount = 0;
    this.exitCount = 0;
    this.lastPayload = null;
  }

  getName() {
    return 'edit';
  }

  onEnter(payload) {
    super.onEnter(payload);
    this.enterCount++;
    this.lastPayload = payload;
  }

  onExit() {
    super.onExit();
    this.exitCount++;
  }

  handleIntent(intent, context) {
    if (intent === 'COMMIT') {
      this._requestModeSwitch('ready');
      return true;
    }
    // Edit mode doesn't handle NAVIGATE (allows text cursor movement)
    return false;
  }
}

describe('ModeManager', () => {
  let mockContext;
  let manager;

  beforeEach(() => {
    mockContext = {
      selectionManager: { getActiveCellId: vi.fn().mockReturnValue('A1') },
      editorManager: { startEdit: vi.fn() },
      historyManager: { execute: vi.fn() },
      fileManager: { getRawCellValue: vi.fn().mockReturnValue('test') },
      formulaWorker: { postMessage: vi.fn() },
      renderer: { getCellElement: vi.fn() },
      executeCellUpdate: vi.fn(),
    };

    manager = new ModeManager(mockContext);
  });

  describe('Constructor', () => {
    it('should throw if context is missing', () => {
      expect(() => new ModeManager()).toThrow('ModeManager requires a context object');
      expect(() => new ModeManager(null)).toThrow('ModeManager requires a context object');
    });

    it('should initialize with no active mode', () => {
      expect(manager.getCurrentMode()).toBeNull();
      expect(manager.getCurrentModeName()).toBeNull();
    });

    it('should augment context with switchMode callback', () => {
      manager.registerMode('ready', TestReadyMode);
      manager.switchMode('ready');

      const mode = manager.getCurrentMode();
      expect(mode._context.switchMode).toBeDefined();
      expect(typeof mode._context.switchMode).toBe('function');
    });
  });

  describe('registerMode()', () => {
    it('should register a mode class', () => {
      manager.registerMode('ready', TestReadyMode);
      expect(manager.hasMode('ready')).toBe(true);
    });

    it('should throw on empty name', () => {
      expect(() => manager.registerMode('', TestReadyMode)).toThrow('Mode name must be a non-empty string');
      expect(() => manager.registerMode(null, TestReadyMode)).toThrow('Mode name must be a non-empty string');
    });

    it('should throw if ModeClass is not a constructor', () => {
      expect(() => manager.registerMode('ready', {})).toThrow('must be a constructor function');
      expect(() => manager.registerMode('ready', 'ReadyMode')).toThrow('must be a constructor function');
    });

    it('should allow overwriting existing registration', () => {
      manager.registerMode('ready', TestReadyMode);
      // Should not throw, just warn
      expect(() => manager.registerMode('ready', TestEditMode)).not.toThrow();
    });

    it('should list registered modes', () => {
      manager.registerMode('ready', TestReadyMode);
      manager.registerMode('edit', TestEditMode);

      const modes = manager.getRegisteredModes();
      expect(modes).toContain('ready');
      expect(modes).toContain('edit');
      expect(modes.length).toBe(2);
    });
  });

  describe('switchMode()', () => {
    beforeEach(() => {
      manager.registerMode('ready', TestReadyMode);
      manager.registerMode('edit', TestEditMode);
    });

    it('should throw on unregistered mode', () => {
      expect(() => manager.switchMode('unknown')).toThrow('Cannot switch to unregistered mode');
      expect(() => manager.switchMode('unknown')).toThrow('Available modes: ready, edit');
    });

    it('should switch to a registered mode', () => {
      manager.switchMode('ready');

      expect(manager.getCurrentModeName()).toBe('ready');
      expect(manager.getCurrentMode()).toBeInstanceOf(TestReadyMode);
    });

    it('should call onEnter on the new mode', () => {
      manager.switchMode('ready');

      const mode = manager.getCurrentMode();
      expect(mode.enterCount).toBe(1);
    });

    it('should pass payload to onEnter', () => {
      const payload = { cellId: 'B2', initialValue: 'test' };
      manager.switchMode('edit', payload);

      const mode = manager.getCurrentMode();
      expect(mode.lastPayload).toEqual(payload);
    });

    it('should call onExit on the previous mode', () => {
      manager.switchMode('ready');
      const readyMode = manager.getCurrentMode();

      manager.switchMode('edit');

      expect(readyMode.exitCount).toBe(1);
    });

    it('should call onExit before onEnter', () => {
      const callOrder = [];

      // Override methods to track call order
      const OriginalReadyMode = class extends TestReadyMode {
        onExit() {
          super.onExit();
          callOrder.push('ready:exit');
        }
      };

      const OriginalEditMode = class extends TestEditMode {
        onEnter(payload) {
          super.onEnter(payload);
          callOrder.push('edit:enter');
        }
      };

      const freshManager = new ModeManager(mockContext);
      freshManager.registerMode('ready', OriginalReadyMode);
      freshManager.registerMode('edit', OriginalEditMode);

      freshManager.switchMode('ready');
      callOrder.length = 0; // Reset

      freshManager.switchMode('edit');

      expect(callOrder).toEqual(['ready:exit', 'edit:enter']);
    });

    it('should cache mode instances (lazy instantiation)', () => {
      manager.switchMode('ready');
      const firstInstance = manager.getCurrentMode();

      manager.switchMode('edit');
      manager.switchMode('ready');
      const secondInstance = manager.getCurrentMode();

      expect(secondInstance).toBe(firstInstance);
    });

    it('should allow switching to same mode (with different payload)', () => {
      manager.switchMode('edit', { cellId: 'A1' });
      const mode = manager.getCurrentMode();
      const firstPayload = mode.lastPayload;

      manager.switchMode('edit', { cellId: 'B2' });
      const secondPayload = mode.lastPayload;

      expect(firstPayload).toEqual({ cellId: 'A1' });
      expect(secondPayload).toEqual({ cellId: 'B2' });
      expect(mode.enterCount).toBe(2);
      expect(mode.exitCount).toBe(1); // Exit was called before re-entering
    });
  });

  describe('handleIntent()', () => {
    beforeEach(() => {
      manager.registerMode('ready', TestReadyMode);
      manager.registerMode('edit', TestEditMode);
    });

    it('should return false when no mode is active', () => {
      const result = manager.handleIntent('NAVIGATE', {});
      expect(result).toBe(false);
    });

    it('should delegate to current mode', () => {
      manager.switchMode('ready');

      const handled = manager.handleIntent('NAVIGATE', { direction: 'down' });
      expect(handled).toBe(true);
    });

    it('should return false for unhandled intents', () => {
      manager.switchMode('edit');

      // Edit mode doesn't handle NAVIGATE
      const handled = manager.handleIntent('NAVIGATE', { direction: 'down' });
      expect(handled).toBe(false);
    });

    it('should allow mode to trigger switch via intent handler', () => {
      manager.switchMode('ready');

      manager.handleIntent('EDIT_START', {});

      expect(manager.getCurrentModeName()).toBe('edit');
    });
  });

  describe('isInMode()', () => {
    beforeEach(() => {
      manager.registerMode('ready', TestReadyMode);
      manager.registerMode('edit', TestEditMode);
    });

    it('should return false when no mode is active', () => {
      expect(manager.isInMode('ready')).toBe(false);
    });

    it('should return true for current mode', () => {
      manager.switchMode('ready');
      expect(manager.isInMode('ready')).toBe(true);
    });

    it('should return false for non-current mode', () => {
      manager.switchMode('ready');
      expect(manager.isInMode('edit')).toBe(false);
    });
  });

  describe('reset()', () => {
    beforeEach(() => {
      manager.registerMode('ready', TestReadyMode);
      manager.registerMode('edit', TestEditMode);
      manager.switchMode('ready');
    });

    it('should clear current mode', () => {
      manager.reset();

      expect(manager.getCurrentMode()).toBeNull();
      expect(manager.getCurrentModeName()).toBeNull();
    });

    it('should call onExit on current mode before reset', () => {
      const mode = manager.getCurrentMode();
      const exitCountBefore = mode.exitCount;

      manager.reset();

      expect(mode.exitCount).toBe(exitCountBefore + 1);
    });

    it('should clear mode instances but keep registrations by default', () => {
      manager.reset();

      expect(manager.hasMode('ready')).toBe(true);
      expect(manager.hasMode('edit')).toBe(true);
    });

    it('should clear registrations when clearRegistry is true', () => {
      manager.reset(true);

      expect(manager.hasMode('ready')).toBe(false);
      expect(manager.hasMode('edit')).toBe(false);
      expect(manager.getRegisteredModes()).toEqual([]);
    });

    it('should create fresh instances after reset', () => {
      const firstInstance = manager.getCurrentMode();
      
      manager.reset();
      manager.switchMode('ready');
      const secondInstance = manager.getCurrentMode();

      expect(secondInstance).not.toBe(firstInstance);
    });
  });
});

describe('ModeManager - Integration Scenarios', () => {
  let mockContext;
  let manager;

  beforeEach(() => {
    mockContext = {
      selectionManager: { getActiveCellId: vi.fn().mockReturnValue('A1') },
      editorManager: { startEdit: vi.fn() },
      historyManager: { execute: vi.fn() },
      fileManager: { getRawCellValue: vi.fn().mockReturnValue('test') },
      formulaWorker: { postMessage: vi.fn() },
      renderer: { getCellElement: vi.fn() },
      executeCellUpdate: vi.fn(),
    };

    manager = new ModeManager(mockContext);
    manager.registerMode('ready', TestReadyMode);
    manager.registerMode('edit', TestEditMode);
  });

  it('should support full Ready → Edit → Ready cycle', () => {
    // Start in Ready
    manager.switchMode('ready');
    expect(manager.isInMode('ready')).toBe(true);

    // User presses F2 (EDIT_START intent triggers switch to Edit)
    manager.handleIntent('EDIT_START', {});
    expect(manager.isInMode('edit')).toBe(true);

    // Verify payload was passed
    const editMode = manager.getCurrentMode();
    expect(editMode.lastPayload).toEqual({ cellId: 'A1' });

    // User presses Enter (COMMIT intent triggers switch to Ready)
    manager.handleIntent('COMMIT', {});
    expect(manager.isInMode('ready')).toBe(true);
  });

  it('should correctly track lifecycle across multiple transitions', () => {
    manager.switchMode('ready');
    const readyMode = manager.getCurrentMode();

    manager.switchMode('edit');
    const editMode = manager.getCurrentMode();

    manager.switchMode('ready');
    manager.switchMode('edit');
    manager.switchMode('ready');

    // Ready: enter 3x, exit 2x (last enter has no exit yet)
    expect(readyMode.enterCount).toBe(3);
    expect(readyMode.exitCount).toBe(2);

    // Edit: enter 2x, exit 2x
    expect(editMode.enterCount).toBe(2);
    expect(editMode.exitCount).toBe(2);
  });

  it('should pass original context properties to modes', () => {
    manager.switchMode('ready');
    const mode = manager.getCurrentMode();

    // Mode should have access to all original context properties
    expect(mode._selectionManager).toBe(mockContext.selectionManager);
    expect(mode._editorManager).toBe(mockContext.editorManager);
    expect(mode._fileManager).toBe(mockContext.fileManager);
  });
});