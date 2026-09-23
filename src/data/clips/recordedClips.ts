import type { DetectionClip } from "../../types";

// Real recorded bus-camera clips with real model output. Empty until footage
// is attached — nothing here may be marked "recorded" unless it is genuine.
//
// To connect a clip:
//  1. Put the video in public/media/clips/<clipId>.mp4 (served at /media/clips/…).
//  2. Run the model over it and convert its output with
//     framesFromModelOutput() from lib/clipAdapter.ts.
//  3. Add an entry:
//
//  {
//    clipId: "BUS-101-2026-09-12-1040",
//    source: "recorded",
//    busId: "BUS-101",
//    cameraId: "CAM-101-FRONT",
//    routeId: "BEST-9",
//    capturedAt: "2026-09-12T10:40:00+05:30",
//    location: "S.V. Road, Andheri East",
//    media: { kind: "video", url: "/media/clips/BUS-101-2026-09-12-1040.mp4" },
//    frames: framesFromModelOutput(modelOutputJson),
//    model: { name: "<model name from its output>" },
//  }
export const recordedClips: DetectionClip[] = [];
