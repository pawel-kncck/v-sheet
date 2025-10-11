# 📊 v-sheet: AI-Powered Financial Spreadsheet

**v-sheet** is a simple, yet powerful online spreadsheet application built specifically for **financial modeling**. It is designed with a core focus on integrating a **native AI agent** to assist with complex financial analysis, data manipulation, and formula generation, while maintaining a lightweight architecture using vanilla JavaScript.

---

## 🚀 Project Goal

The primary goal of `v-sheet` is to combine the familiar, robust functionality of a traditional spreadsheet with the cutting-edge capabilities of a large language model. This creates an environment where users can quickly build sophisticated financial models and receive instant, context-aware assistance from the built-in AI agent.

---

## ✨ Features

### Initial Features

- **Grid Interface:** A functional, pure HTML/CSS grid for displaying cells and data.
- **Cell Editing:** Basic input field for editing cell content and formulas.
- **Core Logic:** Separate files for core logic: `cell.js`, `formula-engine.js`, and `spreadsheet.js`.

### Planned Features

- **Formula Evaluation:** A robust engine for evaluating cell formulas (e.g., `SUM`, `AVG`, cell references like `A1 + B2`).
- **Native AI Agent:** A chat/prompt interface powered by the Gemini API for asking questions about the model, summarizing results, or suggesting formulas.
- **Contextual Financial Functions:** Specialized functions for financial analysis (e.g., `NPV`, `IRR`).

---

## 🛠️ Tech Stack

- **Frontend:** **Vanilla JavaScript**, HTML5, CSS3.
- **API:** **Gemini API** for the AI agent functionality.
- **Development Utility:** **Gemini CLI** for development and deployment tasks.

---

## ⚙️ Getting Started

### Prerequisites

You will need the following installed:

- Node.js (for Gemini CLI)
- Gemini CLI (installed globally or locally)

<!-- end list -->

```bash
# Install the Gemini CLI
npm install -g @google/genai
```

### 1\. API Key Setup

To enable the AI agent, you must set up your **Gemini API Key**.

1.  Create a file named `.env` in the root directory of the project.
2.  Add your API key to the file in the following format:

<!-- end list -->

```bash
GEMINI_API_KEY="YOUR_API_KEY_HERE"
```

_(A placeholder key was included in the project for reference.)_

### 2\. Running the App

Since this is a vanilla JS project, you simply need a local server to serve the files. You can use the Gemini CLI or any other lightweight server utility (like `http-server` or Python's `http.server`).

#### Using the Gemini CLI

While the Gemini CLI is primarily for interaction, you can use a local web server utility for quick setup:

```bash
# Example using Python's built-in server
# Run from the project root directory
python -m http.server 8080
```

#### Accessing the Spreadsheet

1.  Open your web browser.
2.  Navigate to `http://localhost:8080`.

---

## 📂 Project Structure

The current structure is focused on separating concerns into HTML, CSS, and modular JavaScript:

```
v-sheet/
├── index.html                # Main page structure
├── .env                      # Environment variables (GEMINI_API_KEY)
├── css/
│   └── spreadsheet.css       # Styling for the grid and elements
└── js/
    ├── cell.js               # Logic for individual Cell objects
    ├── formula-engine.js     # Engine for parsing and calculating formulas (WIP)
    └── spreadsheet.js        # Main application logic and grid management
```
