/**
 * Integration tests for HTTP server (site) operations.
 *
 * Tests the patterns used in src/hooks/use-sites.ts against a real Caddy.
 *
 * Key behavior:
 * - PUT is for creating new servers (fails with 409 if already exists)
 * - PATCH is for updating existing servers (fails with 404 if doesn't exist)
 * - PATCH replaces the entire value — callers must include all fields
 */

import { describe, expect, it } from "vitest";
import { CaddyApiError, configApi } from "./helpers/caddy-client.js";
import { MINIMAL_SERVER } from "./helpers/fixtures.js";

describe("Site (HTTP server) operations", () => {
  describe("useCreateSite pattern — PUT new server", () => {
    it("creates a new server with PUT when path does not exist", async () => {
      await configApi.put("apps/http/servers/my-site", MINIMAL_SERVER);

      const server = await configApi.get<typeof MINIMAL_SERVER>("apps/http/servers/my-site");
      expect(server.listen).toEqual([":18080"]);
      expect(server.routes).toHaveLength(1);
    });

    it("PUT fails with 409 if server already exists", async () => {
      await configApi.put("apps/http/servers/site-a", { listen: [":18081"] });

      // Trying to PUT again fails — PUT is CREATE-only
      await expect(
        configApi.put("apps/http/servers/site-a", { listen: [":18082"] }),
      ).rejects.toSatisfy((err: unknown) => {
        return err instanceof CaddyApiError && err.status === 409;
      });
    });

    it("can create multiple servers independently", async () => {
      await configApi.put("apps/http/servers/site-a", { listen: [":18081"] });
      await configApi.put("apps/http/servers/site-b", { listen: [":18082"] });

      const servers = await configApi.get<Record<string, unknown>>("apps/http/servers");
      expect(Object.keys(servers)).toContain("site-a");
      expect(Object.keys(servers)).toContain("site-b");
    });
  });

  describe("useUpdateSite pattern — updating an existing server", () => {
    it("PATCH replaces the server value (callers must provide full object)", async () => {
      // Create server with listen + routes
      await configApi.put("apps/http/servers/srv", MINIMAL_SERVER);

      // PATCH replaces the entire value — must include ALL fields
      const updated = { ...MINIMAL_SERVER, listen: [":19090"] };
      await configApi.patch("apps/http/servers/srv", updated);

      const server = await configApi.get<{ listen: string[]; routes: unknown[] }>(
        "apps/http/servers/srv",
      );
      expect(server.listen).toEqual([":19090"]);
      expect(server.routes).toHaveLength(1); // preserved because we passed it
    });

    it("PATCH with partial object loses unincluded fields", async () => {
      // Create server with listen + routes
      await configApi.put("apps/http/servers/srv", MINIMAL_SERVER);

      // PATCH with ONLY listen — routes will be LOST
      await configApi.patch("apps/http/servers/srv", { listen: [":19090"] });

      const server = await configApi.get<{ listen: string[]; routes?: unknown[] }>(
        "apps/http/servers/srv",
      );
      expect(server.listen).toEqual([":19090"]);
      expect(server.routes).toBeUndefined(); // routes lost!
    });

    it("PUT fails when trying to update existing server", async () => {
      // This demonstrates the bug: using PUT for updates returns 409
      await configApi.put("apps/http/servers/srv", MINIMAL_SERVER);

      await expect(
        configApi.put("apps/http/servers/srv", { listen: [":19090"] }),
      ).rejects.toSatisfy((err: unknown) => {
        return err instanceof CaddyApiError && err.status === 409;
      });
    });

    it("PATCH on non-existent server returns 404", async () => {
      // Need to have at least one server so the map exists
      await configApi.put("apps/http/servers/other", { listen: [":18080"] });

      await expect(
        configApi.patch("apps/http/servers/nonexistent", { listen: [":18080"] }),
      ).rejects.toSatisfy((err: unknown) => {
        return err instanceof CaddyApiError && err.status === 404;
      });
    });
  });

  describe("useEnsureHttpApp pattern — initialize apps/http", () => {
    it("PUT creates apps/http structure when it does not exist", async () => {
      // Start with empty config (from beforeEach)
      await configApi.put("apps/http", { servers: {} });

      const http = await configApi.get<{ servers: Record<string, unknown> }>("apps/http");
      expect(http.servers).toEqual({});
    });

    it("GET apps/http/servers returns error when not initialized", async () => {
      // On empty config, intermediate path doesn't exist → 400
      await expect(configApi.get("apps/http/servers")).rejects.toThrow(CaddyApiError);
    });
  });

  describe("useDeleteSite pattern — DELETE server", () => {
    it("removes a server without affecting others", async () => {
      await configApi.put("apps/http/servers/keep", { listen: [":18081"] });
      await configApi.put("apps/http/servers/remove", { listen: [":18082"] });

      await configApi.delete("apps/http/servers/remove");

      const servers = await configApi.get<Record<string, unknown>>("apps/http/servers");
      expect(Object.keys(servers)).toContain("keep");
      expect(Object.keys(servers)).not.toContain("remove");
    });
  });
});
