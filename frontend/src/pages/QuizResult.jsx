import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, ArrowLeft, Clock } from 'lucide-react';
import { quizAPI } from '../services/api.js';
import GlassCard from '../components/GlassCard.jsx';
import ScoreRing from '../components/ScoreRing.jsx';
import StatCard from '../components/StatCard.jsx';
import LoadingState from '../components/LoadingState.jsx';
import MarkdownText from '../components/MarkdownText.jsx';
import AiDisclaimer from '../components/AiDisclaimer.jsx';
import { cn } from '../utils/helpers.js';

export default function QuizResult() {
  const { id } = useParams();
  const location = useLocation();
  const [attempt, setAttempt] = useState(location.state?.result || null);
  const [loading, setLoading] = useState(!location.state?.result);
  const [error, setError] = useState('');

  useEffect(() => {
    if ((id || '').startsWith('local-') && location.state?.result) {
      setAttempt(location.state.result);
      setLoading(false);
      return;
    }
    async function load() {
      try {
        const res = await quizAPI.getById(id);
        setAttempt(res.data?.data || res.data);
      } catch (err) {
        if (!attempt) setError(err?.response?.data?.message || 'Could not load quiz result.');
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <LoadingState message="Grading your test..." />;

  if (error || !attempt) {
    return (
      <div className="space-y-4">
        <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
          {error || 'Result not found.'}
        </p>
        <Link to="/aptitude" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-300 hover:text-primary-200">
          <ArrowLeft size={15} /> Back to practice
        </Link>
      </div>
    );
  }

  const reviewed = attempt.questions || [];
  const accuracy = attempt.accuracy ?? attempt.score ?? 0;

  return (
    <div className="space-y-6">
      <Link to="/progress" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white">
        <ArrowLeft size={14} /> All results
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-white">Quiz Result</h1>
        <p className="text-sm capitalize text-slate-400">
          {attempt.category} · {attempt.difficulty} · {attempt.type}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="flex items-center gap-5">
          <ScoreRing score={accuracy} />
          <div>
            <h2 className="font-bold text-white">
              {attempt.correctCount ?? attempt.score ?? 0}/{attempt.totalQuestions ?? reviewed.length} correct
            </h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-400">
              <Clock size={14} /> Time taken: {attempt.timeTaken ?? 0}s
            </p>
          </div>
        </GlassCard>
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Correct" value={attempt.correctCount ?? 0} sub="answers" />
          <StatCard label="Wrong" value={attempt.wrongCount ?? 0} sub="answers" />
          <StatCard label="Accuracy" value={`${accuracy}%`} sub="overall" />
          <StatCard label="Time" value={`${attempt.timeTaken ?? 0}s`} sub="taken" />
        </div>
      </div>

      <section aria-label="Answer review">
        <h2 className="mb-3 font-bold text-white">Answer Review ({reviewed.length})</h2>
        {reviewed.length === 0 ? (
          <p className="text-sm text-slate-500">Detailed review is unavailable for this attempt.</p>
        ) : (
          <ol className="space-y-3">
            {reviewed.map((item, i) => {
              const q = item.questionId && typeof item.questionId === 'object' ? item.questionId : null;
              const options = q?.options || [];
              return (
                <li key={i}>
                  <GlassCard className={cn(item.isCorrect ? '!border-emerald-500/20' : '!border-rose-500/20')}>
                    <div className="flex items-start gap-2">
                      {item.isCorrect ? (
                        <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-400" />
                      ) : (
                        <XCircle size={17} className="mt-0.5 shrink-0 text-rose-400" />
                      )}
                      <p className="text-sm font-medium text-white">
                        <MarkdownText inline text={`${i + 1}. ${q?.question || `Question ${String(item.questionId || '').slice(-6)}`}`} />
                      </p>
                    </div>
                    {options.length > 0 && (
                      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                        {options.map((opt, oi) => {
                          const isCorrectOpt = oi === item.correctAnswer;
                          const isPicked = oi === item.selectedAnswer;
                          return (
                            <li
                              key={oi}
                              className={cn(
                                'rounded-xl border px-3 py-2 text-sm',
                                isCorrectOpt
                                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                                  : isPicked
                                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                                    : 'border-white/10 bg-white/5 text-slate-400'
                              )}
                            >
                              <span className="mr-2 font-bold opacity-70">{'ABCD'[oi]}.</span>
                              {opt}
                              {isCorrectOpt && <span className="ml-2 text-xs">✓ correct</span>}
                              {isPicked && !isCorrectOpt && <span className="ml-2 text-xs">· your pick</span>}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {q?.explanation && (
                      <div className="mt-2 text-xs text-slate-400">
                        <span className="font-semibold text-slate-300">Why: </span>
                        <MarkdownText inline text={q.explanation} />
                      </div>
                    )}
                  </GlassCard>
                </li>
              );
            })}
          </ol>
        )}
      </section>
      <AiDisclaimer />
    </div>
  );
}
