import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AbstractMode } from '../../js/modes/AbstractMode.js';

// Concrete implementation for testing
class TestMode extends AbstractMode {
  getName() {
    return 'test';
  }
}

// Another concrete implementation to test different behaviors
class CustomMode extends AbstractMode {
  constructor(context) {
    super(context);
    this.enterCalled = false;
    this.exitCalled = false;
    this.lastPayload = null;
  }

  getName() {
    return 'custom';
  }

  onEnter(payload) {
    super.onEnter(payload);
    this.enterCalled = true;
    this.lastPayload = payload;
  }

  onExit() {
    super.onExit();
    this.exitCalled = true;
  }

  handleIntent(intent, context) {
    if (intent === 'TEST_INTENT') {
      return true;
    }
    return super.handleIntent(intent, context);
  }
}

describe('AbstractMode', () => {
  let mockContext;

  beforeEach(() => {
    mockContext = {
      selectionManager: {
        getActiveCellId: vi.fn().mockReturnValue('A1'),
        moveSelection: vi.fn(),
      },
      editorManager: {
        startEdit: vi.fn(),
        commitEdit: vi.fn(),
      },
      historyManager: {
        execute: vi.fn(),
      },
      fileManager: {
        getRawCellValue: vi.fn().mockReturnValue('test value'),
        updateCellData: vi.fn(),
      },
      formulaWorker: {
        postMessage: vi.fn(),
      },
      renderer: {
        getCellElement: vi.fn(),
      },
      switchMode: vi.fn(),
      executeCellUpdate: vi.fn(),
    };
  });

  describe('Constructor', () => {
    it('should throw when instantiated directly', () => {
      expect(() => new AbstractMode(mockContext)).toThrow(
        'AbstractMode is abstract and cannot be instantiated directly'
      );
    });

    it('should throw when context is missing', () => {
      expect(() => new TestMode()).toThrow('AbstractMode requires a context object');
      expect(() => new TestMode(null)).toThrow('AbstractMode requires a context object');
    });

    it('should allow instantiation of subclasses', () => {
      const mode = new TestMode(mockContext);
      expect(mode).toBeInstanceOf(AbstractMode);
      expect(mode).toBeInstanceOf(TestMode);
    });

    it('should store all context dependencies', () => {
      const mode = new TestMode(mockContext);
      expect(mode._selectionManager).toBe(mockContext.selectionManager);
      expect(mode._editorManager).toBe(mockContext.editorManager);
      expect(mode._historyManager).toBe(mockContext.historyManager);
      expect(mode._fileManager).toBe(mockContext.fileManager);
      expect(mode._formulaWorker).toBe(mockContext.formulaWorker);
      expect(mode._renderer).toBe(mockContext.renderer);
      expect(mode._switchMode).toBe(mockContext.switchMode);
      expect(mode._context).toBe(mockContext);
    });
  });

  describe('getName()', () => {
    it('should throw if not overridden', () => {
      // Create a minimal subclass that doesn't override getName
      class IncompleteMode extends AbstractMode {}
      
      const mode = new IncompleteMode(mockContext);
      expect(() => mode.getName()).toThrow('IncompleteMode must implement getName()');
    });

    it('should return mode name when overridden', () => {
      const mode = new TestMode(mockContext);
      expect(mode.getName()).toBe('test');
    });
  });

  describe('onEnter()', () => {
    it('should be callable without payload', () => {
      const mode = new TestMode(mockContext);
      expect(() => mode.onEnter()).not.toThrow();
    });

    it('should be callable with payload', () => {
      const mode = new TestMode(mockContext);
      expect(() => mode.onEnter({ cellId: 'A1' })).not.toThrow();
    });

    it('should allow subclasses to receive payload', () => {
      const mode = new CustomMode(mockContext);
      const payload = { cellId: 'B2', value: 'test' };
      
      mode.onEnter(payload);
      
      expect(mode.enterCalled).toBe(true);
      expect(mode.lastPayload).toEqual(payload);
    });
  });

  describe('onExit()', () => {
    it('should be callable', () => {
      const mode = new TestMode(mockContext);
      expect(() => mode.onExit()).not.toThrow();
    });

    it('should allow subclasses to perform cleanup', () => {
      const mode = new CustomMode(mockContext);
      
      mode.onExit();
      
      expect(mode.exitCalled).toBe(true);
    });
  });

  describe('handleIntent()', () => {
    it('should return false by default (unhandled)', () => {
      const mode = new TestMode(mockContext);
      const result = mode.handleIntent('UNKNOWN_INTENT', {});
      expect(result).toBe(false);
    });

    it('should allow subclasses to handle specific intents', () => {
      const mode = new CustomMode(mockContext);
      
      const handled = mode.handleIntent('TEST_INTENT', {});
      const unhandled = mode.handleIntent('OTHER_INTENT', {});
      
      expect(handled).toBe(true);
      expect(unhandled).toBe(false);
    });
  });

  describe('_requestModeSwitch()', () => {
    it('should call switchMode callback with name and payload', () => {
      const mode = new TestMode(mockContext);
      const payload = { cellId: 'A1' };
      
      mode._requestModeSwitch('edit', payload);
      
      expect(mockContext.switchMode).toHaveBeenCalledWith('edit', payload);
    });

    it('should call switchMode without payload when not provided', () => {
      const mode = new TestMode(mockContext);
      
      mode._requestModeSwitch('ready');
      
      expect(mockContext.switchMode).toHaveBeenCalledWith('ready', undefined);
    });

    it('should handle missing switchMode callback gracefully', () => {
      const contextWithoutSwitch = { ...mockContext, switchMode: null };
      const mode = new TestMode(contextWithoutSwitch);
      
      // Should not throw
      expect(() => mode._requestModeSwitch('edit')).not.toThrow();
    });
  });

  describe('_getActiveCellId()', () => {
    it('should return active cell ID from selection manager', () => {
      const mode = new TestMode(mockContext);
      
      const cellId = mode._getActiveCellId();
      
      expect(cellId).toBe('A1');
      expect(mockContext.selectionManager.getActiveCellId).toHaveBeenCalled();
    });

    it('should return null if selection manager is missing', () => {
      const contextWithoutSelection = { ...mockContext, selectionManager: null };
      const mode = new TestMode(contextWithoutSelection);
      
      const cellId = mode._getActiveCellId();
      
      expect(cellId).toBeNull();
    });
  });

  describe('_getCellValue()', () => {
    it('should return cell value from file manager', () => {
      const mode = new TestMode(mockContext);
      
      const value = mode._getCellValue('A1');
      
      expect(value).toBe('test value');
      expect(mockContext.fileManager.getRawCellValue).toHaveBeenCalledWith('A1');
    });

    it('should return empty string if file manager is missing', () => {
      const contextWithoutFile = { ...mockContext, fileManager: null };
      const mode = new TestMode(contextWithoutFile);
      
      const value = mode._getCellValue('A1');
      
      expect(value).toBe('');
    });
  });

  describe('_executeCellUpdate()', () => {
    it('should call context.executeCellUpdate', () => {
      const mode = new TestMode(mockContext);
      
      mode._executeCellUpdate('A1', 'new value');
      
      expect(mockContext.executeCellUpdate).toHaveBeenCalledWith('A1', 'new value');
    });

    it('should handle missing executeCellUpdate gracefully', () => {
      const contextWithoutUpdate = { ...mockContext, executeCellUpdate: null };
      const mode = new TestMode(contextWithoutUpdate);
      
      // Should not throw
      expect(() => mode._executeCellUpdate('A1', 'value')).not.toThrow();
    });
  });
});

