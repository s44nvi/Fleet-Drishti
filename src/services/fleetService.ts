import type { Bus, Camera } from "../types";
import { mockBuses, mockCameras } from "../data/mock";
import { mockAsync } from "./mockAsync";

// Public-transport fleet + onboard camera data. Backed by mock fixtures
// today; swap the bodies below for `fetch`/WebSocket calls later without
// touching any component that imports this service.
export const fleetService = {
  listBuses(): Promise<Bus[]> {
    return mockAsync(mockBuses);
  },

  getBusById(busId: string): Promise<Bus | undefined> {
    return mockAsync(mockBuses.find((bus) => bus.busId === busId));
  },

  listCameras(): Promise<Camera[]> {
    return mockAsync(mockCameras);
  },

  listCamerasByBus(busId: string): Promise<Camera[]> {
    return mockAsync(mockCameras.filter((camera) => camera.busId === busId));
  },

  getCameraById(cameraId: string): Promise<Camera | undefined> {
    return mockAsync(mockCameras.find((camera) => camera.cameraId === cameraId));
  },
};
