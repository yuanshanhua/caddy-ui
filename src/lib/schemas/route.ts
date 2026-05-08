/**
 * Zod schema for the Route form (orchestrator).
 */

import { z } from "zod";

export const routeFormSchema = z.object({
  // Matchers
  hosts: z.string(),
  paths: z.string(),
  methods: z.string(),

  // Handler type
  handlerType: z.enum(["reverse_proxy", "file_server", "static_response", "redir", "subroute"]),
  fileRoot: z.string(),
  staticBody: z.string(),
  staticStatus: z.string(),
  redirUrl: z.string(),
  redirStatus: z.enum(["301", "302", "307", "308"]),

  // Options
  terminal: z.boolean(),
});

export type RouteFormValues = z.infer<typeof routeFormSchema>;

export const routeFormDefaults: RouteFormValues = {
  hosts: "",
  paths: "",
  methods: "",
  handlerType: "reverse_proxy",
  fileRoot: "",
  staticBody: "",
  staticStatus: "200",
  redirUrl: "",
  redirStatus: "302",
  terminal: true,
};
