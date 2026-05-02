/**
 * Monitoring-related Admin API endpoints.
 */

import { request } from "./client";

/** Status of a reverse proxy upstream. */
export interface UpstreamStatus {
  address: string;
  num_requests: number;
  fails: number;
}

export const monitoringApi = {
  /** Get reverse proxy upstream health status. */
  getUpstreams: (): Promise<UpstreamStatus[]> => {
    return request<UpstreamStatus[]>("/reverse_proxy/upstreams");
  },

  /**
   * Get Prometheus metrics as text.
   * Note: This returns plain text, not JSON.
   */
  getMetrics: async (): Promise<string> => {
    const response = await fetch(`${import.meta.env["VITE_CADDY_API_BASE"] ?? "/ui/api"}/metrics`);
    return response.text();
  },
};
