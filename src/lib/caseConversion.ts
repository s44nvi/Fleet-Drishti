// Converts snake_case object keys (as returned by the backend) into
// camelCase (as the rest of this frontend's types expect), recursively.
// Single centralized transform point — used at the service-layer response
// boundary only; components and types never see snake_case.

function snakeToCamelKey(key: string): string {
  return key.replace(/_([a-zA-Z0-9])/g, (_match, char: string) => char.toUpperCase());
}

export function keysToCamelCase<T = unknown>(value: unknown): T {
  if (Array.isArray(value)) {
    return value.map((item) => keysToCamelCase(item)) as T;
  }

  if (value !== null && typeof value === "object" && value.constructor === Object) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[snakeToCamelKey(key)] = keysToCamelCase(val);
    }
    return result as T;
  }

  return value as T;
}
