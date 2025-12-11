# Style Object Schema

**Last Updated**: 2025-12-11

This document describes the complete structure of style objects used in v-sheet.

---

## Overview

Style objects define the visual appearance of cells. They are:
- **Sparse**: Only include non-default properties
- **Nested**: Organized by category (font, fill, align, border)
- **Immutable**: Stored in StyleManager palette, never mutated directly

---

## Complete Schema

```javascript
{
  font: {
    bold: boolean,        // Default: false
    italic: boolean,      // Default: false
    underline: boolean,   // Default: false
    strikethrough: boolean, // Default: false
    color: string,        // Default: '#000000' (black)
    size: number,         // Default: 11 (points)
    family: string        // Default: 'Arial'
  },
  fill: {
    color: string         // Default: null (transparent)
  },
  align: {
    h: string,            // 'left' | 'center' | 'right', Default: 'left'
    v: string             // 'top' | 'middle' | 'bottom', Default: 'bottom'
  },
  border: {
    top: {
      style: string,      // 'solid' | 'dashed' | 'dotted' | 'none'
      color: string       // Default: '#000000'
    },
    bottom: { style, color },
    left: { style, color },
    right: { style, color }
  },
  wrap: boolean           // Default: false (text wrapping)
}
```

---

## Property Details

### Font Properties

#### `font.bold`

**Type**: `boolean`
**Default**: `false`

Makes text bold.

```javascript
{ font: { bold: true } }
```

CSS equivalent: `font-weight: bold`

---

#### `font.italic`

**Type**: `boolean`
**Default**: `false`

Makes text italic.

```javascript
{ font: { italic: true } }
```

CSS equivalent: `font-style: italic`

---

#### `font.underline`

**Type**: `boolean`
**Default**: `false`

Adds underline to text.

```javascript
{ font: { underline: true } }
```

CSS equivalent: `text-decoration: underline`

---

#### `font.strikethrough`

**Type**: `boolean`
**Default**: `false`

Adds strikethrough to text.

```javascript
{ font: { strikethrough: true } }
```

CSS equivalent: `text-decoration: line-through`

---

#### `font.color`

**Type**: `string` (hex color)
**Default**: `'#000000'`

Text color.

```javascript
{ font: { color: '#FF0000' } }  // Red text
{ font: { color: '#0066CC' } }  // Blue text
```

CSS equivalent: `color: #FF0000`

---

#### `font.size`

**Type**: `number` (points)
**Default**: `11`

Font size in points.

```javascript
{ font: { size: 14 } }    // 14pt
{ font: { size: 8 } }     // 8pt (small)
{ font: { size: 24 } }    // 24pt (large)
```

CSS equivalent: `font-size: 14pt`

---

#### `font.family`

**Type**: `string`
**Default**: `'Arial'`

Font family name.

```javascript
{ font: { family: 'Times New Roman' } }
{ font: { family: 'Courier New' } }
{ font: { family: 'Georgia' } }
```

CSS equivalent: `font-family: 'Times New Roman', serif`

---

### Fill Properties

#### `fill.color`

**Type**: `string` (hex color) or `null`
**Default**: `null` (transparent)

Background color.

```javascript
{ fill: { color: '#FFFF00' } }  // Yellow background
{ fill: { color: '#E0E0E0' } }  // Gray background
{ fill: { color: null } }       // Transparent (remove background)
```

CSS equivalent: `background-color: #FFFF00`

---

### Alignment Properties

#### `align.h`

**Type**: `'left' | 'center' | 'right'`
**Default**: `'left'`

Horizontal text alignment.

```javascript
{ align: { h: 'center' } }
{ align: { h: 'right' } }
```

CSS equivalent: `text-align: center`

---

#### `align.v`

**Type**: `'top' | 'middle' | 'bottom'`
**Default**: `'bottom'`

Vertical text alignment.

```javascript
{ align: { v: 'middle' } }
{ align: { v: 'top' } }
```

CSS equivalent: `vertical-align: middle`

---

### Border Properties

#### `border.top`, `border.bottom`, `border.left`, `border.right`

**Type**: `{ style: string, color: string }` or `null`
**Default**: `null` (no border)

