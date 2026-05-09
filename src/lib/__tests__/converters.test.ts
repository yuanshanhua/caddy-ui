/**
 * Unit tests for form value converters.
 *
 * Verifies that each converter correctly:
 * 1. Parses Caddy JSON into form values
 * 2. Converts form values back to Caddy JSON
 * 3. Preserves unmanaged fields on roundtrip
 * 4. Handles undefined/empty inputs gracefully
 */

import { describe, expect, it } from "vitest";
import { parseBasicAuth, toBasicAuth } from "@/lib/converters/basic-auth";
import { parseCors, toCors } from "@/lib/converters/cors";
import { parseEncode, toEncode } from "@/lib/converters/encode";
import { parseHeaders, toHeaders } from "@/lib/converters/headers";
import { parseReverseProxy, toReverseProxy } from "@/lib/converters/reverse-proxy";
import { parseRewrite, toRewrite } from "@/lib/converters/rewrite";
import { parsePolicy, toPolicy } from "@/lib/converters/tls-policy";
import type {
  AuthenticationHandler,
  EncodeHandler,
  HeadersHandler,
  RewriteHandler,
} from "@/types/handlers";
import type { ReverseProxyHandler } from "@/types/reverse-proxy";
import type { AutomationPolicy } from "@/types/tls-app";

describe("converters/reverse-proxy", () => {
  it("returns defaults for undefined", () => {
    const result = parseReverseProxy(undefined);
    expect(result.lbPolicy).toBe("round_robin");
    expect(result.upstreams).toHaveLength(1);
  });

  it("parses a full handler", () => {
    const handler: ReverseProxyHandler = {
      handler: "reverse_proxy",
      upstreams: [{ dial: "localhost:3000", max_requests: 100 }],
      load_balancing: {
        selection_policy: { policy: "least_conn" },
        try_duration: "5s",
        retries: 3,
      },
      health_checks: {
        active: { uri: "/health", interval: "10s", timeout: "3s" },
        passive: { max_fails: 5, fail_duration: "60s" },
      },
      transport: { protocol: "http", tls: { insecure_skip_verify: true } },
    };
    const result = parseReverseProxy(handler);
    expect(result.upstreams[0]?.dial).toBe("localhost:3000");
    expect(result.upstreams[0]?.maxRequests).toBe("100");
    expect(result.lbPolicy).toBe("least_conn");
    expect(result.tryDuration).toBe("5s");
    expect(result.retries).toBe("3");
    expect(result.healthEnabled).toBe(true);
    expect(result.healthUri).toBe("/health");
    expect(result.passiveEnabled).toBe(true);
    expect(result.maxFails).toBe("5");
    expect(result.insecureSkipVerify).toBe(true);
  });

  it("preserves unmanaged fields on roundtrip", () => {
    const original: ReverseProxyHandler = {
      handler: "reverse_proxy",
      upstreams: [{ dial: "localhost:8080" }],
      flush_interval: "100ms",
      request_buffers: 4096,
      stream_timeout: "30s",
      dynamic_upstreams: { source: "srv", name: "backend" },
    } as ReverseProxyHandler;

    const formValues = parseReverseProxy(original);
    const result = toReverseProxy(formValues, original);

    expect(result.flush_interval).toBe("100ms");
    expect(result.request_buffers).toBe(4096);
    expect(result["stream_timeout"]).toBe("30s");
    expect(result["dynamic_upstreams"]).toEqual({
      source: "srv",
      name: "backend",
    });
  });

  it("works without original (new handler)", () => {
    const formValues = parseReverseProxy(undefined);
    formValues.upstreams = [{ dial: "localhost:9000", maxRequests: "" }];
    const result = toReverseProxy(formValues);
    expect(result.handler).toBe("reverse_proxy");
    expect(result.upstreams).toEqual([{ dial: "localhost:9000" }]);
  });

  it("preserves transport plugin fields when toggling insecureSkipVerify off", () => {
    const original: ReverseProxyHandler = {
      handler: "reverse_proxy",
      upstreams: [{ dial: "localhost:443" }],
      transport: {
        protocol: "http",
        tls: { insecure_skip_verify: true, server_name: "backend.internal" },
        read_buffer_size: 8192,
      },
    };
    const formValues = parseReverseProxy(original);
    formValues.insecureSkipVerify = false;
    const result = toReverseProxy(formValues, original);

    expect(result.transport?.tls?.insecure_skip_verify).toBeUndefined();
    expect(result.transport?.tls?.server_name).toBe("backend.internal");
    expect(result.transport?.read_buffer_size).toBe(8192);
  });
});

