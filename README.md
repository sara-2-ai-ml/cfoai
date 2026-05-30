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

**[cfoai-theta.vercel.app](https://cfoai-iqb7.vercel.app/)**


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
| **Knowledge Graph (GraphRAG)** | Neo4j graph of financial entities + interactive D3 visualization |
| **Hybrid GraphRAG Chat** | Parallel Vector RAG (ChromaDB: semantic + BM25 + RRF + rerank) and Graph RAG (Neo4j Cypher) merged via RRF before Claude |
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
| **Graph Store (GraphRAG)** | Neo4j 5.x (Aura Cloud or self-hosted) |
| **Graph Visualization** | D3.js force-directed graph |
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
Claude entity extraction  →  Neo4j knowledge graph (GraphRAG)
          ↓
Knowledge Graph UI  →  D3 visualization of entities & relationships
          ↓
Market Simulation  →  6 AI personas  →  confidence scores
          ↓
Risk Assessment  →  score 0–100  +  key risk factors
          ↓
Scenario Analysis  →  what-if prompt  →  6 persona re-analysis
```

### Hybrid retrieval at query time

When you ask a question in chat, both retrieval paths run **in parallel** and are merged before Claude generates an answer:

```
User question
          ↓
┌─────────────────────┬──────────────────────┐
│     Vector RAG      │      Graph RAG       │
│     (ChromaDB)      │       (Neo4j)        │
│  semantic + BM25    │   Cypher queries     │
│  + RRF + rerank     │   entity links       │
└──────────┬──────────┴──────────┬───────────┘
           │                     │
           └──────────┬──────────┘
                      ↓
                 RRF Merge
                      ↓
                   Claude
                      ↓
            Answer + citations
```

**Graceful fallback:** if Neo4j is unavailable, chat continues with vector results only. If ChromaDB is unavailable, chat continues with graph results only. If both are down, the API returns a clear error.

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

See **[requirements.txt](./requirements.txt)** for the full setup checklist (runtime, npm packages, API keys, Neo4j, ChromaDB).

- Node.js 18+
- Docker (for local ChromaDB) **or** a [Chroma Cloud](https://www.trychroma.com/) account
- [Neo4j Aura](https://neo4j.com/cloud/platform/aura-graph/) (free tier) **or** self-hosted Neo4j 5.x — required for GraphRAG
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

# Neo4j — GraphRAG (entity storage + graph retrieval)
NEO4J_URI=neo4j+s://xxxx.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=
# Optional — Neo4j Aura database name
NEO4J_DATABASE=neo4j

# Vercel Blob — optional, for cloud file storage
BLOB_READ_WRITE_TOKEN=

# Next.js 15 — stable encryption key for Server Actions across restarts
# Generate once: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=
```

---

## GraphRAG Requirements

### NPM packages

GraphRAG-specific dependencies (included in `package.json`):

| Package | Version | Purpose |
|---|---|---|
| `neo4j-driver` | ^6.0.1 | Neo4j database client |
| `d3` | ^7.9.0 | Interactive knowledge graph visualization |
| `dotenv` | ^17.4.2 | Load env vars in test scripts |

Shared dependencies used by GraphRAG:

| Package | Purpose |
|---|---|
| `@anthropic-ai/sdk` | Entity extraction on upload + Cypher query generation in chat |
| `chromadb` | Vector store (document upload pipeline) |
| `openai` | Embeddings for ChromaDB indexing |

Install all dependencies:

```bash
npm install
```

Or install GraphRAG packages individually:

```bash
npm install neo4j-driver d3 dotenv
```

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `NEO4J_URI` | Yes | Neo4j connection URI (`neo4j+s://...` for Aura) |
| `NEO4J_USERNAME` | Yes | Neo4j username |
| `NEO4J_PASSWORD` | Yes | Neo4j password |
| `NEO4J_DATABASE` | No | Database name (Aura instances) |
| `ANTHROPIC_API_KEY` | Yes | Entity extraction + graph-augmented chat |
| `OPENAI_API_KEY` | Yes | Embeddings (upload indexing) |
| `CHROMA_URL` | Yes | ChromaDB endpoint |

### External services

| Service | Notes |
|---|---|
| **Neo4j 5.x** | [Neo4j Aura](https://neo4j.com/cloud/platform/aura-graph/) free tier recommended |
| **ChromaDB** | Local Docker or Chroma Cloud |
| **Anthropic API** | Claude Haiku for extraction, Sonnet/Haiku for chat |
| **OpenAI API** | `text-embedding-3-small` for vector search |

### Resilience

- **Neo4j down** → Vector RAG only (graph results ignored)
- **ChromaDB down** → Graph RAG only (vector results ignored)
- **Both down** → `503 RETRIEVAL_UNAVAILABLE` with a clear error message

### Verify GraphRAG setup

```bash
# 1. Test Neo4j connection
node scripts/test-neo4j.cjs

# 2. Start the app
npm run dev

# 3. Upload a financial PDF in the dashboard

# 4. Check graph API (should return nodes + links)
# Open: http://localhost:3000/api/graph

# 5. Open Dashboard → Knowledge Graph tab
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
│   │   ├── charts/        # Auto chart spec generation from summaries
│   │   └── graph/         # Knowledge graph nodes + links (Neo4j)
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
│   ├── KnowledgeGraph.jsx    # D3 force-directed graph visualization
│   ├── AppProviders.jsx      # Client providers (Toaster)
│   └── ui/                   # shadcn/ui primitives (button, card, etc.)
├── lib/
│   ├── processor.js       # PDF / Excel / CSV / Image → text chunks
│   ├── embeddings.js      # OpenAI embedding generation
│   ├── vectordb.js        # ChromaDB client (upsert, query, delete)
│   ├── rag.js             # RAG pipeline + graph-augmented retrieval
│   ├── graphdb.js         # Neo4j client
│   ├── graph-extractor.js # Entity extraction → Neo4j on upload
│   ├── graph-retriever.js # GraphRAG Cypher queries for chat
│   ├── citations.js       # Citation deduplication + formatting
│   ├── chart-spec.js      # Chart data extraction helpers
│   ├── exportPDF.js       # jsPDF dashboard export
│   ├── exportExcel.js     # Excel dashboard export
│   ├── anthropic-model.js # Model name resolution from env
│   └── infrastructure-errors.js  # Error classification helpers
├── scripts/
│   ├── dev-full.cjs       # Concurrent Chroma + Next.js launcher
│   ├── print-ports.cjs    # Print active ports at startup
│   ├── test-neo4j.cjs     # Verify Neo4j connection
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
| `GET` | `/api/graph` | — | `{ nodes: [...], links: [...] }` |

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

## Neo4j Setup (GraphRAG)

### Option A — Neo4j Aura (recommended)

1. Create a free instance at [neo4j.com/cloud/aura](https://neo4j.com/cloud/platform/aura-graph/)
2. Copy the connection URI, username, and password
3. Add to `.env.local`:

```env
NEO4J_URI=neo4j+s://xxxx.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
NEO4J_DATABASE=neo4j
```

4. Verify:

```bash
node scripts/test-neo4j.cjs
```

### Option B — Self-hosted Neo4j

Run Neo4j 5.x locally (Docker Desktop, Neo4j Desktop, or server) and set:

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
```

> Graph data is populated automatically on document upload. Open **Dashboard → Knowledge Graph** to visualize entities and relationships.

---



## License

[MIT](./LICENSE)
