# Caddy UI Development Conventions

## Project Overview
Caddy UI is a pure static SPA for managing Caddy web server via its Admin API. It runs as a standalone static site served by Caddy itself — no backend process, no database.

## Architecture Principles

1. **Zero backend** — All state lives in Caddy's config. The UI is a thin view layer.
2. **Type-safe** — Strict TypeScript, no `any`, comprehensive Caddy config types.
3. **Non-invasive** — Never compiles into Caddy. Deployed as static files.
4. **Transparent** — Users can always see/edit the raw JSON config.

## Tech Stack
- React 19 + Vite 8
- TypeScript 6 (strict mode, `noUncheckedIndexedAccess`)
- Tailwind CSS 4 (no config file, CSS-based)
- shadcn/ui components (copied into `src/components/ui/`)
- TanStack Query v5 (server state)
- Zustand v5 (client UI state)
- React Router v7
- Biome (lint + format)
- PNPM

## Code Conventions

### File Naming
- All files: `kebab-case.ts` or `kebab-case.tsx`
- Components: named export matching the component name (`export function Button()`)
- Types: named export, PascalCase interface/type names
- Hooks: `use-*.ts` files, `use*` function names

### Import Conventions
- Use path alias `@/` for all project imports
- Group imports: external deps → `@/` imports → relative imports
- Always use `import type` for type-only imports

### Component Conventions
- Functional components only (no class components)
- Props interface defined inline or co-located
- Use `forwardRef` for components that wrap native elements
- Use CVA (class-variance-authority) for variant-based styling

### State Management
- **Server state**: Always use TanStack Query. Never store API data in Zustand.
- **UI state**: Zustand only for client preferences (sidebar, theme).
- **Form state**: React Hook Form + Zod validation.
- **URL state**: React Router for navigation state.

### API Layer
- All API calls go through `src/api/client.ts` → typed `request<T>()` function
- Endpoint-specific functions in `src/api/*.ts`
- TanStack Query hooks in `src/hooks/use-*.ts` wrap the API functions
- Never call `fetch()` directly in components

### Error Handling
- API errors: `CaddyApiError` (server returned error) vs `NetworkError` (no response)
- Display errors inline near the action that caused them
- Use error boundaries for unexpected crashes

### Caddy Config Editing Pattern
- Read: TanStack Query caches the full config
- Modify: Generate a path + value pair
- Apply: `PUT /config/{path}` for surgical update
- Verify: Query invalidation triggers refetch
- Always show a diff or confirmation before applying changes

## Directory Structure

```
src/
├── api/          # HTTP client and endpoint functions
├── types/        # Caddy config TypeScript interfaces
├── stores/       # Zustand stores (UI state only)
├── hooks/        # TanStack Query hooks
├── lib/          # Utility functions
├── components/
│   ├── ui/       # shadcn/ui base components
│   ├── layout/   # App shell, sidebar, header
│   ├── config/   # Config editor components
│   ├── sites/    # Site management components
│   ├── proxy/    # Reverse proxy components
│   ├── tls/      # TLS/cert components
│   └── shared/   # Reusable non-UI components
└── pages/        # Route-level page components
```

## Development Workflow

```bash
pnpm dev          # Start Vite dev server on :5173
pnpm build        # Production build → dist/
pnpm typecheck    # Run TypeScript type checking
pnpm lint         # Run Biome linter
pnpm lint:fix     # Auto-fix lint issues
pnpm format       # Format code with Biome
```

### Testing against Caddy
1. Install Caddy locally
2. Run `caddy run --config Caddyfile.dev` (in project root)
3. Vite proxies `/ui/api/*` → `localhost:2019`

## Important Constraints

- **Never use `any`** — Use `unknown` and narrow with type guards
- **Never mutate TanStack Query cache directly** — Use invalidation
- **Never store derived server state in Zustand** — Derive in components
- **Always handle loading/error states** in data-fetching components
- **Keep the API layer pure** — No UI concerns in `src/api/`
- **Keep pages thin** — Business logic in hooks, display logic in components
