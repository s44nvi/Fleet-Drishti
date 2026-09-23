import { Link, NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../../lib/nav";
import { cn } from "../../lib/cn";

// Clean top navigation — no sidebar. Active page uses a restrained civic
// green underline, matching the brand-color rule: green is identity/
// active-nav/primary-action only, never a generic status color.
export function TopNav() {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-surface-card border-b border-border-slate z-50">
      <div className="h-16 max-w-[1440px] mx-auto px-space-lg flex items-center justify-between gap-space-lg">
        <Link to="/" className="flex items-center shrink-0">
          {/* Navbar lockup: icon + "FLEET DRISHTI" wordmark only — a crop of
              the full brand logo (public/brand/fleet-drishti-logo.png,
              kept intact for larger contexts) with the tagline/microtext
              omitted, since that subtext isn't legible at header size. */}
          <img
            src="/brand/fleet-drishti-navbar-logo.png"
            alt="Fleet Drishti"
            className="hidden md:block h-12 w-auto"
          />
          {/* Icon-only mark for the compact mobile header, where the nav
              links are also collapsed and there isn't room for the full
              wordmark without crowding the header. */}
          <img
            src="/brand/fleet-drishti-icon.png"
            alt="Fleet Drishti"
            className="block md:hidden h-9 w-9 rounded-md"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-space-md xl:gap-space-lg h-full overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                cn(
                  "h-full flex items-center whitespace-nowrap font-title-sm text-title-sm border-b-2 transition-colors",
                  isActive
                    ? "text-primary-civic-deep border-primary-civic-deep font-semibold"
                    : "text-ink-secondary border-transparent hover:text-ink-primary",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-1.5 shrink-0">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-civic-active opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary-civic-active" />
          </span>
          <span className="font-label-code text-label-code text-ink-secondary font-semibold">System Operational</span>
        </div>
      </div>
    </header>
  );
}
