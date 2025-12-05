(1) After adding new file, the file selection menu doesn't disappear. It only disappears when user clicks on the grid, but still, there's no focus on the grid. It should load, with A1 as active cell in ready mode.

(2) Copy / paste doesn't work with ctrl+c and ctrl+v

(3) Issues with formula bar:
Formula bar doesn't display anything while typing in a cell. When typing in formula bar, the cell doesn't display anything, but they should be synced.
When deleting cell value (with backspace), formula bar doesn't update
By design, formula bar should show formulas and cell should show value. If the cell is only value, they show the same. If the cell is a formula, cell should show the result ready mode and the formula in Enter, Point and Edit mode. Formula bar should always show formula, even in Ready mode
When user clicks on the formula bar, the app should go into Edit mode, so if the active cell contains a formula and user clicks on the formula bar, the app should switch to Edit mode, so the cell should also display a formula

When in ready mode, user type "=", the app switches to point mode - which is correct, but when user follows with a letter, for example "C", it doesn't show up. When user presses "enter", the change is correctly committed. So step by step:

So this is current behavior
(1) User types "=" in B5 : Application goes into "Point" mode
(2) User types "B" in B5 : Cell shows nothing
(3) User types "2" in B5 : Cell shows nothing
(4) User types "+" in B5 : Cell shows nothing
(5) User types "B" in B5 : Cell shows nothing
(6) User types "3" in B5 : Cell shows nothing
(7) User presses "Enter" : Edit in B5 is commited, active cell moves to B6, Value in B5 is a correct result of the formula
(8) User presses "Kay Arrow Up" : Active cell moves to B5, Formula bar shows "=B2+B3"

What it should be:
(1) User types "=" in B5 : Application goes into "Point" mode
(2) User types "B" in B5 : Cell shows "=B", app switches to "Edit" mode
(3) User types "2" in B5 : Cell shows "=B2"
(4) User types "+" in B5 : Cell shows "=B2+", app switches to "Point" mode, user can use arrow keys to point to a new reference
(5) User types "B" in B5 : Cell shows "=B2+B", app switches to "Edit" mode
(6) User types "3" in B5 : Cell shows "=B2+B3"
(7) User presses "Enter" : Edit in B5 is commited, active cell moves to B6, Value in B5 is a correct result of the formula
(8) User presses "Kay Arrow Up" : Active cell moves to B5, Formula bar shows "=B2+B3"

During the entire time, formula bar is synced with cell in real time and they show the same value

(4) Drag and drop: ghost is not visible while dragging

(5) The app doesn't switch to Point mode from Edit mode after user types an operator (eg. "+")
