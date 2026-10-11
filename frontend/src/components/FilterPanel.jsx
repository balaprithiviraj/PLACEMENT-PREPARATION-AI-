import { SlidersHorizontal, RotateCcw } from 'lucide-react';

const CATEGORIES = [
  'All',
  'Symposium',
  'Workshop',
  'Hackathon',
  'Paper Presentation',
  'Project Expo',
  'Cultural',
  'Sports',
];

const TYPES = ['All', 'Upcoming', 'Past', 'Today', 'ThisWeek', 'ThisMonth', 'Featured'];

const SORTS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'recent', label: 'Recently Added' },
  { value: 'popular', label: 'Most Popular' },
];

const selectClass = 'glass-input [&>option]:bg-slate-900';

export default function FilterPanel({ filters = {}, onChange, colleges = [], onReset }) {
  const set = (key, value) => onChange?.({ ...filters, [key]: value });
  const typeValue = filters.type ?? filters.date ?? 'All';

  return (
    <div className="glass-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-white">
          <SlidersHorizontal size={16} className="text-indigo-300" /> Filters
        </span>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-indigo-200"
          >
            <RotateCcw size={13} /> Reset
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-400">Category</span>
          <select
            value={filters.category || 'All'}
            onChange={(e) => set('category', e.target.value)}
            className={selectClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? 'All categories' : c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-400">College</span>
          <select
            value={filters.college || 'All'}
            onChange={(e) => set('college', e.target.value)}
            className={selectClass}
          >
            <option value="All">All colleges</option>
            {colleges.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-400">Date / Type</span>
          <select value={typeValue} onChange={(e) => set('type', e.target.value)} className={selectClass}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t === 'All' ? 'All dates & types' : t === 'ThisWeek' ? 'This week' : t === 'ThisMonth' ? 'This month' : t}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-400">Sort by</span>
          <select
            value={filters.sort || 'upcoming'}
            onChange={(e) => set('sort', e.target.value)}
            className={selectClass}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
