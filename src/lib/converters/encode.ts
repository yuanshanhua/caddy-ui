/**
 * Encode handler converter: Caddy JSON ↔ form values.
 */

import { type EncodeFormValues, encodeFormDefaults } from "@/lib/schemas/middleware";
import type { EncodeHandler } from "@/types/handlers";

export function parseEncode(handler: EncodeHandler | undefined): EncodeFormValues {
  if (!handler) return encodeFormDefaults;
  const encodings = handler.encodings ?? {};
  return {
    gzipEnabled: Object.hasOwn(encodings, "gzip"),
    zstdEnabled: Object.hasOwn(encodings, "zstd"),
    minLength: handler.minimum_length ? String(handler.minimum_length) : "256",
    prefer: handler.prefer ?? ["zstd", "gzip"],
  };
}

export function toEncode(values: EncodeFormValues, original?: EncodeHandler): EncodeHandler {
  const encodings: Record<string, Record<string, unknown>> = {};
  if (values.gzipEnabled) encodings["gzip"] = original?.encodings?.["gzip"] ?? {};
  if (values.zstdEnabled) encodings["zstd"] = original?.encodings?.["zstd"] ?? {};

  // Preserve plugin encodings (e.g., brotli) that the form doesn't manage
  if (original?.encodings) {
    for (const [key, val] of Object.entries(original.encodings)) {
      if (key !== "gzip" && key !== "zstd") {
        encodings[key] = val;
      }
    }
  }

  const handler: EncodeHandler = {
    ...original,
    handler: "encode",
    encodings,
    prefer: values.prefer.filter(
      (p) => (p === "gzip" && values.gzipEnabled) || (p === "zstd" && values.zstdEnabled),
    ),
  };

  const minVal = Number.parseInt(values.minLength, 10);
  if (!Number.isNaN(minVal) && minVal > 0) {
    handler.minimum_length = minVal;
  } else {
    delete handler.minimum_length;
  }

  return handler;
}
