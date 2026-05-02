/**
 * TanStack Query hook for Caddy config operations.
 */

import { configApi } from "@/api/config";
import type { CaddyConfig } from "@/types/caddy";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/** Query key factory for config-related queries. */
export const configKeys = {
  all: ["config"] as const,
  detail: (path: string) => ["config", path] as const,
};

/** Fetch the full Caddy config. */
export function useConfig() {
  return useQuery({
    queryKey: configKeys.all,
    queryFn: () => configApi.get<CaddyConfig>(),
    refetchInterval: 10_000, // Poll every 10s to detect external changes
    retry: 1,
  });
}

/** Fetch a sub-path of the config. */
export function useConfigPath<T>(path: string, enabled = true) {
  return useQuery({
    queryKey: configKeys.detail(path),
    queryFn: () => configApi.get<T>(path),
    enabled,
    retry: 1,
  });
}

/** Mutation to update config at a specific path via PUT. */
export function useConfigPut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ path, value }: { path: string; value: unknown }) => configApi.put(path, value),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: configKeys.all });
    },
  });
}

/** Mutation to patch config at a specific path. */
export function useConfigPatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ path, value }: { path: string; value: unknown }) => configApi.patch(path, value),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: configKeys.all });
    },
  });
}

/** Mutation to delete config at a specific path. */
export function useConfigDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (path: string) => configApi.delete(path),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: configKeys.all });
    },
  });
}

/** Mutation to load a complete new config. */
export function useConfigLoad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: CaddyConfig) => configApi.load(config),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: configKeys.all });
    },
  });
}

/** Adapt a Caddyfile to JSON config (does not apply). */
export function useAdaptCaddyfile() {
  return useMutation({
    mutationFn: (caddyfile: string) => configApi.adapt(caddyfile),
  });
}
