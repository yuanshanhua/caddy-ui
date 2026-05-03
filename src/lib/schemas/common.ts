/**
 * Common Zod validators shared across form schemas.
 *
 * Provides validators for Caddy-specific patterns like durations,
 * network addresses, and other reusable field types.
 */

import { z } from "zod";

/** Caddy duration format: number followed by unit (ns, us/µs, ms, s, m, h) */
export const durationSchema = z
  .string()
  .refine((val) => val === "" || /^\d+(\.\d+)?(ns|us|µs|ms|s|m|h)$/.test(val), {
    message: "Invalid duration format (e.g., 30s, 5m, 1h)",
  });

/** Network address in host:port format */
export const addressSchema = z
  .string()
  .min(1, "Address is required")
  .refine((val) => /^[^:]+:\d+$/.test(val) || /^:\d+$/.test(val) || /^[^:]+$/.test(val), {
    message: "Invalid address format (e.g., localhost:3000 or :443)",
  });

/** Caddy listen address (e.g., :443, localhost:8080, 0.0.0.0:80) */
export const listenAddressSchema = z
  .string()
  .min(1, "Listen address is required")
  .refine((val) => /^(:\d+|[\w.-]+:\d+|\d{1,3}(\.\d{1,3}){3}:\d+|\[[\w:]+\]:\d+)$/.test(val), {
    message: "Invalid listen address (e.g., :443, localhost:8080)",
  });

/** Positive integer string (for form inputs that represent numbers) */
export const positiveIntString = z
  .string()
  .refine((val) => val === "" || (/^\d+$/.test(val) && Number.parseInt(val, 10) > 0), {
    message: "Must be a positive integer",
  });

/** Non-negative integer string */
export const nonNegativeIntString = z
  .string()
  .refine((val) => val === "" || (/^\d+$/.test(val) && Number.parseInt(val, 10) >= 0), {
    message: "Must be a non-negative integer",
  });

/** URI path (starts with /) */
export const uriPathSchema = z.string().refine((val) => val === "" || val.startsWith("/"), {
  message: "URI must start with /",
});

/** HTTP status code (100-599) */
export const httpStatusSchema = z.string().refine(
  (val) => {
    if (val === "") return true;
    const num = Number.parseInt(val, 10);
    return num >= 100 && num <= 599;
  },
  { message: "Status code must be between 100 and 599" },
);

/** Non-empty trimmed string */
export const requiredString = z.string().min(1, "This field is required");

/** Server ID: alphanumeric, hyphens, underscores */
export const serverIdSchema = z
  .string()
  .min(1, "Server ID is required")
  .regex(/^[\w-]+$/, "Only letters, numbers, hyphens, and underscores");
