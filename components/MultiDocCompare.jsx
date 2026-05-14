"use client";

import { useMemo, useState } from "react";
import SummaryMarkdown from "@/components/SummaryMarkdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MAX = 3;

export default function MultiDocCompare({ documents = [] }) {
  /** One row per filename — duplicate uploads with the same name count as one pick. */
  const names = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const d of documents) {
      const n = typeof d?.name === "string" ? d.name.trim() : "";
      if (!n || seen.has(n)) continue;
      seen.add(n);
      out.push(n);
    }
    return out;
  }, [documents]);
  const [picked, setPicked] = useState([]);
  const [text, setText] = useState("");
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);

  function toggle(name) {
    const n = name.trim();
    if (!n) return;
    setPicked((prev) => {
      if (prev.includes(n)) return prev.filter((x) => x !== n);
      if (prev.length >= MAX) return prev;
      return [...prev, n];
    });
  }

  async function runCompare() {
    if (picked.length < 2) return;
    setLoading(true);
    setHint("");
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filenames: picked })
      });
      const raw = await res.text();
      const trimmed = String(raw ?? "").replace(/^\uFEFF/, "").trimStart();
      let data = {};
      try {
        data = trimmed ? JSON.parse(trimmed) : {};
      } catch {
        setText("");
        setHint(`Non-JSON response (${res.status}). Check the Next.js terminal.`);
        return;
      }
      const next = typeof data.comparison === "string" ? data.comparison : "";
      setText(next);
      setHint(
        data.degraded && data.hint
          ? data.hint
          : !res.ok
            ? typeof data.error === "string"
              ? data.error
              : String(data.error || "")
            : !next.trim()
              ? "No comparison text returned — ensure each file has indexed chunks in Chroma."
              : ""
      );
    } catch {
      setHint("Could not run comparison. Check your connection.");
      setText("");
    } finally {
      setLoading(false);
    }
  }

  if (names.length < 2) {
    return (
      <Card className="bg-[#101114]">
        <CardHeader>
          <CardTitle>Compare reports (multi-document)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-white/50">
            Upload and index at least <span className="text-white/70">two</span> reports, then you can
            select up to three and generate a side-by-side CFO-style comparison.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#101114]">
      <CardHeader className="space-y-2">
        <CardTitle>Compare reports (multi-document)</CardTitle>
        <p className="text-xs leading-relaxed text-white/50">
          Select <span className="text-white/70">2–3 different</span> indexed reports (different file
          names). Then press <span className="text-white/70">Compare selected</span> — the model pulls
          Chroma excerpts per file and writes one comparison.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {names.length >= 2 && picked.length < 2 ? (
          <p className="text-xs leading-relaxed text-amber-100/80">
            Tick at least <strong className="font-semibold">two different</strong> names below. The same
            PDF listed twice still counts as one document.
          </p>
        ) : null}
        <ul className="space-y-2">
          {names.map((name) => {
            const on = picked.includes(name);
            const disabledToggle = !on && picked.length >= MAX;
            return (
              <li key={name}>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 transition hover:border-white/20">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 rounded border-white/30 bg-black/50 accent-[#00D4FF]"
                    checked={on}
                    disabled={disabledToggle}
                    onChange={() => toggle(name)}
                  />
                  <span className="min-w-0 flex-1 break-words text-sm text-white/85">{name}</span>
                </label>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="border border-white/15"
            disabled={picked.length < 2 || loading}
            onClick={() => void runCompare()}
          >
            {loading
              ? "Comparing…"
              : picked.length < 2
                ? `Compare selected (pick ${2 - picked.length} more)`
                : `Compare selected (${picked.length} file${picked.length > 1 ? "s" : ""})`}
          </Button>
          {picked.length > 0 ? (
            <Button type="button" variant="ghost" size="sm" className="text-white/60" onClick={() => setPicked([])}>
              Clear selection
            </Button>
          ) : null}
        </div>
        {hint ? (
          <p className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-100/90">
            {hint}
          </p>
        ) : null}
        {text ? (
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <SummaryMarkdown content={text} />
          </div>
        ) : !hint && !loading ? (
          <p className="text-sm text-white/45">
            Choose two or three <span className="text-white/65">different</span> files, then press{" "}
            <span className="text-white/65">Compare selected</span>.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
