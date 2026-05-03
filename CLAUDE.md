# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Vite dev server on :5173 (proxies /ui/api/* → localhost:2019)
pnpm build        # TypeScript check + Vite production build → dist/
pnpm typecheck    # TypeScript only (no emit)
pnpm lint         # Biome check on src/
pnpm lint:fix     # Biome auto-fix
pnpm i18n:ci      # Check i18n keys
pnpm check        # typecheck + lint + i18n:ci
```

CI runs: `pnpm check` -> `pnpm build` must pass. Use `gh run watch` to watch GitHub Actions in real-time if available.

To develop locally, run `caddy run --config Caddyfile.dev` in a separate terminal to provide the Admin API on localhost:2019.

## Architecture

Caddy UI is a **pure static SPA** — no backend, no database. It manages Caddy web server through its [Admin API](https://caddyserver.com/docs/api). Caddy itself serves the built files and reverse-proxies API requests:

```
Browser → Caddy (:443)
             ├── /ui/*       → file_server (SPA static files)
             ├── /ui/api/*   → reverse_proxy localhost:2019 (Admin API)
             └── /*          → normal site routes
```

The running Caddy config IS the database. The UI reads/writes it via path-based REST operations (`GET/PUT/DELETE /config/{path}`) and full-config loads (`POST /load`).

## Key Patterns

**API Layer**: `src/api/client.ts` provides a typed `request<T>()` wrapper. Endpoint modules (`src/api/config.ts`, etc.) build on it. Components never call `fetch()` directly.

**Data Flow**: Component → TanStack Query hook (`src/hooks/use-*.ts`) → API function → Caddy Admin API. On mutation success, queries are invalidated to refetch fresh state.

**State Separation**: Server state in TanStack Query only. Client UI state (sidebar, theme) in Zustand (`src/stores/`). Never store API data in Zustand.

**Type System**: Comprehensive Caddy config types live in `src/types/`. Barrel-exported from `src/types/index.ts`. Zero `any` — use `unknown` + type guards.

## Project Conventions

See `.claude/CONVENTIONS.md` for detailed coding conventions including file naming (kebab-case), import ordering, component patterns, and constraints.

Key rules:
- Path alias: `@/*` → `./src/*`
- Use `import type` for type-only imports
- Biome config: 2-space indent, 100 char line width, double quotes, semicolons
- shadcn/ui components live in `src/components/ui/` (CVA for variants)
- Router basename is `/ui` — all routes are relative to that
