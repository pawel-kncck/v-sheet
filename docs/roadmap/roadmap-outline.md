## v-sheet Product Roadmap

### Phase 1: Foundation (Stability & History)

- **Epic: History Management (Undo/Redo)**

  - **Implementation:** Use the **Command Pattern**.
  - **Scope:** Refactor all actions (cell edits, resizing, formatting) to be undo-able commands.

- **Epic: Testing & Logging (Bootstrap)**
  - **Scope:** Set up the testing harness (e.g., Jest, Vitest).
  - **Unit Tests:** Create initial unit tests for the formula engine (Tokenizer, Parser, Evaluator, DependencyGraph).
  - **E2E Tests:** Create initial E2E tests for core user flows (load file, edit cell, see formula update).
  - **Logging:** Establish a standardized logging format.

### Phase 2: Core Spreadsheet Features

_(Testing & Logging are now integrated into all subsequent epics)_

- **Epic: Cell Formatting**

  - **Data Model:** Add a `style: {}` object to cell data in the JSON files.
  - **Features:** Font (bold, italic, etc.), Fill Color, Alignment, Text Wrapping.

- **Epic: Advanced Copy/Paste**
  - **Implementation:** Calculate relative formulas _at paste time_ using a string-based approach (leveraging `CellHelpers.js`).
  - **Features:** Relative formula pasting, Paste Special (values, formulas, formatting).

### Phase 3: Engine & UX Enhancement

- **Epic: Multi-Sheet Support**

  - **Priority:** Tackle this _before_ row/column manipulation.
  - **Engine:** Update Parser, Evaluator, and Dependency Graph to handle `Sheet2!A1` syntax and cross-sheet dependencies.
  - **UI:** Add sheet tabs to the UI.

- **Epic: Grid Manipulation**

  - **Features:** Add/Remove rows and columns.
  - **Engine:** This will now leverage the (more robust) multi-sheet engine to safely update or destroy formula references.

- **Epic: Formula-Building UX**
  - **Implementation:** Enable **in-cell editing** for formulas, where arrow keys navigate the grid.
  - **Visuals:** Implement **multi-colored highlighting** for each formula reference.

### Phase 4: Advanced Data Analysis

- **Epic: Data I/O (CSV Import)**
- **Epic: Pivot Tables**
- **Epic: Function Library Expansion** (More Math, Text, Lookup functions)

### Phase 5: Personalization & Collaboration

- **Epic: User Settings** (Default formatting, currency, etc.)
- **Epic: User Accounts & Authentication**
