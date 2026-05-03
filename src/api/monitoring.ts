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
   * The /metrics endpoint returns plain text (not JSON), which `request<string>`
   * handles via the text content-type branch.
   */
  getMetrics: (): Promise<string> => {
    return request<string>("/metrics");
  },
};
