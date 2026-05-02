/**
 * TanStack Query hook for upstream health monitoring.
 */

import { useQuery } from "@tanstack/react-query";
import type { UpstreamStatus } from "@/api/monitoring";
import { monitoringApi } from "@/api/monitoring";

export const upstreamKeys = {
  all: ["upstreams"] as const,
};

/** Fetch upstream health status with frequent polling. */
export function useUpstreams(enabled = true) {
  return useQuery({
    queryKey: upstreamKeys.all,
    queryFn: () => monitoringApi.getUpstreams(),
    refetchInterval: 5_000, // Poll every 5s for real-time feel
    enabled,
    retry: 1,
  });
}

export type { UpstreamStatus };
