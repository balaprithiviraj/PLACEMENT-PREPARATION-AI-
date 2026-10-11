import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Menu, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar({ onMenuToggle }) {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-slate-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {token && onMenuToggle && (
            <button
              onClick={onMenuToggle}
              aria-label="Toggle menu"
              className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            >
              <Menu size={20} />
            </button>
          )}
          <Link to={token ? '/dashboard' : '/'} className="group flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-700 shadow-glow transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
              <GraduationCap size={20} className="text-white" />
            </span>
            <span className="font-display text-base font-bold text-white">
              Placement<span className="text-gradient-brand">Prep</span>
            </span>
          </Link>
        </div>

        {token ? (
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-3.5 text-sm text-slate-200 sm:flex">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-bold text-white">
                {(user?.name || user?.fullName || 'S').charAt(0).toUpperCase()}
              </span>
              {user?.name || user?.fullName || 'Student'}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition-all hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-200"
            >
              <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        ) : (
          <nav className="flex items-center gap-2" aria-label="Public navigation">
            <Link
              to="/login"
              className="rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="btn-primary px-4 py-2 text-sm"
            >
              Get Started
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
