export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// A single raw, frame-level inference produced by the onboard edge AI model,
// before tracking/dedup promotes it into a validated Event.
export interface Detection {
  detectionId: string;
  cameraId: string;
  busId: string;
  frameTimestamp: string;
  objectClass: string;
  boundingBox: BoundingBox;
  confidence: number;
  eventId?: string;
}
