#!/usr/bin/env python3
"""
DuoTrack Sync Server
Serves static frontend files and synchronizes habit checkins, activities, and profiles
between friends in real-time.
"""

import os
import json
import mimetypes
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

PORT = int(os.environ.get('PORT', 8000))
DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'duotrack_db.json')

DEFAULT_DATA = {
    "profiles": {
        "u1": {"id": "u1", "name": "You", "avatar": "🚀"},
        "u2": {"id": "u2", "name": "Friend", "avatar": "🎯"}
    },
    "activities": [
        {
            "id": "act_1",
            "title": "Morning Workout / 30m Walk",
            "category": "fitness",
            "icon": "🏃‍♂️",
            "desc": "At least 30 mins cardio or strength",
            "createdAt": "2026-01-01"
        },
        {
            "id": "act_2",
            "title": "Read 20 Pages",
            "category": "learning",
            "icon": "📚",
            "desc": "Non-fiction book or tech articles",
            "createdAt": "2026-01-01"
        },
        {
            "id": "act_3",
            "title": "Drink 2.5L Water",
            "category": "lifestyle",
            "icon": "💧",
            "desc": "Stay hydrated throughout the day",
            "createdAt": "2026-01-01"
        },
        {
            "id": "act_4",
            "title": "1 Hour Deep Work / Skill Building",
            "category": "productivity",
            "icon": "⚡",
            "desc": "No phone distractions",
            "createdAt": "2026-01-01"
        }
    ],
    "checkins": {}
}

def load_data():
    if not os.path.exists(DATA_FILE):
        save_data(DEFAULT_DATA)
        return DEFAULT_DATA
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {DATA_FILE}: {e}")
        return DEFAULT_DATA

def save_data(data):
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving {DATA_FILE}: {e}")

class DuoTrackHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == '/api/data':
            data = load_data()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.end_headers()
            self.wfile.write(json.dumps(data).encode('utf-8'))
            return

        # Serve static files
        if path in ('/', ''):
            path = '/index.html'

        file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), path.lstrip('/'))

        if os.path.isfile(file_path):
            mime_type, _ = mimetypes.guess_type(file_path)
            if not mime_type:
                mime_type = 'text/plain'
            if mime_type.startswith('text/') or mime_type in ('application/javascript', 'application/json'):
                mime_type += '; charset=utf-8'

            self.send_response(200)
            self.send_header('Content-Type', mime_type)
            self.end_headers()
            with open(file_path, 'rb') as f:
                self.wfile.write(f.read())
        else:
            self.send_response(404)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'404 Not Found')

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        content_len = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_len).decode('utf-8') if content_len > 0 else '{}'
        try:
            payload = json.loads(body)
        except Exception:
            payload = {}

        data = load_data()

        if path == '/api/check':
            date_key = payload.get('date')
            act_id = payload.get('activityId')
            user_key = payload.get('user')
            checked = bool(payload.get('checked'))

            if date_key and act_id and user_key:
                if date_key not in data['checkins']:
                    data['checkins'][date_key] = {}
                if act_id not in data['checkins'][date_key]:
                    data['checkins'][date_key][act_id] = {'u1': False, 'u2': False}
                data['checkins'][date_key][act_id][user_key] = checked
                save_data(data)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({"ok": True, "data": data}).encode('utf-8'))
            return

        elif path == '/api/sync':
            # Full sync update
            if 'profiles' in payload:
                data['profiles'] = payload['profiles']
            if 'activities' in payload:
                data['activities'] = payload['activities']
            if 'checkins' in payload:
                data['checkins'] = payload['checkins']
            save_data(data)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({"ok": True, "data": data}).encode('utf-8'))
            return

        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"error": "Unknown endpoint"}')

    def log_message(self, format, *args):
        # Keep logs clean
        pass

if __name__ == '__main__':
    load_data()
    server = HTTPServer(('0.0.0.0', PORT), DuoTrackHandler)
    print(f"DuoTrack Server running at http://localhost:{PORT}")
    server.serve_forever()
