import type { Camera } from "../../types";

export const mockCameras: Camera[] = [
  { cameraId: "CAM-101-FRONT", busId: "BUS-101", position: "front", status: "online", resolution: "1080p", fps: 30, lastHeartbeatAt: "2026-09-12T10:42:30+05:30" },
  { cameraId: "CAM-101-SIDE", busId: "BUS-101", position: "side-left", status: "online", resolution: "720p", fps: 15, lastHeartbeatAt: "2026-09-12T10:42:28+05:30" },
  { cameraId: "CAM-101-REAR", busId: "BUS-101", position: "rear", status: "offline", resolution: "720p", fps: 0, lastHeartbeatAt: "2026-09-12T10:18:02+05:30" },
  { cameraId: "CAM-312-FRONT", busId: "BUS-312", position: "front", status: "online", resolution: "1080p", fps: 30, lastHeartbeatAt: "2026-09-12T10:41:40+05:30" },
  { cameraId: "CAM-418-FRONT", busId: "BUS-418", position: "front", status: "online", resolution: "1080p", fps: 30, lastHeartbeatAt: "2026-09-12T10:42:35+05:30" },
  { cameraId: "CAM-507-FRONT", busId: "BUS-507", position: "front", status: "online", resolution: "1080p", fps: 30, lastHeartbeatAt: "2026-09-12T10:41:20+05:30" },
  { cameraId: "CAM-22-FRONT", busId: "BUS-22", position: "front", status: "online", resolution: "1080p", fps: 30, lastHeartbeatAt: "2026-09-12T10:39:50+05:30" },
  { cameraId: "CAM-108-FRONT", busId: "BUS-108", position: "front", status: "degraded", resolution: "720p", fps: 9, lastHeartbeatAt: "2026-09-12T10:36:50+05:30" },
  { cameraId: "CAM-64-FRONT", busId: "BUS-64", position: "front", status: "online", resolution: "1080p", fps: 30, lastHeartbeatAt: "2026-09-12T10:44:10+05:30" },
];
