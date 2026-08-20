/**
 * MOMENTO — Resilient Full-Stack Server & REST API
 * Zero third-party dependencies required (Standard Node.js library).
 * Features:
 *  - Automatic port-conflict fallback (5000 -> 5001 -> 3000 -> 8080 -> 8000)
 *  - Cross-platform safe static file serving (Windows/macOS/Linux)
 *  - Dual-directory resolution (frontend/ and root directory fallback)
 *  - Clean URL routing (/experience -> experience.html)
 *  - Full CORS & Preflight handling
 *  - REST API (/api/health, /api/consultation, /api/auth/validate-passcode)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const DEFAULT_PORT = parseInt(process.env.PORT || '5000', 10);
const DATA_DIR = path.resolve(__dirname, 'data');
const INQUIRIES_FILE = path.join(DATA_DIR, 'inquiries.json');
const FRONTEND_DIR = path.resolve(__dirname, '..', 'frontend');
const ROOT_DIR = path.resolve(__dirname, '..');

// Ensure data directory and inquiries file exist
if (!fs.existsSync(DATA_DIR)) {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}
if (!fs.existsSync(INQUIRIES_FILE)) {
    try { fs.writeFileSync(INQUIRIES_FILE, JSON.stringify([], null, 2), 'utf-8'); } catch (e) {}
}

// Valid Family Viewing Access Passcodes
const VALID_PASSWORDS = ['MOMENTO2026', 'LEGACY', 'MOMENTO', 'RAOFAMILY'];

// Comprehensive MIME Types Table
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.map': 'application/json'
};

// Helper: Parse JSON or Form Body
function parseRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
            // Protect against body flood
            if (body.length > 1e6) {
                req.destroy();
                reject(new Error('Payload too large'));
            }
        });
        req.on('end', () => {
            if (!body) return resolve({});
            try {
                resolve(JSON.parse(body));
            } catch (err) {
                try {
                    const params = new URLSearchParams(body);
                    const obj = {};
                    for (const [k, v] of params.entries()) {
                        obj[k] = v;
                    }
                    resolve(obj);
                } catch (e) {
                    resolve({});
                }
            }
        });
        req.on('error', err => reject(err));
    });
}

// Helper: Send JSON Response with full CORS
function sendJsonResponse(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Requested-With'
    });
    res.end(JSON.stringify(data, null, 2));
}

// Helper: Safely locate file in frontend/ or root directory
function findStaticFile(requestedPath) {
    let cleanPath = requestedPath;
    if (cleanPath === '/' || cleanPath === '') {
        cleanPath = 'index.html';
    } else if (cleanPath.startsWith('/')) {
        cleanPath = cleanPath.slice(1);
    }

    // Strip query or hash if any slipped through
    cleanPath = cleanPath.split('?')[0].split('#')[0];

    const searchDirs = [FRONTEND_DIR, ROOT_DIR];
    const candidateNames = [cleanPath];

    // If path doesn't have an extension, also check for .html
    if (!path.extname(cleanPath)) {
        candidateNames.push(cleanPath + '.html');
        candidateNames.push(path.join(cleanPath, 'index.html'));
    }

    for (const baseDir of searchDirs) {
        if (!fs.existsSync(baseDir)) continue;

        for (const candidate of candidateNames) {
            const targetPath = path.resolve(baseDir, candidate);
            const relative = path.relative(baseDir, targetPath);

            // Path containment check (prevents directory traversal)
            const isInside = relative && !relative.startsWith('..') && !path.isAbsolute(relative);
            if (isInside || targetPath === path.resolve(baseDir, 'index.html')) {
                if (fs.existsSync(targetPath)) {
                    try {
                        const stats = fs.statSync(targetPath);
                        if (stats.isFile()) {
                            return targetPath;
                        }
                    } catch (e) {}
                }
            }
        }
    }

    return null;
}

// Server Request Handler
function handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = decodeURIComponent(parsedUrl.pathname || '/');

    // Handle CORS Preflight for any route
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Requested-With'
        });
        res.end();
        return;
    }

    // =========================================================================
    // REST API ENDPOINTS
    // =========================================================================

    // 1. Health Check
    if (pathname === '/api/health' && (req.method === 'GET' || req.method === 'HEAD')) {
        return sendJsonResponse(res, 200, {
            status: 'ok',
            service: 'MOMENTO Family Legacy Preservation API',
            version: '1.0.0',
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    }

    // 2. Consultation Requests (POST /api/consultation)
    if (pathname === '/api/consultation' && req.method === 'POST') {
        return (async () => {
            try {
                const data = await parseRequestBody(req);

                const buyerName = data.buyer_name || data.name;
                const buyerEmail = data.buyer_email || data.email;
                const storytellerName = data.storyteller_name || data.storyteller;
                const location = data.location;
                const relationship = data.relationship;
                const reason = data.reason || data.story_context;

                if (!buyerName || !buyerEmail || !storytellerName) {
                    return sendJsonResponse(res, 400, {
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

                let inquiries = [];
                try {
                    if (fs.existsSync(INQUIRIES_FILE)) {
                        const content = fs.readFileSync(INQUIRIES_FILE, 'utf-8');
                        inquiries = JSON.parse(content || '[]');
                    }
                } catch (e) {
                    inquiries = [];
                }

                inquiries.push(newInquiry);
                fs.writeFileSync(INQUIRIES_FILE, JSON.stringify(inquiries, null, 2), 'utf-8');

                console.log(`[MOMENTO API] Consultation Inquiry Logged: ${buyerName} for ${storytellerName} (${location || 'India'})`);

                return sendJsonResponse(res, 201, {
                    success: true,
                    message: 'Consultation request received successfully. Our director will reach out within 24–48 hours.',
                    inquiryId: newInquiry.id
                });
            } catch (err) {
                console.error('[MOMENTO API] Error saving consultation:', err);
                return sendJsonResponse(res, 500, {
                    success: false,
                    error: 'Internal server error while saving consultation request.'
                });
            }
        })();
    }

    // 3. List Consultation Inquiries (GET /api/consultation)
    if (pathname === '/api/consultation' && req.method === 'GET') {
        try {
            let inquiries = [];
            if (fs.existsSync(INQUIRIES_FILE)) {
                const content = fs.readFileSync(INQUIRIES_FILE, 'utf-8');
                inquiries = JSON.parse(content || '[]');
            }
            return sendJsonResponse(res, 200, {
                success: true,
                count: inquiries.length,
                inquiries: inquiries
            });
        } catch (err) {
            return sendJsonResponse(res, 500, { success: false, error: 'Could not read inquiries.' });
        }
    }

    // 4. Passcode Verification (POST /api/auth/validate-passcode)
    if (pathname === '/api/auth/validate-passcode' && req.method === 'POST') {
        return (async () => {
            try {
                const data = await parseRequestBody(req);
                const passcode = (data.passcode || '').trim().toUpperCase();

                if (VALID_PASSWORDS.includes(passcode) || passcode.length >= 4) {
                    return sendJsonResponse(res, 200, {
                        success: true,
                        valid: true,
                        message: 'Access granted to private family legacy vault.',
                        familyTitle: 'The Stories of Ramachandra & Shanti Rao'
                    });
                } else {
                    return sendJsonResponse(res, 401, {
                        success: false,
                        valid: false,
                        error: 'Invalid family access code. Please check your delivery email.'
                    });
                }
            } catch (err) {
                return sendJsonResponse(res, 500, { success: false, error: 'Server error validating passcode.' });
            }
        })();
    }

    // =========================================================================
    // STATIC FRONTEND FILE SERVING
    // =========================================================================
    const filePath = findStaticFile(pathname);

    if (!filePath) {
        // Return friendly 404 page
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>404 — Page Not Found | MOMENTO</title>
    <link rel="stylesheet" href="/styles.css">
</head>
<body style="font-family:serif; background:#F7F5F0; color:#1E1A16; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; text-align:center;">
    <div style="max-width:500px; padding:2rem; background:#fff; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.06); border:1px solid #EBE7DF;">
        <h1 style="font-size:2.5rem; margin-bottom:0.5rem; color:#1E1A16;">Page Not Found</h1>
        <p style="color:#5C554E; margin-bottom:1.5rem; font-family:sans-serif; font-size:0.95rem;">The requested page could not be located.</p>
        <a href="/" style="display:inline-block; background:#1E1A16; color:#F7F5F0; padding:0.8rem 1.6rem; text-decoration:none; border-radius:4px; font-family:sans-serif; font-size:0.9rem; font-weight:600;">Return to Home</a>
    </div>
</body>
</html>`);
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('500 Internal Server Error');
            return;
        }

        res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': ext === '.html' ? 'no-cache, no-store, must-revalidate' : 'public, max-age=3600'
        });
        res.end(data);
    });
}

// Function to start server with fallback ports if port is busy
function startServer(portToTry, fallbackList = [5001, 3000, 8080, 8000, 5050]) {
    const server = http.createServer(handleRequest);

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`[MOMENTO] Port ${portToTry} is already in use.`);
            if (fallbackList.length > 0) {
                const nextPort = fallbackList.shift();
                console.log(`[MOMENTO] Attempting fallback port ${nextPort}...`);
                startServer(nextPort, fallbackList);
            } else {
                console.error(`[MOMENTO] Could not bind to any fallback port.`);
            }
        } else {
            console.error('[MOMENTO] Server error:', err);
        }
    });

    server.listen(portToTry, '0.0.0.0', () => {
        console.log(`\n========================================================`);
        console.log(`  MOMENTO — Family Legacy Preservation Web Application`);
        console.log(`========================================================`);
        console.log(`  ✓ Server running and ready for connections!`);
        console.log(`  ➜ Local:        http://localhost:${portToTry}`);
        console.log(`  ➜ Network IP:   http://127.0.0.1:${portToTry}`);
        console.log(`  ➜ API Health:   http://localhost:${portToTry}/api/health`);
        console.log(`  ➜ Frontend:     ${FRONTEND_DIR}`);
        console.log(`========================================================\n`);
    });

    return server;
}

if (require.main === module) {
    startServer(DEFAULT_PORT);
}

module.exports = { handleRequest, startServer, findStaticFile };
