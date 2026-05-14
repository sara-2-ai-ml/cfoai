/**
 * Classify runtime failures so API routes can return actionable responses
 * instead of opaque HTTP 500 pages when ChromaDB or the network is down.
 */

export function isVectorInfrastructureError(error) {
  const msg = String(error?.message ?? error ?? "").toLowerCase();
  const code = error?.code ?? error?.cause?.code;
  return (
    msg.includes("chromadb") ||
    msg.includes("failed to connect") ||
    msg.includes("fetch failed") ||
    msg.includes("econnrefused") ||
    msg.includes("socket hang up") ||
    msg.includes("network error") ||
    msg.includes("timeout") ||
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "ETIMEDOUT"
  );
}

export function isMissingEnvError(error) {
  const msg = String(error?.message ?? "").toLowerCase();
  return (
    (msg.includes("missing") || msg.includes("required")) &&
    (msg.includes("api_key") || msg.includes("api key") || msg.includes("anthropic") || msg.includes("openai"))
  );
}
