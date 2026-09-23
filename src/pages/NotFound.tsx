import { Link } from "react-router-dom";
import { PageHeader, Panel } from "../components/ui";

export function NotFound() {
  return (
    <>
      <PageHeader eyebrow="Error" title="Page Not Found" description="This route does not exist in Fleet Drishti." />
      <Panel className="p-space-lg flex flex-col items-center justify-center gap-space-sm text-center min-h-[240px]">
        <span className="material-symbols-outlined text-[32px] text-ink-muted">explore_off</span>
        <span className="font-title-sm text-title-sm text-ink-secondary">No screen matches this URL</span>
        <Link
          to="/"
          className="mt-2 inline-flex items-center gap-1.5 rounded font-body-sm text-body-sm font-semibold px-space-md py-space-xs bg-primary-civic-deep text-white hover:bg-primary-civic-active transition-colors"
        >
          Back to Command Center
        </Link>
      </Panel>
    </>
  );
}
