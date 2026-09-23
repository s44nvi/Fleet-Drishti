import type { Detection, Event } from "../types";
import { mockDetections, mockEvents } from "../data/mock";
import { mockAsync } from "./mockAsync";

// The ingestion side of the pipeline: raw Detections and the validated
// Events promoted from them. This is what the Live AI screen and the
// Command Center's live intelligence feed consume.
export const eventService = {
  listDetections(): Promise<Detection[]> {
    return mockAsync(mockDetections);
  },

  listDetectionsByBus(busId: string): Promise<Detection[]> {
    return mockAsync(mockDetections.filter((detection) => detection.busId === busId));
  },

  listEvents(): Promise<Event[]> {
    return mockAsync(mockEvents);
  },

  listEventsByBus(busId: string): Promise<Event[]> {
    return mockAsync(mockEvents.filter((event) => event.busId === busId));
  },

  listEventsByIds(eventIds: string[]): Promise<Event[]> {
    const idSet = new Set(eventIds);
    return mockAsync(mockEvents.filter((event) => idSet.has(event.eventId)));
  },

  getEventById(eventId: string): Promise<Event | undefined> {
    return mockAsync(mockEvents.find((event) => event.eventId === eventId));
  },

  // The raw frame-level Detection an Event was promoted from, if any —
  // carries the bounding box used to annotate the Live AI Observation demo
  // frame instead of leaving it an unlabeled placeholder.
  getDetectionForEvent(eventId: string): Promise<Detection | undefined> {
    return mockAsync(mockDetections.find((detection) => detection.eventId === eventId));
  },
};
