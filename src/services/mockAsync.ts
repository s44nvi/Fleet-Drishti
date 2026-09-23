// Wraps a mock value in a Promise with a small artificial delay so every
// service call already behaves like a network request — components built
// against this today won't need to change when a service swaps its mock
// body for a real `fetch`/WebSocket call.
export function mockAsync<T>(value: T, delayMs = 120): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), delayMs);
  });
}
