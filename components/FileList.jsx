"use client";

import { FileText, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function shortFileType(type) {
  const t = (type || "").toLowerCase();
  if (!t || t === "unknown") return "File";
  if (t.includes("pdf")) return "PDF";
  if (t.includes("sheet") || t.includes("excel") || t === "application/vnd.ms-excel") return "Excel";
  if (t.includes("csv")) return "CSV";
  if (t.startsWith("image/")) return "Image";
  const s = type || "";
  return s.length > 16 ? `${s.slice(0, 14)}…` : s;
}

export default function FileList({ files, selectedForSummary, onSelectForSummary, onRemoveAt }) {
  if (!files?.length) {
    return (
      <p className="rounded-xl border border-dashed border-white/[0.06] bg-white/[0.02] px-3 py-6 text-center text-xs text-white/25">
        No files uploaded yet.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {files.map((file, idx) => {
        const selected = selectedForSummary && file.name === selectedForSummary;
        return (
          <div
            key={file.id ? String(file.id) : `${file.name}-${idx}`}
            title={file.name}
            role="button"
            tabIndex={0}
            onClick={() => onSelectForSummary?.(file.name)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectForSummary?.(file.name);
              }
            }}
            className={`group relative w-full cursor-pointer rounded-xl px-3 py-3 pr-9 text-left transition-all duration-150 ${
              selected
                ? "border border-accent/30 bg-accent/[0.06]"
                : "border border-transparent hover:bg-white/[0.03]"
            }`}
          >
            {onRemoveAt && (
              <button
                type="button"
                title="Remove"
                aria-label={`Remove ${file.name}`}
                className="absolute right-2 top-2.5 z-10 rounded-lg p-1 text-white/20 opacity-0 transition group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveAt(idx);
                }}
              >
                <X className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
              </button>
            )}
            <div className="flex gap-2.5">
              <FileText className={`mt-0.5 h-4 w-4 shrink-0 ${selected ? "text-accent" : "text-white/20"}`} aria-hidden />
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="break-words text-xs leading-snug text-white/70">{file.name}</p>
                <Badge>{shortFileType(file.type)}</Badge>
              </div>
            </div>
            {file.indexError && (
              <p className="mt-2 text-left text-[10px] leading-snug text-amber-300/70">{file.indexError}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
