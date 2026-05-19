# cfoai.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square)
![Claude](https://img.shields.io/badge/AI-Anthropic_Claude-orange?style=flat-square)
![ChromaDB](https://img.shields.io/badge/Vector_DB-ChromaDB-purple?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**AI-powered financial intelligence platform for CFOs, investors, and analysts.**

Upload financial reports → ask questions in plain language → simulate market reactions → export full insights.

---

## 🚀 Live Demo

**[cfoai-theta.vercel.app](https://cfoai-theta.vercel.app/)**


## Overview

**cfoai.** ingests financial documents (PDF, Excel, CSV, images), extracts and indexes their content into a vector database, and lets you interrogate them through natural language. It then runs a **6-persona market simulation** where distinct AI investor archetypes independently analyze the data and debate the implications — all from a single upload.

> Upload your financial report → get cited answers, auto-generated charts, risk scores, and a full market simulation in under 2 minutes.

---

## Features

| Feature | Description |
|---|---|
| **Document-Aware Q&A** | Ask questions across all uploaded reports with exact page/chunk citations |
| **Multi-Format Ingestion** | PDF (text + scanned), Excel, CSV, and image-based financial documents via Vision API |
| **Auto Charts** | Revenue, margin, growth, and segment charts generated automatically from summaries |
| **Market Simulation** | 6 AI personas simultaneously analyze every report with confidence scores |
| **Risk Scoring** | Overall risk score 0–100 with `LOW / MODERATE / HIGH` classification and key risk factors |
| **Scenario Analysis** | What-if prompts — "What if revenue drops 20%?" — re-run through all 6 personas |
| **Period Comparison** | Compare 2–3 documents side by side with delta indicators |
| **PDF & Excel Export** | Download the full analysis, charts, and chat history in one click |

### The 6 AI Personas

| Persona | Investment Philosophy |
|---|---|
| CFO Pessimist | Risk-averse; focused on costs, liabilities, and financial stability |
| Aggressive Investor | Growth-focused; highlights opportunity and upside |
| Neutral Analyst | Balanced; benchmarks metrics against industry standards |
| Short Seller | Adversarial; surfaces red flags and warning signs |
| Financial Press | Journalist framing; writes newsworthy headline + lead |
| Regulator | Compliance-first; flags capital adequacy and regulatory risk |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, React 19, Tailwind CSS, shadcn/ui, Lucide React |
| **AI — Chat & Analysis** | Anthropic Claude (claude-haiku / sonnet) |
| **AI — Embeddings** | OpenAI `text-embedding-3-small` |
| **AI — Image / Scanned PDFs** | Anthropic Vision API |
| **Vector Store** | ChromaDB (local Docker or Chroma Cloud) |
| **Document Parsing** | pdf-parse, xlsx, sharp |
| **Export** | jsPDF, xlsx-js-style, html2canvas |
| **Deploy** | Vercel |

---

## How It Works

```
PDF / Excel / CSV / Image Upload
          ↓
Document Processor  (pdf-parse / xlsx / Vision API for images & scanned PDFs)
          ↓
Text Chunking  (1 500 chars per chunk, 200 char overlap)
          ↓
OpenAI Embeddings  →  ChromaDB vector store
          ↓
User question  →  vector similarity search  →  top relevant chunks
          ↓
Anthropic Claude  →  cited answer  +  financial summary
          ↓
Market Simulation  →  6 AI personas  →  confidence scores
          ↓
Risk Assessment  →  score 0–100  +  key risk factors
          ↓
Scenario Analysis  →  what-if prompt  →  6 persona re-analysis
```

---

## Screenshots

![Landing page](./public/screenshots/1-Landing%20page.png)

![Dashboard overview](./public/screenshots/Screenshot%201.png)

![Financial summary](./public/screenshots/Screenshot%202.png)

![Market simulation](./public/screenshots/Screenshot%203.png)

![Scenario analysis](./public/screenshots/Screenshot%204.png)

![Charts](./public/screenshots/Screenshot%205.png)

![Document compare](./public/screenshots/Screenshot%206.png)

![Export](./public/screenshots/Screenshot%207.png)

---

## Quick Start

### Prerequisites

- Node.js 18+
- Docker (for local ChromaDB) **or** a [Chroma Cloud](https://www.trychroma.com/) account
- Anthropic API key
- OpenAI API key

### 1. Clone & install

```bash
git clone https://github.com/sara-2-ai-ml/cfoai.git
cd cfoai
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your keys (see [Environment Variables](#environment-variables) below).

### 3. Start ChromaDB + the app together

```bash
npm run dev:full
```

This command starts Docker Chroma on port 8000 and Next.js on port 3000 concurrently.

**Or start them separately:**

```bash
# Terminal 1 — ChromaDB
npm run chroma:up

# Terminal 2 — Next.js
npm run dev
```

### 4. Open the app

```
http://localhost:3000
```

> **Note:** `http://localhost:8000` is the ChromaDB API port — the app itself runs on **3000**.

---

## Environment Variables

```env
# Anthropic — chat, summaries, simulation, scenario analysis, Vision OCR
ANTHROPIC_API_KEY=sk-ant-...

# Optional: pin a specific Claude model (defaults to claude-haiku-4-5)
# ANTHROPIC_MODEL=claude-sonnet-4-5-20250929

# OpenAI — embeddings only
OPENAI_API_KEY=sk-...

# ChromaDB — local Docker default (change for Chroma Cloud)
CHROMA_URL=http://localhost:8000
# Chroma Cloud only:
CHROMA_API_KEY=
CHROMA_TENANT=

# Vercel Blob — optional, for cloud file storage
BLOB_READ_WRITE_TOKEN=

# Next.js 15 — stable encryption key for Server Actions across restarts
# Generate once: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=
```

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js dev server on port 3000 |
| `npm run dev:full` | Start ChromaDB (Docker) + Next.js together |
| `npm run dev:clean` | Wipe `.next` cache, then start dev server |
| `npm run chroma:up` | Start ChromaDB container only (`docker compose up`) |
| `npm run build` | Production build |
| `npm run build:clean` | Wipe `.next` cache, then build |
| `npm start` | Start production server on port 3000 |
| `npm run lint` | Run ESLint |

---

## Project Structure

```
cfoai/
├── app/
│   ├── api/
│   │   ├── upload/        # Document ingestion → ChromaDB indexing
│   │   ├── query/         # RAG Q&A + multi-doc compare mode
│   │   ├── summary/       # AI financial summary generation
│   │   ├── simulate/      # 6-persona market simulation + risk scoring
│   │   ├── scenario/      # What-if scenario re-analysis
│   │   └── charts/        # Auto chart spec generation from summaries
│   ├── dashboard/         # Dashboard page (no login required)
│   ├── layout.jsx         # Root layout + providers
│   ├── page.jsx           # Landing page
│   └── globals.css        # Global styles
├── components/
│   ├── DashboardClient.jsx   # Main dashboard shell (tabs, header, stats)
│   ├── DashboardGate.jsx     # Dynamic-import wrapper for the dashboard
│   ├── SimulatePanel.jsx     # Market simulation + scenario analysis UI
│   ├── FinancialCharts.jsx   # Recharts-based chart components
│   ├── CompareResult.jsx     # Multi-document comparison result view
│   ├── Chat.jsx              # RAG chat interface
│   ├── FileUpload.jsx        # Drag-and-drop file uploader
│   ├── FileList.jsx          # Uploaded files list with selection
│   ├── Summary.jsx           # Summary display + export controls
│   ├── AppProviders.jsx      # Client providers (Toaster)
│   └── ui/                   # shadcn/ui primitives (button, card, etc.)
├── lib/
│   ├── processor.js       # PDF / Excel / CSV / Image → text chunks
│   ├── embeddings.js      # OpenAI embedding generation
│   ├── vectordb.js        # ChromaDB client (upsert, query, delete)
│   ├── rag.js             # RAG pipeline + multi-doc comparison
│   ├── citations.js       # Citation deduplication + formatting
│   ├── chart-spec.js      # Chart data extraction helpers
│   ├── exportPDF.js       # jsPDF dashboard export
│   ├── exportExcel.js     # Excel dashboard export
│   ├── anthropic-model.js # Model name resolution from env
│   └── infrastructure-errors.js  # Error classification helpers
├── scripts/
│   ├── dev-full.cjs       # Concurrent Chroma + Next.js launcher
│   ├── print-ports.cjs    # Print active ports at startup
│   └── ensure-fallback-build-manifest.cjs  # Build manifest guard
├── middleware.js          # Next.js middleware (passthrough — no auth)
├── next.config.mjs
├── tailwind.config.js
└── docker-compose.yml     # ChromaDB local container definition
```

---

## API Reference

All routes are under `/api` and accept / return JSON.

| Method | Route | Body | Response |
|---|---|---|---|
| `POST` | `/api/upload` | `FormData { file }` | `{ files: [...] }` |
| `DELETE` | `/api/upload` | `{ filename }` | `{ ok: true }` |
| `POST` | `/api/query` | `{ question, filenames?, compareMode? }` | `{ answer, citations }` |
| `POST` | `/api/summary` | `{ filename }` | `{ summary, degraded?, hint? }` |
| `POST` | `/api/simulate` | `{ summary }` | `{ responses, confidence, riskAssessment }` |
| `POST` | `/api/scenario` | `{ scenario, summary }` | `{ responses, riskAssessment }` |
| `POST` | `/api/compare` | `{ filenames: [2–3] }` | `{ comparison }` |
| `POST` | `/api/charts` | `{ text }` | `{ charts: [...] }` |

---

## ChromaDB Options

### Option A — Local Docker (recommended for development)

```bash
npm run dev:full   # starts both ChromaDB and Next.js
```

Requires Docker. ChromaDB runs at `http://localhost:8000`. Set `CHROMA_URL=http://localhost:8000` in `.env.local`.

### Option B — Chroma Cloud

1. Create a collection at [trychroma.com](https://www.trychroma.com/)
2. Set the following in `.env.local`:

```env
CHROMA_URL=https://api.trychroma.com
CHROMA_API_KEY=your_key
CHROMA_TENANT=your_tenant
```

---



## License

[MIT](./LICENSE)
