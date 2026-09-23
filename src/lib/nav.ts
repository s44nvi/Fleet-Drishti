import type { NavLeafItem } from "../types";

// Primary top navigation — kept intentionally short. Detail/secondary
// screens (issue detail, bus detail, routes, cameras, priority queue,
// live-ai, architecture) are reached through links on these primary pages,
// not from the nav bar itself.
export const NAV_ITEMS: NavLeafItem[] = [
  { label: "Command Center", path: "/", icon: "grid_view" },
  { label: "Live Map", path: "/live-map", icon: "map" },
  { label: "Road Issues", path: "/road-issues", icon: "warning" },
  { label: "Traffic", path: "/traffic", icon: "traffic" },
  { label: "Safety", path: "/safety", icon: "shield" },
  { label: "Infrastructure", path: "/infrastructure", icon: "domain" },
  { label: "Fleet", path: "/fleet", icon: "directions_bus" },
  { label: "Analytics", path: "/analytics", icon: "monitoring" },
];
