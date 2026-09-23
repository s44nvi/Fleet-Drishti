// Single source of truth for every PS-aligned taxonomy label used across
// the Command Center and Road Issues — kept here (not duplicated per
// component/service) so "Pothole", "Waterlogging" etc. always mean the same
// bucket everywhere they appear.

// Broad taxonomy spanning every domain the fleet observes (road, traffic,
// safety, infrastructure) — used by Detection Distribution and Top
// Hotspots, where events of any type can appear side by side.
export const DETECTION_TAXONOMY_BUCKETS = [
  "Pothole",
  "Road Damage",
  "Waterlogging",
  "Traffic / Congestion",
  "Pedestrian Safety",
  "Infrastructure",
  "Other Road Hazards",
] as const;
export type TaxonomyBucket = (typeof DETECTION_TAXONOMY_BUCKETS)[number];

export function bucketForSubtype(subtype: string): TaxonomyBucket {
  switch (subtype) {
    case "pothole":
      return "Pothole";
    case "road-damage":
    case "surface-crack":
      return "Road Damage";
    case "waterlogging":
      return "Waterlogging";
    case "congestion":
    case "lane-blockage":
      return "Traffic / Congestion";
    case "pedestrian-conflict":
    case "crossing-risk":
    case "near-miss":
      return "Pedestrian Safety";
    default:
      return "Other Road Hazards";
  }
}

// PS §"road-defect" taxonomy — narrower and road-specific, used by the Road
// Issues page's category filter. Distinct from DETECTION_TAXONOMY_BUCKETS
// above because the PS calls out infrastructure-adjacent road categories
// (missing dividers, faded zebra crossings, signboards) that the broader
// taxonomy folds into "Infrastructure" / "Other Road Hazards". Categories
// with no matching fixture data today (Missing Divider, Missing/Faded Zebra
// Crossing, Damaged/Missing Signboard) are still listed — per the PS, not
// because a model exists for them yet.
export const ROAD_ISSUE_CATEGORIES = [
  "Pothole",
  "Road Damage",
  "Waterlogging",
  "Missing Divider",
  "Missing/Faded Zebra Crossing",
  "Damaged/Missing Signboard",
  "Other Road Hazard",
] as const;
export type RoadIssueCategory = (typeof ROAD_ISSUE_CATEGORIES)[number];

// Shared by Issue.type and Event.eventType — both unions include these two
// literal values for exactly the domains the Road Issues page covers.
export function isRoadDomainType(type: string): boolean {
  return type === "road-defect" || type === "environmental";
}

export function roadIssueCategoryForSubtype(subtype: string): RoadIssueCategory {
  switch (subtype) {
    case "pothole":
      return "Pothole";
    case "road-damage":
    case "surface-crack":
      return "Road Damage";
    case "waterlogging":
      return "Waterlogging";
    case "missing-divider":
      return "Missing Divider";
    case "faded-crossing":
    case "missing-crossing":
      return "Missing/Faded Zebra Crossing";
    case "damaged-signboard":
    case "missing-signboard":
      return "Damaged/Missing Signboard";
    default:
      return "Other Road Hazard";
  }
}

// PS §"vulnerable pedestrian situations" + §"hit-and-run / rash driving"
// taxonomy, used by the Safety page's category filter. Only "Pedestrian
// Risk" (pedestrian-conflict/crossing-risk) has real fixture data today —
// School/Vulnerable Pedestrian, Rash Driving, Hit-and-Run and Vehicle
// Incident are listed per the PS with zero current records, exactly like
// Road Issues' unsupported categories above, not because a model exists.
export const SAFETY_EVENT_CATEGORIES = [
  "Pedestrian Risk",
  "School / Vulnerable Pedestrian",
  "Rash Driving",
  "Hit-and-Run",
  "Vehicle Incident",
  "Other Safety Hazard",
] as const;
export type SafetyEventCategory = (typeof SAFETY_EVENT_CATEGORIES)[number];

export function safetyCategoryForType(type: string): SafetyEventCategory {
  switch (type) {
    case "pedestrian-conflict":
    case "crossing-risk":
      return "Pedestrian Risk";
    case "school-crossing":
    case "vulnerable-pedestrian":
      return "School / Vulnerable Pedestrian";
    case "rash-driving":
      return "Rash Driving";
    case "hit-and-run":
      return "Hit-and-Run";
    case "vehicle-incident":
      return "Vehicle Incident";
    default:
      return "Other Safety Hazard";
  }
}

// True for any of the vehicle-incident-side categories the PS asks for
// (rash driving / hit-and-run / vehicle incident) — used to gate the
// ANPR/tracking-specific UI so it only ever applies to that slice of the
// taxonomy, never to a pedestrian-risk record.
export function isVehicleIncidentCategory(category: SafetyEventCategory): boolean {
  return category === "Rash Driving" || category === "Hit-and-Run" || category === "Vehicle Incident";
}

// PS §"infrastructure deficiencies" taxonomy, used by the Infrastructure
// page. This is a DIFFERENT domain from ROAD_ISSUE_CATEGORIES above: that
// one buckets Event/Issue subtypes (type: "road-defect"/"environmental")
// with zero fixture support for divider/zebra/signboard; this one buckets
// the separate InfrastructureIssue fixture domain's real `assetType` field
// (streetlight/drainage/barrier/signage/utility-pole — an asset-condition
// registry, not part of the AI Detection->Event->Issue pipeline). "barrier"
// is the closest existing asset type to a road divider; no asset type
// represents a zebra crossing or generic road damage today, so those stay
// at their real, honest zero count rather than borrowing Road Issues' data
// and double-counting it under a different page.
export const INFRASTRUCTURE_CATEGORIES = [
  "Missing Divider",
  "Missing/Faded Zebra Crossing",
  "Damaged/Missing Signboard",
  "Road Damage",
  "Other Road Hazard",
] as const;
export type InfrastructureCategory = (typeof INFRASTRUCTURE_CATEGORIES)[number];

export function infrastructureCategoryForAssetType(assetType: string): InfrastructureCategory {
  switch (assetType) {
    case "barrier":
      return "Missing Divider";
    case "signage":
      return "Damaged/Missing Signboard";
    default:
      // streetlight / drainage / utility-pole, or any future asset type
      // that isn't one of the PS's specifically named categories.
      return "Other Road Hazard";
  }
}
