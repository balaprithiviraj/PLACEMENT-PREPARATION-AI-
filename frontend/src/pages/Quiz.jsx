import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Timer, Flag, ChevronLeft, ChevronRight, Send, Sparkles } from 'lucide-react';
import { questionGeneratorAPI } from '../services/api.js';
import GlassCard from '../components/GlassCard.jsx';
import Button from '../components/Button.jsx';
import Modal from '../components/Modal.jsx';
import LoadingState from '../components/LoadingState.jsx';
import MarkdownText from '../components/MarkdownText.jsx';
import { cn } from '../utils/helpers.js';
import { buildAiQuizAttempt } from '../utils/aiQuiz.js';

function formatElapsed(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function resolveTopic(rawTopic, rawCategory) {
  const t = (rawTopic || '').trim();
  if (t) return t;
  const c = (rawCategory || '').trim();
  if (c && c.toLowerCase() !== 'mixed') return c;
  return 'General';
}

export default function Quiz() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const type = params.get('type') || 'mixed';
  const category = params.get('category') || 'Mixed';
  const difficulty = params.get('difficulty') || 'Mixed';
  const mode = params.get('mode');
  const topic = params.get('topic') || '';
  const count = Number(params.get('count')) || 5;

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [source, setSource] = useState('ai');
  const [fallback, setFallback] = useState(false);
  const [hint, setHint] = useState('');
  const [aiTopic, setAiTopic] = useState('');
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState({});
  const [review, setReview] = useState({});
  const [elapsed, setElapsed] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (mode !== 'ai') return;
    async function start() {
      setLoading(true);
      setError('');
      try {
        const track = type === 'technical' ? 'technical' : 'aptitude';
        const topicText = resolveTopic(topic, category);
        const body = {
          track,
          topic: topicText,
          count: Math.min(Math.max(count || 5, 1), 10),
          difficulty,
        };
        const res = await questionGeneratorAPI.generate(body);
        const payload = res.data?.data ?? res.data;
        const generated = payload?.questions || [];
        setQuestions(generated);
        setSource('ai');
        setFallback(false);
        setHint('');
        setAiTopic(topicText);
        if (!generated.length) {
          setError('AI did not return any questions. Please try again.');
        }
      } catch (err) {
        setError(err?.response?.data?.message || 'Could not start the quiz. The bank may be empty for these filters.');
      } finally {
        setLoading(false);
      }
    }
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Count-up timer while questions are loaded
  useEffect(() => {
    if (loading || error || questions.length === 0) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [loading, error, questions.length]);

  const answeredCount = useMemo(() => Object.keys(selected).length, [selected]);
  const unanswered = questions.length - answeredCount;
  const q = questions[current];

  async function submit() {
    setSubmitting(true);
    setSubmitError('');

    try {
      const attempt = buildAiQuizAttempt({
        questions,
        selected,
        elapsed,
        category: category || 'Aptitude',
        difficulty,
        type: type || 'aptitude',
      });

      navigate(`/quiz-result/local-${Date.now()}`, { state: { result: attempt } });
    } catch (err) {
      setSubmitError(err?.response?.data?.message || 'Could not submit the quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (mode !== 'ai') {
    return <Navigate to="/ai-question-generator" replace />;
  }

  if (loading) return <LoadingState message="Gemini is crafting your questions…" />;

  if (error || questions.length === 0) {
    return (
      <div className="space-y-4">
        <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
          {error || 'No questions available for this test.'}
        </p>
        <Link to="/aptitude" className="text-sm font-semibold text-primary-300 hover:text-primary-200">
          ← Back to practice
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <GlassCard className="flex flex-wrap items-center justify-between gap-3 !p-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-bold text-white">
              {mode === 'ai' && aiTopic ? aiTopic : `${category} · ${difficulty}`}
            </h1>
            {mode === 'ai' && (
              source === 'ai' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                  <Sparkles size={12} /> AI-generated
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-slate-400">
                  Question bank
                </span>
              )
            )}
          </div>
          <p className="text-xs capitalize text-slate-400">
            {type} test · {answeredCount}/{questions.length} answered
          </p>
          {mode === 'ai' && fallback === true && (
            <p role="note" className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">
              {hint || 'AI unavailable — showing questions from the bank instead.'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-white" aria-label="Elapsed time">
          <Timer size={16} className="text-primary-300" />
          <span className="tabular-nums">{formatElapsed(elapsed)}</span>
        </div>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        {/* Question */}
        <GlassCard>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Question {current + 1} of {questions.length}
            {review[current] && <span className="ml-2 text-amber-300">· marked for review</span>}
          </p>
          <h2 className="mt-2 text-base font-semibold text-white"><MarkdownText inline text={q?.question || ''} /></h2>
          <ul className="mt-4 space-y-2" role="radiogroup" aria-label={`Options for question ${current + 1}`}>
            {(q?.options || []).map((opt, oi) => {
              const active = selected[current] === oi;
              return (
                <li key={oi}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setSelected((s) => ({ ...s, [current]: oi }))}
                    className={cn(
                      'w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                      active
                        ? 'border-primary-400/60 bg-primary-500/15 text-white'
                        : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/25'
                    )}
                  >
                    <span className="mr-2 font-bold text-slate-500">{'ABCD'[oi]}.</span>
                    {opt}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="ghost"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
            >
              <ChevronLeft size={15} /> Prev
            </Button>
            <Button
              variant="ghost"
              onClick={() => setReview((r) => ({ ...r, [current]: !r[current] }))}
            >
              <Flag size={15} className={review[current] ? 'text-amber-300' : ''} />
              {review[current] ? 'Unmark' : 'Mark for review'}
            </Button>
            {current < questions.length - 1 ? (
              <Button onClick={() => setCurrent((c) => c + 1)}>
                Next <ChevronRight size={15} />
              </Button>
            ) : (
              <Button onClick={() => setConfirmOpen(true)}>
                <Send size={15} /> Submit
              </Button>
            )}
          </div>
        </GlassCard>

        {/* Navigator */}
        <GlassCard className="!p-4">
          <h2 className="text-sm font-bold text-white">Navigator</h2>
          <div className="mt-3 grid grid-cols-5 gap-1.5 lg:grid-cols-4">
            {questions.map((item, i) => (
              <button
                key={item._id || i}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Go to question ${i + 1}`}
                className={cn(
                  'relative flex h-9 items-center justify-center rounded-lg border text-xs font-bold transition-colors',
                  i === current
                    ? 'border-primary-400 bg-primary-500/25 text-white'
                    : selected[i] !== undefined
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/25'
                )}
              >
                {i + 1}
                {review[i] && (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-400" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
          <Button className="mt-4 w-full" onClick={() => setConfirmOpen(true)}>
            <Send size={15} /> Submit Test
          </Button>
        </GlassCard>
      </div>

      <Modal open={confirmOpen} onClose={() => !submitting && setConfirmOpen(false)} title="Submit test?">
        <p className="text-sm text-slate-300">
          Answered <span className="font-bold text-white">{answeredCount}</span> of {questions.length}.
          {unanswered > 0 && (
            <span className="text-amber-300"> {unanswered} unanswered will be graded as wrong.</span>
          )}
        </p>
        <p className="mt-1 text-xs text-slate-500">Time taken: {formatElapsed(elapsed)}</p>
        {submitError && (
          <p role="alert" className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
            {submitError}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={submitting}>
            Keep solving
          </Button>
          <Button onClick={submit} loading={submitting}>
            Confirm submit
          </Button>
        </div>
      </Modal>
    </div>
  );
}
