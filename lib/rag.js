import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_MODEL } from "@/lib/anthropic-model";
import {
  queryDocuments,
  addDocuments,
  getDocumentsByFilename,
  queryDocumentsForFile
} from "@/lib/vectordb";
import { processFile } from "@/lib/processor";

function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is missing");
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function buildSystemPrompt() {
  return `
You are CFOai, a financial analysis assistant.
Use only provided document context when possible.
When data is missing, explicitly state uncertainty.
Always provide concise professional analysis.
Highlight period-over-period insights when relevant.
`;
}

function formatContext(chunks) {
  return chunks
    .map(
      (chunk, idx) =>
        `[${idx + 1}] File: ${chunk.metadata.fileName || "Unknown"} | Page: ${chunk.metadata.page || "N/A"}\n${chunk.text}`
    )
    .join("\n\n");
}

export async function indexDocument(filePath, filename) {
  const chunks = await processFile(filePath);
  const normalized = chunks.map((chunk, idx) => ({
    id: crypto.randomUUID(),
    text: chunk.text,
    metadata: {
      fileName: filename,
      page: chunk.page || null,
      chunkIndex: idx + 1
    }
  }));
  
  await addDocuments(normalized);
  return normalized;
}

export async function queryRAG(question, imageBase64) {
  const chunks = await queryDocuments(question, 8);
  return streamRAGAnswer(question, imageBase64, chunks, buildSystemPrompt(), 1200);
}

const COMPARE_SYSTEM = `You are CFOai comparing financial reports.
Use only the excerpts in the user message. Every figure or claim must name which document it came from.
Include a markdown table for key metrics side by side when the data supports it; use "—" when a value is missing for a document.`;

/**
 * Compare mode (2–3 filenames): Chroma semantic search **per document** (where fileName = …), then one Claude call with structured excerpts + streaming.
 */
export async function queryRAGCompare(question, filenames, imageBase64) {
  const names = [...new Set(filenames.map((f) => String(f || "").trim()).filter(Boolean))].slice(0, 3);
  const perFileK = 8;
  const docSections = [];
  const citationChunks = [];

  for (let i = 0; i < names.length; i++) {
    const fn = names[i];
    let rows = await queryDocumentsForFile(question, fn, perFileK);
    if (!rows.length) {
      rows = (await getDocumentsByFilename(fn, perFileK)).map((r) => ({
        text: r.text,
        metadata: { ...r.metadata, fileName: r.metadata?.fileName || fn },
        distance: 1
      }));
    }
    for (const r of rows) {
      citationChunks.push({
        text: r.text,
        metadata: { ...r.metadata, fileName: r.metadata?.fileName || fn }
      });
    }
    const body = rows
      .map((c, j) => {
        const page = c.metadata?.page != null ? c.metadata.page : "N/A";
        return `[Excerpt ${j + 1} | page ${page}]\n${c.text}`;
      })
      .join("\n\n");
    docSections.push(`Document ${i + 1} (${fn}):\n${body || "(No indexed text for this file in Chroma.)"}`);
  }

  const userBlock = `You are comparing financial reports. Here are excerpts from multiple documents:

${docSections.join("\n\n---\n\n")}

Question: ${question}

Provide a structured comparison with a markdown table showing key metrics side by side. Cite which document each data point comes from.`;

  return streamRAGAnswer(question, imageBase64, citationChunks, COMPARE_SYSTEM, 2000, {
    userContentOverride: userBlock
  });
}

async function streamRAGAnswer(
  question,
  imageBase64,
  chunks,
  systemPrompt,
  maxTokens = 1200,
  options
) {
  const userText =
    options?.userContentOverride != null
      ? options.userContentOverride
      : `Context:\n${formatContext(chunks)}\n\nQuestion: ${question}\n\nAnswer with source-grounded explanation.`;
  const citationSource = options?.citationChunks ?? chunks;
  const anthropic = getAnthropicClient();

  const messages = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: userText
        }
      ]
    }
  ];

  if (imageBase64) {
    messages[0].content.unshift({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/jpeg",
        data: imageBase64
      }
    });
  }

  const stream = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    stream: true,
    system: systemPrompt,
    messages
  });

  const citations = citationSource.map((chunk) => ({
    file: chunk.metadata.fileName || "Unknown",
    page: chunk.metadata.page != null ? chunk.metadata.page : null
  }));

  return { stream, citations };
}

/**
 * Cross-report comparison (2–3 indexed documents). Uses Chroma chunks per file; not streaming.
 */
export async function generateMultiDocumentComparison(filenames) {
  const unique = [...new Set(filenames.map((f) => String(f || "").trim()).filter(Boolean))];
  if (unique.length < 2) {
    throw new Error("Select at least two documents to compare.");
  }
  const names = unique.slice(0, 3);
  const perFileChunkCap = 14;
  const sections = [];

  for (const name of names) {
    const chunks = await getDocumentsByFilename(name, perFileChunkCap);
    if (!chunks.length) {
      sections.push(`### Document: ${name}\n_(No indexed text in Chroma for this filename — re-upload after indexing.)_`);
      continue;
    }
    const body = chunks.map((c, i) => `[Excerpt ${i + 1}]\n${c.text}`).join("\n\n");
    sections.push(`### Document: ${name}\n${body}`);
  }

  const context = sections.join("\n\n---\n\n");
  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 2600,
    system: `You are CFOai, a senior financial analyst. The user provides excerpts from ${names.length} different indexed reports.
Write a professional markdown comparison:
1. **Executive snapshot** — one short paragraph.
2. **Comparable metrics** — use a markdown table when numbers align; otherwise labeled bullets per report.
3. **Themes** — revenue growth, margins, cash, risk, geography or segment mix when visible.
4. **Gaps & uncertainty** — call out missing periods, FX, or non-comparable bases.
5. **CFO takeaways** — 3–5 bullets.
Stay grounded in the excerpts; do not invent figures.`,
    messages: [
      {
        role: "user",
        content: `Compare these reports (filenames: ${names.join(" | ")}).\n\n${context}`
      }
    ]
  });

  return response.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

export async function generateSummary(filename) {
  const chunks = await getDocumentsByFilename(filename, 40);
  if (!chunks.length) return "";
  
  const anthropic = getAnthropicClient();
  const context = chunks
    .slice(0, 20)
    .map((chunk) => chunk.text)
    .join("\n\n");

  const response = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 800,
    system:
      "You are a financial analyst assistant. Provide concise executive summary with key metrics, risks, and quarter-to-quarter comparison if available.",
    messages: [
      {
        role: "user",
        content: `Summarize these extracted report contents for document ${filename}:\n${context}`
      }
    ]
  });

  return response.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}
