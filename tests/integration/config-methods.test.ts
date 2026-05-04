/**
 * Integration tests for Caddy Admin API method semantics.
 *
 * Verifies the fundamental behavior of GET/PUT/PATCH/POST/DELETE
 * against a real Caddy instance.
 *
 * Key findings about Caddy's config API semantics:
 * - PUT creates a NEW key. Returns 409 if key already exists.
 * - PATCH replaces the value at an existing key. Returns 404 if key doesn't exist.
 * - POST appends to an array at the given path.
 * - DELETE removes a key. Returns 404 if key doesn't exist.
 * - GET returns 400 "invalid traversal path" if an intermediate path doesn't exist.
 */

import { describe, expect, it } from "vitest";
import { CaddyApiError, configApi } from "./helpers/caddy-client.js";

describe("Caddy Admin API method semantics", () => {
  describe("GET", () => {
    it("returns the full config when no path specified", async () => {
      const config = await configApi.get<Record<string, unknown>>();
      expect(config).toBeDefined();
    });

    it("returns value at an existing path", async () => {
      // First create a value
      await configApi.put("apps/http/servers/test", { listen: [":18080"] });
      const server = await configApi.get<{ listen: string[] }>("apps/http/servers/test");
      expect(server.listen).toEqual([":18080"]);
    });

    it("returns 400 for a path where intermediate structure doesn't exist", async () => {
      // Caddy returns 400 "invalid traversal path" when parent path doesn't exist
      await expect(configApi.get("apps/http/servers/nonexistent")).rejects.toSatisfy(
        (err: unknown) => {
          return err instanceof CaddyApiError && err.status === 400;
        },
      );
    });
  });

  describe("PUT", () => {
    it("creates a value at a non-existent path (builds intermediate structure)", async () => {
      await configApi.put("apps/http/servers/new-server", { listen: [":18080"] });
      const result = await configApi.get<{ listen: string[] }>("apps/http/servers/new-server");
      expect(result.listen).toEqual([":18080"]);
    });

    it("returns 409 when trying to PUT a key that already exists", async () => {
      // PUT is CREATE-only — it fails if the key already exists
      await configApi.put("apps/http/servers/srv", { listen: [":18080"] });

      await expect(
        configApi.put("apps/http/servers/srv", { listen: [":19090"] }),
      ).rejects.toSatisfy((err: unknown) => {
        return err instanceof CaddyApiError && err.status === 409;
      });
    });
  });

  describe("PATCH", () => {
    it("replaces the value at an existing key", async () => {
      // Create initial object with multiple fields
      await configApi.put("apps/http/servers/srv", {
        listen: [":18080"],
        routes: [{ handle: [{ handler: "static_response", body: "hi" }] }],
      });

      // PATCH replaces the entire value (it's NOT a deep merge!)
      await configApi.patch("apps/http/servers/srv", { listen: [":19090"] });

      const result = await configApi.get<{ listen: string[]; routes?: unknown[] }>(
        "apps/http/servers/srv",
      );
      expect(result.listen).toEqual([":19090"]);
      // routes is GONE — PATCH replaces the whole value, not a merge
      expect(result.routes).toBeUndefined();
    });

    it("returns 404 when patching a non-existent key", async () => {
      // First create the parent structure so we isolate the "key not found" error
      await configApi.put("apps/http/servers/exists", { listen: [":18080"] });

      await expect(
        configApi.patch("apps/http/servers/nonexistent", { listen: [":18080"] }),
      ).rejects.toSatisfy((err: unknown) => {
        return err instanceof CaddyApiError && err.status === 404;
      });
    });

    it("can replace an array element at an index", async () => {
      // Setup: server with routes
      await configApi.put("apps/http/servers/srv", {
        listen: [":18080"],
        routes: [
          { handle: [{ handler: "static_response", body: "route-0" }] },
          { handle: [{ handler: "static_response", body: "route-1" }] },
        ],
      });

      // PATCH at a specific array index replaces that element
      await configApi.patch("apps/http/servers/srv/routes/0", {
        handle: [{ handler: "static_response", body: "updated-route-0" }],
      });

      const routes = await configApi.get<unknown[]>("apps/http/servers/srv/routes");
      expect(routes).toHaveLength(2);
      expect(routes[0]).toMatchObject({
        handle: [{ handler: "static_response", body: "updated-route-0" }],
      });
      // Second route unchanged
      expect(routes[1]).toMatchObject({
        handle: [{ handler: "static_response", body: "route-1" }],
      });
    });
  });

  describe("POST", () => {
    it("appends a value to an existing array", async () => {
      // Setup: server with one route
      await configApi.put("apps/http/servers/srv", {
        listen: [":18080"],
        routes: [{ handle: [{ handler: "static_response", body: "route-0" }] }],
      });

      // POST appends to the routes array
      await configApi.post("apps/http/servers/srv/routes", {
        handle: [{ handler: "static_response", body: "route-1" }],
      });

      const routes = await configApi.get<unknown[]>("apps/http/servers/srv/routes");
      expect(routes).toHaveLength(2);
      expect(routes[1]).toMatchObject({
        handle: [{ handler: "static_response", body: "route-1" }],
      });
    });
  });

  describe("DELETE", () => {
    it("removes the value at an existing path", async () => {
      await configApi.put("apps/http/servers/srv", { listen: [":18080"] });
      await configApi.delete("apps/http/servers/srv");

      // After deleting the server, GET returns null or error
      // The key is gone from the servers map
      const servers = await configApi.get<Record<string, unknown>>("apps/http/servers");
      expect(servers["srv"]).toBeUndefined();
    });

    it("returns 404 when deleting a non-existent key", async () => {
      // Create parent structure first
      await configApi.put("apps/http/servers/exists", { listen: [":18080"] });

      await expect(configApi.delete("apps/http/servers/nonexistent")).rejects.toSatisfy(
        (err: unknown) => {
          return err instanceof CaddyApiError && err.status === 404;
        },
      );
    });
  });

  describe("load", () => {
    it("replaces the entire config atomically", async () => {
      // Set up some config
      await configApi.put("apps/http/servers/srv", { listen: [":18080"] });

      // Load replaces everything (preserve admin for test stability)
      await configApi.load({
        admin: { listen: "localhost:12019", enforce_origin: false },
        apps: {
          http: {
            servers: {
              different: { listen: [":19090"] },
            },
          },
        },
      });

      // Old server is gone, new server exists
      const server = await configApi.get<{ listen: string[] }>("apps/http/servers/different");
      expect(server.listen).toEqual([":19090"]);
    });
  });

  describe("PUT vs PATCH — the core distinction", () => {
    it("PUT creates new, PATCH updates existing", async () => {
      // PUT creates
      await configApi.put("apps/http/servers/srv", { listen: [":18080"] });

      // PUT again fails (key exists)
      await expect(
        configApi.put("apps/http/servers/srv", { listen: [":19090"] }),
      ).rejects.toSatisfy((err: unknown) => {
        return err instanceof CaddyApiError && err.status === 409;
      });

      // PATCH succeeds (key exists)
      await configApi.patch("apps/http/servers/srv", { listen: [":19090"] });
      const result = await configApi.get<{ listen: string[] }>("apps/http/servers/srv");
      expect(result.listen).toEqual([":19090"]);
    });

    it("PATCH fails on new key, PUT succeeds on new key", async () => {
      // PATCH fails (key doesn't exist)
      // Need parent structure first
      await configApi.put("apps/http/servers/dummy", { listen: [":18080"] });

      await expect(
        configApi.patch("apps/http/servers/newkey", { listen: [":18081"] }),
      ).rejects.toSatisfy((err: unknown) => {
        return err instanceof CaddyApiError && err.status === 404;
      });

      // PUT succeeds (creates new key) — use a different port to avoid conflict
      await configApi.put("apps/http/servers/newkey", { listen: [":18081"] });
      const result = await configApi.get<{ listen: string[] }>("apps/http/servers/newkey");
      expect(result.listen).toEqual([":18081"]);
    });
  });
});
