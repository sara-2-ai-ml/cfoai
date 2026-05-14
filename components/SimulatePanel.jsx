"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  ShieldAlert,
  TrendingUp,
  BarChart2,
  TrendingDown,
  Newspaper,
  Scale,
  Download,
  Lightbulb,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const AGENTS = [
  { id: "cfo", name: "CFO Pessimist", Icon: ShieldAlert, role: "Risk-focused, highlights concerns", border: "#E07B54" },
  { id: "investor", name: "Aggressive Investor", Icon: TrendingUp, role: "Growth-focused, bullish outlook", border: "#4CAF82" },
  { id: "analyst", name: "Neutral Analyst", Icon: BarChart2, role: "Data-driven, sector comparison", border: "#5B8DB8" },
  { id: "shortSeller", name: "Short Seller", Icon: TrendingDown, role: "Looks for red flags and risks", border: "#E05555" },
  { id: "press", name: "Financial Press", Icon: Newspaper, role: "How media would report this", border: "#9B7FD4" },
  { id: "regulator", name: "Regulator", Icon: Scale, role: "Compliance and risk signals", border: "#C9A84C" },
];

function ConfidenceBadge({ score }) {
  if (score == null) return null;
  const color = score > 80 ? "#4CAF82" : score >= 60 ? "#C9A84C" : "#E05555";
  return (
    <div className="mt-3 flex items-center gap-1.5">
      <span
        style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }}
      />
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
        Confidence{" "}
        <span style={{ fontSize: 13, fontWeight: 600, color }}>{score}%</span>
      </span>
    </div>
  );
}

function AnimatedScore({ target }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (target == null) { setDisplay(0); return; }
    let start = null;
    const duration = 1200;
    const animate = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target]);

  return <span>{display}</span>;
}

