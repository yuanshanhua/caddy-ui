/**
 * Hook for site-level operations.
 * Abstracts the config path manipulation for HTTP servers.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { configApi } from "@/api/config";
import { configKeys, useConfig } from "@/hooks/use-config";
import type { HttpServer } from "@/types/http-app";

/** Get all servers as an array of [id, server] tuples. */
export function useSites() {
  const { data: config, ...rest } = useConfig();

  const servers = config?.apps?.http?.servers ?? {};
  const sites = Object.entries(servers);

  return { sites, config, ...rest };
}

/** Create a new HTTP server. */
export function useCreateSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, server }: { id: string; server: HttpServer }) => {
      await configApi.put(`apps/http/servers/${id}`, server);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: configKeys.all });
    },
  });
}

/** Update an existing HTTP server. */
export function useUpdateSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, server }: { id: string; server: HttpServer }) => {
      await configApi.put(`apps/http/servers/${id}`, server);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: configKeys.all });
    },
  });
}

/** Delete an HTTP server. */
export function useDeleteSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await configApi.delete(`apps/http/servers/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: configKeys.all });
    },
  });
}

/** Ensure the apps/http/servers path exists. */
export function useEnsureHttpApp() {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    try {
      await configApi.get("apps/http/servers");
    } catch {
      // Path doesn't exist, create it
      await configApi.put("apps/http", { servers: {} });
      void queryClient.invalidateQueries({ queryKey: configKeys.all });
    }
  }, [queryClient]);
}
