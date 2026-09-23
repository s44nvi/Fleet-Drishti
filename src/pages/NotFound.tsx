import { Compass } from "lucide-react";
import { ButtonLink, EmptyState, PageHeader, Panel } from "../components/ui";

export function NotFound() {
  return (
    <>
      <PageHeader title="Page not found" />
      <Panel className="flex flex-col items-center pb-8">
        <EmptyState icon={Compass} title="No screen matches this address" />
        <ButtonLink to="/" variant="primary">
          Go to Command Center
        </ButtonLink>
      </Panel>
    </>
  );
}
