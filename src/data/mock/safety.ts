import type { SafetyEvent } from "../../types";

export const mockSafetyEvents: SafetyEvent[] = [
  { safetyEventId: "SE-1", type: "pedestrian-conflict", location: "Sion Circle", latitude: 19.0433, longitude: 72.8622, severity: "high", confidence: 89, busId: "BUS-22", observedAt: "2026-09-12T10:39:42+05:30" },
  { safetyEventId: "SE-2", type: "pedestrian-conflict", location: "Sion Circle", latitude: 19.044, longitude: 72.863, severity: "medium", confidence: 81, busId: "BUS-64", observedAt: "2026-09-12T10:44:03+05:30" },
  { safetyEventId: "SE-3", type: "crossing-risk", location: "Bandra West", latitude: 19.0596, longitude: 72.8295, severity: "medium", confidence: 74, busId: "BUS-418", observedAt: "2026-09-12T10:30:11+05:30" },
  { safetyEventId: "SE-4", type: "near-miss", location: "BKC / Kurla", latitude: 19.0662, longitude: 72.8686, severity: "high", confidence: 86, busId: "BUS-507", observedAt: "2026-09-12T10:27:52+05:30" },
  { safetyEventId: "SE-5", type: "crossing-risk", location: "Chembur", latitude: 19.0522, longitude: 72.9005, severity: "low", confidence: 65, busId: "BUS-108", observedAt: "2026-09-12T10:22:09+05:30" },
  { safetyEventId: "SE-6", type: "pedestrian-conflict", location: "Andheri East", latitude: 19.1197, longitude: 72.8468, severity: "medium", confidence: 77, busId: "BUS-101", observedAt: "2026-09-12T10:18:33+05:30" },
];
