"use client";

function inlineNodes(text, baseKey) {
  if (text == null || text === "") return null;
  const out = [];
  let s = String(text);
  let k = 0;
  while (s.length) {
    const link = s.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (link) {
      out.push(
        <a
          key={`${baseKey}-a-${k++}`}
          href={link[2]}
          className="text-accent underline underline-offset-2 hover:text-white"
          target="_blank"
          rel="noopener noreferrer"
        >
          {link[1]}
        </a>
      );
      s = s.slice(link[0].length);
      continue;
    }
    const bold = s.match(/^\*\*(.+?)\*\*/);
    if (bold) {
      out.push(
        <strong key={`${baseKey}-b-${k++}`} className="font-semibold text-white">
          {bold[1]}
        </strong>
      );
      s = s.slice(bold[0].length);
      continue;
    }
    const code = s.match(/^`([^`]+)`/);
    if (code) {
      out.push(
        <code
          key={`${baseKey}-c-${k++}`}
          className="rounded bg-white/10 px-1 py-0.5 font-mono text-xs text-accent"
        >
          {code[1]}
        </code>
      );
      s = s.slice(code[0].length);
      continue;
    }
    const italic = s.match(/^\*([^*]+)\*/);
    if (italic && !s.startsWith("**")) {
      out.push(
        <em key={`${baseKey}-i-${k++}`} className="italic text-white/85">
          {italic[1]}
        </em>
      );
      s = s.slice(italic[0].length);
      continue;
    }
    out.push(s[0]);
    s = s.slice(1);
  }
  return out.length ? out : null;
}

export default function SimpleMarkdownBody({ content }) {
  const text = String(content || "").replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const blocks = [];
  let line = 0;
  let bk = 0;

  while (line < lines.length) {
    const raw = lines[line];
    const t = raw.trim();
    const trimmedStart = raw.trimStart();

    if (t.startsWith("```")) {
      line++;
      const body = [];
      while (line < lines.length && !lines[line].trim().startsWith("```")) {
        body.push(lines[line]);
        line++;
      }
      if (line < lines.length) line++;
      blocks.push(
        <pre
          key={`md-${bk++}`}
          className="my-2 overflow-x-auto rounded-lg bg-black/40 p-3 text-xs text-white/85"
        >
          <code>{body.join("\n")}</code>
        </pre>
      );
      continue;
    }

    if (!t) {
      line++;
      continue;
    }

    if (t === "---" || t === "***" || t === "___") {
      blocks.push(<hr key={`md-${bk++}`} className="my-4 border-white/15" />);
      line++;
      continue;
    }

    if (trimmedStart.startsWith("### ")) {
      blocks.push(
        <h3 key={`md-${bk++}`} className="mb-1.5 mt-3 text-base font-semibold text-white/95 first:mt-0">
          {inlineNodes(trimmedStart.slice(4), `h3-${bk}`)}
        </h3>
      );
      line++;
      continue;
    }
    if (trimmedStart.startsWith("## ")) {
      blocks.push(
        <h2 key={`md-${bk++}`} className="mb-2 mt-4 text-lg font-semibold text-white first:mt-0">
          {inlineNodes(trimmedStart.slice(3), `h2-${bk}`)}
        </h2>
      );
      line++;
      continue;
    }
    if (trimmedStart.startsWith("# ")) {
      blocks.push(
        <h1 key={`md-${bk++}`} className="mb-2 mt-4 text-xl font-bold text-white first:mt-0">
          {inlineNodes(trimmedStart.slice(2), `h1-${bk}`)}
        </h1>
      );
      line++;
      continue;
    }

    if (trimmedStart.startsWith("> ")) {
      const quote = [];
      while (line < lines.length) {
        const L = lines[line].trimStart();
        if (!L.startsWith("> ")) break;
        quote.push(L.slice(2));
        line++;
      }
      blocks.push(
        <blockquote
          key={`md-${bk++}`}
          className="my-2 border-l-2 border-accent/50 pl-3 text-sm text-white/70"
        >
          {inlineNodes(quote.join(" "), `q-${bk}`)}
        </blockquote>
      );
      continue;
    }

    const ul = trimmedStart.match(/^[-*]\s+(.+)$/);
    const ol = trimmedStart.match(/^\d+\.\s+(.+)$/);
    if (ul || ol) {
      const ordered = !!ol;
      const items = [];
      while (line < lines.length) {
        const L = lines[line].trim();
        const mUl = L.match(/^[-*]\s+(.+)$/);
        const mOl = L.match(/^\d+\.\s+(.+)$/);
        const m = ordered ? mOl : mUl;
        if (!m) break;
        items.push(
          <li key={`md-li-${line}-${items.length}`} className="leading-relaxed">
            {inlineNodes(m[1], `li-${line}`)}
          </li>
        );
        line++;
      }
      blocks.push(
        ordered ? (
          <ol
            key={`md-${bk++}`}
            className="mb-2 list-decimal space-y-1 pl-5 text-sm text-white/80"
          >
            {items}
          </ol>
        ) : (
          <ul key={`md-${bk++}`} className="mb-2 list-disc space-y-1 pl-5 text-sm text-white/80">
            {items}
          </ul>
        )
      );
      continue;
    }

    const para = [];
    while (line < lines.length) {
      const L = lines[line];
      const T = L.trim();
      if (!T) break;
      const TS = L.trimStart();
      if (
        TS.startsWith("#") ||
        TS.startsWith("```") ||
        TS.startsWith("> ") ||
        /^[-*]\s/.test(TS) ||
        /^\d+\.\s/.test(TS) ||
        T === "---" ||
        T === "***" ||
        T === "___"
      ) {
        break;
      }
      para.push(T);
      line++;
    }
    if (para.length) {
      blocks.push(
        <p key={`md-${bk++}`} className="mb-2 text-sm leading-relaxed text-white/80 last:mb-0">
          {inlineNodes(para.join(" "), `p-${bk}`)}
        </p>
      );
    } else {
      // Line looks like block syntax we did not handle above (e.g. "##Title" without space).
      // Inner loop breaks without consuming; advance line or the main loop never progresses.
      const stuck = lines[line]?.trim() ?? "";
      if (stuck) {
        blocks.push(
          <p key={`md-${bk++}`} className="mb-2 text-sm leading-relaxed text-white/80 last:mb-0">
            {inlineNodes(stuck, `p-fallback-${bk}`)}
          </p>
        );
      }
      line++;
    }
  }

  return <div className="space-y-0">{blocks}</div>;
}
