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
//
// "road_defect" is the real backend's actual value for this domain
// (underscore, not hyphen) - matched alongside "road-defect" so real
// Issues/Events show up here too. This is a pure string-match addition,
// not a taxonomy redesign: the hyphenated mock values are unchanged and
// still matched, since some data may still use them.
export function isRoadDomainType(type: string): boolean {
  return type === "road-defect" || type === "road_defect" || type === "environmental";
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
// page — exactly the SIH PS categories, nothing broader. Records reach it
// from two real sources:
//  - the InfrastructureIssue fixture domain, via its `assetType`
//    ("barrier" -> divider, "signage" -> signboard);
//  - road Events/Issues whose subtype is one of these PS categories
//    (road damage, waterlogging, divider/zebra/signboard subtypes).
// Generic smart-city asset types in the fixtures (streetlight, drainage,
// utility-pole) are outside the PS and map to null — they are not shown
// under a borrowed PS label. Potholes stay on Road Issues.
export const INFRASTRUCTURE_CATEGORIES = [
  "Missing Divider",
  "Missing/Faded Zebra Crossing",
  "Damaged/Missing Signboard",
  "Road Damage",
  "Waterlogging",
  "Other Road Hazard",
] as const;
export type InfrastructureCategory = (typeof INFRASTRUCTURE_CATEGORIES)[number];

export function infrastructureCategoryForAssetType(assetType: string): InfrastructureCategory | null {
  switch (assetType) {
    case "barrier":
      return "Missing Divider";
    case "signage":
      return "Damaged/Missing Signboard";
    default:
      // streetlight / drainage / utility-pole: not SIH PS categories.
      return null;
  }
}

export function infrastructureCategoryForSubtype(subtype: string): InfrastructureCategory | null {
  switch (subtype) {
    case "missing-divider":
      return "Missing Divider";
    case "faded-crossing":
    case "missing-crossing":
      return "Missing/Faded Zebra Crossing";
    case "damaged-signboard":
    case "missing-signboard":
      return "Damaged/Missing Signboard";
    case "road-damage":
    case "surface-crack":
      return "Road Damage";
    case "waterlogging":
      return "Waterlogging";
    default:
      return null;
  }
}

export function isInfrastructureAssetInScope(assetType: string): boolean {
  return infrastructureCategoryForAssetType(assetType) !== null;
}
