import type { DetectionClip } from "../types";
import { mockDetections, mockEvents } from "../data/mock";
import { recordedClips } from "../data/clips/recordedClips";
import { mockAsync } from "./mockAsync";

// Detection media for the DetectionPlayer. Real recorded clips (when any are
// attached — see data/clips/recordedClips.ts) come first; after them, one
// DEMO clip per stored Detection that was promoted to an Event. Demo clips
// carry no footage: the player draws the stored bounding box, class and
// confidence over an illustrative frame and badges it DEMO.
function demoClips(): DetectionClip[] {
  return mockDetections
    .filter((detection) => detection.eventId)
    .map((detection) => {
      const event = mockEvents.find((e) => e.eventId === detection.eventId);
      return {
        clipId: `demo-${detection.detectionId}`,
        source: "demo",
        busId: detection.busId,
        cameraId: detection.cameraId,
        routeId: event?.routeId,
        capturedAt: detection.frameTimestamp,
        location: event ? [event.location, event.landmark].filter(Boolean).join(" · ") : "Unknown location",
        latitude: event?.latitude,
        longitude: event?.longitude,
        media: { kind: "none" },
        frames: [
          {
            t: 0,
            boxes: [{ label: detection.objectClass, confidence: detection.confidence / 100, box: detection.boundingBox }],
          },
        ],
        eventId: detection.eventId,
      } satisfies DetectionClip;
    })
    .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
}

export const mediaService = {
  listDetectionClips(): Promise<DetectionClip[]> {
    return mockAsync([...recordedClips, ...demoClips()]);
  },

  listDetectionClipsForEvents(eventIds: string[]): Promise<DetectionClip[]> {
    const ids = new Set(eventIds);
    return mockAsync([...recordedClips, ...demoClips()].filter((clip) => clip.eventId && ids.has(clip.eventId)));
  },

  listDetectionClipsForBus(busId: string): Promise<DetectionClip[]> {
    return mockAsync([...recordedClips, ...demoClips()].filter((clip) => clip.busId === busId));
  },
};
