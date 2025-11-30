### **1. The "Redundancy Killer": Event Metadata**

To avoid coding "Jump Right" and "Select Jump Right" separately, the `InputController` should **not** define separate intents for every combination. Instead, it should normalize the event into a standard **Navigation Object**.

**Refined `InputController` Logic:**
Instead of mapping `Cmd+Right` -\> `JUMP_RIGHT`, it maps:

- **Action:** `Maps`
- **Direction:** `'right'`
- **Modifiers:** `{ ctrl: true, shift: true }`

This is the "One Switch" you asked for. The InputController normalizes the hardware (keyboard) into a semantic instruction.

### **2. Addressing Your Stress Test Scenarios**

Here is how the 4 actions flow through the system with **zero duplicated logic**.

#### **Shared Logic Location: `NavigationMode`**

We create a base class `NavigationMode` that `ReadyMode`, `PointMode`, and `EnterMode` will all extend.

```javascript
// js/modes/NavigationMode.js
class NavigationMode extends AbstractMode {
  handleIntent(intent, context) {
    if (intent === 'NAVIGATE') {
      // ---------------------------------------------------------
      // SINGLE SOURCE OF TRUTH FOR GRID NAVIGATION
      // ---------------------------------------------------------
      const { direction, shift, ctrl } = context;

      if (ctrl) {
        // Logic: Finding the edge (Scenario 2 & 3)
        // Programmed ONCE here.
        // Shift is passed through (Scenario 3)
        this.selectionManager.jumpToEdge(direction, shift);
      } else {
        // Logic: Standard move (Scenario 1 & 4)
        // Shift is passed through (Scenario 4)
        this.selectionManager.moveSelection(direction, shift);
      }
      return true; // Handled
    }
    return false;
  }
}
```

#### **Scenario Trace**

| User Action             | Mode      | Logic Path (No Redundancy)                                                                                                                                            |
| :---------------------- | :-------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(1) Arrow Right**     | **Ready** | `InputController` sends `Maps`. `ReadyMode` (via `NavigationMode`) calls `moveSelection(right, false)`.                                                               |
| **(2) Cmd + Right**     | **Point** | `InputController` sends `Maps` + `ctrl`. `PointMode` (via `NavigationMode`) calls `jumpToEdge(right, false)`. **(Edge logic reused)**                                 |
| **(3) Cmd+Shift+Right** | **Ready** | `InputController` sends `Maps` + `ctrl` + `shift`. `ReadyMode` (via `NavigationMode`) calls `jumpToEdge(right, true)`. **(Shift logic reused)**                       |
| **(4) Shift + Right**   | **Enter** | `InputController` sends `Maps` + `shift`. `EnterMode` _commits_, then calls `super.handleIntent()`, which calls `moveSelection(right, true)`. **(Grid logic reused)** |

### **3. The "Switch" Between Grid and Text Navigation**

You correctly identified that **Edit Mode** is fundamentally different. In this architecture, the "Switch" is the **Class Type** of the current mode.

- **`NavigationMode` (and children):** Implements `handleIntent('NAVIGATE')` by manipulating the `SelectionManager`.
- **`EditMode`:** Does **NOT** implement `handleIntent('NAVIGATE')` (or explicitly ignores it).

**How `EditMode` works (Scenario 3 & 4):**
When the user presses `Shift+ArrowRight` in `EditMode`:

1.  `InputController` sends `Maps` intent.
2.  `EditMode.handleIntent` receives it.
3.  It sees `Maps`. It returns `false` (Not Handled).
4.  `InputController` sees `false` and **allows the browser default behavior**.
5.  The browser natively handles the text selection inside the input box.

**Result:** You don't write _any_ text navigation logic. You rely on the browser, and the "Switch" is simply that `EditMode` opts out of grid navigation.

### **4. Summary of Code Reusability**

1.  **Finding the Edge:** Programmed **once** in `SelectionManager.jumpToEdge()`. Called **once** in `NavigationMode`.
2.  **Shift Selection:** Programmed **once** in `SelectionManager`. The decision to use it is made **once** in `NavigationMode` (by passing the `shift` boolean).
3.  **Mode Differences:** Defined **once** by the inheritance hierarchy.
    - Grid Nav? Inherit from `NavigationMode`.
    - Text Nav? Inherit from `EditMode`.

### **Updated Class Hierarchy**

- **`AbstractMode`**
  - **`NavigationMode`** (Implements shared Grid Nav)
    - `ReadyMode`
    - `PointMode` (Adds formula updating side-effects)
    - `EnterMode` (Adds "Commit before move" logic)
  - **`EditMode`** (Opt-out of Grid Nav; handles text editing)

This architecture passes your stress test. It ensures that complex logic (like edge jumping) is defined in exactly one place and available to every mode that needs it, while modes that need different behavior (`EditMode`) simply don't inherit that logic.
