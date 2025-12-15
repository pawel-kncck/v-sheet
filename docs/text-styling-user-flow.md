# Text-Level Styling: Step-by-Step User Flow

This document walks through the complete user flow for text-level (rich text) styling in v-sheet, including toggle behavior and overlapping styles.

## Table of Contents

1. [Overview](#overview)
2. [Data Structures](#data-structures)
3. [User Flow 1: Formatting Selected Text (Toggle ON)](#user-flow-1-formatting-selected-text-toggle-on)
4. [User Flow 2: Toggle Formatting OFF](#user-flow-2-toggle-formatting-off)
5. [User Flow 3: Overlapping Styles (Bold + Italic)](#user-flow-3-overlapping-styles-bold--italic)
6. [User Flow 4: Active Style (No Selection)](#user-flow-4-active-style-no-selection)
7. [User Flow 5: Enter Mode Quick Entry](#user-flow-5-enter-mode-quick-entry)
8. [Style Resolution and Inheritance](#style-resolution-and-inheritance)
9. [Key Functions Reference](#key-functions-reference)

---

## Overview

Text-level styling allows different portions of text within a cell to have different formatting (bold, italic, color, etc.). The implementation follows this architecture:

```
User Action (Ctrl+B)
       ↓
InputController (maps to INTENTS.FORMAT_BOLD)
       ↓
ModeManager → Current Mode (EditMode/EnterMode)
       ↓
EditorManager (DOM manipulation)
       ↓
StyleManager (style de-duplication)
       ↓
FileManager (persistence)
       ↓
GridRenderer (display)
```

---

## Data Structures

### Rich Text Run

```javascript
{
  start: number,      // Start index (inclusive) in cell value
  end: number,        // End index (exclusive) in cell value
  styleId: string,    // Reference to style in palette, or null for inheritance
  style?: Object      // (During edit only) Inline style before conversion to ID
}
```

### Style Object

```javascript
// Full style (cell-level)
{
  font: {
    bold: boolean,
    italic: boolean,
    underline: boolean,
    strikethrough: boolean,
    color: string,         // "#RRGGBB"
    size: number | string, // pixels
    family: string         // "Arial", "system-ui"
  },
  fill: { color: string },
  align: { h: 'left'|'center'|'right', v: 'top'|'middle'|'bottom' },
  wrap: boolean
}

// Text-level style (stores ONLY overrides from cell style)
{
  font: {
    bold?: boolean,   // Only properties that differ
    italic?: boolean
  }
}
```

### Cell Data

```javascript
{
  "A1": {
    value: "Hello World",        // Plain text
    styleId: "cell_style_id",    // Cell-level style
    richText: [                  // Optional: text-level formatting
      { start: 0, end: 5, styleId: "bold_id" },
      { start: 5, end: 11, styleId: null }  // Inherits cell style
    ]
  }
}
```

---

## User Flow 1: Formatting Selected Text (Toggle ON)

**Scenario:** User selects "Hello" in cell A1 containing "Hello World" and presses Ctrl+B to make it bold.

### Step 1: User Enters Edit Mode

```
User double-clicks cell A1 or presses F2
       ↓
ReadyMode.handleIntent(INTENTS.EDIT_START)
       ↓
ModeManager.switchTo('edit', { cellId: 'A1' })
       ↓
EditMode.onEnter({ cellId: 'A1' })
       ↓
EditorManager.startEdit('A1', 'Hello World', null, false, {
  richText: null,     // No existing rich text
  cellStyle: {...},   // Cell-level style
  styleManager: ref   // StyleManager reference
})
```

**EditorManager.startEdit()** at `js/ui/EditorManager.js:166`:
- Positions contenteditable div over cell
- Sets innerHTML to cell value (or renders existing rich text as spans)
- Initializes `_activeStyle` from cell style
- Shows editor and formula bar

### Step 2: User Selects Text

```
User drags mouse to select "Hello" (characters 0-5)
       ↓
Browser updates window.getSelection()
       ↓
Selection range: { startOffset: 0, endOffset: 5 }
```

### Step 3: User Presses Ctrl+B

```
Keyboard event: Ctrl+B
       ↓
InputController.handleKeyDown(event)
       ↓
InputController._createIntent(event)
  - Detects: ctrlOrCmd + 'b'
  - Returns: INTENTS.FORMAT_BOLD
       ↓
ModeManager.handleIntent(INTENTS.FORMAT_BOLD, { bold: true })
       ↓
EditMode.handleIntent(INTENTS.FORMAT_BOLD, { bold: true })
```

### Step 4: EditMode Routes to EditorManager

**EditMode._handleTextFormat()** at `js/modes/EditMode.js:203`:

```javascript
_handleTextFormat(styleChanges) {
  // styleChanges = { bold: true }

  // Check if there's a text selection
  if (this._editorManager.hasSelection()) {
    // YES - Apply formatting to selected text
    this._editorManager.applyFormatToSelection(styleChanges);
  } else {
    // NO - Toggle active style for new text (covered in Flow 4)
  }

  this._updateToolbarState();
  return true;
}
```

**Data passed:** `styleChanges = { bold: true }`

### Step 5: EditorManager Checks for Toggle

**EditorManager.applyFormatToSelection()** at `js/ui/EditorManager.js:838`:

```javascript
applyFormatToSelection(styleChanges) {
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);

  if (range.collapsed) {
    // No selection - update active style instead
    this.setActiveStyle(styleChanges);
    return;
  }

  // Check if we should toggle OFF (selection already has this formatting)
  const shouldToggleOff = this._selectionHasFormatting(range, styleChanges);

  if (shouldToggleOff) {
    this._removeFormatFromSelection(range, styleChanges);
  } else {
    // This path: Apply formatting
    this._applyFormatToRange(range, styleChanges);
  }

  this._handleInput();  // Sync rich text runs from DOM
}
```

**Data passed:**
- `range`: DOM Range object { startOffset: 0, endOffset: 5 }
- `styleChanges`: `{ bold: true }`

### Step 6: Toggle Detection Logic

**EditorManager._selectionHasFormatting()** at `js/ui/EditorManager.js:867`:

```javascript
_selectionHasFormatting(range, styleChanges) {
  // Clone range to avoid modifying selection
  const fragment = range.cloneContents();

  // Walk all elements in the fragment
  const walker = document.createTreeWalker(fragment,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);

  let hasFormatting = false;

  // For plain text (no spans), check parent element
  if (firstChild.nodeType === Node.TEXT_NODE && !fragment.querySelector('span')) {
    const element = range.commonAncestorContainer.parentElement;
    if (element && element !== this.cellEditor) {
      for (const prop in styleChanges) {
        if (prop === 'bold') {
          const fontWeight = window.getComputedStyle(element).fontWeight;
          if (fontWeight === 'bold' || fontWeight === '700') {
            hasFormatting = true;
          }
        }
        if (prop === 'italic') {
          const fontStyle = window.getComputedStyle(element).fontStyle;
          if (fontStyle === 'italic') {
            hasFormatting = true;
          }
        }
      }
    }
    return hasFormatting;
  }

  // For spans, check inline styles
  while (node = walker.nextNode()) {
    if (node.tagName === 'SPAN') {
      if (styleChanges.bold && node.style.fontWeight === 'bold') {
        hasFormatting = true;
      }
      if (styleChanges.italic && node.style.fontStyle === 'italic') {
        hasFormatting = true;
      }
    }
  }

  return hasFormatting;  // false for new formatting
}
```

**Returns:** `false` (no bold formatting found) → proceed to apply

### Step 7: Apply Formatting to Range

**EditorManager._applyFormatToRange()** at `js/ui/EditorManager.js:1022`:

```javascript
_applyFormatToRange(range, styleChanges) {
  // Check if selection is inside an existing span
  const parentSpan = this._getParentSpan(range.commonAncestorContainer);

  if (parentSpan && parentSpan !== this.cellEditor) {
    // Selection is inside a span - split it (covered in Flow 3)
    this._splitSpanAndApplyFormat(range, parentSpan, styleChanges);
  } else {
    // Selection is at top level - wrap with new span
    this._wrapRangeWithStyle(range, styleChanges);
  }

  this.cellEditor.normalize();  // Merge adjacent text nodes
}
```

### Step 8: Wrap Text with Styled Span

**EditorManager._wrapRangeWithStyle()** at `js/ui/EditorManager.js:1150`:

```javascript
_wrapRangeWithStyle(range, styleChanges) {
  const selection = window.getSelection();

  // Extract selected content from DOM
  const fragment = range.extractContents();

  // Create new span
  const span = document.createElement('span');

  // Apply inline CSS styles
  this._applyStyleToElement(span, styleChanges);
  // Result: span.style.fontWeight = 'bold'

  // Move selected content into span
  span.appendChild(fragment);

  // Insert styled span back into DOM
  range.insertNode(span);

  // Flatten any nested spans
  this._flattenNestedSpans(this.cellEditor);

  // Restore selection
  const newRange = document.createRange();
  newRange.selectNodeContents(span);
  selection.removeAllRanges();
  selection.addRange(newRange);
}
```

**DOM before:**
```html
<div id="cell-editor" contenteditable="true">
  Hello World
</div>
```

**DOM after:**
```html
<div id="cell-editor" contenteditable="true">
  <span style="font-weight: bold;">Hello</span> World
</div>
```

### Step 9: Sync Rich Text Runs from DOM

**EditorManager._syncRichTextFromDOM()** at `js/ui/EditorManager.js:432`:

```javascript
_syncRichTextFromDOM() {
  const runs = [];
  let currentIndex = 0;

  // Walk all child nodes of editor
  for (const node of this.cellEditor.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      // Plain text - no style override
      runs.push({
        start: currentIndex,
        end: currentIndex + node.textContent.length,
        style: null
      });
    } else if (node.tagName === 'SPAN') {
      // Styled text - extract inline styles
      const style = this._extractStyleFromElement(node);
      runs.push({
        start: currentIndex,
        end: currentIndex + node.textContent.length,
        style: style  // { font: { bold: true } }
      });
    }
    currentIndex += node.textContent.length;
  }

  // Normalize: merge adjacent runs with identical styles
  this._richTextRuns = this._normalizeRuns(runs);
}
```

**Data produced:**
```javascript
_richTextRuns = [
  { start: 0, end: 5, style: { font: { bold: true } } },  // "Hello"
  { start: 5, end: 11, style: null }                       // " World"
]
```

### Step 10: User Commits Edit (Enter)

```
User presses Enter
       ↓
InputController.handleKeyDown(event)
       ↓
INTENTS.COMMIT created
       ↓
EditMode.handleIntent(INTENTS.COMMIT, { moveDirection: 'down' })
       ↓
EditMode._handleCommit({ moveDirection: 'down' })
```

**EditMode._handleCommit()** at `js/modes/EditMode.js:282`:

```javascript
_handleCommit(context) {
  // Get the edited value and rich text runs
  const newValue = this._editorManager.getValue();  // "Hello World"
  const richTextRuns = this._editorManager.hasRichTextFormatting()
    ? this._editorManager.getRichTextRuns()
    : null;

  // Execute cell update through context
  this._executeCellUpdate(this._editingCellId, newValue, richTextRuns);

  // End edit and switch to ReadyMode
  this._editorManager.endEdit();
  this._requestModeSwitch('ready', { moveDirection: context.moveDirection });

  return true;
}
```

**Data passed:**
```javascript
newValue = "Hello World"
richTextRuns = [
  { start: 0, end: 5, style: { font: { bold: true } } },
  { start: 5, end: 11, style: null }
]
```

### Step 11: Execute Cell Update Command

**Spreadsheet._executeCellUpdate()** creates UpdateCellsCommand:

```javascript
_executeCellUpdate(cellId, newValue, richTextRuns) {
  const command = new UpdateCellsCommand(
    this.fileManager,
    { [cellId]: { value: newValue, richText: richTextRuns } },
    { [cellId]: { value: oldValue, richText: oldRichText } }
  );

  this.historyManager.execute(command);
}
```

### Step 12: Style De-duplication

**During UpdateCellsCommand.execute()**, rich text runs are processed:

```javascript
_processRichTextRuns(runs) {
  return runs.map(run => {
    const processedRun = { start: run.start, end: run.end };

    if (run.style) {
      // Convert inline style to palette ID (de-duplicated)
      const styleId = this.styleManager.addStyle(run.style);
      processedRun.styleId = styleId;
    }
    // Runs with no style inherit cell-level style

    return processedRun;
  });
}
```

**StyleManager.addStyle()** at `js/StyleManager.js:27`:

```javascript
addStyle(styleObject) {
  if (!styleObject || Object.keys(styleObject).length === 0) {
    return null;
  }

  // Generate deterministic hash of style object
  const hash = this._generateHash(styleObject);

  // Check if this exact style already exists in palette
  if (this.reverseLookup.has(hash)) {
    return this.reverseLookup.get(hash);  // Reuse existing ID
  }

  // Create new unique ID and store
  const newId = this._generateId();  // e.g., "abc123"
  this.styles[newId] = styleObject;
  this.reverseLookup.set(hash, newId);

  return newId;
}
```

**Final data stored:**
```javascript
// Cell data
cells["A1"] = {
  value: "Hello World",
  styleId: "cell_style_id",
  richText: [
    { start: 0, end: 5, styleId: "abc123" },  // Bold
    { start: 5, end: 11, styleId: null }       // Inherits cell style
  ]
}

// Style palette
styles["abc123"] = { font: { bold: true } }
```

### Step 13: Render Rich Text in Cell

**GridRenderer.updateCellContent()** at `js/ui/GridRenderer.js:72`:

```javascript
updateCellContent(cellId, value, richText, cellStyle, styleManager) {
  const cellElement = this._getCellElement(cellId);

  if (!richText || richText.length === 0) {
    // No rich text - render as plain text
    cellElement.textContent = value;
  } else {
    // Rich text - render as spans
    this._renderRichTextContent(cellElement, value, richText, cellStyle, styleManager);
  }
}
```

**GridRenderer._renderRichTextContent()** at `js/ui/GridRenderer.js:110`:

```javascript
_renderRichTextContent(cell, value, richText, cellStyle, styleManager) {
  cell.innerHTML = '';  // Clear existing content

  for (const run of richText) {
    const span = document.createElement('span');
    span.textContent = value.substring(run.start, run.end);

    // Get run style from palette
    const runStyle = run.styleId ? styleManager.getStyle(run.styleId) : null;

    // Resolve effective style (text-level + cell-level + defaults)
    const effectiveStyle = styleManager.resolveStyle(cellStyle, runStyle);

    // Apply CSS to span
    this._applyInlineStyle(span, effectiveStyle);

    cell.appendChild(span);
  }
}
```

**Final DOM:**
```html
<div class="cell" data-cell-id="A1">
  <span style="font-weight: bold;">Hello</span>
  <span> World</span>
</div>
```

---

## User Flow 2: Toggle Formatting OFF

**Scenario:** User selects bold "Hello" text and presses Ctrl+B again to remove bold.

### Steps 1-5: Same as Flow 1

User enters Edit mode, selects text, presses Ctrl+B.

### Step 6: Toggle Detection Returns TRUE

**EditorManager._selectionHasFormatting():**

```javascript
// Walk spans in selection
while (node = walker.nextNode()) {
  if (node.tagName === 'SPAN') {
    if (styleChanges.bold && node.style.fontWeight === 'bold') {
      hasFormatting = true;  // FOUND bold styling
      break;
    }
  }
}

return true;  // Selection HAS bold → toggle OFF
```

### Step 7: Remove Formatting

**EditorManager._removeFormatFromSelection()** at `js/ui/EditorManager.js:944`:

```javascript
_removeFormatFromSelection(range, styleChanges) {
  const selection = window.getSelection();

  // Extract the contents (removes from DOM)
  const fragment = range.extractContents();
  // fragment = <span style="font-weight: bold;">Hello</span>

  // Remove the specific styling from the fragment
  this._removeStyleFromFragment(fragment, styleChanges);

  // Re-insert the cleaned fragment
  range.insertNode(fragment);

  // Normalize to merge adjacent text nodes
  this.cellEditor.normalize();
}
```

**EditorManager._removeStyleFromFragment()** at `js/ui/EditorManager.js:972`:

```javascript
_removeStyleFromFragment(fragment, styleChanges) {
  const spans = Array.from(fragment.querySelectorAll('span'));

  spans.forEach(span => {
    // Remove requested style properties
    for (const prop in styleChanges) {
      if (prop === 'bold') {
        span.style.fontWeight = '';  // Clear bold
      }
      if (prop === 'italic') {
        span.style.fontStyle = '';
      }
      // ... other properties
    }

    // If span has no more inline styles, unwrap it
    if (!span.style.cssText || span.style.cssText.trim() === '') {
      // Replace span with its children (plain text)
      const parent = span.parentNode;
      while (span.firstChild) {
        parent.insertBefore(span.firstChild, span);
      }
      parent.removeChild(span);
    }
  });
}
```

**DOM transformation:**
```html
<!-- Before -->
<span style="font-weight: bold;">Hello</span>

<!-- After removing bold style -->
<span style="">Hello</span>

<!-- After unwrapping empty span -->
Hello
```

### Step 8: Sync and Commit

After `_syncRichTextFromDOM()`:

```javascript
_richTextRuns = [
  { start: 0, end: 11, style: null }  // "Hello World" - no formatting
]
```

On commit, `richText` becomes `null` (no formatting needed).

---

## User Flow 3: Overlapping Styles (Bold + Italic)

**Scenario:** User has italic "Hello", then selects it and adds bold → result is bold + italic.

### Starting State

```html
<div id="cell-editor">
  <span style="font-style: italic;">Hello</span> World
</div>
```

### Step 1: User Selects Italic "Hello" and Presses Ctrl+B

Toggle check: `_selectionHasFormatting({ bold: true })` → `false` (no bold found, italic doesn't count)

### Step 2: Apply Format Detects Parent Span

**EditorManager._applyFormatToRange():**

```javascript
_applyFormatToRange(range, styleChanges) {
  // Check if selection is inside an existing span
  const parentSpan = this._getParentSpan(range.commonAncestorContainer);
  // parentSpan = <span style="font-style: italic;">Hello</span>

  if (parentSpan && parentSpan !== this.cellEditor) {
    // Selection IS inside a span - need to split and merge styles
    this._splitSpanAndApplyFormat(range, parentSpan, styleChanges);
  } else {
    this._wrapRangeWithStyle(range, styleChanges);
  }
}
```

### Step 3: Split Span and Merge Styles

**EditorManager._splitSpanAndApplyFormat()** at `js/ui/EditorManager.js:1066`:

```javascript
_splitSpanAndApplyFormat(range, parentSpan, styleChanges) {
  const fullText = parentSpan.textContent;  // "Hello"

  // Calculate offsets relative to parent span
  const startOffset = 0;   // Selection starts at beginning
  const endOffset = 5;     // Selection ends at "Hello"

  // Get original style from parent span
  const originalStyle = this._extractStyleFromElement(parentSpan);
  // originalStyle = { font: { italic: true } }

  // Create document fragment for new content
  const fragment = document.createDocumentFragment();

  // BEFORE portion (empty in this case)
  // No span needed

  // SELECTED portion - merge original + new styles
  const mergedStyle = this._mergeStyles(originalStyle, styleChanges);
  // mergedStyle = { font: { italic: true, bold: true } }

  const selectedSpan = document.createElement('span');
  selectedSpan.textContent = fullText.substring(startOffset, endOffset);  // "Hello"
  this._applyStyleToElement(selectedSpan, mergedStyle);
  // Result: selectedSpan.style = "font-style: italic; font-weight: bold;"
  fragment.appendChild(selectedSpan);

  // AFTER portion (empty in this case)
  // No span needed

  // Replace original span with new fragment
  parentSpan.parentNode.replaceChild(fragment, parentSpan);
}
```

**Style Merge Logic:**

```javascript
_mergeStyles(originalStyle, newStyleChanges) {
  const origFont = originalStyle.font || originalStyle;
  // origFont = { italic: true }

  return {
    ...origFont,           // Spread existing: { italic: true }
    ...newStyleChanges     // Override with new: { bold: true }
  };
  // Result: { italic: true, bold: true }
}
```

### Step 4: Final DOM State

```html
<div id="cell-editor">
  <span style="font-style: italic; font-weight: bold;">Hello</span> World
</div>
```

### Step 5: Sync Rich Text Runs

```javascript
_richTextRuns = [
  { start: 0, end: 5, style: { font: { italic: true, bold: true } } },
  { start: 5, end: 11, style: null }
]
```

### Step 6: Style De-duplication on Commit

**StyleManager.addStyle({ font: { italic: true, bold: true } }):**

```javascript
addStyle(styleObject) {
  // Generate hash: sorts keys → "{"font":{"bold":true,"italic":true}}"
  const hash = this._generateHash(styleObject);

  // Check if this exact combination already exists
  if (this.reverseLookup.has(hash)) {
    return this.reverseLookup.get(hash);  // Reuse existing ID
  }

  // New combination - create ID
  const newId = "bold_italic_123";
  this.styles[newId] = { font: { bold: true, italic: true } };
  this.reverseLookup.set(hash, newId);

  return newId;
}
```

**Final stored data:**
```javascript
cells["A1"] = {
  value: "Hello World",
  richText: [
    { start: 0, end: 5, styleId: "bold_italic_123" },
    { start: 5, end: 11, styleId: null }
  ]
}

styles["bold_italic_123"] = { font: { bold: true, italic: true } }
```

---

## User Flow 4: Active Style (No Selection)

**Scenario:** User in Edit mode, cursor positioned (no text selected), presses Ctrl+B, then types "Bold Text".

### Step 1: No Selection Detected

**EditMode._handleTextFormat():**

```javascript
_handleTextFormat(styleChanges) {
  if (this._editorManager.hasSelection()) {
    // Has selection - apply to selection
    this._editorManager.applyFormatToSelection(styleChanges);
  } else {
    // NO selection - toggle active style
    const property = Object.keys(styleChanges)[0];  // 'bold'
    this._editorManager.toggleActiveStyleProperty(property);
  }
}
```

### Step 2: Toggle Active Style Property

**EditorManager.toggleActiveStyleProperty()** at `js/ui/EditorManager.js:791`:

```javascript
toggleActiveStyleProperty(property) {
  if (!this._activeStyle) {
    this._activeStyle = {};
  }

  // Simple boolean flip
  this._activeStyle[property] = !this._activeStyle[property];
  // Before: _activeStyle = {}
  // After:  _activeStyle = { bold: true }

  return this._activeStyle[property];  // true
}
```

### Step 3: User Types Character

```
User types 'B'
       ↓
EditMode._handleInput({ char: 'B', isFormulaTrigger: false })
```

**EditMode._handleInput()** at `js/modes/EditMode.js:237`:

```javascript
_handleInput(context) {
  const { char } = context;

  // Check if active style has any ON properties
  const activeStyle = this._editorManager?.getActiveStyle();
  const hasActiveStyleOn = activeStyle && (
    activeStyle.bold || activeStyle.italic || ...
  );
  // hasActiveStyleOn = true (bold is ON)

  if (hasActiveStyleOn && this._editorManager) {
    // Manually insert text with active style
    this._editorManager._insertTextAtCursor(char);
    return true;  // Prevent browser default
  }

  return false;  // Let browser handle
}
```

### Step 4: Insert Text with Active Style

**EditorManager._insertTextAtCursor()** at `js/ui/EditorManager.js:391`:

```javascript
_insertTextAtCursor(char) {
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);

  // Delete any selected content first
  if (!range.collapsed) {
    range.deleteContents();
  }

  // Check if active style has properties
  const activeStyle = this.getActiveStyle();
  const hasActiveStyleOn = activeStyle && (
    activeStyle.bold || activeStyle.italic || ...
  );

  if (hasActiveStyleOn) {
    // Create styled span for new text
    const span = document.createElement('span');
    span.textContent = char;  // 'B'

    // Apply active style to span
    this._applyStyleToElement(span, activeStyle);
    // span.style.fontWeight = 'bold'

    // Insert span at cursor
    range.insertNode(span);

    // Move cursor after inserted span
    range.setStartAfter(span);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  } else {
    // Insert plain text
    const textNode = document.createTextNode(char);
    range.insertNode(textNode);
  }

  // Sync rich text runs from DOM
  this._syncRichTextFromDOM();
}
```

### Step 5: Continue Typing

Each subsequent character ('o', 'l', 'd', ' ', 'T', 'e', 'x', 't') follows the same path, inserting into the existing styled span or creating new spans as needed.

**Final DOM:**
```html
<div id="cell-editor">
  <span style="font-weight: bold;">Bold Text</span>
</div>
```

### Step 6: User Presses Ctrl+B Again (Toggle OFF)

```javascript
toggleActiveStyleProperty('bold')
// Before: _activeStyle = { bold: true }
// After:  _activeStyle = { bold: false }
```

### Step 7: User Types More Text

With `_activeStyle.bold = false`, new text is inserted as plain text (or inherits cell style).

---

## User Flow 5: Enter Mode Quick Entry

**Scenario:** User in ReadyMode types 'A', then toggles bold, types 'BC', toggles bold off, types 'DE'.

### Step 1: Enter Mode Starts

```
User types 'A' in ReadyMode
       ↓
ReadyMode._handleInput({ char: 'A', isFormulaTrigger: false })
       ↓
ModeManager.switchTo('enter', { cellId: 'A1', triggerKey: 'A' })
       ↓
EnterMode.onEnter({ cellId: 'A1', triggerKey: 'A' })
       ↓
EditorManager.startEdit('A1', 'A', 'A', false, { cellStyle, styleManager })
```

**DOM after:**
```html
<div id="cell-editor">A</div>
```

### Step 2: User Presses Ctrl+B

**EnterMode._handleTextFormat()** at `js/modes/EnterMode.js:236`:

```javascript
_handleTextFormat(property) {
  // EnterMode has no text selection - always toggle active style
  this._editorManager.toggleActiveStyleProperty(property);
  // _activeStyle = { bold: true }
  return true;
}
```

### Step 3: User Types 'BC'

Each character is inserted with active style via `_insertTextAtCursor()`.

**DOM after:**
```html
<div id="cell-editor">A<span style="font-weight: bold;">BC</span></div>
```

### Step 4: User Presses Ctrl+B Again

```javascript
toggleActiveStyleProperty('bold')
// _activeStyle = { bold: false }
```

### Step 5: User Types 'DE'

Characters inserted as plain text (no active styling).

**DOM after:**
```html
<div id="cell-editor">A<span style="font-weight: bold;">BC</span>DE</div>
```

### Step 6: User Presses Enter (Arrow Keys Also Commit in EnterMode)

**EnterMode._commitEntry():**

```javascript
_commitEntry() {
  const newValue = this._editorManager.getValue();  // "ABCDE"
  const richTextRuns = this._editorManager.hasRichTextFormatting()
    ? this._editorManager.getRichTextRuns()
    : null;

  this._executeCellUpdate(this._editingCellId, newValue, richTextRuns);
}
```

**Rich text runs:**
```javascript
[
  { start: 0, end: 1, style: null },           // "A" - plain
  { start: 1, end: 3, style: { font: { bold: true } } },  // "BC" - bold
  { start: 3, end: 5, style: null }            // "DE" - plain
]
```

---

## Style Resolution and Inheritance

When rendering text, the effective style is computed by merging three levels:

### Priority Order (Highest to Lowest)

1. **Text-level style** (if defined for this run)
2. **Cell-level style** (if defined for this cell)
3. **Default values** (from StyleManager.DEFAULT_FONT)

### Resolution Function

**StyleManager.resolveStyle()** at `js/StyleManager.js:112`:

```javascript
resolveStyle(cellStyle, textRunStyle) {
  const defaults = StyleManager.DEFAULT_FONT;
  // defaults = { bold: false, italic: false, color: '#000000', size: 12, family: 'system-ui' }

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
  };
}
```

### Example Resolution

```javascript
// Cell style
cellStyle = { font: { bold: true, color: '#0000FF' } }

// Text run style (only stores overrides)
textRunStyle = { font: { italic: true } }

// Resolved effective style
effectiveStyle = {
  font: {
    bold: true,      // From cell (not overridden by run)
    italic: true,    // From text run (override)
    underline: false, // From defaults
    strikethrough: false, // From defaults
    color: '#0000FF', // From cell
    size: 12,        // From defaults
    family: 'system-ui' // From defaults
  }
}
```

---

## Key Functions Reference

| Function | Location | Purpose |
|----------|----------|---------|
| `EditMode._handleTextFormat()` | EditMode.js:203 | Routes formatting to selection or active style |
| `EditorManager.applyFormatToSelection()` | EditorManager.js:838 | Entry point for text selection formatting |
| `EditorManager._selectionHasFormatting()` | EditorManager.js:867 | Detects if toggle should be ON or OFF |
| `EditorManager._removeFormatFromSelection()` | EditorManager.js:944 | Removes formatting (toggle OFF) |
| `EditorManager._applyFormatToRange()` | EditorManager.js:1022 | Applies formatting (toggle ON) |
| `EditorManager._splitSpanAndApplyFormat()` | EditorManager.js:1066 | Handles overlapping styles |
| `EditorManager._mergeStyles()` | EditorManager.js:1129 | Merges parent + new styles |
| `EditorManager._wrapRangeWithStyle()` | EditorManager.js:1150 | Wraps plain text with styled span |
| `EditorManager.toggleActiveStyleProperty()` | EditorManager.js:791 | Toggles style for future text |
| `EditorManager._insertTextAtCursor()` | EditorManager.js:391 | Inserts text with active style |
| `EditorManager._syncRichTextFromDOM()` | EditorManager.js:432 | Converts DOM to rich text runs |
| `EditorManager.getRichTextRuns()` | EditorManager.js:1286 | Returns processed runs for commit |
| `StyleManager.addStyle()` | StyleManager.js:27 | De-duplicates and stores styles |
| `StyleManager.resolveStyle()` | StyleManager.js:112 | Merges cell + text + default styles |
| `StyleManager._generateHash()` | StyleManager.js:69 | Creates deterministic hash for de-dup |
| `GridRenderer._renderRichTextContent()` | GridRenderer.js:110 | Renders rich text as DOM spans |

---

## Summary: Toggle Logic

```
User presses Ctrl+B/I
       ↓
Has text selection?
  ├── YES → Check if selection already has formatting
  │            ├── YES (has bold) → REMOVE formatting (toggle OFF)
  │            └── NO (no bold)  → APPLY formatting (toggle ON)
  │
  └── NO (cursor only) → Toggle active style property
                          └── Next typed text uses toggled style
```

## Summary: Overlapping Styles

```
Apply new style to span with existing style
       ↓
Extract original style from span
       ↓
Merge: { ...originalStyle.font, ...newStyleChanges }
       ↓
Apply merged style to span
       ↓
Result: Span has both styles (e.g., bold + italic)
```

## Summary: Data Flow

```
DOM (contenteditable)
    ↓ _syncRichTextFromDOM()
Rich Text Runs (inline styles)
    ↓ commit
StyleManager.addStyle() (de-duplication)
    ↓
Rich Text Runs (styleIds)
    ↓
FileManager (persistence)
    ↓
GridRenderer._renderRichTextContent()
    ↓
Cell DOM (spans with inline styles)
```
