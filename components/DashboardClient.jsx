"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { UserButton, useUser } from "@clerk/nextjs";
import html2canvas from "html2canvas";
import {
  AlignLeft,
  ChevronLeft,
  ChevronRight,
  Files,
  LineChart,
  MessageSquare,
  Minus,
  TrendingDown,
  TrendingUp,
  UploadCloud
} from "lucide-react";
import Chat from "@/components/Chat";
import FinancialCharts from "@/components/FinancialCharts";
import FileList from "@/components/FileList";
import FileUpload from "@/components/FileUpload";
import SimulatePanel from "@/components/SimulatePanel";
import Summary from "@/components/Summary";
import { buildChatStorageKey } from "@/lib/chat-storage";
import { exportCfoaiDashboardPdf } from "@/lib/exportPDF";
import { exportCfoaiDashboardXlsx } from "@/lib/exportExcel";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const UPLOAD_LIST_STORAGE_KEY = "cfoai-dashboard-upload-list-v1";

function formatMoneyShort(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  const v = Math.abs(n);
  if (v >= 1e12) return `${sign}$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `${sign}$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${sign}$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${sign}$${(v / 1e3).toFixed(1)}k`;
  return `${sign}$${Number.isInteger(v) ? String(v) : v.toFixed(1)}`;
}

function formatPct(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function resampleSeries(values, targetLen = 7) {
  const v = values.filter((x) => typeof x === "number" && Number.isFinite(x));
  if (!v.length) return Array.from({ length: targetLen }, () => 0);
  if (v.length === 1) return Array.from({ length: targetLen }, () => v[0]);
  const out = [];
  for (let i = 0; i < targetLen; i++) {
    const t = (i / (targetLen - 1)) * (v.length - 1);
    const j = Math.floor(t);
    const f = t - j;
    const a = v[j];
    const b = v[Math.min(j + 1, v.length - 1)];
    out.push(a + (b - a) * f);
  }
  return out;
}

function pctChangeFirstLast(values) {
  const v = values.filter((x) => typeof x === "number" && Number.isFinite(x));
  if (v.length < 2) return null;
  const a = v[0];
  const b = v[v.length - 1];
  if (Math.abs(a) < 1e-9) return null;
  return ((b - a) / Math.abs(a)) * 100;
}

/**
 * Parse key financial metrics directly from the Claude summary text.
 * Returns { revenue, growth, margin } as numbers (or null when not found).
 * - revenue: largest quarterly/total net sales figure in absolute units (e.g. 111.2e9)
 * - growth: YoY growth percentage (e.g. 16.6)
 * - margin: gross/operating margin percentage (e.g. 37.1)
 */
function extractSummaryMetrics(text) {
  if (!text || typeof text !== "string") return {};

  function toAbsolute(num, unitRaw) {
    const u = (unitRaw || "").toLowerCase().trim();
    if (u.startsWith("t") || u === "trillion") return num * 1e12;
    if (u.startsWith("b") || u === "billion") return num * 1e9;
    if (u.startsWith("m") || u === "million") return num * 1e6;
    if (u.startsWith("k")) return num * 1e3;
    return num;
  }

  // Revenue: prefer "total net sales" or "quarterly revenue" patterns
  let revenue = null;
  const revPatterns = [
    /total\s+net\s+sales[^$\d]{0,30}\$?([\d,]+\.?\d*)\s*(trillion|billion|million|T|B|M)?/i,
    /(?:quarterly|q[1-4])\s+(?:net\s+sales|revenue)[^$\d]{0,20}\$?([\d,]+\.?\d*)\s*(trillion|billion|million|T|B|M)?/i,
    /net\s+(?:sales|revenue)\s+(?:of|was|were|:)[^$\d]{0,10}\$?([\d,]+\.?\d*)\s*(trillion|billion|million|T|B|M)?/i,
    /total\s+revenue[^$\d]{0,20}\$?([\d,]+\.?\d*)\s*(trillion|billion|million|T|B|M)?/i,
  ];
  for (const re of revPatterns) {
    const m = text.match(re);
    if (m) {
      const v = toAbsolute(parseFloat(m[1].replace(/,/g, "")), m[2]);
      if (Number.isFinite(v) && v > 0) { revenue = v; break; }
    }
  }

  // Growth: explicit YoY percentage
  let growth = null;
  const growthPatterns = [
    /(?:revenue|sales|net\s+sales)\s+(?:grew|increased|rose|up)[^+\-\d]{0,20}([+-]?[\d.]+)\s*%/i,
    /([+-]?[\d.]+)\s*%\s*(?:YoY|year[- ]over[- ]year)/i,
    /YoY[^+\-\d]{0,15}([+-]?[\d.]+)\s*%/i,
    /(?:grew|increased|rose)[^+\-\d]{0,15}([+]?[\d.]+)\s*%\s*(?:YoY|year[- ]over[- ]year|compared)/i,
    /growth[^+\-\d]{0,15}([+-]?[\d.]+)\s*%/i,
  ];
  for (const re of growthPatterns) {
    const m = text.match(re);
    if (m) {
      const v = parseFloat(m[1]);
      if (Number.isFinite(v)) { growth = v; break; }
    }
  }

  // Margin: gross or operating margin percentage
  let margin = null;
  const marginPatterns = [
    /gross\s+margin[^+\-\d]{0,20}([+-]?[\d.]+)\s*%/i,
    /operating\s+margin[^+\-\d]{0,20}([+-]?[\d.]+)\s*%/i,
    /margin\s+(?:of|at|was|is|:)[^+\-\d]{0,10}([+-]?[\d.]+)\s*%/i,
    /margin[^+\-\d]{0,20}([+-]?[\d.]+)\s*%/i,
  ];
  for (const re of marginPatterns) {
    const m = text.match(re);
    if (m) {
      const v = parseFloat(m[1]);
      if (Number.isFinite(v) && v > 0 && v <= 100) { margin = v; break; }
    }
  }

  return { revenue, growth, margin };
}

function StatSparkline({ data, stroke }) {
  const w = 160;
  const h = 40;
  const pad = 2;
  const arr = Array.isArray(data) && data.length ? data : [0, 0, 0, 0, 0];
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const span = max === min ? 1 : max - min;
  const id = `spark-${stroke?.replace(/[^a-z0-9]/gi, "") || "def"}`;
  const points = arr.map((v, i) => {
    const x = pad + (i / Math.max(arr.length - 1, 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / span) * (h - pad * 2);
    return { x: x.toFixed(1), y: y.toFixed(1) };
  });
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaD = `${d} L${points[points.length - 1].x},${h} L${points[0].x},${h} Z`;
  return (
    <svg
      className="cfo-stat-spark w-full text-transparent"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatCard({ label, value, trendLabel, trendUp, trendDown, sparkData, sparkStroke }) {
  const TrendIcon = trendUp ? TrendingUp : trendDown ? TrendingDown : null;
  const showTrendText = typeof trendLabel === "string" && trendLabel.trim().length > 0;
  return (
    <div className="group flex flex-col rounded-2xl border border-white/[0.06] bg-card px-4 pb-2 pt-4 transition-colors duration-200 hover:border-white/[0.12]">
      <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">{label}</p>
      <div className="mt-2 flex min-h-[2.25rem] items-baseline justify-between gap-2">
        <span className="text-[28px] font-semibold leading-none tracking-tight text-white/90">{value}</span>
        {(TrendIcon || showTrendText) && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
              trendUp
                ? "bg-emerald-500/10 text-emerald-400"
                : trendDown
                  ? "bg-red-500/10 text-red-400"
                  : "text-white/30"
            }`}
          >
            {TrendIcon ? <TrendIcon className="h-3 w-3" aria-hidden /> : <Minus className="h-3 w-3" aria-hidden />}
            {showTrendText ? <span>{trendLabel}</span> : null}
          </span>
        )}
      </div>
      <div className="mt-2 border-t border-white/[0.04] pt-1">
        <StatSparkline data={sparkData} stroke={sparkStroke} />
      </div>
    </div>
  );
}

