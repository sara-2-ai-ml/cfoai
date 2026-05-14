"use client";

import { useMemo } from "react";
import { Sparkles } from "lucide-react";

const C = {
  doc1: "#5B8DB8",
  doc2: "#4CAF82",
  pos: "#4CAF82",
  neg: "#E07B54",
  muted: "rgba(255,255,255,0.25)",
  grid: "rgba(255,255,255,0.05)",
};

// ─── Parsers ─────────────────────────────────────────────────────────────────

function parseInsights(text) {
  // Strip markdown symbols, table rows, and header lines
  const clean = text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/#{1,6}\s[^\n]*/g, "")
    .split(/\n+/)
    .filter((l) => !l.trim().startsWith("|") && !l.trim().startsWith("#") && !/^[-:| ]+$/.test(l.trim()))
    .join(" ");

  // Split into sentences, keep only plain financial insight sentences
  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40 && s.length < 200)
    .filter((s) => !/\|/.test(s))
    .filter((s) =>
      /revenue|margin|income|growth|decline|increase|decrease|earnings|EPS|cash|profit|loss|spending/i.test(s)
    );

  return sentences.slice(0, 3);
}

function rawNum(str) {
  if (!str || str === "—") return null;
  const m = String(str)
    .replace(/,/g, "")
    .match(/([+-]?[\d.]+)\s*([BMKbmk%]?)/);
  if (!m) return null;
  let v = parseFloat(m[1]);
  const u = m[2].toUpperCase();
  if (u === "B") v *= 1e9;
  else if (u === "M") v *= 1e6;
  else if (u === "K") v *= 1e3;
  return Number.isFinite(v) ? v : null;
}

function parseMetrics(text) {
  const metrics = [];

  // Try markdown table first
  const tableRe = /\|(.+)\|\s*\n\|[-| :]+\|\s*\n((?:\|.+\|\s*\n?)+)/g;
  const tableMatch = tableRe.exec(text);
  if (tableMatch) {
    const rows = tableMatch[2]
      .trim()
      .split(/\n/)
      .map((r) =>
        r
          .split("|")
          .filter((c) => c.trim())
          .map((c) => c.trim().replace(/\*\*/g, "").replace(/\*/g, ""))
      )
      .filter((r) => r.length >= 3);
    for (const row of rows.slice(0, 8)) {
      const v1 = row[1];
      const v2 = row[2];
      if (!row[0] || /^[-:]+$/.test(row[0])) continue;
      metrics.push({
        metric: row[0].replace(/\*\*/g, "").replace(/\*/g, ""),
        val1: v1 || "—",
        val2: v2 || "—",
        raw1: rawNum(v1),
        raw2: rawNum(v2),
      });
    }
  }

  if (metrics.length >= 2) return metrics.slice(0, 6);

  // Fallback: regex scan for known metric names
  const knownMetrics = [
    "Total Revenue",
    "Net Revenue",
    "Revenue",
    "Gross Margin",
    "Operating Income",
    "Operating Margin",
    "Net Income",
    "EPS",
    "R&D Expenses",
    "R&D",
    "Cash Flow",
  ];
  for (const name of knownMetrics) {
    const re = new RegExp(
      `${name}[^\\n|]{0,60}?\\$?([\\d,.]+\\s*[BMK%]?)(?:[^\\n|]{0,30}?vs\\.?\\s*|[^\\n|]{0,10}?\\|[^\\n|]{0,10}?)[\\$]?([\\d,.]+\\s*[BMK%]?)`,
      "i"
    );
    const m = text.match(re);
    if (m) {
      metrics.push({
        metric: name,
        val1: m[1]?.trim() || "—",
        val2: m[2]?.trim() || "—",
        raw1: rawNum(m[1]),
        raw2: rawNum(m[2]),
      });
    }
  }
  return metrics.slice(0, 6);
}

// ─── Mini SVG Sparkline ───────────────────────────────────────────────────────

function Sparkline({ data, color }) {
  const W = 60, H = 24, pad = 3;
  if (!data || data.length < 2) return <span style={{ display: "inline-block", width: W }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max === min ? 1 : max - min;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = pad + (1 - (v - min) / span) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "inline-block", verticalAlign: "middle" }}>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Waterfall SVG ────────────────────────────────────────────────────────────