Individual border edges.

```javascript
{
  border: {
    top: { style: 'solid', color: '#000000' },
    bottom: { style: 'solid', color: '#000000' },
    left: null,
    right: null
  }
}
```

#### Border Styles

| Style | Description |
|-------|-------------|
| `'solid'` | Solid line |
| `'dashed'` | Dashed line |
| `'dotted'` | Dotted line |
| `'none'` | No border (same as null) |

CSS equivalent: `border-top: 1px solid #000000`

---

### Wrap Property

#### `wrap`

**Type**: `boolean`
**Default**: `false`

Enable text wrapping within cell.

```javascript
{ wrap: true }
```

CSS equivalent: `white-space: normal` (vs `nowrap`)

---

## Example Style Objects

### Minimal (single property)

```javascript
{ font: { bold: true } }
```

### Header Style

```javascript
{
  font: {
    bold: true,
    size: 12
  },
  fill: {
    color: '#E0E0E0'
  },
  align: {
    h: 'center'
  }
}
```

### Currency Cell

```javascript
{
  font: {
    color: '#008000'  // Green
  },
  align: {
    h: 'right'
  }
}
```

### Warning Cell

```javascript
{
  font: {
    bold: true,
    color: '#FFFFFF'  // White text
  },
  fill: {
    color: '#FF0000'  // Red background
  }
}
```

### Bordered Cell

```javascript
{
  border: {
    top: { style: 'solid', color: '#000000' },
    bottom: { style: 'solid', color: '#000000' },
    left: { style: 'solid', color: '#000000' },
    right: { style: 'solid', color: '#000000' }
  }
}
```

### Complete Style (all properties)

```javascript
{
  font: {
    bold: true,
    italic: false,
    underline: false,
    strikethrough: false,
    color: '#333333',
    size: 11,
    family: 'Arial'
  },
  fill: {
    color: '#F5F5F5'
  },
  align: {
    h: 'left',
    v: 'middle'
  },
  border: {
    top: { style: 'solid', color: '#CCCCCC' },
    bottom: { style: 'solid', color: '#CCCCCC' },
    left: null,
    right: null
  },
  wrap: false
}
```

---

## Deep Merge Behavior

When applying partial style changes:

```javascript
// Existing style
{ font: { bold: true, size: 14 } }

// New changes
{ font: { italic: true } }

// Result (deep merge)
{ font: { bold: true, size: 14, italic: true } }
```

```javascript
// Existing style
{ font: { bold: true }, fill: { color: '#FFFF00' } }

// New changes
{ font: { bold: false } }

// Result
{ font: { bold: false }, fill: { color: '#FFFF00' } }
```

---

## Removing Properties

To remove a style property, set it to its default or `null`:

```javascript
// Remove bold
{ font: { bold: false } }

// Remove background color
{ fill: { color: null } }

// Remove border
{ border: { top: null } }
```

---

## CSS Mapping

| Style Property | CSS Property |
|----------------|--------------|
| `font.bold` | `font-weight: bold` |
| `font.italic` | `font-style: italic` |
| `font.underline` | `text-decoration: underline` |
| `font.strikethrough` | `text-decoration: line-through` |
| `font.color` | `color` |
| `font.size` | `font-size` (pt) |
| `font.family` | `font-family` |
| `fill.color` | `background-color` |
| `align.h` | `text-align` |
| `align.v` | `vertical-align` |
| `border.*` | `border-*` |
| `wrap` | `white-space: normal/nowrap` |

---

## Validation

Style objects should be validated before storing:

```javascript
function validateStyle(style) {
  if (style.font?.color && !isValidHexColor(style.font.color)) {
    throw new Error('Invalid font color');
  }
  if (style.align?.h && !['left', 'center', 'right'].includes(style.align.h)) {
    throw new Error('Invalid horizontal alignment');
  }
  // ... additional validation
}

function isValidHexColor(color) {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}
```

---

## See Also

- Styling system: `/docs/architecture/06-styling-system.md`
- File format: `/docs/manuals/api-reference/file-format-schema.md`
- Formatting flow: `/docs/architecture/features/formatting-flow.md`
