import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, AlertTriangle } from 'lucide-react';
import { resumeAPI } from '../services/api.js';
import GlassCard from '../components/GlassCard.jsx';
import SkillBadge from '../components/SkillBadge.jsx';
import LoadingState from '../components/LoadingState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { cn } from '../utils/helpers.js';

function priorityStyle(p) {
  const v = String(p || '').toLowerCase();
  if (v === 'high') return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  if (v === 'medium') return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  if (v === 'low') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
}

export default function SkillGap() {
  const navigate = useNavigate();
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await resumeAPI.list();
        const arr = Array.isArray(res.data) ? res.data : res.data?.data || res.data?.resumes || [];
        const latest = [...arr].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        setResume(latest || null);
      } catch (err) {
        setError(err?.response?.data?.message || err?.response?.data?.detail || 'Could not load skill gap data.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <LoadingState message="Analyzing your skill gaps..." />;

  if (error) {
    return (
      <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
        {error}
      </p>
    );
  }

  if (!resume) {
    return (
      <EmptyState
        icon={GitBranch}
        title="No resume found"
        message="Upload your resume first so we can compare your skills against target roles."
        actionLabel="Analyze Resume"
        onAction={() => navigate('/resume')}
      />
    );
  }

  const missing = resume.missingSkills || [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Skills"
        title="Skill Gap Analysis"
        sub={`Based on your latest resume${resume.fileName ? ` (${resume.fileName})` : ''}.`}
      />

      <GlassCard>
        <h2 className="font-bold text-white">Your Existing Skills</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(resume.skills || []).length === 0 && <p className="text-sm text-slate-500">No skills detected.</p>}
          {(resume.skills || []).map((s, i) => (
            <SkillBadge key={i} skill={typeof s === 'string' ? s : s?.skill || String(s)} />
          ))}
        </div>
      </GlassCard>

      <section aria-label="Missing skills">
        <h2 className="mb-3 font-bold text-white">Skills to Learn ({missing.length})</h2>
        {missing.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="No gaps detected"
            message="Your resume covers the expected skills for your target roles."
          />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {missing.map((m, i) => {
              if (typeof m === 'string') {
                return (
                  <li key={i}>
                    <GlassCard className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-white">{m}</span>
                      <span className={cn('rounded-full border px-2.5 py-1 text-xs font-medium', priorityStyle('medium'))}>
                        Suggested
                      </span>
                    </GlassCard>
                  </li>
                );
              }
              return (
                <li key={i}>
                  <GlassCard>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-white">{m.skill}</h3>
                      {m.priority && (
                        <span className={cn('rounded-full border px-2.5 py-1 text-xs font-medium', priorityStyle(m.priority))}>
                          {m.priority} priority
                        </span>
                      )}
                    </div>
                    <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                      {m.currentLevel && (
                        <div>Current: <span className="font-semibold text-slate-200">{m.currentLevel}</span></div>
                      )}
                      {m.targetLevel && (
                        <div>Target: <span className="font-semibold text-slate-200">{m.targetLevel}</span></div>
                      )}
                    </dl>
                    {m.reason && <p className="mt-2 text-sm text-slate-400">{m.reason}</p>}
                  </GlassCard>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
