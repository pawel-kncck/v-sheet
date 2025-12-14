# Feature Spec: Text-Level Formatting with Style Inheritance

## Overview

This specification defines how text-level formatting (character styles) works within cells, including the inheritance relationship between cell-level and text-level styles, and how different modes (Ready, Edit, Enter) interact with formatting.

## Problem Statement

Currently, v-sheet only supports cell-level formatting. All characters within a cell share the same style. This limitation prevents users from:
- Having "Hello" in italics and "World" in bold within the same cell
- Applying different font colors, sizes, or families to portions of text
- Creating rich text content within individual cells

## Goals

1. Support character-level formatting within cells
2. Maintain clear inheritance from cell-level to text-level styles
3. Provide intuitive formatting behavior across all modes
4. Preserve backward compatibility with existing cell-level formatting

---

## Core Concepts

### Style Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│  CELL-LEVEL STYLE (Base)                                │
│  ─────────────────────────────                          │
│  • Applies to entire cell by default                    │
│  • Set via Ready mode formatting                        │
│  • Acts as inheritance source for text-level styles     │
│  • Properties: font, fill, align, wrap, border          │
└─────────────────────────────────────────────────────────┘
                           │
                           │ inherits from
                           ▼
┌─────────────────────────────────────────────────────────┐
│  TEXT-LEVEL STYLE (Overrides)                           │
│  ─────────────────────────────                          │
│  • Applied to specific character ranges                 │
│  • Only stores DIFFERENCES from cell-level style        │
│  • Properties: bold, italic, underline, strikethrough,  │
│                color, size, family                      │
│  • Does NOT include: fill, align, wrap, border          │
└─────────────────────────────────────────────────────────┘
```

### Text-Level Formattable Properties

Only these properties can be applied at the text level (character range):

| Property | Description | Example |
|----------|-------------|---------|
| `bold` | Font weight | true/false |
| `italic` | Font style | true/false |
| `underline` | Text decoration | true/false |
| `strikethrough` | Text decoration | true/false |
| `color` | Font color | "#FF0000" |
| `size` | Font size | "14px" |
| `family` | Font family | "Arial" |

### Cell-Level Only Properties

These remain cell-level only and cannot vary within text:

| Property | Reason |
|----------|--------|
| `fill.color` | Background applies to entire cell |
| `align.h` / `align.v` | Alignment is a cell property |
| `wrap` | Text wrapping is a cell property |
| `border` | Borders are cell properties |

---

## Data Model

### Current Cell Structure (Cell-Level Only)

```javascript
{
  "A1": {
    value: "Hello World",
    styleId: "abc123"  // Reference to cell-level style in palette
  }
}
```

### Proposed Cell Structure (With Text-Level)

```javascript
{
  "A1": {
    value: "Hello World",        // Plain text value (for formulas, search, etc.)
    styleId: "abc123",           // Cell-level style (inheritance source)
    richText: [                  // Optional: text-level formatting runs
      { start: 0, end: 5, styleId: "def456" },   // "Hello" - italic
      { start: 6, end: 11, styleId: "ghi789" }   // "World" - bold
    ]
  }
}
```

### Rich Text Run Structure

```javascript
{
  start: number,   // Start index (inclusive)
  end: number,     // End index (exclusive)
  styleId: string  // Reference to text-level style in palette
}
```

**Important Notes:**
- `richText` is optional. If absent, entire cell uses `styleId`
- Runs must be contiguous and cover all characters
- Runs with no overrides can omit `styleId` (inherit cell style)
- Text-level styles only store OVERRIDES, not full style objects

### Style Palette Extension

```javascript
{
  // Cell-level styles (existing)
  "abc123": {
    font: { bold: false, italic: false, color: "#000000", size: "12px" },
    fill: { color: "#FFFFFF" },
    align: { h: "left" }
  },

  // Text-level styles (new - only store overrides)
  "def456": { font: { italic: true } },           // Just italic override
  "ghi789": { font: { bold: true, color: "#FF0000" } }  // Bold + red
}
```

---

## Mode Behaviors

### Ready Mode

**Context:** User has selected cell(s) but is not editing text.

**Formatting Behavior:**
- All formatting applies to the **entire cell** (cell-level style)
- If cell has richText runs, they are **cleared** (cell becomes plain text)
- New text entered later inherits the cell-level style

**User Actions:**
| Action | Result |
|--------|--------|
| Ctrl+B | Toggle bold for entire cell |
| Ctrl+I | Toggle italic for entire cell |
| Toolbar button | Apply to entire cell |
| Clear cell | Clears value AND richText runs |

**Rationale:** Ready mode is for cell-level operations. Clearing richText when applying cell-level style prevents confusing inheritance scenarios.

---

### Edit Mode

**Context:** User pressed F2 or double-clicked to edit existing text.

**Formatting Behavior:**

1. **With Text Selection:**
   - Formatting applies to selected character range only
   - Creates/updates richText runs for that range
   - Selected text gets text-level style override

2. **Without Text Selection (Cursor Only):**
   - Sets the **active style** for new text typed at cursor position
   - Does NOT affect existing text
   - Active style persists until cursor moves or selection changes

3. **New Text Typed:**
   - Inherits from **active style** if set
   - Otherwise inherits from **cell-level style**

**User Actions:**
| Action | With Selection | Without Selection |
|--------|----------------|-------------------|
| Ctrl+B | Toggle bold on selected text | Set active style to bold |
| Ctrl+I | Toggle italic on selected text | Set active style to italic |
| Toolbar | Apply to selected text | Set active style |

**Active Style Concept:**
```
Cell style: { bold: false, italic: false, color: "#000" }

