import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ListChecks,
  Tags,
  BarChart3,
  ShieldCheck,
  Menu,
  X,
  LogOut,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { cn } from '../utils/helpers.js';
import AuroraBackground from './AuroraBackground.jsx';

const links = [
  { to: '/admin', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/students', label: 'Students', icon: Users },
  { to: '/admin/questions', label: 'Questions', icon: ListChecks },
  { to: '/admin/categories', label: 'Categories', icon: Tags },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen">
      <AuroraBackground />
      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle admin menu"
              className="rounded-lg p-2 text-slate-300 hover:bg-white/10 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <Link to="/admin" className="group flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-700 shadow-glow transition-transform duration-300 group-hover:scale-105">
                <ShieldCheck size={20} className="text-white" />
              </span>
              <span className="font-display text-base font-bold text-white">Admin Panel</span>
              <span className="rounded-md border border-primary-500/40 bg-primary-500/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-primary-300">
                ADMIN
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/dashboard"
              className="hidden items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10 sm:flex"
            >
              <GraduationCap size={16} /> Student view
            </Link>
            <span className="hidden text-sm text-slate-300 md:block">
              {user?.name || 'Admin'}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
            >
              <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl items-start">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        <aside
          aria-label="Admin sidebar"
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-64 transform border-r border-white/10 bg-slate-950/95 p-4 backdrop-blur-xl transition-transform lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <span className="text-sm font-semibold text-white">Admin menu</span>
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
              className="rounded-lg p-2 text-slate-300 hover:bg-white/10"
            >
              <X size={18} />
            </button>
          </div>
          <nav className="flex flex-col gap-1" aria-label="Admin sections">
            {links.map(({ to, end, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'nav-active-dot border border-indigo-500/30 bg-gradient-to-r from-indigo-500/25 to-violet-500/10 text-white shadow-[0_0_20px_-6px_rgba(99,102,241,0.6)]'
                      : 'border border-transparent text-slate-400 hover:border-white/5 hover:bg-white/5 hover:text-white'
                  )
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
          <p className="mt-6 rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-relaxed text-slate-400">
            Admin routes are wrapped in <span className="text-slate-200">ProtectedRoute adminOnly</span>.
            Student pages stay under <span className="text-slate-200">/dashboard</span>.
          </p>
        </aside>
        <main className="page-enter w-full min-w-0 flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
