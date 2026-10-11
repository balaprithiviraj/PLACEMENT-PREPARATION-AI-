// ResumeTemplates — print-ready resume designs rendered from ResumeData.
// CONTRACT (do not change export shape):
//   TEMPLATES = { modern: Component, classic: Component, minimal: Component }
//   Each template receives { data: ResumeData } and renders a single
//   A4-proportioned sheet. ResumeData shape:
//   { name, title, email, phone, location, website, linkedin, summary,
//     experience: [{ role, company, duration, location, bullets: [] }],
//     education: [{ degree, school, year, details }],
//     skills: [], projects: [{ name, link, bullets: [] }], certifications: [],
//     design: { layout, accentColor, fontStyle, sectionOrder: [] } }

import { Fragment } from 'react';

/* ---------------- shared defensive helpers ---------------- */

const DEFAULT_ORDER = ['summary', 'experience', 'skills', 'education', 'projects', 'certifications'];
const VALID_SECTIONS = new Set(DEFAULT_ORDER);

function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

function safeStr(v) {
  return typeof v === 'string' ? v.trim() : '';
}

// Coerce a scalar-ish value to display text; objects/arrays yield ''.
function textOf(v) {
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);
  return '';
}

// Skills may be strings or { name } objects — never crash.
function skillName(s) {
  if (typeof s === 'string') return s.trim();
  if (typeof s === 'number') return String(s);
  if (s && typeof s === 'object') return safeStr(s.name || s.label || s.title);
  return '';
}

// Certifications may be strings or { name } objects — never crash.
function certName(c) {
  if (typeof c === 'string') return c.trim();
  if (typeof c === 'number') return String(c);
  if (c && typeof c === 'object') {
    const rest = [safeStr(c.issuer), safeStr(c.year)].filter(Boolean).join(' · ');
    const base = safeStr(c.name || c.title || c.label);
    return [base, rest].filter(Boolean).join(' — ');
  }
  return '';
}

function bulletsOf(v) {
  return safeArr(v).map((b) => textOf(b)).filter(Boolean);
}

// Education `details` may be a string or a string array.
function detailsText(v) {
  if (Array.isArray(v)) return v.map((x) => textOf(x)).filter(Boolean).join(' · ');
  return textOf(v);
}

// Honor data.design.sectionOrder; unknown keys dropped, missing defaults appended.
function getSectionOrder(design) {
  const raw = safeArr(design && design.sectionOrder)
    .map((s) => textOf(s))
    .filter((s) => VALID_SECTIONS.has(s));
  if (raw.length === 0) return [...DEFAULT_ORDER];
  const seen = new Set(raw);
  for (const k of DEFAULT_ORDER) {
    if (!seen.has(k)) {
      raw.push(k);
      seen.add(k);
    }
  }
  return raw;
}

function accentOf(d, fallback) {
  const a = d && d.design ? safeStr(d.design.accentColor) : '';
  return a || fallback;
}

