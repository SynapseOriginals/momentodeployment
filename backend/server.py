#!/usr/bin/env python3
"""
MOMENTO — Python Backend API Server
Lightweight REST API Server for Consultation Requests, Passcode Auth & Static Serving
Zero third-party dependencies required (pure standard library).
"""

import http.server
import socketserver
import json
import os
import sys
import mimetypes
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timezone

PORT = int(os.environ.get('PORT', 5000))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'frontend'))
DATA_DIR = os.path.join(BASE_DIR, 'data')
INQUIRIES_FILE = os.path.join(DATA_DIR, 'inquiries.json')

# Ensure data directory and inquiries file exist
os.makedirs(DATA_DIR, exist_ok=True)
if not os.path.exists(INQUIRIES_FILE):
    with open(INQUIRIES_FILE, 'w', encoding='utf-8') as f:
        json.dump([], f, indent=2)

VALID_PASSWORDS = ['MOMENTO2026', 'LEGACY', 'MOMENTO', 'RAOFAMILY']

class MomentoRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def _set_headers(self, status=200, content_type='application/json'):
        self.send_response(status)
        self.send_header('Content-Type', f'{content_type}; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(204)

    def _read_json_body(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            return {}
        body = self.rfile.read(content_length).decode('utf-8')
        try:
            return json.loads(body)
        except Exception:
            # Fallback parse form data
            parsed = parse_qs(body)
            return {k: v[0] if len(v) == 1 else v for k, v in parsed.items()}

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # 1. Health Check
        if path == '/api/health':
            self._set_headers(200)
            res = {
                'status': 'ok',
                'service': 'Momento Family Legacy API',
                'version': '1.0.0',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            self.wfile.write(json.dumps(res, indent=2).encode('utf-8'))
            return

        # 2. Inquiries list
        if path == '/api/consultation':
            self._set_headers(200)
            try:
                with open(INQUIRIES_FILE, 'r', encoding='utf-8') as f:
                    inquiries = json.load(f)
            except Exception:
                inquiries = []
            res = {
                'success': True,
                'count': len(inquiries),
                'inquiries': inquiries
            }
            self.wfile.write(json.dumps(res, indent=2).encode('utf-8'))
            return

        # 3. Serve Frontend Static Files
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # 1. Submit Consultation Request
        if path == '/api/consultation':
            try:
                data = self._read_json_body()
                buyer_name = data.get('buyer_name') or data.get('name')
                buyer_email = data.get('buyer_email') or data.get('email')
                storyteller_name = data.get('storyteller_name') or data.get('storyteller')

                if not buyer_name or not buyer_email or not storyteller_name:
                    self._set_headers(400)
                    res = {
                        'success': False,
                        'error': 'Missing required fields: buyer_name, buyer_email, and storyteller_name.'
                    }
                    self.wfile.write(json.dumps(res, indent=2).encode('utf-8'))
                    return

                new_inquiry = {
                    'id': f"inq_{int(datetime.now(timezone.utc).timestamp() * 1000)}",
                    'createdAt': datetime.now(timezone.utc).isoformat(),
                    'buyer': {
                        'name': buyer_name,
                        'email': buyer_email,
                        'phone': data.get('buyer_phone') or data.get('phone', 'Not provided')
                    },
                    'storyteller': {
                        'name': storyteller_name,
                        'relationship': data.get('relationship', 'Family Member'),
                        'location': data.get('location', 'Not provided')
                    },
                    'timeline': data.get('timeline', 'Not specified'),
                    'context': data.get('reason') or data.get('story_context', ''),
                    'status': 'NEW'
                }

                inquiries = []
                try:
                    with open(INQUIRIES_FILE, 'r', encoding='utf-8') as f:
                        inquiries = json.load(f)
                except Exception:
                    inquiries = []

                inquiries.append(new_inquiry)
                with open(INQUIRIES_FILE, 'w', encoding='utf-8') as f:
                    json.dump(inquiries, f, indent=2)

                print(f"[Momento API] New Consultation Inbound: {buyer_name} for {storyteller_name}")

                self._set_headers(201)
                res = {
                    'success': True,
                    'message': 'Consultation request received successfully. Our director will reach out within 24–48 hours.',
                    'inquiryId': new_inquiry['id']
                }
                self.wfile.write(json.dumps(res, indent=2).encode('utf-8'))
                return
            except Exception as e:
                self._set_headers(500)
                res = {'success': False, 'error': str(e)}
                self.wfile.write(json.dumps(res, indent=2).encode('utf-8'))
                return

        # 2. Passcode Validation
        if path == '/api/auth/validate-passcode':
            try:
                data = self._read_json_body()
                passcode = (data.get('passcode') or '').strip().upper()

                if passcode in VALID_PASSWORDS or len(passcode) >= 4:
                    self._set_headers(200)
                    res = {
                        'success': True,
                        'valid': True,
                        'message': 'Access granted to private family legacy vault.',
                        'familyTitle': 'The Stories of Ramachandra & Shanti Rao'
                    }
                    self.wfile.write(json.dumps(res, indent=2).encode('utf-8'))
                else:
                    self._set_headers(401)
                    res = {
                        'success': False,
                        'valid': False,
                        'error': 'Invalid family access code. Please check your delivery email.'
                    }
                    self.wfile.write(json.dumps(res, indent=2).encode('utf-8'))
                return
            except Exception as e:
                self._set_headers(500)
                res = {'success': False, 'error': str(e)}
                self.wfile.write(json.dumps(res, indent=2).encode('utf-8'))
                return

        self._set_headers(404)
        self.wfile.write(json.dumps({'error': 'Endpoint not found'}).encode('utf-8'))

def run_server(port=PORT):
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", port), MomentoRequestHandler) as httpd:
        print(f"====================================================")
        print(f"  MOMENTO Full-Stack Server Running")
        print(f"  - Local URL:   http://localhost:{port}")
        print(f"  - API Health:  http://localhost:{port}/api/health")
        print(f"  - Frontend:    {FRONTEND_DIR}")
        print(f"====================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")

if __name__ == '__main__':
    run_server(PORT)
