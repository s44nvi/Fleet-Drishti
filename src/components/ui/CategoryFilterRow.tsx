interface CategoryFilterRowProps<T extends string> {
  categories: readonly T[];
  active: "All" | T;
  onChange: (category: "All" | T) => void;
  /** Count for each category, keyed by category value ("All" included). */
  counts: Map<"All" | T, number>;
}

// Generic taxonomy filter chip row — "All" plus every category, each with
// its live count. First built for Road Issues, reused as-is by Safety
// rather than duplicating the same chip markup per page.
export function CategoryFilterRow<T extends string>({ categories, active, onChange, counts }: CategoryFilterRowProps<T>) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {(["All", ...categories] as ("All" | T)[]).map((cat) => {
        const count = counts.get(cat) ?? 0;
        const isActive = active === cat;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(cat)}
            aria-pressed={isActive}
            className={`rounded font-label-code text-label-code font-semibold px-space-sm py-1 border transition-colors ${
              isActive
                ? "bg-primary-civic-deep border-primary-civic-deep text-white"
                : "bg-surface-card border-border-slate text-ink-secondary hover:bg-surface-panel"
            }`}
          >
            {cat} <span className={isActive ? "text-white/70" : "text-ink-muted"}>({count})</span>
          </button>
        );
      })}
    </div>
  );
}
