/**
 * Integration tests for route operations.
 *
 * Tests the patterns used in src/hooks/use-routes.ts against a real Caddy.
 */

import { describe, expect, it } from "vitest";
import { CaddyApiError, configApi } from "./helpers/caddy-client.js";
import { MINIMAL_SERVER, SAMPLE_ROUTE, SAMPLE_ROUTE_B } from "./helpers/fixtures.js";

describe("Route operations", () => {
  describe("useAddRoute pattern — POST to append", () => {
    it("appends a route to an existing server's routes array", async () => {
      await configApi.put("apps/http/servers/srv", MINIMAL_SERVER);

      await configApi.post("apps/http/servers/srv/routes", SAMPLE_ROUTE);

      const routes = await configApi.get<unknown[]>("apps/http/servers/srv/routes");
      // Original route + appended route
      expect(routes).toHaveLength(2);
      expect(routes[1]).toMatchObject(SAMPLE_ROUTE);
    });

    it("can append multiple routes sequentially", async () => {
      await configApi.put("apps/http/servers/srv", { listen: [":18080"], routes: [] });

      await configApi.post("apps/http/servers/srv/routes", SAMPLE_ROUTE);
      await configApi.post("apps/http/servers/srv/routes", SAMPLE_ROUTE_B);

      const routes = await configApi.get<unknown[]>("apps/http/servers/srv/routes");
      expect(routes).toHaveLength(2);
    });
  });

  describe("useUpdateRoute pattern — PATCH at index", () => {
    it("replaces a route at a specific index without affecting others", async () => {
      await configApi.put("apps/http/servers/srv", {
        listen: [":18080"],
        routes: [SAMPLE_ROUTE, SAMPLE_ROUTE_B],
      });

      // PATCH replaces the route at index 0
      const updatedRoute = {
        match: [{ path: ["/updated"] }],
        handle: [{ handler: "static_response", body: "updated", status_code: 200 }],
      };
      await configApi.patch("apps/http/servers/srv/routes/0", updatedRoute);

      const routes = await configApi.get<unknown[]>("apps/http/servers/srv/routes");
      expect(routes).toHaveLength(2);
      expect(routes[0]).toMatchObject(updatedRoute);
      // Second route untouched
      expect(routes[1]).toMatchObject(SAMPLE_ROUTE_B);
    });

    it("PATCH at non-existent index returns error", async () => {
      await configApi.put("apps/http/servers/srv", {
        listen: [":18080"],
        routes: [SAMPLE_ROUTE],
      });

      // Index 99 doesn't exist
      await expect(
        configApi.patch("apps/http/servers/srv/routes/99", {
          handle: [{ handler: "static_response", body: "nope" }],
        }),
      ).rejects.toThrow(CaddyApiError);
    });
  });

  describe("useReorderRoutes pattern — PATCH entire routes array", () => {
    it("replaces the entire routes array (reorder)", async () => {
      await configApi.put("apps/http/servers/srv", {
        listen: [":18080"],
        routes: [SAMPLE_ROUTE, SAMPLE_ROUTE_B],
      });

      // PATCH the routes field with reversed order
      // Note: We patch the server itself since PATCH replaces the value
      await configApi.patch("apps/http/servers/srv/routes", [SAMPLE_ROUTE_B, SAMPLE_ROUTE]);

      const routes = await configApi.get<unknown[]>("apps/http/servers/srv/routes");
      expect(routes).toHaveLength(2);
      expect(routes[0]).toMatchObject(SAMPLE_ROUTE_B);
      expect(routes[1]).toMatchObject(SAMPLE_ROUTE);
    });
  });

  describe("useDeleteRoute pattern — DELETE at index", () => {
    it("removes a route at a specific index", async () => {
      await configApi.put("apps/http/servers/srv", {
        listen: [":18080"],
        routes: [SAMPLE_ROUTE, SAMPLE_ROUTE_B],
      });

      await configApi.delete("apps/http/servers/srv/routes/0");

      const routes = await configApi.get<unknown[]>("apps/http/servers/srv/routes");
      expect(routes).toHaveLength(1);
      expect(routes[0]).toMatchObject(SAMPLE_ROUTE_B);
    });
  });
});
