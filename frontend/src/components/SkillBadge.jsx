import { cn } from '../utils/helpers.js';

const variants = {
  high: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  medium: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  low: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  learning: 'bg-primary-500/15 text-primary-200 border-primary-500/30',
  'to learn': 'bg-primary-500/15 text-primary-200 border-primary-500/30',
  default: 'bg-primary-500/15 text-primary-200 border-primary-500/30',
};

export default function SkillBadge({ skill, level }) {
  const key = String(level || '').toLowerCase().trim();
  const style = variants[key] || variants.default;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
        style
      )}
    >
      {skill}
      {level && <span className="ml-1 opacity-70">· {level}</span>}
    </span>
  );
}