User presses Ctrl+B (no selection)
  → Active style: { bold: true }

User types "Hello"
  → "Hello" rendered with bold: true (merged with cell style)

User presses Ctrl+I (no selection)
  → Active style: { bold: true, italic: true }

User types " World"
  → " World" rendered with bold: true, italic: true

User clicks elsewhere
  → Active style cleared
```

---

### Enter Mode

**Context:** User typed a character in Ready mode to start quick entry.

**Formatting Behavior:**
- Text selection is **not available** in Enter mode
- All formatting sets the **active style** for new text
- Starting point for new text is the **cell-level style**
- User can toggle formatting while typing to change active style

**User Actions:**
| Action | Result |
|--------|--------|
| Ctrl+B | Toggle bold in active style |
| Ctrl+I | Toggle italic in active style |
| Toolbar | Modify active style |

**Example Flow:**
```
Cell has style: { italic: true }

User types "H" (Enter mode starts)
  → Active style inherits from cell: { italic: true }
  → "H" is italic

User presses Ctrl+B
  → Active style: { italic: true, bold: true }

User types "ello"
  → "ello" is italic + bold

User presses Ctrl+B again
  → Active style: { italic: true, bold: false }

User types " World"
  → " World" is italic only

Result: "Hello World" with runs:
  - "H": italic
  - "ello": italic + bold
  - " World": italic
```

---

### Point Mode

**Context:** User is building a formula with mouse/keyboard reference selection.

**Formatting Behavior:**
- Same as Enter mode (no text selection available)
- Formula references should NOT be formatted (they're structural)
- Active style only affects literal text portions

**Note:** Formatting in formulas is atypical; spec may limit this.

---

## Style Inheritance Resolution

When rendering text, compute effective style by merging:

```javascript
function resolveStyle(cellStyle, textRunStyle) {
  return {
    font: {
      bold: textRunStyle?.font?.bold ?? cellStyle.font?.bold ?? false,
      italic: textRunStyle?.font?.italic ?? cellStyle.font?.italic ?? false,
      underline: textRunStyle?.font?.underline ?? cellStyle.font?.underline ?? false,
      strikethrough: textRunStyle?.font?.strikethrough ?? cellStyle.font?.strikethrough ?? false,
      color: textRunStyle?.font?.color ?? cellStyle.font?.color ?? "#000000",
      size: textRunStyle?.font?.size ?? cellStyle.font?.size ?? "12px",
      family: textRunStyle?.font?.family ?? cellStyle.font?.family ?? "system-ui"
    }
    // fill, align, wrap, border come from cellStyle only
  };
}
```

---

## UI Components

### Editor Changes

**Current:** Single `<input type="text">` element

**Proposed:** `contenteditable` div with inline styling

```html
<div id="cell-editor" contenteditable="true">
  <span style="font-style: italic;">Hello</span>
  <span style="font-weight: bold;"> World</span>
</div>
```

**Required Capabilities:**
- Get/set text content (plain text for formulas)
- Get/set cursor position
- Get/set selection range
- Apply inline styles to selection
- Track active style for insertion point
- Sync styles from cell on edit start

### Toolbar State

Toolbar buttons should reflect:
1. **Ready mode:** Cell-level style of active cell
2. **Edit/Enter mode with selection:** Effective style of selected text
3. **Edit/Enter mode without selection:** Active style (pending for new text)

**Visual Indicator:**
- Solid button: Style is applied
- Empty button: Style is not applied
- Half/mixed state: Selection has mixed styles

---

## Commands and History

### New Command: FormatTextCommand

```javascript
class FormatTextCommand extends Command {
  constructor(cellId, startIndex, endIndex, styleChanges, oldRichText) {
    this.cellId = cellId;
    this.startIndex = startIndex;
    this.endIndex = endIndex;
    this.styleChanges = styleChanges;
    this.oldRichText = oldRichText; // For undo
  }

  execute() {
    // Update richText runs for affected range
    // Merge adjacent runs with identical styles
    // Update StyleManager palette
    // Trigger re-render
  }

