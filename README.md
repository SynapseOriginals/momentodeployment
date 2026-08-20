# MOMENTO — Family Legacy Preservation Platform

> *"The film is the medium. The family legacy is the product."*

Momento turns a parent's or grandparent's life memories and values into a chaptered family legacy film, preserved privately across generations.

---

## Project Structure (Separated Frontend & Backend)

```
momento/
├── frontend/                     # Standalone Client-Side Application
│   ├── assets/                   # Logos, favicon, and local editorial images
│   │   ├── logo.jpg              # Header brand logo
│   │   ├── logo-dark.jpg         # Dark footer brand logo
│   │   ├── favicon.png           # Browser icon
│   │   ├── hero-storyteller.jpg  # Preserving Authentic Voice photo
│   │   ├── home-conversation.jpg # Comfort of Home photo
│   │   └── generational-wisdom.jpg# Generational Wisdom photo
│   ├── index.html                # Streamlined homepage with Quick-Explorer & sample film
│   ├── experience.html           # 7-stage guided journey, interactive chapters & audio
│   ├── faq.html                  # Questions & Answers with overview speech
│   ├── watch.html                # Private viewing portal & legacy library preview
│   ├── conversation.html         # Consultation intake form
│   ├── pricing.html              # Canonical redirect
│   ├── reserve.html              # Canonical redirect
│   ├── styles.css                # Curated design tokens, responsive grid & typography
│   └── main.js                   # Client interactions, Web Speech API & player logic
│
├── backend/                      # Node.js REST API Backend
│   ├── server.js                 # API server (Inquiries, Passcodes, Static serving)
│   ├── package.json              # Backend scripts and dependencies
│   ├── .env.example              # Environment variables template
│   └── data/                     # Data storage
│       └── inquiries.json        # Consultation inquiries store
│
├── .vscode/                      # VS Code Debugger configurations
│   └── launch.json               # Chrome & Node.js debug setups
│
├── package.json                  # Root npm orchestration scripts
├── audit.py                      # Automated full-stack verification script
└── README.md                     # Documentation
```

---

## Getting Started

### 1. Run the Unified Full-Stack Server
To start the backend API server (which automatically serves the frontend at `http://localhost:5000`):
```bash
npm start
```
Or directly with Node:
```bash
node backend/server.js
```
Open **http://localhost:5000** in your browser.

---

### 2. Run Frontend Independently
If you wish to run the frontend standalone (e.g. via Python HTTP server or Live Server):
```bash
python -m http.server 8080 -d frontend
```
Open **http://localhost:8080** in your browser. The frontend includes automatic fallback to handle inquiries gracefully if the backend is not running.

---

### 3. Run Backend API Independently
```bash
cd backend
node --watch server.js
```
The REST API will listen on `http://localhost:5000`.

---

## REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Server health check and timestamp |
| `POST` | `/api/consultation` | Submit a family legacy consultation request |
| `GET` | `/api/consultation` | Retrieve list of recorded family inquiries |
| `POST` | `/api/auth/validate-passcode` | Verify private family legacy viewing portal passcode |

---

## Verification & Testing
Run the automated test suite to audit all frontend routes, assets, voice buttons, and backend APIs:
```bash
python audit.py
```
