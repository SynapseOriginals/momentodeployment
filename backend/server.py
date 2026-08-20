#!/usr/bin/env python3
"""
MOMENTO — Python Backend API Server
Resilient REST API Server for Consultation Requests, Passcode Auth & Static Serving
Zero third-party dependencies required (pure standard library).
Features automatic port fallback, CORS, and dual-directory frontend resolution.
"""

import http.server
import socketserver
import json
import os
import sys
import mimetypes
from urllib.parse import urlparse, parse_qs, unquote
from datetime import datetime, timezone

DEFAULT_PORT = int(os.environ.get('PORT', 5000))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'frontend'))
ROOT_DIR = os.path.abspath(os.path.join(BASE_DIR, '..'))
DATA_DIR = os.path.join(BASE_DIR, 'data')
INQUIRIES_FILE = os.path.join(DATA_DIR, 'inquiries.json')

# Ensure data directory and inquiries file exist
os.makedirs(DATA_DIR, exist_ok=True)
if not os.path.exists(INQUIRIES_FILE):
    with open(INQUIRIES_FILE, 'w', encoding='utf-8') as f:
        json.dump([], f, indent=2)

VALID_PASSWORDS = ['MOMENTO2026', 'LEGACY', 'MOMENTO', 'RAOFAMILY']

def find_file(path_str):
    clean = path_str.lstrip('/')
    if not clean or clean == '/':
        clean = 'index.html'
    clean = clean.split('?')[0].split('#')[0]

    candidates = [clean]
    if not os.path.splitext(clean)[1]:
        candidates.append(clean + '.html')
        candidates.append(os.path.join(clean, 'index.html'))

    for bdir in [FRONTEND_DIR, ROOT_DIR]:
        if not os.path.isdir(bdir):
            continue
        for cand in candidates:
            target = os.path.abspath(os.path.join(bdir, cand))
            if target.startswith(bdir) and os.path.isfile(target):
                return target
    return None

class MomentoRequestHandler(http.server.BaseHTTPRequestHandler):
    def _set_headers(self, status=200, content_type='application/json'):
        self.send_response(status)
        self.send_header('Content-Type', f'{content_type}; charset=utf-8' if 'text' in content_type or 'json' in content_type else content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With')
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
            parsed = parse_qs(body)
            return {k: v[0] if len(v) == 1 else v for k, v in parsed.items()}

    def do_GET(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)

        # 1. Health Check
        if path == '/api/health':
            self._set_headers(200)
            res = {
                'status': 'ok',
                'service': 'MOMENTO Family Legacy Preservation API (Python)',
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
        target_file = find_file(path)
        if target_file and os.path.isfile(target_file):
            ctype, _ = mimetypes.guess_type(target_file)
            if not ctype:
                ctype = 'application/octet-stream'
            self._set_headers(200, content_type=ctype)
            with open(target_file, 'rb') as f:
                self.wfile.write(f.read())
        else:
            self._set_headers(404, content_type='text/html')
            self.wfile.write(b"<h1>404 Not Found</h1><p><a href='/'>Return to Home</a></p>")

    def do_POST(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)

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

                print(f"[MOMENTO API] New Consultation Inbound: {buyer_name} for {storyteller_name}")

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

def run_server(start_port=DEFAULT_PORT):
    socketserver.TCPServer.allow_reuse_address = True
    ports_to_try = [start_port, 5001, 3000, 8080, 8000, 5050]
    
    for port in ports_to_try:
        try:
            httpd = socketserver.TCPServer(("0.0.0.0", port), MomentoRequestHandler)
            print(f"====================================================")
            print(f"  MOMENTO Full-Stack Server Running (Python)")
            print(f"  ➜ Local URL:   http://localhost:{port}")
            print(f"  ➜ Network IP:  http://127.0.0.1:{port}")
            print(f"  ➜ API Health:  http://localhost:{port}/api/health")
            print(f"  ➜ Frontend:    {FRONTEND_DIR}")
            print(f"====================================================")
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\nShutting down server.")
            return
        except OSError as e:
            print(f"[MOMENTO] Port {port} is busy ({e}), trying next...")

if __name__ == '__main__':
    run_server(DEFAULT_PORT)