  undo() {
    // Restore oldRichText
    // Clean up orphaned styles from palette
  }
}
```

### Updated: UpdateCellsCommand

Must preserve richText runs when updating cell value, unless:
- Value is completely replaced (new richText or clear)
- Cell is cleared

---

## Rendering

### GridRenderer Changes

**Current:** Apply CSS to cell container div

**Proposed:** Render text as spans within cell div

```javascript
renderCellContent(cell, cellElement) {
  if (!cell.richText || cell.richText.length === 0) {
    // No rich text - render as before (text node)
    cellElement.textContent = cell.displayValue;
    this.applyCellStyle(cellElement, cell.styleId);
  } else {
    // Rich text - render as spans
    cellElement.innerHTML = '';
    const cellStyle = styleManager.getStyle(cell.styleId);

    for (const run of cell.richText) {
      const span = document.createElement('span');
      span.textContent = cell.value.substring(run.start, run.end);

      const runStyle = styleManager.getStyle(run.styleId);
      const effectiveStyle = resolveStyle(cellStyle, runStyle);
      this.applyInlineStyle(span, effectiveStyle);

      cellElement.appendChild(span);
    }
  }
}
```

---

## Edge Cases

### 1. Cell-Level Format Over Rich Text

**Scenario:** Cell has richText, user applies cell-level format in Ready mode.

**Behavior:** Clear richText runs, apply format to cell style.

**Rationale:** Cell-level formatting is intentional "reset to uniform style" action.

### 2. Partial Delete

**Scenario:** User deletes portion of text that has formatting runs.

**Behavior:** Adjust run indices, merge adjacent identical runs, remove empty runs.

### 3. Paste Over Selection

**Scenario:** User pastes plain text over formatted selection.

**Behavior:**
- Pasted text inherits active style (or cell style if none)
- Surrounding runs remain intact
- Re-normalize runs after paste

### 4. Copy Rich Text

**Scenario:** User copies portion of formatted text.

**Behavior:**
- Copy both plain text (for external apps) and rich format (internal)
- Clipboard contains both text/plain and application/vsheet-richtext MIME types

### 5. Formula Cells

**Scenario:** Cell contains formula.

**Behavior:**
- Formula source (=SUM(A1:A10)) is NOT formatted
- Display value CAN have cell-level formatting
- richText does NOT apply to formula cells (only to literal text)

### 6. Empty Cell Formatting

**Scenario:** User formats empty cell, then types.

**Behavior:**
- Cell-level style is set
- New text inherits from cell-level style
- No richText runs created (all text is uniform)

---

## Migration

### Existing Files

No migration needed:
- Cells without `richText` property work as before
- StyleManager palette unchanged for cell-level styles
- New text-level styles added to same palette

### API Compatibility

Backend API unchanged:
- `PUT /api/files/<id>` accepts cells with optional `richText`
- `GET /api/files/<id>` returns cells as stored

---

## Implementation Phases

### Phase 1: Data Model & Rendering
- [ ] Extend cell data structure with `richText` property
- [ ] Update StyleManager for text-level style storage
- [ ] Implement `resolveStyle()` merge function
- [ ] Update GridRenderer to render spans for rich text cells

### Phase 2: Editor Refactor
- [ ] Replace `<input>` with `contenteditable` div
- [ ] Implement selection tracking
- [ ] Implement active style management
- [ ] Sync editor content with cell richText on edit start/end

### Phase 3: Mode Integration
- [ ] Update EditMode for text-level formatting with selection
- [ ] Update EnterMode for active style formatting
- [ ] Update ReadyMode for cell-level formatting (clear richText)
- [ ] Update PointMode (if applicable)

### Phase 4: Commands & History
- [ ] Create FormatTextCommand for undo/redo
- [ ] Update UpdateCellsCommand for richText preservation
- [ ] Test undo/redo across all scenarios

### Phase 5: Clipboard & Polish
- [ ] Implement rich text copy/paste
- [ ] Update toolbar state indicators
- [ ] Handle edge cases (delete, merge runs, etc.)

---

## Open Questions

1. **Formula cells:** Should formula results support text-level formatting? (Proposed: No)

2. **Performance:** Large cells with many runs - need run coalescing/limits?

3. **External paste:** When pasting from Word/web, preserve formatting or strip?

4. **Keyboard navigation in editor:** How does cursor movement interact with run boundaries?

5. **Multi-cell selection formatting:** In Edit mode with multi-cell selection, what happens?

---

## Appendix: Visual Examples

### Example 1: Mixed Formatting

```
Cell A1: "Total: $1,234.56"

richText: [
  { start: 0, end: 7, styleId: null },           // "Total: " - inherits cell
  { start: 7, end: 16, styleId: "bold-green" }   // "$1,234.56" - bold, green
]
```

### Example 2: Active Style in Enter Mode

```
User types with active style toggling:

Keystrokes: H [Ctrl+B] ello [Ctrl+B] World

Result: "Hello World"
richText: [
  { start: 0, end: 1, styleId: null },       // "H" - normal
  { start: 1, end: 5, styleId: "bold" },     // "ello" - bold
  { start: 5, end: 11, styleId: null }       // " World" - normal
]
```

### Example 3: Cell-Level Override

```
Before: "Hello World" with italic "Hello" and bold "World"
User selects cell in Ready mode, presses Ctrl+U (underline)

After: "Hello World" - entire cell underlined, no richText
```
