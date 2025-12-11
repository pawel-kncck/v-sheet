# Dependency Graph

**Last Updated**: 2025-12-12

This document describes the dependency graph system that tracks relationships between cells for formula recalculation.

---

## Overview

The dependency graph tracks which cells depend on which other cells. When a cell value changes, the graph determines which formulas need to be recalculated and in what order.

**Primary File**: `js/engine/DependencyGraph.js`

---

## Core Concepts

### Terminology

| Term | Definition | Example |
|------|------------|---------|
| **Precedent** | A cell that another cell depends on | In `B1 = A1 + C1`, A1 and C1 are precedents of B1 |
| **Dependent** | A cell that depends on another cell | In `B1 = A1 + C1`, B1 is a dependent of both A1 and C1 |
| **Dependencies** | The set of precedents for a cell | B1's dependencies: `{A1, C1}` |
| **Dependents** | The set of cells that depend on this cell | A1's dependents: `{B1}` |

### Visual Example

```
        Dependencies (Precedents)
              A1      C1
               \     /
                \   /
                 \ /
                 B1
                  |
                  |
                 D5
        Dependents (Followers)

Graph representation:
  dependencies: { B1: Set(A1, C1), D5: Set(B1) }
  dependents:   { A1: Set(B1), C1: Set(B1), B1: Set(D5) }
```

---

## Data Structure

### Two-Way Map

```javascript
class DependencyGraph {
  constructor() {
    // Precedents: "B1 depends on these cells"
    // B1 → Set(A1, C1)
    this.dependencies = new Map();

    // Dependents: "These cells depend on A1"
    // A1 → Set(B1, D5)
    this.dependents = new Map();
  }
}
```

### Why Two Maps?

| Operation | Uses | Complexity |
|-----------|------|------------|
| "What does B1 depend on?" | `dependencies.get("B1")` | O(1) |
| "What depends on A1?" | `dependents.get("A1")` | O(1) |
| Update B1's formula | Both maps | O(d) where d = dependency count |

---

## Core Methods

### `updateDependencies(cellId, newDependencies)`

Updates the graph when a cell's formula changes:

```javascript
updateDependencies(cellId, newDependencies) {
  // 1. Remove old dependencies for this cell
  this._remove(cellId);

  // 2. Set the new dependencies
  this.dependencies.set(cellId, newDependencies);

  // 3. Update dependents for each precedent
  for (const dep of newDependencies) {
    if (!this.dependents.has(dep)) {
      this.dependents.set(dep, new Set());
    }
    this.dependents.get(dep).add(cellId);
  }
}
```

### Example

```javascript
// Cell B1 has formula: =A1+C1
graph.updateDependencies('B1', new Set(['A1', 'C1']));

// State after:
// dependencies: { 'B1' → Set('A1', 'C1') }
// dependents:   { 'A1' → Set('B1'), 'C1' → Set('B1') }
```

---

### `clear(cellId)`

Removes a cell from the graph (when its formula is deleted):

```javascript
clear(cellId) {
  this._remove(cellId);
}

_remove(cellId) {
  const oldDependencies = this.dependencies.get(cellId);
  if (oldDependencies) {
    // Remove this cell from each precedent's dependents list
    for (const dep of oldDependencies) {
      const dependents = this.dependents.get(dep);
      if (dependents) {
        dependents.delete(cellId);
      }
    }
  }
  // Clear this cell's dependencies
  this.dependencies.delete(cellId);
}
```

---

### `checkForCircularReference(cellId, newDependencies)`

Detects if a formula would create a circular reference:

```javascript
checkForCircularReference(cellId, newDependencies) {
  // Temporarily remove old edges
  const oldDependencies = this.dependencies.get(cellId);
  if (oldDependencies) {
    for (const dep of oldDependencies) {
      const dependents = this.dependents.get(dep);
      if (dependents) {
        dependents.delete(cellId);
      }
    }
  }

  // Check for cycles
  let hasCircularRef = false;

  for (const dep of newDependencies) {
    // Direct self-reference
    if (dep === cellId) {
      hasCircularRef = true;
      break;
    }
    // Indirect circular reference
    if (this._tracePrecedents(dep, cellId, new Set())) {
      hasCircularRef = true;
      break;
    }
  }

  // Restore old edges if circular ref found
  if (oldDependencies && hasCircularRef) {
    for (const dep of oldDependencies) {
      if (!this.dependents.has(dep)) {
        this.dependents.set(dep, new Set());
      }
      this.dependents.get(dep).add(cellId);
    }
  }

  return hasCircularRef;
}
```

### Circular Reference Detection

The `_tracePrecedents` method recursively checks if a path exists from a cell back to the target:

```javascript
_tracePrecedents(currentCell, targetCell, visited) {
  if (visited.has(currentCell)) {
    return false;  // Already checked this path
  }
  visited.add(currentCell);

  const precedents = this.dependencies.get(currentCell);
  if (!precedents) {
    return false;  // No dependencies, can't reach target
  }

  for (const precedent of precedents) {
    if (precedent === targetCell) {
      return true;  // Found circular reference!
    }
    if (this._tracePrecedents(precedent, targetCell, visited)) {
      return true;
    }
  }

  return false;
}
```

