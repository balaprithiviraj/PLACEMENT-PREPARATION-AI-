import { useEffect, useState } from 'react';
import { userAPI } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import GlassCard from '../components/GlassCard.jsx';
import Button from '../components/Button.jsx';
import LoadingState from '../components/LoadingState.jsx';
import PageHeader from '../components/PageHeader.jsx';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    name: '',
    college: '',
    degree: '',
    department: '',
    year: '',
    phone: '',
    bio: '',
    skills: '',
    careerGoal: '',
  });
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    async function load() {
      try {
        const res = await userAPI.getProfile();
        const p = res.data?.user || res.data?.data || res.data || {};
        fill(p);
      } catch {
        // Fall back to auth user if profile fetch fails
        if (user) fill(user);
      } finally {
        setLoading(false);
      }
    }
    function fill(p) {
      setForm({
        name: p.name || p.fullName || '',
        college: p.college || '',
        degree: p.degree || '',
        department: p.department || '',
        year: p.year || '',
        phone: p.phone || '',
        bio: p.bio || '',
        skills: Array.isArray(p.skills) ? p.skills.join(', ') : p.skills || '',
        careerGoal: p.careerGoal || '',
      });
      setEmail(p.email || '');
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    setSaving(true);
    try {
      const payload = {
        ...form,
        skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
      };
      const res = await userAPI.updateProfile(payload);
      const updated = res.data?.user || res.data?.data || payload;
      updateUser({ ...user, ...updated });
      setMsg({ type: 'ok', text: 'Profile saved successfully.' });
    } catch (err) {
      setMsg({ type: 'err', text: err?.response?.data?.message || 'Could not save profile.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState message="Loading profile..." />;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Profile"
        title="Profile"
        sub="Keep your details updated for better role matches."
      />

      <GlassCard className="mt-4">
        {msg.text && (
          <p
            role="alert"
            className={`mb-4 rounded-xl border p-3 text-sm ${
              msg.type === 'ok'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
            }`}
          >
            {msg.text}
          </p>
        )}
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="email">Email (read-only)</label>
            <input id="email" className="glass-input mt-1 opacity-60" value={email} readOnly disabled />
          </div>
          <div>
            <label htmlFor="name">Full name</label>
            <input id="name" name="name" className="glass-input mt-1" value={form.name} onChange={onChange} />
          </div>
          <div>
            <label htmlFor="phone">Phone</label>
            <input id="phone" name="phone" className="glass-input mt-1" value={form.phone} onChange={onChange} />
          </div>
          <div>
            <label htmlFor="college">College</label>
            <input id="college" name="college" className="glass-input mt-1" value={form.college} onChange={onChange} />
          </div>
          <div>
            <label htmlFor="degree">Degree</label>
            <input id="degree" name="degree" className="glass-input mt-1" value={form.degree} onChange={onChange} />
          </div>
          <div>
            <label htmlFor="department">Department</label>
            <input id="department" name="department" className="glass-input mt-1" value={form.department} onChange={onChange} />
          </div>
          <div>
            <label htmlFor="year">Year</label>
            <input id="year" name="year" className="glass-input mt-1" value={form.year} onChange={onChange} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="skills">Skills (comma separated)</label>
            <input id="skills" name="skills" placeholder="JavaScript, Python, SQL" className="glass-input mt-1" value={form.skills} onChange={onChange} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="careerGoal">Career goal</label>
            <input id="careerGoal" name="careerGoal" placeholder="Full-stack developer" className="glass-input mt-1" value={form.careerGoal} onChange={onChange} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="bio">Bio</label>
            <textarea id="bio" name="bio" rows="3" className="glass-input mt-1" value={form.bio} onChange={onChange} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" loading={saving} className="w-full sm:w-auto">
              Save changes
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
