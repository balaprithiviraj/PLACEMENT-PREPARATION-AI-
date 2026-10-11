export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function formatTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

// Tailwind text color for a 0-100 score
export function scoreColor(score) {
  const s = Number(score) || 0;
  if (s >= 75) return 'text-emerald-400';
  if (s >= 50) return 'text-amber-400';
  return 'text-rose-400';
}

export function difficultyColor(level) {
  const l = String(level || '').toLowerCase();
  if (l === 'easy') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  if (l === 'medium') return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  if (l === 'hard') return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
}
