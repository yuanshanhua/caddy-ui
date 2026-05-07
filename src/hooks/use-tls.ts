/**
 * TanStack Query hooks for TLS configuration management.
 * Reads are derived from useConfig() to avoid duplicate fetches.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CaddyApiError } from "@/api/client";
import { configApi } from "@/api/config";
import { configKeys, useConfig } from "@/hooks/use-config";
import type { AutomationPolicy, TlsApp, TlsAutomation } from "@/types/tls-app";

/** Derive TLS app config from the full config (no extra API call). */
export function useTlsApp() {
  const { data: config, ...rest } = useConfig();
  const tlsApp = config?.apps?.tls as TlsApp | undefined;
  return { data: tlsApp, ...rest };
}

/** Add a new automation policy. */
export function useAddTlsPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (policy: AutomationPolicy) => {
      // Try appending to existing policies array first
      try {
        const existing = await configApi.get<AutomationPolicy[]>("apps/tls/automation/policies");
        await configApi.put(`apps/tls/automation/policies/${existing.length}`, policy);
      } catch (err) {
        if (!(err instanceof CaddyApiError)) throw err;
        // Path doesn't exist — initialize the full TLS automation structure
        const automation: TlsAutomation = { policies: [policy] };
        await configApi.put("apps/tls", { automation });
      }
    },
    onSuccess: () => {
      toast.success("TLS policy added");
      void queryClient.invalidateQueries({ queryKey: configKeys.all });
    },
    onError: (error) => {
      toast.error("Failed to add TLS policy", { description: error.message });
    },
  });
}

/** Update a policy at a specific index. */
export function useUpdateTlsPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ index, policy }: { index: number; policy: AutomationPolicy }) => {
      await configApi.patch(`apps/tls/automation/policies/${index}`, policy);
    },
    onSuccess: () => {
      toast.success("TLS policy updated");
      void queryClient.invalidateQueries({ queryKey: configKeys.all });
    },
    onError: (error) => {
      toast.error("Failed to update TLS policy", { description: error.message });
    },
  });
}

/** Delete a policy at a specific index. */
export function useDeleteTlsPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (index: number) => {
      await configApi.delete(`apps/tls/automation/policies/${index}`);
    },
    onSuccess: () => {
      toast.success("TLS policy deleted");
      void queryClient.invalidateQueries({ queryKey: configKeys.all });
    },
    onError: (error) => {
      toast.error("Failed to delete TLS policy", { description: error.message });
    },
  });
}
