import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  GitBranch,
  Briefcase,
  Calculator,
  Code2,
  CalendarDays,
  Wand2,
  Mic,
  TrendingUp,
  User,
  Settings,
  X,
} from 'lucide-react';
import { cn } from '../utils/helpers.js';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/resume', label: 'Resume Analyzer', icon: FileText },
  { to: '/skill-gap', label: 'Skill Gap', icon: GitBranch },
  { to: '/career-roles', label: 'Career Roles', icon: Briefcase },
  { to: '/events', label: 'Events', icon: CalendarDays },
  { to: '/resume-studio', label: 'Resume Studio', icon: Wand2 },
  { to: '/aptitude', label: 'Aptitude', icon: Calculator },
  { to: '/technical', label: 'Technical', icon: Code2 },
  { to: '/interview', label: 'Interview', icon: Mic },
  { to: '/progress', label: 'Progress', icon: TrendingUp },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 transform border-r border-white/10 bg-slate-950/90 p-4 backdrop-blur-xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Student sidebar"
      >
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <span className="text-sm font-semibold text-white">Menu</span>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-lg p-2 text-slate-300 hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex flex-col gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
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
      </aside>
    </>
  );
}
