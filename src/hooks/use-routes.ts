/**
 * Hook for route-level CRUD operations within a server.
 */

import { configApi } from "@/api/config";
import { configKeys } from "@/hooks/use-config";
import type { HttpRoute } from "@/types/http-app";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/** Add a route to a server. */
export function useAddRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serverId, route }: { serverId: string; route: HttpRoute }) => {
      // POST appends to the array
      const path = `apps/http/servers/${serverId}/routes`;
      // We need to get current routes and append
      let routes: HttpRoute[];
      try {
        routes = await configApi.get<HttpRoute[]>(path);
      } catch {
        routes = [];
      }
      routes.push(route);
      await configApi.put(path, routes);
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
