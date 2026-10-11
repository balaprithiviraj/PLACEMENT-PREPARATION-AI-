import { useEffect, useState } from 'react';
import { Mic, Send, History, CheckCircle2, AlertTriangle } from 'lucide-react';
import { interviewAPI } from '../services/api.js';
import { formatDate } from '../utils/helpers.js';
import GlassCard from '../components/GlassCard.jsx';
import Button from '../components/Button.jsx';
import ScoreRing from '../components/ScoreRing.jsx';
import LoadingState from '../components/LoadingState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { cn } from '../utils/helpers.js';

const inputClass =
  'w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white focus:border-primary-500 focus:outline-none';

export default function Interview() {
  const [role, setRole] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [interviewType, setInterviewType] = useState('technical');
  const [count, setCount] = useState(5);
  const [starting, setStarting] = useState(false);
  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await interviewAPI.history();
        const raw = res.data?.data ?? res.data;
        setHistory(Array.isArray(raw) ? raw : raw?.history || raw?.sessions || []);
      } catch {
        // History is secondary; fail silently
      } finally {
        setHistoryLoading(false);
      }
    }
    load();
  }, []);

  async function start() {
    setFormError('');
    if (!role.trim()) {
      setFormError('Please enter a target role.');
      return;
    }
    setStarting(true);
    try {
      const res = await interviewAPI.start({
        role: role.trim(),
        difficulty,
        interviewType,
        count: Number(count),
      });
      const s = res.data?.data || res.data;
      setSession(s);
      setAnswers((s?.questions || []).map(() => ''));
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Could not start the interview.');
    } finally {
      setStarting(false);
    }
  }

  async function submit() {
    if (!session?._id) return;
    setSubmitting(true);
    try {
      const res = await interviewAPI.submit({
        sessionId: session._id,
        answers: answers.map((a, i) => ({ questionIndex: i, answer: a })),
      });
      const updated = res.data?.data || res.data;
      setSession(updated);
      // Refresh history in background
      interviewAPI.history().then((r) => {
        const raw = r.data?.data ?? r.data;
        setHistory(Array.isArray(raw) ? raw : raw?.history || raw?.sessions || []);
      }).catch(() => {});
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Could not submit answers.');
    } finally {
      setSubmitting(false);
    }
  }

  async function openHistoryItem(id) {
    try {
      const res = await interviewAPI.getById(id);
      const s = res.data?.data || res.data;
      setSession(s);
      setAnswers((s?.questions || []).map((_, i) => s?.answers?.[i]?.answer || ''));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // ignore
    }
  }

  const feedback = session?.feedback;
  const completed = session?.status === 'completed' || !!feedback;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Interview"
        title="Mock Interview"
        sub="Answer role-specific questions and get AI feedback."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-4">
          {/* Setup form */}
          <GlassCard>
            <h2 className="font-bold text-white">New Interview</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-slate-300">Target role *</span>
                <input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Frontend Developer"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-300">Difficulty</span>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={inputClass}>
                  {['Easy', 'Medium', 'Hard'].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-300">Interview type</span>
                <select value={interviewType} onChange={(e) => setInterviewType(e.target.value)} className={inputClass}>
                  <option value="technical">Technical</option>
                  <option value="hr">HR</option>
                  <option value="mixed">Mixed</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-300">Questions (1–10)</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={count}
                  onChange={(e) => setCount(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
                  className={inputClass}
                />
              </label>
              <div className="flex items-end">
                <Button onClick={start} loading={starting} className="w-full">
                  Start Interview
                </Button>
              </div>
            </div>
            {formError && (
              <p role="alert" className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                {formError}
              </p>
            )}
          </GlassCard>

          {/* Questions + answers */}
          {session && (
            <GlassCard>
              <h2 className="font-bold text-white">
                {session.role} <span className="text-xs font-normal text-slate-400">· {session.difficulty} · {session.interviewType}</span>
              </h2>
              <ol className="mt-4 space-y-4">
                {(session.questions || []).map((qq, i) => {
                  const text = typeof qq === 'string' ? qq : qq?.question;
                  const detail = feedback?.detailed?.find((d) => d.questionIndex === i);
                  return (
                    <li key={i} className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm font-semibold text-white">
                        <span className="mr-2 text-slate-500">Q{i + 1}.</span>
                        {text}
                        {qq?.category && <span className="ml-2 text-xs font-normal text-slate-500">[{qq.category}]</span>}
                      </p>
                      {!completed ? (
                        <textarea
                          value={answers[i] || ''}
                          onChange={(e) => setAnswers((a) => a.map((v, vi) => (vi === i ? e.target.value : v)))}
                          rows={3}
                          placeholder="Type your answer..."
                          aria-label={`Answer for question ${i + 1}`}
                          className={`${inputClass} mt-2 !bg-slate-950`}
                        />
                      ) : (
                        <>
                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
                            {session.answers?.[i]?.answer || <span className="text-slate-500">No answer given.</span>}
                          </p>
                          {detail && (
                            <p className="mt-2 text-xs text-slate-400">
                              <span className="font-bold text-primary-300">Score {detail.score}: </span>
                              {detail.feedback}
                            </p>
                          )}
                        </>
                      )}
                    </li>
                  );
                })}
              </ol>
              {!completed && (
                <Button onClick={submit} loading={submitting} className="mt-4">
                  <Send size={15} /> Submit Answers
                </Button>
              )}
            </GlassCard>
          )}

          {/* Feedback */}
          {feedback && (
            <GlassCard>
              <div className="flex flex-wrap items-center gap-5">
                <ScoreRing score={feedback.overallScore ?? 0} />
                <div className="flex-1">
                  <h2 className="font-bold text-white">Feedback</h2>
                  <p className="mt-1 text-sm text-slate-400">{feedback.summary}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="flex items-center gap-1.5 text-sm font-bold text-emerald-300">
                    <CheckCircle2 size={15} /> Strengths
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {(feedback.strengths || []).map((s, i) => (
                      <li key={i} className="text-sm text-slate-300">• {s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="flex items-center gap-1.5 text-sm font-bold text-amber-300">
                    <AlertTriangle size={15} /> Improvements
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {(feedback.improvements || []).map((s, i) => (
                      <li key={i} className="text-sm text-slate-300">• {s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </GlassCard>
          )}
        </div>

        {/* History sidebar */}
        <aside aria-label="Interview history">
          <GlassCard className="!p-4">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-white">
              <History size={15} /> History
            </h2>
            {historyLoading ? (
              <LoadingState message="Loading history..." />
            ) : history.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">No interviews yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {history.map((h) => (
                  <li key={h._id}>
                    <button
                      type="button"
                      onClick={() => openHistoryItem(h._id)}
                      className={cn(
                        'w-full rounded-xl border px-3 py-2 text-left transition-colors',
                        session?._id === h._id
                          ? 'border-primary-400/50 bg-primary-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/25'
                      )}
                    >
                      <p className="truncate text-xs font-semibold text-white">{h.role}</p>
                      <p className="text-[11px] text-slate-500">
                        {h.status}{h.feedback?.overallScore != null && ` · ${h.feedback.overallScore}/100`} · {formatDate(h.createdAt)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </aside>
      </div>

      {!session && history.length === 0 && !historyLoading && (
        <EmptyState
          icon={Mic}
          title="No mock interviews yet"
          message="Enter a target role above and start your first AI interview."
        />
      )}
    </div>
  );
}
