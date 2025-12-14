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

  // --- Text-Level Formatting Support ---

  /**
   * Default style values used when no style is specified
   */
  static get DEFAULT_FONT() {
    return {
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      color: '#000000',
      size: 12,
      family: 'system-ui'
    };
  }

  /**
   * Resolves the effective style for a text run by merging cell-level and text-level styles.
   * Text-level style properties override cell-level properties.
   *
   * @param {Object|null} cellStyle - The cell-level style object
   * @param {Object|null} textRunStyle - The text-level style override (only stores differences)
   * @returns {Object} The merged effective style with font properties
   */
  resolveStyle(cellStyle, textRunStyle) {
    const defaults = StyleManager.DEFAULT_FONT;
    const cellFont = cellStyle?.font || {};
    const runFont = textRunStyle?.font || {};

    return {
      font: {
        bold: runFont.bold ?? cellFont.bold ?? defaults.bold,
        italic: runFont.italic ?? cellFont.italic ?? defaults.italic,
        underline: runFont.underline ?? cellFont.underline ?? defaults.underline,
        strikethrough: runFont.strikethrough ?? cellFont.strikethrough ?? defaults.strikethrough,
        color: runFont.color ?? cellFont.color ?? defaults.color,
        size: runFont.size ?? cellFont.size ?? defaults.size,
        family: runFont.family ?? cellFont.family ?? defaults.family
      }
      // Note: fill, align, wrap, border are cell-level only and not included here
    };
  }

  /**
   * Extracts only the text-level formattable properties from a style object.
   * Used to create text-level style overrides that only store differences.
   *
   * @param {Object} style - Full style object
   * @returns {Object} Style object with only text-level properties
   */
  extractTextLevelStyle(style) {
    if (!style || !style.font) return null;

    const textLevelFont = {};
    const textLevelProps = ['bold', 'italic', 'underline', 'strikethrough', 'color', 'size', 'family'];

    for (const prop of textLevelProps) {
      if (style.font[prop] !== undefined) {
        textLevelFont[prop] = style.font[prop];
      }
    }

    if (Object.keys(textLevelFont).length === 0) return null;

    return { font: textLevelFont };
  }

  /**
   * Computes the difference between a base style and a target style.
   * Returns only the properties that differ (for creating minimal overrides).
   *
   * @param {Object|null} baseStyle - The base/cell-level style
   * @param {Object|null} targetStyle - The target/desired style
   * @returns {Object|null} The minimal override style, or null if no difference
   */
  computeStyleDiff(baseStyle, targetStyle) {
    if (!targetStyle || !targetStyle.font) return null;

    const baseFont = baseStyle?.font || {};
    const targetFont = targetStyle.font;
    const diffFont = {};

    const textLevelProps = ['bold', 'italic', 'underline', 'strikethrough', 'color', 'size', 'family'];

    for (const prop of textLevelProps) {
      if (targetFont[prop] !== undefined && targetFont[prop] !== baseFont[prop]) {
        diffFont[prop] = targetFont[prop];
      }
    }

    if (Object.keys(diffFont).length === 0) return null;

    return { font: diffFont };
  }
}