import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, RefreshCw, Lightbulb, MessagesSquare } from 'lucide-react';
import { resumeAPI } from '../services/api.js';
import GlassCard from '../components/GlassCard.jsx';
import Button from '../components/Button.jsx';
import ScoreRing from '../components/ScoreRing.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import SkillBadge from '../components/SkillBadge.jsx';
import LoadingState from '../components/LoadingState.jsx';
import AiDisclaimer from '../components/AiDisclaimer.jsx';

function asStrings(arr) {
  return (arr || []).map((s) => (typeof s === 'string' ? s : s?.skill || s?.role || JSON.stringify(s)));
}

export default function ResumeResult() {
  const { id } = useParams();
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reanalyzing, setReanalyzing] = useState(false);
  const [notice, setNotice] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await resumeAPI.getById(id);
      setResume(res.data?.data || res.data);
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.detail || 'Could not load this analysis.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function reanalyze() {
    setReanalyzing(true);
    setNotice('');
    try {
      const res = await resumeAPI.analyze(id);
      setResume(res.data?.data || res.data);
      setNotice('Re-analysis complete.');
    } catch (err) {
      setNotice(err?.response?.data?.message || err?.response?.data?.detail || 'Re-analysis failed.');
    } finally {
      setReanalyzing(false);
    }
  }

  if (loading) return <LoadingState message="Loading analysis..." />;
  if (error || !resume) {
    return (
      <div className="space-y-4">
        <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
          {error || 'Analysis not found.'}
        </p>
        <Link to="/resume" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-300 hover:text-primary-200">
          <ArrowLeft size={15} /> Back to Resume Analyzer
        </Link>
      </div>
    );
  }

  const breakdown = resume.breakdown || {};
  const breakdownRows = [
    ['Skills', breakdown.skills],
    ['Projects', breakdown.projects],
    ['Education', breakdown.education],
    ['Experience', breakdown.experience],
    ['Formatting', breakdown.formatting],
  ];
  const missing = resume.missingSkills || [];
  const roles = resume.recommendedRoles || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/resume" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white">
            <ArrowLeft size={14} /> All analyses
          </Link>
          <h1 className="mt-1 truncate text-2xl font-bold text-white">{resume.fileName || 'Resume Analysis'}</h1>
        </div>
        <Button onClick={reanalyze} loading={reanalyzing}>
          <RefreshCw size={15} /> Re-analyze
        </Button>
      </div>

      {notice && (
        <p role="status" className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
          {notice}
        </p>
      )}

      {/* Scores */}
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="flex items-center gap-5">
          <ScoreRing score={resume.overallScore ?? 0} />
          <div>
            <h2 className="font-bold text-white">Overall Score</h2>
            <p className="mt-1 text-sm text-slate-400">{resume.summary || 'No summary available.'}</p>
          </div>
        </GlassCard>
        <GlassCard>
          <h2 className="font-bold text-white">ATS &amp; Breakdown</h2>
          <div className="mt-4 space-y-3">
            <ProgressBar label="ATS Score" value={resume.atsScore ?? 0} />
            {breakdownRows.map(([label, value]) => (
              <ProgressBar key={label} label={label} value={value ?? 0} />
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Strengths / Weaknesses */}
      <div className="grid gap-4 md:grid-cols-2">
        <GlassCard>
          <h2 className="font-bold text-emerald-300">Strengths</h2>
          <ul className="mt-3 space-y-2">
            {(resume.strengths || []).length === 0 && <li className="text-sm text-slate-500">None listed.</li>}
            {(resume.strengths || []).map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-400" /> {s}
              </li>
            ))}
          </ul>
        </GlassCard>
        <GlassCard>
          <h2 className="font-bold text-rose-300">Weaknesses</h2>
          <ul className="mt-3 space-y-2">
            {(resume.weaknesses || []).length === 0 && <li className="text-sm text-slate-500">None listed.</li>}
            {(resume.weaknesses || []).map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" /> {s}
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>

      {/* Skills */}
      <GlassCard>
        <h2 className="font-bold text-white">Skills</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(resume.skills || []).length === 0 && <p className="text-sm text-slate-500">No skills detected.</p>}
          {(resume.skills || []).map((s, i) => (
            <SkillBadge key={i} skill={typeof s === 'string' ? s : s?.skill || String(s)} />
          ))}
        </div>
        {missing.length > 0 && (
          <>
            <h3 className="mt-5 font-semibold text-white">Missing Skills</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {missing.map((m, i) =>
                typeof m === 'string' ? (
                  <SkillBadge key={i} skill={m} level="to learn" />
                ) : (
                  <SkillBadge key={i} skill={m.skill} level={m.priority || m.targetLevel} />
                )
              )}
            </div>
          </>
        )}
      </GlassCard>

      {/* Recommended roles */}
      {roles.length > 0 && (
        <section aria-label="Recommended roles">
          <h2 className="mb-3 font-bold text-white">Recommended Roles</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {roles.map((r, i) => {
              const role = typeof r === 'string' ? { role: r } : r;
              return (
                <GlassCard key={i}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-white">{role.role}</h3>
                    {role.matchPercentage != null && (
                      <span className="rounded-full border border-primary-500/30 bg-primary-500/15 px-2.5 py-1 text-xs font-bold text-primary-200">
                        {role.matchPercentage}% match
                      </span>
                    )}
                  </div>
                  {role.preparation && <p className="mt-2 text-sm text-slate-400">{role.preparation}</p>}
                  {role.requiredSkills?.length > 0 && (
                    <p className="mt-2 text-xs text-slate-400">
                      <span className="font-semibold text-slate-300">Needs: </span>
                      {asStrings(role.requiredSkills).join(', ')}
                    </p>
                  )}
                </GlassCard>
              );
            })}
          </div>
        </section>
      )}

      {/* Improvements + interview topics */}
      <div className="grid gap-4 md:grid-cols-2">
        <GlassCard>
          <h2 className="flex items-center gap-2 font-bold text-white">
            <Lightbulb size={17} className="text-amber-300" /> Improvements
          </h2>
          <ul className="mt-3 space-y-2">
            {(resume.improvements || []).length === 0 && <li className="text-sm text-slate-500">No suggestions.</li>}
            {(resume.improvements || []).map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                {s}
              </li>
            ))}
          </ul>
        </GlassCard>
        <GlassCard>
          <h2 className="flex items-center gap-2 font-bold text-white">
            <MessagesSquare size={17} className="text-primary-300" /> Interview Topics
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {(resume.interviewTopics || []).length === 0 && <p className="text-sm text-slate-500">None suggested.</p>}
            {asStrings(resume.interviewTopics).map((t, i) => (
              <SkillBadge key={i} skill={t} />
            ))}
          </div>
        </GlassCard>
      </div>
      <AiDisclaimer />
    </div>
  );
}
