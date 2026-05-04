/**
 * Integration tests for logging configuration operations.
 *
 * Tests the upsert pattern used in src/hooks/use-logging.ts against a real Caddy.
 *
 * Key behavior:
 * - PATCH on existing named log replaces its value
 * - PATCH on non-existent log path returns 404
 * - The upsert pattern: try PATCH, if 404 then PUT to create the structure
 */

import { describe, expect, it } from "vitest";
import { CaddyApiError, configApi } from "./helpers/caddy-client.js";
import { SAMPLE_LOG, SAMPLE_LOG_UPDATED } from "./helpers/fixtures.js";

describe("Logging operations", () => {
  describe("useUpsertLog pattern — try PATCH, fallback to PUT", () => {
    it("PATCH replaces an existing named log", async () => {
      // Initialize logging with a named log
      await configApi.put("logging", { logs: { mylog: SAMPLE_LOG } });

      // PATCH replaces the log value
      await configApi.patch("logging/logs/mylog", SAMPLE_LOG_UPDATED);

      const log = await configApi.get<{ level: string }>("logging/logs/mylog");
      expect(log.level).toBe("DEBUG");
    });

    it("PATCH on non-existent log path returns 404 (no logging configured)", async () => {
      // No logging config exists — intermediate path doesn't exist
      await expect(configApi.patch("logging/logs/newlog", SAMPLE_LOG)).rejects.toThrow(
        CaddyApiError,
      );
    });

    it("PATCH on non-existent log name returns 404 when logging exists", async () => {
      // Initialize logging with one log
      await configApi.put("logging", { logs: { existing: SAMPLE_LOG } });

      // PATCH a different log name — should fail (key doesn't exist)
      await expect(
        configApi.patch("logging/logs/newlog", SAMPLE_LOG),
      ).rejects.toSatisfy((err: unknown) => {
        return err instanceof CaddyApiError && err.status === 404;
      });
    });

    it("full upsert pattern: try PATCH, on 404 PUT to initialize", async () => {
      const name = "app-log";
      const log = SAMPLE_LOG;

      // Simulate the useUpsertLog hook logic:
      try {
        await configApi.patch(`logging/logs/${name}`, log);
        // Should fail on empty config
        expect.fail("Should have thrown");
      } catch (err) {
        if (!(err instanceof CaddyApiError)) throw err;
        // Fallback: PUT to initialize the entire logging structure
        const logs: Record<string, typeof log> = { [name]: log };
        await configApi.put("logging", { logs });
      }

      // Verify it was created
      const result = await configApi.get<{ level: string }>(`logging/logs/${name}`);
      expect(result.level).toBe("INFO");
    });

    it("full upsert pattern: PATCH succeeds when log already exists", async () => {
      // Pre-initialize
      await configApi.put("logging", { logs: { "app-log": SAMPLE_LOG } });

      const name = "app-log";
      const log = SAMPLE_LOG_UPDATED;

      // Simulate the useUpsertLog hook logic:
      let usedFallback = false;
      try {
        await configApi.patch(`logging/logs/${name}`, log);
        // Should succeed — log exists
      } catch (err) {
        if (!(err instanceof CaddyApiError)) throw err;
        usedFallback = true;
        const logs: Record<string, typeof log> = { [name]: log };
        await configApi.put("logging", { logs });
      }

      expect(usedFallback).toBe(false); // PATCH should have succeeded
      const result = await configApi.get<{ level: string }>(`logging/logs/${name}`);
      expect(result.level).toBe("DEBUG");
    });

    it("PATCH replaces the log without affecting sibling logs", async () => {
      // Initialize with multiple logs
      await configApi.put("logging", {
        logs: {
          "log-a": SAMPLE_LOG,
          "log-b": { writer: { output: "stderr" }, level: "WARN" },
        },
      });

      // Update only log-a (PATCH replaces log-a's value, not the whole logs map)
      await configApi.patch("logging/logs/log-a", SAMPLE_LOG_UPDATED);

      // log-b should be unaffected
      const logB = await configApi.get<{ level: string }>("logging/logs/log-b");
      expect(logB.level).toBe("WARN");

      // log-a should be updated
      const logA = await configApi.get<{ level: string }>("logging/logs/log-a");
      expect(logA.level).toBe("DEBUG");
    });
  });

  describe("useDeleteLog pattern — DELETE named log", () => {
    it("removes a named log without affecting others", async () => {
      await configApi.put("logging", {
        logs: {
          "log-a": SAMPLE_LOG,
          "log-b": { writer: { output: "stderr" }, level: "WARN" },
        },
      });

      await configApi.delete("logging/logs/log-a");

      const logs = await configApi.get<Record<string, unknown>>("logging/logs");
      expect(Object.keys(logs)).not.toContain("log-a");
      expect(Object.keys(logs)).toContain("log-b");
    });

    it("DELETE non-existent log returns 404", async () => {
      await configApi.put("logging", { logs: { "log-a": SAMPLE_LOG } });

      await expect(
        configApi.delete("logging/logs/nonexistent"),
      ).rejects.toSatisfy((err: unknown) => {
        return err instanceof CaddyApiError && err.status === 404;
      });
    });
  });
});