describe("converters/encode", () => {
  it("returns defaults for undefined", () => {
    const result = parseEncode(undefined);
    expect(result.gzipEnabled).toBe(true);
    expect(result.zstdEnabled).toBe(true);
  });

  it("parses enabled encodings", () => {
    const handler: EncodeHandler = {
      handler: "encode",
      encodings: { gzip: {}, zstd: {} },
      prefer: ["gzip", "zstd"],
      minimum_length: 512,
    };
    const result = parseEncode(handler);
    expect(result.gzipEnabled).toBe(true);
    expect(result.zstdEnabled).toBe(true);
    expect(result.minLength).toBe("512");
    expect(result.prefer).toEqual(["gzip", "zstd"]);
  });

  it("preserves plugin encodings (brotli) on roundtrip", () => {
    const original: EncodeHandler = {
      handler: "encode",
      encodings: { gzip: {}, zstd: {}, br: { quality: 5 } },
      prefer: ["zstd", "gzip"],
      match: { status_code: [200] },
    };
    const formValues = parseEncode(original);
    const result = toEncode(formValues, original);

    expect(result.encodings?.["br"]).toEqual({ quality: 5 });
    expect(result.match).toEqual({ status_code: [200] });
  });

  it("preserves encoding parameters (quality, window_size)", () => {
    const original: EncodeHandler = {
      handler: "encode",
      encodings: { gzip: { level: 6 }, zstd: { window_size: 4096 } },
    };
    const formValues = parseEncode(original);
    const result = toEncode(formValues, original);

    expect(result.encodings?.["gzip"]).toEqual({ level: 6 });
    expect(result.encodings?.["zstd"]).toEqual({ window_size: 4096 });
  });
});

describe("converters/rewrite", () => {
  it("returns defaults for undefined", () => {
    const result = parseRewrite(undefined);
    expect(result.mode).toBe("uri");
    expect(result.uri).toBe("");
  });

  it("parses strip_path_prefix mode", () => {
    const handler: RewriteHandler = { handler: "rewrite", strip_path_prefix: "/api" };
    const result = parseRewrite(handler);
    expect(result.mode).toBe("strip_prefix");
    expect(result.stripPrefix).toBe("/api");
  });

  it("preserves query operations on roundtrip", () => {
    const original = {
      handler: "rewrite",
      uri: "/new-path",
      query: { set: [{ key: "v", val: "2" }] },
    } as unknown as RewriteHandler;
    const formValues = parseRewrite(original);
    const result = toRewrite(formValues, original);

    expect(result.uri).toBe("/new-path");
    // eslint-disable-next-line -- accessing unmodeled field preserved via spread
    const resultAny = result as unknown as Record<string, unknown>;
    expect(resultAny["query"]).toEqual({
      set: [{ key: "v", val: "2" }],
    });
  });

  it("works without original", () => {
    const formValues = parseRewrite(undefined);
    formValues.mode = "strip_prefix";
    formValues.stripPrefix = "/v1";
    const result = toRewrite(formValues);
    expect(result.handler).toBe("rewrite");
    expect(result.strip_path_prefix).toBe("/v1");
    expect(result.uri).toBeUndefined();
  });
});

