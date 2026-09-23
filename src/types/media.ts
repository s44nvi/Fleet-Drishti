import type { BoundingBox } from "./detection";

// Data contract between bus camera footage + model output and the
// DetectionPlayer. Real recorded clips and demo frames share this shape; the
// `source` field is what the UI badges, and it must be truthful:
//
//   "live"     — a real, current stream (not available in this prototype)
//   "recorded" — real footage captured by a bus camera, with real model output
//   "demo"     — no footage attached; an illustrative frame with a stored
//                detection record drawn on it
export type MediaSource = "live" | "recorded" | "demo";

export interface DetectionBox {
  /** Model class name, e.g. "pothole", "car", "no-helmet". */
  label: string;
  /** 0..1 */
  confidence: number;
  /** Normalised to the frame: x/y = top-left corner, all values 0..1. */
  box: BoundingBox;
  trackId?: string;
}

export interface DetectionFrame {
  /** Seconds from the start of the clip. */
  t: number;
  boxes: DetectionBox[];
}

export type ClipMedia =
  | { kind: "video"; url: string; poster?: string }
  | { kind: "image"; url: string }
  | { kind: "none" };

export interface DetectionClip {
  clipId: string;
  source: MediaSource;
  busId: string;
  cameraId: string;
  routeId?: string;
  /** Wall-clock time of the clip's first frame (ISO 8601). */
  capturedAt: string;
  location: string;
  latitude?: number;
  longitude?: number;
  media: ClipMedia;
  frames: DetectionFrame[];
  /** The validated Event this clip backs, when one exists. */
  eventId?: string;
  /** Only set when the model output itself declares it — never guessed. */
  model?: { name: string; version?: string };
}
