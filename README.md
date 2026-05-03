# Caddy UI

A lightweight, pure static web interface for managing [Caddy](https://caddyserver.com) web server through its Admin API.

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

### One-Line Deploy

The fastest way to deploy Caddy UI on your server:

```bash
curl -fsSL https://raw.githubusercontent.com/yuanshanhua/caddy-ui/master/deploy.sh | bash
```

The script will:

1. Check that Caddy v2.7+ is installed
2. Ask for your domain, username, and password
3. Download the latest pre-built UI from GitHub Releases
4. Generate a secure Caddyfile with BasicAuth + auto-HTTPS
5. Deploy everything automatically

### Manual Deploy

If you prefer manual setup, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for step-by-step instructions.

### Updating

Run the deploy script again — it will detect the existing installation and offer to update the static files only, without touching your configuration.

## Security

> **HTTPS is mandatory.** Caddy UI relies entirely on Caddy's forced HTTPS to protect credentials in transit. Never deploy Caddy UI on a plain HTTP connection.

The security model is simple and robust:

- **HTTPS enforced** — Using a domain name in your Caddyfile triggers Caddy's automatic TLS. This is the primary security layer protecting your BasicAuth credentials from being intercepted.
- **BasicAuth with bcrypt** — Caddy's `basicauth` middleware protects both `/ui/` and `/ui/api/` paths. Passwords are stored as bcrypt hashes, never in plaintext.
- **Admin API isolation** — The Admin API binds to `localhost:2019` only and is never directly exposed to the internet. All access goes through Caddy's authenticated reverse proxy.
- **No custom auth code** — The UI has zero authentication logic of its own. Security is delegated entirely to Caddy's battle-tested middleware.
- **Consider IP restrictions** — For additional hardening, restrict access by source IP in your Caddyfile.

**Important:** If you cannot use HTTPS (e.g., internal network without a domain), your credentials will be transmitted in plaintext. In this case, ensure the network is fully trusted or use a VPN.

## Development

```bash
git clone https://github.com/yuanshanhua/caddy-ui && cd caddy-ui
pnpm i
pnpm dev              # Vite dev server with API proxy to localhost:2019

# In another terminal:
caddy run --config Caddyfile.dev
```

For architecture details, coding conventions, and contribution guidelines, see:

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Design decisions and data flow
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Full deployment guide (manual, Docker)
- [docs/ROADMAP.md](docs/ROADMAP.md) — Planned features

## License

MIT

## Contributing

Contributions are welcome! Please ensure:

1. `pnpm check` passes (lint + typecheck + i18n)
2. `pnpm build` succeeds

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for design decisions and coding conventions.
