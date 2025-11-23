/**
 * StyleManager
 * * Implements the Flyweight pattern for cell formatting.
 * Maintains a central "palette" of unique styles to minimize data duplication.
 * * Usage:
 * const styleId = styleManager.addStyle({ font: { bold: true } });
 * cell.styleId = styleId;
 */
export class StyleManager {
  constructor(existingStyles = {}) {
    this.styles = existingStyles; // The Palette: { "1": { ... }, "2": { ... } }
    this.reverseLookup = new Map(); // Optimization: Hash -> ID
    
    // Initialize reverse lookup for existing styles
    for (const [id, style] of Object.entries(this.styles)) {
      const hash = this._generateHash(style);
      this.reverseLookup.set(hash, id);
    }
  }

  /**
   * Gets or creates an ID for a specific style object.
   * This ensures de-duplication.
   * @param {Object} styleObject - e.g. { font: { bold: true } }
   * @returns {string} The ID of the style in the palette
   */
  addStyle(styleObject) {
    if (!styleObject || Object.keys(styleObject).length === 0) {
      return null; // No style
    }

    const hash = this._generateHash(styleObject);

    // 1. Check if style already exists
    if (this.reverseLookup.has(hash)) {
      return this.reverseLookup.get(hash);
    }

    // 2. Create new style entry
    const newId = this._generateId();
    this.styles[newId] = styleObject;
    this.reverseLookup.set(hash, newId);

    return newId;
  }

  /**
   * Retrieves the full style object for a given ID.
   * @param {string} id 
   * @returns {Object|null}
   */
  getStyle(id) {
    return this.styles[id] || null;
  }

  /**
   * Exports the palette for saving to file
   */
  getPalette() {
    return this.styles;
  }

  // --- Private Helpers ---

  /**
   * Generates a deterministic hash for a style object.
   * We simply use JSON.stringify, but we must ensure key order is consistent.
   */
  _generateHash(style) {
    // Sort keys recursively to ensure {a:1, b:2} hashes same as {b:2, a:1}
    const sortKeys = (obj) => {
      if (typeof obj !== 'object' || obj === null) return obj;
      return Object.keys(obj).sort().reduce((result, key) => {
        result[key] = sortKeys(obj[key]);
        return result;
      }, {});
    };
    return JSON.stringify(sortKeys(style));
  }

  _generateId() {
    // Simple ID generator. In production, could use shortid or incrementing integer.
    // Using timestamp + random for collision safety in this context.
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
}