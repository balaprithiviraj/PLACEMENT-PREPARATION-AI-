import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseInline, parseMarkdown } from '../src/utils/markdown.js';

describe('lite-markdown parser (AI output rendering)', () => {
  it('parses bold, italic and inline code spans', () => {
    const spans = parseInline('Use **bold** and *italic* with `code`.');
    assert.deepEqual(spans, [
      { t: 'text', v: 'Use ' },
      { t: 'bold', v: 'bold' },
      { t: 'text', v: ' and ' },
      { t: 'italic', v: 'italic' },
      { t: 'text', v: ' with ' },
      { t: 'code', v: 'code' },
      { t: 'text', v: '.' },
    ]);
  });

  it('keeps raw HTML as inert text (never executed)', () => {
    const spans = parseInline('<script>alert(1)</script>');
    assert.equal(spans.length, 1);
    assert.equal(spans[0].t, 'text');
    assert.equal(spans[0].v, '<script>alert(1)</script>');
  });

  it('parses fenced code blocks, lists and paragraphs', () => {
    const blocks = parseMarkdown('Intro line.\n\n```python\nprint("hi")\n```\n\n- item one\n- item **two**\n\n1. first\n2. second');
    assert.equal(blocks[0].t, 'para');
    assert.equal(blocks[1].t, 'code');
    assert.equal(blocks[1].lang, 'python');
    assert.equal(blocks[1].code, 'print("hi")');
    assert.equal(blocks[2].t, 'ul');
    assert.equal(blocks[2].items.length, 2);
    assert.equal(blocks[3].t, 'ol');
    assert.equal(blocks[3].items.length, 2);
  });

  it('handles empty and plain text without crashing', () => {
    assert.deepEqual(parseMarkdown(''), []);
    assert.deepEqual(parseMarkdown(null), []);
    const blocks = parseMarkdown('Just a plain explanation.');
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].t, 'para');
  });
});
