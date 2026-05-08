/**
 * Tests for recursive subroute schema and HttpRoute ↔ RouteFormValues conversion.
 *
 * Verifies that the Zod schema handles arbitrarily nested subroutes and that
 * the form helpers correctly convert between API shape and form shape.
 */

import { describe, expect, it } from "vitest";
import { httpRoutesToFormValues, parseInitialFormValues } from "@/lib/route-form-helpers";
import { routeFormDefaults, routeFormSchema } from "@/lib/schemas/route";
import type { HttpRoute } from "@/types/http-app";

describe("route-form-helpers", () => {
  describe("parseInitialFormValues", () => {
    it("returns defaults for undefined route", () => {
      const result = parseInitialFormValues(undefined);
      expect(result).toEqual(routeFormDefaults);
    });

    it("parses reverse_proxy handler", () => {
      const route: HttpRoute = {
        match: [{ host: ["example.com"] }],
        handle: [{ handler: "reverse_proxy", upstreams: [{ dial: "localhost:3000" }] }],
      };
      const result = parseInitialFormValues(route);
      expect(result.handlerType).toBe("reverse_proxy");
      expect(result.hosts).toBe("example.com");
    });

    it("parses file_server handler with root", () => {
      const route: HttpRoute = {
        handle: [{ handler: "file_server", root: "/var/www" }],
      };
      const result = parseInitialFormValues(route);
      expect(result.handlerType).toBe("file_server");
      expect(result.fileRoot).toBe("/var/www");
    });

    it("parses static_response handler", () => {
      const route: HttpRoute = {
        handle: [{ handler: "static_response", body: "Hello", status_code: "200" }],
      };
      const result = parseInitialFormValues(route);
      expect(result.handlerType).toBe("static_response");
      expect(result.staticBody).toBe("Hello");
      expect(result.staticStatus).toBe("200");
    });

    it("recognizes static_response with Location header as redirect", () => {
      const route: HttpRoute = {
        handle: [
          {
            handler: "static_response",
            headers: { Location: ["https://example.com"] },
            status_code: "301",
          },
        ],
      };
      const result = parseInitialFormValues(route);
      expect(result.handlerType).toBe("redir");
      expect(result.redirUrl).toBe("https://example.com");
      expect(result.redirStatus).toBe("301");
    });

    it("parses terminal field", () => {
      expect(parseInitialFormValues({ terminal: false }).terminal).toBe(false);
      expect(parseInitialFormValues({ terminal: true }).terminal).toBe(true);
      expect(parseInitialFormValues({}).terminal).toBe(true);
    });
  });

  describe("httpRoutesToFormValues — recursive subroute conversion", () => {
    it("converts an empty array", () => {
      expect(httpRoutesToFormValues([])).toEqual([]);
    });

    it("converts a single flat nested route", () => {
      const routes: HttpRoute[] = [
        {
          match: [{ host: ["api.example.com"] }],
          handle: [{ handler: "reverse_proxy", upstreams: [{ dial: "localhost:8080" }] }],
        },
      ];
      const result = httpRoutesToFormValues(routes);
      expect(result).toHaveLength(1);
      expect(result[0]?.hosts).toBe("api.example.com");
      expect(result[0]?.handlerType).toBe("reverse_proxy");
      expect(result[0]?.subrouteRoutes).toEqual([]);
    });

    it("converts a nested subroute with its own nested routes", () => {
      const routes: HttpRoute[] = [
        {
          match: [{ host: ["example.com"] }],
          handle: [
            {
              handler: "subroute",
              routes: [
                {
                  match: [{ path: ["/api"] }],
                  handle: [{ handler: "reverse_proxy", upstreams: [{ dial: "localhost:3000" }] }],
                },
                {
                  match: [{ path: ["/static"] }],
                  handle: [{ handler: "file_server", root: "/var/www" }],
                },
              ],
            },
          ],
        },
      ];
      const result = httpRoutesToFormValues(routes);
      expect(result).toHaveLength(1);
      expect(result[0]?.hosts).toBe("example.com");
      expect(result[0]?.handlerType).toBe("subroute");
      expect(result[0]?.subrouteRoutes).toHaveLength(2);
      expect(result[0]?.subrouteRoutes[0]?.paths).toBe("/api");
      expect(result[0]?.subrouteRoutes[0]?.handlerType).toBe("reverse_proxy");
      expect(result[0]?.subrouteRoutes[1]?.paths).toBe("/static");
      expect(result[0]?.subrouteRoutes[1]?.handlerType).toBe("file_server");
    });

    it("converts deeply nested subroutes (3 levels deep)", () => {
      const routes: HttpRoute[] = [
        {
          match: [{ host: ["example.com"] }],
          handle: [
            {
              handler: "subroute",
              routes: [
                {
                  match: [{ path: ["/a"] }],
                  handle: [
                    {
                      handler: "subroute",
                      routes: [
                        {
                          match: [{ path: ["/a/b"] }],
                          handle: [
                            {
                              handler: "subroute",
                              routes: [
                                {
                                  match: [{ path: ["/a/b/c"] }],
                                  handle: [
                                    {
                                      handler: "reverse_proxy",
                                      upstreams: [{ dial: "localhost:9999" }],
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];
      const result = httpRoutesToFormValues(routes);
      // Level 1
      expect(result).toHaveLength(1);
      expect(result[0]?.handlerType).toBe("subroute");
      expect(result[0]?.subrouteRoutes).toHaveLength(1);

      // Level 2
      const l2 = result[0]?.subrouteRoutes[0];
      expect(l2?.paths).toBe("/a");
      expect(l2?.handlerType).toBe("subroute");
      expect(l2?.subrouteRoutes).toHaveLength(1);

      // Level 3
      const l3 = l2?.subrouteRoutes[0];
      expect(l3?.paths).toBe("/a/b");
      expect(l3?.handlerType).toBe("subroute");
      expect(l3?.subrouteRoutes).toHaveLength(1);

      // Level 4
      const l4 = l3?.subrouteRoutes[0];
      expect(l4?.paths).toBe("/a/b/c");
      expect(l4?.handlerType).toBe("reverse_proxy");
      expect(l4?.subrouteRoutes).toEqual([]);
    });
  });
});

describe("routeFormSchema — recursive validation", () => {
  it("validates default form values", () => {
    const result = routeFormSchema.safeParse(routeFormDefaults);
    expect(result.success).toBe(true);
  });

  it("validates form values with single subroute level", () => {
    const values = {
      ...routeFormDefaults,
      handlerType: "subroute" as const,
      subrouteRoutes: [
        {
          ...routeFormDefaults,
          hosts: "api.example.com",
          handlerType: "reverse_proxy" as const,
        },
      ],
    };
    const result = routeFormSchema.safeParse(values);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subrouteRoutes).toHaveLength(1);
      expect(result.data.subrouteRoutes[0]?.hosts).toBe("api.example.com");
    }
  });

  it("validates form values with deeply nested subroutes (3 levels)", () => {
    const values = {
      ...routeFormDefaults,
      handlerType: "subroute" as const,
      subrouteRoutes: [
        {
          ...routeFormDefaults,
          paths: "/level-1",
          handlerType: "subroute" as const,
          subrouteRoutes: [
            {
              ...routeFormDefaults,
              paths: "/level-2",
              handlerType: "subroute" as const,
              subrouteRoutes: [
                {
                  ...routeFormDefaults,
                  paths: "/level-3",
                  handlerType: "reverse_proxy" as const,
                },
              ],
            },
          ],
        },
      ],
    };
    const result = routeFormSchema.safeParse(values);
    expect(result.success).toBe(true);
    if (result.success) {
      const l1 = result.data.subrouteRoutes[0];
      expect(l1?.paths).toBe("/level-1");
      expect(l1?.handlerType).toBe("subroute");
      expect(l1?.subrouteRoutes).toHaveLength(1);

      const l2 = l1?.subrouteRoutes[0];
      expect(l2?.paths).toBe("/level-2");
      expect(l2?.handlerType).toBe("subroute");
      expect(l2?.subrouteRoutes).toHaveLength(1);

      const l3 = l2?.subrouteRoutes[0];
      expect(l3?.paths).toBe("/level-3");
      expect(l3?.handlerType).toBe("reverse_proxy");
    }
  });

  it("rejects invalid handlerType", () => {
    const values = { ...routeFormDefaults, handlerType: "invalid" };
    const result = routeFormSchema.safeParse(values);
    expect(result.success).toBe(false);
  });

  it("rejects non-array subrouteRoutes", () => {
    const values = { ...routeFormDefaults, subrouteRoutes: "not-an-array" };
    const result = routeFormSchema.safeParse(values);
    expect(result.success).toBe(false);
  });
});
