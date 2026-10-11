import { Loader2 } from 'lucide-react';
import { cn } from '../utils/helpers.js';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60';
  const sizes = {
    sm: 'rounded-lg px-3 py-1.5 text-xs',
    md: 'rounded-xl px-4 py-2.5 text-sm',
    lg: 'rounded-xl px-6 py-3 text-sm',
  };
  const styles = {
    primary: 'btn-primary',
    ghost: 'btn-ghost',
    danger:
      'rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-[0_8px_24px_-8px_rgba(244,63,94,0.7)] hover:brightness-110 active:scale-[0.98]',
  };
  return (
    <button
      className={cn(base, sizes[size] || sizes.md, styles[variant] || styles.primary, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}
