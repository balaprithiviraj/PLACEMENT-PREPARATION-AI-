import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  Clock,
  Hourglass,
  ListChecks,
  MapPin,
  Share2,
  Users,
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import Reveal from '../components/Reveal.jsx';
import GlassCard from '../components/GlassCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import { eventsAPI, registrationsAPI, getErrorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate } from '../components/EventCard.jsx';

const normalizeOne = (res) => {
  const d = res?.data;
  return d?.event ?? d?.data?.event ?? d?.data ?? d?.eventDetails ?? d;
};

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const isAuthenticated = Boolean(user || token);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!message.text) return;
    const t = setTimeout(() => setMessage({ type: '', text: '' }), 3500);
    return () => clearTimeout(t);
  }, [message.text]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await eventsAPI.get(id);
        if (!cancelled) setEvent(normalizeOne(res));
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Unable to load event details.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Check existing registration via my registrations
  useEffect(() => {
    if (!isAuthenticated || !id) return;
    let cancelled = false;
    const check = async () => {
      try {
        const res = await registrationsAPI.mine();
        const d = res?.data;
        const list = Array.isArray(d) ? d : (d?.data ?? d?.registrations ?? d?.events ?? []);
        const found = (Array.isArray(list) ? list : []).some((r) => {
          const ev = r.event || (typeof r.eventId === 'object' ? r.eventId : null);
          const eid = ev?._id || ev?.id || (typeof r.eventId === 'string' ? r.eventId : r.eventId) || r.event;
          return String(eid) === String(id);
        });
        if (!cancelled && found) setRegistered(true);
      } catch {
        /* ignore — register button will surface duplicates as success */
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, id]);

  const handleRegister = async () => {
    setMessage({ type: '', text: '' });
    if (!isAuthenticated) {
      navigate(`/login?redirect=/events/${id}`);
      return;
    }
    if (registered) return;
    setRegistering(true);
    try {
      await eventsAPI.register(id);
      setRegistered(true);
      setEvent((prev) =>
        prev
          ? { ...prev, registeredCount: (prev.registeredCount ?? 0) + 1 }
          : prev
      );
      setMessage({ type: 'success', text: 'Successfully registered! Check My Events for details.' });
    } catch (err) {
      const msg = getErrorMessage(err, 'Registration failed. Please try again.');
      if (/already/i.test(msg)) {
        setRegistered(true);
        setMessage({ type: 'success', text: 'You are already registered for this event.' });
      } else {
        setMessage({ type: 'error', text: msg });
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMessage({ type: 'success', text: 'Event link copied to clipboard!' });
    } catch {
      setMessage({ type: 'error', text: 'Could not copy link.' });
    }
  };

  if (loading) return <LoadingState message="Loading event details..." />;

  if (error || !event) {
    return (
      <div className="page-enter">
        <EmptyState
          title="Unable to load event"
          message={error || 'This event may have been removed.'}
          actionLabel="Back to Events"
          onAction={() => navigate('/events')}
        />
      </div>
    );
  }

  const title = event.title || event.name || 'Untitled Event';
  const college = event.college || event.collegeName || event.organizer?.college || 'College Event';
  const organizer =
    (typeof event.organizer === 'string' ? event.organizer : null) ||
    event.organizerName ||
    event.organizer?.name ||
    event.organisedBy ||
    college;
  const venue = event.venue || event.location || 'Venue TBA';
  const date = event.date || event.startDate || event.eventDate;
  const time =
    event.time ||
    event.startTime ||
    (date
      ? new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : 'TBA');
  const deadline = event.registrationDeadline || event.deadline;
  const limit = event.participantLimit ?? event.maxParticipants ?? event.limit ?? 100;
  const count = event.registeredCount ?? event.registrations ?? event.participants ?? 0;
  const spotsLeft = event.spotsLeft ?? Math.max(limit - count, 0);
  const isFull = event.isFull ?? spotsLeft <= 0;
  const category = event.category || event.type || 'Symposium';
  const description = event.description || 'No description provided for this event yet.';
  const rawRules = event.rules || event.guidelines || [];
  const ruleList = Array.isArray(rawRules)
    ? rawRules
    : String(rawRules || '')
        .split('\n')
        .filter(Boolean);
  const image = event.image || event.banner || event.poster || '';
  const pct = limit > 0 ? Math.min(100, Math.round((count / limit) * 100)) : 0;

  const info = [
    { icon: CalendarDays, label: 'Date', value: formatDate(date) },
    { icon: Clock, label: 'Time', value: time },
    { icon: MapPin, label: 'Venue', value: venue },
    { icon: Building2, label: 'Organizer', value: organizer },
    { icon: Hourglass, label: 'Deadline', value: deadline ? formatDate(deadline) : 'Open' },
    { icon: Users, label: 'Participant Limit', value: String(limit) },
    { icon: BadgeCheck, label: 'Registered', value: `${count} participants` },
  ];

  return (
    <div className="page-enter space-y-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-indigo-200"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <Link to="/events" className="text-sm font-semibold text-indigo-300 hover:underline">
          Back to Events
        </Link>
      </div>

      <PageHeader eyebrow={category} title={title} sub={college} />

      <Reveal>
        <GlassCard className="!p-0 overflow-hidden">
          <div className="relative h-64 sm:h-80">
            {image ? (
              <img
                src={image}
                alt={title}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                aria-hidden="true"
                className="h-full w-full bg-gradient-to-br from-indigo-600/60 via-violet-600/40 to-cyan-500/30"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 flex flex-wrap items-end justify-between gap-3 p-5 sm:p-7">
              <div>
                <span className="rounded-full border border-indigo-400/30 bg-slate-950/70 px-3 py-1 text-[11px] font-bold text-indigo-200 backdrop-blur">
                  {category}
                </span>
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-medium text-slate-200">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays size={14} /> {formatDate(date)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={14} /> {venue}
                  </span>
                </p>
              </div>
              <button type="button" onClick={handleShare} className="btn-ghost !py-2 text-xs">
                <Share2 size={14} /> Share
              </button>
            </div>
          </div>

          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <h2 className="font-display text-lg font-bold text-white">About this event</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-400">
                {description}
              </p>

              <div className="mt-6">
                <h3 className="inline-flex items-center gap-2 text-base font-bold text-white">
                  <ListChecks size={18} className="text-indigo-300" /> Rules & Guidelines
                </h3>
                {ruleList.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-400">No specific rules listed for this event.</p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-2">
                    {ruleList.map((rule, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-slate-200"
                      >
                        <BadgeCheck size={16} className="mt-0.5 shrink-0 text-indigo-300" />
                        {typeof rule === 'string' ? rule : rule?.text || JSON.stringify(rule)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-6">
                <h3 className="text-base font-bold text-white">Event information</h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {info.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-500/25 bg-indigo-500/15 text-indigo-200">
                        <item.icon size={18} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {item.label}
                        </p>
                        <p className="truncate text-sm font-bold text-white">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sticky register card */}
            <div>
              <div className="glass-card ring-glow rounded-2xl p-5 lg:sticky lg:top-24">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">Registration</span>
                  <span className="rounded-full border border-indigo-500/30 bg-indigo-500/15 px-2.5 py-1 text-[11px] font-bold text-indigo-200">
                    {isFull ? 'Filling fast' : `${spotsLeft} seats left`}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="bar-fill h-full rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 text-xs font-medium text-slate-400">
                  {count} of {limit} participants registered
                </p>

                {message.text && (
                  <div
                    role="status"
                    className={`mt-4 flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-[13px] font-medium ${
                      message.type === 'success'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                        : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                    }`}
                  >
                    {message.type === 'success' ? (
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    )}
                    {message.text}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={registering || registered || isFull}
                  className="btn-primary mt-4 w-full"
                >
                  {registering
                    ? 'Registering...'
                    : registered
                      ? 'Registered ✓'
                      : isFull
                        ? 'Event Full'
                        : 'Register Now'}
                </button>
                {!isAuthenticated && (
                  <p className="mt-2.5 text-center text-xs text-slate-400">
                    <Link
                      to={`/login?redirect=/events/${id}`}
                      className="font-semibold text-indigo-300 hover:underline"
                    >
                      Log in
                    </Link>{' '}
                    to register for this event.
                  </p>
                )}
              </div>
            </div>
          </div>
        </GlassCard>
      </Reveal>
    </div>
  );
}