describe("converters/headers", () => {
  it("returns defaults for undefined", () => {
    const result = parseHeaders(undefined);
    expect(result.requestHeaders).toEqual([]);
    expect(result.responseHeaders).toEqual([]);
    expect(result.responseDeferred).toBe(false);
  });

  it("parses add/set/delete operations", () => {
    const handler: HeadersHandler = {
      handler: "headers",
      request: {
        add: { "X-Custom": ["value1"] },
        set: { Host: ["backend"] },
        delete: ["X-Forwarded-For"],
      },
    };
    const result = parseHeaders(handler);
    expect(result.requestHeaders).toHaveLength(3);
    expect(result.requestHeaders.find((h) => h.operation === "add")?.name).toBe("X-Custom");
    expect(result.requestHeaders.find((h) => h.operation === "set")?.name).toBe("Host");
    expect(result.requestHeaders.find((h) => h.operation === "delete")?.name).toBe(
      "X-Forwarded-For",
    );
  });

  it("preserves replace operations on roundtrip", () => {
    const original: HeadersHandler = {
      handler: "headers",
      request: {
        set: { "X-Real-IP": ["{remote_host}"] },
        replace: { Cookie: [{ search: "session=", replace: "" }] },
      },
    };
    const formValues = parseHeaders(original);
    const result = toHeaders(formValues, original);

    expect(result.request?.replace).toEqual({ Cookie: [{ search: "session=", replace: "" }] });
    expect(result.request?.set).toEqual({ "X-Real-IP": ["{remote_host}"] });
  });

  it("preserves response require on roundtrip", () => {
    const original: HeadersHandler = {
      handler: "headers",
      response: {
        set: { "X-Frame-Options": ["DENY"] },
        require: { status_code: [200, 201] },
      },
    };
    const formValues = parseHeaders(original);
    const result = toHeaders(formValues, original);

    expect(result.response?.require).toEqual({ status_code: [200, 201] });
  });
});

describe("converters/basic-auth", () => {
  it("returns defaults for undefined", () => {
    const result = parseBasicAuth(undefined);
    expect(result.accounts).toHaveLength(1);
    expect(result.realm).toBe("");
  });

  it("parses accounts and realm", () => {
    const handler: AuthenticationHandler = {
      handler: "authentication",
      providers: {
        http_basic: {
          hash: { algorithm: "bcrypt" },
          accounts: [{ username: "admin", password: "$2a$14$hash" }],
          realm: "Admin Area",
        },
      },
    };
    const result = parseBasicAuth(handler);
    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0]?.username).toBe("admin");
    expect(result.accounts[0]?.isHashed).toBe(true);
    expect(result.realm).toBe("Admin Area");
  });

  it("preserves hash config on roundtrip (does not hardcode bcrypt)", () => {
    const original: AuthenticationHandler = {
      handler: "authentication",
      providers: {
        http_basic: {
          hash: { algorithm: "scrypt", n: 32768 },
          accounts: [{ username: "user", password: "hashed" }],
          hash_cache: { capacity: 100 },
        },
      },
    } as AuthenticationHandler;
    const formValues = parseBasicAuth(original);
    const result = toBasicAuth(formValues, original);

    expect(result.providers?.http_basic?.hash).toEqual({ algorithm: "scrypt", n: 32768 });
    expect((result.providers?.http_basic as Record<string, unknown>)?.["hash_cache"]).toEqual({
      capacity: 100,
    });
  });

  it("preserves other auth providers on roundtrip", () => {
    const original: AuthenticationHandler = {
      handler: "authentication",
      providers: {
        http_basic: {
          hash: { algorithm: "bcrypt" },
          accounts: [{ username: "admin", password: "pass" }],
        },
        jwt: { token_source: "header" },
      },
    } as AuthenticationHandler;
    const formValues = parseBasicAuth(original);
    const result = toBasicAuth(formValues, original);

    expect((result.providers as Record<string, unknown>)?.["jwt"]).toEqual({
      token_source: "header",
    });
  });
});

