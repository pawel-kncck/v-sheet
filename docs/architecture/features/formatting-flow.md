# Feature Walkthrough: Cell Formatting (Bold/Color/Fonts)

**Primary Actor**: User
**Goal**: Apply formatting (bold, italic, colors, fonts) to selected cells

---

## 1. The Trigger (UI Layer)

* **Event**: Click on Toolbar Button (e.g., Bold button) or Keyboard Shortcut (Cmd+B)
* **Handler**: `Toolbar.js` -> `handleBoldClick()` or `InputController.js` -> `handleKeyDown()`
* **Action**: Calls coordinator `spreadsheet.applyRangeFormat({ font: { bold: true } }, 'toggle')`

### Toolbar Event Flow
```
User clicks Bold button
  -> Toolbar.handleBoldClick(event)
  -> Toolbar checks current selection via SelectionManager
  -> Toolbar calls spreadsheet.applyRangeFormat(styleChanges, 'toggle')
```

### Keyboard Shortcut Flow
```
User presses Cmd+B
  -> InputController.handleKeyDown(event)
  -> Creates FORMAT intent with {style: 'bold', mode: 'toggle'}
  -> ModeManager.handleIntent(FORMAT, context)
  -> ReadyMode.handleIntent() -> calls spreadsheet.applyRangeFormat()
```

---

## 2. Logic & Coordinator (Application Layer)

* **Coordinator**: `Spreadsheet.js`
* **Method**: `applyRangeFormat(styleChanges, mode)`
* **Decision**: Calculates *what* needs to change by:
  1. Getting selected cells from SelectionManager
  2. For 'toggle' mode: checking if ALL selected cells have the style (if yes, remove; if any missing, apply)
  3. For 'set' mode: always applies the style
* **Command Creation**: Instantiates `FormatRangeCommand`

### Key Logic in Spreadsheet
```javascript
applyRangeFormat(styleChanges, mode = 'set') {
  const cells = this.selectionManager.getSelectedCells();

  // Toggle logic for bold/italic
  if (mode === 'toggle') {
    const allHaveStyle = cells.every(cell =>
      this.fileManager.getCellStyle(cell)?.font?.bold === true
    );
    styleChanges = { font: { bold: !allHaveStyle } };
  }

  const command = new FormatRangeCommand(
    cells,
    styleChanges,
    this.fileManager,
    this.styleManager,
    this.gridRenderer
  );

  this.historyManager.execute(command);
}
```

---

## 3. The Command (History Layer)

* **Command**: `FormatRangeCommand.js`
* **Location**: `js/history/commands/FormatRangeCommand.js`

### Execution Flow

```
FormatRangeCommand.execute()
  |
  ├─> 1. Capture old state (for Undo)
  |      - Store each cell's current styleId
  |      - Store each cell's current style object
  |
  ├─> 2. For each cell in range:
  |      ├─> Get existing style from FileManager (via styleId lookup)
  |      ├─> Deep merge new changes with existing style
  |      |      e.g., { font: { bold: true } } + { fill: { color: '#FFF' } }
  |      |      = { font: { bold: true }, fill: { color: '#FFF' } }
  |      ├─> StyleManager.addStyle(mergedStyle) -> returns styleId
  |      ├─> FileManager.updateCellFormat(cellId, styleId)
  |      └─> GridRenderer.updateCellStyle(cellId, styleObject)
  |
  └─> 3. Push to HistoryManager
```

### Undo Flow

```
FormatRangeCommand.undo()
  |
  └─> For each cell:
       ├─> Restore old styleId in FileManager
       └─> GridRenderer.updateCellStyle() with old style
```

### The "Magic": Flyweight Pattern via StyleManager

```javascript
// In FormatRangeCommand.execute()
for (const cellId of this.cells) {
  const existingStyle = this.styleManager.getStyle(
    this.fileManager.getCellStyleId(cellId)
  ) || {};

  // Deep merge preserves existing styles
  const mergedStyle = deepMerge(existingStyle, this.styleChanges);

  // StyleManager deduplicates: 1000 cells with same bold style = 1 entry
  const newStyleId = this.styleManager.addStyle(mergedStyle);

  // Cell stores only a reference ID, not the full object
  this.fileManager.updateCellFormat(cellId, newStyleId);
}
```