describe('AbstractMode - Inheritance Pattern', () => {
  it('should support multiple levels of inheritance', () => {
    class BaseNavigationMode extends AbstractMode {
      getName() {
        return 'base-nav';
      }

      handleIntent(intent, context) {
        if (intent === 'NAVIGATE') {
          return true;
        }
        return super.handleIntent(intent, context);
      }
    }

    class ReadyMode extends BaseNavigationMode {
      getName() {
        return 'ready';
      }

      handleIntent(intent, context) {
        if (intent === 'EDIT_START') {
          return true;
        }
        return super.handleIntent(intent, context);
      }
    }

    const mockContext = {
      selectionManager: {},
      editorManager: {},
      historyManager: {},
      fileManager: {},
      formulaWorker: {},
      renderer: {},
      switchMode: vi.fn(),
    };

    const mode = new ReadyMode(mockContext);

    // ReadyMode should handle its own intent
    expect(mode.handleIntent('EDIT_START', {})).toBe(true);
    
    // ReadyMode should inherit navigation handling from BaseNavigationMode
    expect(mode.handleIntent('NAVIGATE', {})).toBe(true);
    
    // Unknown intents should return false
    expect(mode.handleIntent('UNKNOWN', {})).toBe(false);
    
    // Name should be from the concrete class
    expect(mode.getName()).toBe('ready');
  });
});