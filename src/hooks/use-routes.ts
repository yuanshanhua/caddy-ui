/**
 * Hook for route-level CRUD operations within a server.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { configApi } from "@/api/config";
import { configKeys } from "@/hooks/use-config";
import type { HttpRoute } from "@/types/http-app";

/** Add a route to a server (appends to the routes array via POST). */
export function useAddRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serverId, route }: { serverId: string; route: HttpRoute }) => {
      const path = `apps/http/servers/${serverId}/routes`;
      await configApi.post(path, route);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: configKeys.all });
    },
  });
}

/** Update a route at a specific index. */
export function useUpdateRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      serverId,
      index,
      route,
    }: {
      serverId: string;
      index: number;
      route: HttpRoute;
    }) => {
      await configApi.put(`apps/http/servers/${serverId}/routes/${index}`, route);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: configKeys.all });
    },
  });
}

/** Delete a route at a specific index. */
export function useDeleteRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serverId, index }: { serverId: string; index: number }) => {
      await configApi.delete(`apps/http/servers/${serverId}/routes/${index}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: configKeys.all });
    },
  });
}
