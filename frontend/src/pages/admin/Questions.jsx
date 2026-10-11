import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { questionAPI } from '../../services/api.js';
import GlassCard from '../../components/GlassCard.jsx';
import Button from '../../components/Button.jsx';
import Modal from '../../components/Modal.jsx';
import LoadingState from '../../components/LoadingState.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { difficultyColor, cn } from '../../utils/helpers.js';

const LIMIT = 15;
const TYPES = ['aptitude', 'technical', 'hr', 'interview'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const KNOWN_CATEGORIES = [
  'Quantitative Aptitude',
  'Logical Reasoning',
  'Verbal Ability',
  'Data Interpretation',
  'Programming',
  'DSA',
  'DBMS',
  'OS',
  'CN',
  'OOP',
  'Web Dev',
  'HR',
  'Projects',
];

const EMPTY_FORM = {
  question: '',
  options: ['', '', '', ''],
  correctAnswer: 0,
  explanation: '',
  category: '',
  type: 'aptitude',
  difficulty: 'Medium',
};

const EMPTY_FILTERS = { category: '', difficulty: '', type: '', search: '' };

export default function Questions() {
  const [searchParams] = useSearchParams();
  const [questions, setQuestions] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState(() => ({
    ...EMPTY_FILTERS,
    category: searchParams.get('category') || '',
  }));
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Deep-link support: /admin/questions?category=X (from Categories page)
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) {
      setFilters((f) => ({ ...f, category: cat }));
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Debounce the search box; other filters apply immediately
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setFilters((f) => ({ ...f, search: searchInput.trim() }));
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const params = { page, limit: LIMIT };
        if (filters.category) params.category = filters.category;
        if (filters.difficulty) params.difficulty = filters.difficulty;
        if (filters.type) params.type = filters.type;
        if (filters.search) params.search = filters.search;
        const res = await questionAPI.list(params);
        const payload = res.data?.data ?? res.data ?? {};
        setQuestions(payload.questions || []);
        setTotal(payload.total ?? 0);
      } catch (err) {
        setError(err?.response?.data?.message || 'Could not load questions.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filters, page]);

  function setFilter(key, value) {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  }

  function openEdit(q) {
    setEditing(q);
    setForm({
      question: q.question || '',
      options: [...(q.options || ['', '', '', '']), '', '', '', ''].slice(0, 4),
      correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
      explanation: q.explanation || '',
      category: q.category || '',
      type: q.type || 'aptitude',
      difficulty: q.difficulty || 'Medium',
    });
    setFormError('');
    setFormOpen(true);
  }

  function setOption(i, value) {
    setForm((f) => ({
      ...f,
      options: f.options.map((o, j) => (j === i ? value : o)),
    }));
  }

  async function saveQuestion(e) {
    e.preventDefault();
    const trimmedOptions = form.options.map((o) => o.trim());
    if (!form.question.trim()) return setFormError('Question text is required.');
    if (trimmedOptions.some((o) => !o))
      return setFormError('All 4 options are required.');
    if (!form.category.trim()) return setFormError('Category is required.');

    setSaving(true);
    setFormError('');
    const payload = {
      question: form.question.trim(),
      options: trimmedOptions,
      correctAnswer: Number(form.correctAnswer),
      explanation: form.explanation.trim(),
      category: form.category.trim(),
      type: form.type,
      difficulty: form.difficulty,
    };
    try {
      if (editing) {
        const res = await questionAPI.update(editing._id, payload);
        const saved = res.data?.data ?? res.data?.question ?? res.data;
        setQuestions((prev) =>
          prev.map((q) => (q._id === editing._id ? saved : q))
        );
      } else {
        const res = await questionAPI.create(payload);
        const saved = res.data?.data ?? res.data?.question ?? res.data;
        setQuestions((prev) => [saved, ...prev]);
        setTotal((t) => t + 1);
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Could not save question.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await questionAPI.remove(deleteTarget._id);
      setQuestions((prev) => prev.filter((q) => q._id !== deleteTarget._id));
      setTotal((t) => Math.max(0, t - 1));
      setDeleteTarget(null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not delete question.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const hasFilters = filters.category || filters.difficulty || filters.type || filters.search;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Questions</h1>
          <p className="text-sm text-slate-400">
            {total} active {total === 1 ? 'question' : 'questions'} in the bank
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Add question
        </Button>
      </div>

      {/* Filters */}
      <GlassCard>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label htmlFor="q-search" className="mb-1.5 block">
              Search
            </label>
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                id="q-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search question text..."
                className="glass-input pl-9"
              />
            </div>
          </div>
          <div>
            <label htmlFor="q-category" className="mb-1.5 block">
              Category
            </label>
            <select
              id="q-category"
              value={filters.category}
              onChange={(e) => setFilter('category', e.target.value)}
              className="glass-input"
            >
              <option value="">All categories</option>
              {KNOWN_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="q-type" className="mb-1.5 block">
              Type
            </label>
            <select
              id="q-type"
              value={filters.type}
              onChange={(e) => setFilter('type', e.target.value)}
              className="glass-input"
            >
              <option value="">All types</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="q-difficulty" className="mb-1.5 block">
              Difficulty
            </label>
            <select
              id="q-difficulty"
              value={filters.difficulty}
              onChange={(e) => setFilter('difficulty', e.target.value)}
              className="glass-input"
            >
              <option value="">All levels</option>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
        {hasFilters && (
          <button
            onClick={() => {
              setFilters(EMPTY_FILTERS);
              setSearchInput('');
              setPage(1);
            }}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-300 hover:text-primary-200"
          >
            <RotateCcw size={13} /> Clear all filters
          </button>
        )}
      </GlassCard>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300"
        >
          {error}
        </p>
      )}

      {loading ? (
        <LoadingState message="Loading questions..." />
      ) : questions.length === 0 ? (
        <EmptyState
          title="No questions found"
          message={
            hasFilters
              ? 'Nothing matches these filters. Clear them or add a new question.'
              : 'The bank is empty. Add the first question.'
          }
          actionLabel="Add question"
          onAction={openCreate}
        />
      ) : (
        <>
          <ul className="grid gap-3">
            {questions.map((q) => (
              <li key={q._id}>
                <GlassCard>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-semibold text-slate-200">
                      {q.category || 'General'}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-slate-400">
                      {q.type || 'aptitude'}
                    </span>
                    <span
                      className={cn(
                        'rounded-full border px-2.5 py-0.5 font-semibold',
                        difficultyColor(q.difficulty)
                      )}
                    >
                      {q.difficulty || 'Medium'}
                    </span>
                  </div>
                  <p className="mt-2 font-medium text-white">{q.question}</p>
                  <ol className="mt-2 grid gap-1.5 text-sm sm:grid-cols-2">
                    {q.options?.map((opt, i) => (
                      <li
                        key={i}
                        className={cn(
                          'rounded-lg border px-3 py-1.5',
                          i === q.correctAnswer
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                            : 'border-white/10 bg-white/5 text-slate-300'
                        )}
                      >
                        <span className="mr-2 font-bold text-slate-500">
                          {String.fromCharCode(65 + i)}.
                        </span>
                        {opt}
                        {i === q.correctAnswer && (
                          <span className="ml-2 text-xs font-semibold">✓ correct</span>
                        )}
                      </li>
                    ))}
                  </ol>
                  {q.explanation && (
                    <p className="mt-2 text-xs text-slate-500">
                      Explanation: {q.explanation}
                    </p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => openEdit(q)}>
                      <Pencil size={14} /> Edit
                    </Button>
                    <Button
                      variant="danger"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => setDeleteTarget(q)}
                    >
                      <Trash2 size={14} /> Delete
                    </Button>
                  </div>
                </GlassCard>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between text-sm text-slate-400">
            <p>
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} /> Prev
              </Button>
              <Button
                variant="ghost"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                Next <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Create / edit modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit question' : 'Add question'}
      >
        <form onSubmit={saveQuestion} className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          <div>
            <label htmlFor="qf-text" className="mb-1.5 block">
              Question text
            </label>
            <textarea
              id="qf-text"
              value={form.question}
              onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
              rows={3}
              placeholder="e.g. What is the time complexity of binary search?"
              className="glass-input"
              required
            />
          </div>
          <fieldset>
            <legend className="mb-1.5 text-xs font-medium text-slate-300">
              Options (exactly 4 — mark the correct one below)
            </legend>
            <div className="space-y-2">
              {form.options.map((opt, i) => (
                <div key={i}>
                  <label htmlFor={`qf-opt-${i}`} className="sr-only">
                    Option {String.fromCharCode(65 + i)}
                  </label>
                  <input
                    id={`qf-opt-${i}`}
                    value={opt}
                    onChange={(e) => setOption(i, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    className="glass-input"
                    required
                  />
                </div>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="qf-answer" className="mb-1.5 block">
                Correct answer
              </label>
              <select
                id="qf-answer"
                value={form.correctAnswer}
                onChange={(e) =>
                  setForm((f) => ({ ...f, correctAnswer: Number(e.target.value) }))
                }
                className="glass-input"
              >
                {form.options.map((opt, i) => (
                  <option key={i} value={i}>
                    {String.fromCharCode(65 + i)} — {(opt || '').slice(0, 24) || `Option ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="qf-difficulty" className="mb-1.5 block">
                Difficulty
              </label>
              <select
                id="qf-difficulty"
                value={form.difficulty}
                onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
                className="glass-input"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="qf-type" className="mb-1.5 block">
                Type
              </label>
              <select
                id="qf-type"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="glass-input"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="qf-category" className="mb-1.5 block">
                Category
              </label>
              <input
                id="qf-category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                list="admin-category-list"
                placeholder="e.g. DSA (new names create categories)"
                className="glass-input"
                required
              />
              <datalist id="admin-category-list">
                {KNOWN_CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>
          <div>
            <label htmlFor="qf-expl" className="mb-1.5 block">
              Explanation (shown after answering)
            </label>
            <textarea
              id="qf-expl"
              value={form.explanation}
              onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
              rows={2}
              placeholder="Why is this the right answer?"
              className="glass-input"
            />
          </div>
          {formError && (
            <p role="alert" className="text-sm text-rose-300">
              {formError}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={saving}>
              {editing ? 'Save changes' : 'Add question'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete question?">
        <p className="text-sm text-slate-300">
          This soft-deletes the question (it is hidden from quizzes but kept in the
          database). This cannot be undone from the UI.
        </p>
        {deleteTarget && (
          <p className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-400">
            {deleteTarget.question}
          </p>
        )}
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setDeleteTarget(null)}>
            Keep it
          </Button>
          <Button variant="danger" className="flex-1" loading={deleting} onClick={confirmDelete}>
            Yes, delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
