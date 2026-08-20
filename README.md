# MOMENTO — Family Legacy Preservation

> *"The film is the medium. The family legacy is the product."*

Momento turns a parent's or grandparent's life memories and values into a chaptered family legacy film, preserved privately across generations.

---

## Pure Static Architecture (Zero Backend Required)

The entire website runs as a standalone static application (HTML, CSS, JavaScript, Assets) with zero server setup or backend required:

```
momento/
├── assets/                   # Editorial images, logos, and favicons
│   ├── logo.jpg              # Header brand logo
│   ├── logo-dark.jpg         # Dark footer brand logo
│   ├── favicon.png           # Browser icon
│   ├── hero-storyteller.jpg  # Preserving Authentic Voice photo
│   ├── home-conversation.jpg # Comfort of Home photo
│   └── generational-wisdom.jpg# Generational Wisdom photo
├── index.html                # Homepage with Quick-Explorer & sample chapter film
├── experience.html           # 7-stage guided journey & interactive chapter breakdowns
├── faq.html                  # Questions & Answers with Web Speech audio overview
├── watch.html                # Private viewing portal & family vault preview
├── conversation.html         # Instant client-side consultation request form
├── pricing.html              # Redirect to The Experience
├── reserve.html              # Redirect to Start a Conversation
├── styles.css                # Curated design tokens, typography & animations
├── main.js                   # Client-side interactivity, TTS voice & portal auth
├── start-momento.bat         # One-click Windows launcher
├── package.json              # Optional local server scripts
└── README.md                 # Project documentation
```

---

## How to Open and Use Locally

### Option 1: Direct Browser Launch (Easiest)
Simply **double-click [`index.html`](file:///c:/Users/Mohmm/.gemini/antigravity/scratch/momento/index.html)** in Windows File Explorer or double-click **[`start-momento.bat`](file:///c:/Users/Mohmm/.gemini/antigravity/scratch/momento/start-momento.bat)**.

### Option 2: Using VS Code Live Server
Right-click `index.html` in VS Code and select **"Open with Live Server"**.

### Option 3: Using Python Local Server
```bash
python -m http.server 8000
```
Then visit **http://localhost:8000** in your browser.

### Option 4: Using Node / NPM
```bash
npm start
```

---

## Interactive Features (Pure Client-Side)

1. **Quick-Explorer Tabs (`index.html`)**: Fast switching between Discovery, Filming, Crafting, and Archiving.
2. **Text-to-Speech Engine**: Web Speech API audio narration for key sections with concurrent playback management.
3. **Embedded Sample Film Player**: Interactive chapter jumping with real-time quote synchronization.
4. **Instant Intake Form (`conversation.html`)**: Submits immediately with clean on-screen confirmation and optional cloud fallback.
5. **Private Portal Auth (`watch.html`)**: In-memory passcode validation (`MOMENTO2026`, `LEGACY`, `MOMENTO`, `RAOFAMILY`, or any code $\ge 4$ chars).
