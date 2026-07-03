# TheRaw — Self-Hosted Raw File Storage & Instant CDN API

> **Your own private GitHub Raw + S3 — with zero caching, instant file updates, and $0 bandwidth costs.**

[![Next.js](https://img.shields.io/badge/Next.js_16-black?logo=next.js)](https://nextjs.org)
[![Cloudflare R2](https://img.shields.io/badge/Cloudflare_R2-F38020?logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/r2/)
[![Deploy to Render](https://img.shields.io/badge/Deploy-Render-46E3B7?logo=render)](https://render.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🌐 Live Demo

**Available to use at:** [**https://theraw.onrender.com/**](https://theraw.onrender.com/)

> Want access? Contact **tyren35678@gmail.com** — we'll provide you credentials shortly.

---

## 💡 Why TheRaw?

### Better than GitHub Raw
| Feature | GitHub Raw | TheRaw |
|---------|-----------|--------|
| **Caching** | ❌ Aggressive 5-min cache — updates are delayed | ✅ **Zero caching** — files update instantly |
| **File size limit** | ❌ 100 MB max per file | ✅ No hard limit (R2 supports up to 5 GB) |
| **Private repos** | ❌ Raw URLs don't work for private repos | ✅ All files get public raw endpoints |
| **API access** | ❌ Rate limited (60 req/hr unauthenticated) | ✅ Unlimited requests, scoped API tokens |
| **Custom domains** | ❌ Not possible | ✅ Use your own domain via Render/Cloudflare |
| **Bandwidth cost** | ⚠️ GitHub may throttle heavy usage | ✅ **$0 egress** — Cloudflare R2 has zero bandwidth fees |
| **In-browser editor** | ❌ Clunky commit flow | ✅ Edit files directly in the dashboard |

### Better than Traditional Cloud Storage
| Feature | S3 / GCS / Azure Blob | TheRaw |
|---------|----------------------|--------|
| **Price** | 💰 Pay per GB bandwidth | ✅ **$0 bandwidth** (R2 zero egress) |
| **Dashboard** | ❌ Complex AWS console | ✅ Clean, modern web UI |
| **Raw URLs** | ❌ Needs CloudFront/CDN setup | ✅ Built-in `/api/raw/v1/` endpoints |
| **API keys** | ❌ Complex IAM policies | ✅ Simple scoped tokens (read/write/delete) |

---

## 🔥 Real-World Use Cases

### 📱 APK & App Distribution
Host your Android APKs, iOS IPAs, or desktop installers. Share a direct download link — no app store needed.
```
https://theraw.onrender.com/api/raw/v1/releases/myapp-v2.1.apk
```

### 🎨 Website Asset Hosting
Serve JavaScript libraries, CSS stylesheets, fonts, and images from raw URLs. Zero caching means your updates go live **instantly** — no cache busting needed.
```html
<script src="https://theraw.onrender.com/api/raw/v1/libs/analytics.js"></script>
<link href="https://theraw.onrender.com/api/raw/v1/styles/theme.css" rel="stylesheet">
```

### 🤖 AI / MCP Tool Integration
Generate API access keys with scoped permissions for LLM agents, MCP clients, and automation bots to read and write files programmatically.
```bash
curl -H "Authorization: Bearer tr_tok_your_key" \
  https://theraw.onrender.com/api/files?global=true
```

### 📄 Documentation & Markdown Hosting
Host README files, changelogs, wikis, and technical docs. Access raw markdown from any static site generator.

### 🎮 Game Asset Storage
Store textures, sprites, audio files, level data, and configuration JSONs. Games can fetch assets at runtime via raw URLs.

### 🔧 CI/CD Build Artifacts
Upload build outputs, test reports, coverage badges, and deployment manifests via the API. Download them anywhere via raw URLs.

### 📊 Data File Hosting
Host CSV datasets, JSON configs, YAML templates, and XML feeds. Perfect for apps that need to fetch configuration or data at runtime.

### 🎵 Media Hosting
Upload and stream audio (MP3, WAV), video (MP4, WebM), images (PNG, JPG, SVG), and PDFs — all with in-browser preview in the dashboard.

### 📦 Package & Library Distribution
Host your own npm packages, Python wheels, or compiled binaries. Share direct download links without publishing to a registry.

---

## ⚡ Key Features

- 🔗 **Instant Raw URLs** — Every file gets a clean public endpoint: `/api/raw/v1/path/to/file`
- ⚡ **Zero Caching** — File updates are instant. No 5-minute cache delays like GitHub Raw
- 📁 **Repository System** — Organize files into repos or use flat global storage
- ✏️ **In-Browser Code Editor** — Create & edit files with auto-indent, bracket pairing, tab support
- 🔑 **Scoped API Keys** — Generate tokens with granular `read` / `write` / `delete` permissions
- 🔒 **Password-Protected** — Secure admin dashboard with HTTP-only cookie auth
- 🖼️ **Media Preview** — Preview images, videos, audio, and PDFs directly in the dashboard
- 📤 **Drag & Drop Upload** — Upload files instantly with drag-and-drop or file picker
- 🚀 **Zero Egress Cost** — Cloudflare R2 charges $0 for bandwidth. Serve unlimited traffic for free.

---

## 🛠️ Built Mostly Using Free Tools

| Component | Tool | Cost |
|-----------|------|------|
| **Framework** | Next.js 16 (App Router, React 19) | Free & Open Source |
| **Language** | TypeScript | Free & Open Source |
| **Storage** | Cloudflare R2 (10 GB free tier) | Free tier / Pay-as-you-go |
| **Hosting** | Render (Free Web Service) | Free tier available |
| **Auth** | Custom (cookies + API tokens) | Self-built, $0 |
| **Icons** | Inline SVG (no icon library) | $0 |
| **UI** | Custom CSS (no Tailwind/Bootstrap) | Self-built, $0 |
| **Version Control** | Git + GitHub | Free |

> **Total monthly cost to run TheRaw: $0** (within free tiers)

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/zxrayush95/TheRaw.git
cd TheRaw
npm install
```

### 2. Configure Environment

Create a `.env.local` file:

```env
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_BUCKET_NAME=your-bucket-name
ADMIN_PASSWORD=your_secure_password
```

### 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in.

---

## ☁️ Deploy to Render (Free)

1. Fork this repo or push to your GitHub
2. Create a **New Web Service** on [Render](https://render.com)
3. Connect your repo — Render auto-detects the `render.yaml` blueprint
4. Add environment variables in the Render dashboard
5. Deploy! Live in minutes.

| Setting | Value |
|---------|-------|
| Build Command | `npm install && npm run build && cp -r public .next/standalone/public && mkdir -p .next/standalone/.next && cp -r .next/static .next/standalone/.next/static` |
| Start Command | `node .next/standalone/server.js` |

---

## 📡 API Reference

All endpoints support **cookie auth** (dashboard) and **Bearer token auth** (API keys).

### Raw File Access (Public, No Auth)
```
GET /api/raw/v1/{path}          → Returns raw file with correct MIME type
```

### File Operations
```
GET    /api/files                → List repositories
GET    /api/files?repo=name      → List files in repo
GET    /api/files?global=true    → List all files
POST   /api/files                → Create repository
DELETE /api/files?key=path       → Delete file
DELETE /api/files?repo=name      → Delete repository
POST   /api/files/create         → Create/edit text file (JSON body)
POST   /api/upload               → Upload file (multipart form)
```

### API Key Management
```
GET    /api/auth/tokens          → List active keys (masked)
POST   /api/auth/tokens          → Generate new key with scopes
DELETE /api/auth/tokens?id=xxx   → Revoke key
```

### Using API Keys
```bash
# Bearer token
curl -H "Authorization: Bearer tr_tok_xxx" https://theraw.onrender.com/api/files?global=true

# x-api-key header
curl -H "x-api-key: tr_tok_xxx" https://theraw.onrender.com/api/files?global=true
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/          # Login, logout, session, tokens
│   │   ├── files/         # CRUD operations for files & repos
│   │   ├── raw/v1/        # Public raw file serving
│   │   └── upload/        # Multipart file upload
│   ├── repos/             # Repository dashboard & explorer
│   ├── tokens/            # API Access Key manager
│   ├── page.tsx           # Global Storage explorer
│   └── layout.tsx         # Root layout with AppShell
├── components/
│   └── AppShell.tsx       # Auth guard, header, navigation
└── lib/
    ├── r2.ts              # Cloudflare R2 client
    └── tokens.ts          # Token auth middleware
```

---

## 📜 License

MIT — use it, fork it, deploy it, do whatever you want.

---

<p align="center">
  <strong>TheRaw</strong> — Because your files deserve instant, uncached, zero-cost raw URLs.<br>
  Built with ☕ and Cloudflare R2.
</p>