describe("converters/cors", () => {
  it("returns defaults for undefined", () => {
    const result = parseCors(undefined);
    expect(result.origins).toBe("*");
    expect(result.credentials).toBe(false);
  });

  it("parses CORS headers from handler", () => {
    const handler: HeadersHandler = {
      handler: "headers",
      response: {
        set: {
          "Access-Control-Allow-Origin": ["https://example.com"],
          "Access-Control-Allow-Methods": ["GET, POST"],
          "Access-Control-Allow-Headers": ["Authorization"],
          "Access-Control-Allow-Credentials": ["true"],
        },
        deferred: true,
      },
    };
    const result = parseCors(handler);
    expect(result.origins).toBe("https://example.com");
    expect(result.methods).toBe("GET, POST");
    expect(result.headers).toBe("Authorization");
    expect(result.credentials).toBe(true);
  });

  it("preserves non-CORS response headers on roundtrip", () => {
    const original: HeadersHandler = {
      handler: "headers",
      response: {
        set: {
          "Access-Control-Allow-Origin": ["*"],
          "X-Custom-Header": ["custom-value"],
          "Strict-Transport-Security": ["max-age=31536000"],
        },
        deferred: true,
      },
    };
    const formValues = parseCors(original);
    const result = toCors(formValues, original);

    expect(result.response?.set?.["X-Custom-Header"]).toEqual(["custom-value"]);
    expect(result.response?.set?.["Strict-Transport-Security"]).toEqual(["max-age=31536000"]);
    expect(result.response?.set?.["Access-Control-Allow-Origin"]).toEqual(["*"]);
  });

  it("preserves request header ops on roundtrip", () => {
    const original: HeadersHandler = {
      handler: "headers",
      request: { set: { "X-Real-IP": ["{remote_host}"] } },
      response: {
        set: { "Access-Control-Allow-Origin": ["*"] },
        deferred: true,
      },
    };
    const formValues = parseCors(original);
    const result = toCors(formValues, original);

    expect(result.request).toEqual({ set: { "X-Real-IP": ["{remote_host}"] } });
  });
});

describe("converters/tls-policy", () => {
  it("returns defaults for undefined", () => {
    const result = parsePolicy(undefined);
    expect(result.subjects).toBe("");
    expect(result.issuers).toHaveLength(1);
    expect(result.onDemand).toBe(false);
  });

  it("parses a full policy", () => {
    const policy: AutomationPolicy = {
      subjects: ["example.com", "*.example.com"],
      issuers: [{ module: "acme", email: "admin@example.com", ca: "https://acme.example.com" }],
      key_type: "p256",
      on_demand: true,
      must_staple: true,
    };
    const result = parsePolicy(policy);
    expect(result.subjects).toBe("example.com, *.example.com");
    expect(result.issuers[0]?.module).toBe("acme");
    expect(result.issuers[0]?.email).toBe("admin@example.com");
    expect(result.keyType).toBe("p256");
    expect(result.onDemand).toBe(true);
    expect(result.mustStaple).toBe(true);
  });

  it("preserves unmanaged fields on roundtrip", () => {
    const original: AutomationPolicy = {
      subjects: ["example.com"],
      issuers: [{ module: "acme", email: "admin@example.com" }],
      get_certificate: [{ via: "http", url: "https://certs.example.com" }],
      storage: { module: "consul", address: "localhost:8500" },
      renewal_window_ratio: 0.5,
      disable_ocsp_stapling: true,
      reuse_private_keys: true,
    };
    const formValues = parsePolicy(original);
    const result = toPolicy(formValues, original);

    expect(result.get_certificate).toEqual([{ via: "http", url: "https://certs.example.com" }]);
    expect(result.storage).toEqual({ module: "consul", address: "localhost:8500" });
    expect(result.renewal_window_ratio).toBe(0.5);
    expect(result.disable_ocsp_stapling).toBe(true);
    expect(result["reuse_private_keys"]).toBe(true);
  });

  it("clears fields when form values are empty", () => {
    const original: AutomationPolicy = {
      subjects: ["example.com"],
      key_type: "p256",
      on_demand: true,
    };
    const formValues = parsePolicy(original);
    formValues.subjects = "";
    formValues.keyType = "";
    formValues.onDemand = false;
    const result = toPolicy(formValues, original);

    expect(result.subjects).toBeUndefined();
    expect(result.key_type).toBeUndefined();
    expect(result.on_demand).toBeUndefined();
  });
});
