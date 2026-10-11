import { Search, X } from 'lucide-react';

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search events, colleges, categories...',
  className = '',
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(value);
      }}
      className={`flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 pl-4 backdrop-blur-xl ${className}`}
    >
      <Search size={18} className="shrink-0 text-indigo-300" />
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="glass-input !border-0 !bg-transparent !p-0 !shadow-none focus:!shadow-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange?.('')}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}
      <button type="submit" className="btn-primary shrink-0 !rounded-xl !py-2">
        Search
      </button>
    </form>
  );
}
