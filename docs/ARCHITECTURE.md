# Caddy UI Architecture

## Overview

Caddy UI is a **pure static single-page application** that manages a Caddy web server through its [Admin API](https://caddyserver.com/docs/api).

```
Browser → Caddy (:443)
             ├── /ui/*          → file_server (serves SPA)
             ├── /ui/api/*      → reverse_proxy localhost:2019
             └── /*             → normal site routing
```

## Design Decisions

### Why Static SPA (not a plugin, not a separate backend)?

| Approach | Rejected Because |
|----------|-----------------|
| Caddy plugin | Invasive — shares process, bugs crash Caddy, requires rebuild on every update |
| Separate backend (like CaddyManager) | Unnecessary — Caddy's Admin API already provides full CRUD |
| **Static SPA** | ✓ Zero invasion, zero state, zero trust requirements |

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
                              PUT /config/{path} or POST /load
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

## Config Editing Model

Caddy's Admin API supports **path-based operations** on its JSON config tree:

- `GET /config/apps/http/servers/srv0` → Read a specific server
- `PUT /config/apps/http/servers/srv0/routes/0` → Replace a route
- `DELETE /config/apps/http/servers/srv0` → Remove a server
- `POST /load` → Replace the entire config

The UI primarily uses surgical `PUT`/`DELETE` for individual changes and `POST /load` for bulk operations (like importing a Caddyfile).

## Deployment

```caddyfile
your-domain.com {
  handle /ui/* {
    basic_auth {
      admin $2a$14$hashed_password
    }
    uri strip_prefix /ui
    file_server {
      root /opt/caddy-ui/dist
    }
  }

  handle /ui/api/* {
    basic_auth {
      admin $2a$14$hashed_password
    }
    uri strip_prefix /ui/api
    reverse_proxy localhost:2019
  }
}
```
