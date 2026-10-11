// helpersExtended.test.js — pins frontend util contracts the base suite leaves loose.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiBaseUrl } from '../src/services/api.js';
import { cn, greeting, formatTime, formatDate, scoreColor, difficultyColor } from '../src/utils/helpers.js';

describe('greeting', () => {
  it('morning/afternoon/evening at 9/14/20h', () => {
    assert.equal(greeting(new Date(2026, 0, 1, 9)), 'Good morning');
    assert.equal(greeting(new Date(2026, 0, 1, 14)), 'Good afternoon');
    assert.equal(greeting(new Date(2026, 0, 1, 20)), 'Good evening');
  });
});

describe('formatTime', () => {
  it('null/undefined -> em-dash sentinel', () => {
    assert.equal(formatTime(null), '—');
    assert.equal(formatTime(undefined), '—');
  });
  it('valid ISO -> non-empty string', () => {
    assert.ok(formatTime('2026-10-09T10:00:00Z').length > 0);
  });
});

describe('formatDate sentinel', () => {
  it('null -> em-dash (never throws)', () => {
    assert.equal(formatDate(null), '—');
    assert.doesNotThrow(() => formatDate('not-a-date'));
  });
});

describe('cn', () => {
  it('all-falsy -> empty string with no stray spaces', () => {
    assert.equal(cn(false, null, undefined, ''), '');
  });
  it('joins truthy only', () => {
    assert.equal(cn('a', false, 'b', null, 'c'), 'a b c');
  });
});

describe('scoreColor coercion', () => {
  it('NaN/undefined -> rose band (safe default)', () => {
    assert.equal(scoreColor(NaN), 'text-rose-400');
    assert.equal(scoreColor(undefined), 'text-rose-400');
  });
  it('numeric string "80" coerces to emerald', () => {
    assert.equal(scoreColor('80'), 'text-emerald-400');
  });
});

describe('difficultyColor', () => {
  it('is case-insensitive', () => {
    assert.equal(difficultyColor('EASY'), difficultyColor('Easy'));
    assert.equal(difficultyColor('hard'), difficultyColor('Hard'));
  });
  it('unknown level -> slate fallback', () => {
    assert.ok(difficultyColor('Impossible').includes('slate'));
    assert.ok(difficultyColor('').includes('slate'));
  });
});

describe('resolveApiBaseUrl', () => {
  it('prefers a configured API URL when provided', () => {
    assert.equal(resolveApiBaseUrl('https://api.example.com'), 'https://api.example.com');
  });

  it('falls back to the local backend when the app is served on 0.0.0.0', () => {
    assert.equal(resolveApiBaseUrl('', '0.0.0.0'), 'http://localhost:8000/api');
  });

  it('keeps the Vite proxy for localhost development', () => {
    assert.equal(resolveApiBaseUrl('', 'localhost'), '/api');
  });
});
