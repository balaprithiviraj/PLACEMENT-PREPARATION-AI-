import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CalendarDays, TicketCheck } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import Reveal from '../components/Reveal.jsx';
import GlassCard from '../components/GlassCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { SkeletonLoader } from '../components/LoadingState.jsx';
import SearchBar from '../components/SearchBar.jsx';
import FilterPanel from '../components/FilterPanel.jsx';
import EventCard from '../components/EventCard.jsx';
import CategoryCard from '../components/CategoryCard.jsx';
import { eventsAPI, getErrorMessage } from '../services/api.js';

const PAGE_SIZE = 9;
const DEFAULT_CATEGORIES = [
  'Symposium',
  'Workshop',
  'Hackathon',
  'Paper Presentation',
  'Project Expo',
  'Cultural',
  'Sports',
];

const normalizeList = (res) => {
  const d = res?.data;
  const list = Array.isArray(d)
    ? d
    : Array.isArray(d?.data)
      ? d.data
      : Array.isArray(d?.events)
        ? d.events
        : Array.isArray(d?.data?.events)
          ? d.data.events
          : Array.isArray(d?.results)
            ? d.results
            : [];
  const total = d?.pagination?.total ?? d?.total ?? d?.data?.total ?? list.length;
  return { list, total };
};

const normalizeCategories = (res, events) => {
  const d = res?.data;
  const raw = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [];
  const counts = {};
  events.forEach((e) => {
    const c = e.category || e.type;
    if (c && c !== 'featured' && c !== 'upcoming' && c !== 'past') counts[c] = (counts[c] || 0) + 1;
  });
  if (raw.length > 0) {
    return raw.map((c) => {
      const name = typeof c === 'string' ? c : c?.name || c?.category || String(c);
      const count = typeof c === 'object' && c?.count != null ? c.count : (counts[name] ?? 0);
      return { name, count };
    });
  }
  const names = new Set([...DEFAULT_CATEGORIES, ...Object.keys(counts)]);
  return [...names].map((name) => ({ name, count: counts[name] ?? 0 }));
};

const getDateValue = (e) => {
  const v = e.date || e.startDate || e.eventDate || e.createdAt;
  const t = v ? new Date(v).getTime() : 0;
  return Number.isNaN(t) ? 0 : t;
};

