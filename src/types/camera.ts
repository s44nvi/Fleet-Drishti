export type CameraPosition = "front" | "side-left" | "side-right" | "rear";
export type CameraStatus = "online" | "offline" | "degraded";

// A single edge camera mounted on a bus, feeding the onboard inference engine.
export interface Camera {
  cameraId: string;
  busId: string;
  position: CameraPosition;
  status: CameraStatus;
  resolution: string;
  fps: number;
  lastHeartbeatAt: string;
}
