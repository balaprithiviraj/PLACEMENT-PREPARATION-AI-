export function buildAiQuizAttempt({ questions = [], selected = {}, elapsed = 0, category = 'Aptitude', difficulty = 'Mixed', type = 'aptitude' }) {
  const reviewed = questions.map((item, index) => {
    const selectedAnswer = selected[index] ?? -1;
    const correctAnswer = typeof item.correctAnswer === 'number'
      ? item.correctAnswer
      : Number.isInteger(item.answer)
        ? item.answer
        : 0;
    const isCorrect = selectedAnswer === correctAnswer;

    return {
      selectedAnswer,
      correctAnswer,
      isCorrect,
      questionId: {
        question: item.question,
        options: item.options || [],
        explanation: item.explanation || '',
        correctAnswer,
      },
    };
  });

  const correctCount = reviewed.filter((entry) => entry.isCorrect).length;
  const totalQuestions = reviewed.length || questions.length || 1;
  const score = Math.round((correctCount / totalQuestions) * 100);

  return {
    category,
    difficulty,
    type,
    questions: reviewed.map((entry) => ({
      questionId: entry.questionId,
      selectedAnswer: entry.selectedAnswer,
      correctAnswer: entry.correctAnswer,
      isCorrect: entry.isCorrect,
    })),
    correctCount,
    wrongCount: totalQuestions - correctCount,
    totalQuestions,
    accuracy: score,
    timeTaken: elapsed,
    score,
  };
}
