import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import AuroraBackground from './AuroraBackground.jsx';
import GlassCard from './GlassCard.jsx';

// AuthShell — premium centered auth layout with ambient glow.
export default function AuthShell({ title, sub, error, children, footer, wide = false }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <AuroraBackground />
      <div className={`mx-auto flex w-full flex-1 flex-col justify-center px-4 py-10 ${wide ? 'max-w-lg' : 'max-w-md'}`}>
        <Link to="/" className="group mx-auto mb-6 flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-700 shadow-glow transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
            <GraduationCap size={22} className="text-white" />
          </span>
          <span className="font-display text-lg font-bold text-white">
            Placement<span className="text-gradient-brand">Prep</span>
          </span>
        </Link>
        <GlassCard glow className="page-enter p-6 sm:p-8">
          <h1 className="font-display text-2xl font-bold text-white">{title}</h1>
          <p className="mt-1 text-sm text-slate-400">{sub}</p>
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 animate-fade-in"
            >
              {error}
            </p>
          )}
          <div className="mt-5">{children}</div>
        </GlassCard>
        {footer && <p className="mt-5 text-center text-sm text-slate-400">{footer}</p>}
      </div>
    </div>
  );
}
