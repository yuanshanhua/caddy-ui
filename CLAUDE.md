# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev                    # Vite dev server on :5173 (proxies /api/* → localhost:2019)
pnpm build                  # TypeScript check + Vite production build → dist/
pnpm typecheck              # TypeScript only (no emit)
pnpm lint                   # Biome check on src/
pnpm lint:fix               # Biome auto-fix
pnpm i18n:ci                # Check i18n keys
pnpm check                  # typecheck + lint + i18n:ci
pnpm test:integration       # Integration tests (requires Docker or Caddy binary)
```

CI runs: `pnpm check` + `pnpm build` + `pnpm test:integration` must all pass.

To develop locally, run `caddy run --config Caddyfile.dev` in a separate terminal for the Admin API on localhost:2019.

## Architecture

Caddy UI is a **pure static SPA** — no backend, no database. It manages Caddy web server through its [Admin API](https://caddyserver.com/docs/api).

```
Browser → Caddy (subdomain :443)
             ├── /api/*   → reverse_proxy localhost:2019 (Admin API)
             └── /*       → file_server (SPA static files)
```

The running Caddy config IS the database. The UI reads/writes it via path-based REST operations on `/config/{path}`.

## Key Patterns

**API Layer**: `src/api/client.ts` provides a typed `request<T>()` wrapper. Components never call `fetch()` directly.

**Data Flow**: Component → TanStack Query hook (`src/hooks/use-*.ts`) → API function → Caddy Admin API. On mutation success, queries are invalidated.

**State Separation**: Server state in TanStack Query only. Client UI state (sidebar, theme) in Zustand (`src/stores/`).

**Caddy API Methods**: PUT creates, PATCH updates existing, POST appends to arrays. See `docs/CADDY-API.md` for details.

## Project Conventions

See `.claude/CONVENTIONS.md` for coding conventions, form patterns, and constraints.

Key rules:
- Path alias: `@/*` → `./src/*`
- Use `import type` for type-only imports
- Biome config: 2-space indent, 100 char line width, double quotes, semicolons
- shadcn/ui components live in `src/components/ui/`
- All integration tests must pass before committing
