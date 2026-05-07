# Caddy UI Development Conventions

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
- Vitest (integration tests)
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

### Form Patterns

All forms use **React Hook Form** with **Zod schemas** for validation.

Schemas live in `src/lib/schemas/`. Each schema file exports:
- A Zod schema (e.g., `reverseProxyFormSchema`)
- An inferred TypeScript type (e.g., `type ReverseProxyFormValues`)
- Default values constant (e.g., `reverseProxyDefaults`)

Key rules:
- **One `useForm` per form** — replace multiple `useState` calls
- **Transform at boundaries** — `parseInitialValues()` converts API → form shape, `toHandler()` converts form → API shape
- **Schema = single source of truth** — types are inferred via `z.infer<typeof schema>`
- **`values` prop for dialog reset** — pass `values` to `useForm` so form resets when dialog opens
- **Shared validators** — reuse `durationSchema`, `addressSchema`, etc. from `src/lib/schemas/common.ts`

### API Layer

- All API calls go through `src/api/client.ts` → typed `request<T>()` function
- Endpoint-specific functions in `src/api/*.ts`
- TanStack Query hooks in `src/hooks/use-*.ts` wrap the API functions
- Never call `fetch()` directly in components

### Caddy API Method Rules

See `docs/CADDY-API.md` for full reference. Summary:

- **PUT** — Create new key. Returns 409 if exists.
- **PATCH** — Replace existing key. Returns 404 if key is missing, 500 if intermediate path is missing.
- **POST** — Append to array.
- **DELETE** — Remove key. Returns 404 if missing.

When a resource may or may not exist, use the upsert pattern:
```typescript
try {
  await configApi.patch(`path/to/resource`, data);
} catch (err) {
  // Catch any CaddyApiError — Caddy returns different status codes
  // for different "not found" cases (404 for missing key, 500 for
  // missing intermediate path). Both mean the path needs initialization.
  if (!(err instanceof CaddyApiError)) throw err;
  await configApi.put("parent/path", initialStructure);
}
```

### Error Handling

- API errors: `CaddyApiError` (server returned error) vs `NetworkError` (no response)
- Display errors inline near the action that caused them
- Use error boundaries for unexpected crashes

## Directory Structure

```
src/
├── api/          # HTTP client and endpoint functions
├── types/        # Caddy config TypeScript interfaces
├── stores/       # Zustand stores (UI state only)
├── hooks/        # TanStack Query hooks
├── lib/          # Utility functions, schemas
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

## Testing

Integration tests verify API calls against a real Caddy instance.

```bash
pnpm test:integration        # Requires Docker or local Caddy binary
```

Tests live in `tests/integration/`. Each test resets Caddy config in `beforeEach`. Test client is standalone (no imports from `src/`).

## Important Constraints

- **Never use `any`** — Use `unknown` and narrow with type guards
- **Never mutate TanStack Query cache directly** — Use invalidation
- **Never store derived server state in Zustand** — Derive in components
- **Always handle loading/error states** in data-fetching components
- **Keep the API layer pure** — No UI concerns in `src/api/`
- **Keep pages thin** — Business logic in hooks, display logic in components
- **All integration tests must pass before committing**
