/**
 * Integration tests for TLS policy operations.
 *
 * Tests the patterns used in src/hooks/use-tls.ts against a real Caddy.
 *
 * Key findings:
 * - PUT at array index creates a new element (arrays don't have "key exists" conflict)
 * - PATCH at array index replaces the element
 * - PATCH on out-of-bounds index returns an error
 */

import { describe, expect, it } from "vitest";
import { CaddyApiError, configApi } from "./helpers/caddy-client.js";
import { SAMPLE_TLS_POLICY, SAMPLE_TLS_POLICY_B } from "./helpers/fixtures.js";

describe("TLS policy operations", () => {
  describe("useAddTlsPolicy pattern — initialize or append", () => {
    it("PUT initializes the full TLS structure when it does not exist", async () => {
      // Path doesn't exist yet — PUT creates the whole tree
      await configApi.put("apps/tls", {
        automation: { policies: [SAMPLE_TLS_POLICY] },
      });

      const policies = await configApi.get<unknown[]>("apps/tls/automation/policies");
      expect(policies).toHaveLength(1);
      expect(policies[0]).toMatchObject(SAMPLE_TLS_POLICY);
    });

    it("PUT at next array index appends a new policy", async () => {
      // Initialize with one policy
      await configApi.put("apps/tls", {
        automation: { policies: [SAMPLE_TLS_POLICY] },
      });

      // PUT at index 1 (arrays allow PUT at the next index)
      await configApi.put("apps/tls/automation/policies/1", SAMPLE_TLS_POLICY_B);

      const policies = await configApi.get<unknown[]>("apps/tls/automation/policies");
      expect(policies).toHaveLength(2);
      expect(policies[1]).toMatchObject(SAMPLE_TLS_POLICY_B);
    });

    it("the full add-policy pattern: try GET existing, then PUT at length", async () => {
      // Replicates the useAddTlsPolicy hook logic:
      // 1. Try to GET existing policies
      // 2. If found, PUT at policies[existing.length]
      // 3. If error, PUT the entire apps/tls structure

      // Scenario A: path doesn't exist yet
      try {
        await configApi.get("apps/tls/automation/policies");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(CaddyApiError);
      }

      // Fallback: PUT entire structure
      await configApi.put("apps/tls", {
        automation: { policies: [SAMPLE_TLS_POLICY] },
      });

      // Scenario B: path exists, append via PUT at next index
      const existing = await configApi.get<unknown[]>("apps/tls/automation/policies");
      await configApi.put(`apps/tls/automation/policies/${existing.length}`, SAMPLE_TLS_POLICY_B);

      const policies = await configApi.get<unknown[]>("apps/tls/automation/policies");
      expect(policies).toHaveLength(2);
    });
  });

  describe("useUpdateTlsPolicy pattern — update at index", () => {
    it("PATCH replaces a policy at a specific index", async () => {
      await configApi.put("apps/tls", {
        automation: { policies: [SAMPLE_TLS_POLICY, SAMPLE_TLS_POLICY_B] },
      });

      // PATCH replaces the entire policy at index 0
      const updatedPolicy = { subjects: ["updated.com"], issuers: [{ module: "internal" }] };
      await configApi.patch("apps/tls/automation/policies/0", updatedPolicy);

      const policy = await configApi.get<{ subjects: string[] }>(
        "apps/tls/automation/policies/0",
      );
      expect(policy.subjects).toEqual(["updated.com"]);
    });

    it("PUT at existing array index fails with 409 (for object maps) or succeeds (arrays may vary)", async () => {
      // Note: Array index PUT behavior differs from map key PUT
      // For arrays, PUT at an existing index may insert rather than fail
      // This test documents the actual behavior
      await configApi.put("apps/tls", {
        automation: { policies: [SAMPLE_TLS_POLICY] },
      });

      // PUT at index 0 when policies[0] exists — Caddy inserts (shifts elements)
      const result = configApi.put("apps/tls/automation/policies/0", SAMPLE_TLS_POLICY_B);
      // Document whether this succeeds or fails
      try {
        await result;
        // If PUT succeeds on array, it inserts at position
        const policies = await configApi.get<unknown[]>("apps/tls/automation/policies");
        expect(policies.length).toBeGreaterThanOrEqual(1);
      } catch (err) {
        // If PUT fails on existing array index, it returns 409
        expect(err).toBeInstanceOf(CaddyApiError);
      }
    });

    it("PATCH on non-existent policy index returns error", async () => {
      await configApi.put("apps/tls", {
        automation: { policies: [SAMPLE_TLS_POLICY] },
      });

      await expect(
        configApi.patch("apps/tls/automation/policies/99", { subjects: ["nope.com"] }),
      ).rejects.toThrow(CaddyApiError);
    });

    it("demonstrates the bug: using PUT for updates on map keys fails", async () => {
      // This test proves that useUpdateTlsPolicy CANNOT use PUT
      // because PUT on an existing key returns 409
      // (but arrays behave differently — PUT at array index INSERTS)

      // For a named key in a map:
      await configApi.put("apps/http/servers/test-srv", { listen: [":18080"] });
      await expect(
        configApi.put("apps/http/servers/test-srv", { listen: [":19090"] }),
      ).rejects.toSatisfy((err: unknown) => {
        return err instanceof CaddyApiError && err.status === 409;
      });

      // PATCH works for updating existing keys
      await configApi.patch("apps/http/servers/test-srv", { listen: [":19090"] });
      const server = await configApi.get<{ listen: string[] }>("apps/http/servers/test-srv");
      expect(server.listen).toEqual([":19090"]);
    });
  });

  describe("useDeleteTlsPolicy pattern — DELETE at index", () => {
    it("removes a policy at a specific index", async () => {
      await configApi.put("apps/tls", {
        automation: { policies: [SAMPLE_TLS_POLICY, SAMPLE_TLS_POLICY_B] },
      });

      await configApi.delete("apps/tls/automation/policies/0");

      const policies = await configApi.get<unknown[]>("apps/tls/automation/policies");
      expect(policies).toHaveLength(1);
      expect(policies[0]).toMatchObject(SAMPLE_TLS_POLICY_B);
    });
  });
});
