# Caddy UI Roadmap

## Completed

- **Foundation**: Project scaffolding, API client, type definitions, app shell, dashboard
- **Core CRUD**: HTTP servers, routes, matchers, handlers (reverse proxy, file server, static response)
- **TLS & Caddyfile**: TLS policies, certificate display, Caddyfile import/adapt
- **Middleware**: Headers, compression, BasicAuth, URI rewrite, CORS
- **Operations**: Upstream health monitoring, logging config, config templates
- **UX**: i18n (English + Chinese), Monaco editor, dark mode, export/import backup

## In Progress

- [ ] Config history (IndexedDB snapshots with timestamps)
- [ ] Responsive design (mobile-friendly layout)
- [ ] Keyboard shortcuts
- [ ] Search across config

## Future

- [ ] Multi-site wizard (guided setup for common patterns)
- [ ] DNS challenge configuration helper
- [ ] Bulk operations (enable/disable multiple sites)
- [ ] CEL expression matcher editor
- [ ] Integration with caddy-l4 (TCP/UDP proxy)
- [ ] Config validation with helpful error messages

## Non-Goals

- No user/session management
- No database or persistent storage
- No server-side rendering
- No multi-instance management
