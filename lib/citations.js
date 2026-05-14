/**
 * Deduplicate RAG citations so each (file, page) pair appears at most once.
 */
export function dedupeCitations(citations) {
  if (!Array.isArray(citations) || !citations.length) return [];
  const seen = new Set();
  const out = [];
  for (const c of citations) {
    const file = c?.file ?? "Unknown";
    const page = c?.page ?? "";
    const key = `${file}\0${page}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ file, page: c?.page ?? null });
  }
  return out;
}
