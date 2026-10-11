import { useEffect, useRef, useState } from 'react';
import { UploadCloud, ArrowLeft, ArrowRight, Plus, Trash2, Download, FileText, Palette, TriangleAlert, Save } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import GlassCard from '../components/GlassCard.jsx';
import Button from '../components/Button.jsx';
import LoadingState from '../components/LoadingState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import Reveal from '../components/Reveal.jsx';
import { TEMPLATES, TEMPLATE_NAMES } from '../components/resume/ResumeTemplates.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/resume-print.css';

const ACCEPT = '.png,.jpg,.jpeg,.webp,.pdf';
const MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_ACCENT = '#6366f1';
const STORAGE_KEY = 'resume-studio-designs';

function blankResumeData() {
  return {
    name: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    linkedin: '',
    summary: '',
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    design: { layout: 'modern', accentColor: DEFAULT_ACCENT, fontStyle: '', sectionOrder: [] },
  };
}

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

function normalizeResumeData(input) {
  let src = input ?? {};
  // Unwrap { data } / { item } wrappers (local-storage vs. legacy payloads)
  if (src && typeof src === 'object' && !Array.isArray(src)) {
    if (src.data && typeof src.data === 'object' && !Array.isArray(src.data) && src.name === undefined && src.data.name !== undefined) {
      src = src.data;
    }
  }
  const design = src.design && typeof src.design === 'object' ? src.design : {};
  return {
    name: src.name ?? '',
    title: src.title ?? '',
    email: src.email ?? '',
    phone: src.phone ?? '',
    location: src.location ?? '',
    website: src.website ?? '',
    linkedin: src.linkedin ?? '',
    summary: src.summary ?? '',
    experience: asArray(src.experience).map((e) => ({
      role: e?.role ?? '',
      company: e?.company ?? '',
      duration: e?.duration ?? '',
      location: e?.location ?? '',
      bullets: asArray(e?.bullets).map(String),
    })),
    education: asArray(src.education).map((e) => ({
      degree: e?.degree ?? '',
      school: e?.school ?? '',
      year: e?.year ?? '',
      details: e?.details ?? '',
    })),
    skills: asArray(src.skills).map(String),
    projects: asArray(src.projects).map((p) => ({
      name: p?.name ?? '',
      link: p?.link ?? '',
      bullets: asArray(p?.bullets).map(String),
    })),
    certifications: asArray(src.certifications).map((c) => (typeof c === 'string' ? c : c?.name ?? String(c ?? ''))).filter(Boolean),
    design: {
      layout: design.layout ?? 'modern',
      accentColor: design.accentColor ?? DEFAULT_ACCENT,
      fontStyle: design.fontStyle ?? '',
      sectionOrder: asArray(design.sectionOrder),
    },
  };
}

function applyProfileDefaults(resume, user) {
  if (!user) return resume;
  const next = { ...resume };
  if (!next.name && user.name) next.name = user.name;
  if (!next.email && user.email) next.email = user.email;
  if (!next.phone && user.phone) next.phone = user.phone;
  const college = user.college || user.institution || '';
  if (college) {
    if (!next.education || next.education.length === 0) {
      next.education = [{ degree: '', school: college, year: '', details: '' }];
    } else if (!next.education[0]?.school) {
      next.education = next.education.map((e, i) => (i === 0 ? { ...e, school: college } : e));
    }
  }
  return next;
}

function loadLocalDesigns() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistLocalDesigns(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage full or unavailable — keep in-memory state only
  }
}

function itemId(item, idx) {
  return item?._id || item?.id || `item-${idx}`;
}

function itemLabel(item, idx) {
  const d = item?.data && typeof item.data === 'object' ? item.data : item;
  return d?.name || item?.fileName || item?.name || `Resume ${idx + 1}`;
}

const STEPS = ['Upload', 'Details', 'Design'];

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      {children}
    </label>
  );
}

const inputCls = 'glass-input';

