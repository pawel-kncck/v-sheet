from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
import os
import uuid
from datetime import datetime
from pathlib import Path

app = Flask(__name__)
CORS(app)

# Configuration
DATA_DIR = Path(__file__).parent.parent / 'data'
FILES_DIR = DATA_DIR / 'files'
METADATA_FILE = DATA_DIR / 'metadata.json'

# Ensure directories exist
FILES_DIR.mkdir(parents=True, exist_ok=True)


class FileManager:
    @staticmethod
    def get_all_files():
        """List all spreadsheet files"""
        files = []
        for file_path in FILES_DIR.glob('*.json'):
            try:
                with open(file_path, 'r') as f:
                    file_data = json.load(f)
                    files.append({
                        'id': file_data['id'],
                        'name': file_data['name'],
                        'modified': file_data['modified']
                    })
            except (json.JSONDecodeError, KeyError) as e:
                print(f"Error reading file {file_path}: {e}")
                continue
        return sorted(files, key=lambda x: x['modified'], reverse=True)

    @staticmethod
    def create_file(name="Untitled Spreadsheet"):
        """Create a new spreadsheet file"""
        file_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat() + 'Z'

        file_data = {
            'id': file_id,
            'name': name,
            'created': timestamp,
            'modified': timestamp,
            'data': {
                'cells': {},
                'columnWidths': [94] * 26,  # Default widths
                'rowHeights': [20] * 100,    # Default heights
                'metadata': {
                    'lastActiveCell': 'A1',
                    'selections': []
                }
            }
        }

        file_path = FILES_DIR / f'{file_id}.json'
        with open(file_path, 'w') as f:
            json.dump(file_data, f, indent=2)

        return file_data

    @staticmethod
    def update_recent_file(file_id):
        """Update the most recently accessed file"""
        metadata = {
            'recentFileId': file_id,
            'lastAccessed': datetime.utcnow().isoformat() + 'Z'
        }
        with open(METADATA_FILE, 'w') as f:
            json.dump(metadata, f, indent=2)

    @staticmethod
    def get_recent_file_id():
        """Get the most recently accessed file ID"""
        if not METADATA_FILE.exists():
            return None

        try:
            with open(METADATA_FILE, 'r') as f:
                metadata = json.load(f)
                return metadata.get('recentFileId')
        except (json.JSONDecodeError, FileNotFoundError):
            return None


# API Routes

@app.route('/api/files', methods=['GET'])
def list_files():
    """Get all spreadsheet files"""
    try:
        files = FileManager.get_all_files()
        return jsonify({'files': files}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/files', methods=['POST'])
def create_file():
    """Create a new spreadsheet file"""
    try:
        data = request.json or {}
        name = data.get('name', 'Untitled Spreadsheet')
        file_data = FileManager.create_file(name)
        FileManager.update_recent_file(file_data['id'])
        return jsonify(file_data), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/files/<file_id>', methods=['GET'])
def get_file(file_id):
    """Load a specific file"""
    try:
        file_path = FILES_DIR / f'{file_id}.json'
        if not file_path.exists():
            return jsonify({'error': 'File not found'}), 404

        with open(file_path, 'r') as f:
            file_data = json.load(f)

        FileManager.update_recent_file(file_id)
        return jsonify(file_data), 200
    except json.JSONDecodeError:
        return jsonify({'error': 'Invalid file format'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/files/<file_id>', methods=['PUT'])
def update_file(file_id):
    """Update an existing file (autosave)"""
    try:
        file_path = FILES_DIR / f'{file_id}.json'
        if not file_path.exists():
            return jsonify({'error': 'File not found'}), 404

        # Load existing file
        with open(file_path, 'r') as f:
            file_data = json.load(f)

        # Update with new data
        update_data = request.json
        file_data['modified'] = datetime.utcnow().isoformat() + 'Z'

        # Update specific fields
        if 'name' in update_data:
            file_data['name'] = update_data['name']
        if 'data' in update_data:
            file_data['data'] = update_data['data']

        # Save back to file
        with open(file_path, 'w') as f:
            json.dump(file_data, f, indent=2)

        return jsonify({'success': True, 'modified': file_data['modified']}), 200
    except json.JSONDecodeError:
        return jsonify({'error': 'Invalid JSON in request'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/files/<file_id>', methods=['DELETE'])
def delete_file(file_id):
    """Delete a file"""
    try:
        file_path = FILES_DIR / f'{file_id}.json'
        if not file_path.exists():
            return jsonify({'error': 'File not found'}), 404

        # Check if this is the recent file
        recent_file_id = FileManager.get_recent_file_id()

        # Delete the file
        file_path.unlink()

        # If we deleted the recent file, clear the metadata or set a new recent file
        if recent_file_id == file_id:
            remaining_files = FileManager.get_all_files()
            if remaining_files:
                # Set the most recently modified file as the new recent file
                FileManager.update_recent_file(remaining_files[0]['id'])
            else:
                # No files left, clear the metadata
                if METADATA_FILE.exists():
                    METADATA_FILE.unlink()

        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/recent', methods=['GET'])
def get_recent_file():
    """Get the most recently accessed file ID"""
    try:
        recent_file_id = FileManager.get_recent_file_id()

        if recent_file_id:
            # Verify the file still exists
            file_path = FILES_DIR / f'{recent_file_id}.json'
            if file_path.exists():
                return jsonify({'recentFileId': recent_file_id}), 200

        # No recent file or it doesn't exist, check for any existing files
        existing_files = FileManager.get_all_files()

        if existing_files:
            # Use the most recently modified file
            recent_file_id = existing_files[0]['id']
            FileManager.update_recent_file(recent_file_id)
            return jsonify({'recentFileId': recent_file_id}), 200
        else:
            # No files exist, create a default one
            file_data = FileManager.create_file("My First Spreadsheet")
            FileManager.update_recent_file(file_data['id'])
            return jsonify({'recentFileId': file_data['id']}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Serve static files for development
@app.route('/')
def serve_index():
    """Serve the main index.html file"""
    return send_from_directory('..', 'index.html')


@app.route('/css/<path:path>')
def serve_css(path):
    """Serve CSS files"""
    return send_from_directory('../css', path)


@app.route('/js/<path:path>')
def serve_js(path):
    """Serve JavaScript files"""
    return send_from_directory('../js', path)


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'v-sheet-backend'}), 200


@app.route('/test-history-manual.html')
def serve_test():
    """Serve the test file"""
    return send_from_directory('..', 'test-history-manual.html')


if __name__ == '__main__':
    print(f"Data directory: {DATA_DIR}")
    print(f"Files will be stored in: {FILES_DIR}")
    print("Starting Flask server on http://localhost:5000")
    app.run(debug=True, port=5000)
