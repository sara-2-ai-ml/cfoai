"use client";

import SummaryMarkdown from "@/components/SummaryMarkdown";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Summary({
  summary,
  hint,
  documents = [],
  selectedFilename = "",
  onSelectedFilenameChange,
  onGenerateSummary,
  isGenerating = false,
  onExportPdf,
  isExportingPdf = false,
  onExportExcel,
  isExportingExcel = false
}) {
  const hasDocs = documents.length > 0;

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-white/90">Financial Summary</h3>
            <p className="mt-1 text-[11px] text-white/30">Select a document and generate insights</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              className="h-8 min-w-[12rem] rounded-lg border border-white/[0.08] bg-[#09090B] px-2.5 text-xs text-white/70 focus:border-accent/40 focus:outline-none sm:max-w-xs"
              value={selectedFilename}
              onChange={(e) => onSelectedFilenameChange?.(e.target.value)}
              disabled={!hasDocs}
            >
              {!hasDocs ? (
                <option value="">No documents</option>
              ) : (
                documents.map((d, i) => (
                  <option key={d.id || `${d.name}-${i}`} value={d.name}>
                    {d.name}
                  </option>
                ))
              )}
            </select>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                variant="default"
                size="sm"
                disabled={!selectedFilename || isGenerating}
                onClick={() => onGenerateSummary?.()}
              >
                {isGenerating ? "Generating…" : "Generate"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={isExportingPdf || isExportingExcel || isGenerating}
                onClick={() => void onExportPdf?.()}
              >
                {isExportingPdf ? "Exporting…" : "PDF"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="border-emerald-500/15 text-emerald-400/80 hover:bg-emerald-500/[0.08]"
                disabled={isExportingExcel || isExportingPdf || isGenerating}
                onClick={() => void onExportExcel?.()}
              >
                {isExportingExcel ? "Exporting…" : "Excel"}
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {hint && (
          <p className="mb-3 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] px-3 py-2 text-[11px] leading-relaxed text-amber-200/70">
            {typeof hint === "string" ? hint : String(hint)}
          </p>
        )}
        {summary ? (
          <SummaryMarkdown content={summary} />
        ) : (
          <p className="text-xs text-white/25">
            Choose a document and click <span className="text-white/50">Generate</span> to get started.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