function WaterfallChart({ metric, val1, val2 }) {
  if (!val1 || !val2) return <p className="text-xs text-white/25 italic">Not enough numeric data</p>;
  const W = 240, H = 150, padL = 36, padR = 10, padT = 18, padB = 34;
  const innerH = H - padT - padB;
  const innerW = W - padL - padR;
  const diff = val2 - val1;
  const maxVal = Math.max(val1, val2) * 1.2;
  const toY = (v) => padT + innerH - (Math.max(0, v) / maxVal) * innerH;
  const toH = (v) => (Math.max(0, Math.abs(v)) / maxVal) * innerH;
  const slot = innerW / 3;
  const bw = slot * 0.52;

  const fmt = (v) => {
    const abs = Math.abs(v);
    const sign = v < 0 ? "-" : diff > 0 ? "+" : "";
    if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
    return `${sign}${abs.toFixed(1)}`;
  };

  const bars = [
    { x: padL + slot * 0 + (slot - bw) / 2, y: toY(val1), h: toH(val1), color: C.doc1, label: "Doc 1", val: val1 },
    { x: padL + slot * 1 + (slot - bw) / 2, y: diff >= 0 ? toY(val1 + diff) : toY(val1), h: toH(diff), color: diff >= 0 ? C.pos : C.neg, label: "Δ Change", val: diff, isDiff: true },
    { x: padL + slot * 2 + (slot - bw) / 2, y: toY(val2), h: toH(val2), color: C.doc2, label: "Doc 2", val: val2 },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 150 }}>
      <line x1={padL} y1={padT + innerH} x2={W - padR} y2={padT + innerH} stroke={C.grid} />
      {bars.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={b.y} width={bw} height={Math.max(b.h, 2)} fill={b.color} rx={3} opacity={0.88} />
          <text x={b.x + bw / 2} y={b.y - 4} textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize={8} fontFamily="system-ui,sans-serif">
            {fmt(b.val)}
          </text>
          <text x={b.x + bw / 2} y={H - 6} textAnchor="middle" fill="rgba(255,255,255,0.28)" fontSize={8} fontFamily="system-ui,sans-serif">
            {b.label}
          </text>
        </g>
      ))}
      <text x={W / 2} y={padT - 4} textAnchor="middle" fill="rgba(255,255,255,0.22)" fontSize={8} fontFamily="system-ui,sans-serif">
        {metric}
      </text>
    </svg>
  );
}

// ─── Grouped Bar SVG ──────────────────────────────────────────────────────────

