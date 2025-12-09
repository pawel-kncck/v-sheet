# File Persistence Architecture

This document explains how v-sheet saves and loads spreadsheet data, covering both client-side state management and server-side storage.

**Related Documentation**:
- **System Overview**: [docs/architecture/00-system-overview.md](./00-system-overview.md)
- **REST API**: [docs/api-reference/rest-api.md](../api-reference/rest-api.md)
- **Worker Protocol**: [docs/api-reference/worker-protocol.md](../api-reference/worker-protocol.md)

---

## Overview

File persistence in v-sheet follows a **client-server architecture**:

- **Client (FileManager)**: JavaScript class managing application state and API calls
- **Server (Flask API)**: REST endpoints for CRUD operations on JSON files
- **Storage**: JSON files on disk in `data/files/` directory

**Key Features**:
- Auto-save with debouncing (500ms delay)
- Recent file tracking
- Flyweight pattern for style storage
- Graceful error handling

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────┐
│                  Browser (Client)                    │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │          FileManager                       │    │
│  │  - Current file state                      │    │
│  │  - Unsaved changes tracking               │    │
│  │  - Auto-save debouncing                   │    │
│  └──────────────┬─────────────────────────────┘    │
│                 │                                    │
│                 │ HTTP REST Calls                    │
│                 │                                    │
└─────────────────┼────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────────┐
│              Flask Server (Python)                   │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │        app.py (REST API)                   │    │
│  │  GET    /api/files         (list)          │    │
│  │  POST   /api/files         (create)        │    │
│  │  GET    /api/files/:id     (load)          │    │
│  │  PUT    /api/files/:id     (save)          │    │
│  │  DELETE /api/files/:id     (delete)        │    │
│  │  GET    /api/recent        (recent file)   │    │
│  └──────────────┬─────────────────────────────┘    │
│                 │                                    │
│                 │ File I/O                           │
│                 │                                    │
│  ┌──────────────▼─────────────────────────────┐    │
│  │    data/files/                             │    │
│  │      {uuid}.json (spreadsheet files)       │    │
│  │    data/metadata.json (recent file track)  │    │
│  └────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

---

## Client-Side: FileManager

**File**: `js/file-manager.js`

### Responsibility
Manage the **current file state** and coordinate persistence operations with the server.

### State Structure

```javascript
{
  currentFile: {
    id: "uuid-123",
    name: "My Spreadsheet",
    created: "2024-12-07T10:00:00Z",
    modified: "2024-12-07T15:30:00Z",
    data: {
      cells: {
        "A1": { value: "100", formula: false },
        "B2": { value: "=A1*2", formula: true, styleId: "s1" }
      },
      styles: {
        "s1": { font: { bold: true }, fill: { color: "#FFFF00" } }
      },
      columnWidths: [94, 94, 94, ...],  // 26 columns
      rowHeights: [20, 20, 20, ...],    // 100 rows
      metadata: {
        lastActiveCell: "B2",
        selections: []
      }
    }
  },
  files: [  // List of all available files
    { id: "uuid-123", name: "My Spreadsheet", modified: "..." },
    { id: "uuid-456", name: "Budget 2024", modified: "..." }
  ],
  hasUnsavedChanges: false,
  isSaving: false,
  saveTimeout: null
}
```

### Key Concepts

#### 1. Cell Data Format
Cells store **raw values** (formulas as strings):

```javascript
"B2": {
  value: "=A1*2",      // Raw formula string
  formula: true,       // Boolean flag
  styleId: "s1"        // Reference to styles object
}
```