function NavIconButton({ onClick, label, Icon, active }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`group/nav relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-150 ${
        active
          ? "bg-white/[0.08] text-white"
          : "text-white/40 hover:bg-white/[0.06] hover:text-white/70"
      }`}
    >
      <Icon className="h-[18px] w-[18px]" aria-hidden strokeWidth={1.75} />
      <span className="pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded-lg bg-white/10 px-2.5 py-1 text-[11px] text-white/80 backdrop-blur-xl group-hover/nav:block">
        {label}
      </span>
    </button>
  );
}

export default function DashboardClient() {
  const { user } = useUser();
  const skipPersistRef = useRef(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const [activeTab, setActiveTab] = useState("overview");
  const [files, setFiles] = useState([]);
  const [summary, setSummary] = useState("");
  const [summaryHint, setSummaryHint] = useState("");
  const [summaryTargetFile, setSummaryTargetFile] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [charts, setCharts] = useState([]);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [chartsHint, setChartsHint] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const [compareDocumentNames, setCompareDocumentNames] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [excelExporting, setExcelExporting] = useState(false);
  const chartsExportRef = useRef(null);

  const handleChatMessagesChange = useCallback((next) => {
    setChatMessages(Array.isArray(next) ? next : []);
  }, []);

  const chatStorageKey = useMemo(
    () =>
      buildChatStorageKey({
        compareMode,
        compareDocumentNames,
        summaryTargetFile
      }),
    [compareMode, compareDocumentNames, summaryTargetFile]
  );

  const stats = useMemo(() => {
    const docCount = files?.length ?? 0;
    const first = charts?.[0];
    const second = charts?.[1];
    const v1 = (first?.points || []).map((p) => p.value).filter((x) => Number.isFinite(x));
    const v2 = (second?.points || []).map((p) => p.value).filter((x) => Number.isFinite(x));

    // Parse metrics from summary text — more reliable than deriving from chart bars
    const parsed = extractSummaryMetrics(summary);

    // Revenue: use summary-parsed figure; fall back to max of first chart (not sum)
    const revenueVal = parsed.revenue ?? (v1.length ? Math.max(...v1) : null);
    const revenueStr = revenueVal != null ? formatMoneyShort(revenueVal) : "—";
    const revTrend = parsed.growth ?? pctChangeFirstLast(v1);
    const revSpark = resampleSeries(v1);
    const revUp = revTrend != null ? revTrend > 0.05 : false;
    const revDown = revTrend != null ? revTrend < -0.05 : false;
    const revStroke = revUp ? "#34d399" : revDown ? "#f87171" : "rgba(255,255,255,0.2)";

    // Growth: use summary-parsed YoY %; fall back to period-over-period from a line chart (v2)
    const growthTrend = parsed.growth ?? pctChangeFirstLast(v2.length >= 2 ? v2 : v1);
    const growthStr = growthTrend != null ? formatPct(growthTrend) : "—";
    const gUp = growthTrend != null ? growthTrend > 0.05 : false;
    const gDown = growthTrend != null ? growthTrend < -0.05 : false;
    const gSpark = resampleSeries(v2.length ? v2 : v1.length ? v1 : [0, 0, 0]);
    const gStroke = gUp ? "#34d399" : gDown ? "#f87171" : "rgba(255,255,255,0.2)";

    const docStr = String(docCount);
    const docSpark = resampleSeries(
      Array.from({ length: 7 }, (_, i) => Math.max(0, docCount * (i / 6)))
    );
    const docStroke = docCount > 0 ? "#34d399" : "rgba(255,255,255,0.2)";

    // Margin: use summary-parsed %; fall back to pctChange of second chart series
    const marginPct = parsed.margin ?? (v2.length >= 2 ? pctChangeFirstLast(v2) : null);
    const marginStr = marginPct != null ? `${marginPct.toFixed(1)}%` : "—";
    const mUp = marginPct != null ? marginPct > 0.05 : false;
    const mDown = marginPct != null ? marginPct < -0.05 : false;
    const mSpark = resampleSeries(v2.length ? v2 : v1.length ? v1 : [0, 0, 0]);
    const mStroke = mUp ? "#34d399" : mDown ? "#f87171" : "rgba(255,255,255,0.2)";

    return {
      revenue: { label: "Total Revenue", value: revenueStr, trendLabel: revTrend != null ? formatPct(revTrend) : "—", trendUp: revUp, trendDown: revDown, sparkData: revSpark, sparkStroke: revStroke },
      growth: { label: "Growth", value: growthStr, trendLabel: "", trendUp: gUp, trendDown: gDown, sparkData: gSpark, sparkStroke: gStroke },
      documents: { label: "Documents", value: docStr, trendLabel: docCount > 0 ? "indexed" : "", trendUp: docCount > 0, trendDown: false, sparkData: docSpark, sparkStroke: docStroke },
      margin: { label: "Margin", value: marginStr, trendLabel: "", trendUp: mUp, trendDown: mDown, sparkData: mSpark, sparkStroke: mStroke }
    };
  }, [files, charts, summary]);

  function scrollToId(id) {
    const el = typeof document !== "undefined" ? document.getElementById(id) : null;
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleExportPdf() {
    setPdfExporting(true);
    try {
      let chartImageDataUrl = null;
      const el = chartsExportRef.current;
      if (el && charts.length > 0 && !chartsLoading && el.offsetHeight > 0) {
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#09090B",
          windowWidth: el.scrollWidth,
          windowHeight: el.scrollHeight
        });
        chartImageDataUrl = canvas.toDataURL("image/png");
      }
      exportCfoaiDashboardPdf({
        summary,
        documentName: summaryTargetFile || "Report",
        generatedAt: new Date(),
        chartImageDataUrl,
        chatMessages
      });
      toast.success("PDF downloaded");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "PDF export failed.";
      toast.error(msg);
    } finally {
      setPdfExporting(false);
    }
  }

  async function handleExportExcel() {
    setExcelExporting(true);
    try {
      const displayName =
        user?.fullName?.trim() ||
        [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
        user?.username?.trim() ||
        "";
      await exportCfoaiDashboardXlsx({
        summary,
        documentName: summaryTargetFile || "Report",
        generatedAt: new Date(),
        charts,
        chatMessages,
        appVersion: process.env.NEXT_PUBLIC_APP_VERSION || "",
        userInfo: {
          userId: user?.id ?? "",
          email: user?.primaryEmailAddress?.emailAddress ?? "",
          displayName
        }
      });
      toast.success("Excel downloaded");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Excel export failed.";
      toast.error(msg);
    } finally {
      setExcelExporting(false);
    }
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(UPLOAD_LIST_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.files) && parsed.files.length > 0) {
        setFiles(parsed.files);
      }
      if (typeof parsed.summaryTargetFile === "string" && parsed.summaryTargetFile) {
        setSummaryTargetFile(parsed.summaryTargetFile);
      }
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  useEffect(() => {
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    try {
      localStorage.setItem(
        UPLOAD_LIST_STORAGE_KEY,
        JSON.stringify({ files, summaryTargetFile })
      );
    } catch {
      /* quota or private mode */
    }
  }, [files, summaryTargetFile]);

  async function generateChartsFromSummary(summaryText) {
    const raw = typeof summaryText === "string" ? summaryText : "";
    const t = raw.trim();
    if (!t) {
      setCharts([]);
      setChartsHint("");
      return;
    }
    setChartsLoading(true);
    setChartsHint("");
    try {
      const res = await fetch("/api/charts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t })
      });
      const data = await res.json().catch(() => ({}));
      const nextCharts = Array.isArray(data.charts) ? data.charts : [];
      setCharts(nextCharts);
      if (nextCharts.length > 0) {
        setChartsHint("");
      } else if (!res.ok) {
        const msg = data.hint || data.error || "Charts could not be generated.";
        setChartsHint(typeof msg === "string" ? msg : String(msg));
      } else if (data.hint) {
        setChartsHint(typeof data.hint === "string" ? data.hint : String(data.hint));
      } else {
        setChartsHint("No comparable numeric series found in this summary.");
      }
    } catch {
      setCharts([]);
      setChartsHint("Could not build charts. Check your connection and OPENAI_API_KEY.");
    } finally {
      setChartsLoading(false);
    }
  }

  async function refreshSummary(filename) {
    const name = typeof filename === "string" ? filename.trim() : "";
    if (!name) {
      setSummary("");
      setSummaryHint("");
      setCharts([]);
      setChartsHint("");
      setChartsLoading(false);
      return;
    }
    setSummaryLoading(true);
    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: name })
      });
      const raw = await res.text();
      const trimmed = String(raw ?? "").replace(/^\uFEFF/, "").trimStart();
      let data = {};
      try {
        data = trimmed ? JSON.parse(trimmed) : {};
      } catch {
        setSummary("");
        const snippet = trimmed.slice(0, 200).replace(/\s+/g, " ");
        const looksHtml = /^<!DOCTYPE|^<html[\s>]/i.test(trimmed);
        setSummaryHint(
          looksHtml
            ? `Summary API returned HTML (${res.status}) instead of JSON — usually a server crash. Open the Next.js terminal and look for the stack trace when you click Generate summary.`
            : `Summary API returned non-JSON (${res.status}). ${snippet ? `Start of body: ${snippet}` : "Empty body."}`
        );
        setCharts([]);
        setChartsHint("");
        setChartsLoading(false);
        return;
      }
      const nextSummary = typeof data.summary === "string" ? data.summary : "";
      setSummary(nextSummary);
      setSummaryHint(
        data.degraded && data.hint
          ? data.hint
          : !res.ok
            ? typeof data.error === "string"
              ? data.error
              : String(data.error || "")
            : !nextSummary.trim()
              ? "No indexed text found for this file in Chroma. Re-upload the document with Chroma running, or pick the exact filename from the list."
              : ""
      );
      setCharts([]);
      setChartsHint("");
      setChartsLoading(false);
    } catch {
      setSummaryHint("Could not refresh summary. Check your connection and try again.");
      setSummary("");
      setCharts([]);
      setChartsHint("");
      setChartsLoading(false);
    } finally {
      setSummaryLoading(false);
    }
  }

  async function removeFileAt(index) {
    const removed = files[index];
    if (!removed) return;
    const filename = typeof removed.name === "string" ? removed.name : "";
    const nextFiles = files.filter((_, i) => i !== index);
    setFiles(nextFiles);
    setCompareDocumentNames((prev) => prev.filter((n) => nextFiles.some((f) => f.name === n)));

    const sameNameRemains = nextFiles.some((f) => f.name === removed.name);
    if (filename && !sameNameRemains) {
      try {
        const res = await fetch("/api/upload", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.warn("Chroma delete:", err?.error || res.status);
        }
      } catch {
        console.warn("Chroma delete: network error");
      }
    }

    const wasSelected = summaryTargetFile === removed.name;
    if (wasSelected && !sameNameRemains) {
      const nextTarget = nextFiles[0]?.name ?? "";
      setSummaryTargetFile(nextTarget);
      setSummary("");
      setSummaryHint("");
      setCharts([]);
      setChartsHint("");
    }
  }

  function handleUploaded(data) {
    if (!data?.files?.length) return;
    setFiles((prev) => [...data.files, ...prev]);
    const uploaded = data.files;
    const primary = uploaded[uploaded.length - 1]?.name;
    if (primary) {
      setSummaryTargetFile(primary);
    }
    setSummary("");
    setSummaryHint("");
    setCharts([]);
    setChartsHint("");
    setChartsLoading(false);
  }

  const asideWidth = sidebarExpanded ? "w-[min(20rem,85vw)]" : "w-14";

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      {/* ── Header ── */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-3 md:px-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.5px", color: "white" }}
            className="font-display lowercase"
          >
            cfoai.
          </Link>
          <span className="hidden h-4 w-px bg-white/[0.08] sm:block" />
          <nav className="hidden items-center gap-1 sm:flex">
            {[
              { id: "overview", label: "Overview" },
              { id: "documents", label: "Documents" },
              { id: "analytics", label: "Analytics" },
              { id: "simulate", label: "Simulate" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === "documents") { setSidebarExpanded(true); requestAnimationFrame(() => scrollToId("dash-files")); }
                  if (tab.id === "analytics") scrollToId("dash-charts");
                }}
                className={`rounded-lg px-3 py-1.5 text-xs transition ${
                  activeTab === tab.id
                    ? "bg-white/[0.06] font-medium text-white/80"
                    : "text-white/40 hover:bg-white/[0.04] hover:text-white/60"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {user?.firstName && (
            <span className="hidden text-xs text-white/40 md:block">{user.firstName}</span>
          )}
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: { avatarBox: "h-8 w-8 ring-1 ring-white/[0.08]" }
            }}
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ── Sidebar ── */}
        <aside
          className={`flex min-h-0 shrink-0 flex-col border-r border-white/[0.06] bg-[#09090B] transition-[width] duration-200 ease-out ${asideWidth}`}
        >
          <div className="flex shrink-0 flex-col items-center gap-1 py-3">
            <button
              type="button"
              title={sidebarExpanded ? "Collapse" : "Expand"}
              aria-expanded={sidebarExpanded}
              aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
              onClick={() => setSidebarExpanded((x) => !x)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition hover:bg-white/[0.06] hover:text-white/60"
            >
              {sidebarExpanded ? (
                <ChevronLeft className="h-4 w-4" aria-hidden strokeWidth={2} />
              ) : (
                <ChevronRight className="h-4 w-4" aria-hidden strokeWidth={2} />
              )}
            </button>
          </div>

          <div className="flex shrink-0 flex-col items-center gap-1.5 border-t border-white/[0.04] py-3">
            <NavIconButton onClick={() => { setSidebarExpanded(true); requestAnimationFrame(() => scrollToId("dash-upload")); }} label="Upload" Icon={UploadCloud} />
            <NavIconButton onClick={() => { setSidebarExpanded(true); requestAnimationFrame(() => scrollToId("dash-files")); }} label="Files" Icon={Files} />
          </div>

          <div className="flex shrink-0 flex-col items-center gap-1.5 border-t border-white/[0.04] py-3">
            <NavIconButton onClick={() => scrollToId("dash-summary")} label="Summary" Icon={AlignLeft} />
            <NavIconButton onClick={() => scrollToId("dash-charts")} label="Charts" Icon={LineChart} />
            <NavIconButton onClick={() => scrollToId("dash-chat")} label="Chat" Icon={MessageSquare} />
          </div>

          {sidebarExpanded && (
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto border-t border-white/[0.04] p-4">
              <div id="dash-upload" className="space-y-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40">Upload Reports</h2>
                <FileUpload onUploaded={handleUploaded} />
                {files.length === 0 && (
                  <p className="text-[11px] leading-relaxed text-white/30">
                    Upload a report to enable summaries, charts, and AI Q&A.
                  </p>
                )}
              </div>
              <Separator className="bg-white/[0.04]" />
              <div id="dash-files" className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">Files</h3>
                <FileList
                  files={files}
                  selectedForSummary={summaryTargetFile}
                  onSelectForSummary={setSummaryTargetFile}
                  onRemoveAt={removeFileAt}
                />
              </div>
            </div>
          )}
        </aside>

        {/* ── Main content ── */}
        <section className="min-w-0 flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
          {activeTab === "simulate" ? (
            <div id="dash-simulate">
              <div className="rounded-2xl border border-white/[0.06] bg-card p-5 md:p-6">
                <SimulatePanel
                  summary={summary}
                  files={files}
                  summaryTargetFile={summaryTargetFile}
                  onSummaryTargetFileChange={setSummaryTargetFile}
                />
              </div>
            </div>
          ) : (
          <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard {...stats.revenue} />
            <StatCard {...stats.growth} />
            <StatCard {...stats.documents} />
            <StatCard {...stats.margin} />
          </div>

          {/* Summary section */}
          <div id="dash-summary">
            <div className="mb-2 flex items-center gap-2">
              <AlignLeft className="h-3.5 w-3.5 text-white/30" aria-hidden />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/30">Summary</span>
            </div>
            <Summary
              summary={summary}
              hint={summaryHint}
              documents={files}
              selectedFilename={summaryTargetFile}
              onSelectedFilenameChange={setSummaryTargetFile}
              onGenerateSummary={() => refreshSummary(summaryTargetFile)}
              isGenerating={summaryLoading}
              onExportPdf={handleExportPdf}
              isExportingPdf={pdfExporting}
              onExportExcel={handleExportExcel}
              isExportingExcel={excelExporting}
            />
          </div>

          {/* Charts section */}
          <div id="dash-charts">
            <div className="mb-2 flex items-center gap-2">
              <LineChart className="h-3.5 w-3.5 text-white/30" aria-hidden />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/30">Analytics</span>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-card p-5 md:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-xs leading-relaxed text-white/35">
                  Charts generated from your document data.
                </p>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={!summary.trim() || chartsLoading || summaryLoading}
                  onClick={() => void generateChartsFromSummary(summary)}
                >
                  {chartsLoading ? "Building…" : charts.length ? "Regenerate" : "Build charts"}
                </Button>
              </div>
              <div ref={chartsExportRef} className="mt-4 cfoai-charts-export">
                <FinancialCharts charts={charts} loading={chartsLoading} hint={chartsHint} />
              </div>
            </div>
          </div>

          {/* Chat section */}
          <div id="dash-chat">
            <div className="mb-2 flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-white/30" aria-hidden />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/30">Ask</span>
            </div>
            <Chat
              documents={files}
              compareMode={compareMode}
              onCompareModeChange={setCompareMode}
              compareDocumentNames={compareDocumentNames}
              onCompareDocumentNamesChange={setCompareDocumentNames}
              onMessagesChange={handleChatMessagesChange}
              chatStorageKey={chatStorageKey}
            />
          </div>

          </>
          )}
        </section>
      </div>
    </main>
  );
}
