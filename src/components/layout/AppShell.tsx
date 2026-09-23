import { Outlet, useLocation } from "react-router-dom";
import { TopNav } from "./TopNav";

// The persistent app frame: top nav + content container. No sidebar —
// every route renders inside this shell via <Outlet />.
//
// Live Map is the one exception: it's a full-screen operational GIS
// workspace, not a padded/card-bounded page, so it skips the shared
// max-width/padding content wrapper and instead gets a plain viewport-minus-
// header box (the fixed TopNav is h-16 / 4rem). Every other route keeps the
// original wrapper unchanged.
export function AppShell() {
  const { pathname } = useLocation();
  const isFullBleed = pathname === "/live-map";

  return (
    <div className="min-h-screen bg-surface-concrete">
      <TopNav />
      {isFullBleed ? (
        <main className="w-full h-[calc(100vh-4rem)] mt-16 overflow-hidden">
          <Outlet />
        </main>
      ) : (
        <main className="relative w-full pt-16 px-space-lg min-h-screen">
          <div className="flex flex-col w-full gap-space-lg py-space-lg max-w-[1440px] mx-auto">
            <Outlet />
          </div>
        </main>
      )}
    </div>
  );
}
