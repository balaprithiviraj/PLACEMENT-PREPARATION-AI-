// helpers.test.js — frontend pure utils (ESM, runnable with node --test)
// Run from frontend/: npm test
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cn, scoreColor, difficultyColor, formatDate } from '../src/utils/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'src');

describe('frontend utils/helpers.js', () => {
  it('cn joins truthy classes', () => {
    assert.equal(cn('a', false, 'b', null, undefined, 'c'), 'a b c');
  });
  it('scoreColor thresholds (green >=75, amber >=50, red below)', () => {
    assert.ok(String(scoreColor(90)).includes('emerald'));
    assert.ok(String(scoreColor(60)).includes('amber'));
    assert.ok(String(scoreColor(10)).includes('rose'));
  });
  it('difficultyColor maps Easy/Medium/Hard', () => {
    assert.ok(difficultyColor('Easy').length > 0);
    assert.ok(difficultyColor('Medium').length > 0);
    assert.ok(difficultyColor('Hard').length > 0);
  });
  it('formatDate handles bad input without throwing', () => {
    assert.doesNotThrow(() => formatDate(null));
    assert.doesNotThrow(() => formatDate('not-a-date'));
    assert.ok(formatDate(new Date().toISOString()).length > 0);
  });
});

describe('frontend plan files exist (App routes + admin pages)', () => {
  const needed = [
    'App.jsx', 'main.jsx', 'services/api.js', 'utils/helpers.js', 'context/AuthContext.jsx',
    'pages/Dashboard.jsx', 'pages/Quiz.jsx', 'pages/QuizResult.jsx', 'pages/Interview.jsx',
    'pages/ResumeAnalyzer.jsx', 'pages/ResumeResult.jsx', 'pages/admin/Questions.jsx',
  ];
  for (const f of needed) {
    it(`has src/${f}`, () => {
      assert.ok(fs.existsSync(path.join(SRC, f)), `missing ${f}`);
    });
  }
});
