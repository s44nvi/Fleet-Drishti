import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { NAV_ITEMS, SECONDARY_NAV_ITEMS } from "../../lib/nav";
import { cn } from "../../lib/cn";
import type { NavLeafItem } from "../../types";

function NavItem({ item, compact, onNavigate }: { item: NavLeafItem; compact?: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={item.path === "/"}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-lg px-3 transition-colors duration-150",
          compact ? "h-8 text-meta" : "h-10 text-item",
          isActive ? "bg-action-soft text-action" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={compact ? 16 : 19}
            strokeWidth={1.75}
            aria-hidden="true"
            className={isActive ? "text-action" : "text-ink-3 group-hover:text-ink-2"}
          />
          {item.label}
        </>
      )}
    </NavLink>
  );
}

function NavContents({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <nav aria-label="Workspaces" className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.path} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className="mt-6 flex flex-col gap-0.5">
        <p className="px-3 pb-1 text-meta text-ink-3">More</p>
        <nav aria-label="More screens" className="flex flex-col gap-0.5">
          {SECONDARY_NAV_ITEMS.map((item) => (
            <NavItem key={item.path} item={item} compact onNavigate={onNavigate} />
          ))}
        </nav>
      </div>
    </>
  );
}

// Honest replacement for the old "System Operational" pulse: says what the
// data actually is, instead of claiming a health status nothing measures.
function DataModeNote() {
  return (
    <div className="rounded-lg border border-line bg-surface-2 px-3 py-2.5">
      <p className="text-meta text-ink-2 font-semibold">Mumbai · Prototype</p>
      <p className="text-meta text-ink-3">Fixture data, simulated fleet</p>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[232px] flex-col border-r border-line bg-surface px-3 py-5">
      <Link to="/" className="px-2 mb-7 block" aria-label="Fleet Drishti home">
        <img src="/brand/fleet-drishti-navbar-logo.png" alt="Fleet Drishti" className="h-8 w-auto" />
      </Link>
      <div className="flex-1 overflow-y-auto">
        <NavContents />
      </div>
      <DataModeNote />
    </aside>
  );
}

// Below 1024px: a slim top bar with a menu button that opens the same nav
// as a drawer.
export function MobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between border-b border-line bg-surface px-4">
        <Link to="/" aria-label="Fleet Drishti home">
          <img src="/brand/fleet-drishti-navbar-logo.png" alt="Fleet Drishti" className="h-7 w-auto" />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-expanded={open}
          className="h-10 w-10 inline-flex items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2"
        >
          <Menu size={20} />
        </button>
      </header>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[260px] bg-surface shadow-float px-3 py-4 flex flex-col" role="dialog" aria-modal="true" aria-label="Navigation">
            <div className="flex items-center justify-between px-2 mb-5">
              <img src="/brand/fleet-drishti-navbar-logo.png" alt="Fleet Drishti" className="h-7 w-auto" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavContents onNavigate={() => setOpen(false)} />
            </div>
            <DataModeNote />
          </div>
        </div>
      )}
    </>
  );
}
