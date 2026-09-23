import type { DetectionFrame } from "../types";

// Converts raw per-frame model output into DetectionPlayer frames. The
// expected input is the common YOLO-style export: pixel-space xyxy boxes,
// a class id or name, and a confidence per detection.
//
// {
//   "width": 1920, "height": 1080, "fps": 30,
//   "classNames": ["pothole", "car", "bus", "no-helmet"],   // optional
//   "frames": [
//     { "frame": 0, "detections": [{ "bbox": [x1, y1, x2, y2], "cls": 0, "conf": 0.92 }] }
//   ]
// }
//
// `frame` (index) or `t` (seconds) may be given per frame; `cls` may be an
// index into classNames or a class name string.
export interface ModelOutput {
  width: number;
  height: number;
  fps?: number;
  classNames?: string[];
  model?: { name: string; version?: string };
  frames: {
    frame?: number;
    t?: number;
    detections: { bbox: [number, number, number, number]; cls: number | string; conf: number; id?: string | number }[];
  }[];
}

export function framesFromModelOutput(output: ModelOutput): DetectionFrame[] {
  const fps = output.fps ?? 30;
  return output.frames.map((frame) => ({
    t: frame.t ?? (frame.frame ?? 0) / fps,
    boxes: frame.detections.map((d) => {
      const [x1, y1, x2, y2] = d.bbox;
      const label = typeof d.cls === "number" ? output.classNames?.[d.cls] ?? `class-${d.cls}` : d.cls;
      return {
        label,
        confidence: d.conf,
        trackId: d.id !== undefined ? String(d.id) : undefined,
        box: {
          x: x1 / output.width,
          y: y1 / output.height,
          width: (x2 - x1) / output.width,
          height: (y2 - y1) / output.height,
        },
      };
    }),
  }));
}
