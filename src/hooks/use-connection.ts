/**
 * Connection health monitoring hook.
 * Periodically checks if the Caddy Admin API is reachable.
 */

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { checkConnection } from "@/api/client";
import { useConnectionStore } from "@/stores/connection";

export function useConnection() {
  const { status, setStatus, setLastChecked } = useConnectionStore();

  const query = useQuery({
    queryKey: ["connection"],
    queryFn: checkConnection,
    refetchInterval: 5_000, // Check every 5 seconds
    retry: false,
  });

  useEffect(() => {
    if (query.isSuccess) {
      setStatus(query.data ? "connected" : "disconnected");
      setLastChecked(new Date());
    } else if (query.isError) {
      setStatus("disconnected");
      setLastChecked(new Date());
    }
  }, [query.isSuccess, query.isError, query.data, setStatus, setLastChecked]);

  return { status, isLoading: query.isLoading };
}