// '#4f46e5' + 0.1 -> 'rgba(79, 70, 229, 0.1)'; non-hex passes through.
function withAlpha(hex, alpha) {
  const m = String(hex || '').match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!m) return hex;
  const h = m[1];
  const toN = (s) => parseInt(s, 16);
  const r = h.length === 3 ? toN(h[0] + h[0]) : toN(h.slice(0, 2));
  const g = h.length === 3 ? toN(h[1] + h[1]) : toN(h.slice(2, 4));
  const b = h.length === 3 ? toN(h[2] + h[2]) : toN(h.slice(4, 6));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function displayUrl(u) {
  return safeStr(u).replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

function hrefOf(u) {
  const s = safeStr(u);
  if (!s) return null;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

function contactParts(d) {
  return [
    safeStr(d.email),
    safeStr(d.phone),
    safeStr(d.location),
    displayUrl(d.website),
    displayUrl(d.linkedin),
  ].filter(Boolean);
}

function Sheet({ children, style }) {
  return (
    <div
      className="resume-sheet mx-auto w-full max-w-[820px] bg-white p-8 text-slate-900 shadow-2xl sm:p-10"
      style={style}
    >
      {children}
    </div>
  );
}

// Render section keys in order, skipping empty ones; Fragments carry keys.
function renderOrdered(order, renderers) {
  const out = [];
  order.forEach((k) => {
    const fn = renderers[k];
    if (typeof fn !== 'function') return;
    const el = fn();
    if (el) out.push(<Fragment key={k}>{el}</Fragment>);
  });
  return out;
}

/* ---------------- MODERN: two-column, accent sidebar ---------------- */

const MODERN_SIDEBAR = new Set(['skills', 'education', 'certifications']);

function ModernResume({ data }) {
  const d = data || {};
  const accent = accentOf(d, '#4f46e5');
  const accentSoft = withAlpha(accent, 0.1);
  const accentWash = withAlpha(accent, 0.06);
  const accentLine = withAlpha(accent, 0.35);
  const order = getSectionOrder(d.design);
  const contact = contactParts(d);
  const name = safeStr(d.name) || 'Your Name';
  const title = safeStr(d.title);

  const Head = ({ children }) => (
    <h2 className="rt-heading flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
      <span className="inline-block h-3 w-1 rounded-full" style={{ backgroundColor: accent }} />
      {children}
    </h2>
  );

  const renderSummary = () => {
    const s = safeStr(d.summary);
    if (!s) return null;
    return (
      <section className="rt-section">
        <Head>Summary</Head>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-700">{s}</p>
      </section>
    );
  };

  const renderExperience = () => {
    const items = safeArr(d.experience).filter((e) => e && typeof e === 'object');
    const valid = items.filter(
      (e) => safeStr(e.role) || safeStr(e.company) || safeStr(e.duration) || bulletsOf(e.bullets).length > 0,
    );
    if (valid.length === 0) return null;
    return (
      <section className="rt-section">
        <Head>Experience</Head>
        <div className="mt-3 space-y-4">
          {valid.map((e, i) => {
            const role = safeStr(e.role);
            const company = safeStr(e.company);
            const duration = safeStr(e.duration);
            const loc = safeStr(e.location);
            const bullets = bulletsOf(e.bullets);
            const sub = [company && role ? company : '', loc].filter(Boolean).join('  ·  ');
            return (
              <div key={i} className="rt-avoid relative border-l-2 pl-4" style={{ borderColor: accentLine }}>
                <span
                  className="absolute top-1.5 h-2 w-2 rounded-full"
                  style={{ left: '-5px', backgroundColor: accent }}
                />
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[13px] font-bold leading-snug text-slate-900">{role || company || 'Experience'}</p>
                  {duration ? <p className="shrink-0 text-[11px] font-medium text-slate-500">{duration}</p> : null}
                </div>
                {sub ? (
                  <p className="mt-0.5 text-xs font-semibold" style={{ color: accent }}>
                    {sub}
                  </p>
                ) : null}
                {bullets.length > 0 ? (
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[13px] leading-snug text-slate-700 marker:text-slate-400">
                    {bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const renderSkills = () => {
    const skills = safeArr(d.skills).map(skillName).filter(Boolean);
    if (skills.length === 0) return null;
    return (
      <section className="rt-section">
        <Head>Skills</Head>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {skills.map((s, i) => (
            <span
              key={i}
              className="rounded-full px-2.5 py-0.5 text-[11px] font-medium text-slate-800"
              style={{ backgroundColor: accentSoft, border: `1px solid ${accentLine}` }}
            >
              {s}
            </span>
          ))}
        </div>
      </section>
    );
  };

  const renderEducation = () => {
    const items = safeArr(d.education).filter((e) => e && typeof e === 'object');
    const valid = items.filter((e) => safeStr(e.degree) || safeStr(e.school) || safeStr(e.year) || detailsText(e.details));
    if (valid.length === 0) return null;
    return (
      <section className="rt-section">
        <Head>Education</Head>
        <div className="mt-2 space-y-2.5">
          {valid.map((e, i) => (
            <div key={i} className="rt-avoid">
              {safeStr(e.degree) ? <p className="text-[13px] font-bold leading-snug text-slate-900">{safeStr(e.degree)}</p> : null}
              {safeStr(e.school) ? <p className="text-xs text-slate-600">{safeStr(e.school)}</p> : null}
              {safeStr(e.year) ? <p className="text-[11px] font-medium text-slate-500">{safeStr(e.year)}</p> : null}
              {detailsText(e.details) ? <p className="mt-0.5 text-xs leading-snug text-slate-600">{detailsText(e.details)}</p> : null}
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderProjects = () => {
    const items = safeArr(d.projects).filter((p) => p && typeof p === 'object');
    const valid = items.filter((p) => safeStr(p.name) || safeStr(p.link) || bulletsOf(p.bullets).length > 0);
    if (valid.length === 0) return null;
    return (
      <section className="rt-section">
        <Head>Projects</Head>
        <div className="mt-2 space-y-3">
          {valid.map((p, i) => {
            const pname = safeStr(p.name);
            const link = safeStr(p.link);
            const href = hrefOf(p.link);
            const bullets = bulletsOf(p.bullets);
            return (
              <div key={i} className="rt-avoid">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[13px] font-bold leading-snug text-slate-900">{pname || 'Project'}</p>
                  {link ? (
                    href ? (
                      <a href={href} className="shrink-0 text-[11px] font-medium text-slate-500 no-underline">
                        {displayUrl(link)}
                      </a>
                    ) : (
                      <span className="shrink-0 text-[11px] font-medium text-slate-500">{link}</span>
                    )
                  ) : null}
                </div>
                {bullets.length > 0 ? (
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[13px] leading-snug text-slate-700 marker:text-slate-400">
                    {bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const renderCertifications = () => {
    const certs = safeArr(d.certifications).map(certName).filter(Boolean);
    if (certs.length === 0) return null;
    return (
      <section className="rt-section">
        <Head>Certifications</Head>
        <ul className="mt-2 space-y-1">
          {certs.map((c, i) => (
            <li key={i} className="rt-avoid flex items-start gap-1.5 text-xs leading-snug text-slate-700">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-[2px]" style={{ backgroundColor: accent }} />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  };

  const R = {
    summary: renderSummary,
    experience: renderExperience,
    skills: renderSkills,
    education: renderEducation,
    projects: renderProjects,
    certifications: renderCertifications,
  };
  const mainKeys = order.filter((k) => !MODERN_SIDEBAR.has(k));
  const sideKeys = order.filter((k) => MODERN_SIDEBAR.has(k));

  return (
    <Sheet>
      <div className="-mx-8 -mt-8 h-1.5 sm:-mx-10 sm:-mt-10" style={{ backgroundColor: accent }} />
      <header className="mt-6">
        <h1 className="font-display text-[28px] font-extrabold leading-tight tracking-tight text-slate-900">{name}</h1>
        {title ? (
          <p className="mt-0.5 text-[13px] font-semibold" style={{ color: accent }}>
            {title}
          </p>
        ) : null}
        {contact.length > 0 ? (
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{contact.join('  ·  ')}</p>
        ) : null}
      </header>
      <div className="mt-5 grid grid-cols-[1fr_200px] gap-5">
        <div className="min-w-0 space-y-5">{renderOrdered(mainKeys, R)}</div>
        <aside className="min-w-0 space-y-5 self-start rounded-lg p-4" style={{ backgroundColor: accentWash }}>
          {renderOrdered(sideKeys, R)}
        </aside>
      </div>
    </Sheet>
  );
}

/* ---------------- CLASSIC: centered serif, single column ---------------- */

function ClassicResume({ data }) {
  const d = data || {};
  const order = getSectionOrder(d.design);
  const contact = contactParts(d);
  const name = safeStr(d.name) || 'Your Name';
  const title = safeStr(d.title);

  const Head = ({ children }) => (
    <div className="rt-heading">
      <h2 className="font-serif text-[13px] font-bold uppercase tracking-[0.18em] text-slate-900">{children}</h2>
      <div className="mt-1 border-t border-slate-400" />
    </div>
  );

  const renderSummary = () => {
    const s = safeStr(d.summary);
    if (!s) return null;
    return (
      <section className="rt-section">
        <Head>Summary</Head>
        <p className="mt-2 text-justify font-serif text-[13px] leading-relaxed text-slate-800">{s}</p>
      </section>
    );
  };

  const renderExperience = () => {
    const items = safeArr(d.experience).filter((e) => e && typeof e === 'object');
    const valid = items.filter(
      (e) => safeStr(e.role) || safeStr(e.company) || safeStr(e.duration) || bulletsOf(e.bullets).length > 0,
    );
    if (valid.length === 0) return null;
    return (
      <section className="rt-section">
        <Head>Experience</Head>
        <div className="mt-2 space-y-3">
          {valid.map((e, i) => {
            const role = safeStr(e.role);
            const company = safeStr(e.company);
            const duration = safeStr(e.duration);
            const loc = safeStr(e.location);
            const bullets = bulletsOf(e.bullets);
            return (
              <div key={i} className="rt-avoid">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-serif text-[13px] font-bold text-slate-900">{role || company || 'Experience'}</p>
                  {duration ? <p className="shrink-0 font-serif text-xs text-slate-700">{duration}</p> : null}
                </div>
                {company && role ? (
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-serif text-xs italic text-slate-700">{company}</p>
                    {loc ? <p className="shrink-0 font-serif text-xs italic text-slate-600">{loc}</p> : null}
                  </div>
                ) : loc ? (
                  <p className="font-serif text-xs italic text-slate-600">{loc}</p>
                ) : null}
                {bullets.length > 0 ? (
                  <ul className="ml-5 mt-1 list-disc space-y-0.5 text-justify font-serif text-[13px] leading-snug text-slate-800">
                    {bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const renderSkills = () => {
    const skills = safeArr(d.skills).map(skillName).filter(Boolean);
    if (skills.length === 0) return null;
    return (
      <section className="rt-section">
        <Head>Skills</Head>
        <p className="mt-2 text-justify font-serif text-[13px] leading-relaxed text-slate-800">{skills.join(', ')}</p>
      </section>
    );
  };

  const renderEducation = () => {
    const items = safeArr(d.education).filter((e) => e && typeof e === 'object');
    const valid = items.filter((e) => safeStr(e.degree) || safeStr(e.school) || safeStr(e.year) || detailsText(e.details));
    if (valid.length === 0) return null;
    return (
      <section className="rt-section">
        <Head>Education</Head>
        <div className="mt-2 space-y-2">
          {valid.map((e, i) => (
            <div key={i} className="rt-avoid">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-serif text-[13px] font-bold text-slate-900">
                  {safeStr(e.degree) || safeStr(e.school) || 'Education'}
                </p>
                {safeStr(e.year) ? <p className="shrink-0 font-serif text-xs text-slate-700">{safeStr(e.year)}</p> : null}
              </div>
              {safeStr(e.degree) && safeStr(e.school) ? (
                <p className="font-serif text-xs italic text-slate-700">{safeStr(e.school)}</p>
              ) : null}
              {detailsText(e.details) ? (
                <p className="mt-0.5 text-justify font-serif text-[13px] leading-snug text-slate-800">{detailsText(e.details)}</p>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderProjects = () => {
    const items = safeArr(d.projects).filter((p) => p && typeof p === 'object');
    const valid = items.filter((p) => safeStr(p.name) || safeStr(p.link) || bulletsOf(p.bullets).length > 0);
    if (valid.length === 0) return null;
    return (
      <section className="rt-section">
        <Head>Projects</Head>
        <div className="mt-2 space-y-2.5">
          {valid.map((p, i) => {
            const pname = safeStr(p.name);
            const link = safeStr(p.link);
            const href = hrefOf(p.link);
            const bullets = bulletsOf(p.bullets);
            return (
              <div key={i} className="rt-avoid">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-serif text-[13px] font-bold text-slate-900">{pname || 'Project'}</p>
                  {link ? (
                    href ? (
                      <a href={href} className="shrink-0 font-serif text-xs text-slate-700 no-underline">
                        {displayUrl(link)}
                      </a>
                    ) : (
                      <span className="shrink-0 font-serif text-xs text-slate-700">{link}</span>
                    )
                  ) : null}
                </div>
                {bullets.length > 0 ? (
                  <ul className="ml-5 mt-1 list-disc space-y-0.5 text-justify font-serif text-[13px] leading-snug text-slate-800">
                    {bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const renderCertifications = () => {
    const certs = safeArr(d.certifications).map(certName).filter(Boolean);
    if (certs.length === 0) return null;
    return (
      <section className="rt-section">
        <Head>Certifications</Head>
        <ul className="ml-5 mt-2 list-disc space-y-0.5 text-justify font-serif text-[13px] leading-snug text-slate-800">
          {certs.map((c, i) => (
            <li key={i} className="rt-avoid">
              {c}
            </li>
          ))}
        </ul>
      </section>
    );
  };

  const R = {
    summary: renderSummary,
    experience: renderExperience,
    skills: renderSkills,
    education: renderEducation,
    projects: renderProjects,
    certifications: renderCertifications,
  };

  return (
    <Sheet>
      <div className="font-serif">
        <header className="text-center">
          <h1 className="font-serif text-[30px] font-bold leading-tight text-slate-900">{name}</h1>
          {title ? <p className="mt-1 font-serif text-sm italic text-slate-700">{title}</p> : null}
          {contact.length > 0 ? (
            <p className="mt-1.5 font-serif text-xs leading-relaxed text-slate-600">{contact.join('  ·  ')}</p>
          ) : null}
          <div className="mt-3">
            <div className="border-t-2 border-slate-900" />
            <div className="mt-[2px] border-t border-slate-900" />
          </div>
        </header>
        <div className="mt-4 space-y-4">{renderOrdered(order, R)}</div>
      </div>
    </Sheet>
  );
}

/* ---------------- MINIMAL: airy single column, hairlines ---------------- */

function MinimalResume({ data }) {
  const d = data || {};
  // Monochrome by default; a user accent colors only the name.
  const accent = accentOf(d, '#0f172a');
  const order = getSectionOrder(d.design);
  const contact = contactParts(d);
  const name = safeStr(d.name) || 'Your Name';
  const title = safeStr(d.title);

  const Label = ({ children }) => (
    <div className="rt-heading">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{children}</h2>
      <div className="mt-2 border-t border-slate-200" />
    </div>
  );

  const renderSummary = () => {
    const s = safeStr(d.summary);
    if (!s) return null;
    return (
      <section className="rt-section">
        <Label>Summary</Label>
        <p className="mt-3 text-[13px] leading-relaxed text-slate-700">{s}</p>
      </section>
    );
  };

  const renderExperience = () => {
    const items = safeArr(d.experience).filter((e) => e && typeof e === 'object');
    const valid = items.filter(
      (e) => safeStr(e.role) || safeStr(e.company) || safeStr(e.duration) || bulletsOf(e.bullets).length > 0,
    );
    if (valid.length === 0) return null;
    return (
      <section className="rt-section">
        <Label>Experience</Label>
        <div className="mt-3 space-y-4">
          {valid.map((e, i) => {
            const role = safeStr(e.role);
            const company = safeStr(e.company);
            const duration = safeStr(e.duration);
            const loc = safeStr(e.location);
            const bullets = bulletsOf(e.bullets);
            const meta = (role ? [company, duration, loc] : [duration, loc]).filter(Boolean).join('  ·  ');
            return (
              <div key={i} className="rt-avoid">
                <p className="text-[13px] font-semibold leading-snug text-slate-900">{role || company || 'Experience'}</p>
                {meta ? <p className="mt-0.5 text-xs text-slate-500">{meta}</p> : null}
                {bullets.length > 0 ? (
                  <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-slate-700 marker:text-slate-300">
                    {bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const renderSkills = () => {
    const skills = safeArr(d.skills).map(skillName).filter(Boolean);
    if (skills.length === 0) return null;
    return (
      <section className="rt-section">
        <Label>Skills</Label>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skills.map((s, i) => (
            <span
              key={i}
              className="rounded-full border border-slate-300 bg-white px-3 py-0.5 text-xs text-slate-700"
            >
              {s}
            </span>
          ))}
        </div>
      </section>
    );
  };

  const renderEducation = () => {
    const items = safeArr(d.education).filter((e) => e && typeof e === 'object');
    const valid = items.filter((e) => safeStr(e.degree) || safeStr(e.school) || safeStr(e.year) || detailsText(e.details));
    if (valid.length === 0) return null;
    return (
      <section className="rt-section">
        <Label>Education</Label>
        <div className="mt-3 space-y-3">
          {valid.map((e, i) => {
            const degree = safeStr(e.degree);
            const rest = [safeStr(e.school), safeStr(e.year)].filter(Boolean).join('  ·  ');
            return (
              <div key={i} className="rt-avoid">
                {degree ? <p className="text-[13px] font-semibold leading-snug text-slate-900">{degree}</p> : null}
                {rest ? <p className="mt-0.5 text-xs text-slate-500">{rest}</p> : null}
                {detailsText(e.details) ? (
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-700">{detailsText(e.details)}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const renderProjects = () => {
    const items = safeArr(d.projects).filter((p) => p && typeof p === 'object');
    const valid = items.filter((p) => safeStr(p.name) || safeStr(p.link) || bulletsOf(p.bullets).length > 0);
    if (valid.length === 0) return null;
    return (
      <section className="rt-section">
        <Label>Projects</Label>
        <div className="mt-3 space-y-3">
          {valid.map((p, i) => {
            const pname = safeStr(p.name);
            const link = safeStr(p.link);
            const href = hrefOf(p.link);
            const bullets = bulletsOf(p.bullets);
            return (
              <div key={i} className="rt-avoid">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[13px] font-semibold leading-snug text-slate-900">{pname || 'Project'}</p>
                  {link ? (
                    href ? (
                      <a href={href} className="shrink-0 text-[11px] text-slate-500 no-underline">
                        {displayUrl(link)}
                      </a>
                    ) : (
                      <span className="shrink-0 text-[11px] text-slate-500">{link}</span>
                    )
                  ) : null}
                </div>
                {bullets.length > 0 ? (
                  <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-slate-700 marker:text-slate-300">
                    {bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const renderCertifications = () => {
    const certs = safeArr(d.certifications).map(certName).filter(Boolean);
    if (certs.length === 0) return null;
    return (
      <section className="rt-section">
        <Label>Certifications</Label>
        <ul className="mt-3 space-y-1.5">
          {certs.map((c, i) => (
            <li key={i} className="rt-avoid text-[13px] leading-relaxed text-slate-700">
              {c}
            </li>
          ))}
        </ul>
      </section>
    );
  };

  const R = {
    summary: renderSummary,
    experience: renderExperience,
    skills: renderSkills,
    education: renderEducation,
    projects: renderProjects,
    certifications: renderCertifications,
  };

  return (
    <Sheet>
      <header>
        <h1 className="text-[26px] font-bold leading-tight tracking-tight" style={{ color: accent }}>
          {name}
        </h1>
        {title ? <p className="mt-1 text-sm text-slate-500">{title}</p> : null}
        {contact.length > 0 ? <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{contact.join('  ·  ')}</p> : null}
        <div className="mt-4 border-t border-slate-200" />
      </header>
      <div className="mt-6 space-y-7">{renderOrdered(order, R)}</div>
    </Sheet>
  );
}

export const TEMPLATES = {
  modern: ModernResume,
  classic: ClassicResume,
  minimal: MinimalResume,
};

export const TEMPLATE_NAMES = [
  { id: 'modern', label: 'Modern' },
  { id: 'classic', label: 'Classic' },
  { id: 'minimal', label: 'Minimal' },
];
