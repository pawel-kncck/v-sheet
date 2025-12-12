Based on the code analysis, you have correctly identified a critical piece of the puzzle.

### **Current Implementation Analysis**

Currently, the selection state **is centralized** in `js/ui/SelectionManager.js`.

- **State:** It holds `this.activeCell`, `this.ranges`, and `this.selectionAnchor`.
- **Logic:** It calculates which headers to highlight and which borders to draw.
- **Rendering:** It creates the visual feedback by calling methods on `GridRenderer` (e.g., `highlightColumnHeader`).

**However, the "Orchestration" is decentralized.**
Right now, `Spreadsheet.js` manually bridges `SelectionManager` to other components. For example:

- When Copying: `Spreadsheet.js` manually pulls `this.selectionManager.ranges` and passes it to `ClipboardManager`.
- When Resizing: `Spreadsheet.js` has to manually check `selectionManager` to see if multiple columns are selected.

### **Should we change it?**

**No, do not replace `SelectionManager`.**
It is already a solid, centralized "Store" for selection data. Re-writing it would be over-engineering.

**Yes, we must change how it is _accessed_.**
In the new **Strategy Pattern** architecture, `SelectionManager` becomes a **Dependency** injected into the Modes. It stops being "orchestrated" by `Spreadsheet.js` and starts being "commanded" by the active Mode.

### **The Integration Plan**

We don't need a new architecture for selection, we just need to fit the existing `SelectionManager` into our new `Mode` system.

#### **1. Selection Manager as a "Service"**

The `ModeManager` will hold the instance of `SelectionManager` and pass it to every Mode strategy.

- **`NavigationMode`**: Calls `selectionManager.moveSelection()`.
- **`PointMode`**: Calls `selectionManager.selectCell()`.
- **`ClipboardController`**: Queries `selectionManager.getRanges()`.

#### **2. Handling "Point Mode" Complexity**

You raised a great point about "Jump to Edge" in "Point Mode".

- **Scenario:** User types `=SUM(`, then presses `Ctrl + Right`.
- **Behavior:** The selection should jump to the end of the data range.
- **Architecture Solution:** Because `PointMode` extends `NavigationMode`, it inherits the logic that calls `selectionManager.jumpToEdge()`. The `SelectionManager` updates its internal state (moving the `activeCell` to the edge). `PointMode` listens to the `onSelectionChange` event and updates the formula text.

**Zero redundancy achieved.**

### **Refined Architecture Diagram**

Here is how the Selection state fits into the new plan:

```javascript
[ InputController ]
       │
       ▼
[ ModeManager ] ── delegates to ──> [ CurrentMode (e.g., ReadyMode) ]
                                            │
                                            ▼
                                  [ SelectionManager ] (The Central Store)
                                            │
                                            ├── holds state: { activeCell: 'A1', ranges: [...] }
                                            │
                                            ▼
                                    [ GridRenderer ] (Visuals)
```

### **Action Item for the Feature Spec**

I will add a specific section to the Feature Spec detailing the **Selection Service Interface**. We need to ensure `SelectionManager` exposes exactly what the Modes need without coupling rendering logic too tightly.

- **Requirement:** Ensure `SelectionManager` emits events (`selectionChanged`) rather than calling render methods directly, allowing us to decouple logic from visuals if we want to add React/Vue later. (For now, direct rendering is acceptable for performance).

I will proceed with generating the files based on this confirmation.
