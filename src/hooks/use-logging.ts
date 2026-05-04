/**
 * TanStack Query hooks for logging configuration.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CaddyApiError } from "@/api/client";
import { configApi } from "@/api/config";
import { configKeys, useConfig } from "@/hooks/use-config";
import type { LogConfig, LoggingConfig } from "@/types/caddy";

/** Derive logging config from the full config. */
export function useLogging() {
  const { data: config, ...rest } = useConfig();
  const logging = config?.logging as LoggingConfig | undefined;
  return { data: logging, ...rest };
}

/** Add or update a named log. */
export function useUpsertLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, log }: { name: string; log: LogConfig }) => {
      try {
        await configApi.patch(`logging/logs/${name}`, log);
      } catch (err) {
        if (!(err instanceof CaddyApiError) || err.status !== 404) throw err;
        // logging.logs path doesn't exist — initialize it
        const logs: Record<string, LogConfig> = { [name]: log };
        await configApi.put("logging", { logs });
      }
    },
    onSuccess: () => {
      toast.success("Log configuration saved");
      void queryClient.invalidateQueries({ queryKey: configKeys.all });
    },
    onError: (error) => {
      toast.error("Failed to save log configuration", { description: error.message });
    },
  });
}

/** Delete a named log. */
export function useDeleteLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      await configApi.delete(`logging/logs/${name}`);
    },
    onSuccess: () => {
      toast.success("Log configuration deleted");
      void queryClient.invalidateQueries({ queryKey: configKeys.all });
    },
    onError: (error) => {
      toast.error("Failed to delete log configuration", { description: error.message });
    },
  });
}
