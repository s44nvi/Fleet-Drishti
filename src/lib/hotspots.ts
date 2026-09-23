import type { InfrastructureIssue, Issue, SafetyEvent, TrafficHotspot } from "../types";
import { bucketForSubtype, type TaxonomyBucket } from "./taxonomy";

// Canonical Mumbai area names present across the mock fixtures. Different
// domains describe the same locality with different amounts of detail (an
// Issue's `location` might be "Sion Circle - LBS Marg Jn" while a
// SafetyEvent just says "Sion Circle") — this list lets every source
// resolve to the same spatial cluster key, which is the whole point of a
// "hotspot" (aggregated across sources, not one source's raw rows).
const KNOWN_AREAS = [
  "Andheri East",
  "Sion",
  "BKC",
  "Kurla",
  "Dadar",
  "Bandra",
  "Chembur",
  "Goregaon",
  "Western Express Highway",
  "Hindmata",
] as const;

function canonicalArea(location: string): string {
  const match = KNOWN_AREAS.find((area) => location.toLowerCase().includes(area.toLowerCase()));
  return match ?? location;
}

export interface Hotspot {
  location: string;
  count: number;
  /** Every taxonomy bucket contributing to this cluster, ranked by weight
   * (heaviest first) — a hotspot is aggregated intelligence, not a single
   * detection type, so this is a list rather than one "dominant type". */
  types: TaxonomyBucket[];
}

interface HotspotInputs {
  issues: Issue[];
  trafficHotspots: TrafficHotspot[];
  safetyEvents: SafetyEvent[];
  infrastructureIssues: InfrastructureIssue[];
}

// Spatially clusters every issue/hotspot/safety/infrastructure row by area
// and ranks by aggregate weight — the Command Center's stand-in for
// clustering raw detections into hotspots. Weights use each domain's own
// "how many independent observations" field where one exists
// (observationCount, observingBusCount) so a hotspot backed by heavier
// multi-bus corroboration ranks above one backed by a single row.
export function computeTopHotspots({ issues, trafficHotspots, safetyEvents, infrastructureIssues }: HotspotInputs): Hotspot[] {
  const clusters = new Map<string, { total: number; types: Map<TaxonomyBucket, number> }>();

  function add(location: string, weight: number, bucket: TaxonomyBucket) {
    const area = canonicalArea(location);
    const cluster = clusters.get(area) ?? { total: 0, types: new Map() };
    cluster.total += weight;
    cluster.types.set(bucket, (cluster.types.get(bucket) ?? 0) + weight);
    clusters.set(area, cluster);
  }

  for (const issue of issues) {
    add(issue.location, Math.max(issue.observationCount, 1), bucketForSubtype(issue.subtype));
  }
  for (const hotspot of trafficHotspots) {
    add(hotspot.location, hotspot.observingBusCount, "Traffic / Congestion");
  }
  for (const event of safetyEvents) {
    add(event.location, 1, bucketForSubtype(event.type));
  }
  for (const item of infrastructureIssues) {
    add(item.location, 1, "Infrastructure");
  }

  return Array.from(clusters.entries())
    .map(([location, cluster]) => {
      const types = Array.from(cluster.types.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([bucket]) => bucket)
        .slice(0, 3);
      return { location, count: cluster.total, types };
    })
    .sort((a, b) => b.count - a.count);
}
