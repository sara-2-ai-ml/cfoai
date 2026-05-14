# cfoai.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square) ![ChromaDB](https://img.shields.io/badge/ChromaDB-vector_db-orange?style=flat-square) ![Clerk](https://img.shields.io/badge/Auth-Clerk-blue?style=flat-square) ![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

AI-powered financial analyst for CFOs, investors, and analysts.  
Upload financial reports → ask questions → simulate market reactions → export insights.

## ⚡ Overview

**cfoai.** is a next-generation financial intelligence platform. By ingesting financial reports (PDF, Excel, CSV, images), it automatically extracts key metrics, generates executive summaries, and constructs a market simulation environment where 6 AI personas with distinct investment philosophies freely analyze and debate the data.

> You only need to: Upload your financial report and ask in plain language  
> cfoai. will return: Cited answers, auto-generated charts, risk scores, and a full market simulation

## Live Demo

[cfoai-theta.vercel.app](https://cfoai-theta.vercel.app)

### Why cfoai.

|  | Manual | cfoai. |
|---|---|---|
| Time per report | 8+ hours | 2 minutes |
| Citations | None | Exact page references |
| Charts | Manual Excel | Auto-generated |
| Market perspectives | 1 analyst | 6 AI personas |
| Scenario analysis | Hours of modeling | Single prompt |

## 📸 Screenshots

## Screenshots

![](./public/screenshots/Screenshot%202026-05-14%20164804.png)
![](./public/screenshots/Screenshot%202026-05-14%20185820.png)
![](./public/screenshots/Screenshot%202026-05-14%20185919.png)
![](./public/screenshots/Screenshot%202026-05-14%20190023.png)
![](./public/screenshots/Screenshot%202026-05-14%20190101.png)
![](./public/screenshots/Screenshot%202026-05-14%20190156.png)
![](./public/screenshots/Screenshot%202026-05-14%20190248.png)
![](./public/screenshots/Screenshot%202026-05-14%20190312.png)

## ✨ Features

- **Document-Aware AI** — ask questions across all uploaded reports with exact page citations
- **Multi-Format Ingestion** — PDF, Excel, CSV, and image-based financial documents
- **Auto Charts** — revenue, margin, and segment charts generated automatically
- **Market Simulation** — 6 AI personas: CFO Pessimist, Aggressive Investor, Neutral Analyst, Short Seller, Financial Press, Regulator
- **Risk Scoring** — overall risk assessment 0-100 with key risk factors
- **Scenario Analysis** — what-if simulations: "What if revenue drops 20%?"
- **Period Comparison** — compare Q1 vs Q2 vs Q3 with waterfall charts and delta indicators
- **Export** — download full reports as PDF or Excel

## 🔄 How it works

\`\`\`
PDF / Excel / Image Upload
          ↓
Document Processor (pdf-parse / xlsx / Vision API)
          ↓
Chunking (1500 chars + 200 char overlap)
          ↓
OpenAI Embeddings → ChromaDB vector store
          ↓
User question → vector search → top 3 relevant chunks
          ↓
LLM → cited answer + financial summary
          ↓
Market Simulation → 6 AI personas → Risk Score → Scenario Analysis
\`\`\`

## 🛠 Tech Stack

- Frontend: Next.js 15, Tailwind CSS, shadcn/ui, Lucide React
- AI: LLM + Vision API, OpenAI text-embedding-3-small
- Data: ChromaDB, pdf-parse, xlsx, jsPDF
- Auth: Clerk
- Deploy: Vercel

## 🚀 Quick Start

\`\`\`bash
git clone https://github.com/sara-2-ai-ml/cfoai.git
cd cfoai
npm install
cp .env.example .env.local
# Add your API keys
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000)

> **Note:** `http://localhost:8000` is ChromaDB's API port, not the app. Use port 3000 for cfoai.

## 🔑 Environment Variables

```env
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CHROMA_URL=https://api.trychroma.com
CHROMA_API_KEY=
CHROMA_TENANT=
CHROMA_DATABASE=
```

## 🗄 ChromaDB Setup

One command (recommended):

\`\`\`bash
npm run dev:full
\`\`\`

This starts Docker Chroma on port 8000 and Next.js together.

Or manually:

\`\`\`bash
docker compose up        # terminal 1
npm run dev              # terminal 2
\`\`\`

## 📁 Project Structure

```
cfoai/
├── app/
│   ├── api/
│   │   ├── upload/          # Document indexing + ChromaDB
│   │   ├── query/           # RAG queries + compare mode
│   │   ├── summary/         # Financial summary generation
│   │   ├── simulate/        # 6 AI persona simulation
│   │   ├── scenario/        # What-if scenario analysis
│   │   ├── debate/          # Agent vs agent debate
│   │   └── charts/          # Auto chart generation
│   ├── dashboard/           # Dashboard page
│   ├── layout.jsx           # App layout
│   ├── page.jsx             # Landing page
│   └── globals.css          # Global styles
├── components/
│   ├── DashboardClient.jsx  # Main dashboard UI
│   ├── SimulatePanel.jsx    # Market simulation panel
│   ├── FinancialCharts.jsx  # Chart components
│   ├── CompareResult.jsx    # Compare mode UI
│   ├── FileUpload.jsx       # File upload component
│   ├── Chat.jsx             # Chat interface
│   └── SplineRobot.jsx      # 3D robot animation
├── lib/
│   ├── embeddings.js        # OpenAI embeddings
│   ├── vectordb.js          # ChromaDB client
│   ├── processor.js         # PDF/Excel/Image parser
│   ├── rag.js               # RAG pipeline
│   ├── citations.js         # Citation deduplication
│   ├── exportPDF.js         # PDF export
│   └── exportExcel.js       # Excel export
└── public/
    └── screenshots/         # App screenshots
```

## 📄 License

MIT