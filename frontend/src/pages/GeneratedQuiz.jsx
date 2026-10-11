import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, ChevronRight, Send, Timer } from 'lucide-react';
import { questionGeneratorAPI, getErrorMessage } from '../services/api.js';
import GlassCard from '../components/GlassCard.jsx';
import Button from '../components/Button.jsx';
import LoadingState from '../components/LoadingState.jsx';
import MarkdownText from '../components/MarkdownText.jsx';
import AiDisclaimer from '../components/AiDisclaimer.jsx';
import { cn } from '../utils/helpers.js';

function elapsedLabel(seconds) { return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
function correctIndex(question) {
  const value = question.correctAnswer ?? question.correct_answer ?? question.answer;
  return typeof value === 'number' ? value : question.options?.findIndex((option) => option === value);
}

export default function GeneratedQuiz() {
  const [params] = useSearchParams();
  const topic = params.get('topic') || '';
  const track = params.get('track') || 'technical';
  const difficulty = params.get('difficulty') || 'Medium';
  const count = Number(params.get('count')) || 5;
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // CHECK 2: never fire a doomed request for an empty prompt.
    if (!topic.trim()) {
      setError('No topic was provided. Please go back and enter a topic.');
      setLoading(false);
      return;
    }
    questionGeneratorAPI.generate({ track, topic, difficulty, count })
      .then((response) => {
        const payload = response.data?.data ?? response.data;
        const items = payload?.questions ?? payload;
        if (!Array.isArray(items) || items.length === 0) throw new Error('The service returned no questions.');
        setQuestions(items);
      })
      .catch((err) => setError(getErrorMessage(err, 'Could not generate questions.')))
      .finally(() => setLoading(false));
  }, [track, topic, difficulty, count]);

  useEffect(() => {
    if (loading || error || submitted) return undefined;
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [loading, error, submitted]);

  const score = useMemo(() => questions.reduce((total, question, index) => total + (answers[index] === correctIndex(question) ? 1 : 0), 0), [answers, questions]);
  const question = questions[current];
  if (loading) return <LoadingState message="Google AI is creating your placement questions..." />;
  if (error) return <div className="mx-auto max-w-xl p-6"><p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">{error}</p><Link to="/ai-question-generator" className="mt-4 inline-block text-primary-300">← Try again</Link></div>;
  if (submitted) return <main className="mx-auto max-w-3xl p-4 sm:p-8"><GlassCard className="text-center"><CheckCircle2 className="mx-auto text-emerald-300" size={44} /><p className="eyebrow mt-4">Practice complete</p><h1 className="mt-3 text-3xl font-bold text-white">{score} / {questions.length}</h1><p className="mt-2 text-slate-400">Completed in {elapsedLabel(elapsed)}. Review each answer and explanation below.</p></GlassCard><div className="mt-5 space-y-3">{questions.map((item, index) => { const right = correctIndex(item); return <GlassCard key={index}><div className="font-medium text-white"><MarkdownText inline text={`${index + 1}. ${item.question || ''}`} /></div><p className={cn('mt-2 text-sm', answers[index] === right ? 'text-emerald-300' : 'text-rose-300')}>Your answer: {answers[index] === undefined ? 'Not answered' : item.options?.[answers[index]] || 'Invalid'}</p><p className="mt-1 text-sm text-emerald-200">Correct: {item.options?.[right] || 'Unavailable'}</p>{item.explanation && <div className="mt-2 text-sm text-slate-400"><MarkdownText text={item.explanation} /></div>}</GlassCard>; })}</div><AiDisclaimer /><Link to="/ai-question-generator" className="btn-primary mt-5">Generate another set</Link></main>;
  return <main className="mx-auto max-w-4xl p-4 sm:p-8"><GlassCard className="flex items-center justify-between gap-3 !p-4"><div><h1 className="font-bold text-white">{topic}</h1><p className="text-xs capitalize text-slate-400">{track} · {difficulty} · {Object.keys(answers).length}/{questions.length} answered</p></div><p className="flex items-center gap-2 font-bold text-white"><Timer size={16} />{elapsedLabel(elapsed)}</p></GlassCard><div className="mt-4 grid gap-4 lg:grid-cols-[1fr_190px]"><GlassCard><p className="text-xs font-semibold uppercase text-slate-500">Question {current + 1} of {questions.length}</p><h2 className="mt-2 text-lg font-semibold text-white"><MarkdownText inline text={question?.question || ''} /></h2><div className="mt-5 space-y-2">{question?.options?.map((option, index) => <button key={index} type="button" onClick={() => setAnswers((value) => ({ ...value, [current]: index }))} className={cn('w-full rounded-xl border px-4 py-3 text-left text-sm', answers[current] === index ? 'border-indigo-400 bg-indigo-500/15 text-white' : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/25')}><b className="mr-2 text-slate-500">{'ABCD'[index]}.</b>{option}</button>)}</div><div className="mt-5 flex justify-between"><Button variant="ghost" disabled={current === 0} onClick={() => setCurrent((value) => value - 1)}><ChevronLeft size={16} /> Previous</Button>{current === questions.length - 1 ? <Button onClick={() => setSubmitted(true)}><Send size={16} /> Submit</Button> : <Button onClick={() => setCurrent((value) => value + 1)}>Next <ChevronRight size={16} /></Button>}</div></GlassCard><GlassCard className="!p-4"><p className="text-sm font-bold text-white">Questions</p><div className="mt-3 grid grid-cols-5 gap-2">{questions.map((_, index) => <button key={index} onClick={() => setCurrent(index)} className={cn('h-9 rounded-lg border text-xs font-bold', current === index ? 'border-indigo-400 bg-indigo-500/20 text-white' : answers[index] !== undefined ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-white/5 text-slate-400')}>{index + 1}</button>)}</div></GlassCard></div></main>;
}
