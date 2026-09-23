import {
  Bus,
  Building2,
  ChartColumn,
  Construction,
  LayoutDashboard,
  ListOrdered,
  Map,
  Route,
  ScanEye,
  ShieldAlert,
  TrafficCone,
  Video,
} from "lucide-react";
import type { NavLeafItem } from "../types";

// Primary workspaces — each answers one question (see MASTER.md §13).
export const NAV_ITEMS: NavLeafItem[] = [
  { label: "Command Center", path: "/", icon: LayoutDashboard },
  { label: "Live Map", path: "/live-map", icon: Map },
  { label: "Fleet", path: "/fleet", icon: Bus },
  { label: "Road Issues", path: "/road-issues", icon: Construction },
  { label: "Traffic", path: "/traffic", icon: TrafficCone },
  { label: "Safety", path: "/safety", icon: ShieldAlert },
  { label: "Infrastructure", path: "/infrastructure", icon: Building2 },
  { label: "Analytics", path: "/analytics", icon: ChartColumn },
];

// Existing secondary screens, previously reachable only through inline
// links. Listed quietly under the primary nav so they stay discoverable.
export const SECONDARY_NAV_ITEMS: NavLeafItem[] = [
  { label: "Action queue", path: "/priority-queue", icon: ListOrdered },
  { label: "AI detections", path: "/live-ai", icon: ScanEye },
  { label: "Routes", path: "/routes", icon: Route },
  { label: "Cameras", path: "/cameras", icon: Video },
];
