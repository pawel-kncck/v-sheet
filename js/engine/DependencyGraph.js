/**
 * DependencyGraph
 *
 * This class tracks the relationships between cells. It builds a directed graph
 * where each cell is a node and an edge from A to B means "B depends on A".
 *
 * It maintains two maps for efficient lookups:
 * 1. dependencies (precedents):  B -> Set[A] (B depends on A)
 * 2. dependents (followers):   A -> Set[B] (B is a dependent of A)
 *
 * This structure allows for fast updates, circular reference detection,
 * and topological sorting for recalculation.
 */
import { Logger } from './utils/Logger.js';

class DependencyGraph {
  constructor() {
    /**
     * Stores the precedents for a cell.
     * @type {Map<string, Set<string>>}
     * @example { "B1": Set("A1", "C1") } // B1 = A1 + C1
     */
    this.dependencies = new Map();

    /**
     * Stores the dependents for a cell.
     * @type {Map<string, Set<string>>}
     * @example { "A1": Set("B1", "D5") } // B1 and D5 both use A1
     */
    this.dependents = new Map();
  }

  /**
   * Updates the dependencies for a given cell. This is the main
   * method for adding/updating a formula.
   * @param {string} cellId - The cell being set (e.g., "B1").
   * @param {Set<string>} newDependencies - A Set of cell IDs this cell
   * now depends on (e.g., Set("A1", "C1")).
   */
  updateDependencies(cellId, newDependencies) {
    // 1. Remove old dependencies for this cell
    this._remove(cellId);

    // 2. Set the new dependencies for this cell
    this.dependencies.set(cellId, newDependencies);

    // 3. Update the dependents list for each cell we now depend on
    for (const dep of newDependencies) {
      if (!this.dependents.has(dep)) {
        this.dependents.set(dep, new Set());
      }
      this.dependents.get(dep).add(cellId);
    }
  }

  /**
   * Clears all dependencies and dependents for a cell.
   * Used when a formula is cleared or a cell is deleted.
   * @param {string} cellId - The cell to remove from the graph.
   */
  clear(cellId) {
    this._remove(cellId);
  }

  /**
   * Checks if adding a new dependency would create a circular reference.
   * It does this by checking if any of the new dependencies (or their
   * precedents, recursively) already trace back to the cell being set.
   *
   * @param {string} cellId - The cell being set (e.g., "B1").
   * @param {Set<string>} newDependencies - The dependencies of the new formula
   * (e.g., Set("A1")).
   * @returns {boolean} - True if a circular reference is detected, false otherwise.
   */
  checkForCircularReference(cellId, newDependencies) {
    // ✅ Save and temporarily remove the old edges
    const oldDependencies = this.dependencies.get(cellId);

    if (oldDependencies) {
      for (const dep of oldDependencies) {
        const dependents = this.dependents.get(dep);
        if (dependents) {
          dependents.delete(cellId);
        }
      }
    }

    // Check for cycles with clean graph
    let hasCircularRef = false;

    for (const dep of newDependencies) {
      if (dep === cellId) {
        hasCircularRef = true;
        break;
      }
      // --- THIS IS THE FIX ---
      // We trace *precedents* (up-stream) from the new dependency
      // to see if we ever find the cellId we are trying to set.
      if (this._tracePrecedents(dep, cellId, new Set())) {
        // --- END FIX ---
        hasCircularRef = true;
        break;
      }
    }

    // ✅ Restore old edges if check failed (so graph is unchanged)
    if (oldDependencies && hasCircularRef) {
      for (const dep of oldDependencies) {
        if (!this.dependents.has(dep)) {
          this.dependents.set(dep, new Set());
        }
        this.dependents.get(dep).add(cellId);
      }
    }
    // Note: If no circular ref, updateDependencies() will handle the cleanup

    return hasCircularRef;
  }

  /**
   * Recursive helper for circular reference detection.
   * Traces all *precedents* of `currentCell` to see if we ever find `targetCell`.
   * @private
   */
  // --- THIS IS THE CORRECTED FUNCTION ---
  _tracePrecedents(currentCell, targetCell, visited) {
    Logger.log(
      'DependencyGraph',
      `Tracing Precedents: ${currentCell} -> looking for ${targetCell}, visited:`,
      Array.from(visited)
    );

    if (visited.has(currentCell)) {
      Logger.log(
        'DependencyGraph',
        `Already visited ${currentCell}, returning false`
      );
      return false;
    }
    visited.add(currentCell);

    // FIX: Check 'this.dependencies', not 'this.dependents'
    const precedents = this.dependencies.get(currentCell);
    Logger.log(
      'DependencyGraph',
      `Precedents of ${currentCell}:`,
      precedents ? Array.from(precedents) : 'none'
    );

    if (!precedents) {
      return false;
    }

    // FIX: Iterate 'precedents', not 'dependents'
    for (const precedent of precedents) {
      Logger.log('DependencyGraph', `Checking precedent: ${precedent}`);
      if (precedent === targetCell) {
        Logger.log(
          'DependencyGraph',
          `✅ FOUND TARGET! ${precedent} === ${targetCell}`
        );
        return true;
      }
      // FIX: Recurse with '_tracePrecedents'
      if (this._tracePrecedents(precedent, targetCell, visited)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Gets the list of all cells that need to be recalculated, in the correct
   * topological order, when a cell changes.
   * @param {string} changedCellId - The cell that has just been updated.
   * @returns {Array<string>} An array of cell IDs in the order they must be
   * recalculated (e.g., ["B1", "C1"]).
   */
  getRecalculationOrder(changedCellId) {
    const order = [];
    const visited = new Set();

    // We only need to visit the direct dependents of the changed cell
    const directDependents = this.dependents.get(changedCellId);
    if (!directDependents) {
      return []; // This cell has no dependents, nothing to recalculate
    }

    /**
     * A recursive Depth-First Search (DFS) function to perform a
     * topological sort of the dependency graph.
     * @param {string} cellId
     */
    const visit = (cellId) => {
      if (visited.has(cellId)) {
        return;
      }
      visited.add(cellId);

      const dependents = this.dependents.get(cellId);
      if (dependents) {
        for (const dependent of dependents) {
          visit(dependent);
        }
      }
      // After visiting all children, add this node to the order.
      // This ensures precedents are added after their dependents (in this pass).
      order.push(cellId);
    };

    // Visit each direct dependent
    for (const dependent of directDependents) {
      visit(dependent);
    }

    // The `order` array is now in reverse topological order (e.g., [C1, B1]).
    // We reverse it to get the correct calculation order (e.g., [B1, C1]).
    return order.reverse();
  }

  /**
   * Private helper to remove a cell's old dependencies.
   * @param {string} cellId - The cell to remove.
   * @private
   */
  _remove(cellId) {
    const oldDependencies = this.dependencies.get(cellId);
    if (oldDependencies) {
      // Go to each precedent and remove this cell from their list of dependents
      for (const dep of oldDependencies) {
        const dependents = this.dependents.get(dep);
        if (dependents) {
          dependents.delete(cellId);
        }
      }
    }
    // Finally, clear this cell's own list of dependencies
    this.dependencies.delete(cellId);
  }
}

// Export the class for ES6 Modules
export { DependencyGraph };
