"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { dedupeCitations } from "@/lib/citations";
import { Button } from "@/components/ui/button";
import CompareResult from "@/components/CompareResult";
import { ArrowUp, MessageSquare } from "lucide-react";

function uniqueFilenames(documents) {
  const seen = new Set();
  const out = [];
  for (const d of documents || []) {
    const n = typeof d?.name === "string" ? d.name.trim() : "";
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

export default function Chat({
  documents = [],
  compareMode = false,
  onCompareModeChange,
  compareDocumentNames = [],
  onCompareDocumentNamesChange,
  onMessagesChange,
  chatStorageKey = ""
}) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const hydratedRef = useRef(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    onMessagesChange?.(messages);
  }, [messages, onMessagesChange]);

  useEffect(() => {
    hydratedRef.current = false;
    if (!chatStorageKey) {
      setMessages([]);
      hydratedRef.current = true;
      return;
    }
    try {
      const raw = localStorage.getItem(chatStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        setMessages(Array.isArray(parsed) ? parsed : []);
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    }
    hydratedRef.current = true;
  }, [chatStorageKey]);

  useEffect(() => {
    if (!hydratedRef.current || !chatStorageKey) return;
    try {
      localStorage.setItem(chatStorageKey, JSON.stringify(messages));
    } catch {
      /* quota */
    }
  }, [messages, chatStorageKey]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const docNames = useMemo(() => uniqueFilenames(documents), [documents]);
  const canUseCompare = docNames.length >= 2;
  const compareReady = compareMode && compareDocumentNames.length >= 2;

  function toggleCompareName(name) {
    if (!onCompareDocumentNamesChange) return;
    onCompareDocumentNamesChange((prev) => {
      const p = Array.isArray(prev) ? prev : [];
      if (p.includes(name)) return p.filter((x) => x !== name);
      if (p.length >= 3) return p;
      return [...p, name];
    });
  }

  function clearHistory() {
    if (!chatStorageKey) return;
    setMessages([]);
    try {
      localStorage.removeItem(chatStorageKey);
    } catch {
      /* ignore */
    }
    toast.success("Chat history cleared");
  }

  async function askQuestion(e) {
    e.preventDefault();
    if (!question.trim() || isLoading) return;
    if (compareMode && compareDocumentNames.length < 2) return;

    const currentQuestion = question.trim();
    const orderedCompareNames = compareReady
      ? docNames.filter((n) => compareDocumentNames.includes(n))
      : [];
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", content: currentQuestion }]);
    setIsLoading(true);

    let assistantIndex = -1;
    setMessages((prev) => {
      assistantIndex = prev.length;
      return [
        ...prev,
        {
          role: "assistant",
          content: "",
          citations: [],
          compareAnswer: compareReady && orderedCompareNames.length >= 2
        }
      ];
    });

    const rollbackLastExchange = () => {
      setMessages((prev) => (prev.length >= 2 ? prev.slice(0, -2) : prev));
    };

    try {
      const payload = {
        question: currentQuestion,
        ...(compareReady && orderedCompareNames.length >= 2
          ? { compareDocumentNames: orderedCompareNames }
          : {})
      };

      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg =
          typeof errBody.error === "string" && errBody.error
            ? errBody.error
            : "Could not reach the AI service.";
        toast.error(msg);
        rollbackLastExchange();
        return;
      }

      if (!res.body) {
        toast.error("Failed to query");
        rollbackLastExchange();
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          const line = chunk.split("\n").find((x) => x.startsWith("data: "));
          if (!line) continue;
          let data;
          try {
            data = JSON.parse(line.replace("data: ", ""));
          } catch {
            toast.error("Invalid response from server");
            continue;
          }

          if (data.type === "error") {
            toast.error(data.message || "Streaming failed");
            setMessages((prev) => {
              const copy = [...prev];
              if (
                assistantIndex >= 0 &&
                copy[assistantIndex]?.role === "assistant" &&
                !String(copy[assistantIndex]?.content || "").trim()
              ) {
                copy.splice(assistantIndex, 1);
              }
              return copy;
            });
            return;
          }

          if (data.type === "token") {
            setMessages((prev) => {
              const copy = [...prev];
              copy[assistantIndex] = {
                ...copy[assistantIndex],
                content: `${copy[assistantIndex].content}${data.token}`
              };
              return copy;
            });
          }

          if (data.type === "done") {
            setMessages((prev) => {
              const copy = [...prev];
              const cur = copy[assistantIndex];
              copy[assistantIndex] = {
                ...cur,
                citations: data.citations || [],
                compareAnswer: cur?.compareAnswer ?? false
              };
              return copy;
            });
          }
        }
      }
    } catch (error) {
      const fallback = "Sorry, I could not answer that request.";
      const msg =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : error != null
              ? String(error)
              : fallback;
      toast.error(msg || fallback);
      setMessages((prev) => {
        if (assistantIndex >= 0 && prev[assistantIndex]) {
          const copy = [...prev];
          copy[assistantIndex] = {
            ...copy[assistantIndex],
            content: msg || fallback
          };
          return copy;
        }
        return [...prev, { role: "assistant", content: msg || fallback }];
      });
    } finally {
      setIsLoading(false);
    }
  }

  const inputPlaceholder = compareReady
    ? "Compare selected documents..."
    : "Ask about your financial reports...";

  return (
    <div className="flex flex-col rounded-2xl border border-white/[0.06] bg-card">
      {/* Header */}
      <div className="border-b border-white/[0.04] px-5 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-medium text-white/70">Ask your documents</h2>
            <p className="mt-0.5 text-[11px] text-white/25">
              {compareMode
                ? "Compare mode — select 2–3 documents below"
                : "Answers use indexed report text"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="text-[11px] text-white/25 hover:text-white/50"
              disabled={!chatStorageKey || messages.length === 0}
              onClick={clearHistory}
            >
              Clear
            </Button>
            <Button
              variant={compareMode ? "accent" : "secondary"}
              size="sm"
              className="text-[11px]"
              disabled={!canUseCompare}
              title={!canUseCompare ? "Upload at least two documents" : undefined}
              onClick={() => {
                const next = !compareMode;
                onCompareModeChange?.(next);
                if (!next) onCompareDocumentNamesChange?.([]);
              }}
            >
              Compare {compareMode ? "ON" : "OFF"}
            </Button>
          </div>
        </div>

        {compareMode && (
          <div className="mt-3 rounded-xl border border-white/[0.04] bg-[#09090B] px-3 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/25">
              Documents to compare
            </p>
            {!canUseCompare ? (
              <p className="mt-2 text-[11px] text-amber-300/60">Upload at least two reports.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {docNames.map((name) => {
                  const on = compareDocumentNames.includes(name);
                  const atCap = !on && compareDocumentNames.length >= 3;
                  return (
                    <li key={name}>
                      <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/[0.03]">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-white/20 bg-transparent accent-accent"
                          checked={on}
                          disabled={atCap}
                          onChange={() => toggleCompareName(name)}
                        />
                        <span className="min-w-0 flex-1 break-words text-[11px] text-white/60">{name}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
            {compareMode && canUseCompare && compareDocumentNames.length < 2 && (
              <p className="mt-2 text-[11px] text-amber-300/60">Select at least two documents.</p>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="relative max-h-[min(52vh,26rem)] overflow-y-auto overscroll-y-contain p-4"
      >
        {/* Fade top */}
        <div className="pointer-events-none sticky -top-4 left-0 right-0 z-10 -mt-4 h-6 bg-gradient-to-b from-card to-transparent" />

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/[0.04] px-4 py-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.03]">
              <MessageSquare className="h-5 w-5 text-white/15" aria-hidden />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-white/40">No messages yet</p>
              <p className="max-w-sm text-[11px] leading-relaxed text-white/20">
                {compareReady
                  ? "Ask how metrics differ across your selected reports."
                  : "Type a question below — the assistant reads from your uploaded reports."}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, idx) => (
              <div key={idx} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    message.role === "user"
                      ? "bg-white/[0.08] text-white/80"
                      : "bg-transparent text-white/70"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <div className="max-w-none text-left text-sm leading-relaxed [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-white/80 [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-white/70 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-medium [&_li]:my-0.5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs [&_td]:border [&_td]:border-white/[0.06] [&_td]:px-2 [&_td]:py-1.5 [&_th]:border [&_th]:border-white/[0.08] [&_th]:bg-white/[0.03] [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:text-white/50 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5">
                      {message.compareAnswer && message.content ? (
                        <CompareResult
                          content={message.content}
                          compareDocumentNames={compareDocumentNames}
                        />
                      ) : (
                        <>
                          {message.compareAnswer && (
                            <p className="mb-2 border-b border-white/[0.04] pb-2 text-[10px] font-medium uppercase tracking-wider text-accent/70">
                              Cross-document comparison
                            </p>
                          )}
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            ))}
            {messages.length > 0 && messages[messages.length - 1].role === "assistant" && messages[messages.length - 1].citations?.length > 0 && (
              <div className="ml-1 space-y-0.5 text-[10px] text-white/25">
                {dedupeCitations(messages[messages.length - 1].citations).map((citation, i) => (
                  <p key={`${citation.file}-${citation.page ?? "p"}-${i}`}>
                    {citation.file}{citation.page != null ? ` · p${citation.page}` : ""}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={askQuestion} className="border-t border-white/[0.04] p-3">
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-[#09090B] px-3 py-1.5">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={inputPlaceholder}
            className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !question.trim() || (compareMode && compareDocumentNames.length < 2)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[#09090B] transition-all duration-150 hover:bg-white/90 disabled:opacity-20"
          >
            <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>
      </form>
    </div>
  );
}
