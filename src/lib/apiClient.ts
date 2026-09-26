import { keysToCamelCase } from "./caseConversion";

// Base URL of the real Fleet-Drishti backend. Override via .env.local
// (VITE_API_BASE_URL) for a non-default dev setup; see .env.example.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Thrown specifically on 401 so callers (AuthContext) can log the user out
// without every call site needing to know the response shape.
export class UnauthorizedError extends ApiError {
  constructor() {
    super(401, "Session expired or invalid — please log in again.");
  }
}

// Tiny pub-sub so this plain module can tell AuthContext (a React context,
// which apiClient can't import without a circular dependency) that the
// current token was rejected — AuthContext subscribes once and logs out.
type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

function notifyUnauthorized() {
  for (const listener of unauthorizedListeners) listener();
}

// The current access token, mirrored here from AuthContext (the single
// source of truth) so plain service modules — called from many pages —
// can attach it without every call site threading a token through
// useAsyncData(). AuthContext calls setAuthToken() on login/logout.
//
// Read synchronously from localStorage at module init (not just via the
// setAuthToken effect) so a page's very first data fetch after a refresh
// is already authenticated — React runs a child's effects (e.g. a page's
// useAsyncData fetch) before its parent AuthProvider's effect in the same
// commit, so waiting for that effect alone would race the first request.
export const TOKEN_STORAGE_KEY = "fleet-drishti-access-token";
let currentToken: string | null = localStorage.getItem(TOKEN_STORAGE_KEY);

export function setAuthToken(token: string | null) {
  currentToken = token;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  /** Explicit override — omit to use the current logged-in token automatically. */
  token?: string | null;
}

// Plain REST fetch wrapper — no WebSocket/SSE, matching the backend.
// Applies the camelCase transform to every JSON response at this single
// boundary point so nothing downstream ever sees snake_case.
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = options.token !== undefined ? options.token : currentToken;

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401) {
    notifyUnauthorized();
    throw new UnauthorizedError();
  }

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const errorBody = (await response.json()) as { detail?: string };
      detail = errorBody.detail ?? detail;
    } catch {
      // response body wasn't JSON — fall back to statusText
    }
    throw new ApiError(response.status, detail);
  }

  const data: unknown = await response.json();
  return keysToCamelCase<T>(data);
}
