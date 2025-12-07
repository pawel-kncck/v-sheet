# REST API Reference

**Last Updated**: 2025-12-07

This document describes the v-sheet Flask REST API for file management and persistence.

**Base URL**: `http://localhost:5000`

**Related Documents**:
- System Overview: `/docs/architecture/00-system-overview.md`
- File Persistence Architecture: `/docs/architecture/05-file-persistence.md`

---

## API Overview

The v-sheet backend provides a RESTful API for managing spreadsheet files. All data is stored as JSON files in the `data/files/` directory.

### Core Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/files` | List all spreadsheet files |
| POST | `/api/files` | Create new spreadsheet |
| GET | `/api/files/<id>` | Load specific spreadsheet |
| PUT | `/api/files/<id>` | Update spreadsheet (autosave) |
| DELETE | `/api/files/<id>` | Delete spreadsheet |
| GET | `/api/recent` | Get most recently accessed file |
| GET | `/health` | Health check |

---

## Authentication

**Current Status**: No authentication required (development mode)

**Future Consideration**: OAuth2 or JWT authentication for production deployment

---

## Common Response Codes

| Code | Status | Meaning |
|------|--------|---------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid JSON or malformed request |
| 404 | Not Found | File does not exist |
| 500 | Internal Server Error | Server-side error occurred |

---

## Error Response Format

All endpoints return errors in this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

**Example**:
```json
{
  "error": "File not found"
}
```

---

## Endpoints

### 1. List All Files

**GET** `/api/files`

Lists all spreadsheet files, sorted by most recently modified first.

#### Request

No parameters required.

```bash
curl http://localhost:5000/api/files
```

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "files": [
    {
      "id": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
      "name": "Budget 2024",
      "modified": "2024-12-07T15:30:00.000Z"
    },
    {
      "id": "f4e3d2c1-b0a9-8765-4321-0fedcba98765",
      "name": "Sales Report",
      "modified": "2024-12-06T10:15:00.000Z"
    }
  ]
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `files` | Array | List of file metadata objects |
| `files[].id` | String (UUID) | Unique file identifier |
| `files[].name` | String | User-friendly file name |
| `files[].modified` | String (ISO 8601) | Last modification timestamp |

#### Error Responses

**500 Internal Server Error**:
```json
{
  "error": "Error reading files directory"
}
```

---

### 2. Create New File

**POST** `/api/files`

Creates a new spreadsheet file with empty data.

#### Request

**Headers**:
```
Content-Type: application/json
```

**Body** (optional):
```json
{
  "name": "My New Spreadsheet"
}
```

If no body provided, defaults to "Untitled Spreadsheet".

**Example**:
```bash
curl -X POST http://localhost:5000/api/files \
  -H "Content-Type: application/json" \
  -d '{"name": "Q4 Budget"}'
```

#### Response

**Status**: `201 Created`

**Body**:
```json
{
  "id": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
  "name": "Q4 Budget",
  "created": "2024-12-07T15:30:00.000Z",
  "modified": "2024-12-07T15:30:00.000Z",
  "data": {
    "cells": {},
    "styles": {},
    "columnWidths": [94, 94, 94, ...],  // 26 columns
    "rowHeights": [20, 20, 20, ...],    // 100 rows
    "metadata": {
      "lastActiveCell": "A1",
      "selections": []
    }
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (UUID) | Unique file identifier |
| `name` | String | File name |
| `created` | String (ISO 8601) | Creation timestamp |
| `modified` | String (ISO 8601) | Last modification timestamp |
| `data` | Object | Spreadsheet data |
| `data.cells` | Object | Cell values and formulas (empty on creation) |
| `data.styles` | Object | Style palette (empty on creation) |
| `data.columnWidths` | Array[Number] | Width in pixels for each column (default 94) |
| `data.rowHeights` | Array[Number] | Height in pixels for each row (default 20) |
| `data.metadata` | Object | Additional metadata |
| `data.metadata.lastActiveCell` | String | Last selected cell (default "A1") |
| `data.metadata.selections` | Array | Selection ranges (empty on creation) |

#### Side Effects

- File is created in `data/files/<id>.json`
- File is set as the most recently accessed file
- Metadata file `data/metadata.json` is updated

#### Error Responses

**500 Internal Server Error**:
```json
{
  "error": "Failed to create file"
}
```

---

### 3. Load Specific File

**GET** `/api/files/<file_id>`

Loads the complete data for a specific spreadsheet file.

#### Request

**Path Parameters**:
- `file_id` (String, UUID): File identifier

**Example**:
```bash
curl http://localhost:5000/api/files/a1b2c3d4-5678-90ab-cdef-1234567890ab
```

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "id": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
  "name": "Budget 2024",
  "created": "2024-11-15T10:00:00.000Z",
  "modified": "2024-12-07T15:30:00.000Z",
  "data": {
    "cells": {
      "A1": {"value": "Revenue", "formula": null},
      "B1": {"value": 10000, "formula": null},
      "C1": {"value": 12000, "formula": "=B1*1.2"}
    },
    "styles": {},
    "columnWidths": [100, 94, 94, ...],
    "rowHeights": [20, 20, 20, ...],
    "metadata": {
      "lastActiveCell": "C1",
      "selections": []
    }
  }
}
```

