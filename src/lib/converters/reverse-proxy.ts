/**
 * Reverse Proxy handler converter: Caddy JSON ↔ form values.
 */

import { type ReverseProxyFormValues, reverseProxyDefaults } from "@/lib/schemas/reverse-proxy";
import type { ReverseProxyHandler } from "@/types/reverse-proxy";

export function parseReverseProxy(
  handler: ReverseProxyHandler | undefined,
): ReverseProxyFormValues {
  if (!handler) return reverseProxyDefaults;

  const ups = handler.upstreams?.map((u) => ({
    dial: u.dial ?? "",
    maxRequests: u.max_requests ? String(u.max_requests) : "",
  })) ?? [{ dial: "", maxRequests: "" }];

  const active = handler.health_checks?.active;
  const passive = handler.health_checks?.passive;
  const deleteHeaders = handler.headers?.request?.delete ?? [];

  return {
    upstreams: ups.length > 0 ? ups : [{ dial: "", maxRequests: "" }],
    lbPolicy:
      (handler.load_balancing?.selection_policy?.policy as ReverseProxyFormValues["lbPolicy"]) ??
      "round_robin",
    tryDuration: handler.load_balancing?.try_duration ?? "",
    retries: handler.load_balancing?.retries ? String(handler.load_balancing.retries) : "",
    healthEnabled: !!active,
    healthUri: active?.uri ?? "/",
    healthInterval: active?.interval ?? "30s",
    healthTimeout: active?.timeout ?? "5s",
    passiveEnabled: !!passive,
    maxFails: passive?.max_fails ? String(passive.max_fails) : "3",
    failDuration: passive?.fail_duration ?? "30s",
    disableXForwarded:
      deleteHeaders.includes("X-Forwarded-For") || deleteHeaders.includes("X-Forwarded-Proto"),
    insecureSkipVerify: handler.transport?.tls?.insecure_skip_verify ?? false,
  };
}

export function toReverseProxy(
  values: ReverseProxyFormValues,
  original?: ReverseProxyHandler,
): ReverseProxyHandler {
  const handler: ReverseProxyHandler = { ...original, handler: "reverse_proxy" };

  handler.upstreams = values.upstreams
    .filter((u) => u.dial.trim())
    .map((u) => ({
      dial: u.dial.trim(),
      ...(u.maxRequests ? { max_requests: Number.parseInt(u.maxRequests, 10) } : {}),
    }));

  if (values.lbPolicy !== "round_robin" || values.tryDuration || values.retries) {
    handler.load_balancing = {
      ...original?.load_balancing,
      selection_policy: { policy: values.lbPolicy },
      ...(values.tryDuration ? { try_duration: values.tryDuration } : {}),
      ...(values.retries ? { retries: Number.parseInt(values.retries, 10) } : {}),
    };
  } else {
    delete handler.load_balancing;
  }

  if (values.healthEnabled || values.passiveEnabled) {
    handler.health_checks = { ...original?.health_checks };
    if (values.healthEnabled) {
      handler.health_checks.active = {
        ...original?.health_checks?.active,
        uri: values.healthUri,
        interval: values.healthInterval,
        timeout: values.healthTimeout,
      };
    } else {
      delete handler.health_checks.active;
    }
    if (values.passiveEnabled) {
      handler.health_checks.passive = {
        ...original?.health_checks?.passive,
        max_fails: Number.parseInt(values.maxFails, 10),
        fail_duration: values.failDuration,
      };
    } else {
      delete handler.health_checks.passive;
    }
  } else {
    delete handler.health_checks;
  }

  if (values.disableXForwarded) {
    handler.headers = {
      ...original?.headers,
      request: {
        ...original?.headers?.request,
        delete: ["X-Forwarded-For", "X-Forwarded-Proto", "X-Forwarded-Host"],
      },
    };
  } else if (original?.headers) {
    const existingDeletes = original.headers.request?.delete?.filter(
      (h) => !["X-Forwarded-For", "X-Forwarded-Proto", "X-Forwarded-Host"].includes(h),
    );
    if (existingDeletes?.length || original.headers.request?.add || original.headers.request?.set) {
      handler.headers = {
        ...original.headers,
        request: {
          ...original.headers.request,
          delete: existingDeletes?.length ? existingDeletes : undefined,
        },
      };
    } else if (original.headers.response) {
      handler.headers = { ...original.headers };
      delete handler.headers.request;
    } else {
      delete handler.headers;
    }
  } else {
    delete handler.headers;
  }

  if (values.insecureSkipVerify) {
    handler.transport = {
      ...original?.transport,
      protocol: original?.transport?.protocol ?? "http",
      tls: { ...original?.transport?.tls, insecure_skip_verify: true },
    };
  } else if (original?.transport) {
    const tls = original.transport.tls ? { ...original.transport.tls } : undefined;
    if (tls) {
      delete tls.insecure_skip_verify;
      if (Object.keys(tls).length === 0) {
        handler.transport = { ...original.transport };
        delete handler.transport.tls;
      } else {
        handler.transport = { ...original.transport, tls };
      }
    }
    // transport may still have plugin fields (resolver, keep_alive, etc.)
  } else {
    delete handler.transport;
  }

  return handler;
}
