import { createRequire } from "module";
import { createEmbeddings } from "@/lib/embeddings";
 
const COLLECTION_NAME = "cfoai_reports";
const require = createRequire(import.meta.url);
const { ChromaClient } = require("chromadb");
 
let client;
let collection;
 
// ─── Chroma setup ─────────────────────────────────────────────────────────────
function chromaClientOptionsFromEnv() {
  const raw = process.env.CHROMA_URL || "http://localhost:8000";
  let host = "localhost";
  let port = 8000;
  let ssl = false;
  try {
    const u = new URL(raw);
    host = u.hostname || host;
    ssl = u.protocol === "https:";
    port = u.port ? parseInt(u.port, 10) : ssl ? 443 : 8000;
  } catch {
    // keep defaults
  }
  const opts = { host, port, ssl };
  if (process.env.CHROMA_TENANT) opts.tenant = process.env.CHROMA_TENANT;
  if (process.env.CHROMA_DATABASE) opts.database = process.env.CHROMA_DATABASE;
  const token =
    process.env.CHROMA_API_KEY ||
    process.env.CHROMA_TOKEN ||
    process.env.CHROMA_API_TOKEN;
  if (token) opts.headers = { "x-chroma-token": token };
  return opts;
}
 
function getClient() {
  if (!client) client = new ChromaClient(chromaClientOptionsFromEnv());
  return client;
}
 
export async function initCollection() {
  if (collection) return collection;
  const chroma = getClient();
  collection = await chroma.getOrCreateCollection({
    name: COLLECTION_NAME,
    metadata: { "hnsw:space": "cosine" }
  });
  return collection;
}
 
// ─── Tokenizer ────────────────────────────────────────────────────────────────
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}
 
// ─── BM25 Okapi ───────────────────────────────────────────────────────────────
function bm25Score(queryTokens, docTokens, idf, k1 = 1.5, b = 0.75, avgDl) {
  const dl = docTokens.length;
  const tf = {};
  for (const t of docTokens) tf[t] = (tf[t] || 0) + 1;
 
  let score = 0;
  for (const term of queryTokens) {
    if (!idf[term] || !tf[term]) continue;
    const num = tf[term] * (k1 + 1);
    const den = tf[term] + k1 * (1 - b + b * (dl / avgDl));
    score += idf[term] * (num / den);
  }
  return score;
}
 
function runBM25(queryText, chunks) {
  if (chunks.length === 0) return [];
 
  const queryTokens = tokenize(queryText);
  const tokenizedDocs = chunks.map((c) => tokenize(c.text));
  const N = chunks.length;
  const avgDl = tokenizedDocs.reduce((s, d) => s + d.length, 0) / N;
 
  const idf = {};
  for (const term of queryTokens) {
    const df = tokenizedDocs.filter((d) => d.includes(term)).length;
    idf[term] = Math.log((N - df + 0.5) / (df + 0.5) + 1);
  }
 
  return chunks
    .map((chunk, i) => ({
      chunk,
      score: bm25Score(queryTokens, tokenizedDocs[i], idf, 1.5, 0.75, avgDl)
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ chunk }) => chunk);
}
 
// ─── Reciprocal Rank Fusion ───────────────────────────────────────────────────
export function reciprocalRankFusion(semanticChunks, bm25Chunks, k = 60) {
  const scores = new Map();
  const allChunks = new Map();
 
  [...semanticChunks, ...bm25Chunks].forEach((chunk) => {
    const key = chunk.text.slice(0, 80);
    if (!allChunks.has(key)) allChunks.set(key, chunk);
    if (!scores.has(key)) scores.set(key, 0);
  });
 
  semanticChunks.forEach((chunk, rank) => {
    const key = chunk.text.slice(0, 80);
    scores.set(key, (scores.get(key) || 0) + 1 / (k + rank + 1));
  });
 
  bm25Chunks.forEach((chunk, rank) => {
    const key = chunk.text.slice(0, 80);
    scores.set(key, (scores.get(key) || 0) + 1 / (k + rank + 1));
  });
 
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => allChunks.get(key))
    .filter(Boolean);
}
 
