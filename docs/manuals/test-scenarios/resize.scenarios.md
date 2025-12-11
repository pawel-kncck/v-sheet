# Resize Test Scenarios

**Last Updated**: 2025-12-12

Test scenarios for column and row resize functionality.

---

## Column Resize

### RES-COL-001: Basic Column Resize
**Given**: User hovers near right edge of column header
**When**: User drags to the right
**Then**: Column width increases in real-time
**And**: Guide line shows new position during drag

### RES-COL-002: Column Resize - Minimum Width
**Given**: User is resizing column A
**When**: User drags to make column narrower than 5px
**Then**: Column width stops at minimum (5px)
**And**: Content may be clipped

### RES-COL-003: Column Resize - Multiple Columns Selected
**Given**: User has selected columns A, B, C via Shift+Click on headers
**When**: User drags the resize edge of any selected column
**Then**: All selected columns resize together
**And**: All columns get the same new width

### RES-COL-004: Column Resize - Undo
**Given**: User has resized column B from 100px to 150px
**When**: User presses Ctrl+Z
**Then**: Column B returns to 100px width

### RES-COL-005: Column Resize - No Accidental Selection
**Given**: User has just finished resizing column A
**When**: Mouseup occurs
**Then**: Column A header is NOT selected
**And**: Previous selection is maintained

---

## Row Resize

### RES-ROW-001: Basic Row Resize
**Given**: User hovers near bottom edge of row header
**When**: User drags downward
**Then**: Row height increases in real-time
**And**: Guide line shows new position during drag

### RES-ROW-002: Row Resize - Minimum Height
**Given**: User is resizing row 5
**When**: User drags to make row shorter than 5px
**Then**: Row height stops at minimum (5px)

### RES-ROW-003: Row Resize - Multiple Rows Selected
**Given**: User has selected rows 1, 2, 3 via Shift+Click on headers
**When**: User drags the resize edge of any selected row
**Then**: All selected rows resize together

### RES-ROW-004: Row Resize - Undo
**Given**: User has resized row 3 from 25px to 40px
**When**: User presses Ctrl+Z
**Then**: Row 3 returns to 25px height

---

## Cursor Feedback

### RES-CUR-001: Column Resize Cursor
**Given**: User moves mouse near right edge of column header
**When**: Mouse is within 5px of the edge
**Then**: Cursor changes to `col-resize`

### RES-CUR-002: Row Resize Cursor
**Given**: User moves mouse near bottom edge of row header
**When**: Mouse is within 5px of the edge
**Then**: Cursor changes to `row-resize`

### RES-CUR-003: Normal Cursor in Header Center
**Given**: User moves mouse to center of column header
**When**: Mouse is more than 5px from edges
**Then**: Cursor remains `default`

---

## Persistence

### RES-PER-001: Column Widths Persist on Save
**Given**: User has resized columns A (100px) and C (200px)
**When**: File is saved and reloaded
**Then**: Column A is 100px wide
**And**: Column C is 200px wide

### RES-PER-002: Row Heights Persist on Save
**Given**: User has resized rows 1 (30px) and 5 (50px)
**When**: File is saved and reloaded
**Then**: Row 1 is 30px tall
**And**: Row 5 is 50px tall

---

## Edge Cases

### RES-EDGE-001: Resize During Scroll
**Given**: User starts resizing column Z (partially visible)
**When**: User drags while grid is scrolled
**Then**: Resize operates correctly
**And**: Grid does not unexpectedly scroll

### RES-EDGE-002: Very Wide Column
**Given**: User resizes column A
**When**: User drags to make column 500px wide
**Then**: Column renders at 500px
**And**: Adjacent columns are pushed right

### RES-EDGE-003: Resize Then Click Header
**Given**: User just finished resizing column B
**When**: User clicks column B header within 50ms
**Then**: Click is ignored (no selection change)
**And**: After 50ms, clicks work normally

---

## Guide Line

### RES-GUIDE-001: Guide Line Appears on Drag Start
**Given**: User starts dragging column resize edge
**When**: Mousedown and move detected
**Then**: Vertical guide line appears at drag position

### RES-GUIDE-002: Guide Line Follows Mouse
**Given**: User is dragging column resize
**When**: Mouse moves left and right
**Then**: Guide line follows mouse position
**And**: Guide line respects minimum width constraint

### RES-GUIDE-003: Guide Line Disappears on Release
**Given**: User is dragging with guide line visible
**When**: User releases mouse
**Then**: Guide line disappears
**And**: Column is set to final width

---

## Integration

### RES-INT-001: Resize After Selection
**Given**: User has cells A1:B5 selected
**When**: User resizes column A
**Then**: Selection is preserved
**And**: Selection border adjusts to new column width

### RES-INT-002: Resize During Edit Mode
**Given**: User is editing cell A1 (editor visible)
**When**: User attempts to resize column A
**Then**: Resize cursor does not appear in cell area
**And**: Editor remains active

### RES-INT-003: Double-Click Auto-Fit (Future)
**Given**: User double-clicks on column resize edge
**When**: Auto-fit is implemented
**Then**: Column width adjusts to fit content
**Note**: Not yet implemented
