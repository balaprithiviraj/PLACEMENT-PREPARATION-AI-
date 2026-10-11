import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../services/api.js';
import AuthShell from '../components/AuthShell.jsx';
import Button from '../components/Button.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function onChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      const nextUser = await login(form.email, form.password);
      const redirect = searchParams.get('redirect');
      const from = location.state?.from?.pathname || (redirect && redirect.startsWith('/') ? redirect : null);
      if (from && from !== '/login' && from !== '/register') {
        navigate(from, { replace: true });
      } else if (nextUser?.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed. Check your credentials.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      sub="Login to continue your preparation."
      error={error}
      footer={
        <>
          No account?{' '}
          <Link to="/register" className="font-semibold text-indigo-300 transition-colors hover:text-indigo-200">
            Register
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="email">Email</label>
          <div className="relative mt-1.5">
            <Mail
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 shrink-0 text-slate-500"
            />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className="glass-input pl-10"
              placeholder="you@college.edu"
              value={form.email}
              onChange={onChange}
              required
            />
          </div>
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <div className="relative mt-1.5">
            <Lock
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 shrink-0 text-slate-500"
            />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className="glass-input pl-10 pr-11"
              placeholder="••••••••"
              value={form.password}
              onChange={onChange}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>
        <Button type="submit" loading={loading} className="w-full py-3">
          Login
        </Button>
      </form>
    </AuthShell>
  );
}
