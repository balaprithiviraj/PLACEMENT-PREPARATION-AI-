import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, Loader2, ArrowRight, RefreshCw } from 'lucide-react';
import { resumeAPI } from '../services/api.js';
import { formatDate } from '../utils/helpers.js';
import GlassCard from '../components/GlassCard.jsx';
import Button from '../components/Button.jsx';
import LoadingState from '../components/LoadingState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import PageHeader from '../components/PageHeader.jsx';

const ACCEPTED = '.pdf,.docx,.txt';
const MAX_BYTES = 5 * 1024 * 1024;
const STAGES = ['Uploading...', 'Reviewing skills...', 'Checking ATS...'];

function pickList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.resumes)) return payload.resumes;
  return [];
}

function pickResume(payload) {
  return payload?.data || payload?.resume || payload;
}

export default function ResumeAnalyzer() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState(0);
  const [list, setList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await resumeAPI.list();
        setList(pickList(res.data));
      } catch (err) {
        setListError(
          err?.response?.data?.message || err?.response?.data?.detail || 'Could not load past analyses.'
        );
      } finally {
        setLoadingList(false);
      }
    }
    load();
  }, []);

  // Rotate staged messages while the upload request is in flight
  useEffect(() => {
    if (!uploading) return;
    setStage(0);
    const t = setInterval(() => setStage((s) => (s + 1) % STAGES.length), 2500);
    return () => clearInterval(t);
  }, [uploading]);

  function validate(file) {
    const ext = `.${(file.name.split('.').pop() || '').toLowerCase()}`;
    if (!['.pdf', '.docx', '.txt'].includes(ext)) return 'Only .pdf, .docx or .txt files are accepted.';
    if (file.size > MAX_BYTES) return 'File must be under 5MB.';
    return '';
  }

  async function handleFile(file) {
    setFileError('');
    if (!file) return;
    const err = validate(file);
    if (err) {
      setFileError(err);
      return;
    }
    const form = new FormData();
    form.append('resume', file);
    setUploading(true);
    try {
      const res = await resumeAPI.upload(form);
      const saved = pickResume(res.data);
      if (saved?._id) navigate(`/resume/${saved._id}`);
      else setFileError('Upload succeeded but no resume id was returned.');
    } catch (err2) {
      setFileError(
        err2?.response?.data?.message || err2?.response?.data?.detail || 'Upload failed. Please try again.'
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Resume"
        title="Resume Analyzer"
        sub="Upload your resume for an ATS-style score and skill review."
      />

      <GlassCard
        className={`border-dashed text-center transition-colors ${dragOver ? 'border-primary-400/60 bg-white/10' : ''}`}
      >
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload resume"
          onClick={() => !uploading && fileRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !uploading) fileRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (!uploading) handleFile(e.dataTransfer.files?.[0]);
          }}
          className="cursor-pointer p-6"
        >
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500/20 text-primary-300">
            {uploading ? <Loader2 size={24} className="animate-spin" /> : <UploadCloud size={24} />}
          </span>
          <h2 className="mt-3 font-bold text-white">
            {uploading ? STAGES[stage] : 'Drop your resume here or click to browse'}
          </h2>
          <p className="mt-1 text-sm text-slate-400">Accepted: PDF, DOCX, TXT · max 5MB</p>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED}
            aria-label="Upload resume file"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
        {fileError && (
          <p role="alert" className="mx-auto mb-4 max-w-md rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
            {fileError}
          </p>
        )}
      </GlassCard>

      <section aria-label="Past analyses">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-white">Past Analyses</h2>
          {!loadingList && list.length > 0 && (
            <Button variant="ghost" onClick={() => window.location.reload()}>
              <RefreshCw size={15} /> Refresh
            </Button>
          )}
        </div>
        {loadingList ? (
          <LoadingState message="Loading past analyses..." />
        ) : listError ? (
          <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
            {listError}
          </p>
        ) : list.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No resumes analyzed yet"
            message="Upload your resume above to get your first ATS score."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {list.map((r) => (
              <li key={r._id}>
                <Link to={`/resume/${r._id}`}>
                  <GlassCard hover className="flex items-center gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-500/20 text-primary-300">
                      <FileText size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{r.fileName || 'Resume'}</p>
                      <p className="text-xs text-slate-400">
                        Score {r.overallScore ?? '—'}/100 · {formatDate(r.createdAt)}
                      </p>
                    </div>
                    <ArrowRight size={16} className="shrink-0 text-slate-500" />
                  </GlassCard>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
