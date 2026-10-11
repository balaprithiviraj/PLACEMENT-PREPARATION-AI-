import { Inbox } from 'lucide-react';
import Button from './Button.jsx';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  message = 'Get started to see data here.',
  actionLabel,
  onAction,
}) {
  return (
    <div className="glass-card flex flex-col items-center border-dashed p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/25 to-violet-500/10 text-indigo-300 shadow-glow">
        <Icon size={24} />
      </span>
      <h3 className="mt-3 text-base font-bold text-white">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-400">{message}</p>
      {actionLabel && (
        <Button className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
