// Mumbai traffic corridors and congestion areas used by the Traffic page's
// DEMO model. The *choice* of corridors, bottleneck stretches and their
// relative severity follows recurring congestion reporting and transport
// studies for Mumbai (WEH, EEH, JVLR, SCLR, LBS Marg, BKC approaches,
// Andheri–Ghatkopar/Saki Naka, Sion–Panvel, Ghatkopar–Mankhurd, Dadar…).
// The numbers themselves are illustrative, not measurements.
//
// Geometry is NOT defined here: each corridor names the real OpenStreetMap
// roads it is made of (`match`), and its anchors only split those roads into
// named stretches. Anchor order defines the "forward" direction — towards
// the island city for radial roads, west → east for cross-city links.

export interface CorridorAnchor {
  name: string;
  lng: number;
  lat: number;
}

export interface SegmentDef {
  /** Relative severity of the stretch, 0..1 (≈ its weekday peak index). */
  base: number;
  /** Extra all-day load (junction-bound, office districts). */
  midday?: number;
  /** Weekend / evening leisure pull (malls, promenades, markets). */
  leisure?: number;
}

export interface CorridorRoadRef {
  name: string;
  ref?: string;
  highway: string;
  mid: [number, number];
}

export interface CorridorDef {
  id: string;
  name: string;
  short: string;
  /** radial: commute into / out of the city; cross: suburb ↔ suburb link. */
  kind: "radial" | "cross";
  forwardLabel: string;
  reverseLabel: string;
  freeFlowKph: number;
  match: (road: CorridorRoadRef) => boolean;
  anchors: CorridorAnchor[];
  /** One per consecutive anchor pair. */
  segments: SegmentDef[];
}

const FAST = /^(motorway|trunk)(_link)?$/;
const MAJOR = /^(motorway|trunk|primary)(_link)?$/;