export default function ResumeStudio() {
  const { user } = useAuth();
  const fileRef = useRef(null);
  const [step, setStep] = useState(1);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [generatedId, setGeneratedId] = useState(null);

  const [data, setData] = useState(() => blankResumeData());
  const [hasData, setHasData] = useState(false);
  const [skillsText, setSkillsText] = useState('');
  const [certsText, setCertsText] = useState('');

  const [templateId, setTemplateId] = useState('modern');
  const [accent, setAccent] = useState(DEFAULT_ACCENT);

  const [saved, setSaved] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [saveMessage, setSaveMessage] = useState('');

  function hydrate(resume, opts = {}) {
    const merged = applyProfileDefaults(normalizeResumeData(resume), user ?? opts.user ?? null);
    setData(merged);
    setHasData(true);
    setSkillsText((merged.skills || []).join(', '));
    setCertsText((merged.certifications || []).join(', '));
    const layout = merged.design?.layout;
    setTemplateId(TEMPLATES[layout] ? layout : 'modern');
    setAccent(merged.design?.accentColor || DEFAULT_ACCENT);
  }

  function refreshSaved() {
    setLoadingSaved(true);
    setSaved(loadLocalDesigns());
    setLoadingSaved(false);
  }

  useEffect(() => {
    refreshSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function validate(f) {
    if (!f) return 'Please choose a file first.';
    const ext = `.${(f.name.split('.').pop() || '').toLowerCase()}`;
    if (!['.png', '.jpg', '.jpeg', '.webp', '.pdf'].includes(ext)) return 'Only .png, .jpg, .jpeg, .webp or .pdf files are accepted.';
    if (f.size > MAX_BYTES) return 'File must be under 5MB.';
    return '';
  }

  function handlePick(f) {
    setFileError('');
    if (!f) return;
    const err = validate(f);
    if (err) {
      setFileError(err);
      return;
    }
    // Local-only: keep the file name for reference, no upload.
    setFile(f);
  }

  function handleGenerate() {
    setFileError('');
    const err = validate(file);
    if (err) {
      setFileError(err);
      return;
    }
    // Local-only: keep the picked file name and continue with manual details.
    if (!hasData) {
      hydrate(applyProfileDefaults(blankResumeData(), user), { user: null });
    }
    setStep(2);
  }

  function handleBlank() {
    setFileError('');
    hydrate(applyProfileDefaults(blankResumeData(), user), { user: null });
    setGeneratedId(null);
    setStep(2);
  }

  function handleSaveCurrent() {
    const id = generatedId || `local-${Date.now()}`;
    const snapshot = {
      ...normalizeResumeData(previewData),
      _id: id,
      id,
      fileName: file?.name || previewData.name || data.name || 'Untitled resume',
      createdAt: new Date().toISOString(),
    };
    setSaved((prev) => {
      const exists = prev.some((it, i) => itemId(it, i) === id);
      const next = exists
        ? prev.map((it, i) => (itemId(it, i) === id ? snapshot : it))
        : [snapshot, ...prev];
      persistLocalDesigns(next);
      return next;
    });
    setGeneratedId(id);
    setSaveMessage('Saved to this browser.');
  }

  function handleOpen(id) {
    const items = loadLocalDesigns();
    const found = items.find((it, i) => itemId(it, i) === id) || saved.find((it, i) => itemId(it, i) === id);
    if (!found) return;
    const inner = found?.data && typeof found.data === 'object' && found.name === undefined ? found.data : found;
    hydrate(inner, { user });
    setGeneratedId(itemId(found, 0));
    setSaveMessage('');
    setStep(2);
  }

  function handleDelete() {
    if (!deleteId) return;
    setSaved((prev) => {
      const next = prev.filter((it, i) => itemId(it, i) !== deleteId);
      persistLocalDesigns(next);
      return next;
    });
    if (generatedId === deleteId) setGeneratedId(null);
    setDeleteId(null);
  }

  function update(path, value) {
    setData((d) => ({ ...d, [path]: value }));
  }

  function updateList(listName, idx, patch) {
    setData((d) => ({
      ...d,
      [listName]: (d[listName] || []).map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    }));
  }

  function addRow(listName, row) {
    setData((d) => ({ ...d, [listName]: [...(d[listName] || []), row] }));
  }

  function removeRow(listName, idx) {
    setData((d) => ({ ...d, [listName]: (d[listName] || []).filter((_, i) => i !== idx) }));
  }

  function syncSkills(text) {
    setSkillsText(text);
    const arr = text.split(',').map((s) => s.trim()).filter(Boolean);
    setData((d) => ({ ...d, skills: arr }));
  }

  function syncCerts(text) {
    setCertsText(text);
    const arr = text.split(',').map((s) => s.trim()).filter(Boolean);
    setData((d) => ({ ...d, certifications: arr }));
  }

  const Preview = TEMPLATES[templateId] || TEMPLATES.modern;
  const previewData = {
    ...data,
    design: { ...(data.design || {}), layout: templateId, accentColor: accent },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Resume Studio"
        title={<>Design your resume <span className="text-gradient">from any layout</span></>}
        sub="Upload a design reference, edit your details, then download a print-ready PDF."
      />

      {/* Steps indicator */}
      <Reveal>
        <ol className="flex flex-wrap items-center gap-2" aria-label="Progress">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <li key={label} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (n === 1) setStep(1);
                    if (n === 2 && hasData) setStep(2);
                    if (n === 3 && hasData) setStep(3);
                  }}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? 'border-indigo-500/40 bg-indigo-500/20 text-white shadow-glow'
                      : done
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        : 'border-white/10 bg-white/5 text-slate-400'
                  }`}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${active ? 'bg-indigo-500 text-white' : done ? 'bg-emerald-500/30 text-emerald-200' : 'bg-white/10 text-slate-300'}`}>
                    {n}
                  </span>
                  {label}
                </button>
                {n < STEPS.length && <span className="text-slate-600">→</span>}
              </li>
            );
          })}
        </ol>
      </Reveal>

      {/* STEP 1 — Upload (local-only, no server) */}
      {step === 1 && (
        <Reveal>
          <GlassCard hover glow className="text-center">
            <div
              role="button"
              tabIndex={0}
              aria-label="Upload design reference"
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handlePick(e.dataTransfer.files?.[0]);
              }}
              className={`cursor-pointer rounded-xl border border-dashed p-6 transition-colors sm:p-10 ${dragOver ? 'border-indigo-400/60 bg-white/10' : 'border-white/10'}`}
            >
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300">
                <UploadCloud size={24} />
              </span>
              <h2 className="font-display mt-3 text-lg font-bold text-white">
                {file ? file.name : 'Drop a resume design or click to browse'}
              </h2>
              <p className="mt-1 text-sm text-slate-400">Accepted: .png, .jpg, .jpeg, .webp, .pdf · max 5MB · kept locally, no upload</p>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT}
                aria-label="Upload design file"
                className="hidden"
                onChange={(e) => handlePick(e.target.files?.[0])}
              />
            </div>
            {fileError && (
              <p role="alert" className="mx-auto mb-4 mt-4 max-w-md rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                {fileError}
              </p>
            )}
            <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button onClick={handleGenerate} disabled={!file}>
                Continue with this file
              </Button>
              <Button variant="ghost" onClick={handleBlank}>
                Skip &amp; fill manually
              </Button>
            </div>
            {hasData && (
              <div className="mt-4">
                <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                  Continue to details <ArrowRight size={15} />
                </Button>
              </div>
            )}
          </GlassCard>
        </Reveal>
      )}

      {/* STEP 2 — Edit */}
      {step === 2 && (
        <div className="space-y-4">
          <Reveal>
            <GlassCard>
              <h2 className="font-display text-base font-bold text-white">Contact &amp; summary</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Full name">
                  <input className={inputCls} value={data.name} onChange={(e) => update('name', e.target.value)} placeholder="Aarav Sharma" />
                </Field>
                <Field label="Professional title">
                  <input className={inputCls} value={data.title} onChange={(e) => update('title', e.target.value)} placeholder="Frontend Developer" />
                </Field>
                <Field label="Email">
                  <input className={inputCls} value={data.email} onChange={(e) => update('email', e.target.value)} placeholder="you@example.com" />
                </Field>
                <Field label="Phone">
                  <input className={inputCls} value={data.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+91 98765 43210" />
                </Field>
                <Field label="Location">
                  <input className={inputCls} value={data.location} onChange={(e) => update('location', e.target.value)} placeholder="Bengaluru, India" />
                </Field>
                <Field label="Website">
                  <input className={inputCls} value={data.website} onChange={(e) => update('website', e.target.value)} placeholder="https://portfolio.dev" />
                </Field>
                <Field label="LinkedIn">
                  <input className={inputCls} value={data.linkedin} onChange={(e) => update('linkedin', e.target.value)} placeholder="https://linkedin.com/in/you" />
                </Field>
                <Field label="Skills (comma separated)">
                  <input className={inputCls} value={skillsText} onChange={(e) => syncSkills(e.target.value)} placeholder="React, Node.js, Python" />
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Summary">
                  <textarea className={`${inputCls} min-h-[96px]`} value={data.summary} onChange={(e) => update('summary', e.target.value)} placeholder="2–3 lines about your strengths and goals…" />
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Certifications (comma separated)">
                  <input className={inputCls} value={certsText} onChange={(e) => syncCerts(e.target.value)} placeholder="AWS Cloud Practitioner, Google Data Analytics" />
                </Field>
              </div>
            </GlassCard>
          </Reveal>

          <Reveal delay={60}>
            <GlassCard>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-white">Experience</h2>
                <Button size="sm" variant="ghost" onClick={() => addRow('experience', { role: '', company: '', duration: '', location: '', bullets: [] })}>
                  <Plus size={15} /> Add
                </Button>
              </div>
              {(data.experience || []).length === 0 && (
                <p className="mt-2 text-sm text-slate-500">No experience added yet.</p>
              )}
              <div className="mt-3 space-y-3">
                {(data.experience || []).map((exp, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input className={inputCls} value={exp.role} onChange={(e) => updateList('experience', i, { role: e.target.value })} placeholder="Role" aria-label={`Experience ${i + 1} role`} />
                      <input className={inputCls} value={exp.company} onChange={(e) => updateList('experience', i, { company: e.target.value })} placeholder="Company" aria-label={`Experience ${i + 1} company`} />
                      <input className={inputCls} value={exp.duration} onChange={(e) => updateList('experience', i, { duration: e.target.value })} placeholder="Duration (e.g. Jun 2024 – Aug 2024)" aria-label={`Experience ${i + 1} duration`} />
                      <input className={inputCls} value={exp.location} onChange={(e) => updateList('experience', i, { location: e.target.value })} placeholder="Location" aria-label={`Experience ${i + 1} location`} />
                    </div>
                    <textarea
                      className={`${inputCls} mt-2 min-h-[64px]`}
                      value={(exp.bullets || []).join('\n')}
                      onChange={(e) => updateList('experience', i, { bullets: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
                      placeholder="One achievement per line…"
                      aria-label={`Experience ${i + 1} bullets`}
                    />
                    <div className="mt-2 text-right">
                      <Button size="sm" variant="ghost" onClick={() => removeRow('experience', i)} aria-label={`Remove experience ${i + 1}`}>
                        <Trash2 size={14} /> Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </Reveal>

          <Reveal delay={100}>
            <GlassCard>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-white">Education</h2>
                <Button size="sm" variant="ghost" onClick={() => addRow('education', { degree: '', school: '', year: '', details: '' })}>
                  <Plus size={15} /> Add
                </Button>
              </div>
              {(data.education || []).length === 0 && (
                <p className="mt-2 text-sm text-slate-500">No education added yet.</p>
              )}
              <div className="mt-3 space-y-3">
                {(data.education || []).map((edu, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input className={inputCls} value={edu.degree} onChange={(e) => updateList('education', i, { degree: e.target.value })} placeholder="Degree" aria-label={`Education ${i + 1} degree`} />
                      <input className={inputCls} value={edu.school} onChange={(e) => updateList('education', i, { school: e.target.value })} placeholder="School / College" aria-label={`Education ${i + 1} school`} />
                      <input className={inputCls} value={edu.year} onChange={(e) => updateList('education', i, { year: e.target.value })} placeholder="Year" aria-label={`Education ${i + 1} year`} />
                      <input className={inputCls} value={edu.details} onChange={(e) => updateList('education', i, { details: e.target.value })} placeholder="Details (CGPA, honors…)" aria-label={`Education ${i + 1} details`} />
                    </div>
                    <div className="mt-2 text-right">
                      <Button size="sm" variant="ghost" onClick={() => removeRow('education', i)} aria-label={`Remove education ${i + 1}`}>
                        <Trash2 size={14} /> Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </Reveal>

          <Reveal delay={140}>
            <GlassCard>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-white">Projects</h2>
                <Button size="sm" variant="ghost" onClick={() => addRow('projects', { name: '', link: '', bullets: [] })}>
                  <Plus size={15} /> Add
                </Button>
              </div>
              {(data.projects || []).length === 0 && (
                <p className="mt-2 text-sm text-slate-500">No projects added yet.</p>
              )}
              <div className="mt-3 space-y-3">
                {(data.projects || []).map((proj, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input className={inputCls} value={proj.name} onChange={(e) => updateList('projects', i, { name: e.target.value })} placeholder="Project name" aria-label={`Project ${i + 1} name`} />
                      <input className={inputCls} value={proj.link} onChange={(e) => updateList('projects', i, { link: e.target.value })} placeholder="Link (https://…)" aria-label={`Project ${i + 1} link`} />
                    </div>
                    <textarea
                      className={`${inputCls} mt-2 min-h-[64px]`}
                      value={(proj.bullets || []).join('\n')}
                      onChange={(e) => updateList('projects', i, { bullets: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
                      placeholder="One highlight per line…"
                      aria-label={`Project ${i + 1} bullets`}
                    />
                    <div className="mt-2 text-right">
                      <Button size="sm" variant="ghost" onClick={() => removeRow('projects', i)} aria-label={`Remove project ${i + 1}`}>
                        <Trash2 size={14} /> Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </Reveal>

          <div className="flex flex-col justify-between gap-3 sm:flex-row">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ArrowLeft size={15} /> Back
            </Button>
            <Button onClick={() => setStep(3)}>
              Continue to design <ArrowRight size={15} />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3 — Design & Download */}
      {step === 3 && (
        <div className="space-y-4">
          <Reveal>
            <GlassCard glow>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">Design</p>
                  <h2 className="font-display mt-2 text-base font-bold text-white">Pick a template &amp; accent</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" onClick={handleSaveCurrent}>
                    <Save size={15} /> Save design
                  </Button>
                  <Button className="btn-primary" onClick={() => window.print()}>
                    <Download size={15} /> Download PDF
                  </Button>
                </div>
              </div>
              {saveMessage && (
                <p role="status" className="mt-3 text-xs text-emerald-300">{saveMessage}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Template">
                {TEMPLATE_NAMES.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={templateId === id}
                    onClick={() => setTemplateId(id)}
                    className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-all ${
                      templateId === id
                        ? 'border-indigo-500/50 bg-indigo-500/25 text-white shadow-glow'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-2 text-sm text-slate-300">
                  <Palette size={16} /> Accent
                </span>
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  aria-label="Accent color"
                  className="h-9 w-14 cursor-pointer rounded-lg border border-white/15 bg-transparent"
                />
                <span className="text-xs text-slate-500">{accent}</span>
              </div>
            </GlassCard>
          </Reveal>

          <Reveal delay={60}>
            <div id="resume-print-root">
              <Preview data={previewData} />
            </div>
          </Reveal>

          <div className="flex flex-col justify-between gap-3 sm:flex-row">
            <Button variant="ghost" onClick={() => setStep(2)}>
              <ArrowLeft size={15} /> Back to details
            </Button>
            <Button onClick={() => window.print()}>
              <Download size={15} /> Download PDF
            </Button>
          </div>
        </div>
      )}

      {/* Saved list (localStorage only) */}
      <section aria-label="My generated resumes" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-white">My generated resumes</h2>
          {!loadingSaved && saved.length > 0 && (
            <Button variant="ghost" size="sm" onClick={refreshSaved}>
              Refresh
            </Button>
          )}
        </div>
        {loadingSaved ? (
          <LoadingState message="Loading generated resumes…" />
        ) : saved.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No saved designs yet"
            message="Fill in your details, then use Save design to keep it in this browser."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {saved.map((item, idx) => {
              const id = itemId(item, idx);
              return (
                <li key={id}>
                  <GlassCard hover className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                      <FileText size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{itemLabel(item, idx)}</p>
                      <p className="truncate text-xs text-slate-400">
                        {item?.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Saved design'}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleOpen(id)}>
                        Open
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteId(id)} aria-label={`Delete ${itemLabel(item, idx)}`}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </GlassCard>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Modal open={Boolean(deleteId)} onClose={() => setDeleteId(null)} title="Delete resume?">
        <p className="flex items-start gap-2 text-sm text-slate-400">
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-amber-300" />
          This will permanently delete this saved design from this browser. This cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteId(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
