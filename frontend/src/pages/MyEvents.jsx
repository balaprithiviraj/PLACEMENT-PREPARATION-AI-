import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  CalendarDays,
  Eye,
  MapPin,
  TicketCheck,
  Trash2,
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import Reveal from '../components/Reveal.jsx';
import GlassCard from '../components/GlassCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import Modal from '../components/Modal.jsx';
import { registrationsAPI, certificatesAPI, getErrorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate } from '../components/EventCard.jsx';

const normalizeList = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.registrations)) return d.registrations;
  if (Array.isArray(d?.certificates)) return d.certificates;
  if (Array.isArray(d?.data?.registrations)) return d.data.registrations;
  if (Array.isArray(d?.data?.certificates)) return d.data.certificates;
  return [];
};

const getRegEvent = (r) => {
  if (r?.event && typeof r.event === 'object') return r.event;
  if (r?.eventId && typeof r.eventId === 'object') return r.eventId;
  if (r?.eventDetails && typeof r.eventDetails === 'object') return r.eventDetails;
  return null;
};

const getEventStatus = (eventDate, rawStatus) => {
  if (rawStatus === 'Completed' || rawStatus === 'Cancelled') return rawStatus;
  if (!eventDate) return rawStatus || 'Registered';
  const t = new Date(eventDate).getTime();
  if (Number.isNaN(t)) return rawStatus || 'Registered';
  const now = Date.now();
  if (t < now - 24 * 60 * 60 * 1000) return 'Completed';
  if (t > now + 24 * 60 * 60 * 1000) return 'Upcoming';
  return rawStatus || 'Registered';
};

