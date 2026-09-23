// The frontend's API boundary. Every page/component that needs data goes
// through one of these — never through src/data/mock directly — so mock
// bodies can be replaced with REST/WebSocket calls later without touching
// any UI component.
export { fleetService } from "./fleetService";
export { routeService } from "./routeService";
export { eventService } from "./eventService";
export { issueService } from "./issueService";
export { analyticsService } from "./analyticsService";
export { mediaService } from "./mediaService";
export { trafficService } from "./trafficService";
