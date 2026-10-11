// AuroraBackground — fixed ambient layer: drifting gradient orbs + faint grid.
// Mount once per layout (behind content). Pure CSS, zero deps, GPU-cheap.
export default function AuroraBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* grid */}
      <div
        className="absolute inset-0 opacity-[0.13]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.35) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, #000 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, #000 30%, transparent 75%)',
        }}
      />
      {/* orbs */}
      <div className="absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[130px] animate-drift" />
      <div className="absolute top-1/3 -left-40 h-[380px] w-[380px] rounded-full bg-violet-600/15 blur-[120px] animate-drift" style={{ animationDelay: '-6s' }} />
      <div className="absolute bottom-0 -right-40 h-[380px] w-[420px] rounded-full bg-cyan-500/10 blur-[130px] animate-drift" style={{ animationDelay: '-3s' }} />
    </div>
  );
}
