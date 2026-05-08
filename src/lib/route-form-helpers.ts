/**
 * Conversion helpers between HttpRoute (Caddy API shape) and RouteFormValues (form shape).
 *
 * These are used by route-form-dialog.tsx to parse initial route data and to
 * convert nested subroute routes into recursively structured form values.
 */

import { type RouteFormValues, routeFormDefaults } from "@/lib/schemas/route";
import type { HttpRoute } from "@/types/http-app";

type HandlerType = "reverse_proxy" | "file_server" | "static_response" | "redir" | "subroute";

/** Recursively convert HttpRoute[] to RouteFormValues[] for subroute form values. */
export function httpRoutesToFormValues(routes: HttpRoute[]): RouteFormValues[] {
  return routes.map((route) => {
    const formValues = parseInitialFormValues(route);
    const subrouteHandler = route.handle?.find((h) => h.handler === "subroute");
    if (subrouteHandler) {
      const sr = subrouteHandler as { routes?: HttpRoute[] };
      formValues.subrouteRoutes = httpRoutesToFormValues(sr.routes ?? []);
    }
    return formValues;
  });
}

/** Convert a single HttpRoute into RouteFormValues (recursive for subroutes). */
export function parseInitialFormValues(route: HttpRoute | undefined): RouteFormValues {
  if (!route) return routeFormDefaults;

  const firstMatch = route.match?.[0];
  const handlers = route.handle ?? [];

  let handlerType: HandlerType = "reverse_proxy";
  let fileRoot = "";
  let staticBody = "";
  let staticStatus = "200";
  let redirUrl = "";
  let redirStatus: RouteFormValues["redirStatus"] = "302";
  let subrouteRoutes: RouteFormValues[] = [];

  for (const handler of handlers) {
    if (handler.handler === "reverse_proxy") {
      handlerType = "reverse_proxy";
    } else if (handler.handler === "file_server") {
      handlerType = "file_server";
      const fs = handler as { root?: string };
      fileRoot = fs.root ?? "";
    } else if (handler.handler === "static_response") {
      const sr = handler as {
        headers?: Record<string, string[]>;
        status_code?: string | number;
        body?: string;
      };
      if (sr.headers?.["Location"]) {
        handlerType = "redir";
        redirUrl = sr.headers["Location"]?.[0] ?? "";
        redirStatus = String(sr.status_code ?? "302") as RouteFormValues["redirStatus"];
      } else {
        handlerType = "static_response";
        staticBody = sr.body ?? "";
        staticStatus = String(sr.status_code ?? "200");
      }
    } else if (handler.handler === "subroute") {
      handlerType = "subroute";
      const sr = handler as { routes?: HttpRoute[] };
      subrouteRoutes = httpRoutesToFormValues(sr.routes ?? []);
    }
  }

  return {
    hosts: firstMatch?.host?.join(", ") ?? "",
    paths: firstMatch?.path?.join(", ") ?? "",
    methods: firstMatch?.method?.join(", ") ?? "",
    handlerType,
    fileRoot,
    staticBody,
    staticStatus,
    redirUrl,
    redirStatus,
    terminal: route.terminal ?? true,
    subrouteRoutes,
  };
}
