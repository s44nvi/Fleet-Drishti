import { Link } from "react-router-dom";
import { PageHeader } from "../../components/ui";
import { KpiStrip } from "../../components/telemetry";
import { useAsyncData } from "../../hooks/useAsyncData";
import { analyticsService } from "../../services";

export function Analytics() {
  const { data: summary } = useAsyncData(() => analyticsService.getCityAnalyticsSummary(), []);

  return (
    <>
      <PageHeader
        eyebrow="Analytics"
        title="City Analytics"
        description="City-wide trend and performance analytics."
        actions={
          <Link to="/architecture" className="font-label-code text-label-code font-semibold text-primary-civic-deep hover:text-primary-civic-active">
            System Architecture &rarr;
          </Link>
        }
      />
      <KpiStrip tiles={summary ?? []} />
    </>
  );
}
