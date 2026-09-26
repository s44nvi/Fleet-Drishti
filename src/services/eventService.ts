import type { Detection, Event, EventType } from "../types";
import { mockDetections } from "../data/mock";
import { mockAsync } from "./mockAsync";
import { apiRequest, ApiError } from "../lib/apiClient";

// Real backend EventOut shape (already camelCased by apiClient) — only the
// fields that genuinely exist on the backend today.
interface BackendEvent {
  id: string;
  type: string;
  subtype: string;
  confidence: number;
  lat: number;
  lng: number;
  timestamp: string;
  busId: string;
  routeId: string | null;
  cameraId: string | null;
  issueId: string | null;
  createdAt: string;
}

// Maps a real backend Event onto the full frontend Event shape.
//
// Fields that genuinely exist and match: id, type, subtype, confidence
// (0-1 -> 0-100 scale), lat/lng, timestamp, busId, routeId, cameraId.
//
// The backend has no per-event severity, location string, evidence URL, or
// metadata — left genuinely empty/placeholder below (never fabricated),
// per the confirmed category-(b) scope. `severity` is required by this
// type, so "low" is used as a safe fallback with the same caveat as
// mapBackendIssue. `type` is passed through as-is (category-(b) taxonomy
// mismatch — not translated here).
function mapBackendEvent(event: BackendEvent): Event {
  return {
    eventId: event.id,
    eventType: event.type as EventType,
    subtype: event.subtype,
    severity: "low",
    confidence: Math.round(event.confidence * 100),
    busId: event.busId,
    routeId: event.routeId ?? "",
    cameraId: event.cameraId ?? "",
    timestamp: event.timestamp,
    latitude: event.lat,
    longitude: event.lng,
    location: "",
    evidenceUrl: "",
    metadata: {},
  };
}

// The ingestion side of the pipeline: raw Detections and the validated
// Events promoted from them. This is what the Live AI screen and the
// Command Center's live intelligence feed consume.
//
// Detections (frame-level, pre-Event) have no backend equivalent at all
// (confirmed: the backend only ever stores validated Events) — these stay
// on mock fixtures, unchanged.
export const eventService = {
  listDetections(): Promise<Detection[]> {
    return mockAsync(mockDetections);
  },

  listDetectionsByBus(busId: string): Promise<Detection[]> {
    return mockAsync(mockDetections.filter((detection) => detection.busId === busId));
  },

  async listEvents(): Promise<Event[]> {
    const events = await apiRequest<BackendEvent[]>("/events");
    return events.map(mapBackendEvent);
  },

  async listEventsByBus(busId: string): Promise<Event[]> {
    const events = await this.listEvents();
    return events.filter((event) => event.busId === busId);
  },

  async listEventsByIds(eventIds: string[]): Promise<Event[]> {
    const idSet = new Set(eventIds);
    const events = await this.listEvents();
    return events.filter((event) => idSet.has(event.eventId));
  },

  async getEventById(eventId: string): Promise<Event | undefined> {
    try {
      const event = await apiRequest<BackendEvent>(`/events/${eventId}`);
      return mapBackendEvent(event);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return undefined;
      }
      throw error;
    }
  },

  // The raw frame-level Detection an Event was promoted from, if any —
  // carries the bounding box used to annotate the Live AI Observation demo
  // frame instead of leaving it an unlabeled placeholder.
  getDetectionForEvent(eventId: string): Promise<Detection | undefined> {
    return mockAsync(mockDetections.find((detection) => detection.eventId === eventId));
  },
};
