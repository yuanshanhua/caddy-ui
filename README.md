# Caddy UI

A lightweight, pure static web interface for managing [Caddy](https://caddyserver.com) web server through its Admin API.

**No backend. No database. No plugin. Just a static SPA that talks directly to Caddy.**

## Features

- **Zero Backend** — The UI is a static SPA; Caddy's own config is the single source of truth
- **Full Config CRUD** — Create, edit, and delete servers, routes, and handlers via a visual interface
- **Reverse Proxy Management** — Configure upstreams, load balancing policies, and health checks
- **Multiple Handler Types** — Reverse proxy, file server, static response, redirects
- **Route Editor** — Visual matcher (host/path/method) and handler configuration
- **Raw JSON Editor** — Full access to the raw Caddy JSON config with validation
- **Real-time Connection Monitoring** — Live indicator showing Admin API connectivity
- **Type-Safe** — Built with strict TypeScript, comprehensive Caddy config type definitions
- **Self-Hosted by Caddy** — Caddy serves the UI and proxies to its own Admin API

## Screenshots

> Coming soon

## Quick Start

### Prerequisites

- [Caddy](https://caddyserver.com/docs/install) v2.7+
- [Node.js](https://nodejs.org/) 22+ and [pnpm](https://pnpm.io/) (for building)

### Build

```bash
git clone https://github.com/yuanshanhua/caddy-ui.git
cd caddy-ui
pnpm install
pnpm build
```

### Deploy

Copy the `dist/` folder to your server, then add to your Caddyfile:

```caddyfile
{
  admin localhost:2019
}

your-domain.com {
  # UI static files (password-protected)
  handle /ui/* {
    basicauth {
      # Generate: caddy hash-password
      admin $2a$14$YOUR_BCRYPT_HASH
    }
    uri strip_prefix /ui
    file_server {
      root /path/to/caddy-ui/dist
      try_files {path} /index.html
    }
  }

  # Proxy API requests to Admin API
  handle /ui/api/* {
    basicauth {
      admin $2a$14$YOUR_BCRYPT_HASH
    }
    uri strip_prefix /ui/api
    reverse_proxy localhost:2019
  }
}
```

Then reload Caddy and visit `https://your-domain.com/ui/`.

### Development

```bash
# Start Vite dev server (with API proxy to localhost:2019)
pnpm dev

# In another terminal, start Caddy with the dev config
caddy run --config Caddyfile.dev
```

## Architecture

```
Browser → Caddy (:443)
             ├── /ui/*          → file_server (SPA static files)
             ├── /ui/api/*      → reverse_proxy localhost:2019 (Admin API)
             └── /*             → your normal site routes
```

- The SPA calls Caddy's Admin API for all operations
- Authentication is handled by Caddy's `basicauth` middleware
- Admin API stays on localhost — never exposed directly
- Same-origin deployment eliminates CORS issues

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + Vite 8 |
| Language | TypeScript 6 (strict, zero `any`) |
| Styling | Tailwind CSS 4 |
| Components | shadcn/ui pattern |
| Server State | TanStack Query v5 |
| Client State | Zustand v5 |
| Routing | React Router v7 |
| Linting | Biome |

## Security

- The UI has **no authentication logic** — Caddy's `basicauth` protects the `/ui/` route
- Admin API runs on `localhost:2019` and is never directly exposed
- All API access goes through Caddy's reverse proxy (same-origin)
- Consider adding IP restrictions for additional security

## Comparison with Alternatives

| | Caddy UI | CaddyManager | Nginx Proxy Manager |
|---|---------|--------------|-------------------|
| Backend required | No | Yes (Express.js) | Yes (Node.js) |
| Database required | No | Yes (SQLite/MongoDB) | Yes (SQLite) |
| Install method | Copy static files | Docker/npm | Docker |
| Config transparency | Full (raw JSON access) | Partial | Low |
| Caddy version coupling | None | Tight | N/A (Nginx) |
| Upgrade process | Replace files (zero downtime) | Rebuild container | Rebuild container |

## License

MIT

## Contributing

Contributions are welcome! Please ensure:

1. `pnpm typecheck` passes with zero errors
2. `pnpm lint` passes
3. `pnpm build` succeeds

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for design decisions and [docs/ROADMAP.md](docs/ROADMAP.md) for planned features.
