import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ListChecks, HelpCircle, Target, Trophy, Flame } from 'lucide-react';
import { quizAPI, dashboardAPI } from '../services/api.js';
import { formatDate } from '../utils/helpers.js';
import GlassCard from '../components/GlassCard.jsx';
import StatCard from '../components/StatCard.jsx';
import LoadingState from '../components/LoadingState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import PageHeader from '../components/PageHeader.jsx';

function BarChart({ data, valueKey, labelKey, suffix = '%' }) {
  const max = Math.max(1, ...data.map((d) => Number(d[valueKey]) || 0));
  if (!data.length) return <p className="text-sm text-slate-500">No data yet.</p>;
  return (
    <div className="mt-4 space-y-3" role="img" aria-label="Bar chart">
      {data.map((d, i) => {
        const v = Number(d[valueKey]) || 0;
        return (
          <div key={i}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="truncate text-slate-300">{d[labelKey]}</span>
              <span className="font-bold text-white">{v}{suffix}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-400 transition-all"
                style={{ width: `${Math.min(100, (v / max) * 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Progress() {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [h, d] = await Promise.all([quizAPI.history(), dashboardAPI.get()]);
        const rawHist = h.data?.data ?? h.data;
        const dd = d.data?.data || d.data;
        const hist = Array.isArray(rawHist) ? rawHist : rawHist?.history || rawHist?.attempts || [];
        setAttempts(hist);
        setDash(dd || {});
      } catch (err) {
        setError(err?.response?.data?.message || 'Could not load progress.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const stats = useMemo(() => {
    const tests = attempts.length || dash?.testsTaken || 0;
    const questions = attempts.reduce((s, a) => s + (a.totalQuestions || 0), 0) || dash?.questionsAttempted || 0;
    const avg = attempts.length
      ? Math.round((attempts.reduce((s, a) => s + (a.accuracy || 0), 0) / attempts.length) * 10) / 10
      : dash?.avgScore || 0;
    const best = attempts.length ? Math.max(...attempts.map((a) => a.accuracy || 0)) : dash?.bestScore || 0;
    return { tests, questions, avg, best, streak: dash?.streak || 0 };
  }, [attempts, dash]);

  const scoreHistory = useMemo(
    () =>
      [...attempts]
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .slice(-10)
        .map((a) => ({
          label: `${a.category || 'Quiz'} · ${formatDate(a.createdAt)}`,
          accuracy: a.accuracy || 0,
        })),
    [attempts]
  );

  const categoryPerf = dash?.categoryPerformance || [];

  if (loading) return <LoadingState message="Loading your progress..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tracking"
        title="My Progress"
        sub="Track your test performance over time."
      />

      {error && (
        <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={ListChecks} label="Total Tests" value={stats.tests} sub="attempts" />
        <StatCard icon={HelpCircle} label="Questions" value={stats.questions} sub="attempted" />
        <StatCard icon={Target} label="Avg Score" value={`${stats.avg}%`} sub="accuracy" />
        <StatCard icon={Trophy} label="Best" value={`${stats.best}%`} sub="accuracy" />
        <StatCard icon={Flame} label="Streak" value={`${stats.streak}d`} sub="in a row" />
      </div>

      {attempts.length === 0 ? (
        <EmptyState
          title="No attempts yet"
          message="Take a quiz from Aptitude or Technical practice to start building your progress chart."
          actionLabel="Practice Aptitude"
          onAction={() => navigate('/aptitude')}
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <GlassCard>
              <h2 className="font-bold text-white">Score History (last 10)</h2>
              <BarChart data={scoreHistory} valueKey="accuracy" labelKey="label" />
            </GlassCard>
            <GlassCard>
              <h2 className="font-bold text-white">Performance by Category</h2>
              <BarChart
                data={categoryPerf.map((c) => ({ label: `${c.category} (${c.tests})`, accuracy: c.avgAccuracy }))}
                valueKey="accuracy"
                labelKey="label"
              />
            </GlassCard>
          </div>

          <GlassCard>
            <h2 className="font-bold text-white">Recent Attempts</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-2 pr-4 font-semibold">Category</th>
                    <th className="pb-2 pr-4 font-semibold">Difficulty</th>
                    <th className="pb-2 pr-4 font-semibold">Score</th>
                    <th className="pb-2 pr-4 font-semibold">Accuracy</th>
                    <th className="pb-2 pr-4 font-semibold">Date</th>
                    <th className="pb-2 font-semibold">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {attempts.slice(0, 10).map((a) => (
                    <tr key={a._id} className="text-slate-300">
                      <td className="py-2.5 pr-4 capitalize">{a.category}</td>
                      <td className="py-2.5 pr-4">{a.difficulty}</td>
                      <td className="py-2.5 pr-4 font-semibold text-white">
                        {a.correctCount ?? a.score}/{a.totalQuestions}
                      </td>
                      <td className="py-2.5 pr-4">{a.accuracy}%</td>
                      <td className="py-2.5 pr-4 text-slate-400">{formatDate(a.createdAt)}</td>
                      <td className="py-2.5">
                        <Link
                          to={`/quiz-result/${a._id}`}
                          className="font-semibold text-primary-300 hover:text-primary-200"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}
