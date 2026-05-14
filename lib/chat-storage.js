const CHAT_STORAGE_PREFIX = "cfoai-dashboard-chat-v1:";

export function buildChatStorageKey({ compareMode, compareDocumentNames, summaryTargetFile }) {
  if (compareMode && Array.isArray(compareDocumentNames) && compareDocumentNames.length >= 2) {
    return `${CHAT_STORAGE_PREFIX}compare:${[...compareDocumentNames].sort().join("|")}`;
  }
  const doc =
    typeof summaryTargetFile === "string" && summaryTargetFile.trim()
      ? summaryTargetFile.trim()
      : "__none__";
  return `${CHAT_STORAGE_PREFIX}doc:${doc}`;
}
