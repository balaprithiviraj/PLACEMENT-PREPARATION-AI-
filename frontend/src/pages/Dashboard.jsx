import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, ListChecks, Target, Flame, ArrowRight, FileSearch, Calculator, Code2, Mic } from 'lucide-react';
import { dashboardAPI } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { greeting, formatDate } from '../utils/helpers.js';
import GlassCard from '../components/GlassCard.jsx';
import StatCard from '../components/StatCard.jsx';
import ScoreRing from '../components/ScoreRing.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import LoadingState, { SkeletonLoader } from '../components/LoadingState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Reveal from '../components/Reveal.jsx';

const quickActions = [
  { to: '/resume', label: 'Analyze Resume', desc: 'Get ATS score', icon: FileSearch, accent: 'indigo' },
  { to: '/aptitude', label: 'Practice Aptitude', desc: 'Timed sets', icon: Calculator, accent: 'rose' },
  { to: '/technical', label: 'Technical Quiz', desc: 'CS + DSA', icon: Code2, accent: 'cyan' },
  { to: '/interview', label: 'Mock Interview', desc: 'HR + Technical', icon: Mic, accent: 'emerald' },
];

const accentTile = {
  indigo: 'from-indigo-500/30 to-violet-500/10 text-indigo-300',
  emerald: 'from-emerald-500/30 to-teal-500/10 text-emerald-300',
  rose: 'from-rose-500/30 to-pink-500/10 text-rose-300',
  cyan: 'from-cyan-500/30 to-sky-500/10 text-cyan-300',
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await dashboardAPI.get();
        setData(res.data?.data || res.data);
      } catch (err) {
        setError(err?.response?.data?.message || 'Could not load dashboard.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const name = user?.name || user?.fullName || 'Student';
  // Backend GET /api/dashboard returns a FLAT object (resumeScore, avgScore,
  // questionsAttempted, streak, preparationProgress, recentActivity). Also
  // accept a nested { stats, resume, progress } shape if the API ever wraps it.
  const stats = data?.stats || {
    resumeScore: data?.resumeScore,
    questionsAttempted: data?.questionsAttempted,
    averageScore: data?.avgScore ?? data?.averageScore,
    streak: data?.streak,
  };
  const resume = data?.resume || {
    score: data?.resumeScore ?? data?.atsScore ?? 0,
    summary: '',
  };
  const prep = data?.preparationProgress || {};
  const catPerf = data?.categoryPerformance || [];
  const techAvg = (() => {
    const t = catPerf.find((c) => String(c.category).toLowerCase().includes('tech'))
      || catPerf.filter((c) => !/quant|logic|verbal|data/i.test(c.category || ''))[0];
    return t?.avgAccuracy;
  })();
  const progress = data?.progress || {
    aptitude: prep.aptitude ?? data?.avgScore ?? 0,
    technical: techAvg ?? data?.avgScore ?? 0,
    interview: prep.interviews ?? 0,
    resume: prep.resume ?? data?.resumeScore ?? 0,
  };
  const activity = data?.recentActivity || data?.activity || [];

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingState message="Loading your dashboard..." />
        <SkeletonLoader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <PageHeader
        eyebrow="Overview"
        title={
          <>
            {greeting()},{' '}
            <span className="text-gradient">{name}</span>
          </>
        }
        sub="Here is your placement preparation overview."
      />

      {error && (
        <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 animate-fade-in">
          {error} Showing available sections below.
        </p>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Reveal delay={0}><StatCard icon={FileText} label="Resume Score" value={stats.resumeScore ?? resume.score ?? '—'} sub="Latest analysis" accent="indigo" /></Reveal>
        <Reveal delay={70}><StatCard icon={ListChecks} label="Questions Attempted" value={stats.questionsAttempted ?? '0'} sub="All modules" accent="cyan" /></Reveal>
        <Reveal delay={140}><StatCard icon={Target} label="Average Score" value={stats.averageScore ?? '—'} sub="Quiz + practice" accent="emerald" /></Reveal>
        <Reveal delay={210}><StatCard icon={Flame} label="Streak" value={stats.streak ? `${stats.streak} days` : '0 days'} sub="Keep it going" accent="rose" /></Reveal>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Resume card */}
        <Reveal delay={80}>
          <GlassCard hover className="flex h-full items-center gap-5">
            <ScoreRing score={resume.score ?? stats.resumeScore ?? 0} />
            <div className="min-w-0 flex-1">
              <h2 className="font-display font-bold text-white">Resume Health</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">
                {resume.summary || 'Upload your resume to get an ATS-style score.'}
              </p>
              <Link
                to="/resume"
                className="group mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-300 transition-colors hover:text-indigo-200"
              >
                {resume.score ? 'Re-analyze' : 'Analyze now'}
                <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </div>
          </GlassCard>
        </Reveal>

        {/* Preparation progress */}
        <Reveal delay={150}>
          <GlassCard className="h-full">
            <h2 className="font-display font-bold text-white">Preparation Progress</h2>
            <div className="mt-4 space-y-3.5">
              <ProgressBar label="Aptitude" value={progress.aptitude ?? 0} />
              <ProgressBar label="Technical" value={progress.technical ?? 0} />
              <ProgressBar label="Interview" value={progress.interview ?? 0} />
              <ProgressBar label="Resume" value={progress.resume ?? resume.score ?? 0} />
            </div>
          </GlassCard>
        </Reveal>
      </div>

      {/* Quick actions */}
      <Reveal delay={100}>
        <GlassCard>
          <h2 className="font-display font-bold text-white">Quick Actions</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map(({ icon: Icon, to, label, desc, accent }) => (
              <Link
                key={to}
                to={to}
                className="group rounded-xl border border-white/10 bg-white/[0.04] p-4 transition-all duration-200 hover:-translate-y-1 hover:border-indigo-500/40 hover:bg-white/[0.07] hover:shadow-glow"
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br transition-transform duration-200 group-hover:scale-110 ${accentTile[accent]}`}
                >
                  <Icon size={17} />
                </span>
                <p className="mt-2.5 text-sm font-semibold text-white">{label}</p>
                <p className="text-xs text-slate-400">{desc}</p>
              </Link>
            ))}
          </div>
        </GlassCard>
      </Reveal>

      {/* Recent activity */}
      <Reveal delay={120}>
        <GlassCard>
          <h2 className="font-display font-bold text-white">Recent Activity</h2>
        {activity.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="No activity yet"
              message="Practice a quiz or analyze your resume to see activity here."
              actionLabel="Analyze Resume"
              onAction={() => navigate('/resume')}
            />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-white/5">
            {activity.slice(0, 6).map((item, i) => (
              <li key={item._id || item.id || i} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-slate-200">{item.title || item.action || 'Activity'}</span>
                <span className="text-xs text-slate-500">
                  {item.score ? `${item.score} pts · ` : ''}
                  {formatDate(item.date || item.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
        </GlassCard>
      </Reveal>
    </div>
  );
}
