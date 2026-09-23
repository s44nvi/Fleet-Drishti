// Mock fixtures, one module per domain. These are consumed only by
// src/services — components should never import from here directly, so
// this whole directory can be deleted once real APIs exist.
export { mockBuses } from "./buses";
export { mockRoutes } from "./routes";
export { mockCameras } from "./cameras";
export { mockDetections } from "./detections";
export { mockEvents } from "./events";
export { mockIssues } from "./issues";
export { mockTrafficHotspots } from "./traffic";
export { mockSafetyEvents } from "./safety";
export { mockInfrastructureIssues } from "./infrastructure";