export default function MyEvents() {
  const { user, token, loading: authLoading } = useAuth();
  const isAuthenticated = Boolean(user || token);
  const navigate = useNavigate();
  const [regs, setRegs] = useState([]);
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCert, setSelectedCert] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login?redirect=/my-events');
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [r, c] = await Promise.allSettled([registrationsAPI.mine(), certificatesAPI.mine()]);
        if (cancelled) return;
        if (r.status === 'fulfilled') setRegs(normalizeList(r.value));
        if (c.status === 'fulfilled') setCerts(normalizeList(c.value));
        if (r.status === 'rejected' && c.status === 'rejected') {
          setError(getErrorMessage(r.reason, 'Unable to load your events.'));
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Unable to load your events.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, navigate]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    const regId = cancelTarget._id || cancelTarget.id;
    if (!regId) return;
    setCancelling(true);
    setActionError('');
    try {
      await registrationsAPI.remove(regId);
      setRegs((prev) => prev.filter((r) => String(r._id || r.id) !== String(regId)));
      setCancelTarget(null);
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not cancel registration.'));
    } finally {
      setCancelling(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="page-enter space-y-6">
        <PageHeader
          eyebrow="Community"
          title="My Events"
          sub="Events you have registered for, plus your certificates."
        />
        <LoadingState message="Loading your events..." />
      </div>
    );
  }

  if (error && regs.length === 0 && certs.length === 0) {
    return (
      <div className="page-enter">
        <EmptyState
          icon={AlertTriangle}
          title="Unable to load your events"
          message={error}
          actionLabel="Retry"
          onAction={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="page-enter space-y-10">
      <PageHeader
        eyebrow="Community"
        title="My Events"
        sub="Track registrations and view your certificates."
      />

      {/* Registrations */}
      <section>
        <Reveal>
          <h2 className="inline-flex items-center gap-2 text-lg font-bold text-white">
            <TicketCheck size={19} className="text-indigo-300" /> Registered Events ({regs.length})
          </h2>
        </Reveal>
        {regs.length === 0 ? (
          <Reveal delay={60}>
            <div className="mt-4">
              <EmptyState
                icon={TicketCheck}
                title="No registered events yet"
                message="You haven't registered for any events. Explore and grab your seat!"
                actionLabel="Explore Events"
                onAction={() => navigate('/events')}
              />
            </div>
          </Reveal>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {regs.map((r, i) => {
              const ev = getRegEvent(r) || r;
              const eventId =
                ev?._id || ev?.id || (typeof r.eventId === 'string' ? r.eventId : null);
              const title = ev?.title || ev?.name || r.eventTitle || 'Event';
              const date = ev?.date || ev?.startDate || r.eventDate || r.createdAt || r.registrationDate;
              const venue = ev?.venue || ev?.location || r.venue || 'Venue TBA';
              const status = getEventStatus(date, r.status);
              const regDate = r.createdAt || r.registrationDate || r.registeredAt;
              return (
                <Reveal key={r._id || r.id || i} delay={Math.min((i % 6) * 50, 300)}>
                  <GlassCard hover className="flex flex-col gap-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-1 text-[15px] font-bold text-white">{title}</h3>
                      <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-200">
                        {status}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                      <CalendarDays size={14} className="text-indigo-300" /> {formatDate(date)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                      <MapPin size={14} className="text-indigo-300" />{' '}
                      <span className="line-clamp-1">{venue}</span>
                    </span>
                    {regDate && (
                      <p className="text-[11px] font-medium text-slate-500">
                        Registered on {formatDate(regDate)}
                      </p>
                    )}
                    <div className="mt-1 flex gap-2">
                      <button
                        type="button"
                        className="btn-ghost flex-1 !py-2 text-[13px]"
                        onClick={() => eventId && navigate(`/events/${eventId}`)}
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[13px] font-semibold text-rose-200 transition-all hover:border-rose-500/50 hover:bg-rose-500/15"
                        onClick={() => {
                          setActionError('');
                          setCancelTarget(r);
                        }}
                      >
                        <Trash2 size={14} /> Cancel
                      </button>
                    </div>
                  </GlassCard>
                </Reveal>
              );
            })}
          </div>
        )}
      </section>

      {/* Certificates */}
      <section>
        <Reveal>
          <h2 className="inline-flex items-center gap-2 text-lg font-bold text-white">
            <Award size={19} className="text-amber-300" /> My Certificates ({certs.length})
          </h2>
        </Reveal>
        {certs.length === 0 ? (
          <Reveal delay={60}>
            <div className="mt-4">
              <EmptyState
                icon={Award}
                title="No certificates yet"
                message="Your certificates will appear here after you participate in events."
              />
            </div>
          </Reveal>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {certs.map((c, i) => {
              const title = c.eventTitle || c.event?.title || c.title || 'Certificate';
              const certType = c.type || c.certificateType || c.event?.category || 'Participation';
              const certStatus = c.status || 'Issued';
              return (
                <Reveal key={c._id || c.id || i} delay={Math.min((i % 6) * 50, 300)}>
                  <GlassCard hover className="flex flex-col items-center gap-2 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10 text-amber-300">
                      <Award size={26} />
                    </span>
                    <h3 className="line-clamp-1 text-sm font-bold text-white">{title}</h3>
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      <span className="rounded-full border border-indigo-500/30 bg-indigo-500/15 px-2.5 py-1 text-[11px] font-bold text-indigo-200">
                        {certType}
                      </span>
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-200">
                        {certStatus}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {c.issuedDate ? formatDate(c.issuedDate) : 'Issued on participation'}
                    </p>
                    <button
                      type="button"
                      className="btn-primary mt-1 w-full !py-2 text-[13px]"
                      onClick={() => setSelectedCert(c)}
                    >
                      <Eye size={15} /> View Certificate
                    </button>
                  </GlassCard>
                </Reveal>
              );
            })}
          </div>
        )}
      </section>

      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => !cancelling && setCancelTarget(null)}
        title="Cancel registration"
      >
        <p className="text-sm text-slate-400">
          Cancel your registration for{' '}
          <span className="font-bold text-white">
            {getRegEvent(cancelTarget)?.title || cancelTarget?.eventTitle || 'this event'}
          </span>
          ? This will free your seat and cannot be undone.
        </p>
        {actionError && (
          <p className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-[13px] font-medium text-rose-200">
            {actionError}
          </p>
        )}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="btn-ghost flex-1"
            onClick={() => setCancelTarget(null)}
            disabled={cancelling}
          >
            Keep seat
          </button>
          <button
            type="button"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={cancelling}
            onClick={handleCancel}
          >
            {cancelling ? 'Cancelling...' : 'Yes, cancel'}
          </button>
        </div>
      </Modal>

      <Modal open={Boolean(selectedCert)} onClose={() => setSelectedCert(null)} title="Certificate">
        {selectedCert && (
          <div className="rounded-2xl border-2 border-dashed border-indigo-500/30 bg-gradient-to-br from-indigo-500/15 to-transparent p-8 text-center">
            <Award size={44} className="mx-auto text-amber-300" />
            <p className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-400">
              Certificate of Participation
            </p>
            <h4 className="mt-2 text-xl font-extrabold text-white">
              {selectedCert.eventTitle || selectedCert.event?.title || selectedCert.title || 'Event'}
            </h4>
            <p className="mt-2 text-sm text-slate-400">
              Awarded to{' '}
              <span className="font-bold text-white">
                {selectedCert.studentName || selectedCert.name || 'Participant'}
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {selectedCert.certificateId ? `ID: ${selectedCert.certificateId}` : ''}
              {selectedCert.issuedDate ? ` • Issued ${formatDate(selectedCert.issuedDate)}` : ''}
            </p>
            {selectedCert.imageUrl || selectedCert.url ? (
              <img
                src={selectedCert.imageUrl || selectedCert.url}
                alt="Certificate"
                className="mx-auto mt-4 max-h-72 rounded-xl border border-white/10 object-contain"
              />
            ) : null}
          </div>
        )}
      </Modal>
    </div>
  );
}
