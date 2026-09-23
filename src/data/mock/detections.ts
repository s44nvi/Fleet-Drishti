import type { Detection } from "../../types";

// Raw, frame-level edge AI inferences. Detection volume is always higher
// than Event volume — most detections get promoted to an Event by the
// tracking/dedup stage, but low-confidence or redundant ones are dropped
// (see DET-1009 / DET-1010, which never received an eventId).
export const mockDetections: Detection[] = [
  { detectionId: "DET-1001", cameraId: "CAM-101-FRONT", busId: "BUS-101", frameTimestamp: "2026-09-12T10:40:01+05:30", objectClass: "pothole", boundingBox: { x: 0.42, y: 0.61, width: 0.18, height: 0.12 }, confidence: 88, eventId: "EVT-10482-A" },
  { detectionId: "DET-1002", cameraId: "CAM-312-FRONT", busId: "BUS-312", frameTimestamp: "2026-09-12T10:41:14+05:30", objectClass: "pothole", boundingBox: { x: 0.38, y: 0.58, width: 0.21, height: 0.14 }, confidence: 91, eventId: "EVT-10482-B" },
  { detectionId: "DET-1003", cameraId: "CAM-418-FRONT", busId: "BUS-418", frameTimestamp: "2026-09-12T10:42:17+05:30", objectClass: "pothole", boundingBox: { x: 0.45, y: 0.63, width: 0.16, height: 0.11 }, confidence: 85, eventId: "EVT-10482-C" },
  { detectionId: "DET-1004", cameraId: "CAM-507-FRONT", busId: "BUS-507", frameTimestamp: "2026-09-12T10:41:04+05:30", objectClass: "stalled-traffic", boundingBox: { x: 0.1, y: 0.4, width: 0.8, height: 0.3 }, confidence: 87, eventId: "EVT-CONGESTION-1" },
  { detectionId: "DET-1005", cameraId: "CAM-22-FRONT", busId: "BUS-22", frameTimestamp: "2026-09-12T10:39:41+05:30", objectClass: "pedestrian", boundingBox: { x: 0.5, y: 0.5, width: 0.08, height: 0.22 }, confidence: 89, eventId: "EVT-PED-1" },
  { detectionId: "DET-1006", cameraId: "CAM-64-FRONT", busId: "BUS-64", frameTimestamp: "2026-09-12T10:44:02+05:30", objectClass: "pedestrian", boundingBox: { x: 0.47, y: 0.52, width: 0.09, height: 0.2 }, confidence: 81, eventId: "EVT-PED-2" },
  { detectionId: "DET-1007", cameraId: "CAM-108-FRONT", busId: "BUS-108", frameTimestamp: "2026-09-12T10:35:10+05:30", objectClass: "waterlogging", boundingBox: { x: 0.2, y: 0.65, width: 0.6, height: 0.25 }, confidence: 78, eventId: "EVT-WATER-1" },
  { detectionId: "DET-1008", cameraId: "CAM-108-FRONT", busId: "BUS-108", frameTimestamp: "2026-09-12T10:36:39+05:30", objectClass: "stalled-vehicle", boundingBox: { x: 0.3, y: 0.55, width: 0.35, height: 0.2 }, confidence: 84, eventId: "EVT-LANE-1" },
  { detectionId: "DET-1009", cameraId: "CAM-101-SIDE", busId: "BUS-101", frameTimestamp: "2026-09-12T10:40:45+05:30", objectClass: "pothole", boundingBox: { x: 0.05, y: 0.7, width: 0.06, height: 0.04 }, confidence: 41 },
  { detectionId: "DET-1010", cameraId: "CAM-312-FRONT", busId: "BUS-312", frameTimestamp: "2026-09-12T10:41:50+05:30", objectClass: "pothole", boundingBox: { x: 0.02, y: 0.68, width: 0.05, height: 0.03 }, confidence: 37 },
];
