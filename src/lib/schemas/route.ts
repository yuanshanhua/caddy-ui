/**
 * Zod schema for the Route form (orchestrator).
 *
 * Uses a getter on the `subrouteRoutes` key to support recursive subroute nesting.
 * This avoids z.lazy() and its TypeScript type inference issues with
 * @hookform/resolvers — the schema remains a plain ZodObject.
 */

import { z } from "zod";

export const routeFormSchema = z.object({
  hosts: z.string(),
  paths: z.string(),
  methods: z.string(),
  handlerType: z.enum(["reverse_proxy", "file_server", "static_response", "redir", "subroute"]),
  fileRoot: z.string(),
  staticBody: z.string(),
  staticStatus: z.string(),
  redirUrl: z.string(),
  redirStatus: z.enum(["301", "302", "307", "308"]),
  terminal: z.boolean(),
  get subrouteRoutes() {
    return routeFormSchema.array();
  },
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
  subrouteRoutes: [],
};
