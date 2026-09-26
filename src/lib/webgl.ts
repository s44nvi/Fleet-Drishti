// Proactive capability check, run before ever calling MapLibre's init
// code. MapLibre (via maplibre-gl-js) requires WebGL2; without it, its
// constructor throws a GPUInitializationError synchronously, which would
// otherwise be the first (and preventable) way the map can fail.
export function isWebGL2Supported(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2"));
  } catch {
    return false;
  }
}
