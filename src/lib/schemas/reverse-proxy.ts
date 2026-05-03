/**
 * Zod schema for the Reverse Proxy form.
 */

import { z } from "zod";

export const upstreamSchema = z.object({
  dial: z.string().min(1, "Upstream address is required"),
  maxRequests: z.string(),
});

export const reverseProxyFormSchema = z.object({
  upstreams: z.array(upstreamSchema).min(1, "At least one upstream is required"),
  lbPolicy: z.enum(["round_robin", "random", "least_conn", "ip_hash", "uri_hash", "first"]),
  tryDuration: z.string(),
  retries: z.string(),
  healthEnabled: z.boolean(),
  healthUri: z.string(),
  healthInterval: z.string(),
  healthTimeout: z.string(),
  passiveEnabled: z.boolean(),
  maxFails: z.string(),
  failDuration: z.string(),
  disableXForwarded: z.boolean(),
  insecureSkipVerify: z.boolean(),
});

export type ReverseProxyFormValues = z.infer<typeof reverseProxyFormSchema>;

export const reverseProxyDefaults: ReverseProxyFormValues = {
  upstreams: [{ dial: "localhost:3000", maxRequests: "" }],
  lbPolicy: "round_robin",
  tryDuration: "",
  retries: "",
  healthEnabled: false,
  healthUri: "/",
  healthInterval: "30s",
  healthTimeout: "5s",
  passiveEnabled: false,
  maxFails: "3",
  failDuration: "30s",
  disableXForwarded: false,
  insecureSkipVerify: false,
};
