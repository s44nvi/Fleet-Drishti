export type EvidenceType = "image" | "video-clip";

// A captured artifact backing an Event/Issue — what a reviewer would open to
// verify a detection before it is acted on.
export interface Evidence {
  evidenceId: string;
  eventId: string;
  busId: string;
  cameraId: string;
  capturedAt: string;
  thumbnailUrl: string;
  type: EvidenceType;
  piiRedacted: boolean;
}
