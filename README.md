# 📊 v-sheet: A Modern Web Spreadsheet

**v-sheet** is a powerful, lightweight spreadsheet application built with vanilla JavaScript on the front end and a persistent Python Flask backend for file management. It is designed to be a fast, modern, and extensible platform for data manipulation.

While the project's ultimate goal is to integrate a native AI agent (Gemini API), the current version provides a robust, fully-functional spreadsheet experience, featuring a multi-threaded formula engine, history management, and advanced grid controls.

---

## ✨ Features

This application implements core features expected from a modern spreadsheet.

- **Multi-Threaded Formula Engine:**

  - All calculations run in a dedicated **Web Worker** (`js/engine/formula-worker.js`) to keep the UI fast and responsive.
  - Includes a full **Tokenizer**, **Parser**, and **Evaluator** to handle complex formulas.
  - A robust **Dependency Graph** manages all cell relationships, ensuring only affected cells are recalculated.
  - Supports built-in functions like `SUM` and `IF`.

- **History Management (Undo/Redo):**

  - Full support for undo (`Ctrl+Z`) and redo (`Ctrl+Y`) for all major actions.
  - Built using the **Command Pattern** to make operations atomic and reversible.
  - Tracks cell edits, multi-cell clears, and paste operations.

- **Persistent File Management:**

  - A full file-management system powered by a Flask API.
  - Create, rename, and delete spreadsheets.
  - File browser with search and sorting by modification date.
  - Debounced **autosave** ensures changes are saved to the server automatically.
  - Save status indicator (Saved, Unsaved, Saving).

- **Advanced Spreadsheet Grid:**

  - Dynamic grid with 100 rows and 26 columns.
  - **Column and Row Resizing:** Click and drag headers to resize selected or individual columns/rows.
  - **Drag-to-Move:** Drag any selected cell range to a new location.
  - **Advanced Selection:**
    - Click to select a cell.
    - Click-and-drag for range selection.
    - `Shift + Click` to extend selection.
    - `Cmd/Ctrl + Click` to add multiple, non-contiguous selections.
    - Click headers to select entire columns or rows.

- **Integrated UI:**

  - **Formula Bar:** Displays the active cell (e.g., `A1`) and its full contents.
  - **In-Place Editing:** Double-click any cell to edit it directly.
  - **Keyboard Navigation:** Use arrow keys, `Enter`, `Tab`, and `Cmd/Ctrl + Arrow` keys for rapid navigation and selection.

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3.
- **Backend:** Python 3 with Flask.
- **Data Storage:** Spreadsheets are stored as individual JSON files on the server in the `data/` directory.
- **Testing:**
  - **Unit Testing:** Vitest
  - **End-to-End Testing:** Playwright

---

## ⚙️ Getting Started

### Prerequisites

You will need the following installed on your system:

- Python 3.x
- `pip` (Python package installer)
- Node.js and `npm` (for testing)

### 1\. Set Up the Environment

First, set up and activate a Python virtual environment to manage dependencies.

```bash
# Navigate to the project's root directory
cd v-sheet

# Create a virtual environment
python -m venv venv

# Activate the environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
```

### 2\. Install Dependencies

Install the required Python packages for the backend server and Node.js packages for the testing framework.

```bash
# Install Python requirements
pip install -r server/requirements.txt

# Install Node.js dev dependencies
npm install
```

### 3\. Run the Application

The Python server handles both the backend API and serves the static front-end files (HTML, CSS, JS).

```bash
# Run the Flask server
python server/app.py
```

You should see output indicating the server is running, storing data in the `data/files` directory, and listening on `http://localhost:5000`.

### 4\. Access v-sheet

1.  Open your web browser.
2.  Navigate to **`http://localhost:5000`**.

The application will load, automatically create your first spreadsheet file if one doesn't exist, and be ready to use.

---

## 🧪 Testing

The project is configured with both unit and E2E tests.

- **Unit Tests (Vitest):**

  - Run all unit tests once:
    ```bash
    npm test
    ```
  - Run unit tests in watch mode with a UI:
    ```bash
    npm run test:ui
    ```

- **End-to-End Tests (Playwright):**

  - The Playwright configuration is set up to **automatically start the Flask server** for you.
  - Run all E2E tests (this will open a browser):
    ```bash
    npm run e2e
    ```

---

## 🐞 Debugging

The application uses a standardized `Logger` utility that can be controlled from your browser console. By default, only warnings and errors are shown.

**To enable verbose debug logs:**

1.  Open the application in your browser (`http://localhost:5000`).
2.  Open the **Developer Console** (F12 or Ctrl+Shift+I).
3.  Type the following command and press Enter:
    ```javascript
    sessionStorage.setItem('vsheet-debug', 'true');
    ```
4.  Reload the page. You will now see detailed logs from the `FormulaWorker` and other modules.

To disable debug logs, run: `sessionStorage.removeItem('vsheet-debug')` and reload.

---

## 📂 Project Structure

```
v-sheet/
├── css/
│   └── spreadsheet.css       # All styles for the grid and UI
├── data/                     # (Created by server) Default data storage
├── docs/                     # Project documentation (PRDs, Roadmap)
├── e2e/                      # Playwright E2E tests
├── js/
│   ├── engine/               # Core formula engine
│   │   ├── functions/        # Built-in functions (SUM, IF, etc.)
│   │   ├── parser/           # Tokenizer and Parser
│   │   ├── utils/            # CellHelpers, Logger, TypeCoercion
│   │   ├── DependencyGraph.js
│   │   ├── Evaluator.js
│   │   ├── FormulaEngine.js
│   │   └── formula-worker.js # Main worker script
│   ├── history/              # Undo/Redo (Command Pattern)
│   │   └── commands/
│   ├── spreadsheet.js        # Core grid logic (selection, resizing, rendering)
│   ├── file-manager.js       # Client-side API and file state management
│   └── formula-bar.js        # UI logic for the top bar and file dropdown
├── server/
│   ├── app.py                # Flask backend server (API & file serving)
│   └── requirements.txt      # Python dependencies
├── tests/                    # Vitest unit tests
│   ├── engine/
│   └── history/
│
├── .gitignore
├── index.html                # Main application HTML structure
├── package.json              # Node.js dependencies and scripts
├── package-lock.json
├── playwright.config.js      # E2E test configuration
├── README.md                 # Project documentation (this file)
└── vitest.config.js          # Unit test configuration
```

---

## 🗺️ API Endpoints

The backend server provides the following REST API endpoints:

| Method   | Endpoint               | Description                                                                        |
| -------- | ---------------------- | ---------------------------------------------------------------------------------- |
| `GET`    | `/api/files`           | Lists metadata for all available spreadsheets.                                     |
| `POST`   | `/api/files`           | Creates a new, empty spreadsheet file.                                             |
| `GET`    | `/api/files/<file_id>` | Loads the full JSON data for a specific spreadsheet.                               |
| `PUT`    | `/api/files/<file_id>` | Updates (autosaves) a spreadsheet with new data.                                   |
| `DELETE` | `/api/files/<file_id>` | Deletes a specific spreadsheet file.                                               |
| `GET`    | `/api/recent`          | Gets the ID of the most recently viewed file, or creates a new file if none exist. |
| `GET`    | `/health`              | Health check endpoint used by the E2E test runner.                                 |