**Important**: FileManager stores formulas as strings. The FormulaWorker calculates results, but those are **not persisted** (they're recalculated on load).

#### 2. Flyweight Pattern for Styles
Instead of duplicating style objects for each cell:

```javascript
// BAD: Duplicate style objects (wastes space)
{
  cells: {
    "A1": { value: "100", style: { font: { bold: true } } },
    "A2": { value: "200", style: { font: { bold: true } } },  // Duplicate!
    "A3": { value: "300", style: { font: { bold: true } } }   // Duplicate!
  }
}

// GOOD: Flyweight pattern
{
  cells: {
    "A1": { value: "100", styleId: "s1" },
    "A2": { value: "200", styleId: "s1" },  // Share reference
    "A3": { value: "300", styleId: "s1" }
  },
  styles: {
    "s1": { font: { bold: true } }  // Stored once
  }
}
```

**Benefit**: 100 cells with same formatting use 1 style object instead of 100.

**Implementation**: StyleManager (`js/StyleManager.js`) generates unique IDs for style combinations.

#### StyleManager Deep Dive

StyleManager uses hash-based deduplication:

```javascript
class StyleManager {
  constructor(existingStyles = {}) {
    this.styles = existingStyles;           // { styleId: styleObject }
    this.reverseLookup = new Map();         // hash → styleId
  }

  addStyle(styleObject) {
    const hash = this._generateHash(styleObject);

    // Return existing ID if style already exists
    if (this.reverseLookup.has(hash)) {
      return this.reverseLookup.get(hash);
    }

    // Create new entry
    const newId = this._generateId();
    this.styles[newId] = styleObject;
    this.reverseLookup.set(hash, newId);
    return newId;
  }

  getStyle(id) {
    return this.styles[id] || null;
  }
}
```

**Key methods**:
- `addStyle(styleObject)` → Returns styleId (creates new or returns existing)
- `getStyle(styleId)` → Returns full style object
- `getPalette()` → Returns all styles for file persistence

**Integration with FileManager**:
- `updateCellFormat(cellId, styleObject)` calls `styleManager.addStyle()`
- `getCellStyle(cellId)` calls `styleManager.getStyle()`
- Palette saved to `currentFile.data.styles` on save

#### 3. Auto-Save with Debouncing
To avoid excessive API calls on rapid edits:

```javascript
markAsModified() {
  this.hasUnsavedChanges = true;

  // Clear existing timeout
  clearTimeout(this.saveTimeout);

  // Set new timeout (500ms)
  this.saveTimeout = setTimeout(() => {
    this.saveCurrentFile();
  }, 500);
}
```

**Behavior**:
- User types in A1 → markAsModified → 500ms timer starts
- User types in A2 (within 500ms) → timer resets → another 500ms
- User stops typing → 500ms elapses → save triggered

**Benefit**: Multiple rapid edits result in single API call.

### Core Methods

| Method | Purpose |
|--------|---------|
| `initialize()` | Load file list, load recent file or create new |
| `loadFile(fileId)` | Fetch file from server, clear history, load into app |
| `saveCurrentFile()` | PUT to `/api/files/:id` with current data |
| `createNewFile(name)` | POST to `/api/files`, switch to new file |
| `deleteFile(fileId)` | DELETE `/api/files/:id` |
| `updateCellData(cellId, value)` | Update cell in-memory, mark modified, queue autosave |
| `updateCellFormat(cellId, style)` | Update cell formatting via StyleManager |
| `getRawCellValue(cellId)` | Get formula string or value |
| `getCellStyle(cellId)` | Resolve styleId to full style object |

### Event Callbacks

FileManager uses callback pattern for UI updates:

```javascript
fileManager.onFileListUpdate = (files) => {
  // Update file selector dropdown
};

fileManager.onCurrentFileChange = (file) => {
  // Update title bar, load data into grid
};

fileManager.onSaveStatusChange = (status) => {
  // Show "Saving...", "Saved", "Error" indicator
  // status: 'loading' | 'saving' | 'saved' | 'unsaved' | 'error'
};

fileManager.onError = (error) => {
  // Show error toast/alert
};
```

**Benefit**: Decouples FileManager from UI rendering.

---

## Server-Side: Flask REST API

**File**: `server/app.py`

### Technology Stack
- **Framework**: Flask (Python)
- **CORS**: flask-cors (allows browser access)
- **Storage**: JSON files on disk
- **File Structure**: `data/files/{uuid}.json`

### API Endpoints

#### 1. GET /api/files
**Purpose**: List all spreadsheet files

**Response**:
```json
{
  "files": [
    {
      "id": "uuid-123",
      "name": "My Spreadsheet",
      "modified": "2024-12-07T15:30:00Z"
    }
  ]
}
```

**Implementation**:
- Scans `data/files/` directory for `*.json` files
- Reads each file, extracts id/name/modified
- Sorts by modified date (most recent first)
- Returns lightweight list (no cell data)

---

#### 2. POST /api/files
**Purpose**: Create a new spreadsheet

**Request**:
```json
{
  "name": "My New Spreadsheet"
}
```

**Response**: Full file object with empty data structure

**Implementation**:
1. Generate UUID for file ID
2. Create file object with empty cells
3. Save to `data/files/{uuid}.json`
4. Return complete file data

---

#### 3. GET /api/files/:id
**Purpose**: Load a specific spreadsheet

**Response**: Complete file object including all cell data

**Implementation**:
- Read `data/files/{id}.json`
- Update recent file tracking
- Return full file

**Note**: This can return large JSON (thousands of cells). Consider pagination for huge files.

---

#### 4. PUT /api/files/:id
**Purpose**: Save changes to spreadsheet (auto-save)

**Request**:
```json
{
  "name": "Updated Name",
  "data": {
    "cells": { ... },
    "styles": { ... },
    "columnWidths": [...],
    "rowHeights": [...],
    "metadata": { ... }
  }
}
```

**Response**:
```json
{
  "status": "success",
  "modified": "2024-12-07T15:45:00Z"
}
```

**Implementation**:
1. Read existing file
2. Update name and data
3. Update `modified` timestamp
4. Write back to disk
5. Return new timestamp

---

#### 5. DELETE /api/files/:id
**Purpose**: Delete a spreadsheet file

**Response**:
```json
{
  "status": "success"
}
```

**Implementation**:
- Delete `data/files/{id}.json`
- Return success

**Note**: No undo for delete. Consider soft-delete or trash folder.

---

#### 6. GET /api/recent
**Purpose**: Get most recently accessed file ID

**Response**:
```json
{
  "recentFileId": "uuid-123",
  "lastAccessed": "2024-12-07T15:30:00Z"
}
```

**Implementation**:
- Read `data/metadata.json`
- Return stored recent file ID

**Usage**: On app load, open the most recent file automatically.

---

#### 7. GET /health
**Purpose**: Health check for E2E tests

**Response**:
```json
{
  "status": "ok"
}
```

**Usage**: Playwright tests wait for server to be ready.

---

## Data Flow Examples

### Example 1: Application Initialization

```
1. User opens http://localhost:5000
   ↓
2. Spreadsheet.js creates FileManager
   ↓
3. FileManager.initialize() called
   ↓
4. GET /api/files → [{id: "uuid-123", ...}, ...]
   ↓
5. GET /api/recent → {recentFileId: "uuid-123"}
   ↓
6. FileManager.loadFile("uuid-123")
   ↓
7. GET /api/files/uuid-123 → {id, name, data: {...}}
   ↓
8. Spreadsheet.loadFromFile(fileData)
   ↓
9. GridRenderer renders cells
   ↓
10. FormulaWorker.postMessage({ type: 'load', ... })
    ↓
11. Worker calculates all formulas
    ↓
12. Worker sends back { type: 'updates', ... }
    ↓
13. UI updates with calculated values
```

---

### Example 2: User Edits Cell (Auto-Save Flow)

```
1. User types "Hello" in B2, presses Enter
   ↓
2. Mode creates UpdateCellsCommand
   ↓
3. Command calls fileManager.updateCellData('B2', 'Hello')
   ↓
4. FileManager:
   - Updates this.currentFile.data.cells['B2'] = { value: 'Hello' }
   - Sets this.hasUnsavedChanges = true
   - Calls this.queueAutosave() → setTimeout(save, 500ms)
   ↓
5. [User continues working...]
   ↓
6. [500ms elapses with no new edits]
   ↓
7. FileManager.saveCurrentFile() triggered
   ↓
8. PUT /api/files/uuid-123
   Request: { name: "...", data: { cells: { B2: { value: "Hello" } } } }
   ↓
9. Flask reads file, updates data, writes to disk
   ↓
10. Response: { status: "success", modified: "2024-12-07T15:45:00Z" }
    ↓
11. FileManager updates this.currentFile.modified
    ↓
12. FileManager.onSaveStatusChange('saved') → UI shows "Saved" indicator
```

---

### Example 3: Switching Files

```
1. User selects different file from file list
   ↓
2. FileManager.loadFile(newFileId) called
   ↓
3. Check if current file has unsaved changes
   ↓
4. If yes, call saveCurrentFile() first (synchronous)
   ↓
5. GET /api/files/newFileId
   ↓
6. Receive new file data
   ↓
7. HistoryManager.clear() → Clear undo stack
   ↓
8. Spreadsheet.loadFromFile(newFileData)
   ↓
9. GridRenderer clears grid, renders new file's cells
   ↓
10. FormulaWorker.postMessage({ type: 'load', ... })
```

**Important**: Switching files saves current file first to prevent data loss.

---

## File Format Specification

### Complete File Structure
```json
{
  "id": "uuid-123",
  "name": "My Spreadsheet",
  "created": "2024-12-07T10:00:00Z",
  "modified": "2024-12-07T15:30:00Z",
  "data": {
    "cells": {
      "A1": {
        "value": "100",
        "formula": false
      },
      "B2": {
        "value": "=A1*2",
        "formula": true,
        "styleId": "s1"
      }
    },
    "styles": {
      "s1": {
        "font": {
          "bold": true,
          "italic": false,
          "underline": false,
          "strikethrough": false,
          "size": 14,
          "family": "Arial",
          "color": "#000000"
        },
        "fill": {
          "color": "#FFFF00"
        },
        "align": {
          "h": "center",
          "v": "middle"
        }
      }
    },
    "columnWidths": [94, 120, 94, ...],  // 26 elements
    "rowHeights": [20, 25, 20, ...],     // 100 elements
    "metadata": {
      "lastActiveCell": "B2",
      "selections": []
    }
  }
}
```

### Cell Object Schema
```typescript
interface Cell {
  value: string | number;    // Raw value or formula string
  formula: boolean;          // True if value starts with '='
  styleId?: string;          // Optional reference to styles object
}
```

### Style Object Schema
```typescript
interface Style {
  font?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    size?: number;
    family?: string;
    color?: string;  // Hex color
  };
  fill?: {
    color?: string;  // Hex color
  };
  align?: {
    h?: 'left' | 'center' | 'right';
    v?: 'top' | 'middle' | 'bottom';
  };
}
```

---

## Persistence Strategies

### 1. Optimistic UI Updates
Changes are applied immediately in the UI, then saved asynchronously:

```javascript
// User edits cell
fileManager.updateCellData('B2', 'New Value');  // Immediate
gridRenderer.updateCellContent('B2', 'New Value');  // Immediate
// ... 500ms later ...
// PUT /api/files/:id  // Asynchronous
```

**Benefit**: Instant feedback, no waiting for server.

**Risk**: If save fails, UI shows stale data. Solution: Show error and reload.

### 2. Debounced Auto-Save
Multiple edits within 500ms result in single save:

```
Edit A1 → Timer: 500ms
Edit A2 (200ms later) → Timer: Reset to 500ms
Edit A3 (300ms later) → Timer: Reset to 500ms
[No edits for 500ms]
→ Save triggered (single API call for all 3 edits)
```

**Benefit**: Reduces server load, prevents race conditions.

### 3. Force Save on Critical Events
Auto-save is bypassed for:
- **File switching**: Save current file before loading new one
- **Window unload**: Save on `beforeunload` event (if possible)

```javascript
window.addEventListener('beforeunload', async (e) => {
  if (fileManager.hasUnsavedChanges) {
    await fileManager.forceSave();
  }
});
```

**Note**: Browsers may block async operations in `beforeunload`. Consider using `sendBeacon` for reliability.

---

## Error Handling

### Network Errors
If save fails due to network:

```javascript
async saveCurrentFile() {
  try {
    const response = await fetch(`/api/files/${id}`, { method: 'PUT', ... });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    this.onSaveStatusChange('saved');
  } catch (error) {
    this.onSaveStatusChange('error');
    this.onError({ message: 'Save failed', error });
    // Keep hasUnsavedChanges = true for retry
  }
}
```

**User Experience**: Show error toast, allow manual retry.

### Server Errors
Flask catches errors and returns 500:

```python
@app.route('/api/files/<file_id>', methods=['PUT'])
def update_file(file_id):
    try:
        # ... save logic
        return jsonify({'status': 'success'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

### Data Corruption
If file is corrupted (invalid JSON):
- Flask logs error and skips file in list
- Client can't load file, shows error message
- Manual intervention required (fix JSON or delete file)

**Future Enhancement**: Automatic backup before save, recovery mechanism.

---

## Performance Considerations

### File Size
- **Empty file**: ~1 KB
- **100 cells**: ~5 KB
- **1000 cells**: ~50 KB
- **10000 cells**: ~500 KB

**Optimization**: For very large files (>1 MB), consider:
- Compression (gzip)
- Incremental saves (only changed cells)
- Pagination (load visible cells first)

### Save Frequency
With 500ms debounce:
- **Heavy editing**: ~2 saves/second max
- **Normal editing**: ~0.5 saves/second
- **Idle**: 0 saves

**Server Load**: Minimal for typical use. For many concurrent users, consider queueing.

### Load Time
- **File list** (GET /api/files): <100ms (scans directory, reads headers)
- **Load file** (GET /api/files/:id): <200ms for 1000-cell file
- **Save file** (PUT /api/files/:id): <100ms for write operation

**Network**: Local server is fast. For remote server, add latency.

---

## Testing Strategy

### Unit Testing FileManager

Test client-side logic in isolation with mock fetch:

```javascript
test('updateCellData marks file as modified', () => {
  const fileManager = new FileManager();
  fileManager.currentFile = { data: { cells: {} } };

  fileManager.updateCellData('B2', 'Test');

  expect(fileManager.hasUnsavedChanges).toBe(true);
  expect(fileManager.currentFile.data.cells['B2'].value).toBe('Test');
});

test('auto-save debouncing works', async () => {
  const fileManager = new FileManager();
  // Mock fetch...

  fileManager.updateCellData('A1', '1');
  await delay(300);  // Less than 500ms
  fileManager.updateCellData('A2', '2');
  await delay(600);  // Total > 500ms

  // Expect only one save API call
  expect(mockFetch).toHaveBeenCalledTimes(1);
});
```

### Testing Flask API

Use pytest with test client:

```python
def test_create_file(client):
    response = client.post('/api/files', json={'name': 'Test'})
    assert response.status_code == 200
    data = response.json
    assert data['name'] == 'Test'
    assert 'id' in data

def test_save_file(client):
    # Create file
    create_resp = client.post('/api/files', json={'name': 'Test'})
    file_id = create_resp.json['id']

    # Update file
    update_resp = client.put(f'/api/files/{file_id}', json={
        'name': 'Updated',
        'data': {'cells': {'A1': {'value': '100'}}}
    })
    assert update_resp.status_code == 200

    # Verify update
    get_resp = client.get(f'/api/files/{file_id}')
    assert get_resp.json['name'] == 'Updated'
    assert get_resp.json['data']['cells']['A1']['value'] == '100'
```

### E2E Testing

See [test-scenarios/](../test-scenarios/) for full test scenarios covering:
- File creation and switching
- Auto-save after edits
- Network error handling
- File deletion and recovery

---

## Future Enhancements

### Possible Improvements

1. **Undo Across Sessions**: Save undo stack to file for persistent history

2. **Collaboration**: Multiple users editing same file
   - WebSocket for real-time updates
   - Operational Transformation for conflict resolution
   - User presence indicators

3. **Version History**: Snapshot files periodically
   - List of saved versions with timestamps
   - Restore to previous version
   - Diff view showing changes

4. **Cloud Storage**: AWS S3, Google Drive, Dropbox integration
   - OAuth authentication
   - Sync files across devices

5. **Export Formats**: Export to Excel, CSV, PDF
   - Preserve formatting
   - Formula compatibility

6. **Import**: Load Excel/CSV files into v-sheet
   - Parse formulas
   - Convert styles

7. **Compression**: Gzip files for faster transfer and smaller storage

8. **Incremental Saves**: Only send changed cells instead of full file
   - Reduces payload size
   - Faster saves for large files

---

## Security Considerations

### Current Implementation
- **No Authentication**: Anyone can access any file (local development only)
- **No Authorization**: No user permissions
- **No Encryption**: Files stored as plain JSON

### Production Requirements
If deploying v-sheet publicly:

1. **Authentication**: User login system (OAuth, JWT)
2. **Authorization**: Files belong to users, access control
3. **HTTPS**: Encrypt data in transit
4. **Input Validation**: Sanitize file names, cell values (prevent XSS, SQL injection)
5. **Rate Limiting**: Prevent abuse (DoS)
6. **Backup**: Regular backups to prevent data loss
7. **CORS**: Restrict origins in production

---

## Summary

File persistence in v-sheet provides:

- **Reliable Auto-Save**: Debounced writes prevent data loss
- **Fast Loading**: JSON format is simple and fast to parse
- **Flyweight Styles**: Memory-efficient formatting storage
- **Graceful Errors**: Network failures handled with retries
- **Recent File Tracking**: Seamless user experience on app open
- **Simple Server**: Flask REST API is easy to understand and extend

**Key Patterns Used**:
- **Client-Server Architecture**: Separation of concerns
- **Flyweight Pattern**: Style deduplication
- **Debouncing**: Reduce API calls
- **Optimistic UI**: Instant feedback
- **Callback Pattern**: Decouple FileManager from UI

This architecture balances **simplicity** (JSON files) with **features** (auto-save, flyweight) and **performance** (debouncing).

---

## Related Files

- **FileManager** (Client): `js/file-manager.js`
- **StyleManager** (Client): `js/StyleManager.js`
- **Flask API** (Server): `server/app.py`
- **Data Directory**: `data/files/` (JSON files)
- **Metadata**: `data/metadata.json` (recent file)
