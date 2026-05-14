"use client";

import SimpleMarkdownBody from "@/components/SimpleMarkdownBody";

export default function SummaryMarkdown({ content }) {
  if (!content?.trim()) return null;
  return (
    <div className="summary-md max-h-[min(60vh,28rem)] overflow-y-auto pr-1">
      <SimpleMarkdownBody content={content} />
    </div>
  );
}
