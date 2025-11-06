# 📊 v-sheet: A Modern Web Spreadsheet

**v-sheet** is a powerful, lightweight spreadsheet application built with vanilla JavaScript on the front end and a persistent Python Flask backend for file management. It is designed to be a fast, modern, and extensible platform for data manipulation.

While the project's ultimate goal is to integrate a **native AI agent (Gemini API)** for financial modeling, the current version provides a robust, fully-functional spreadsheet experience with advanced features like persistent storage, cell drag-and-drop, and dynamic resizing.

---

## ✨ Features

This application goes beyond a simple grid, implementing core features expected from a modern spreadsheet.

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

- **Frontend:** **Vanilla JavaScript (ES6+)**, HTML5, CSS3.
- **Backend:** **Python 3** with **Flask**.
- **Data Storage:** Spreadsheets are stored as individual JSON files on the server in the `data/` directory.

---

## ⚙️ Getting Started

### Prerequisites

You will need the following installed on your system:

- Python 3.x
- `pip` (Python package installer)

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

Install the required Python packages for the backend server.

```bash
# Install requirements
pip install -r server/requirements.txt
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

## 📂 Project Structure

```
v-sheet/
├── .gitignore                # Git ignore configuration
├── index.html                # Main application HTML structure
├── README.md                 # Project documentation (this file)
│
├── css/
│   └── spreadsheet.css       # All styles for the grid and UI
│
├── js/
│   ├── spreadsheet.js        # Core grid logic (selection, resizing, rendering)
│   ├── file-manager.js       # Client-side API and file state management
│   └── formula-bar.js        # UI logic for the top bar and file dropdown
│
├── server/
│   ├── app.py                # Flask backend server (API & file serving)
│   └── requirements.txt      # Python dependencies
│
└── data/                     # (Created by server) Default data storage
    ├── files/                # (Created by server) Stores all .json spreadsheets
    └── metadata.json         # (Created by server) Tracks the last-opened file
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
