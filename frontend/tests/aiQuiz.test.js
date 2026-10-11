import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildAiQuizAttempt } from '../src/utils/aiQuiz.js';

describe('AI quiz grading helper', () => {
  it('scores AI questions against the generated correct answer and returns result metadata', () => {
    const attempt = buildAiQuizAttempt({
      questions: [
        { question: '2 + 2?', options: ['3', '4', '5', '6'], correctAnswer: 1, explanation: 'Because 2 + 2 = 4.' },
        { question: 'Capital of France?', options: ['Rome', 'Paris', 'Berlin', 'Madrid'], correctAnswer: 1, explanation: 'Paris is the capital.' },
      ],
      selected: { 0: 1, 1: 0 },
      elapsed: 42,
      category: 'Aptitude',
      difficulty: 'Medium',
      type: 'aptitude',
    });

    assert.equal(attempt.correctCount, 1);
    assert.equal(attempt.wrongCount, 1);
    assert.equal(attempt.accuracy, 50);
    assert.equal(attempt.questions[0].selectedAnswer, 1);
    assert.equal(attempt.questions[1].selectedAnswer, 0);
    assert.equal(attempt.questions[1].isCorrect, false);
  });

  it('falls back to answer property when correctAnswer is absent', () => {
    const attempt = buildAiQuizAttempt({
      questions: [{ question: '50/10?', options: ['2', '5', '10', '20'], answer: 1 }],
      selected: { 0: 1 },
    });

    assert.equal(attempt.correctCount, 1);
    assert.equal(attempt.questions[0].correctAnswer, 1);
    assert.equal(attempt.questions[0].isCorrect, true);
  });
});
