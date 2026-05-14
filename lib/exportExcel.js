import { dedupeCitations } from "@/lib/citations";

/** UMD bundle: load only on export so Webpack does not execute it in the dashboard chunk. */
async function loadXlsxStyle() {
  const mod = await import("xlsx-js-style");
  const x = mod?.default ?? mod;
  if (!x?.utils?.book_new || typeof x.writeFile !== "function") {
    throw new Error("Excel library failed to load.");
  }
  return x;
}

function sanitizeFilename(name) {
  const t = String(name || "report").replace(/[<>:"/\\|?*]+/g, "_").slice(0, 80);
  return t || "report";
}

/** Same rules as PDF export — readable plain text from markdown summaries. */
function stripMarkdownLight(s) {
  if (s == null) return "";
  return String(s)
    .replace(/```[\s\S]*?```/g, "[code block omitted]")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\|/g, " ")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .trim();
}

function cellStr(v) {
  const s = v == null ? "" : String(v);
  return { v: s, t: "s" };
}

function cellBold(v) {
  return { v: v == null ? "" : String(v), t: "s", s: { font: { bold: true } } };
}

function cellWrapped(v) {
  return {
    v: v == null ? "" : String(v),
    t: "s",
    s: { alignment: { vertical: "top", wrapText: true } }
  };
}

/** Approximate Excel column widths from cell text (capped). */
function autoFitCols(XLSX, ws, maxWch = 72) {
  const ref = ws["!ref"];
  if (!ref) return;
  const range = XLSX.utils.decode_range(ref);
  const cols = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    let wch = 10;
    for (let r = range.s.r; r <= range.e.r; r++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (!cell || cell.v == null) continue;
      const text = String(cell.w != null ? cell.w : cell.v);
      for (const line of text.split(/\r?\n/)) {
        wch = Math.min(maxWch, Math.max(wch, Math.min(line.length + 2, maxWch)));
      }
    }
    cols.push({ wch });
  }
  ws["!cols"] = cols;
}

async function fetchChartsFromSummary(summaryText) {
  try {
    const t = String(summaryText || "").trim();
    if (!t) return [];
    const res = await fetch("/api/charts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: t })
    });
    const data = await res.json().catch(() => ({}));
    return Array.isArray(data.charts) ? data.charts : [];
  } catch {
    return [];
  }
}

/**
 * Browser-only: workbook with Metadata, Summary, Charts (tabular), and Chat sheets.
 * When `charts` is empty but `summary` has text, chart series are fetched (same `/api/charts` as Build charts).
 */
