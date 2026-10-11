import Reveal from './Reveal.jsx';

// PageHeader — consistent premium header for inner pages.
// eyebrow: small pill label · title: display font · sub: muted description
export default function PageHeader({ eyebrow, title, sub, action }) {
  return (
    <Reveal>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h1 className="font-display mt-3 text-2xl font-bold text-white sm:text-3xl">
            {title}
          </h1>
          {sub && <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{sub}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </Reveal>
  );
}
