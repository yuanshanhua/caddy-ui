# Caddy UI Architecture

## Overview

Caddy UI is a **pure static single-page application** that manages a Caddy web server through its [Admin API](https://caddyserver.com/docs/api).

```
Browser → Caddy (:443)
             ├── /api/*   → reverse_proxy localhost:2019 (Admin API)
             └── /*       → file_server (SPA static files)
```

## Design Decisions

| Approach | Rejected Because |
|----------|-----------------|
| Caddy plugin | Invasive — shares process, bugs crash Caddy, requires rebuild on every update |
| Separate backend | Unnecessary — Caddy's Admin API already provides full CRUD |
| **Static SPA** | Zero invasion, zero state, zero trust requirements |

### Key Principles

1. **Caddy IS the database** — The running config is the single source of truth
2. **Same-origin deployment** — UI and API served from the same host, no CORS issues
3. **Type safety** — Full TypeScript types for Caddy's JSON config schema
4. **Transparency** — Users always have access to the raw JSON config

## Data Flow

```
User Action → React Component → TanStack Query Mutation
                                        ↓
                              src/api/config.ts (typed client)
                                        ↓
                              PUT/PATCH/POST/DELETE /config/{path}
                                        ↓
                              Caddy Admin API (localhost:2019)
                                        ↓
                              Config applied → Query invalidated → UI refreshes
```

## Security Model

The UI itself has **no authentication logic**. Security is handled by Caddy:

1. Caddy's `basic_auth` middleware protects the entire subdomain
2. The Admin API runs on `localhost:2019` (not exposed externally)
3. Caddy's `reverse_proxy` bridges the UI to the Admin API on same-origin
4. No credentials are stored in the SPA

## State Management

| State Type | Tool | Example |
|-----------|------|---------|
| Server state (config) | TanStack Query | Caddy config, upstream status |
| Client preferences | Zustand (persisted) | Sidebar collapsed, theme |
| URL state | React Router | Current page, site ID |
| Form state | React Hook Form | Config editing forms |

## Non-Goals

- No user/session management
- No database or persistent storage
- No server-side rendering
- No multi-instance management
