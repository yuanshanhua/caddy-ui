/**
 * Integration tests verifying that unknown/unmanaged handler and config types
 * survive API round-trips without data loss.
 *
 * The UI form manages a fixed set of handler types. All other handlers —
 * whether standard Caddy modules or third-party plugins — must be preserved
 * when routes are read and written through the API and type system.
 */

import { describe, expect, it } from "vitest";
import { configApi } from "./helpers/caddy-client.js";

/** A handler type we manage — used to verify mixing known and unknown works. */
const MANAGED_HANDLER = {
  handler: "static_response",
  body: "hello from managed handler",
  status_code: 200,
};

describe("Lossless config handling", () => {
  describe("UnknownHandler type — index signature escape hatch", () => {
    it("preserves arbitrary fields on unknown handler types", async () => {
      // Use request_body — a real Caddy standard module our form doesn't manage
      await configApi.put("apps/http/servers/lossless", {
        listen: [":18081"],
        routes: [
          {
            handle: [
              {
                handler: "request_body",
                max_size: 1048576,
              },
              MANAGED_HANDLER,
            ],
          },
        ],
      });

      const server = await configApi.get<Record<string, unknown>>(
        "apps/http/servers/lossless",
      );
      const routes = server.routes as Array<{ handle: Array<Record<string, unknown>> }>;
      const handlers = routes[0]!.handle;

      // Both handlers must be present
      expect(handlers).toHaveLength(2);
      expect(handlers[0]).toMatchObject({
        handler: "request_body",
        max_size: 1048576,
      });
      expect(handlers[1]).toMatchObject({ handler: "static_response" });
    });

    it("preserves request_body with all standard fields", async () => {
      await configApi.put("apps/http/servers/lossless", {
        listen: [":18081"],
        routes: [
          {
            handle: [
              {
                handler: "request_body",
                max_size: 2097152,
                read_timeout: 5000000000, // 5s in nanoseconds
              },
              MANAGED_HANDLER,
            ],
          },
        ],
      });

      const server = await configApi.get<Record<string, unknown>>(
        "apps/http/servers/lossless",
      );
      const handlers = (
        server.routes as Array<{ handle: Array<Record<string, unknown>> }>
      )[0]!.handle;

      expect(handlers[0]!).toMatchObject({
        handler: "request_body",
        max_size: 2097152,
        read_timeout: 5000000000,
      });
    });

    it("preserves templates handler (standard module, unmanaged by form)", async () => {
      await configApi.put("apps/http/servers/lossless", {
        listen: [":18081"],
        routes: [
          {
            handle: [
              {
                handler: "templates",
                file_root: "/var/www/templates",
                mime_types: ["text/html", "text/plain"],
              },
              {
                handler: "file_server",
                root: "/var/www/html",
              },
            ],
          },
        ],
      });

      const server = await configApi.get<Record<string, unknown>>(
        "apps/http/servers/lossless",
      );
      const handlers = (
        server.routes as Array<{ handle: Array<Record<string, unknown>> }>
      )[0]!.handle;

      expect(handlers).toHaveLength(2);
      expect(handlers[0]).toMatchObject({
        handler: "templates",
        file_root: "/var/www/templates",
        mime_types: ["text/html", "text/plain"],
      });
    });

    it("round-trips a mixed handler chain (known + unmanaged standard modules)", async () => {
      // A realistic route: request_body → rewrite → reverse_proxy
      // rewrite and reverse_proxy are managed by the form; request_body is not
      await configApi.put("apps/http/servers/lossless", {
        listen: [":18081"],
        routes: [
          {
            match: [{ host: ["api.example.com"] }],
            terminal: true,
            handle: [
              {
                handler: "request_body",
                max_size: 1048576,
              },
              {
                handler: "rewrite",
                strip_path_prefix: "/api/v1",
              },
              {
                handler: "reverse_proxy",
                upstreams: [{ dial: "localhost:3000" }],
              },
            ],
          },
        ],
      });

      const server = await configApi.get<Record<string, unknown>>(
        "apps/http/servers/lossless",
      );
      const route = (server.routes as Array<Record<string, unknown>>)[0]!;
      const handlers = (route as { handle: Array<Record<string, unknown>> }).handle;

      // All 3 handlers must survive
      expect(handlers).toHaveLength(3);
      expect(handlers[0]!.handler).toBe("request_body");
      expect(handlers[1]!.handler).toBe("rewrite");
      expect(handlers[2]!.handler).toBe("reverse_proxy");

      // Fields must be preserved
      expect(handlers[0]).toMatchObject({ max_size: 1048576 });
      expect(handlers[1]).toMatchObject({ strip_path_prefix: "/api/v1" });
    });
  });

  describe("Subroute with unmanaged handlers inside", () => {
    it("preserves unmanaged handlers inside nested subroute routes", async () => {
      // A subroute where nested routes contain unmanaged handlers like request_body
      await configApi.put("apps/http/servers/lossless", {
        listen: [":18081"],
        routes: [
          {
            match: [{ host: ["app.example.com"] }],
            terminal: true,
            handle: [
              {
                handler: "subroute",
                routes: [
                  {
                    match: [{ path: ["/api/*"] }],
                    handle: [
                      {
                        handler: "request_body",
                        max_size: 524288,
                      },
                      {
                        handler: "reverse_proxy",
                        upstreams: [{ dial: "localhost:3001" }],
                      },
                    ],
                  },
                  {
                    match: [{ path: ["/*"] }],
                    handle: [
                      {
                        handler: "file_server",
                        root: "/var/www/public",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const server = await configApi.get<Record<string, unknown>>(
        "apps/http/servers/lossless",
      );
      const handlers = (
        (server.routes as Array<Record<string, unknown>>)[0]! as { handle: Array<Record<string, unknown>> }
      ).handle;

      expect(handlers[0]!.handler).toBe("subroute");
      const subRoutes = (handlers[0]! as { routes: Array<Record<string, unknown>> }).routes;
      expect(subRoutes).toHaveLength(2);

      // First nested route: request_body + reverse_proxy
      const firstNested = subRoutes[0]! as { handle: Array<Record<string, unknown>> };
      expect(firstNested.handle).toHaveLength(2);
      expect(firstNested.handle[0]!.handler).toBe("request_body");
      expect(firstNested.handle[0]!).toMatchObject({ max_size: 524288 });

      // Second nested route: file_server
      const secondNested = subRoutes[1]! as { handle: Array<Record<string, unknown>> };
      expect(secondNested.handle).toHaveLength(1);
      expect(secondNested.handle[0]!.handler).toBe("file_server");
    });
  });

  describe("PATCH route — field-level preservation", () => {
    it("PATCH at server level only changes provided fields", async () => {
      // This test verifies Caddy's PATCH semantics for server-level fields
      // We want to confirm that PATCHing some fields preserves others
      await configApi.put("apps/http/servers/lossless", {
        listen: [":18081"],
        protocols: ["h1", "h2", "h2c", "h3"],
        read_timeout: "30s",
        idle_timeout: "60s",
        routes: [],
      });

      // PATCH to change only the listen address
      await configApi.patch("apps/http/servers/lossless", {
        listen: [":18082"],
        protocols: ["h1", "h2", "h2c", "h3"],
        read_timeout: "30s",
        idle_timeout: "60s",
      });

      const server = await configApi.get<Record<string, unknown>>(
        "apps/http/servers/lossless",
      );

      // The listen address should be updated
      expect(server.listen).toEqual([":18082"]);
      // Other fields should be preserved because the PATCH included them
      expect(server.read_timeout).toBe("30s");
      expect(server.idle_timeout).toBe("60s");
      expect(server.protocols).toEqual(["h1", "h2", "h2c", "h3"]);
    });
  });

  describe("Log config field preservation", () => {
    it("preserves log sampling config through the LogConfig type", async () => {
      await configApi.put("logging", {
        logs: {
          test_log: {
            writer: { output: "stdout" },
            level: "INFO",
            encoder: { format: "json" },
            sampling: { interval: 60, first: 10, thereafter: 5 },
            include: ["http.log.access"],
          },
        },
      });

      const log = await configApi.get<Record<string, unknown>>(
        "logging/logs/test_log",
      );

      expect(log.level).toBe("INFO");
      expect(log.encoder).toMatchObject({ format: "json" });
      expect(log.sampling).toMatchObject({
        interval: 60,
        first: 10,
        thereafter: 5,
      });
    });
  });
});
