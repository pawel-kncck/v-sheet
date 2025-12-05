It starts all good. User can navigate the grid, when starts typing, the app switched to the "Enter" mode and he can type something. Well.. here we have a first issue already - the status bar shows correct mode, but the active cell is always A1 and doesn't change.

No... the enter mode doesn't work fully well. When user starts typing, it's looking good, but backspace doesn't work

Another problem is when user exits the enter mode. When the exit with "Enter" it works correctly - edit is commited and mode switches to "ready". But when they exit with an arrow key, the edit is committed (correct), but they are still in the "Enter" mode and can't type anything. Only when they click "Enter" again, it starts working

From the "Ready" mode, typing "=" switched mode to "Point", however, when user navigates with arrow key to another cell, the reference gets added to the formula, but when they navigate to another cell, the new referece appends the existing one, instead of replacing it. So for example, if user types a formula in A1, starts with "=", presses arrow key right they get "=B1", when pressed again they get "=B1C1", when pressed again, they get "=B1C1D1", but in the correct behaviour they should get "=D1" at the end. In the point mode, mouse doesn't work at all.

User should enter edit mode by double clicking on a cell (it should make the cell active and switch to "edit" mode), by pressing "Enter" or clicking on the formula bar (assuming that they want to edit active cell). Currently pressing "Enter" doesn't work, double click "sort of does" - text in the cell is selected, but nothing can be done - no edits. Arrow keys, that were supposed to get back to default behaviour, are still moving active cell across the grid. The mode doesn't change. It's also impossible to exit a cell - ESC doesn't work, but when exiting a cell via arrow keys, the selection remains. But when user starts typing in another cell, which triggers "Enter" mode, the contant of the cell that was supposed to be edited disappears

Jump to egde has some issues. It doesn't detect the "edge" after loading a new file, however after first edit, it starts working correctly.

Copy / paste doesn't work either, at least not with the ctrl+c / ctrl+v keys
