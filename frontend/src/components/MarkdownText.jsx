import { parseInline, parseMarkdown } from '../utils/markdown.js';
import { cn } from '../utils/helpers.js';

function Spans({ spans }) {
  return (
    <>
      {spans.map((span, key) => {
        if (span.t === 'bold') return <strong key={key} className="font-semibold text-white">{span.v}</strong>;
        if (span.t === 'italic') return <em key={key}>{span.v}</em>;
        if (span.t === 'code') {
          return (
            <code key={key} className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.85em] text-indigo-200">
              {span.v}
            </code>
          );
        }
        return <span key={key}>{span.v}</span>;
      })}
    </>
  );
}

// Renders AI-generated text with lite-markdown styling. Text is rendered
// as React nodes (auto-escaped) — raw HTML/markdown fences never execute.
export default function MarkdownText({ text, inline = false, className }) {
  if (text === null || text === undefined) return null;
  if (inline) {
    return (
      <span className={className}>
        <Spans spans={parseInline(text)} />
      </span>
    );
  }
  const blocks = parseMarkdown(text);
  return (
    <div className={cn('space-y-2', className)}>
      {blocks.map((block, key) => {
        if (block.t === 'code') {
          return (
            <pre key={key} className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-xs leading-relaxed text-slate-200">
              <code>{block.code}</code>
            </pre>
          );
        }
        if (block.t === 'ul') {
          return (
            <ul key={key} className="list-disc space-y-1 pl-5">
              {block.items.map((spans, k) => (
                <li key={k}><Spans spans={spans} /></li>
              ))}
            </ul>
          );
        }
        if (block.t === 'ol') {
          return (
            <ol key={key} className="list-decimal space-y-1 pl-5">
              {block.items.map((spans, k) => (
                <li key={k}><Spans spans={spans} /></li>
              ))}
            </ol>
          );
        }
        return (
          <p key={key}><Spans spans={block.spans} /></p>
        );
      })}
    </div>
  );
}
