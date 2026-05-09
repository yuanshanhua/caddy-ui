/**
 * CORS (via headers handler) converter: Caddy JSON ↔ form values.
 */

import { type CorsFormValues, corsFormDefaults } from "@/lib/schemas/middleware";
import type { HeadersHandler } from "@/types/handlers";

const DEFAULT_METHODS = "GET, POST, PUT, DELETE, OPTIONS";
const DEFAULT_HEADERS = "Content-Type, Authorization";

const CORS_HEADER_KEYS = new Set([
  "Access-Control-Allow-Origin",
  "Access-Control-Allow-Methods",
  "Access-Control-Allow-Headers",
  "Access-Control-Max-Age",
  "Access-Control-Expose-Headers",
  "Access-Control-Allow-Credentials",
]);

export function parseCors(handler: HeadersHandler | undefined): CorsFormValues {
  if (!handler?.response?.set) return corsFormDefaults;

  const set = handler.response.set;
  return {
    origins: set["Access-Control-Allow-Origin"]?.join(", ") ?? "*",
    methods: set["Access-Control-Allow-Methods"]?.join(", ") ?? DEFAULT_METHODS,
    headers: set["Access-Control-Allow-Headers"]?.join(", ") ?? DEFAULT_HEADERS,
    exposeHeaders: set["Access-Control-Expose-Headers"]?.join(", ") ?? "",
    maxAge: set["Access-Control-Max-Age"]?.[0] ?? "86400",
    credentials: set["Access-Control-Allow-Credentials"]?.[0] === "true",
  };
}

export function toCors(values: CorsFormValues, original?: HeadersHandler): HeadersHandler {
  const corsHeaders: Record<string, string[]> = {
    "Access-Control-Allow-Origin": [values.origins.trim() || "*"],
    "Access-Control-Allow-Methods": [values.methods.trim() || DEFAULT_METHODS],
    "Access-Control-Allow-Headers": [values.headers.trim() || DEFAULT_HEADERS],
  };

  if (values.maxAge.trim()) {
    corsHeaders["Access-Control-Max-Age"] = [values.maxAge.trim()];
  }

  if (values.exposeHeaders.trim()) {
    corsHeaders["Access-Control-Expose-Headers"] = [values.exposeHeaders.trim()];
  }

  if (values.credentials) {
    corsHeaders["Access-Control-Allow-Credentials"] = ["true"];
  }

  const preservedSet: Record<string, string[]> = {};
  if (original?.response?.set) {
    for (const [key, val] of Object.entries(original.response.set)) {
      if (!CORS_HEADER_KEYS.has(key)) {
        preservedSet[key] = val;
      }
    }
  }

  return {
    ...original,
    handler: "headers",
    response: {
      ...original?.response,
      set: { ...preservedSet, ...corsHeaders },
      deferred: true,
    },
  };
}
