# Caddy UI Roadmap

## Phase 1: Foundation ✅
- [x] Project scaffolding (Vite + React + TypeScript + Tailwind)
- [x] API client with typed errors
- [x] Caddy config TypeScript type definitions
- [x] App shell (sidebar + header + routing)
- [x] Connection health indicator
- [x] Dashboard page (status overview)
- [x] Sites list page (read-only)
- [x] Raw config editor (textarea, JSON validate, apply)

## Phase 2: Core CRUD ✅
- [x] Add new HTTP server (form + validation)
- [x] Edit server listen addresses
- [x] Add/edit/delete routes within a server
- [x] Route matcher editor (host, path, method)
- [x] Reverse proxy handler form (upstreams, load balancing, health checks)
- [x] File server handler form
- [x] Static response / redirect handler
- [x] Config diff preview component
- [x] Delete operations with confirmation dialogs
- [x] CI/CD pipeline (GitHub Actions: lint + typecheck + build)

## Phase 3a: TLS & Caddyfile ✅
- [x] Toast notification system (sonner)
- [x] API client fix for string body passthrough (text/caddyfile)
- [x] Caddyfile import page (paste/upload → /adapt → preview → apply)
- [x] TLS certificate status display (auto-managed, file-loaded, PEM, folders)
- [x] TLS automation policy management (CRUD with ACME/ZeroSSL/Internal issuers)

## Phase 3b: Middleware & Matchers ✅
- [x] Headers middleware configuration (request/response header add/set/delete)
- [x] Compression (encode) configuration (gzip/zstd, min_length)
- [x] Advanced matchers (header, query, remote_ip)
- [x] BasicAuth configuration (users, password hash generation)
- [x] URI Rewrite handler
- [x] CORS quick-configuration (built on headers middleware)

## Phase 3c: Operations & Monitoring ✅
- [x] Upstream health monitoring page (real-time polling with status cards)
- [x] Logging configuration (log output, format, level per server)
- [x] Config templates/presets (common patterns: WordPress, SPA, API gateway)
- [ ] ~~Undo/revert last change~~ (deferred — requires IndexedDB snapshots, planned for Phase 4)

## Phase 4: UX & Editor
- [x] Internationalization (i18n) with react-i18next (English + Chinese)
- [ ] Monaco editor integration (JSON + Caddyfile syntax highlighting)
- [ ] Dark mode support
- [ ] Config history (IndexedDB snapshots with timestamps)
- [ ] Export/import config backup (download/upload JSON)
- [ ] Responsive design (mobile-friendly layout)
- [ ] Keyboard shortcuts
- [ ] Search across config

## Phase 5: Advanced Operations
- [ ] Multi-site wizard (guided setup for common patterns)
- [ ] DNS challenge configuration helper
- [ ] Bulk operations (enable/disable multiple sites)
- [ ] CEL expression matcher editor
- [ ] Integration with caddy-l4 (TCP/UDP proxy)
- [ ] Config validation with helpful error messages

## Non-Goals (Explicit)
- No user/session management (Caddy's basicauth handles this)
- No database or persistent storage (Caddy IS the state)
- No server-side rendering
- No mobile app (web-responsive is sufficient)
- No multi-instance management (one UI per one Caddy)
