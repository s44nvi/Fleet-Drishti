import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";

interface MapDrawerProps {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

// Floating detail sheet over a map workspace (bottom-right, clear of the
// control rail). Escape closes it; focus moves in when it opens.
export function MapDrawer({ title, onClose, children, className }: MapDrawerProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Focus once on open (not on every parent re-render).
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-label={typeof title === "string" ? title : "Details"}
      className={cn(
        "absolute z-20 bottom-3 right-3 left-3 sm:left-auto sm:w-[340px] max-h-[calc(100%-11rem)] flex flex-col rounded-xl bg-surface shadow-float outline-none",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2 px-4 pt-3.5 pb-2">
        <div className="min-w-0 text-title text-ink">{title}</div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="h-8 w-8 -mr-1.5 -mt-1 shrink-0 inline-flex items-center justify-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">{children}</div>
    </div>
  );
}
