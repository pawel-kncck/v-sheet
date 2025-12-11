# File Format Schema

**Last Updated**: 2025-12-11

This document describes the JSON file format used to persist v-sheet spreadsheets.

---

## Overview

Spreadsheets are stored as JSON files in `data/files/{uuid}.json`. The format includes:

- Cell values and formulas
- Style palette (Flyweight pattern)
- Column/row dimensions
- File metadata

---

## Complete Schema

```json
{
  "id": "string (UUID)",
  "name": "string",
  "created": "string (ISO 8601 timestamp)",
  "modified": "string (ISO 8601 timestamp)",
  "data": {
    "cells": {
      "A1": {
        "value": "any",
        "formula": "string (optional)",
        "styleId": "string (optional)"
      }
    },
    "styles": {
      "styleId": {
        "font": { ... },
        "fill": { ... },
        "align": { ... },
        "border": { ... },
        "wrap": "boolean"
      }
    },
    "columnWidths": {
      "A": "number",
      "B": "number"
    },
    "rowHeights": {
      "1": "number",
      "2": "number"
    },
    "metadata": {
      "lastActiveCell": "string (cell ID)",
      "selections": [...]
    }
  }
}
```

---

## Top-Level Properties

### `id`

**Type**: String (UUID)
**Required**: Yes

Unique identifier for the file. Generated when file is created.

```json
"id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

### `name`

**Type**: String
**Required**: Yes

Display name of the spreadsheet.

```json
"name": "My Spreadsheet"
```

### `created`

**Type**: String (ISO 8601)
**Required**: Yes

Timestamp when file was created.

```json
"created": "2025-12-11T10:30:00.000Z"
```

### `modified`

**Type**: String (ISO 8601)
**Required**: Yes

Timestamp of last modification (updated on autosave).

```json
"modified": "2025-12-11T15:45:30.000Z"
```

---

## Data Object

### `data.cells`

**Type**: Object
**Required**: Yes (can be empty `{}`)

Map of cell ID to cell data.

```json
"cells": {
  "A1": {
    "value": "Hello",
    "styleId": "style_001"
  },
  "B1": {
    "value": 42,
    "formula": "=A1*2"
  },
  "C1": {
    "value": "=SUM(A1:B1)",
    "formula": "=SUM(A1:B1)"
  }
}
```

#### Cell Properties

| Property | Type | Description |
|----------|------|-------------|
| `value` | any | Display value (result for formulas) |
| `formula` | string | Raw formula if cell is formula (optional) |
| `styleId` | string | Reference to style in palette (optional) |

**Notes**:
- If cell has no formula, `formula` is omitted
- If cell has no style, `styleId` is omitted
- Empty cells are omitted entirely

---

### `data.styles`

**Type**: Object
**Required**: Yes (can be empty `{}`)

Style palette - Flyweight pattern storage.

```json
"styles": {
  "lxyz123abc": {
    "font": {
      "bold": true
    }
  },
  "mdef456ghi": {
    "font": {
      "bold": true,
      "italic": true,
      "color": "#FF0000"
    },
    "fill": {
      "color": "#FFFF00"
    }
  }
}
```

#### Style Object Structure

```json
{
  "font": {
    "bold": true,
    "italic": true,
    "underline": true,
    "strikethrough": true,
    "color": "#RRGGBB",
    "size": 11,
    "family": "Arial"
  },
  "fill": {
    "color": "#RRGGBB"
  },
  "align": {
    "h": "left | center | right",
    "v": "top | middle | bottom"
  },
  "border": {
    "top": { "style": "solid | dashed | dotted", "color": "#RRGGBB" },
    "bottom": { "style": "...", "color": "..." },
    "left": { "style": "...", "color": "..." },
    "right": { "style": "...", "color": "..." }
  },
  "wrap": true
}
```

**Notes**:
- Style objects are sparse - only non-default properties are stored
- Multiple cells can reference the same styleId (deduplication)

---

### `data.columnWidths`

**Type**: Object
**Required**: No (defaults applied if missing)

Custom column widths in pixels.

```json
"columnWidths": {
  "A": 100,
  "B": 150,
  "C": 80
}
```

**Default**: 100 pixels per column

---

### `data.rowHeights`

**Type**: Object
**Required**: No (defaults applied if missing)

Custom row heights in pixels.

```json
"rowHeights": {
  "1": 25,
  "2": 40,
  "10": 60
}
```

**Default**: 25 pixels per row

---

### `data.metadata`

**Type**: Object
**Required**: No

Session state for user experience continuity.

```json
"metadata": {
  "lastActiveCell": "B5",
  "selections": [
    {
      "start": { "row": 4, "col": 1 },
      "end": { "row": 4, "col": 1 }
    }
  ]
}
```

---

## Example Complete File

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Sales Report Q4",
  "created": "2025-12-01T09:00:00.000Z",
  "modified": "2025-12-11T15:45:30.000Z",
  "data": {
    "cells": {
      "A1": { "value": "Product", "styleId": "header_style" },
      "B1": { "value": "Sales", "styleId": "header_style" },
      "C1": { "value": "Growth", "styleId": "header_style" },
      "A2": { "value": "Widget A" },
      "B2": { "value": 1500 },
      "C2": { "value": 0.15, "formula": "=(B2-1300)/1300", "styleId": "percent_style" },
      "A3": { "value": "Widget B" },
      "B3": { "value": 2300 },
      "C3": { "value": 0.10, "formula": "=(B3-2090)/2090", "styleId": "percent_style" },
      "A4": { "value": "Total", "styleId": "header_style" },
      "B4": { "value": 3800, "formula": "=SUM(B2:B3)", "styleId": "total_style" }
    },
    "styles": {
      "header_style": {
        "font": { "bold": true },
        "fill": { "color": "#E0E0E0" }
      },
      "percent_style": {
        "font": { "color": "#008000" }
      },
      "total_style": {
        "font": { "bold": true },
        "border": {
          "top": { "style": "solid", "color": "#000000" }
        }
      }
    },
    "columnWidths": {
      "A": 120,
      "B": 100,
      "C": 80
    },
    "rowHeights": {},
    "metadata": {
      "lastActiveCell": "B4"
    }
  }
}
```

---

## File Storage

### Location

Files are stored in: `data/files/{id}.json`

### Metadata Index

A separate metadata file tracks all files: `data/metadata.json`

```json
{
  "files": [
    {
      "id": "a1b2c3d4-...",
      "name": "Sales Report Q4",
      "modified": "2025-12-11T15:45:30.000Z"
    }
  ]
}
```

---

## REST API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/files` | List all files |
| POST | `/api/files` | Create new file |
| GET | `/api/files/{id}` | Load file |
| PUT | `/api/files/{id}` | Update file (autosave) |
| DELETE | `/api/files/{id}` | Delete file |
| GET | `/api/recent` | Get most recently modified file |

---

## Autosave Behavior

- Changes trigger autosave after 500ms debounce
- Only modified data is sent to server
- Server updates `modified` timestamp
- Failed saves are retried

---

## Migration Notes

### Version Compatibility

The file format is forward-compatible:
- New properties are ignored by older versions
- Missing optional properties use defaults

### Adding New Properties

When adding new cell or style properties:
1. Make them optional with sensible defaults
2. Update both save and load logic
3. No migration needed for existing files

---

## See Also

- REST API: `/docs/manuals/api-reference/rest-api.md`
- Styling system: `/docs/architecture/06-styling-system.md`
- File persistence: `/docs/architecture/05-file-persistence.md`
