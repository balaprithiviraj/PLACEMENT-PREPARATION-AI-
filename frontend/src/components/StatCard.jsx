import GlassCard from './GlassCard.jsx';
import { cn } from '../utils/helpers.js';

const accents = {
  indigo: 'from-indigo-500/30 to-violet-500/10 text-indigo-300',
  emerald: 'from-emerald-500/30 to-teal-500/10 text-emerald-300',
  amber: 'from-amber-500/30 to-orange-500/10 text-amber-300',
  rose: 'from-rose-500/30 to-pink-500/10 text-rose-300',
  cyan: 'from-cyan-500/30 to-sky-500/10 text-cyan-300',
};

export default function StatCard({ icon: Icon, label, value, sub, accent = 'indigo' }) {
  return (
    <GlassCard hover className="p-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <span
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br shadow-lg',
              accents[accent] || accents.indigo
            )}
          >
            <Icon size={10} />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="font-display truncate text-xl font-bold text-white">{value ?? '—'}</p>
          {sub && <p className="truncate text-xs text-slate-500">{sub}</p>}
        </div>
      </div>
    </GlassCard>
  );
}
