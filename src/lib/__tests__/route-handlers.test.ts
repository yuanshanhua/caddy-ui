/**
 * Unit tests for handler preservation logic.
 *
 * These tests verify that the helper functions used by route-form-dialog.tsx
 * correctly identify and preserve handlers that the form doesn't manage.
 */

import { describe, expect, it } from "vitest";
import {
  extractUnknownHandlers,
  isFormManagedHandler,
  isUnknownHandler,
  mergeHandlers,
} from "@/lib/route-handlers";
import type { HttpHandler } from "@/types/handlers";

describe("route-handlers", () => {
  describe("isFormManagedHandler", () => {
    it("returns true for reverse_proxy", () => {
      expect(isFormManagedHandler({ handler: "reverse_proxy" })).toBe(true);
    });
    it("returns true for file_server", () => {
      expect(isFormManagedHandler({ handler: "file_server" })).toBe(true);
    });
    it("returns true for static_response", () => {
      expect(isFormManagedHandler({ handler: "static_response" })).toBe(true);
    });
    it("returns true for subroute", () => {
      expect(isFormManagedHandler({ handler: "subroute" })).toBe(true);
    });
    it("returns true for headers", () => {
      expect(isFormManagedHandler({ handler: "headers" })).toBe(true);
    });
    it("returns true for encode", () => {
      expect(isFormManagedHandler({ handler: "encode" })).toBe(true);
    });
    it("returns true for rewrite", () => {
      expect(isFormManagedHandler({ handler: "rewrite" })).toBe(true);
    });
    it("returns true for authentication", () => {
      expect(isFormManagedHandler({ handler: "authentication" })).toBe(true);
    });
  });

  describe("isFormManagedHandler — unmanaged handlers", () => {
    it("returns false for request_body (standard but unmanaged)", () => {
      expect(isFormManagedHandler({ handler: "request_body" })).toBe(false);
    });
    it("returns false for templates (standard but unmanaged)", () => {
      expect(isFormManagedHandler({ handler: "templates" })).toBe(false);
    });
    it("returns false for map (standard but unmanaged)", () => {
      expect(isFormManagedHandler({ handler: "map" })).toBe(false);
    });
    it("returns false for push (standard but unmanaged)", () => {
      expect(isFormManagedHandler({ handler: "push" })).toBe(false);
    });
    it("returns false for intercept (standard but unmanaged)", () => {
      expect(isFormManagedHandler({ handler: "intercept" })).toBe(false);
    });
    it("returns false for tracing (standard but unmanaged)", () => {
      expect(isFormManagedHandler({ handler: "tracing" })).toBe(false);
    });
    it("returns false for arbitrary plugin handlers", () => {
      expect(isFormManagedHandler({ handler: "my_plugin" })).toBe(false);
      expect(isFormManagedHandler({ handler: "some_custom_auth" })).toBe(false);
    });
  });

  describe("extractUnknownHandlers", () => {
    it("returns empty array when all handlers are managed", () => {
      const handlers: HttpHandler[] = [
        { handler: "headers" },
        { handler: "rewrite" },
        { handler: "reverse_proxy", upstreams: [{ dial: "localhost:3000" }] },
      ];
      expect(extractUnknownHandlers(handlers)).toEqual([]);
    });

    it("extracts a single unknown handler", () => {
      const unknown = {
        handler: "request_body",
        max_size: 1048576,
      };
      const handlers: HttpHandler[] = [
        unknown,
        { handler: "reverse_proxy", upstreams: [{ dial: "localhost:3000" }] },
      ];
      const extracted = extractUnknownHandlers(handlers);
      expect(extracted).toHaveLength(1);
      expect(extracted[0]).toEqual(unknown);
    });

    it("extracts multiple unknown handlers mixed with known ones", () => {
      const requestBody = { handler: "request_body", max_size: 1024 };
      const myPlugin = { handler: "my_plugin", custom: "value" };
      const handlers: HttpHandler[] = [
        requestBody,
        { handler: "headers" },
        myPlugin,
        { handler: "reverse_proxy", upstreams: [{ dial: "localhost:3000" }] },
      ];
      const extracted = extractUnknownHandlers(handlers);
      expect(extracted).toHaveLength(2);
      expect(extracted[0]).toEqual(requestBody);
      expect(extracted[1]).toEqual(myPlugin);
    });

    it("preserves all fields on unknown handlers", () => {
      const unknown = {
        handler: "some_plugin",
        nested: { deep: { value: 42 } },
        array_field: [1, 2, 3],
        string_field: "hello",
        bool_field: true,
      };
      const handlers: HttpHandler[] = [unknown];
      const extracted = extractUnknownHandlers(handlers);
      expect(extracted[0]).toEqual(unknown);
    });
  });

  describe("mergeHandlers", () => {
    it("prepends unknown handlers before known handlers", () => {
      const unknown: HttpHandler[] = [{ handler: "request_body", max_size: 1024 }];
      const known: HttpHandler[] = [
        { handler: "rewrite", strip_path_prefix: "/api" },
        { handler: "reverse_proxy", upstreams: [{ dial: "localhost:3000" }] },
      ];
      const result = mergeHandlers(unknown, known);
      expect(result).toHaveLength(3);
      expect(result[0]?.handler).toBe("request_body");
      expect(result[1]?.handler).toBe("rewrite");
      expect(result[2]?.handler).toBe("reverse_proxy");
    });

    it("returns only known handlers when unknown is empty", () => {
      const known: HttpHandler[] = [{ handler: "static_response", body: "ok" }];
      expect(mergeHandlers([], known)).toEqual(known);
    });

    it("returns only unknown handlers when known is empty", () => {
      const unknown: HttpHandler[] = [{ handler: "templates", file_root: "/templates" }];
      expect(mergeHandlers(unknown, [])).toEqual(unknown);
    });
  });

  describe("isUnknownHandler type guard", () => {
    it("returns true for handlers outside the managed set", () => {
      expect(isUnknownHandler({ handler: "request_body" })).toBe(true);
      expect(isUnknownHandler({ handler: "custom_thing", foo: 1 })).toBe(true);
    });

    it("returns false for managed handlers", () => {
      expect(isUnknownHandler({ handler: "reverse_proxy" })).toBe(false);
      expect(isUnknownHandler({ handler: "file_server" })).toBe(false);
    });
  });
});
