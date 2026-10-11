import { Link } from 'react-router-dom';
import {
  FileSearch,
  Target,
  Briefcase,
  Brain,
  Code2,
  Mic,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Star,
} from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import GlassCard from '../components/GlassCard.jsx';
import AuroraBackground from '../components/AuroraBackground.jsx';
import Reveal from '../components/Reveal.jsx';

const features = [
  { icon: FileSearch, title: 'Resume Analyzer', text: 'Upload your resume and get an ATS-style score with missing skills.', accent: 'indigo' },
  { icon: Target, title: 'Skill Gap Finder', text: 'Compare your skills with your target role and close the gap.', accent: 'emerald' },
  { icon: Briefcase, title: 'Career Roles', text: 'Explore roles matched to your profile and skills.', accent: 'amber' },
  { icon: Brain, title: 'Aptitude Practice', text: 'Timed aptitude sets with instant evaluation.', accent: 'rose' },
  { icon: Code2, title: 'Technical Practice', text: 'CS fundamentals, DSA and core subjects question bank.', accent: 'cyan' },
  { icon: Mic, title: 'Mock Interviews', text: 'Practice HR + technical interviews with feedback.', accent: 'indigo' },
];

const accentTile = {
  indigo: 'from-indigo-500/30 to-violet-500/10 text-indigo-300',
  emerald: 'from-emerald-500/30 to-teal-500/10 text-emerald-300',
  amber: 'from-amber-500/30 to-orange-500/10 text-amber-300',
  rose: 'from-rose-500/30 to-pink-500/10 text-rose-300',
  cyan: 'from-cyan-500/30 to-sky-500/10 text-cyan-300',
};

const steps = [
  'Create your account and complete your profile',
  'Upload your resume for analysis',
  'Find skill gaps for your target role',
  'Practice aptitude, technical and quiz modules',
  'Track progress and attend mock interviews',
];

const stats = [
  { value: '80+', label: 'Curated questions' },
  { value: 'ATS', label: 'Style resume scoring' },
  { value: 'AI', label: 'Mock interview feedback' },
  { value: '360°', label: 'Progress tracking' },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <AuroraBackground />
      <Navbar />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-16 text-center sm:pt-24">
        <div className="animate-fade-up">
          <span className="eyebrow">
            <Sparkles size={13} /> AI-powered placement prep
          </span>
        </div>
        <h1
          className="font-display mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-[1.1] text-white animate-fade-up sm:text-6xl"
          style={{ animationDelay: '90ms' }}
        >
          Prepare Smarter. <br />
          <span className="text-gradient">Get Placement Ready.</span>
        </h1>
        <p
          className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-400 animate-fade-up sm:text-lg"
          style={{ animationDelay: '180ms' }}
        >
          Analyze your resume, find skill gaps, practice aptitude and technical
          rounds, and track everything in one clean dashboard.
        </p>
        <div
          className="mt-9 flex flex-col items-center justify-center gap-3 animate-fade-up sm:flex-row"
          style={{ animationDelay: '260ms' }}
        >
          <Link to="/register" className="btn-primary px-7 py-3.5 text-sm">
            Analyze My Resume <ArrowRight size={16} />
          </Link>
          <Link to="/login" className="btn-ghost px-7 py-3.5 text-sm">
            Start Preparation
          </Link>
        </div>

        {/* Stats strip */}
        <div
          className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-3 animate-fade-up sm:grid-cols-4"
          style={{ animationDelay: '340ms' }}
        >
          {stats.map((s) => (
            <div key={s.label} className="glass-card px-4 py-4">
              <p className="font-display text-gradient-brand text-2xl font-extrabold">{s.value}</p>
              <p className="mt-1 text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <Reveal className="text-center">
          <span className="eyebrow">Features</span>
          <h2 className="font-display mt-3 text-2xl font-bold text-white sm:text-3xl">
            Everything you need, <span className="text-gradient">in one place</span>
          </h2>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text, accent }, i) => (
            <Reveal key={title} delay={(i % 3) * 90}>
              <GlassCard hover className="group h-full">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${accentTile[accent]}`}
                >
                  <Icon size={20} />
                </span>
                <h3 className="font-display mt-4 font-semibold text-white">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{text}</p>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-4xl px-4 py-12">
        <Reveal className="text-center">
          <span className="eyebrow">Process</span>
          <h2 className="font-display mt-3 text-2xl font-bold text-white sm:text-3xl">How it works</h2>
        </Reveal>
        <ol className="mt-8 space-y-3">
          {steps.map((s, i) => (
            <Reveal key={s} delay={i * 70}>
              <li className="glass-card glass-card-hover flex items-center gap-4 p-4">
                <span className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-glow">
                  {i + 1}
                </span>
                <span className="text-sm text-slate-200">{s}</span>
                {i === 0 && (
                  <span className="ml-auto hidden shrink-0 items-center gap-1 text-xs font-medium text-indigo-300 sm:flex">
                    <Star size={12} /> Start here
                  </span>
                )}
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-4 py-12 text-center">
        <Reveal>
          <GlassCard glow className="relative overflow-hidden p-8 sm:p-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[min(480px,90vw)] -translate-x-1/2 rounded-full bg-indigo-500/25 blur-[80px]"
            />
            <CheckCircle2 size={30} className="relative mx-auto text-indigo-300" />
            <h2 className="font-display relative mt-4 text-2xl font-bold text-white sm:text-3xl">
              Ready to get <span className="text-gradient">placed?</span>
            </h2>
            <p className="relative mt-2 text-sm text-slate-400">Free to start. No credit card needed.</p>
            <Link to="/register" className="btn-primary relative mt-6 px-7 py-3.5">
              Create free account <ArrowRight size={16} />
            </Link>
          </GlassCard>
        </Reveal>
        <p className="mt-8 text-xs text-slate-600">© 2026 PlacementPrep</p>
      </section>
    </div>
  );
}
