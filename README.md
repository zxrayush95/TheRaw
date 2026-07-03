# TheRaw — Self-Hosted Raw File Storage & CDN API

**A blazing-fast, self-hosted file hosting platform powered by Cloudflare R2. Upload, manage, and serve raw files instantly through clean API endpoints — like your own private GitHub Raw + S3, with zero egress fees.**

[![Next.js](https://img.shields.io/badge/Next.js_16-black?logo=next.js)](https://nextjs.org)
[![Cloudflare R2](https://img.shields.io/badge/Cloudflare_R2-F38020?logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/r2/)
[![Deploy to Render](https://img.shields.io/badge/Deploy-Render-46E3B7?logo=render)](https://render.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## What is TheRaw?

TheRaw is a **complete file storage dashboard** that connects to your Cloudflare R2 bucket and gives you:

- 🔗 **Instant Raw URLs** — Every uploaded file gets a public raw endpoint (`/api/raw/v1/path/to/file.js`) for hotlinking in websites, apps, READMEs, and CDN pipelines.
- 📁 **Repository System** — Organize files into repositories (like GitHub repos) or use the flat global storage view.
- ✏️ **In-Browser Code Editor** — Create and edit text files directly from the dashboard with syntax-aware auto-indentation, bracket pairing, and tab support.
- 🔑 **Scoped API Access Keys** — Generate developer tokens with granular `read`, `write`, and `delete` permissions for CI/CD, MCP clients, CLI tools, and automation scripts.
- 🔒 **Password-Protected Dashboard** — Secure admin panel with HTTP-only cookie authentication.
- 🚀 **Zero Egress Costs** — Powered by Cloudflare R2, which charges $0 for bandwidth.

---

## Use Cases

| Use Case | How TheRaw Helps |
|----------|-----------------|
| **Raw file hosting** | Serve JS, CSS, images, fonts from clean URLs — like `raw.githubusercontent.com` but self-hosted |
| **Asset CDN for projects** | Host static assets for websites, mobile apps, or documentation |
| **Private file storage** | Password-protected dashboard with scoped API keys for team access |
| **MCP / AI tool integration** | Generate API tokens for LLM agents to read/write files programmatically |
| **CI/CD artifact storage** | Upload build artifacts via API, download via raw URLs |
| **Media hosting** | Preview images, audio, video, and PDFs directly in the dashboard |

---

## Tech Stack

- **Framework:** Next.js 16 (App Router, React 19, TypeScript)
- **Storage:** Cloudflare R2 (S3-compatible, zero egress)
- **Auth:** HTTP-only secure cookies + Bearer token API keys
- **Deploy:** Render (standalone mode), Vercel, or any Node.js host
- **UI:** Custom dark/light theme, SVG icons, responsive layout

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/TheRaw.git
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

## Deploy to Render

1. Push to GitHub
2. Create a **New Web Service** on [Render](https://render.com)
3. Connect your repo — Render auto-detects the `render.yaml` blueprint
4. Add your environment variables in the Render dashboard
5. Deploy! Your app goes live at `https://your-app.onrender.com`

| Setting | Value |
|---------|-------|
| Build Command | `npm install && npm run build && cp -r public .next/standalone/public && cp -r .next/static .next/standalone/.next/static` |
| Start Command | `HOSTNAME=0.0.0.0 node .next/standalone/server.js` |

---

## API Reference

All API endpoints support both **cookie auth** (browser dashboard) and **Bearer token auth** (API keys).

### Raw File Access (Public)
```
GET /api/raw/v1/{path}
```
Returns the raw file content with correct MIME type. No authentication required.

### File Management
```
GET    /api/files                      # List repositories
GET    /api/files?repo=name            # List files in repo
GET    /api/files?global=true          # List all files
POST   /api/files                      # Create repository
DELETE /api/files?key=path/to/file     # Delete file
DELETE /api/files?repo=name            # Delete repository
```

### File Creation & Upload
```
POST /api/files/create                 # Create/edit text files (JSON body)
POST /api/upload                       # Upload binary files (multipart form)
```

### API Access Keys
```
GET    /api/auth/tokens                # List active keys (masked)
POST   /api/auth/tokens                # Generate new key with scopes
DELETE /api/auth/tokens?id=token_id    # Revoke key
```

### Authentication with API Keys
```bash
# Using Authorization header
curl -H "Authorization: Bearer tr_tok_your_key_here" https://your-app.onrender.com/api/files?global=true

# Using x-api-key header
curl -H "x-api-key: tr_tok_your_key_here" https://your-app.onrender.com/api/files?global=true
```

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/          # Login, logout, session check, token management
│   │   ├── files/         # List, create, delete files and repositories
│   │   ├── raw/v1/        # Public raw file serving endpoint
│   │   └── upload/        # Multipart file upload
│   ├── repos/
│   │   ├── page.tsx       # Repository grid dashboard
│   │   └── [repo]/
│   │       └── page.tsx   # Repository file explorer
│   ├── tokens/
│   │   └── page.tsx       # API Access Key manager
│   ├── page.tsx           # Global Storage explorer
│   ├── layout.tsx         # Root layout with AppShell
│   └── globals.css        # Design system (dark/light themes)
├── components/
│   └── AppShell.tsx       # Auth guard, header, navigation drawer
└── lib/
    ├── r2.ts              # Cloudflare R2 S3 client operations
    └── tokens.ts          # API token registry and auth middleware
```

---

## License

MIT — use it however you want.

---

**Built with ☕ and Cloudflare R2.**
