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

## Phase 3: Advanced Features
- [ ] TLS certificate status display
- [ ] TLS automation policy management
- [ ] Upstream health monitoring (real-time polling)
- [ ] Caddyfile import (via /adapt endpoint)
- [ ] Config templates/presets (common patterns)
- [ ] Headers middleware configuration
- [ ] Compression (encode) configuration
- [ ] Authentication/basicauth configuration
- [ ] Logging configuration
- [ ] Undo/revert last change

## Phase 4: UX Polish
- [ ] Dark mode support
- [ ] Monaco editor integration (replace textarea)
- [ ] Keyboard shortcuts
- [ ] Search across config
- [ ] Responsive design (mobile)
- [ ] Toast notifications for background operations
- [ ] Config history (local storage snapshots)
- [ ] Export/import config backup (download/upload JSON)

## Phase 5: Advanced Operations
- [ ] Multi-site wizard (guided setup for common patterns)
- [ ] DNS challenge configuration helper
- [ ] Upstream health dashboard with graphs
- [ ] Config validation with helpful error messages
- [ ] Bulk operations (enable/disable multiple sites)
- [ ] Integration with caddy-l4 (TCP/UDP proxy)
- [ ] Optional companion plugin for enhanced features

## Non-Goals (Explicit)
- No user/session management (Caddy's basicauth handles this)
- No database or persistent storage (Caddy IS the state)
- No server-side rendering
- No mobile app (web-responsive is sufficient)
- No multi-instance management (one UI per one Caddy)
