// Dependency-free lite-markdown parser for AI-generated text.
// Supports: ```code fences```, `inline code`, **bold**, *italic*,
// unordered (-/*) and ordered (1./1)) lists, paragraph breaks.
// Pure functions (no DOM) so they are unit-testable with node --test.
// The React component renders parsed tokens as elements — React escapes
// text by default, so raw HTML in AI output is displayed literally,
// never executed (no dangerouslySetInnerHTML anywhere).

export function parseInline(text) {
  const out = [];
  const codeParts = String(text ?? '').split(/(`[^`]+`)/g);
  for (const chunk of codeParts) {
    if (chunk.length >= 2 && chunk.startsWith('`') && chunk.endsWith('`')) {
      out.push({ t: 'code', v: chunk.slice(1, -1) });
      continue;
    }
    const boldParts = chunk.split(/(\*\*[^*]+\*\*)/g);
    for (const part of boldParts) {
      if (part.length >= 4 && part.startsWith('**') && part.endsWith('**')) {
        out.push({ t: 'bold', v: part.slice(2, -2) });
        continue;
      }
      const italicParts = part.split(/(\*[^*]+\*)/g);
      for (const piece of italicParts) {
        if (!piece) continue;
        if (piece.length >= 2 && piece.startsWith('*') && piece.endsWith('*')) {
          out.push({ t: 'italic', v: piece.slice(1, -1) });
        } else {
          out.push({ t: 'text', v: piece });
        }
      }
    }
  }
  return out.filter((span) => span.v !== '');
}

const BULLET_RE = /^\s*[-*]\s+/;
const ORDERED_RE = /^\s*\d+[.)]\s+/;

export function parseMarkdown(text) {
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const buf = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1; // skip closing fence (or end of text)
      blocks.push({ t: 'code', lang: fence[1] || '', code: buf.join('\n') });
      continue;
    }
    if (BULLET_RE.test(line)) {
      const items = [];
      while (i < lines.length && BULLET_RE.test(lines[i])) {
        items.push(parseInline(lines[i].replace(BULLET_RE, '')));
        i += 1;
      }
      blocks.push({ t: 'ul', items });
      continue;
    }
    if (ORDERED_RE.test(line)) {
      const items = [];
      while (i < lines.length && ORDERED_RE.test(lines[i])) {
        items.push(parseInline(lines[i].replace(ORDERED_RE, '')));
        i += 1;
      }
      blocks.push({ t: 'ol', items });
      continue;
    }
    if (!line.trim()) {
      i += 1;
      continue;
    }
    const buf = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith('```') &&
      !BULLET_RE.test(lines[i]) &&
      !ORDERED_RE.test(lines[i])
    ) {
      buf.push(lines[i]);
      i += 1;
    }
    blocks.push({ t: 'para', spans: parseInline(buf.join(' ')) });
  }
  return blocks;
}
