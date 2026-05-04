/**
 * Standalone HTTP client for integration tests.
 *
 * Mirrors the interface of src/api/config.ts but works in Node.js
 * without Vite/import.meta.env dependencies.
 *
 * Includes retry logic because Caddy briefly restarts its admin listener
 * when config changes are applied.
 */

const BASE_URL = process.env["CADDY_TEST_URL"] ?? "http://localhost:12019";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 100;

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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(path: string, options?: { method?: string; body?: unknown }): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const headers: Record<string, string> = {
    // Set Origin to match Caddy's expected origins, preventing origin enforcement issues.
    // Node.js fetch sends Sec-Fetch-Mode which triggers Caddy's origin check.
    Origin: BASE_URL,
  };
  let bodyStr: string | undefined;

  if (options?.body !== undefined) {
    headers["Content-Type"] = "application/json";
    bodyStr = JSON.stringify(options.body);
  }

  // Retry on connection errors (Caddy restarts admin listener during config changes)
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: options?.method ?? "GET",
        headers,
        body: bodyStr,
      });

      // Handle no-content responses
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
    } catch (err) {
      // Don't retry API errors (4xx/5xx) — only retry connection failures
      if (err instanceof CaddyApiError) {
        throw err;
      }
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  throw lastError;
}

/**
 * Config API client for integration tests.
 * Directly communicates with Caddy Admin API on the configured port.
 */
export const configApi = {
  /** Get the full config or a sub-path of it. */
  get: <T>(path?: string): Promise<T> => {
    const endpoint = path ? `/config/${path}` : "/config/";
    return request<T>(endpoint);
  },

  /** Append a value to an array at the given config path (POST). */
  post: <T>(path: string, value: T): Promise<void> => {
    return request<void>(`/config/${path}`, { method: "POST", body: value });
  },

  /** Create a new key at the given config path (PUT). Fails with 409 if key exists. */
  put: <T>(path: string, value: T): Promise<void> => {
    return request<void>(`/config/${path}`, { method: "PUT", body: value });
  },

  /** Replace the value at an existing config path (PATCH). Fails with 404 if key doesn't exist. */
  patch: <T>(path: string, value: T): Promise<void> => {
    return request<void>(`/config/${path}`, { method: "PATCH", body: value });
  },

  /** Delete the config at the given path. */
  delete: (path: string): Promise<void> => {
    return request<void>(`/config/${path}`, { method: "DELETE" });
  },

  /** Load a complete new configuration, replacing everything. */
  load: (config: unknown): Promise<void> => {
    return request<void>("/load", { method: "POST", body: config });
  },
};