#### Cell Object Format

```json
{
  "A1": {
    "value": 100,           // Computed value (number, string, or error)
    "formula": "=B1+C1"     // Formula string (null if not a formula)
  }
}
```

**Notes**:
- `value`: The displayed/computed value
- `formula`: Only present if cell contains a formula, otherwise `null`
- For formula cells, `value` is the calculated result
- For value cells, `value` is the user-entered content

#### Side Effects

- File is marked as the most recently accessed file
- Metadata file `data/metadata.json` is updated

#### Error Responses

**404 Not Found**:
```json
{
  "error": "File not found"
}
```

**500 Internal Server Error** (corrupt file):
```json
{
  "error": "Invalid file format"
}
```

---

### 4. Update File (Autosave)

**PUT** `/api/files/<file_id>`

Updates an existing spreadsheet file. Used for autosave operations.

#### Request

**Path Parameters**:
- `file_id` (String, UUID): File identifier

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "name": "Budget 2024 Updated",
  "data": {
    "cells": {
      "A1": {"value": "Revenue", "formula": null},
      "B1": {"value": 15000, "formula": null},
      "C1": {"value": 18000, "formula": "=B1*1.2"}
    },
    "styles": {},
    "columnWidths": [100, 94, 94, ...],
    "rowHeights": [20, 25, 20, ...],
    "metadata": {
      "lastActiveCell": "B1",
      "selections": []
    }
  }
}
```

**Example**:
```bash
curl -X PUT http://localhost:5000/api/files/a1b2c3d4-5678-90ab-cdef-1234567890ab \
  -H "Content-Type: application/json" \
  -d '{"data": { ... }}'
```

#### Request Body Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | String | No | New file name (if renaming) |
| `data` | Object | No | Complete spreadsheet data |
| `data.cells` | Object | No | All cell values and formulas |
| `data.columnWidths` | Array[Number] | No | Column widths in pixels |
| `data.rowHeights` | Array[Number] | No | Row heights in pixels |
| `data.metadata` | Object | No | Additional metadata |

**Note**: Only provided fields are updated. Omitted fields are preserved from the existing file.

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "success": true,
  "modified": "2024-12-07T16:45:00.000Z"
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | Boolean | Always `true` on success |
| `modified` | String (ISO 8601) | New modification timestamp |

#### Side Effects

- File is overwritten on disk
- `modified` timestamp is updated automatically
- Original `created` timestamp is preserved

#### Error Responses

**404 Not Found**:
```json
{
  "error": "File not found"
}
```

**400 Bad Request** (malformed JSON):
```json
{
  "error": "Invalid JSON in request"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Failed to save file"
}
```

---

### 5. Delete File

**DELETE** `/api/files/<file_id>`

Permanently deletes a spreadsheet file.

#### Request

**Path Parameters**:
- `file_id` (String, UUID): File identifier

**Example**:
```bash
curl -X DELETE http://localhost:5000/api/files/a1b2c3d4-5678-90ab-cdef-1234567890ab
```

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "success": true
}
```

