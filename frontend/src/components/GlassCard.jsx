import { cn } from '../utils/helpers.js';

export default function GlassCard({ children, className, hover = false, glow = false }) {
  return (
    <div
      className={cn(
        'glass-card p-5',
        hover && 'glass-card-hover',
        glow && 'ring-glow',
        className
      )}
    >
      {children}
    </div>
  );
}
