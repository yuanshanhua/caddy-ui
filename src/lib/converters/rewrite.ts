/**
 * Rewrite handler converter: Caddy JSON ↔ form values.
 */

import { type RewriteFormValues, rewriteFormDefaults } from "@/lib/schemas/middleware";
import type { RewriteHandler } from "@/types/handlers";

let nextId = 0;
export function generateId(): string {
  return `rewrite-${++nextId}-${Date.now()}`;
}

export function parseRewrite(handler: RewriteHandler | undefined): RewriteFormValues {
  if (!handler) return rewriteFormDefaults;

  const values: RewriteFormValues = { ...rewriteFormDefaults, method: handler.method ?? "" };

  if (handler.uri) {
    values.mode = "uri";
    values.uri = handler.uri;
  } else if (handler.strip_path_prefix) {
    values.mode = "strip_prefix";
    values.stripPrefix = handler.strip_path_prefix;
  } else if (handler.strip_path_suffix) {
    values.mode = "strip_suffix";
    values.stripSuffix = handler.strip_path_suffix;
  } else if (handler.uri_substring && handler.uri_substring.length > 0) {
    values.mode = "substring";
    values.substrings = handler.uri_substring.map((s) => ({
      id: generateId(),
      find: s.find,
      replace: s.replace,
    }));
  } else if (handler.path_regexp && handler.path_regexp.length > 0) {
    values.mode = "path_regexp";
    values.regexpFind = handler.path_regexp[0]?.find ?? "";
    values.regexpReplace = handler.path_regexp[0]?.replace ?? "";
  }

  return values;
}

export function toRewrite(values: RewriteFormValues, original?: RewriteHandler): RewriteHandler {
  const handler: RewriteHandler = { ...original, handler: "rewrite" };

  // Only one rewrite mode is active at a time
  delete handler.uri;
  delete handler.strip_path_prefix;
  delete handler.strip_path_suffix;
  delete handler.uri_substring;
  delete handler.path_regexp;

  if (values.method.trim()) {
    handler.method = values.method.trim().toUpperCase();
  } else {
    delete handler.method;
  }

  switch (values.mode) {
    case "uri":
      if (values.uri.trim()) handler.uri = values.uri.trim();
      break;
    case "strip_prefix":
      if (values.stripPrefix.trim()) handler.strip_path_prefix = values.stripPrefix.trim();
      break;
    case "strip_suffix":
      if (values.stripSuffix.trim()) handler.strip_path_suffix = values.stripSuffix.trim();
      break;
    case "substring": {
      const validSubs = values.substrings
        .filter((s) => s.find.trim())
        .map((s) => ({ find: s.find, replace: s.replace }));
      if (validSubs.length > 0) handler.uri_substring = validSubs;
      break;
    }
    case "path_regexp":
      if (values.regexpFind.trim()) {
        handler.path_regexp = [{ find: values.regexpFind, replace: values.regexpReplace }];
      }
      break;
  }

  return handler;
}
