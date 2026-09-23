import { PageHeader, Panel } from "../components/ui";

interface PlaceholderPageProps {
  eyebrow: string;
  title: string;
  description: string;
}

// Shared scaffold for routes not yet implemented in detail. Keeps every
// placeholder page visually consistent with the design system while the
// real screen (GIS map, tables, detail views, etc.) is built out later.
export function PlaceholderPage({ eyebrow, title, description }: PlaceholderPageProps) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <Panel className="p-space-lg flex flex-col items-center justify-center gap-space-sm text-center min-h-[320px]">
        <span className="material-symbols-outlined text-[32px] text-ink-muted">construction</span>
        <span className="font-title-sm text-title-sm text-ink-secondary">Screen under construction</span>
        <span className="font-body-sm text-body-sm text-ink-muted max-w-md">
          This section will be built out once backend data and APIs are available.
        </span>
      </Panel>
    </>
  );
}
