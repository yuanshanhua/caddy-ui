/**
 * System-level Admin API operations.
 */

import { request } from "./client";

export const systemApi = {
  /** Gracefully stop the Caddy process. */
  stop: (): Promise<void> => {
    return request<void>("/stop", { method: "POST" });
  },
};