export const TRAFFIC_CORRIDORS: CorridorDef[] = [
  {
    id: "weh",
    name: "Western Express Highway",
    short: "WEH",
    kind: "radial",
    forwardLabel: "Southbound",
    reverseLabel: "Northbound",
    freeFlowKph: 55,
    match: (r) =>
      FAST.test(r.highway) &&
      r.mid[0] < 72.875 &&
      (/western express|airport flyover|kalina-vakola|times of india flyover/i.test(r.name) || /NH48|WEH/.test(r.ref ?? "")),
    anchors: [
      { name: "Dahisar", lng: 72.8655, lat: 19.2555 },
      { name: "Borivali", lng: 72.8655, lat: 19.231 },
      { name: "Kandivali", lng: 72.8645, lat: 19.2065 },
      { name: "Malad", lng: 72.8595, lat: 19.185 },
      { name: "Goregaon (Aarey)", lng: 72.856, lat: 19.1665 },
      { name: "Jogeshwari", lng: 72.8565, lat: 19.1385 },
      { name: "Andheri", lng: 72.855, lat: 19.117 },
      { name: "Vile Parle (Airport)", lng: 72.8525, lat: 19.0975 },
      { name: "Santacruz", lng: 72.848, lat: 19.0805 },
      { name: "Bandra (Kalanagar)", lng: 72.8435, lat: 19.0575 },
    ],
    segments: [
      { base: 0.61 },
      { base: 0.48 },
      { base: 0.77, leisure: 0.4 },
      { base: 0.83, leisure: 0.5 },
      { base: 0.87, midday: 0.08 },
      { base: 0.93, midday: 0.12 },
      { base: 0.8, midday: 0.1 },
      { base: 0.74, midday: 0.06 },
      { base: 0.96, midday: 0.1, leisure: 0.3 },
    ],
  },
  {
    id: "eeh",
    name: "Eastern Express Highway",
    short: "EEH",
    kind: "radial",
    forwardLabel: "Southbound",
    reverseLabel: "Northbound",
    freeFlowKph: 55,
    match: (r) =>
      FAST.test(r.highway) && r.mid[0] >= 72.875 && (/eastern express/i.test(r.name) || /NH48/.test(r.ref ?? "")),
    anchors: [
      { name: "Mulund", lng: 72.9655, lat: 19.168 },
      { name: "Bhandup", lng: 72.95, lat: 19.1445 },
      { name: "Kanjurmarg", lng: 72.938, lat: 19.1235 },
      { name: "Vikhroli", lng: 72.9305, lat: 19.105 },
      { name: "Ghatkopar", lng: 72.918, lat: 19.0815 },
      { name: "Chedda Nagar", lng: 72.9025, lat: 19.0655 },
      { name: "Chunabhatti", lng: 72.8845, lat: 19.0545 },
    ],
    segments: [
      { base: 0.55 },
      { base: 0.64 },
      { base: 0.83, midday: 0.05 },
      { base: 0.9, midday: 0.08 },
      { base: 0.93, midday: 0.08 },
      { base: 0.77 },
    ],
  },
  {
    id: "jvlr",
    name: "Jogeshwari–Vikhroli Link Road",
    short: "JVLR",
    kind: "cross",
    forwardLabel: "Eastbound",
    reverseLabel: "Westbound",
    freeFlowKph: 40,
    match: (r) => /jogeshwari.{0,4}vik/i.test(r.name),
    anchors: [
      { name: "Jogeshwari", lng: 72.8575, lat: 19.1385 },
      { name: "SEEPZ", lng: 72.8745, lat: 19.1305 },
      { name: "Powai", lng: 72.9125, lat: 19.124 },
      { name: "Kanjurmarg", lng: 72.9325, lat: 19.1245 },
    ],
    segments: [{ base: 0.93, midday: 0.1 }, { base: 0.83, midday: 0.12, leisure: 0.3 }, { base: 0.77 }],
  },
  {
    id: "sclr",
    name: "Santacruz–Chembur Link Road",
    short: "SCLR",
    kind: "cross",
    forwardLabel: "Eastbound",
    reverseLabel: "Westbound",
    freeFlowKph: 45,
    match: (r) => /santa ?cruz.{0,4}chembur|kaustubh rane/i.test(r.name) || r.ref === "SCLR",
    anchors: [
      { name: "Vakola", lng: 72.8475, lat: 19.0745 },
      { name: "Kurla", lng: 72.878, lat: 19.0755 },
      { name: "Chembur", lng: 72.902, lat: 19.066 },
    ],
    segments: [{ base: 0.64, midday: 0.06 }, { base: 0.58 }],
  },
  {
    id: "aglr",
    name: "Andheri–Ghatkopar Link Road",
    short: "AGLR",
    kind: "cross",
    forwardLabel: "Eastbound",
    reverseLabel: "Westbound",
    freeFlowKph: 30,
    match: (r) => /andheri.{0,3}kurla|ghatkopar.{0,3}andheri|andheri.{0,3}ghatkopar/i.test(r.name),
    anchors: [
      { name: "Andheri", lng: 72.867, lat: 19.112 },
      { name: "Saki Naka", lng: 72.8875, lat: 19.1035 },
      { name: "Ghatkopar", lng: 72.9075, lat: 19.0905 },
    ],
    segments: [{ base: 0.96, midday: 0.14 }, { base: 0.74, midday: 0.08 }],
  },
  {
    id: "lbs",
    name: "LBS Marg",
    short: "LBS",
    kind: "radial",
    forwardLabel: "Southbound",
    reverseLabel: "Northbound",
    freeFlowKph: 32,
    match: (r) => /lal bahadur shastri|\blbs\b/i.test(r.name),
    anchors: [
      { name: "Mulund", lng: 72.945, lat: 19.1785 },
      { name: "Bhandup", lng: 72.9335, lat: 19.1445 },
      { name: "Vikhroli", lng: 72.9245, lat: 19.1135 },
      { name: "Ghatkopar", lng: 72.9078, lat: 19.0893 },
      { name: "Kurla", lng: 72.8775, lat: 19.0745 },
      { name: "Sion", lng: 72.8655, lat: 19.0445 },
    ],
    segments: [
      { base: 0.48, midday: 0.06 },
      { base: 0.64, midday: 0.08 },
      { base: 0.8, midday: 0.12 },
      { base: 0.93, midday: 0.16 },
      { base: 0.87, midday: 0.14 },
    ],
  },
  {
    id: "bkc",
    name: "BKC Connector",
    short: "BKC",
    kind: "cross",
    forwardLabel: "Eastbound",
    reverseLabel: "Westbound",
    freeFlowKph: 35,
    match: (r) => /bandra kurla complex|\bbkc\b/i.test(r.name) && MAJOR.test(r.highway),
    anchors: [
      { name: "Kalanagar", lng: 72.85, lat: 19.055 },
      { name: "BKC", lng: 72.865, lat: 19.0655 },
      { name: "Kurla", lng: 72.8755, lat: 19.0708 },
    ],
    segments: [{ base: 0.93, midday: 0.14 }, { base: 0.8, midday: 0.12 }],
  },
  {
    id: "sion-bkc",
    name: "Sion–Bandra Link Road",
    short: "Sion–BKC",
    kind: "cross",
    forwardLabel: "Eastbound",
    reverseLabel: "Westbound",
    freeFlowKph: 30,
    match: (r) => /sion bandra link|mahim sion link/i.test(r.name),
    anchors: [
      { name: "Bandra (Mahim)", lng: 72.8445, lat: 19.0455 },
      { name: "Dharavi", lng: 72.855, lat: 19.045 },
      { name: "Sion", lng: 72.8625, lat: 19.0435 },
    ],
    segments: [{ base: 0.61, midday: 0.08 }, { base: 0.71, midday: 0.1 }],
  },
  {
    id: "gmlr-e",
    name: "Ghatkopar–Mankhurd Link Road",
    short: "GMLR",
    kind: "cross",
    forwardLabel: "Southbound",
    reverseLabel: "Northbound",
    freeFlowKph: 40,
    match: (r) => /ghatkopar.{0,4}mankhurd/i.test(r.name),
    anchors: [
      { name: "Ghatkopar", lng: 72.9105, lat: 19.0715 },
      { name: "Shivaji Nagar", lng: 72.9155, lat: 19.063 },
      { name: "Mankhurd", lng: 72.9345, lat: 19.0525 },
    ],
    segments: [{ base: 0.64 }, { base: 0.74 }],
  },
  {
    id: "sph",
    name: "Sion–Panvel Highway",
    short: "Sion–Panvel",
    kind: "radial",
    forwardLabel: "Westbound",
    reverseLabel: "Eastbound",
    freeFlowKph: 50,
    match: (r) => /sion.{0,3}panvel/i.test(r.name) || r.ref === "SPH",
    anchors: [
      { name: "Vashi Bridge", lng: 72.9615, lat: 19.055 },
      { name: "Mankhurd", lng: 72.935, lat: 19.0495 },
      { name: "Chembur", lng: 72.9, lat: 19.051 },
      { name: "Sion", lng: 72.8715, lat: 19.0465 },
    ],
    segments: [{ base: 0.77 }, { base: 0.67, leisure: 0.2 }, { base: 0.71, midday: 0.06 }],
  },
  {
    id: "gomlr",
    name: "Goregaon–Mulund Link Road",
    short: "Goregaon–Mulund",
    kind: "cross",
    forwardLabel: "Eastbound",
    reverseLabel: "Westbound",
    freeFlowKph: 35,
    match: (r) => /goregaon.{0,4}mulund|mulund.{0,4}goregaon/i.test(r.name),
    anchors: [
      { name: "Goregaon W", lng: 72.8423, lat: 19.1739 },
      { name: "Goregaon E", lng: 72.8592, lat: 19.1742 },
      { name: "Mulund W", lng: 72.9365, lat: 19.1655 },
      { name: "Mulund E", lng: 72.9565, lat: 19.157 },
    ],
    segments: [{ base: 0.67, leisure: 0.3 }, { base: 0.29 }, { base: 0.55 }],
  },
  {
    id: "link",
    name: "New Link Road",
    short: "Link Rd",
    kind: "radial",
    forwardLabel: "Southbound",
    reverseLabel: "Northbound",
    freeFlowKph: 32,
    match: (r) => /^(new )?link road$/i.test(r.name) && r.mid[0] < 72.865,
    anchors: [
      { name: "Borivali", lng: 72.841, lat: 19.2302 },
      { name: "Kandivali", lng: 72.835, lat: 19.2072 },
      { name: "Malad", lng: 72.835, lat: 19.1835 },
      { name: "Goregaon", lng: 72.8349, lat: 19.1635 },
      { name: "Oshiwara", lng: 72.8345, lat: 19.1455 },
      { name: "Andheri W", lng: 72.832, lat: 19.1325 },
    ],
    segments: [
      { base: 0.45, leisure: 0.4 },
      { base: 0.61, leisure: 0.9 },
      { base: 0.64, leisure: 0.9 },
      { base: 0.55, leisure: 0.6 },
      { base: 0.61, leisure: 0.7 },
    ],
  },
  {
    id: "dadar",
    name: "Dr Ambedkar Road (Dadar)",
    short: "Dadar",
    kind: "radial",
    forwardLabel: "Southbound",
    reverseLabel: "Northbound",
    freeFlowKph: 28,
    match: (r) => /ambedkar marg|ambedkar road|hindmata|khodadad|king's circle|lalbaug|tilak bridge/i.test(r.name),
    anchors: [
      { name: "King's Circle", lng: 72.856, lat: 19.027 },
      { name: "Dadar TT", lng: 72.8475, lat: 19.0175 },
      { name: "Parel", lng: 72.8405, lat: 19.005 },
      { name: "Lalbaug", lng: 72.836, lat: 18.99 },
      { name: "Byculla", lng: 72.834, lat: 18.976 },
    ],
    segments: [
      { base: 0.74, midday: 0.12, leisure: 0.5 },
      { base: 0.83, midday: 0.14, leisure: 0.6 },
      { base: 0.64, midday: 0.1 },
      { base: 0.48, midday: 0.06 },
    ],
  },
];

