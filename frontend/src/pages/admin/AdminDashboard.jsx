import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  ListChecks,
  Target,
  FileText,
  ClipboardList,
  ArrowRight,
} from 'lucide-react';
import api, { dashboardAPI } from '../../services/api.js';
import GlassCard from '../../components/GlassCard.jsx';
import StatCard from '../../components/StatCard.jsx';
import LoadingState, { SkeletonLoader } from '../../components/LoadingState.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { formatDate } from '../../utils/helpers.js';

// NOTE: backend /api/dashboard is per-user (no global admin aggregate yet),
// so this page combines the admin directory (/users) + bank totals (/questions)
// with the dashboard payload and labels every number's source. All reads are
// defensive: missing fields render as '—' instead of crashing.
export default function AdminDashboard() {
  const [dash, setDash] = useState(null);
  const [studentsTotal, setStudentsTotal] = useState(null);
  const [studentsActive, setStudentsActive] = useState(null);
  const [studentsSampled, setStudentsSampled] = useState(false);
  const [bankTotal, setBankTotal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [dashRes, usersRes, qRes] = await Promise.allSettled([
          dashboardAPI.get(),
          api.get('/users', { params: { limit: 100 } }),
          api.get('/questions', { params: { limit: 1 } }),
        ]);

        if (dashRes.status === 'fulfilled') {
          setDash(dashRes.value.data?.data || dashRes.value.data || null);
        }
        if (usersRes.status === 'fulfilled') {
          const payload = usersRes.value.data || {};
          const list = payload.users || [];
          setStudentsTotal(payload.total ?? list.length ?? null);
          setStudentsActive(list.filter((u) => u.isActive !== false).length);
          setStudentsSampled(
            typeof payload.total === 'number' && list.length < payload.total
          );
        }
        if (qRes.status === 'fulfilled') {
          setBankTotal(qRes.value.data?.total ?? null);
        }
        if (
          dashRes.status === 'rejected' &&
          usersRes.status === 'rejected' &&
          qRes.status === 'rejected'
        ) {
          setError('Could not load admin data. Check the backend connection.');
        } else if (
          dashRes.status === 'rejected' ||
          usersRes.status === 'rejected'
        ) {
          setError('Some sections failed to load. Showing available data below.');
        }
      } catch {
        setError('Could not load admin data. Check the backend connection.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activity = dash?.recentActivity || dash?.activity || [];

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingState message="Loading admin dashboard..." />
        <SkeletonLoader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-sm text-slate-400">
          Students, question bank and platform activity at a glance.
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

      <section aria-label="Platform stats" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Users}
          label="Total Students"
          value={studentsTotal ?? '—'}
          sub="GET /users (admin)"
        />
        <StatCard
          icon={UserCheck}
          label="Active Students"
          value={studentsActive ?? '—'}
          sub={studentsSampled ? 'Counted from first 100 loaded' : 'Currently enabled'}
        />
        <StatCard
          icon={ClipboardList}
          label="Questions in Bank"
          value={bankTotal ?? '—'}
          sub="GET /questions total"
        />
        <StatCard
          icon={ListChecks}
          label="Total Tests"
          value={dash?.testsTaken ?? '—'}
          sub="Your account dashboard"
        />
        <StatCard
          icon={Target}
          label="Avg Score"
          value={dash?.avgScore != null ? `${dash.avgScore}%` : '—'}
          sub="Across quiz attempts"
        />
        <StatCard
          icon={FileText}
          label="Avg Resume Score"
          value={dash?.resumeScore ?? dash?.atsScore ?? '—'}
          sub="Latest resume analysis"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <h2 className="font-bold text-white">Recent Activity</h2>
          {activity.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                title="No activity yet"
                message="Quiz attempts and resume uploads will appear here."
              />
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-white/5">
              {activity.slice(0, 6).map((item, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm"
                >
                  <span className="text-slate-200">
                    {item.title || item.action || 'Activity'}
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {formatDate(item.date || item.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard>
          <h2 className="font-bold text-white">Manage</h2>
          <p className="mt-1 text-sm text-slate-400">
            Jump to the admin sections most used during placement drives.
          </p>
          <nav className="mt-4 grid gap-3 sm:grid-cols-2" aria-label="Admin shortcuts">
            {[
              { to: '/admin/students', label: 'Students', desc: 'Search, view, enable/disable' },
              { to: '/admin/questions', label: 'Questions', desc: 'Add, edit, remove bank items' },
              { to: '/admin/categories', label: 'Categories', desc: 'Coverage across the bank' },
              { to: '/admin/analytics', label: 'Analytics', desc: 'Scores and distributions' },
            ].map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-primary-500/40 hover:bg-white/10"
              >
                <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
                  {a.label} <ArrowRight size={15} className="text-primary-300" />
                </p>
                <p className="mt-0.5 text-xs text-slate-400">{a.desc}</p>
              </Link>
            ))}
          </nav>
          <p className="mt-4 text-xs text-slate-500">
            Questions attempted (all users): {dash?.questionsAttempted ?? '—'} · Best
            score: {dash?.bestScore != null ? `${dash.bestScore}%` : '—'}
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