// ─── Reranker — Pure JS ───────────────────────────────────────────────────────
function rerank(queryText, chunks, topK) {
  if (chunks.length === 0) return [];
 
  const queryTokens = tokenize(queryText);
  const queryPhrase = queryText.toLowerCase();
 
  const scored = chunks.map((chunk) => {
    const text = chunk.text.toLowerCase();
    const docTokens = tokenize(chunk.text);
    let score = 0;
 
    // 1. Exact phrase match — chunk përmban frazën e plotë
    if (text.includes(queryPhrase)) {
      score += 3.0;
    }
 
    // 2. Term density — sa % e query terms janë në chunk
    const matchedTerms = queryTokens.filter((t) => docTokens.includes(t));
    const density = queryTokens.length > 0 ? matchedTerms.length / queryTokens.length : 0;
    score += density * 2.0;
 
    // 3. Term proximity — fjalët e query afër njëra-tjetrës brenda chunk
    if (queryTokens.length >= 2) {
      const positions = queryTokens.map((term) => {
        const idx = docTokens.indexOf(term);
        return idx === -1 ? null : idx;
      }).filter((p) => p !== null);
 
      if (positions.length >= 2) {
        const span = Math.max(...positions) - Math.min(...positions);
        const proximityScore = Math.max(0, 1 - span / 50);
        score += proximityScore * 1.0;
      }
    }
 
    // 4. Position bonus — termat shfaqen herët në chunk
    const firstMatchPos = queryTokens.reduce((earliest, term) => {
      const idx = docTokens.indexOf(term);
      return idx !== -1 && idx < earliest ? idx : earliest;
    }, docTokens.length);
 
    const positionScore = Math.max(0, 1 - firstMatchPos / docTokens.length);
    score += positionScore * 0.5;
 
    return { chunk, score };
  });
 
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ chunk }) => chunk);
}
 
// ─── addDocuments ─────────────────────────────────────────────────────────────
export async function addDocuments(chunks) {
  if (!chunks.length) return;
  const col = await initCollection();
  const docs = chunks.map((c) => c.text);
  const embeddings = await createEmbeddings(docs);
  await col.add({
    ids: chunks.map((c) => c.id),
    documents: docs,
    embeddings,
    metadatas: chunks.map((c) => c.metadata)
  });
}
 
// ─── queryDocuments — HYBRID + RERANK ────────────────────────────────────────
export async function queryDocuments(queryText, topK = 6) {
  const col = await initCollection();
  const [embedding] = await createEmbeddings([queryText]);
 
  const poolSize = Math.min(topK * 3, 30);
  const result = await col.query({
    queryEmbeddings: [embedding],
    nResults: poolSize
  });
 
  const semanticChunks = (result.documents[0] || []).map((doc, i) => ({
    text: doc,
    metadata: result.metadatas[0]?.[i] || {},
    distance: result.distances[0]?.[i] || 0
  }));
 
  const bm25Chunks = runBM25(queryText, semanticChunks);
  const merged = reciprocalRankFusion(semanticChunks, bm25Chunks);
  return rerank(queryText, merged, topK);
}
 
// ─── queryDocumentsForFile — HYBRID + RERANK ─────────────────────────────────
export async function queryDocumentsForFile(queryText, filename, topK = 6) {
  const col = await initCollection();
  const [embedding] = await createEmbeddings([queryText]);
 
  const poolSize = Math.min(topK * 3, 30);
  const result = await col.query({
    queryEmbeddings: [embedding],
    nResults: poolSize,
    where: { fileName: filename }
  });
 
  const semanticChunks = (result.documents[0] || []).map((doc, i) => ({
    text: doc,
    metadata: result.metadatas[0]?.[i] || {},
    distance: result.distances[0]?.[i] || 0
  }));
 
  const bm25Chunks = runBM25(queryText, semanticChunks);
  const merged = reciprocalRankFusion(semanticChunks, bm25Chunks);
  return rerank(queryText, merged, topK);
}
 
// ─── getDocumentsByFilename ───────────────────────────────────────────────────
export async function getDocumentsByFilename(filename, limit = 50) {
  const col = await initCollection();
  const out = await col.get({
    where: { fileName: filename },
    limit,
    include: ["documents", "metadatas"]
  });
  return (out.documents || []).map((doc, i) => ({
    text: doc,
    metadata: out.metadatas?.[i] || {}
  }));
}
 
// ─── deleteDocumentsByFilename ────────────────────────────────────────────────
export async function deleteDocumentsByFilename(filename) {
  const col = await initCollection();
  await col.delete({ where: { fileName: filename } });
}