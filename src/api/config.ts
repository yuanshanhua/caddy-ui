/**
 * Admin API configuration CRUD operations.
 *
 * Maps to Caddy's /config/ endpoints which support path-based traversal
 * of the JSON config tree.
 */

import type { CaddyConfig } from "@/types/caddy";
import { request } from "./client";

export const configApi = {
  /**
   * Get the full config or a sub-path of it.
   * @param path - Optional path segments (e.g., "apps/http/servers")
   */
  get: <T = CaddyConfig>(path?: string): Promise<T> => {
    const endpoint = path ? `/config/${path}` : "/config/";
    return request<T>(endpoint);
  },

  /**
   * Append a value to an array at the given config path.
   * Uses POST semantics — Caddy appends to the existing array.
   */
  post: <T>(path: string, value: T): Promise<void> => {
    return request<void>(`/config/${path}`, {
      method: "POST",
      body: value,
    });
  },

  /**
   * Replace (overwrite) the config at the given path.
   * Uses PUT semantics — the value completely replaces whatever was there.
   */
  put: <T>(path: string, value: T): Promise<void> => {
    return request<void>(`/config/${path}`, {
      method: "PUT",
      body: value,
    });
  },

  /**
   * Merge (patch) the config at the given path.
   * Uses PATCH semantics — only specified fields are updated.
   */
  patch: <T>(path: string, value: T): Promise<void> => {
    return request<void>(`/config/${path}`, {
      method: "PATCH",
      body: value,
    });
  },

  /**
   * Delete the config at the given path.
   */
  delete: (path: string): Promise<void> => {
    return request<void>(`/config/${path}`, {
      method: "DELETE",
    });
  },

  /**
   * Load a complete new configuration, replacing everything.
   * This is the equivalent of `caddy reload`.
   */
  load: (config: CaddyConfig): Promise<void> => {
    return request<void>("/load", {
      method: "POST",
      body: config,
    });
  },

  /**
   * Adapt a Caddyfile to JSON config.
   * Useful for import/conversion features.
   */
  adapt: (caddyfile: string): Promise<AdaptResponse> => {
    return request<AdaptResponse>("/adapt", {
      method: "POST",
      headers: {
        "Content-Type": "text/caddyfile",
      },
      body: caddyfile,
    });
  },
};

interface AdaptResponse {
  result: CaddyConfig;
  warnings?: Array<{ message: string }>;
}
