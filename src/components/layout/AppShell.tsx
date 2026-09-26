import { Outlet, useLocation } from "react-router-dom";
import { Sidebar, MobileNav } from "./Sidebar";
import { CONTENT_PADDING } from "./contentFrame";

// Persistent frame: compact left sidebar (drawer below lg) + content.
// Live Map is a full-bleed GIS workspace; every other route gets the padded
// content column.
export function AppShell() {
  const { pathname } = useLocation();
  const isFullBleed = pathname === "/live-map";

  return (
    <div className="min-h-dvh bg-canvas">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:shadow-float"
      >
        Skip to content
      </a>
      <Sidebar />
      <MobileNav />
      <main id="main" className="lg:pl-[232px] pt-14 lg:pt-0">
        {isFullBleed ? (
          <div className="h-[calc(100dvh-3.5rem)] lg:h-dvh">
            <Outlet />
          </div>
        ) : (
          <div className={`mx-auto flex w-full max-w-[1600px] flex-col gap-4 ${CONTENT_PADDING}`}>
            <Outlet />
          </div>
        )}
      </main>
    </div>
  );
}
