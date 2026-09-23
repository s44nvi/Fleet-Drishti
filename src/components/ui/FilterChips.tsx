import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";

interface FilterChipsProps<T extends string> {
  categories: readonly T[];
  active: "All" | T;
  onChange: (category: "All" | T) => void;
  counts: Map<"All" | T, number>;
  /** Label for the collapsed group of zero-count categories. */
  emptyGroupLabel?: string;
}

// Category filter. Only categories with records get a chip; categories the
// taxonomy defines but nothing has been detected for yet are folded into
// one disclosure instead of a row of "(0)" chips — honest, not a checklist.
export function FilterChips<T extends string>({
  categories,
  active,
  onChange,
  counts,
  emptyGroupLabel = "Not yet detected",
}: FilterChipsProps<T>) {
  const [showEmpty, setShowEmpty] = useState(false);
  const withData = categories.filter((c) => (counts.get(c) ?? 0) > 0);
  const empty = categories.filter((c) => (counts.get(c) ?? 0) === 0);

  const chip = (cat: "All" | T) => {
    const isActive = active === cat;
    return (
      <button
        key={cat}
        type="button"
        onClick={() => onChange(cat)}
        aria-pressed={isActive}
        className={cn(
          "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-meta border transition-colors duration-150",
          isActive ? "bg-ink border-ink text-white" : "bg-surface border-line text-ink-2 hover:border-line-strong hover:text-ink",
        )}
      >
        {cat}
        <span className={cn("tabular-nums", isActive ? "text-white/70" : "text-ink-3")}>{counts.get(cat) ?? 0}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by category">
        {chip("All")}
        {withData.map(chip)}
        {empty.length > 0 && (
          <button
            type="button"
            onClick={() => setShowEmpty((v) => !v)}
            aria-expanded={showEmpty}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-meta text-ink-3 hover:text-ink"
          >
            {emptyGroupLabel} ({empty.length})
            <ChevronDown size={14} className={cn("transition-transform duration-200", showEmpty && "rotate-180")} aria-hidden="true" />
          </button>
        )}
      </div>
      {showEmpty && (
        <p className="text-meta text-ink-3">
          No records yet for: {empty.join(" · ")}
        </p>
      )}
    </div>
  );
}
