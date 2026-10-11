import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, Sparkles, Timer, Target } from 'lucide-react';
import AuroraBackground from '../components/AuroraBackground.jsx';
import GlassCard from '../components/GlassCard.jsx';
import Button from '../components/Button.jsx';

const TRACKS = [
  { value: 'technical', label: 'Technical', hint: 'DSA, DBMS, OS, OOP and web development' },
  { value: 'aptitude', label: 'Aptitude', hint: 'Quantitative, logical reasoning and verbal ability' },
];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Mixed'];
const COUNTS = [5, 10, 15];

export default function AiQuestionGenerator() {
  const navigate = useNavigate();
  const [track, setTrack] = useState('technical');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [count, setCount] = useState(5);
  const [topicError, setTopicError] = useState('');

  function generate(event) {
    event.preventDefault();
    // CHECK 2: block empty / whitespace-only prompts client-side
    // (backend also rejects topic < 2 chars with 422).
    if (!topic.trim()) {
      setTopicError('Please enter a topic (at least 2 characters).');
      return;
    }
    setTopicError('');
    const params = new URLSearchParams({ track, topic: topic.trim(), difficulty, count: String(count) });
    navigate(`/generated-quiz?${params.toString()}`);
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 sm:py-14">
      <AuroraBackground />
      <div className="relative mx-auto max-w-4xl">
        <header className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-glow">
            <BrainCircuit size={28} />
          </div>
          <p className="eyebrow mt-5"><Sparkles size={13} /> Google AI powered</p>
          <h1 className="font-display mt-4 text-4xl font-extrabold text-gradient sm:text-5xl">Placement Question Generator</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-300">Create a focused practice set, attempt it, and receive instant results with explanations.</p>
        </header>

        <GlassCard className="ring-glow mx-auto mt-9 max-w-2xl !overflow-visible p-5 sm:p-7">
          <form onSubmit={generate} className="space-y-5">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-white">Practice track</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {TRACKS.map((item) => (
                  <label key={item.value} className={`cursor-pointer rounded-xl border p-4 transition-colors ${track === item.value ? 'border-indigo-400 bg-indigo-500/15' : 'border-white/10 bg-white/5 hover:border-white/25'}`}>
                    <input className="sr-only" type="radio" name="track" checked={track === item.value} onChange={() => setTrack(item.value)} />
                    <span className="block font-semibold text-white">{item.label}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-slate-400">{item.hint}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block"><span className="mb-1.5 block text-sm font-semibold text-white">Topic</span><input className="glass-input" value={topic} maxLength={120} onChange={(event) => { setTopic(event.target.value); if (topicError) setTopicError(''); }} placeholder={track === 'technical' ? 'e.g. DBMS normalization' : 'e.g. Permutations and combinations'} required aria-invalid={Boolean(topicError)} /></label>
            {topicError && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">{topicError}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="mb-1.5 block text-sm font-semibold text-white">Difficulty</span><select className="glass-input [&>option]:bg-slate-900" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>{DIFFICULTIES.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="block"><span className="mb-1.5 block text-sm font-semibold text-white">Number of questions</span><select className="glass-input [&>option]:bg-slate-900" value={count} onChange={(event) => setCount(Number(event.target.value))}>{COUNTS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            </div>
            <Button type="submit" className="w-full py-3"><Sparkles size={17} /> Generate practice set</Button>
          </form>
        </GlassCard>
        <div className="mt-7 grid gap-3 text-sm text-slate-300 sm:grid-cols-3"><p className="flex items-center justify-center gap-2"><Target size={16} className="text-indigo-300" /> Placement-focused MCQs</p><p className="flex items-center justify-center gap-2"><Timer size={16} className="text-indigo-300" /> Timed practice mode</p><p className="flex items-center justify-center gap-2"><BrainCircuit size={16} className="text-indigo-300" /> Explanations included</p></div>
      </div>
    </main>
  );
}
