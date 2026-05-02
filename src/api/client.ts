/**
 * Base API client for communicating with Caddy's Admin API.
 *
 * In production, the UI is served at /ui/ and the API is reverse-proxied
 * at /ui/api/ → localhost:2019. In development, Vite's proxy handles this.
 */

const API_BASE = import.meta.env["VITE_CADDY_API_BASE"] ?? "/ui/api";

/** Error thrown when the Caddy Admin API returns a non-2xx response. */
export class CaddyApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly body: unknown;

  constructor(status: number, statusText: string, body: unknown) {
    const message =
      typeof body === "object" && body !== null && "error" in body
        ? String((body as { error: string }).error)
        : `HTTP ${status}: ${statusText}`;
    super(message);
    this.name = "CaddyApiError";
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

/** Error thrown when the network request itself fails (no response received). */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super("Unable to connect to Caddy Admin API");
    this.name = "NetworkError";
    this.cause = cause;
  }
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

/**
 * Typed fetch wrapper that handles JSON serialization, error classification,
 * and base URL resolution.
 */
export async function request<T>(path: string, options?: RequestOptions): Promise<T> {
  const url = `${API_BASE}${path}`;

  const headers = new Headers(options?.headers);
  let bodyStr: string | undefined;

  if (options?.body !== undefined) {
    if (typeof options.body === "string" && headers.has("Content-Type")) {
      // String body with caller-specified Content-Type (e.g., text/caddyfile) — pass through
      bodyStr = options.body;
    } else {
      headers.set("Content-Type", "application/json");
      bodyStr = JSON.stringify(options.body);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      body: bodyStr,
    });
  } catch (err) {
    throw new NetworkError(err);
  }

  // Handle no-content responses (e.g., successful PUT/DELETE)
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T;
  }

  // Try to parse JSON body
  let body: unknown;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    body = await response.json();
  } else {
    body = await response.text();
  }

  if (!response.ok) {
    throw new CaddyApiError(response.status, response.statusText, body);
  }

  return body as T;
}

/**
 * Check if the Admin API is reachable by fetching the root config.
 * Returns true if connected, false otherwise.
 */
export async function checkConnection(): Promise<boolean> {
  try {
    await request<unknown>("/config/");
    return true;
  } catch {
    return false;
  }
}
