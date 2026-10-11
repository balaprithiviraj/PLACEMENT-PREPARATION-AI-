import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, CheckCircle2, XCircle } from 'lucide-react';
import { resumeAPI } from '../services/api.js';
import GlassCard from '../components/GlassCard.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import LoadingState from '../components/LoadingState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import PageHeader from '../components/PageHeader.jsx';

function asStrings(arr) {
  return (arr || []).map((s) => (typeof s === 'string' ? s : s?.skill || s?.role || String(s)));
}

export default function CareerRoles() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await resumeAPI.list();
        const arr = Array.isArray(res.data) ? res.data : res.data?.data || res.data?.resumes || [];
        const latest = [...arr].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        setRoles(latest?.recommendedRoles || []);
        setFileName(latest?.fileName || '');
      } catch (err) {
        setError(err?.response?.data?.message || err?.response?.data?.detail || 'Could not load career roles.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <LoadingState message="Finding roles for you..." />;

  if (error) {
    return (
      <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
        {error}
      </p>
    );
  }

  if (roles.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="No role recommendations yet"
        message="Upload and analyze your resume to get personalized career role matches."
        actionLabel="Analyze Resume"
        onAction={() => navigate('/resume')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Careers"
        title="Career Roles"
        sub={`Recommended for you${fileName ? ` based on ${fileName}` : ''}.`}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {roles.map((r, i) => {
          const role = typeof r === 'string' ? { role: r } : r;
          const strong = asStrings(role.requiredSkills);
          const improve = asStrings(role.missingSkills);
          return (
            <GlassCard key={i} hover>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/20 text-primary-300">
                    <Briefcase size={19} />
                  </span>
                  <h2 className="font-bold text-white">{role.role || `Role ${i + 1}`}</h2>
                </div>
                {role.matchPercentage != null && (
                  <span className="shrink-0 rounded-full border border-primary-500/30 bg-primary-500/15 px-2.5 py-1 text-xs font-bold text-primary-200">
                    {role.matchPercentage}%
                  </span>
                )}
              </div>

              {role.matchPercentage != null && (
                <div className="mt-3">
                  <ProgressBar label="Role match" value={role.matchPercentage} />
                </div>
              )}

              {strong.length > 0 && (
                <div className="mt-3">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-300">
                    <CheckCircle2 size={13} /> Strong in
                  </h3>
                  <p className="mt-1 text-sm text-slate-300">{strong.join(', ')}</p>
                </div>
              )}

              {improve.length > 0 && (
                <div className="mt-3">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
                    <XCircle size={13} /> To improve
                  </h3>
                  <p className="mt-1 text-sm text-slate-300">{improve.join(', ')}</p>
                </div>
              )}

              {role.preparation && (
                <p className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                  <span className="font-semibold text-white">How to prepare: </span>
                  {role.preparation}
                </p>
              )}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
