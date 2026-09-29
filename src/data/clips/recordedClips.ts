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
export const recordedClips: DetectionClip[] = [
  {
    clipId: "IMG_7729-BUS-014",
    source: "recorded",
    busId: "BUS-014",
    cameraId: "CAM-014-FRONT",
    capturedAt: "2026-09-22T17:37:41+05:30",
    location: "Near 19.1304, 72.8968 (clip geotag) · GPS SIMULATED, sample footage",
    latitude: 19.1304,
    longitude: 72.8968,
    media: { kind: "video", url: "/media/clips/clip1-bus014.mp4" },
    frames: [],
  },
  {
    clipId: "IMG_7755-BUS-027",
    source: "recorded",
    busId: "BUS-027",
    cameraId: "CAM-027-FRONT",
    capturedAt: "2026-09-24T17:05:50+05:30",
    location: "Near 19.0930, 72.9001 (clip geotag) · GPS SIMULATED, sample footage",
    latitude: 19.093,
    longitude: 72.9001,
    media: { kind: "video", url: "/media/clips/clip2-bus027.mp4" },
    frames: [],
  },
  {
    clipId: "IMG_7728-BUS-028",
    source: "recorded",
    busId: "BUS-028",
    cameraId: "CAM-028-FRONT",
    capturedAt: "2026-09-22T17:35:19+05:30",
    location: "Near 19.1258, 72.8943 (clip geotag) · excerpt 68-83 s of IMG_7728 · GPS SIMULATED, sample footage",
    latitude: 19.1258,
    longitude: 72.8943,
    media: { kind: "video", url: "/media/clips/img7728-bus028.mp4" },
    frames: [],
  },
  {
    clipId: "IMG_7730-BUS-030",
    source: "recorded",
    busId: "BUS-030",
    cameraId: "CAM-030-FRONT",
    capturedAt: "2026-09-22T18:09:39+05:30",
    location: "Near 19.1521, 72.8915 (clip geotag) · excerpt 1-21 s of IMG_7730 · GPS SIMULATED, sample footage",
    latitude: 19.1521,
    longitude: 72.8915,
    media: { kind: "video", url: "/media/clips/img7730-bus030.mp4" },
    frames: [],
  },
  {
    clipId: "IMG_7758-BUS-058",
    source: "recorded",
    busId: "BUS-058",
    cameraId: "CAM-058-FRONT",
    capturedAt: "2026-09-24T17:11:53+05:30",
    location: "Near 19.1005, 72.8913 (clip geotag) · GPS SIMULATED, sample footage",
    latitude: 19.1005,
    longitude: 72.8913,
    media: { kind: "video", url: "/media/clips/img7758-bus058.mp4" },
    frames: [],
  },
  {
    clipId: "WA_1447-BUS-090",
    source: "recorded",
    busId: "BUS-090",
    cameraId: "CAM-090-FRONT",
    capturedAt: "2026-09-12T14:47:21+05:30",
    location: "Sample location (not the actual capture site) · sample footage",
    media: { kind: "video", url: "/media/clips/wa1447-bus090.mp4" },
    frames: [],
  },
];
