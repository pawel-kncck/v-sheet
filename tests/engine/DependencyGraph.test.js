import { describe, it, expect } from 'vitest';
import { DependencyGraph } from '../../js/engine/DependencyGraph.js';

describe('DependencyGraph', () => {
  let graph;
  beforeEach(() => {
    graph = new DependencyGraph();
  });

  it('should get correct recalculation order', () => {
    // A1 -> B1
    // B1 -> C1
    graph.updateDependencies('B1', new Set(['A1']));
    graph.updateDependencies('C1', new Set(['B1']));

    // If A1 changes, B1 and C1 must update, in that order.
    const order = graph.getRecalculationOrder('A1');
    expect(order).toEqual(['B1', 'C1']);
  });

  it('should handle multiple dependents', () => {
    // A1 -> B1
    // A1 -> C1
    // C1 -> D1
    graph.updateDependencies('B1', new Set(['A1']));
    graph.updateDependencies('C1', new Set(['A1']));
    graph.updateDependencies('D1', new Set(['C1']));

    // If A1 changes, all must update. B1 and C1 must come before D1.
    const order = graph.getRecalculationOrder('A1');
    // We can't guarantee [B1, C1, D1] vs [C1, B1, D1],
    // but D1 must be last.
    expect(order).toContain('B1');
    expect(order).toContain('C1');
    expect(order).toContain('D1');
    expect(order.indexOf('D1')).toBeGreaterThan(order.indexOf('C1'));
  });

  it('should detect direct circular references', () => {
    // A1 -> A1
    const isCircular = graph.checkForCircularReference('A1', new Set(['A1']));
    expect(isCircular).toBe(true);
  });

  it('should detect simple circular references', () => {
    // A1 -> B1
    graph.updateDependencies('B1', new Set(['A1']));
    // Now, try to set B1 -> A1
    const isCircular = graph.checkForCircularReference('A1', new Set(['B1']));
    expect(isCircular).toBe(true);
  });

  it('should detect transitive circular references', () => {
    // A1 -> B1
    // B1 -> C1
    graph.updateDependencies('B1', new Set(['A1']));
    graph.updateDependencies('C1', new Set(['B1']));
    // Now, try to set C1 -> A1
    const isCircular = graph.checkForCircularReference('A1', new Set(['C1']));
    expect(isCircular).toBe(true);
  });

  it('should return false for valid dependencies', () => {
    // A1 -> B1
    graph.updateDependencies('B1', new Set(['A1']));
    // Try to set C1 -> B1
    const isCircular = graph.checkForCircularReference('C1', new Set(['B1']));
    expect(isCircular).toBe(false);
  });
});
