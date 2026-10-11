import { useEffect, useState } from 'react';
import { Users, ClipboardList, ListChecks, Target } from 'lucide-react';
import api, { dashboardAPI, quizAPI } from '../../services/api.js';
import GlassCard from '../../components/GlassCard.jsx';
import StatCard from '../../components/StatCard.jsx';
import LoadingState from '../../components/LoadingState.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { formatDate, scoreColor, cn } from '../../utils/helpers.js';

function Bar({ label, value, max, suffix = '' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-slate-200">{label}</span>
        <span className="text-xs text-slate-400">
          {value}
          {suffix}
        </span>
      </div>
      <div
        className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/10"
        role="img"
        aria-label={`${label}: ${value}${suffix}`}
      >
        <div
          className="h-full rounded-full bg-primary-500 transition-all"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

export default function Analytics() {
  const [dash, setDash] = useState(null);
  const [history, setHistory] = useState([]);
  const [bankByType, setBankByType] = useState([]);
  const [bankTotal, setBankTotal] = useState(null);
  const [studentsTotal, setStudentsTotal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [dashRes, histRes, bankRes, usersRes] = await Promise.allSettled([
          dashboardAPI.get(),
          quizAPI.history(),
          api.get('/questions', { params: { limit: 200 } }),
          api.get('/users', { params: { limit: 1 } }),
        ]);

        if (dashRes.status === 'fulfilled') {
          setDash(dashRes.value.data?.data || dashRes.value.data || null);
        }
        if (histRes.status === 'fulfilled') {
          const payload = histRes.value.data || {};
          setHistory(
            Array.isArray(payload) ? payload : payload.history || payload.attempts || []
          );
        }
        if (bankRes.status === 'fulfilled') {
          const payload = bankRes.value.data || {};
          const list = payload.questions || [];
          setBankTotal(payload.total ?? list.length);
          const byType = {};
          for (const q of list) {
            const t = q.type || 'unknown';
            byType[t] = (byType[t] || 0) + 1;
          }
          setBankByType(Object.entries(byType).sort((a, b) => b[1] - a[1]));
        }
        if (usersRes.status === 'fulfilled') {
          setStudentsTotal(usersRes.value.data?.total ?? null);
        }
        if (
          dashRes.status === 'rejected' &&
          histRes.status === 'rejected' &&
          bankRes.status === 'rejected'
        ) {
          setError('Could not load analytics. Check the backend connection.');
        }
      } catch {
        setError('Could not load analytics. Check the backend connection.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const categoryPerf = dash?.categoryPerformance || [];
  const maxCatTests = Math.max(0, ...categoryPerf.map((c) => c.tests || 0));
  const maxTypeCount = Math.max(0, ...bankByType.map(([, n]) => n));
  const recentScores = history.slice(0, 10).reverse();
  const avgScore =
    dash?.avgScore ??
    (history.length
      ? Math.round(
          (history.reduce((s, a) => s + (a.accuracy ?? a.score ?? 0), 0) / history.length) * 10
        ) / 10
      : null);

  if (loading) return <LoadingState message="Loading analytics..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-slate-400">
          Platform overview built from dashboard, quiz history and the question bank.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300"
        >
          {error}
        </p>
      )}

      <section aria-label="Key numbers" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Students"
          value={studentsTotal ?? '—'}
          sub="GET /users total"
        />
        <StatCard
          icon={ClipboardList}
          label="Questions in Bank"
          value={bankTotal ?? '—'}
          sub="Active bank items"
        />
        <StatCard
          icon={ListChecks}
          label="Tests Taken"
          value={history.length > 0 ? history.length : (dash?.testsTaken ?? '—')}
          sub="Quiz history"
        />
        <StatCard
          icon={Target}
          label="Avg Score"
          value={avgScore != null ? `${avgScore}%` : '—'}
          sub="Across attempts"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Category performance */}
        <GlassCard>
          <h2 className="font-bold text-white">Tests by Category</h2>
          <p className="text-xs text-slate-500">Attempts per category (dashboard data)</p>
          {categoryPerf.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                title="No category data"
                message="Category stats appear after quizzes are attempted."
              />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {categoryPerf.map((c) => (
                <Bar
                  key={c.category}
                  label={`${c.category} · ${c.avgAccuracy ?? '—'}% avg`}
                  value={c.tests || 0}
                  max={maxCatTests}
                  suffix=" tests"
                />
              ))}
            </div>
          )}
        </GlassCard>

        {/* Bank distribution */}
        <GlassCard>
          <h2 className="font-bold text-white">Question Bank by Type</h2>
          <p className="text-xs text-slate-500">
            Distribution across quiz types (sample of loaded questions)
          </p>
          {bankByType.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                title="No bank data"
                message="Add questions to see the type distribution."
              />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {bankByType.map(([type, n]) => (
                <Bar key={type} label={type} value={n} max={maxTypeCount} suffix=" qns" />
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Recent scores */}
      <GlassCard>
        <h2 className="font-bold text-white">Recent Test Scores</h2>
        <p className="text-xs text-slate-500">Latest quiz attempts, oldest to newest</p>
        {recentScores.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="No attempts yet"
              message="Scores will chart here once quizzes are submitted."
            />
          </div>
        ) : (
          <div
            className="mt-4 flex h-44 items-end gap-2 sm:gap-3"
            role="img"
            aria-label="Bar chart of recent test scores"
          >
            {recentScores.map((a, i) => {
              const score = a.accuracy ?? a.score ?? 0;
              return (
                <div
                  key={a._id || i}
                  className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
                  title={`${a.category || 'Quiz'} — ${score}% on ${formatDate(a.createdAt || a.date)}`}
                >
                  <span className={cn('text-xs font-bold', scoreColor(score))}>
                    {score}
                  </span>
                  <div className="flex h-32 w-full items-end overflow-hidden rounded-lg bg-white/5">
                    <div
                      className="w-full rounded-lg bg-primary-500/80"
                      style={{ height: `${Math.max(4, Math.min(100, score))}%` }}
                    />
                  </div>
                  <span className="w-full truncate text-center text-[10px] text-slate-500">
                    {formatDate(a.createdAt || a.date)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
