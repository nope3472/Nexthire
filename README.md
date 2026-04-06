# NextHire Desktop

> **Hire smarter. Move faster.**

A cross-platform Electron.js desktop application that authenticates users via WorkOS OAuth (AuthKit), captures screenshots and saves them to disk, and displays a persistent gallery of saved screenshots.

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Prerequisites](#prerequisites)
- [WorkOS Setup](#workos-setup)
- [Local Development Setup](#local-development-setup)
- [Building Installers](#building-installers)
- [Installing Self-Signed Builds](#installing-self-signed-builds)
- [Architecture Overview](#architecture-overview)
- [Known Limitations & Trade-offs](#known-limitations--trade-offs)
- [Environment Variables Reference](#environment-variables-reference)

---

## 🏗️ Project Overview

### What it does

- **OAuth Authentication** — Secure sign-in via WorkOS AuthKit using PKCE OAuth 2.0
- **Screenshot Capture** — One-click full-resolution screen capture with countdown timer
- **Persistent Gallery** — Screenshots saved to `~/Documents/NextHire/Screenshots/` with metadata persistence
- **Real-time Updates** — New screenshots appear instantly without page refresh
- **Thumbnail Generation** — Actual reduced-resolution thumbnails (320×200), not CSS-scaled

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Electron 28+ |
| UI | React 18 + TypeScript (strict) |
| Bundler | Vite + vite-plugin-electron |
| Styling | Tailwind CSS |
| Auth | WorkOS OAuth (PKCE) |
| Storage | electron-store (encrypted) |
| Packaging | electron-builder |
| Code Quality | ESLint + Prettier |

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MAIN PROCESS                         │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────────┐  │
│  │ auth.ts  │  │ store.ts │  │ screenshot.ts         │  │
│  │ (OAuth)  │  │ (e-store)│  │ (capture + thumbnail) │  │
│  └────┬─────┘  └────┬─────┘  └────────┬──────────────┘  │
│       │              │                 │                 │
│  ┌────┴──────────────┴─────────────────┴──────────────┐  │
│  │              index.ts (IPC handlers)               │  │
│  └────────────────────┬───────────────────────────────┘  │
│                       │                                  │
│  ┌────────────────────┴───────────────────────────────┐  │
│  │           protocol.ts (nexthire://)                │  │
│  └────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │ contextBridge (IPC)
┌───────────────────────┴─────────────────────────────────┐
│                 PRELOAD (index.ts)                       │
│            Exposes window.electronAPI                    │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────┐
│                  RENDERER PROCESS                       │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────┐   │
│  │ LoginScreen│  │ Dashboard  │  │ ScreenshotGallery│   │
│  └────────────┘  └────────────┘  └──────────────────┘   │
│  ┌────────────┐  ┌────────────┐                         │
│  │  useAuth   │  │useScreens  │  (React hooks)          │
│  └────────────┘  └────────────┘                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org/))
- **npm** 9+ (comes with Node.js)
- **Git** ([download](https://git-scm.com/))
- **WorkOS account** (free tier available at [workos.com](https://workos.com))

---

## 🔐 WorkOS Setup

1. Go to [dashboard.workos.com](https://dashboard.workos.com) and create an account
2. Create a new **Application** in the WorkOS dashboard
3. Navigate to **Authentication** → **Redirect URIs**
4. Add `nexthire://callback` as a redirect URI
5. Go to **API Keys** and copy your:
   - **Client ID** (starts with `client_`)
   - **API Key** (starts with `sk_`)
6. Copy these credentials to your `.env` file (see below)

---

## 🚀 Local Development Setup

```bash
# Clone the repository
git clone <repo-url>
cd nexthire-desktop

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and fill in your WorkOS credentials

# Run the app (builds + launches Electron)
npm run start
```

### Development with Hot Reload

```bash
# Start Vite dev server (renderer hot reload)
npm run dev
```

---

## 📦 Building Installers

### Windows (.exe)

```bash
# Step 1: Generate self-signed certificate (one-time)
npm run gen:cert

# Step 2: Build the installer
npm run dist:win
# Output: dist-electron/nexthire-setup.exe
```

### macOS (.dmg)

```bash
# Build the DMG
npm run dist:mac
# Output: dist-electron/nexthire.dmg

# Self-sign the app bundle
npm run sign:mac
```

### All Platforms

```bash
npm run dist:all
```

---

## 🔧 Installing Self-Signed Builds

### Windows — Bypassing SmartScreen

1. Download `nexthire-setup.exe`
2. When SmartScreen appears, click **"More info"**
3. Click **"Run anyway"**
4. Follow the installer prompts

### macOS — Bypassing Gatekeeper

**Method 1 (GUI):**
1. Right-click `NextHire.app`
2. Select **Open**
3. Click **Open anyway** in the dialog

**Method 2 (Terminal):**
```bash
xattr -cr /Applications/NextHire.app
# Optional (re-enable after):
spctl --master-disable
```

---

## 🏛️ Architecture Overview

### Main Process Responsibilities

- **OAuth orchestration** — Generates PKCE values, opens browser, handles callback, exchanges tokens
- **Screenshot management** — Captures via desktopCapturer, saves files, generates thumbnails
- **Data persistence** — Encrypted electron-store for tokens and screenshot metadata
- **Protocol handling** — Custom `nexthire://` protocol for OAuth callbacks
- **Security enforcement** — CSP headers, input validation, path sanitization

### Preload Bridge Pattern

We use `contextBridge.exposeInMainWorld` instead of `nodeIntegration: true` because:

1. **Security** — The renderer process cannot access Node.js APIs directly
2. **Isolation** — Even if a malicious script runs in the renderer, it cannot access the filesystem or network directly
3. **API Surface Control** — Only explicitly whitelisted functions are available
4. **Type Safety** — The bridge API is fully typed in `electron.d.ts`

### OAuth Flow

```
User clicks "Sign In"
       │
       ▼
Generate PKCE (verifier + challenge)
Generate random state (CSRF nonce)
       │
       ▼
Build WorkOS authorization URL
       │
       ▼
shell.openExternal(url) → Browser opens
       │
       ▼
User authenticates in browser
       │
       ▼
Browser redirects to nexthire://callback?code=...&state=...
       │
       ▼
Custom protocol handler catches URL
       │
       ▼
Validate state (CSRF check)
Extract authorization code
       │
       ▼
POST to WorkOS /authenticate endpoint
  (code + code_verifier — PKCE only, no client secret)
       │
       ▼
Receive access_token + user profile
       │
       ▼
Store encrypted session → Send to renderer
```

### Screenshot Capture Flow

```
User clicks "Take Screenshot"
       │
       ▼
3-2-1 countdown overlay
       │
       ▼
desktopCapturer.getSources() → Get primary screen
       │
       ▼
Send source ID to renderer
       │
       ▼
Renderer: getUserMedia(chromeMediaSource) → MediaStream
       │
       ▼
Draw frame to <canvas> → toBlob("image/png")
       │
       ▼
Send ArrayBuffer back to main
       │
       ▼
Save full PNG to ~/Documents/NextHire/Screenshots/
       │
       ▼
Generate 320×200 thumbnail via nativeImage.resize()
       │
       ▼
Persist metadata to electron-store
       │
       ▼
Emit "screenshot:new" IPC → Gallery updates instantly
```

---

## ⚠️ Known Limitations & Trade-offs

| Item | Description |
|------|-------------|
| **OAuth timeout** | OAuth flow times out after 5 minutes if no callback is received |
| **Single monitor** | Screenshot captures the primary screen only (multi-monitor support not implemented) |
| **Self-signed certs** | Windows SmartScreen and macOS Gatekeeper will warn users — proper code signing requires paid certificates |
| **No refresh token rotation** | Tokens are stored but not automatically refreshed — user must re-authenticate when tokens expire |
| **Electron overhead** | The app bundles Chromium (~150MB), which is inherent to Electron |
| **File protocol CSP** | `file://` protocol is used for thumbnail display which may have CSP restrictions in some builds |

---

## 🔑 Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `WORKOS_CLIENT_ID` | WorkOS application client ID | ✅ | `client_01KNH9C3C1...` |
| `WORKOS_REDIRECT_URI` | OAuth redirect URI (must be registered in WorkOS) | ✅ | `nexthire://callback` |
| `WORKOS_API_KEY` | WorkOS API key for server-side operations | ✅ | `sk_test_a2V5X...` |

> ⚠️ **Security**: These variables are only accessible in the main process (`src/main/`). They are never exposed to the renderer process.

---

## 📁 Project Structure

```
nexthire-desktop/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts    # Entry, window creation, IPC
│   │   ├── auth.ts     # WorkOS PKCE OAuth flow
│   │   ├── screenshot.ts # Capture + thumbnail generation
│   │   ├── store.ts    # Encrypted electron-store
│   │   └── protocol.ts # nexthire:// protocol handler
│   ├── preload/
│   │   └── index.ts    # contextBridge API
│   └── renderer/
│       ├── components/ # React UI components
│       ├── hooks/      # Custom React hooks
│       └── styles/     # Tailwind CSS
├── build/              # Build configs & entitlements
├── scripts/            # Cert generation & icon tools
└── assets/             # App icons
```

---

## 🧰 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + Vite build |
| `npm run start` | Build + launch Electron |
| `npm run dist:win` | Build Windows installer (.exe) |
| `npm run dist:mac` | Build macOS installer (.dmg) |
| `npm run dist:all` | Build all platform installers |
| `npm run gen:cert` | Generate self-signed Windows certificate |
| `npm run sign:mac` | Self-sign macOS app bundle |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |

---

## 📄 License

MIT © NextHire 2025
