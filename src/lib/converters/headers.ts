/**
 * Headers handler converter: Caddy JSON ↔ form values.
 */

import type { HeaderEntry, HeadersFormValues } from "@/lib/schemas/headers";
import { headersFormDefaults } from "@/lib/schemas/headers";
import type { HeaderOps, HeadersHandler, RespHeaderOps } from "@/types/handlers";

let nextId = 0;
export function generateId(): string {
  return `header-${++nextId}-${Date.now()}`;
}

export function parseHeaderOps(ops: HeaderOps | undefined): HeaderEntry[] {
  const entries: HeaderEntry[] = [];
  if (!ops) return entries;

  if (ops.add) {
    for (const [name, values] of Object.entries(ops.add)) {
      for (const value of values) {
        entries.push({ id: generateId(), operation: "add", name, value });
      }
    }
  }
  if (ops.set) {
    for (const [name, values] of Object.entries(ops.set)) {
      for (const value of values) {
        entries.push({ id: generateId(), operation: "set", name, value });
      }
    }
  }
  if (ops.delete) {
    for (const name of ops.delete) {
      entries.push({ id: generateId(), operation: "delete", name, value: "" });
    }
  }

  return entries;
}

export function buildHeaderOps(entries: HeaderEntry[]): HeaderOps | undefined {
  const ops: HeaderOps = {};
  let hasOps = false;

  for (const entry of entries) {
    if (!entry.name.trim()) continue;

    if (entry.operation === "add") {
      if (!ops.add) ops.add = {};
      const arr = ops.add[entry.name] ?? [];
      arr.push(entry.value);
      ops.add[entry.name] = arr;
      hasOps = true;
    } else if (entry.operation === "set") {
      if (!ops.set) ops.set = {};
      const arr = ops.set[entry.name] ?? [];
      arr.push(entry.value);
      ops.set[entry.name] = arr;
      hasOps = true;
    } else if (entry.operation === "delete") {
      if (!ops.delete) ops.delete = [];
      ops.delete.push(entry.name);
      hasOps = true;
    }
  }

  return hasOps ? ops : undefined;
}

export function parseHeaders(handler: HeadersHandler | undefined): HeadersFormValues {
  if (!handler) return headersFormDefaults;
  return {
    requestHeaders: parseHeaderOps(handler.request),
    responseHeaders: parseHeaderOps(handler.response),
    responseDeferred: handler.response?.deferred ?? false,
  };
}

export function toHeaders(values: HeadersFormValues, original?: HeadersHandler): HeadersHandler {
  const handler: HeadersHandler = { ...original, handler: "headers" };

  const requestOps = buildHeaderOps(values.requestHeaders);
  if (requestOps) {
    handler.request = { ...original?.request, ...requestOps };
  } else if (original?.request?.replace) {
    handler.request = { replace: original.request.replace };
  } else {
    delete handler.request;
  }

  const responseOps = buildHeaderOps(values.responseHeaders);
  if (responseOps) {
    const respOps: RespHeaderOps = { ...original?.response, ...responseOps };
    if (values.responseDeferred) {
      respOps.deferred = true;
    } else {
      delete respOps.deferred;
    }
    handler.response = respOps;
  } else if (original?.response?.replace || original?.response?.require) {
    const respOps: RespHeaderOps = {
      replace: original.response.replace,
      require: original.response.require,
    };
    if (values.responseDeferred) respOps.deferred = true;
    handler.response = respOps;
  } else {
    delete handler.response;
  }

  return handler;
}