export async function exportCfoaiDashboardXlsx({
  summary = "",
  documentName = "",
  generatedAt = new Date(),
  charts = [],
  chatMessages = [],
  appVersion = "",
  userInfo = null
}) {
  const XLSX = await loadXlsxStyle();

  let resolvedCharts = Array.isArray(charts) ? charts : [];
  if (!resolvedCharts.length && String(summary || "").trim()) {
    resolvedCharts = await fetchChartsFromSummary(summary);
  }

  const wb = XLSX.utils.book_new();
  const dateObj = generatedAt instanceof Date ? generatedAt : new Date(generatedAt);
  const dateStrIso = Number.isNaN(dateObj.getTime()) ? String(generatedAt) : dateObj.toISOString();
  const dateStrLocal =
    Number.isNaN(dateObj.getTime()) ? String(generatedAt) : dateObj.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    });

  const u = userInfo && typeof userInfo === "object" ? userInfo : {};
  const userId = typeof u.userId === "string" && u.userId ? u.userId : "—";
  const userEmail = typeof u.email === "string" && u.email ? u.email : "—";
  const userDisplay =
    typeof u.displayName === "string" && u.displayName.trim()
      ? u.displayName.trim()
      : "—";
  const ver = typeof appVersion === "string" && appVersion.trim() ? appVersion.trim() : "—";

  const metaRows = [
    [cellBold("Field"), cellBold("Value")],
    [cellStr("App version"), cellStr(ver)],
    [cellStr("Export date (local)"), cellStr(dateStrLocal)],
    [cellStr("Export date (ISO)"), cellStr(dateStrIso)],
    [cellStr("Document name"), cellStr(documentName || "—")],
    [cellStr("User ID"), cellStr(userId)],
    [cellStr("User email"), cellStr(userEmail)],
    [cellStr("Display name"), cellStr(userDisplay)]
  ];
  const wsMeta = XLSX.utils.aoa_to_sheet(metaRows);
  autoFitCols(XLSX, wsMeta);
  XLSX.utils.book_append_sheet(wb, wsMeta, "Metadata");

  const bodyRaw = stripMarkdownLight(summary);
  const MAX_CELL = 32700;
  const body =
    bodyRaw.length > MAX_CELL
      ? `${bodyRaw.slice(0, MAX_CELL)}\n\n[Truncated for Excel cell size limit]`
      : bodyRaw;
  const summaryRows = [
    [cellBold("Financial summary — full text")],
    [cellStr("")],
    body
      ? [cellWrapped(body)]
      : [cellStr("(No summary generated — choose a document and run Generate summary.)")]
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  if (body) {
    const estLines = Math.max(1, Math.ceil(body.length / 88));
    wsSummary["!rows"] = [];
    wsSummary["!rows"][2] = { hpt: Math.min(409, 12 + estLines * 15) };
  }
  autoFitCols(XLSX, wsSummary, 100);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  const chartRows = [
    [cellBold("Charts (numeric series)")],
    [
      cellStr(
        resolvedCharts.length
          ? "Values below come from the dashboard or were extracted at export from the current summary."
          : "No chart rows — summary was empty or no comparable numbers were found."
      )
    ],
    [cellStr("")]
  ];
  if (resolvedCharts.length) {
    for (const ch of resolvedCharts) {
      chartRows.push([cellStr("")]);
      chartRows.push([cellBold("Title"), cellStr(ch.title || "")]);
      chartRows.push([cellBold("Type"), cellStr(ch.type || "")]);
      if (ch.unit) chartRows.push([cellBold("Unit"), cellStr(ch.unit)]);
      chartRows.push([cellBold("Label"), cellBold("Value")]);
      const pts = Array.isArray(ch.points) ? ch.points : [];
      for (const p of pts) {
        const v = p?.value;
        chartRows.push([
          cellStr(p?.name != null ? String(p.name) : ""),
          typeof v === "number" && Number.isFinite(v) ? { v, t: "n" } : cellStr(v != null ? String(v) : "")
        ]);
      }
    }
  }
  const wsCharts = XLSX.utils.aoa_to_sheet(chartRows);
  autoFitCols(XLSX, wsCharts);
  XLSX.utils.book_append_sheet(wb, wsCharts, "Charts");

  const chatRows = [[cellBold("Role"), cellBold("Message"), cellBold("Sources")]];
  if (!chatMessages.length) {
    chatRows.push([cellStr("—"), cellStr("(No chat messages yet.)"), cellStr("")]);
  } else {
    for (const msg of chatMessages) {
      const role = msg.role === "user" ? "Question" : "Answer";
      const content = typeof msg.content === "string" ? msg.content : "";
      let sources = "";
      if (msg.role === "assistant" && Array.isArray(msg.citations) && msg.citations.length) {
        sources = dedupeCitations(msg.citations)
          .map((c) => `${c.file}${c.page != null ? ` p.${c.page}` : ""}`)
          .join("; ");
      }
      chatRows.push([cellStr(role), cellWrapped(content), cellWrapped(sources)]);
    }
  }
  const wsChat = XLSX.utils.aoa_to_sheet(chatRows);
  autoFitCols(XLSX, wsChat, 90);
  XLSX.utils.book_append_sheet(wb, wsChat, "Chat");

  const safe = sanitizeFilename(documentName);
  const day = Number.isNaN(dateObj.getTime()) ? "export" : dateObj.toISOString().slice(0, 10);
  XLSX.writeFile(wb, `CFOai-${safe}-${day}.xlsx`);
}