const getPopularity = (e) => e.registeredCount ?? e.registrations ?? e.participants ?? 0;

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const matchesDateType = (e, type) => {
  if (!type || type === 'All') return true;
  const raw = e.date || e.startDate || e.eventDate;
  const d = raw ? new Date(raw) : null;
  const valid = d && !Number.isNaN(d.getTime());
  const today = startOfDay(new Date());
  if (!valid) return type === 'All' || type === 'Upcoming';
  const day = startOfDay(d);
  if (type === 'Upcoming') return day >= today;
  if (type === 'Past') return day < today;
  if (type === 'Today') return day.getTime() === today.getTime();
  if (type === 'ThisWeek') {
    const diff = (day - today) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff < 7;
  }
  if (type === 'ThisMonth') {
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  if (type === 'Featured') return Boolean(e.featured || e.isFeatured || e.type === 'featured');
  return true;
};

const DEFAULT_FILTERS = { category: 'All', college: 'All', type: 'All', sort: 'upcoming' };

export default function Events() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [filters, setFilters] = useState({
    ...DEFAULT_FILTERS,
    category: searchParams.get('category') || 'All',
  });
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sync URL params (?q= & ?category=) into state
  useEffect(() => {
    setSearch(searchParams.get('q') || '');
    const cat = searchParams.get('category');
    if (cat) setFilters((f) => (f.category === cat ? f : { ...f, category: cat }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const params = { limit: 100 };
        if (filters.category && filters.category !== 'All') params.category = filters.category;
        if (filters.type && ['featured', 'upcoming', 'past'].includes(filters.type.toLowerCase())) {
          params.type = filters.type.toLowerCase();
        }
        if (filters.sort) params.sort = filters.sort;
        const [evRes, catRes] = await Promise.allSettled([
          eventsAPI.list(params),
          eventsAPI.categories(),
        ]);
        if (cancelled) return;
        if (evRes.status === 'fulfilled') {
          const { list, total: t } = normalizeList(evRes.value);
          setEvents(list);
          setTotal(t);
          setVisible(PAGE_SIZE);
          if (catRes.status === 'fulfilled') {
            setCategories(normalizeCategories(catRes.value, list));
          } else {
            setCategories(normalizeCategories(null, list));
          }
        } else {
          throw evRes.reason;
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Unable to load events.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [filters.category, filters.type, filters.sort]);

  const colleges = useMemo(() => {
    const set = new Set();
    events.forEach((e) => {
      const c = e.college || e.collegeName || e.organizer?.college;
      if (c) set.add(c);
    });
    return [...set].sort();
  }, [events]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...events];
    if (q) {
      list = list.filter((e) =>
        [e.title, e.name, e.college, e.collegeName, e.category, e.type, e.venue, e.location, e.description]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    }
    if (filters.college && filters.college !== 'All') {
      list = list.filter(
        (e) => (e.college || e.collegeName || e.organizer?.college) === filters.college
      );
    }
    if (filters.type && filters.type !== 'All') {
      list = list.filter((e) => matchesDateType(e, filters.type));
    }
    if (filters.sort === 'recent') {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (filters.sort === 'popular') {
      list.sort((a, b) => getPopularity(b) - getPopularity(a));
    } else {
      list.sort((a, b) => getDateValue(a) - getDateValue(b));
    }
    return list;
  }, [events, search, filters.college, filters.type, filters.sort]);

  const shown = filtered.slice(0, visible);

  const syncParams = (q, category) => {
    const next = {};
    if (q?.trim()) next.q = q.trim();
    if (category && category !== 'All') next.category = category;
    setSearchParams(next);
  };

  const submitSearch = (q) => syncParams(q, filters.category);

  const handleFilterChange = (f) => {
    setFilters(f);
    const next = Object.fromEntries(searchParams.entries());
    if (search) next.q = search.trim();
    if (f.category && f.category !== 'All') next.category = f.category;
    else delete next.category;
    setSearchParams(next);
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setSearch('');
    setSearchParams({});
  };

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        eyebrow="Community"
        title="College Events"
        sub="Discover symposiums, workshops, hackathons and fests across colleges."
        action={
          <Link to="/my-events" className="btn-ghost">
            <TicketCheck size={16} /> My Events
          </Link>
        }
      />

      <Reveal>
        <SearchBar
          value={search}
          onChange={setSearch}
          onSubmit={submitSearch}
          className="mx-auto max-w-2xl"
        />
      </Reveal>

      <Reveal delay={60}>
        <FilterPanel
          filters={filters}
          colleges={colleges}
          onChange={handleFilterChange}
          onReset={handleReset}
        />
      </Reveal>

      {/* Category cards row */}
      <Reveal delay={100}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {categories.map((c) => (
            <CategoryCard
              key={c.name}
              name={c.name}
              count={c.count}
              active={filters.category === c.name}
              onSelect={(name) =>
                handleFilterChange({
                  ...filters,
                  category: filters.category === name ? 'All' : name,
                })
              }
            />
          ))}
        </div>
      </Reveal>

      <div>
        {loading ? (
          <SkeletonLoader />
        ) : error ? (
          <EmptyState
            icon={AlertTriangle}
            title="Unable to load events"
            message={error}
            actionLabel="Retry"
            onAction={() => window.location.reload()}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No events found"
            message="Try adjusting your search or filters."
            actionLabel="Clear filters"
            onAction={handleReset}
          />
        ) : (
          <>
            <p className="mb-4 text-sm font-medium text-slate-400">
              Showing <span className="font-bold text-white">{shown.length}</span> of{' '}
              <span className="font-bold text-white">{filtered.length}</span> events
              {total > filtered.length ? ` (${total} total)` : ''}
            </p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((e, i) => (
                <Reveal key={e._id || e.id || i} delay={Math.min((i % PAGE_SIZE) * 40, 320)}>
                  <EventCard event={e} />
                </Reveal>
              ))}
            </div>
            {visible < filtered.length && (
              <div className="mt-8 text-center">
                <Reveal>
                  <GlassCard className="inline-block !p-3">
                    <button
                      type="button"
                      onClick={() => setVisible((v) => v + PAGE_SIZE)}
                      className="btn-ghost"
                    >
                      Load more ({filtered.length - visible} remaining)
                    </button>
                  </GlassCard>
                </Reveal>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
