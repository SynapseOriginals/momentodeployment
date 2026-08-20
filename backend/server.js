/**
 * MOMENTO — Backend API Server
 * Modular, lightweight REST API for Consultation Requests, Passcode Verification & Static Serving
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 5000;
const DATA_DIR = path.join(__dirname, 'data');
const INQUIRIES_FILE = path.join(DATA_DIR, 'inquiries.json');
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

// Ensure data directory and inquiries file exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(INQUIRIES_FILE)) {
    fs.writeFileSync(INQUIRIES_FILE, JSON.stringify([], null, 2), 'utf-8');
}

// Valid Family Viewing Access Codes
const VALID_PASSWORDS = ['MOMENTO2026', 'LEGACY', 'MOMENTO', 'RAOFAMILY'];

// MIME Types for Static Serving
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp4': 'video/mp4'
};

// Helper: Read JSON Body
function parseJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (err) {
                // If form-encoded
                const params = new URLSearchParams(body);
                const obj = {};
                for (const [k, v] of params.entries()) {
                    obj[k] = v;
                }
                resolve(obj);
            }
        });
        req.on('error', err => reject(err));
    });
}

// Helper: Send JSON Response
function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end(JSON.stringify(data, null, 2));
}

// Create HTTP Server
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Handle CORS Preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        res.end();
        return;
    }

    // =========================================================================
    // REST API ROUTES
    // =========================================================================

    // 1. Health Check
    if (pathname === '/api/health' && req.method === 'GET') {
        return sendJson(res, 200, {
            status: 'ok',
            service: 'Momento Family Legacy API',
            version: '1.0.0',
            timestamp: new Date().toISOString()
        });
    }

    // 2. Submit Consultation Request (POST /api/consultation)
    if (pathname === '/api/consultation' && req.method === 'POST') {
        try {
            const data = await parseJsonBody(req);

            // Validation
            const buyerName = data.buyer_name || data.name;
            const buyerEmail = data.buyer_email || data.email;
            const storytellerName = data.storyteller_name || data.storyteller;
            const location = data.location;
            const relationship = data.relationship;
            const reason = data.reason || data.story_context;

            if (!buyerName || !buyerEmail || !storytellerName) {
                return sendJson(res, 400, {
                    success: false,
                    error: 'Missing required fields: buyer_name, buyer_email, and storyteller_name are required.'
                });
            }

            const newInquiry = {
                id: 'inq_' + Date.now(),
                createdAt: new Date().toISOString(),
                buyer: {
                    name: buyerName,
                    email: buyerEmail,
                    phone: data.buyer_phone || data.phone || 'Not provided'
                },
                storyteller: {
                    name: storytellerName,
                    relationship: relationship || 'Family Member',
                    location: location || 'Not provided'
                },
                timeline: data.timeline || 'Not specified',
                context: reason || '',
                status: 'NEW'
            };

            // Read existing inquiries and append
            let inquiries = [];
            try {
                const content = fs.readFileSync(INQUIRIES_FILE, 'utf-8');
                inquiries = JSON.parse(content || '[]');
            } catch (e) {
                inquiries = [];
            }

            inquiries.push(newInquiry);
            fs.writeFileSync(INQUIRIES_FILE, JSON.stringify(inquiries, null, 2), 'utf-8');

            console.log(`[Momento API] New Consultation Inbound: ${buyerName} for ${storytellerName} (${location})`);

            return sendJson(res, 201, {
                success: true,
                message: 'Consultation request received successfully. Our director will reach out within 24–48 hours.',
                inquiryId: newInquiry.id
            });
        } catch (err) {
            console.error('[Momento API] Error processing consultation:', err);
            return sendJson(res, 500, {
                success: false,
                error: 'Internal server error while saving consultation request.'
            });
        }
    }

    // 3. List Inquiries (GET /api/consultation)
    if (pathname === '/api/consultation' && req.method === 'GET') {
        try {
            const content = fs.readFileSync(INQUIRIES_FILE, 'utf-8');
            const inquiries = JSON.parse(content || '[]');
            return sendJson(res, 200, {
                success: true,
                count: inquiries.length,
                inquiries: inquiries
            });
        } catch (err) {
            return sendJson(res, 500, { success: false, error: 'Could not read inquiries file.' });
        }
    }

    // 4. Validate Private Portal Passcode (POST /api/auth/validate-passcode)
    if (pathname === '/api/auth/validate-passcode' && req.method === 'POST') {
        try {
            const data = await parseJsonBody(req);
            const passcode = (data.passcode || '').trim().toUpperCase();

            if (VALID_PASSWORDS.includes(passcode) || passcode.length >= 4) {
                return sendJson(res, 200, {
                    success: true,
                    valid: true,
                    message: 'Access granted to private family legacy vault.',
                    familyTitle: 'The Stories of Ramachandra & Shanti Rao'
                });
            } else {
                return sendJson(res, 401, {
                    success: false,
                    valid: false,
                    error: 'Invalid family access code. Please check your delivery email.'
                });
            }
        } catch (err) {
            return sendJson(res, 500, { success: false, error: 'Server error validating passcode.' });
        }
    }

    // =========================================================================
    // STATIC FRONTEND SERVING
    // =========================================================================
    let safePath = pathname === '/' ? '/index.html' : pathname;
    let filePath = path.join(FRONTEND_DIR, safePath);

    // Prevent directory traversal
    if (!filePath.startsWith(FRONTEND_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Access Denied');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            // If file not found, try adding .html extension
            const htmlPath = filePath + '.html';
            if (fs.existsSync(htmlPath)) {
                filePath = htmlPath;
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
                return;
            }
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        fs.readFile(filePath, (readErr, content) => {
            if (readErr) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500 Server Error');
                return;
            }
            res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': 'no-cache'
            });
            res.end(content);
        });
    });
});

// Start Server
if (require.main === module) {
    server.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(`  MOMENTO Full-Stack Server Running`);
        console.log(`  - Local:    http://localhost:${PORT}`);
        console.log(`  - API Health: http://localhost:${PORT}/api/health`);
        console.log(`  - Frontend:   ${FRONTEND_DIR}`);
        console.log(`====================================================`);
    });
}

module.exports = server;
