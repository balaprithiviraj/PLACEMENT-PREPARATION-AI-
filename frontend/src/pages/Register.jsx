import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../services/api.js';
import AuthShell from '../components/AuthShell.jsx';
import Button from '../components/Button.jsx';

const initial = {
  name: '',
  email: '',
  password: '',
  college: '',
  degree: '',
  department: '',
  year: '',
  phone: '',
};

const fields = [
  { name: 'name', label: 'Full name', span: false, props: { required: true, autoComplete: 'name' } },
  { name: 'email', label: 'Email', span: false, props: { type: 'email', required: true, autoComplete: 'email' } },
  { name: 'password', label: 'Password', span: true, props: { type: 'password', required: true, autoComplete: 'new-password' } },
  { name: 'college', label: 'College *', span: false, props: { required: true } },
  { name: 'phone', label: 'Phone', span: false, props: { autoComplete: 'tel' } },
  { name: 'degree', label: 'Degree', span: false, props: { placeholder: 'B.E / B.Tech' } },
  { name: 'department', label: 'Department', span: false, props: { placeholder: 'CSE' } },
  { name: 'year', label: 'Year', span: true, props: { placeholder: '3rd Year' } },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function onChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name || !form.email || !form.password || !form.college.trim()) {
      setError('Name, email, password and college are required.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const payload = { ...form };
      await register(payload);
      navigate('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed. Try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      wide
      title="Create account"
      sub="Start your placement journey in minutes."
      error={error}
      footer={
        <>
          Have an account?{' '}
          <Link to="/login" className="font-semibold text-indigo-300 transition-colors hover:text-indigo-200">
            Login
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        {fields.map(({ name, label, span, props }) => {
          // Email + password get left icons (fixed placement) and password gets show/hide toggle
          if (name === 'email') {
            return (
              <div key={name} className={span ? 'sm:col-span-2' : ''}>
                <label htmlFor={name}>{label}</label>
                <div className="relative mt-1.5">
                  <Mail
                    size={16}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 shrink-0 text-slate-500"
                  />
                  <input
                    id={name}
                    name={name}
                    className="glass-input pl-10"
                    value={form[name]}
                    onChange={onChange}
                    {...props}
                  />
                </div>
              </div>
            );
          }
          if (name === 'password') {
            return (
              <div key={name} className={span ? 'sm:col-span-2' : ''}>
                <label htmlFor={name}>{label}</label>
                <div className="relative mt-1.5">
                  <Lock
                    size={16}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 shrink-0 text-slate-500"
                  />
                  <input
                    id={name}
                    name={name}
                    {...props}
                    type={showPassword ? 'text' : 'password'}
                    className="glass-input pl-10 pr-11"
                    value={form[name]}
                    onChange={onChange}
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
            );
          }
          return (
            <div key={name} className={span ? 'sm:col-span-2' : ''}>
              <label htmlFor={name}>{label}</label>
              <input
                id={name}
                name={name}
                className="glass-input mt-1.5"
                value={form[name]}
                onChange={onChange}
                {...props}
              />
            </div>
          );
        })}
        <div className="sm:col-span-2">
          <Button type="submit" loading={loading} className="w-full py-3">
            Register
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}
