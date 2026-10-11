import { useNavigate } from 'react-router-dom';
import { LogOut, User, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import GlassCard from '../components/GlassCard.jsx';
import Button from '../components/Button.jsx';
import PageHeader from '../components/PageHeader.jsx';

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        sub="Manage your account preferences."
      />

      <GlassCard>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/20 text-primary-300">
            <User size={20} />
          </span>
          <div>
            <p className="font-semibold text-white">{user?.name || user?.fullName || 'Student'}</p>
            <p className="text-sm text-slate-400">{user?.email || ''}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-sm text-slate-300">
          <p><span className="text-slate-500">Role:</span> {user?.role || 'student'}</p>
          <p><span className="text-slate-500">College:</span> {user?.college || '—'}</p>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-start gap-3">
          <Info size={18} className="mt-0.5 shrink-0 text-slate-400" />
          <div className="text-sm text-slate-400">
            <p className="font-semibold text-slate-200">Appearance</p>
            <p className="mt-1">Dark glass theme is enabled by default and optimized for focus. No extra setting needed.</p>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <p className="font-semibold text-white">Password change</p>
        <p className="mt-1 text-sm text-slate-400">
          Password change is not available yet (backend has no endpoint). Use “Forgot password” on the login page if needed.
        </p>
        <Button variant="ghost" disabled className="mt-3">
          Change password (coming soon)
        </Button>
      </GlassCard>

      <GlassCard className="border-rose-500/20">
        <p className="font-semibold text-rose-300">Danger zone</p>
        <p className="mt-1 text-sm text-slate-400">Log out of this device.</p>
        <Button variant="danger" onClick={handleLogout} className="mt-3">
          <LogOut size={16} /> Logout
        </Button>
      </GlassCard>
    </div>
  );
}