function GroupedBarChart({ metrics, docNames }) {
  const display = metrics.filter((m) => m.raw1 != null && m.raw2 != null).slice(0, 3);
  if (!display.length) return <p className="text-xs text-white/25 italic">Not enough numeric data</p>;

  const W = 240, H = 150, padL = 36, padR = 10, padT = 18, padB = 40;
  const innerH = H - padT - padB;
  const innerW = W - padL - padR;
  const allVals = display.flatMap((m) => [m.raw1, m.raw2]).filter((v) => v != null && v > 0);
  const maxVal = allVals.length ? Math.max(...allVals) * 1.2 : 1;
  const toH = (v) => ((v || 0) / maxVal) * innerH;
  const toY = (v) => padT + innerH - toH(v);
  const groupW = innerW / display.length;
  const bw = groupW * 0.27;
  const gap = groupW * 0.05;

  const fmt = (v) => {
    if (!v) return "";
    const abs = Math.abs(v);
    if (abs >= 1e9) return `${(abs / 1e9).toFixed(0)}B`;
    if (abs >= 1e6) return `${(abs / 1e6).toFixed(0)}M`;
    return abs.toFixed(0);
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 150 }}>
      <line x1={padL} y1={padT + innerH} x2={W - padR} y2={padT + innerH} stroke={C.grid} />
      {display.map((m, gi) => {
        const gx = padL + gi * groupW + groupW / 2;
        const x1 = gx - bw - gap / 2;
        const x2 = gx + gap / 2;
        return (
          <g key={gi}>
            <rect x={x1} y={toY(m.raw1)} width={bw} height={Math.max(toH(m.raw1), 2)} fill={C.doc1} rx={2} opacity={0.88} />
            <rect x={x2} y={toY(m.raw2)} width={bw} height={Math.max(toH(m.raw2), 2)} fill={C.doc2} rx={2} opacity={0.88} />
            <text x={gx} y={padT + innerH + 12} textAnchor="middle" fill="rgba(255,255,255,0.28)" fontSize={8} fontFamily="system-ui,sans-serif">
              {m.metric.length > 11 ? `${m.metric.slice(0, 10)}…` : m.metric}
            </text>
          </g>
        );
      })}
      {/* Legend */}
      <rect x={padL} y={H - 10} width={7} height={4} fill={C.doc1} rx={1} />
      <text x={padL + 10} y={H - 5} fill="rgba(255,255,255,0.28)" fontSize={7} fontFamily="system-ui,sans-serif">
        {(docNames[0] || "Doc 1").slice(0, 18)}
      </text>
      <rect x={padL + 95} y={H - 10} width={7} height={4} fill={C.doc2} rx={1} />
      <text x={padL + 105} y={H - 5} fill="rgba(255,255,255,0.28)" fontSize={7} fontFamily="system-ui,sans-serif">
        {(docNames[1] || "Doc 2").slice(0, 18)}
      </text>
    </svg>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function CompareResult({ content, compareDocumentNames = [] }) {
  const docNames = compareDocumentNames.length >= 2 ? compareDocumentNames : ["Doc 1", "Doc 2"];
  const insights = useMemo(() => parseInsights(content || ""), [content]);
  const metrics = useMemo(() => parseMetrics(content || ""), [content]);
  const firstNumeric = metrics.find((m) => m.raw1 != null && m.raw2 != null);

  if (!content) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        animation: "cfoai-fadein 0.35s ease both",
      }}
    >
      {/* ── Section 1: AI Insights ── */}
      {insights.length > 0 && (
        <div
          style={{
            background: "rgba(76,175,130,0.06)",
            borderLeft: "3px solid #4CAF82",
            borderRadius: 8,
            padding: "10px 14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Sparkles size={13} color="#4CAF82" />
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#4CAF82" }}>
              AI Insights
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {insights.map((ins, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span
                  style={{
                    marginTop: 6,
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: ["#4CAF82", "#5B8DB8", "#C9A84C"][i],
                  }}
                />
                <p style={{ fontSize: 12, lineHeight: 1.55, color: "rgba(255,255,255,0.6)", margin: 0 }}>{ins}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Section 2: Metrics table ── */}
      {metrics.length > 0 && (
        <div style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
          {/* Header row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 90px 90px 80px 68px",
              background: "rgba(255,255,255,0.025)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              padding: "6px 12px",
              gap: 4,
            }}
          >
            {["Metric", "Q1", "Q2", "Change", "Trend"].map((h, i) => (
              <span
                key={i}
                style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.25)" }}
              >
                {h}
              </span>
            ))}
          </div>
          {/* Data rows */}
          {metrics.map((m, i) => {
            const hasBoth = m.raw1 != null && m.raw2 != null;
            const change = hasBoth ? ((m.raw2 - m.raw1) / Math.abs(m.raw1)) * 100 : null;
            const up = change != null && change > 0;
            return (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 90px 90px 80px 68px",
                  padding: "7px 12px",
                  gap: 4,
                  alignItems: "center",
                  background: i % 2 === 1 ? "rgba(255,255,255,0.015)" : "transparent",
                  borderBottom: i < metrics.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.82)" }}>{m.metric}</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.50)" }}>{m.val1 || "—"}</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.50)" }}>{m.val2 || "—"}</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: change == null ? "rgba(255,255,255,0.2)" : up ? C.pos : C.neg,
                  }}
                >
                  {change == null ? "—" : `${up ? "↑" : "↓"} ${Math.abs(change).toFixed(1)}%`}
                </span>
                <span>
                  {hasBoth ? (
                    <Sparkline data={[m.raw1, m.raw2]} color={up ? C.pos : C.neg} />
                  ) : (
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>—</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Section 3: Charts ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div
          style={{
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(255,255,255,0.01)",
            padding: "12px 14px",
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.25)", marginBottom: 10 }}>
            Revenue Waterfall
          </p>
          <WaterfallChart
            metric={firstNumeric?.metric || "Revenue"}
            val1={firstNumeric?.raw1 || null}
            val2={firstNumeric?.raw2 || null}
          />
        </div>
        <div
          style={{
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(255,255,255,0.01)",
            padding: "12px 14px",
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.25)", marginBottom: 10 }}>
            Doc 1 vs Doc 2
          </p>
          <GroupedBarChart metrics={metrics} docNames={docNames} />
        </div>
      </div>
    </div>
  );
}
