import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Wand2 } from 'lucide-react';
import GlassCard from './GlassCard.jsx';
import Button from './Button.jsx';

const COUNTS = [5, 8, 10];
const DIFFICULTIES = ['Mixed', 'Easy', 'Medium', 'Hard'];

export default function AiQuizGenerator({ type }) {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState('Mixed');

  const placeholder =
    type === 'technical' ? 'e.g. DBMS normalization' : 'e.g. Permutations & Combinations';

  function handleGenerate() {
    navigate(
      `/quiz?mode=ai&type=${type}&topic=${encodeURIComponent(topic)}&count=${count}&difficulty=${difficulty}`
    );
  }

  const selectClass = 'glass-input [&>option]:bg-slate-900';

  return (
    <GlassCard glow>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-glow">
            <Sparkles size={18} />
          </span>
          <div>
            <h2 className="font-display text-base font-bold text-white">AI Questing</h2>
            <p className="text-xs text-slate-400">Powered by Gemini</p>
          </div>
        </div>
        <span className="eyebrow">NEW</span>
      </div>

      <div className="mt-4">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-300">Topic (optional)</span>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={placeholder}
            maxLength={120}
            className="glass-input"
          />
        </label>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-300">Questions</span>
          <select value={count} onChange={(e) => setCount(Number(e.target.value))} className={selectClass}>
            {COUNTS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-300">Difficulty</span>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={selectClass}>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
      </div>

      <Button onClick={handleGenerate} className="mt-4">
        <Wand2 size={15} /> Generate AI Quiz
      </Button>
    </GlassCard>
  );
}
