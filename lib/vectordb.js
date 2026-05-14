import { createRequire } from "module";
import { createEmbeddings } from "@/lib/embeddings";

const COLLECTION_NAME = "cfoai_reports";
const require = createRequire(import.meta.url);
const { ChromaClient } = require("chromadb");
let client;
let collection;

/** Parse CHROMA_URL (e.g. http://localhost:8000) for chromadb@3+ (v2 HTTP API); avoids deprecated `path`. */
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
  const token = process.env.CHROMA_TOKEN || process.env.CHROMA_API_TOKEN;
  if (token) {
    opts.headers = { "x-chroma-token": token };
  }
  return opts;
}

function getClient() {
  if (!client) {
    client = new ChromaClient(chromaClientOptionsFromEnv());
  }
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

export async function queryDocuments(queryText, topK = 6) {
  const col = await initCollection();
  const [embedding] = await createEmbeddings([queryText]);
  const result = await col.query({
    queryEmbeddings: [embedding],
    nResults: topK
  });

  return (result.documents[0] || []).map((doc, i) => ({
    text: doc,
    metadata: result.metadatas[0]?.[i] || {},
    distance: result.distances[0]?.[i] || 0
  }));
}

/** Semantic search restricted to chunks whose metadata.fileName equals `filename`. */
export async function queryDocumentsForFile(queryText, filename, topK = 6) {
  const col = await initCollection();
  const [embedding] = await createEmbeddings([queryText]);
  const result = await col.query({
    queryEmbeddings: [embedding],
    nResults: topK,
    where: { fileName: filename }
  });

  return (result.documents[0] || []).map((doc, i) => ({
    text: doc,
    metadata: result.metadatas[0]?.[i] || {},
    distance: result.distances[0]?.[i] || 0
  }));
}

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

/** Remove all chunks whose metadata.fileName matches (exact Chroma metadata key used on upload). */
export async function deleteDocumentsByFilename(filename) {
  const col = await initCollection();
  await col.delete({
    where: { fileName: filename }
  });
}
