export default function ProgressBar({ value = 0, label }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div>
      {label && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-300">{label}</span>
          <span className="font-display font-semibold text-white">{pct}%</span>
        </div>
      )}
      <div
        className="h-2 overflow-hidden rounded-full border border-white/5 bg-white/[0.07]"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div className="bar-fill h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