#### Side Effects

- File is permanently deleted from `data/files/`
- If deleted file was the most recent file:
  - Next most recent file becomes the new recent file
  - OR metadata file is cleared if no files remain

#### Error Responses

**404 Not Found**:
```json
{
  "error": "File not found"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Failed to delete file"
}
```

---

### 6. Get Recent File

**GET** `/api/recent`

Returns the ID of the most recently accessed spreadsheet file. If no files exist, creates a default file.

#### Request

No parameters required.

```bash
curl http://localhost:5000/api/recent
```

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "recentFileId": "a1b2c3d4-5678-90ab-cdef-1234567890ab"
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `recentFileId` | String (UUID) | ID of most recently accessed file |

#### Behavior Logic

1. **Recent file exists and is valid** → Return its ID
2. **Recent file doesn't exist or invalid** → Check for any existing files:
   - If files exist → Return most recently modified file's ID
   - If no files exist → Create default file "My First Spreadsheet" and return its ID

**Result**: This endpoint always returns a valid file ID (creates one if necessary).

#### Side Effects

- If no files exist, a new default file is created
- The returned file is marked as most recently accessed
- Metadata file `data/metadata.json` is updated

#### Error Responses

**500 Internal Server Error**:
```json
{
  "error": "Failed to determine recent file"
}
```

---

### 7. Health Check

**GET** `/health`

Health check endpoint for monitoring and E2E test setup.

#### Request

No parameters required.

```bash
curl http://localhost:5000/health
```

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "status": "healthy",
  "service": "v-sheet-backend"
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | String | Always "healthy" if server is running |
| `service` | String | Service identifier |

**Usage**: E2E tests use this endpoint to verify the server is ready before running tests.

---

## Data Storage Format

### File Structure

Each spreadsheet is stored as a JSON file in `data/files/<uuid>.json`:

```json
{
  "id": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
  "name": "Budget 2024",
  "created": "2024-11-15T10:00:00.000Z",
  "modified": "2024-12-07T15:30:00.000Z",
  "data": {
    "cells": {
      "A1": {"value": "Revenue", "formula": null},
      "B1": {"value": 10000, "formula": null},
      "C1": {"value": 12000, "formula": "=B1*1.2"}
    },
    "styles": {},
    "columnWidths": [94, 94, 94, ...],  // Array of 26 numbers
    "rowHeights": [20, 20, 20, ...],    // Array of 100 numbers
    "metadata": {
      "lastActiveCell": "A1",
      "selections": []
    }
  }
}
```

### Metadata File

Global metadata is stored in `data/metadata.json`:

```json
{
  "recentFileId": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
  "lastAccessed": "2024-12-07T15:30:00.000Z"
}
```

---

## Client Integration

### Client-Side API Wrapper

The client uses `file-manager.js` as an API wrapper:

```javascript
// Load file
const fileData = await FileManager.loadFile(fileId);

// Save file (autosave)
await FileManager.saveFile(fileId, {
  name: 'Updated Name',
  data: { cells: {...}, columnWidths: [...], ... }
});

// Create new file
const newFile = await FileManager.createFile('My Spreadsheet');

// Delete file
await FileManager.deleteFile(fileId);
```

### Autosave Behavior

- Triggered automatically 500ms after cell changes
- Debounced to avoid excessive API calls
- Only sends changed data, not entire file
- Runs in background (non-blocking)

---

## CORS Configuration

CORS is enabled for all origins (development mode):

```python
from flask_cors import CORS
app = Flask(__name__)
CORS(app)
```

**Production Note**: Restrict CORS origins for security.

---

## Rate Limiting

**Current Status**: No rate limiting

**Recommendation for Production**:
- Implement rate limiting (e.g., 100 requests/minute per IP)
- Use Flask-Limiter or similar middleware

---

## Pagination

**Current Implementation**: No pagination

**Future Consideration**:
- Add pagination to `GET /api/files` for large file lists
- Query parameters: `?page=1&limit=50`

---

## Timestamps

