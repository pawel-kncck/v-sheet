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

### Point Mode (Formula Mode)

**Context:** User is building a formula with mouse/keyboard reference selection.

**Formatting Behavior:**
- **Formatting is NOT allowed in Point mode**
- Ctrl+B, Ctrl+I, and toolbar formatting buttons are **disabled/ignored**
- Formula content is structural, not styled text

**Rationale:** Formulas are code, not prose. Applying formatting to formula syntax would be confusing and has no meaningful effect on the computed result.

### Formula Cells (Display)

**Context:** Cell contains a formula (e.g., `=SUM(A1:A10)`).

**Formatting Behavior:**
- The **formula source** cannot have text-level formatting
- The **display value** (computed result) inherits **cell-level style only**
- `richText` property is **ignored** for formula cells
- User can apply cell-level formatting to change how the result appears

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

### Formula Bar (Existing Component)

The formula bar is an existing UI component that displays plain text only:

```
┌─────────────────────────────────────────────────────────────────┐
│ [A1 ▼]  fx │ Hello World                                        │
│            │ ^^^^^ (selected text - formatting target)          │
└─────────────────────────────────────────────────────────────────┘
```

**Key Behaviors:**
- Displays content of the **anchor cell** (active cell in selection)
- **Shows plain text only** - no rich text rendering (consistent with current implementation)
- Supports text selection for **targeting** text-level formatting
- Text selection in formula bar + Ctrl+B → formats corresponding range in anchor cell
- Works in both Edit and Enter modes
- Visual feedback of formatting appears **in the cell**, not in formula bar

**Multi-Cell Selection Context:**
- When multiple cells are selected, formula bar shows **anchor cell only**
- Text-level formatting applies to **anchor cell only**
- Cell-level formatting (Ready mode) applies to **all selected cells**
- Double-clicking any cell **cancels multi-cell selection** and enters Edit mode for that cell

### Cell Display (Rich Text Rendering)

Cells display rich text with inline formatting:

```html
<!-- Cell A1 in grid -->
<div class="cell" data-cell-id="A1">
  <span style="font-style: italic;">Hello</span>
  <span style="font-weight: bold;"> World</span>
</div>
```

**Key Principle:** Formula bar = plain text editing interface. Cell = rich text display.

### In-Cell Editor

**Current:** Single `<input type="text">` element

**Proposed:** Keep as plain text input (like formula bar)

The in-cell editor mirrors the formula bar behavior:
- Shows plain text while editing
- Rich text formatting is applied when edit is committed
- Selection in editor targets formatting range

**Alternative:** Use `contenteditable` div with inline styling for WYSIWYG editing in-cell. This would show formatting while typing but adds complexity.

**Recommendation:** Start with plain text editor (simpler), consider WYSIWYG as future enhancement.

**Required Capabilities:**
- Get/set text content
- Get/set cursor position
- Get/set selection range
- Track selection for formatting target
- Track active style for insertion point
- Sync content with formula bar

### Toolbar State

Toolbar buttons should reflect:
1. **Ready mode:** Cell-level style of active cell
2. **Edit/Enter mode with text selection:** Effective style of selected text
3. **Edit/Enter mode without selection:** Active style (pending for new text)
4. **Point mode:** Buttons disabled (no formatting allowed)

**Visual Indicator:**
- Solid/pressed button: Style is applied
- Empty/unpressed button: Style is not applied
- Half/mixed state: Selection has mixed styles (optional enhancement)

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

**Scenario:** User pastes text over formatted selection.

**Behavior (Internal Paste - from v-sheet):**
- Pasted text preserves its original formatting runs
- Surrounding runs in target cell remain intact
- Re-normalize runs after paste (merge adjacent identical runs)

**Behavior (External Paste - from Word, web, etc.):**
- **Strip all formatting** - paste as plain text only
- Pasted text inherits active style (or cell style if none)
- Surrounding runs remain intact
- Re-normalize runs after paste

**Future Enhancement:** Add formatting translation layer to preserve styles from external sources (requires mapping external formats to v-sheet style properties).

### 4. Copy Rich Text

**Scenario:** User copies portion of formatted text.

**Behavior:**
- Copy both plain text (for external apps) and rich format (internal)
- Clipboard contains both `text/plain` and `application/vsheet-richtext` MIME types
- Internal paste uses rich format; external paste uses plain text

### 5. Formula Cells

**Scenario:** Cell contains formula.

**Behavior:**
- Formula source (`=SUM(A1:A10)`) **cannot be formatted**
- Formatting controls are **disabled in Point mode**
- Display value (computed result) uses **cell-level style only**
- `richText` property is **ignored** for formula cells
- User can apply cell-level formatting in Ready mode to style the result

### 6. Empty Cell Formatting

**Scenario:** User formats empty cell, then types.

**Behavior:**
- Cell-level style is set
- New text inherits from cell-level style
- No richText runs created (all text is uniform)

### 7. Multi-Cell Selection with Text-Level Formatting

**Scenario:** User has A1:C3 selected (9 cells), wants to format part of text in A1.

**Behavior:**
- User must use **formula bar** to select text (shows anchor cell A1 content)
- Text selection in formula bar + Ctrl+B → formats only selected text in A1
- Other cells (A2, A3, B1, etc.) are **not affected**
- To format all cells: use Ready mode cell-level formatting instead

**Alternative Flow:**
- User double-clicks A1 → **cancels multi-cell selection**
- Selection becomes just A1, user is in Edit mode
- Now can select text in-cell or in formula bar
- Formatting applies to A1 only

### 8. Entering Edit Mode Preserves Selection

**Scenario:** User has A1:C3 selected, presses F2 to enter Edit mode.

**Behavior:**
- Multi-cell selection is **preserved**
- Formula bar shows anchor cell content
- User can edit/format text in anchor cell
- Tab/Enter commits edit and may advance anchor within selection

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

## Resolved Design Decisions

1. **Formula cells:** Formula content cannot be formatted. Display values inherit cell-level style only. Formatting controls are disabled in Point mode.

2. **External paste:** Strip all formatting from external sources. Paste as plain text inheriting active/cell style. Future enhancement may add format translation.

3. **Multi-cell selection formatting:**
   - Cell-level formatting (Ready mode) applies to all selected cells
   - Text-level formatting requires text selection in formula bar, applies to anchor cell only
   - Double-clicking a cell cancels multi-cell selection and enters Edit mode for that cell

---

## Open Questions

1. **Performance:** Large cells with many runs - need run coalescing/limits?

2. **Keyboard navigation in editor:** How does cursor movement interact with run boundaries?

3. **Run normalization:** When should adjacent identical runs be merged? On every edit, or lazily on save?

4. **WYSIWYG in-cell editing:** Should the in-cell editor show formatting while typing, or remain plain text like the formula bar?

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
