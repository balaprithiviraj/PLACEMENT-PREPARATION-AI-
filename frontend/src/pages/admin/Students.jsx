import { useEffect, useState } from 'react';
import { Search, Eye, UserCheck, UserX, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../services/api.js';
import GlassCard from '../../components/GlassCard.jsx';
import Button from '../../components/Button.jsx';
import Modal from '../../components/Modal.jsx';
import LoadingState from '../../components/LoadingState.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { formatDate } from '../../utils/helpers.js';

const LIMIT = 10;

function StatusBadge({ active }) {
  const on = active !== false;
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        on
          ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
          : 'border-rose-500/30 bg-rose-500/15 text-rose-300'
      }`}
    >
      {on ? 'Active' : 'Inactive'}
    </span>
  );
}

export default function Students() {
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionId, setActionId] = useState(null);

  // Debounce search so we don't fire a request per keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setDebounced(search.trim());
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/users', {
          params: { search: debounced, page, limit: LIMIT },
        });
        const payload = res.data?.data ?? res.data ?? {};
        setStudents(payload.users || []);
        setTotal(payload.total ?? 0);
      } catch (err) {
        setError(err?.response?.data?.message || 'Could not load students.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [debounced, page]);

  async function viewStudent(id) {
    setModalOpen(true);
    setSelected(null);
    setDetailLoading(true);
    try {
      const res = await api.get(`/users/${id}`);
      setSelected(res.data?.user ?? res.data?.data ?? res.data ?? null);
    } catch {
      setSelected({ _loadError: true });
    } finally {
      setDetailLoading(false);
    }
  }

  async function toggleStatus(id) {
    setActionId(id);
    try {
      const res = await api.patch(`/users/${id}/status`);
      const nextActive = res.data?.isActive ?? res.data?.data?.isActive ?? res.data?.user?.isActive;
      if (typeof nextActive !== 'boolean') {
        setError('Could not update status: unexpected server response.');
        return;
      }
      setStudents((prev) =>
        prev.map((s) => (s._id === id ? { ...s, isActive: nextActive } : s))
      );
      setSelected((prev) =>
        prev && prev._id === id ? { ...prev, isActive: nextActive } : prev
      );
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not update status.');
    } finally {
      setActionId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Students</h1>
        <p className="text-sm text-slate-400">
          {total} registered {total === 1 ? 'student' : 'students'} · admin list via GET /users
        </p>
      </div>

      <GlassCard>
        <label htmlFor="student-search" className="mb-1.5 block">
          Search students
        </label>
        <div className="relative">
          <Search
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            id="student-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email or college..."
            className="glass-input pl-9"
          />
        </div>
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
        <LoadingState message="Loading students..." />
      ) : students.length === 0 ? (
        <EmptyState
          title="No students found"
          message={
            debounced
              ? `Nothing matches "${debounced}". Try a different search.`
              : 'No student accounts registered yet.'
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <GlassCard className="hidden overflow-x-auto p-0 md:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-400">
                  <th scope="col" className="px-4 py-3">Name</th>
                  <th scope="col" className="px-4 py-3">Email</th>
                  <th scope="col" className="px-4 py-3">College</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Joined</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {students.map((s) => (
                  <tr key={s._id} className="transition-colors hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-white">{s.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-300">{s.email || '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{s.college || '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge active={s.isActive} />
                    </td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(s.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => viewStudent(s._id)}
                          aria-label={`View ${s.name || 'student'}`}
                          title="View details"
                          className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-200 hover:bg-white/10"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => toggleStatus(s._id)}
                          disabled={actionId === s._id}
                          aria-label={`${s.isActive === false ? 'Activate' : 'Deactivate'} ${s.name || 'student'}`}
                          title={s.isActive === false ? 'Activate' : 'Deactivate'}
                          className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-200 hover:bg-white/10 disabled:opacity-50"
                        >
                          {s.isActive === false ? <UserCheck size={15} /> : <UserX size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {students.map((s) => (
              <GlassCard key={s._id} className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-white">{s.name || '—'}</p>
                    <p className="text-xs text-slate-400">{s.email || '—'}</p>
                  </div>
                  <StatusBadge active={s.isActive} />
                </div>
                <p className="text-xs text-slate-500">
                  {s.college || 'No college'} · Joined {formatDate(s.createdAt)}
                </p>
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="ghost"
                    className="flex-1 px-3 py-2 text-xs"
                    onClick={() => viewStudent(s._id)}
                  >
                    <Eye size={14} /> View
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1 px-3 py-2 text-xs"
                    loading={actionId === s._id}
                    onClick={() => toggleStatus(s._id)}
                  >
                    {s.isActive === false ? <UserCheck size={14} /> : <UserX size={14} />}
                    {s.isActive === false ? 'Activate' : 'Deactivate'}
                  </Button>
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Pagination */}
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

      {/* Detail modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelected(null);
        }}
        title="Student details"
      >
        {detailLoading ? (
          <LoadingState message="Loading profile..." />
        ) : !selected || selected._loadError ? (
          <p className="text-sm text-slate-400">Could not load this profile.</p>
        ) : (
          <dl className="space-y-2.5 text-sm">
            {[
              ['Name', selected.name],
              ['Email', selected.email],
              ['Role', selected.role],
              ['College', selected.college],
              ['Degree', selected.degree],
              ['Department', selected.department],
              ['Year', selected.year],
              ['Phone', selected.phone],
              ['Career goal', selected.careerGoal],
              ['Joined', formatDate(selected.createdAt)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-slate-400">{label}</dt>
                <dd className="text-right text-slate-100">{value || '—'}</dd>
              </div>
            ))}
            {selected.bio && (
              <div>
                <dt className="text-slate-400">Bio</dt>
                <dd className="mt-0.5 text-slate-200">{selected.bio}</dd>
              </div>
            )}
            {Array.isArray(selected.skills) && selected.skills.length > 0 && (
              <div>
                <dt className="text-slate-400">Skills</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {selected.skills.map((sk) => (
                    <span
                      key={sk}
                      className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-200"
                    >
                      {sk}
                    </span>
                  ))}
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between pt-1">
              <dt className="text-slate-400">Status</dt>
              <dd>
                <StatusBadge active={selected.isActive} />
              </dd>
            </div>
            <Button
              variant={selected.isActive === false ? 'primary' : 'danger'}
              className="mt-2 w-full"
              loading={actionId === selected._id}
              onClick={() => toggleStatus(selected._id)}
            >
              {selected.isActive === false ? 'Activate account' : 'Deactivate account'}
            </Button>
          </dl>
        )}
      </Modal>
    </div>
  );
}
