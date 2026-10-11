import { Sparkles, Wrench, Code2, FileText, Lightbulb, Music, Trophy, LayoutGrid } from 'lucide-react';
import { cn } from '../utils/helpers.js';

export const CATEGORY_ICONS = {
  Symposium: Sparkles,
  Workshop: Wrench,
  Hackathon: Code2,
  'Paper Presentation': FileText,
  'Project Expo': Lightbulb,
  Cultural: Music,
  Sports: Trophy,
};

export function getCategoryIcon(name) {
  return CATEGORY_ICONS[name] || LayoutGrid;
}

export default function CategoryCard({ name, count = 0, icon: IconProp, onSelect, active = false }) {
  const Icon = IconProp || getCategoryIcon(name);
  return (
    <button
      type="button"
      onClick={() => onSelect?.(name)}
      aria-pressed={active}
      className={cn(
        'glass-card glass-card-hover flex flex-col items-center gap-2 p-4 text-center',
        active && 'ring-glow border-indigo-500/40'
      )}
    >
      <span
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-xl border',
          active
            ? 'border-indigo-500/40 bg-gradient-to-br from-indigo-500/30 to-violet-500/15 text-indigo-200'
            : 'border-white/10 bg-white/5 text-indigo-300'
        )}
      >
        <Icon size={22} />
      </span>
      <span className="text-sm font-bold text-white">{name}</span>
      <span className="text-xs font-medium text-slate-400">{count} events</span>
    </button>
  );
}
