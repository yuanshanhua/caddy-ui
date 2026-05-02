/**
 * Built-in config templates for common patterns.
 *
 * Each template defines a partial Caddy config that can be previewed and applied.
 */

import type { HttpRoute } from "@/types/http-app";

export interface ConfigTemplate {
  id: string;
  name: string;
  description: string;
  category: "web" | "api" | "proxy";
  routes: HttpRoute[];
  listenAddresses?: string[];
}

export const BUILT_IN_TEMPLATES: ConfigTemplate[] = [
  {
    id: "spa",
    name: "Single Page Application (SPA)",
    description:
      "Serves static files with HTML5 history mode fallback. All non-file paths serve index.html.",
    category: "web",
    routes: [
      {
        handle: [
          {
            handler: "rewrite",
            uri: "{http.matchers.file.relative}",
          },
          {
            handler: "file_server",
            root: "/var/www/dist",
          },
        ],
        terminal: true,
      },
    ],
  },
  {
    id: "wordpress",
    name: "WordPress / PHP-FPM",
    description:
      "Reverse proxy to a PHP-FPM backend with file server for static assets. Includes common security headers.",
    category: "web",
    routes: [
      {
        match: [{ path: ["/wp-admin/*", "/wp-login.php"] }],
        handle: [
          {
            handler: "authentication",
            providers: {
              http_basic: {
                hash: { algorithm: "bcrypt" },
                accounts: [],
              },
            },
          },
          {
            handler: "reverse_proxy",
            upstreams: [{ dial: "localhost:9000" }],
          },
        ],
        terminal: true,
      },
      {
        match: [{ path: ["*.php"] }],
        handle: [
          {
            handler: "reverse_proxy",
            upstreams: [{ dial: "localhost:9000" }],
          },
        ],
        terminal: true,
      },
      {
        handle: [
          {
            handler: "file_server",
            root: "/var/www/wordpress",
          },
        ],
        terminal: true,
      },
    ],
  },
  {
    id: "api-gateway",
    name: "API Gateway",
    description:
      "Route API requests to different backends by path prefix. Includes CORS headers, compression, and rate limiting paths.",
    category: "api",
    routes: [
      {
        match: [{ path: ["/api/v1/users/*"] }],
        handle: [
          {
            handler: "headers",
            response: {
              set: {
                "Access-Control-Allow-Origin": ["*"],
                "Access-Control-Allow-Methods": ["GET, POST, PUT, DELETE, OPTIONS"],
                "Access-Control-Allow-Headers": ["Content-Type, Authorization"],
              },
              deferred: true,
            },
          },
          {
            handler: "encode",
            encodings: { gzip: {}, zstd: {} },
            prefer: ["zstd", "gzip"],
            minimum_length: 256,
          },
          {
            handler: "reverse_proxy",
            upstreams: [{ dial: "localhost:3001" }],
          },
        ],
        terminal: true,
      },
      {
        match: [{ path: ["/api/v1/products/*"] }],
        handle: [
          {
            handler: "headers",
            response: {
              set: {
                "Access-Control-Allow-Origin": ["*"],
                "Access-Control-Allow-Methods": ["GET, POST, PUT, DELETE, OPTIONS"],
                "Access-Control-Allow-Headers": ["Content-Type, Authorization"],
              },
              deferred: true,
            },
          },
          {
            handler: "encode",
            encodings: { gzip: {}, zstd: {} },
            prefer: ["zstd", "gzip"],
            minimum_length: 256,
          },
          {
            handler: "reverse_proxy",
            upstreams: [{ dial: "localhost:3002" }],
          },
        ],
        terminal: true,
      },
      {
        match: [{ path: ["/api/*"] }],
        handle: [
          {
            handler: "static_response",
            status_code: "404",
            body: '{"error": "not found"}',
            headers: { "Content-Type": ["application/json"] },
          },
        ],
        terminal: true,
      },
    ],
  },
  {
    id: "reverse-proxy-lb",
    name: "Load-Balanced Reverse Proxy",
    description:
      "Proxy all traffic to multiple backends with health checks and round-robin balancing.",
    category: "proxy",
    routes: [
      {
        handle: [
          {
            handler: "reverse_proxy",
            upstreams: [
              { dial: "backend1:8080" },
              { dial: "backend2:8080" },
              { dial: "backend3:8080" },
            ],
            load_balancing: {
              selection_policy: { policy: "round_robin" },
            },
            health_checks: {
              active: {
                uri: "/health",
                interval: "10s",
                timeout: "5s",
              },
              passive: {
                max_fails: 3,
                fail_duration: "30s",
              },
            },
          },
        ],
        terminal: true,
      },
    ],
  },
  {
    id: "static-site",
    name: "Static File Server",
    description: "Serves static files with compression, browse enabled, and proper cache headers.",
    category: "web",
    routes: [
      {
        handle: [
          {
            handler: "encode",
            encodings: { gzip: {}, zstd: {} },
            prefer: ["zstd", "gzip"],
            minimum_length: 256,
          },
          {
            handler: "headers",
            response: {
              set: {
                "Cache-Control": ["public, max-age=3600"],
                "X-Content-Type-Options": ["nosniff"],
                "X-Frame-Options": ["DENY"],
              },
              deferred: true,
            },
          },
          {
            handler: "file_server",
            root: "/var/www/html",
            browse: {},
          },
        ],
        terminal: true,
      },
    ],
  },
  {
    id: "redirect-www",
    name: "WWW Redirect",
    description: "Redirect all www.example.com traffic to example.com (or vice versa).",
    category: "web",
    routes: [
      {
        match: [{ host: ["www.example.com"] }],
        handle: [
          {
            handler: "static_response",
            status_code: "301",
            headers: { Location: ["https://example.com{http.request.uri}"] },
          },
        ],
        terminal: true,
      },
    ],
  },
];
