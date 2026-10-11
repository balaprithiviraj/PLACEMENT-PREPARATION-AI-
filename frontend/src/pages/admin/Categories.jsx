import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Tags, Plus, ArrowRight, Info } from 'lucide-react';
import api from '../../services/api.js';
import GlassCard from '../../components/GlassCard.jsx';
import Button from '../../components/Button.jsx';
import LoadingState from '../../components/LoadingState.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { difficultyColor, cn } from '../../utils/helpers.js';

// Static list mirrors backend/seed/seed.js categories (the source of truth).
// Live counts come from GET /questions; there is intentionally no separate
// category endpoint — categories are derived from the bank itself.
const KNOWN_CATEGORIES = [
  { name: 'Quantitative Aptitude', type: 'aptitude' },
  { name: 'Logical Reasoning', type: 'aptitude' },
  { name: 'Verbal Ability', type: 'aptitude' },
  { name: 'Data Interpretation', type: 'aptitude' },
  { name: 'Programming', type: 'technical' },
  { name: 'DSA', type: 'technical' },
  { name: 'DBMS', type: 'technical' },
  { name: 'OS', type: 'technical' },
  { name: 'CN', type: 'technical' },
  { name: 'OOP', type: 'technical' },
  { name: 'Web Dev', type: 'technical' },
  { name: 'HR', type: 'hr' },
  { name: 'Projects', type: 'interview' },
];

function emptyBucket() {
  return { total: 0, Easy: 0, Medium: 0, Hard: 0 };
}

export default function Categories() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({});
  const [extras, setExtras] = useState([]);
  const [grandTotal, setGrandTotal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        // One large page is enough for a seed-size bank; paginate if it grows.
        const res = await api.get('/questions', { params: { limit: 500 } });
        const list = res.data?.questions || [];
        const buckets = {};
        for (const q of list) {
          const name = q.category || 'General';
          buckets[name] = buckets[name] || emptyBucket();
          buckets[name].total += 1;
          if (buckets[name][q.difficulty] !== undefined) buckets[name][q.difficulty] += 1;
        }
        setCounts(buckets);
        setExtras(
          Object.keys(buckets).filter(
            (name) => !KNOWN_CATEGORIES.some((k) => k.name === name)
          )
        );
        setGrandTotal(res.data?.total ?? list.length);
      } catch (err) {
        setError(err?.response?.data?.message || 'Could not load categories.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const cards = [
    ...KNOWN_CATEGORIES,
    ...extras.map((name) => ({ name, type: 'custom' })),
  ];

  if (loading) return <LoadingState message="Loading categories..." />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Categories</h1>
          <p className="text-sm text-slate-400">
            {grandTotal != null ? `${grandTotal} active questions` : 'Question bank'} grouped by
            category
          </p>
        </div>
        <Link to="/admin/questions">
          <Button>
            <Plus size={16} /> Add question
          </Button>
        </Link>
      </div>

      <GlassCard className="flex gap-3 border-primary-500/20">
        <Info size={18} className="mt-0.5 shrink-0 text-primary-300" />
        <p className="text-sm text-slate-300">
          Categories are managed through questions — there is no separate category
          endpoint. To create a new category, add a question with a new category name;
          to rename one, edit its questions. Custom categories appear below
          automatically once used.
        </p>
      </GlassCard>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300"
        >
          {error} Showing the known category list without live counts.
        </p>
      )}

      {cards.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No categories yet"
          message="Add questions to the bank and categories will appear here."
          actionLabel="Go to Questions"
          onAction={() => navigate('/admin/questions')}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Category cards">
          {cards.map(({ name, type }) => {
            const b = counts[name] || emptyBucket();
            return (
              <li key={name}>
                <GlassCard hover className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-bold text-white">{name}</h2>
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-slate-400">
                      {type}
                    </span>
                  </div>
                  <p className="mt-1 text-3xl font-extrabold text-white">
                    {error && !counts[name] ? '—' : b.total}
                    <span className="ml-1 text-xs font-normal text-slate-500">
                      {b.total === 1 ? 'question' : 'questions'}
                    </span>
                  </p>
                  <div className="mt-3 flex gap-1.5 text-[11px] font-semibold">
                    {['Easy', 'Medium', 'Hard'].map((level) => (
                      <span
                        key={level}
                        className={cn(
                          'rounded-full border px-2 py-0.5',
                          difficultyColor(level)
                        )}
                      >
                        {level}: {b[level]}
                      </span>
                    ))}
                  </div>
                  <Link
                    to={`/admin/questions?category=${encodeURIComponent(name)}`}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-300 hover:text-primary-200"
                  >
                    Manage questions <ArrowRight size={15} />
                  </Link>
                </GlassCard>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