All timestamps follow **ISO 8601** format in UTC:

```
2024-12-07T15:30:00.000Z
```

**Format**: `YYYY-MM-DDTHH:mm:ss.sssZ`

---

## Example Workflows

### Complete File Lifecycle

#### 1. Create New File
```bash
POST /api/files
{"name": "Sales Report"}

Response:
{
  "id": "abc-123",
  "name": "Sales Report",
  "created": "2024-12-07T15:00:00Z",
  "modified": "2024-12-07T15:00:00Z",
  "data": { ... }
}
```

#### 2. Load File on App Start
```bash
GET /api/recent

Response:
{"recentFileId": "abc-123"}

Then:
GET /api/files/abc-123

Response:
{
  "id": "abc-123",
  "name": "Sales Report",
  "data": { ... }
}
```

#### 3. User Edits Cell (Autosave)
```bash
PUT /api/files/abc-123
{
  "data": {
    "cells": {
      "A1": {"value": "Total", "formula": null},
      "B1": {"value": 5000, "formula": null}
    },
    ...
  }
}

Response:
{
  "success": true,
  "modified": "2024-12-07T15:05:00Z"
}
```

#### 4. List All Files
```bash
GET /api/files

Response:
{
  "files": [
    {"id": "abc-123", "name": "Sales Report", "modified": "2024-12-07T15:05:00Z"},
    {"id": "def-456", "name": "Budget", "modified": "2024-12-06T10:00:00Z"}
  ]
}
```

#### 5. Delete File
```bash
DELETE /api/files/abc-123

Response:
{"success": true}
```

---

## Error Handling Best Practices

### Client-Side Error Handling

```javascript
try {
  const response = await fetch(`/api/files/${fileId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('API Error:', error.error);
    // Handle error (show user notification, etc.)
    return;
  }

  const data = await response.json();
  // Use data
} catch (err) {
  console.error('Network Error:', err);
  // Handle network failure
}
```

### Common Error Scenarios

| Scenario | Status | Action |
|----------|--------|--------|
| File deleted by another user | 404 | Reload file list, notify user |
| Network offline | Network Error | Queue changes, retry on reconnect |
| Malformed data | 400 | Fix data validation, retry |
| Server crash | 500 | Show error, suggest refresh |

---

## Testing the API

### Manual Testing with curl

```bash
# Health check
curl http://localhost:5000/health

# Create file
curl -X POST http://localhost:5000/api/files \
  -H "Content-Type: application/json" \
  -d '{"name": "Test File"}'

# List files
curl http://localhost:5000/api/files

# Load file (replace with actual ID)
curl http://localhost:5000/api/files/abc-123

# Update file
curl -X PUT http://localhost:5000/api/files/abc-123 \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'

# Delete file
curl -X DELETE http://localhost:5000/api/files/abc-123
```

### Automated Testing

E2E tests (Playwright) automatically start/stop the Flask server:

```javascript
// playwright.config.js
webServer: {
  command: 'python server/app.py',
  port: 5000,
  timeout: 120000,
  reuseExistingServer: !process.env.CI
}
```

---

## Security Considerations

### Current Security Status (Development)

- ✅ CORS enabled (all origins)
- ✅ JSON input validation
- ❌ No authentication
- ❌ No rate limiting
- ❌ No input sanitization beyond JSON parsing
- ❌ Files accessible to anyone with server access

### Production Security Checklist

- [ ] Implement authentication (OAuth2/JWT)
- [ ] Restrict CORS to specific origins
- [ ] Add rate limiting
- [ ] Implement input validation and sanitization
- [ ] Add file access permissions (user ownership)
- [ ] Use HTTPS
- [ ] Add request logging and monitoring
- [ ] Implement file size limits
- [ ] Add malware scanning for file uploads
- [ ] Use environment variables for configuration

---

## See Also

- **System Overview**: `/docs/architecture/00-system-overview.md`
- **Worker Protocol**: `/docs/api-reference/worker-protocol.md`
- **File Persistence Architecture**: `/docs/architecture/05-file-persistence.md`
- **Source Code**: `server/app.py`, `js/file-manager.js`
