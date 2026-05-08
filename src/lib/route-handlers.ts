/**
 * Handler preservation helpers used by route-form-dialog.tsx.
 *
 * The form manages a fixed set of handler types. All others — standard Caddy
 * modules the form has no UI for, or third-party plugins — must survive
 * round-trips through the form without data loss.
 */

import type { HttpHandler, UnknownHandler } from "@/types/handlers";

const FORM_MANAGED_HANDLERS = new Set([
  "reverse_proxy",
  "file_server",
  "static_response",
  "subroute",
  "headers",
  "encode",
  "rewrite",
  "authentication",
]);

export function isFormManagedHandler(handler: HttpHandler): boolean {
  return FORM_MANAGED_HANDLERS.has(handler.handler);
}

export function extractUnknownHandlers(handlers: HttpHandler[]): HttpHandler[] {
  return handlers.filter((h) => !isFormManagedHandler(h));
}

export function isUnknownHandler(handler: HttpHandler): handler is UnknownHandler {
  return !FORM_MANAGED_HANDLERS.has(handler.handler);
}

export function mergeHandlers(
  unknownHandlers: HttpHandler[],
  formBuiltHandlers: HttpHandler[],
): HttpHandler[] {
  return [...unknownHandlers, ...formBuiltHandlers];
}