---

## 4. Visual Rendering (View Layer)

* **Renderer**: `GridRenderer.js`
* **Method**: `updateCellStyle(cellId, styleObject)`

### Rendering Flow

```
GridRenderer.updateCellStyle(cellId, style)
  |
  ├─> Find DOM element for cell
  |
  ├─> Apply CSS properties:
  |      font.bold -> fontWeight: 'bold' or 'normal'
  |      font.italic -> fontStyle: 'italic' or 'normal'
  |      font.color -> color: '#RRGGBB'
  |      font.size -> fontSize: 'Xpt'
  |      font.family -> fontFamily: 'Font Name'
  |      fill.color -> backgroundColor: '#RRGGBB'
  |      align.h -> textAlign: 'left' | 'center' | 'right'
  |      align.v -> verticalAlign: 'top' | 'middle' | 'bottom'
  |
  └─> Force repaint if needed
```

### Style Object Structure

```javascript
{
  font: {
    bold: boolean,
    italic: boolean,
    underline: boolean,
    strikethrough: boolean,
    color: '#RRGGBB',
    size: number,
    family: string
  },
  fill: {
    color: '#RRGGBB'
  },
  align: {
    h: 'left' | 'center' | 'right',
    v: 'top' | 'middle' | 'bottom'
  },
  wrap: boolean
}
```

---

## 5. Persistence (Data Layer)

* **State Manager**: `FileManager.js`
* **Style Deduplication**: `StyleManager.js`

### In-Memory State

```
FileManager.state = {
  cells: {
    'A1': { value: 'Hello', styleId: 'style_001' },
    'B2': { value: '100', styleId: 'style_002' },
    ...
  }
}

StyleManager.palette = {
  'style_001': { font: { bold: true } },
  'style_002': { font: { bold: true }, fill: { color: '#FFFF00' } },
  ...
}
```

### Autosave Flow

```
FileManager.markDirty()
  -> Debounce timer (500ms)
  -> FileManager.save()
  -> fetch('PUT /api/files/:id', {
       body: JSON.stringify({
         cells: { ... },
         styles: { ... },    // <-- Style palette persisted alongside cells
         columnWidths: { ... },
         rowHeights: { ... }
       })
     })
  -> Flask API saves to data/files/{id}.json
```

### File Format

```json
{
  "id": "file-uuid",
  "name": "My Spreadsheet",
  "cells": {
    "A1": { "value": "Hello", "styleId": "style_001" },
    "B2": { "value": "100", "formula": "=A1*2", "styleId": "style_002" }
  },
  "styles": {
    "style_001": { "font": { "bold": true } },
    "style_002": { "font": { "bold": true }, "fill": { "color": "#FFFF00" } }
  },
  "columnWidths": { "A": 100, "B": 150 },
  "rowHeights": { "1": 25, "2": 30 }
}
```

---

## Key Files

| Layer | File | Responsibility |
|-------|------|----------------|
| UI | `js/ui/Toolbar.js` | Toolbar buttons, color pickers |
| UI | `js/ui/InputController.js` | Keyboard shortcuts (Cmd+B, Cmd+I) |
| Coordinator | `js/spreadsheet.js` | `applyRangeFormat()` orchestration |
| History | `js/history/commands/FormatRangeCommand.js` | Undo-able formatting command |
| Style | `js/StyleManager.js` | Flyweight palette, deduplication |
| View | `js/ui/GridRenderer.js` | `updateCellStyle()` DOM updates |
| Data | `js/file-manager.js` | Cell data + styleId storage |
| API | `server/app.py` | REST persistence |

---

## Important: Worker NOT Involved

**Styles are presentation-only** - they don't affect formula calculations. Therefore:
- FormulaWorker is NOT notified of style changes
- No recalculation happens when formatting is applied
- This keeps formatting operations fast and synchronous

---

## See Also

- Architecture: `/docs/architecture/00-system-overview.md` (Section: Formatting Flow)
- User workflows: `/docs/manuals/user-workflows.md` (Apply Bold Formatting, Apply Background Color)
- Test scenarios: `/docs/manuals/test-scenarios/formatting.scenarios.md`
