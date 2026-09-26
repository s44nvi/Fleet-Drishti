// External urban-intelligence signals from publicly available reporting.
//
// NOT Fleet Drishti data. Nothing here was observed by the fleet's cameras —
// each entry summarises a published report and keeps its provenance
// (who said it, where it was published, when, and a link) so the UI can
// show it as outside context next to, never merged with, fleet observations.
//
// `kind` says whose signal it is:
//   bmc            civic body data / statements (BMC), as reported
//   traffic-police Mumbai Traffic Police advisories, as reported
//   news           independent reporting or third-party indices
//   citizen        resident complaints / accounts — anecdotal, unverified
//
// Figures are quoted as published; they were checked against the linked
// article on 25 Sep 2026. Update by editing this file — there is no feed.

export type PublicSignalKind = "bmc" | "traffic-police" | "news" | "citizen";
export type PublicSignalTopic = "potholes" | "waterlogging" | "congestion" | "road-closures" | "road-quality";

export interface PublicCityInsight {
  id: string;
  kind: PublicSignalKind;
  topic: PublicSignalTopic;
  /** Headline figure as published, e.g. "3,108". Omitted when the report has none. */
  figure?: string;
  figureLabel?: string;
  headline: string;
  summary: string;
  /** Places named in the report. */
  places: string[];
  publisher: string;
  publishedOn: string; // ISO date
  url: string;
  /**
   * Where the fleet's own (fixture) data touches the same place/topic, if
   * anywhere. Plain text, shown as a cross-check — never as confirmation.
   */
  fleetCrossCheck?: { text: string; href: string };
}

export const PUBLIC_CITY_INSIGHTS: PublicCityInsight[] = [
  {
    id: "pub-potholes-2026",
    kind: "bmc",
    topic: "potholes",
    figure: "3,108",
    figureLabel: "pothole complaints this monsoon",
    headline: "Pothole complaints fall year on year",
    summary:
      "BMC reports 3,108 pothole complaints so far this monsoon, down from 3,770 in the same period last year, and credits cement concretisation of roads.",
    places: ["Mumbai"],
    publisher: "Free Press Journal",
    publishedOn: "2026-07-19",
    url: "https://www.freepressjournal.in/mumbai/bmc-receives-3108-pothole-complaints-this-monsoon-down-from-3770-last-year-due-to-cement-concretisation",
    fleetCrossCheck: { text: "Fleet has 1 open pothole issue, seen by 3 buses", href: "/road-issues" },
  },
  {
    id: "pub-potholes-wards-2025",
    kind: "bmc",
    topic: "potholes",
    figure: "10,361",
    figureLabel: "complaints, 1 Jun – 19 Aug 2025",
    headline: "Eastern suburbs led last monsoon's pothole complaints",
    summary:
      "S ward (Powai, Bhandup) logged the most complaints (1,802), followed by K-West (Andheri, Juhu), N (Ghatkopar) and T (Mulund). 8,983 were resolved.",
    places: ["Powai", "Bhandup", "Andheri", "Ghatkopar", "Mulund"],
    publisher: "Free Press Journal",
    publishedOn: "2025-08-20",
    url: "https://www.freepressjournal.in/mumbai/mumbai-roads-bmc-receives-over-10000-pothole-complaints-between-june-to-august-amid-heavy-rains-8983-cases-resolved",
  },
  {
    id: "pub-waterlogging-2025",
    kind: "news",
    topic: "waterlogging",
    headline: "The same junctions flood first",
    summary:
      "After the 26 May downpour, Hindmata, Dadar, Sion, Wadala, King's Circle and Chunabhatti were waterlogged; the BMC commissioner ordered pumping-station fixes.",
    places: ["Hindmata", "Dadar", "Sion", "Wadala", "King's Circle", "Chunabhatti"],
    publisher: "Free Press Journal",
    publishedOn: "2025-06-03",
    url: "https://www.freepressjournal.in/mumbai/mumbai-monsoon-2025-bmc-chief-bhushan-gagrani-inspects-flood-prone-areas-after-hindmata-sion-wadala-hit-by-waterlogging",
    fleetCrossCheck: { text: "Fleet recorded waterlogging at Hindmata", href: "/road-issues" },
  },
  {
    id: "pub-visarjan-2026",
    kind: "traffic-police",
    topic: "road-closures",
    headline: "Anant Chaturdashi restrictions on JVLR and the expressways",
    summary:
      "Heavy vehicles restricted on JVLR and kept on the Western and Eastern Express Highways; no parking between L&T Flyover and IIT Market Gate. 22,000+ personnel deployed.",
    places: ["JVLR", "Western Express Highway", "Eastern Express Highway", "Lalbaug"],
    publisher: "Free Press Journal",
    publishedOn: "2026-09-25",
    url: "https://www.freepressjournal.in/mumbai/mumbai-ganpati-visarjan-2026-traffic-restrictions-road-closures-no-parking-zones-across-city-for-anant-chaturdashi-check-details-mumbai-news",
  },
  {
    id: "pub-tomtom-2025",
    kind: "news",
    topic: "congestion",
    figure: "126 h",
    figureLabel: "lost to congestion per commuter, 2025",
    headline: "Mumbai congestion eased slightly in 2025",
    summary:
      "The TomTom Traffic Index 2025 shows annual time lost to congestion in Mumbai falling to 126 hours, a marginal improvement, while Pune overtook it.",
    places: ["Mumbai"],
    publisher: "Down To Earth",
    publishedOn: "2026-01-27",
    url: "https://www.downtoearth.org.in/urbanisation/bengaluru-kolkata-among-worlds-slowest-cities-as-india-ranks-high-on-congestion-index",
  },
  {
    id: "pub-residents-2026",
    kind: "citizen",
    topic: "road-quality",
    headline: "Residents flag patchy repairs on non-concretised roads",
    summary:
      "Residents quoted in the same report describe uneven pothole repairs and half-finished concretisation that leave hazardous surfaces for two-wheeler riders.",
    places: ["Mumbai"],
    publisher: "Free Press Journal",
    publishedOn: "2026-07-19",
    url: "https://www.freepressjournal.in/mumbai/bmc-receives-3108-pothole-complaints-this-monsoon-down-from-3770-last-year-due-to-cement-concretisation",
  },
];
