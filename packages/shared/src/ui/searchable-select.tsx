import { useEffect, useRef, useState } from "react";

export interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/** A <select> with a search box, for lists too long to scan (e.g. the city
 *  list on delivery-fee screens). Click to open, type to filter, click an
 *  option to pick it. */
export function SearchableSelect({ options, value, onChange, placeholder = "Select…", className }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-left text-[13px] text-ink-dark outline-none focus:border-primary-light"
      >
        <span className={value ? "" : "text-muted"}>{value || placeholder}</span>
        <span className="ml-2 shrink-0 text-muted">▾</span>
      </button>
      {open ? (
        <div className="absolute left-0 right-0 z-20 mt-1 rounded-lg border border-border bg-surface shadow-lg">
          <input
            autoFocus
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city…"
            className="w-full border-b border-border px-3 py-2 text-[13px] text-ink-dark outline-none"
          />
          <div className="max-h-[220px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-[12.5px] text-muted">No match.</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => {
                    onChange(o);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="block w-full px-3 py-2 text-left text-[13px] text-ink-dark hover:bg-surface-alt"
                  style={o === value ? { background: "var(--color-accent-tint)" } : undefined}
                >
                  {o}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
