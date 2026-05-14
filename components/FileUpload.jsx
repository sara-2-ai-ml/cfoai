"use client";

import { useState } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FileUpload({ onUploaded }) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadHint, setUploadHint] = useState("");

  async function uploadFiles(fileList) {
    if (!fileList?.length) return;
    setIsUploading(true);
    setUploadError("");
    setUploadHint("");
    try {
      const formData = new FormData();
      for (const file of fileList) {
        formData.append("files", file);
      }
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "same-origin"
      });
      const raw = await res.text();
      const trimmed = String(raw ?? "").replace(/^\uFEFF/, "").trimStart();
      let data = {};
      try {
        data = trimmed ? JSON.parse(trimmed) : {};
      } catch {
        setUploadError(
          `The server did not return JSON (HTTP ${res.status}). Check the Next.js terminal for errors.`
        );
        return;
      }
      if (!res.ok || data.success === false) {
        const base =
          (typeof data.error === "string" && data.error) ||
          (typeof data.message === "string" && data.message) ||
          `Upload failed (HTTP ${res.status})`;
        setUploadError(data.code ? `${base} [${data.code}]` : base);
        return;
      }
      if (!Array.isArray(data.files) || data.files.length === 0) {
        setUploadError(
          "No file list in the response. Check ChromaDB, OPENAI_API_KEY, and the Next.js terminal."
        );
        return;
      }
      onUploaded?.(data);
      if (typeof data.hint === "string" && data.hint.trim()) {
        setUploadHint(data.hint.trim());
      }
    } catch {
      setUploadError(
        "Could not reach /api/upload. Confirm the app is running on this host and port (same tab URL)."
      );
    } finally {
      setIsUploading(false);
    }
  }

  function onInputChange(e) {
    const input = e.currentTarget;
    const picked = Array.from(input.files || []);
    void (async () => {
      try {
        await uploadFiles(picked);
      } finally {
        input.value = "";
      }
    })();
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          e.stopPropagation();
          const next = e.relatedTarget;
          if (!next || !e.currentTarget.contains(next)) {
            setIsDragOver(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
          void uploadFiles(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "border-b border-white/[0.04] px-5 py-8 transition-colors duration-200",
          isDragOver ? "bg-accent/[0.06] border-accent/20" : "bg-transparent"
        )}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
            isDragOver ? "bg-accent/10" : "bg-white/[0.04]"
          )}>
            <UploadCloud className={cn("h-5 w-5", isDragOver ? "text-accent" : "text-white/30")} aria-hidden />
          </div>
          <div>
            <p className="text-sm font-medium text-white/60">Drop files here</p>
            <p className="mt-1 text-[11px] text-white/25">PDF, Excel, CSV, or images</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 px-5 py-4">
        {uploadError && (
          <div role="alert" className="w-full rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2.5">
            <p className="text-center text-[11px] leading-relaxed text-red-300/90">{uploadError}</p>
          </div>
        )}

        {uploadHint && (
          <div role="status" className="w-full rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2.5">
            <p className="text-center text-[11px] leading-relaxed text-amber-200/80">{uploadHint}</p>
          </div>
        )}

        <div className="flex w-full flex-col items-center gap-2">
          <p className="text-[11px] text-white/25">or browse from device</p>
          <input
            type="file"
            multiple
            accept=".pdf,.xls,.xlsx,.csv,image/*"
            disabled={isUploading}
            onChange={onInputChange}
            className={cn(
              "w-full max-w-xs cursor-pointer text-xs text-white/30 file:mr-2 file:cursor-pointer file:rounded-lg file:border-0 file:bg-white/[0.06] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white/60 file:transition file:hover:bg-white/[0.1]",
              isUploading && "pointer-events-none opacity-40"
            )}
          />
          {isUploading && (
            <div className="w-full max-w-xs space-y-1.5" aria-live="polite">
              <p className="text-center text-[11px] text-white/35">Uploading and indexing…</p>
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.04]">
                <div className="cfo-upload-indeterminate h-full w-2/5 rounded-full bg-accent/60" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