### Example: Circular Reference

```
Current state:
  A1 = 10
  B1 = A1 * 2     (B1 depends on A1)
  C1 = B1 + 5     (C1 depends on B1)

User tries: A1 = C1 + 1

Check: Does C1's dependency chain include A1?
  C1 → B1 → A1 ✓ (Found!)

Result: Circular reference detected, formula rejected
```

---

### `getRecalculationOrder(changedCellId)`

Returns cells that need recalculation in topologically sorted order:

```javascript
getRecalculationOrder(changedCellId) {
  const order = [];
  const visited = new Set();

  // Only visit direct dependents of the changed cell
  const directDependents = this.dependents.get(changedCellId);
  if (!directDependents) {
    return [];  // No dependents, nothing to recalculate
  }

  // Depth-First Search for topological sort
  const visit = (cellId) => {
    if (visited.has(cellId)) return;
    visited.add(cellId);

    const dependents = this.dependents.get(cellId);
    if (dependents) {
      for (const dependent of dependents) {
        visit(dependent);
      }
    }

    // Add after visiting all children (reverse topological order)
    order.push(cellId);
  };

  for (const dependent of directDependents) {
    visit(dependent);
  }

  // Reverse for correct calculation order
  return order.reverse();
}
```

### Example: Recalculation Order

```
Graph:
  A1 → B1 → C1
       ↓
       D1

A1 changes:
  Direct dependents: {B1}
  DFS from B1:
    Visit B1 → dependents: {C1, D1}
    Visit C1 → dependents: {} → add C1 to order
    Visit D1 → dependents: {} → add D1 to order
    add B1 to order

  Order (reversed): [B1, C1, D1]

Recalculate in this order to ensure precedents are calculated first.
```

---

## Integration with Formula Engine

### Setting a Cell Value

```javascript
// In FormulaEngine
setValue(cellId, rawValue) {
  if (typeof rawValue === 'string' && rawValue.startsWith('=')) {
    // Parse formula
    const ast = this.parser.parse(rawValue.substring(1));

    // Extract dependencies from AST
    const dependencies = this._extractDependencies(ast);

    // Check for circular reference
    if (this.dependencyGraph.checkForCircularReference(cellId, dependencies)) {
      // Return error
      return { [cellId]: new CircularRefError() };
    }

    // Update graph
    this.dependencyGraph.updateDependencies(cellId, dependencies);

    // Evaluate
    const result = this.evaluator.evaluate(ast);
    this.cells.set(cellId, { raw: rawValue, computed: result });

    // Recalculate dependents
    return this._recalculateDependents(cellId);
  } else {
    // Clear any existing dependencies
    this.dependencyGraph.clear(cellId);

    // Store value
    this.cells.set(cellId, { raw: rawValue, computed: rawValue });

    // Recalculate dependents
    return this._recalculateDependents(cellId);
  }
}

_recalculateDependents(changedCellId) {
  const updates = {};
  const order = this.dependencyGraph.getRecalculationOrder(changedCellId);

  for (const cellId of order) {
    const cell = this.cells.get(cellId);
    if (cell && typeof cell.raw === 'string' && cell.raw.startsWith('=')) {
      const ast = this.parser.parse(cell.raw.substring(1));
      const result = this.evaluator.evaluate(ast);
      cell.computed = result;
      updates[cellId] = result;
    }
  }

  return updates;
}
```

---

## Dependency Extraction

Extracting cell references from an AST:

```javascript
_extractDependencies(ast) {
  const dependencies = new Set();

  const visit = (node) => {
    switch (node.type) {
      case 'cell':
        dependencies.add(node.ref.replace(/\$/g, ''));  // Strip $ signs
        break;

      case 'range':
        // Add all cells in the range
        const cells = this._expandRange(node.start, node.end);
        cells.forEach(cell => dependencies.add(cell));
        break;

      case 'operator':
        visit(node.left);
        visit(node.right);
        break;

      case 'function':
        node.args.forEach(visit);
        break;

      case 'group':
        visit(node.expression);
        break;

      case 'unary':
        visit(node.operand);
        break;
    }
  };

  visit(ast);
  return dependencies;
}
```

---

## Performance Considerations

### Time Complexity

| Operation | Complexity |
|-----------|------------|
| Update dependencies | O(d) where d = number of dependencies |
| Check circular ref | O(V + E) where V = cells, E = edges |
| Get recalc order | O(V + E) for affected subgraph |

### Space Complexity

- O(V + E) for the two maps
- Most spreadsheets have sparse dependencies, so E << V

### Optimizations

1. **Incremental updates**: Only recalculate affected cells, not the entire sheet
2. **Early termination**: Circular ref check stops as soon as cycle is found
3. **Visited set**: Prevents redundant traversals in DFS

---

## See Also

- Formula engine: `/docs/architecture/02-formula-engine.md`
- Error types: `/docs/architecture/formula-engine/error-types.md`
- AST node types: `/docs/architecture/formula-engine/ast-node-types.md`
