import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users } from 'lucide-react';
import { cn } from '../utils/helpers.js';

export function formatDate(value) {
  if (!value) return 'TBA';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function EventCard({ event }) {
  if (!event) return null;
  const id = event._id || event.id;
  const title = event.title || event.name || 'Untitled Event';
  const college = event.college || event.collegeName || event.organizer?.college || 'College Event';
  const venue = event.venue || event.location || 'Venue TBA';
  const date = event.date || event.startDate || event.eventDate;
  const category = event.category || event.type || 'Symposium';
  const image = event.image || event.banner || event.poster || '';
  const registered = event.registeredCount ?? event.registrations ?? event.participants ?? 0;
  const limit = event.participantLimit ?? event.maxParticipants ?? event.limit ?? 100;
  const pct = limit > 0 ? Math.min(100, Math.round((registered / limit) * 100)) : 0;
  const spotsLeft =
    event.spotsLeft ?? (typeof limit === 'number' ? Math.max(limit - registered, 0) : null);
  const isFull = event.isFull ?? (spotsLeft !== null ? spotsLeft <= 0 : false);
  const featured = event.featured || event.isFeatured || event.type === 'featured';

  return (
    <Link
      to={`/events/${id}`}
      className="glass-card glass-card-hover group flex flex-col overflow-hidden"
    >
      <div className="relative h-44 overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={title}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            aria-hidden="true"
            className="h-full w-full bg-gradient-to-br from-indigo-600/60 via-violet-600/40 to-cyan-500/30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 rounded-full border border-indigo-400/30 bg-slate-950/70 px-3 py-1 text-[11px] font-bold text-indigo-200 backdrop-blur">
          {category}
        </span>
        {featured && (
          <span className="absolute right-3 top-3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-1 text-[11px] font-bold text-white">
            Featured
          </span>
        )}
        <span
          className={cn(
            'absolute bottom-3 right-3 rounded-full border px-2.5 py-1 text-[11px] font-bold backdrop-blur',
            isFull
              ? 'border-rose-500/40 bg-rose-500/20 text-rose-200'
              : 'border-emerald-500/40 bg-emerald-500/20 text-emerald-200'
          )}
        >
          {isFull ? 'Full' : spotsLeft !== null ? `${spotsLeft} spots left` : `${pct}% full`}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-display line-clamp-1 text-[15px] font-bold text-white transition-colors group-hover:text-indigo-200">
          {title}
        </h3>
        <p className="line-clamp-1 text-xs font-medium text-slate-400">{college}</p>

        <div className="mt-1 flex flex-col gap-1.5 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={14} className="shrink-0 text-indigo-300" /> {formatDate(date)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={14} className="shrink-0 text-indigo-300" />{' '}
            <span className="line-clamp-1">{venue}</span>
          </span>
        </div>

        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Users size={13} /> {registered}/{limit}
            </span>
            <span>{pct}% full</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="bar-fill h-full rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </Link>
  );
}
