export default function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="spinner-ring" role="status" aria-label={message} />
      <p className="mt-4 text-sm text-slate-400">{message}</p>
    </div>
  );
}

export function SkeletonLoader() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="glass-card h-24 p-4">
          <div className="skeleton-shimmer h-3 w-1/2 rounded" />
          <div className="skeleton-shimmer mt-3 h-5 w-1/3 rounded" />
        </div>
      ))}
    </div>
  );
}
