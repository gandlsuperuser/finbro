import React from "react";

export function FormattedMarkdown({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = (key: number) => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={`list-${key}`} className="my-2 space-y-1.5 pl-1">
          {listBuffer.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-[0.88rem] leading-relaxed text-zinc-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/80" />
              <span>{formatInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Bullet points
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || /^\d+\.\s/.test(trimmed)) {
      const itemContent = trimmed.replace(/^[-*]\s+|\d+\.\s+/, "");
      listBuffer.push(itemContent);
      return;
    }

    flushList(idx);

    if (!trimmed) {
      elements.push(<div key={`sp-${idx}`} className="h-2" />);
      return;
    }

    // Headers
    if (trimmed.startsWith("### ")) {
      elements.push(
        <h4 key={`h4-${idx}`} className="mt-4 mb-1.5 text-xs font-semibold uppercase tracking-wider text-amber-300/90 flex items-center gap-1.5">
          {formatInline(trimmed.replace(/^###\s+/, ""))}
        </h4>
      );
      return;
    }
    if (trimmed.startsWith("## ")) {
      elements.push(
        <h3 key={`h3-${idx}`} className="mt-4 mb-2 text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
          {formatInline(trimmed.replace(/^##\s+/, ""))}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith("# ")) {
      elements.push(
        <h2 key={`h2-${idx}`} className="mt-5 mb-2.5 text-base font-bold text-white">
          {formatInline(trimmed.replace(/^#\s+/, ""))}
        </h2>
      );
      return;
    }

    // Normal paragraph
    elements.push(
      <p key={`p-${idx}`} className="my-1.5 text-[0.88rem] leading-relaxed text-zinc-300">
        {formatInline(trimmed)}
      </p>
    );
  });

  flushList(lines.length);

  return <div className="space-y-1">{elements}</div>;
}

function formatInline(text: string): React.ReactNode {
  // Regex to match **bold** and `code`
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code key={match.index} className="rounded bg-black/40 px-1 py-0.5 font-mono text-[0.8rem] text-amber-200 ring-1 ring-white/10">
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}
