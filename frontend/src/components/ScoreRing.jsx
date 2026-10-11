import { scoreColor } from '../utils/helpers.js';

export default function ScoreRing({ score = 0, size = 120 }) {
  const s = Math.min(100, Math.max(0, Number(score) || 0));
  const r = 48;
  const circle = 2 * Math.PI * r;
  const offset = circle - (s / 100) * circle;
  const gradId = `score-grad-${size}-${s}`;

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Score ${s} out of 100`}
    >
      <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-xl" aria-hidden="true" />
      <svg width={size} height={size} viewBox="0 0 120 120" className="relative">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="60%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
        <circle
          cx="60"
          cy="60"
          r={r}
          stroke={`url(#${gradId})`}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circle}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1)', filter: 'drop-shadow(0 0 6px rgba(99,102,241,0.7))' }}
        />
      </svg>
      <div className="absolute text-center">
        <span className={`font-display text-2xl font-extrabold ${scoreColor(s)}`}>{s}</span>
        <span className="block text-[11px] font-medium text-slate-500">/ 100</span>
      </div>
    </div>
  );
}