function RiskScoreCard({ riskAssessment, loading }) {
  if (loading) {
    return (
      <div className="mb-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-3 w-40 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-16 w-20 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-3 w-28 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-2 w-full max-w-xs animate-pulse rounded bg-white/[0.06]" />
        </div>
      </div>
    );
  }

  if (!riskAssessment) return null;

  const { score, level, factors } = riskAssessment;
  const color = score <= 40 ? "#4CAF82" : score <= 70 ? "#C9A84C" : "#E05555";

  return (
    <div className="mb-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
      <div className="flex flex-col items-center gap-1">
        <span style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(255,255,255,0.3)" }}>
          Overall Risk Assessment
        </span>
        <div className="flex items-baseline gap-1">
          <span style={{ fontSize: 64, fontWeight: 700, lineHeight: 1, color }}>
            <AnimatedScore target={score} />
          </span>
          <span style={{ fontSize: 18, fontWeight: 400, color: "rgba(255,255,255,0.25)" }}>/ 100</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", color, marginTop: 2 }}>
          {level}
        </span>

        {/* Progress bar */}
        <div className="mt-3 w-full max-w-xs">
          <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${score}%`,
                borderRadius: 3,
                background: color,
                transition: "width 1.2s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />
          </div>
        </div>

        {/* Risk factors */}
        {factors && factors.length > 0 && (
          <div className="mt-4 w-full max-w-md space-y-1.5">
            {factors.map((f, i) => (
              <div key={i} className="flex items-start gap-2">
                <span style={{ marginTop: 5, width: 5, height: 5, borderRadius: "50%", flexShrink: 0, background: color, opacity: 0.7 }} />
                <p style={{ fontSize: 11, lineHeight: 1.5, color: "rgba(255,255,255,0.5)", margin: 0 }}>{f}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SimulatePanel({ summary, files, summaryTargetFile, onSummaryTargetFileChange }) {
  const [responses, setResponses] = useState({});
  const [confidence, setConfidence] = useState({});
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Scenario state
  const [scenarioInput, setScenarioInput] = useState("");
  const [scenarioResponses, setScenarioResponses] = useState({});
  const [scenarioRisk, setScenarioRisk] = useState(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarioText, setScenarioText] = useState("");
  const [scenarioVisible, setScenarioVisible] = useState(false);

  async function runSimulation() {
    if (!summary?.trim()) return;
    setLoading(true);
    setResponses({});
    setConfidence({});
    setRiskAssessment(null);
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: summary.trim() }),
      });
      if (!res.ok) throw new Error("Simulation failed");
      const data = await res.json();
      setResponses(data.responses || {});
      setConfidence(data.confidence || {});
      setRiskAssessment(data.riskAssessment || null);
      setHasRun(true);
    } catch {
      setResponses({});
      setConfidence({});
      setRiskAssessment(null);
    } finally {
      setLoading(false);
    }
  }

  async function exportPdf() {
    if (!hasRun || Object.keys(responses).length === 0) return;
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 40;
      let y = 50;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("Market Simulation Report", margin, y);
      y += 22;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const docName = summaryTargetFile || "Unknown document";
      doc.setTextColor(100);
      doc.text(`${docName}  •  ${new Date().toLocaleDateString()}`, margin, y);
      y += 30;

      for (const agent of AGENTS) {
        const text = responses[agent.id];
        if (!text) continue;

        if (y > 700) { doc.addPage(); y = 50; }

        doc.setDrawColor(180);
        doc.line(margin, y, pageW - margin, y);
        y += 16;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(30);
        doc.text(agent.name, margin, y);
        y += 14;

        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(agent.role, margin, y);
        y += 16;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(50);
        const lines = doc.splitTextToSize(text, pageW - margin * 2);
        for (const line of lines) {
          if (y > 760) { doc.addPage(); y = 50; }
          doc.text(line, margin, y);
          y += 14;
        }

        const score = confidence[agent.id];
        if (score != null) {
          y += 4;
          doc.setFontSize(9);
          doc.setTextColor(100);
          doc.text(`Confidence: ${score}%`, margin, y);
        }
        y += 20;
      }

      // Branding
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text("cfoai.", pageW - margin - 30, doc.internal.pageSize.getHeight() - 30);

      doc.save("simulation-report.pdf");
    } catch {
      // silent fail
    } finally {
      setExporting(false);
    }
  }

  async function runScenario() {
    if (!scenarioInput.trim() || !summary?.trim()) return;
    setScenarioLoading(true);
    setScenarioResponses({});
    setScenarioRisk(null);
    setScenarioText(scenarioInput.trim());
    setScenarioVisible(true);
    try {
      const res = await fetch("/api/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: scenarioInput.trim(), summary: summary.trim() }),
      });
      if (!res.ok) throw new Error("Scenario failed");
      const data = await res.json();
      setScenarioResponses(data.responses || {});
      setScenarioRisk(data.riskAssessment || null);
    } catch {
      setScenarioResponses({});
      setScenarioRisk(null);
    } finally {
      setScenarioLoading(false);
    }
  }

  function clearScenario() {
    setScenarioVisible(false);
    setScenarioResponses({});
    setScenarioRisk(null);
    setScenarioText("");
  }

  const SCENARIO_CHIPS = [
    "Revenue drops 20%",
    "China market closes",
    "New iPhone launch fails",
    "Interest rates rise 2%",
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white/90">Market Simulation</h2>
        <p className="mt-1 text-xs text-white/40">
          See how different market personas react to this report
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select
            value={summaryTargetFile}
            onChange={(e) => onSummaryTargetFileChange(e.target.value)}
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-white/70 outline-none focus:border-white/20"
          >
            {files.length === 0 && <option value="">No documents uploaded</option>}
            {files.map((f, i) => {
              const name = typeof f === "string" ? f : f.name;
              return <option key={`${name}-${i}`} value={name}>{name}</option>;
            })}
          </select>
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={!summary?.trim() || loading}
            onClick={runSimulation}
          >
            {loading ? "Simulating…" : hasRun ? "Regenerate" : "Run Simulation"}
          </Button>
          {hasRun && (
            <button
              type="button"
              onClick={exportPdf}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] px-3 py-1.5 text-xs text-white/70 transition hover:border-white/25 hover:text-white/90 disabled:opacity-40"
            >
              <Download size={13} />
              {exporting ? "Exporting…" : "Export PDF"}
            </button>
          )}
        </div>
      </div>

      {/* Risk Score — shown above agent cards */}
      <RiskScoreCard riskAssessment={riskAssessment} loading={loading} />

      <div className="grid gap-4 sm:grid-cols-2">
        {AGENTS.map((agent) => (
          <div
            key={agent.id}
            className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
            style={{ borderLeftWidth: 3, borderLeftColor: agent.border }}
          >
            <div className="mb-2 flex items-center gap-2">
              <agent.Icon size={16} color={agent.border} />
              <span className="text-sm font-medium text-white/80">{agent.name}</span>
            </div>
            <p className="mb-3 text-[11px] text-white/35">{agent.role}</p>
            <div className="min-h-[4rem] text-xs leading-relaxed text-white/60">
              {loading ? (
                <div className="flex flex-col gap-2">
                  <div className="h-3 w-full animate-pulse rounded bg-white/[0.06]" />
                  <div className="h-3 w-4/5 animate-pulse rounded bg-white/[0.06]" />
                  <div className="h-3 w-3/5 animate-pulse rounded bg-white/[0.06]" />
                </div>
              ) : responses[agent.id] ? (
                <div className="prose prose-invert prose-xs max-w-none [&_p]:mb-1 [&_strong]:text-white/80">
                  <ReactMarkdown>{responses[agent.id]}</ReactMarkdown>
                </div>
              ) : (
                <p className="italic text-white/20">
                  {summary?.trim() ? "Click \"Run Simulation\" to generate analysis" : "Generate a summary first"}
                </p>
              )}
            </div>
            {/* Confidence score */}
            {!loading && confidence[agent.id] != null && (
              <div className="flex justify-end">
                <ConfidenceBadge score={confidence[agent.id]} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── What-If Scenario Section ── */}
      <div className="mt-8 border-t border-white/[0.06] pt-6">
        <div className="mb-4 flex items-center gap-2">
          <Lightbulb size={16} color="#C9A84C" />
          <span className="text-sm font-semibold text-white/80">What-If Scenario</span>
        </div>
        <p className="mb-3 text-xs text-white/35">Analyze how agents react to a specific scenario</p>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={scenarioInput}
            onChange={(e) => setScenarioInput(e.target.value)}
            placeholder="e.g. What if revenue drops 20%?"
            className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-white/70 placeholder:text-white/20 outline-none focus:border-white/20"
            onKeyDown={(e) => { if (e.key === "Enter") runScenario(); }}
          />
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={!scenarioInput.trim() || !summary?.trim() || scenarioLoading}
            onClick={runScenario}
          >
            {scenarioLoading ? "Analyzing…" : "Analyze Scenario"}
          </Button>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {SCENARIO_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setScenarioInput(chip)}
              className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] text-white/45 transition hover:border-[#C9A84C]/40 hover:text-white/70"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Scenario Results */}
        {scenarioVisible && (
          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="rounded-md bg-[#C9A84C]/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#C9A84C]">
                Scenario: {scenarioText}
              </span>
              <button
                type="button"
                onClick={clearScenario}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-white/30 transition hover:bg-white/[0.04] hover:text-white/60"
              >
                <X size={12} />
                Clear
              </button>
            </div>

            {/* Scenario Risk Score */}
            <RiskScoreCard riskAssessment={scenarioRisk} loading={scenarioLoading} />

            {/* Scenario Agent Cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              {AGENTS.map((agent) => (
                <div
                  key={`scenario-${agent.id}`}
                  className="relative overflow-hidden rounded-xl border border-[#C9A84C]/20 bg-white/[0.02] p-4"
                  style={{ borderLeftWidth: 3, borderLeftColor: "#C9A84C" }}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <agent.Icon size={16} color={agent.border} />
                    <span className="text-sm font-medium text-white/80">{agent.name}</span>
                  </div>
                  <div className="min-h-[3rem] text-xs leading-relaxed text-white/60">
                    {scenarioLoading ? (
                      <div className="flex flex-col gap-2">
                        <div className="h-3 w-full animate-pulse rounded bg-[#C9A84C]/10" />
                        <div className="h-3 w-4/5 animate-pulse rounded bg-[#C9A84C]/10" />
                        <div className="h-3 w-3/5 animate-pulse rounded bg-[#C9A84C]/10" />
                      </div>
                    ) : scenarioResponses[agent.id] ? (
                      <p>{scenarioResponses[agent.id]}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