// Congestion areas: busy districts and junction clusters whose load spills
// onto every nearby road, not just the named corridors.
export interface TrafficArea {
  id: string;
  name: string;
  lng: number;
  lat: number;
  radiusM: number;
  base: number;
  /** 0..1 — how much of the load is office commute. */
  commute: number;
  midday?: number;
  leisure?: number;
}

export const TRAFFIC_AREAS: TrafficArea[] = [
  { id: "bkc", name: "BKC", lng: 72.866, lat: 19.065, radiusM: 1400, base: 0.82, commute: 1, midday: 0.14 },
  { id: "kurla", name: "Kurla", lng: 72.88, lat: 19.069, radiusM: 1500, base: 0.84, commute: 0.8, midday: 0.16, leisure: 0.3 },
  { id: "saki-naka", name: "Saki Naka", lng: 72.888, lat: 19.103, radiusM: 1200, base: 0.88, commute: 0.9, midday: 0.16 },
  { id: "andheri", name: "Andheri", lng: 72.848, lat: 19.119, radiusM: 1700, base: 0.8, commute: 0.7, midday: 0.12, leisure: 0.6 },
  { id: "powai", name: "Powai", lng: 72.907, lat: 19.119, radiusM: 1700, base: 0.72, commute: 0.8, midday: 0.12, leisure: 0.5 },
  { id: "dadar", name: "Dadar", lng: 72.843, lat: 19.019, radiusM: 1500, base: 0.78, commute: 0.6, midday: 0.12, leisure: 0.8 },
  { id: "sion", name: "Sion", lng: 72.863, lat: 19.043, radiusM: 1200, base: 0.8, commute: 0.8, midday: 0.1 },
  { id: "chembur", name: "Chembur", lng: 72.899, lat: 19.061, radiusM: 1500, base: 0.72, commute: 0.6, midday: 0.08, leisure: 0.5 },
  { id: "ghatkopar", name: "Ghatkopar", lng: 72.909, lat: 19.086, radiusM: 1400, base: 0.76, commute: 0.7, midday: 0.1, leisure: 0.4 },
  { id: "lower-parel", name: "Lower Parel", lng: 72.829, lat: 18.999, radiusM: 1400, base: 0.72, commute: 0.8, midday: 0.08, leisure: 0.8 },
  { id: "bandra", name: "Bandra West", lng: 72.835, lat: 19.059, radiusM: 1400, base: 0.68, commute: 0.4, leisure: 1 },
  { id: "malad", name: "Malad West", lng: 72.84, lat: 19.184, radiusM: 1600, base: 0.66, commute: 0.4, leisure: 1 },
  { id: "goregaon", name: "Goregaon East", lng: 72.861, lat: 19.162, radiusM: 1300, base: 0.68, commute: 0.8, midday: 0.06, leisure: 0.4 },
  { id: "borivali", name: "Borivali", lng: 72.856, lat: 19.229, radiusM: 1400, base: 0.62, commute: 0.6, leisure: 0.5 },
  { id: "mulund", name: "Mulund", lng: 72.953, lat: 19.172, radiusM: 1300, base: 0.6, commute: 0.7, leisure: 0.3 },
  { id: "fort", name: "Fort / CSMT", lng: 72.835, lat: 18.939, radiusM: 1700, base: 0.62, commute: 1, midday: 0.06 },
];
