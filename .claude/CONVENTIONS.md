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
- **Form state**: React Hook Form + Zod validation (see Form Patterns below).
- **URL state**: React Router for navigation state.

### Form Patterns

All forms use **React Hook Form** with **Zod schemas** for validation. Never use raw `useState` for form fields.

#### Schema Location
Schemas live in `src/lib/schemas/`. Each schema file exports:
- A Zod schema (e.g., `reverseProxyFormSchema`)
- An inferred TypeScript type (e.g., `type ReverseProxyFormValues`)
- Default values constant (e.g., `reverseProxyDefaults`)

```
src/lib/schemas/
├── common.ts          # Shared validators (duration, address, etc.)
├── reverse-proxy.ts   # Reverse proxy form schema
├── headers.ts         # Headers handler schema
├── server.ts          # Server form schema
├── tls-policy.ts      # TLS policy schema
├── log.ts             # Log config schema
├── middleware.ts      # CORS, Encode, Rewrite, BasicAuth, Matchers
├── route.ts           # Route form schema
└── index.ts           # Barrel export
```

#### Form Component Pattern (Dialog forms)
```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { mySchema, myDefaults, type MyFormValues } from "@/lib/schemas/my-schema";

function MyFormDialog({ open, initialData, onSubmit }) {
  const form = useForm<MyFormValues>({
    resolver: zodResolver(mySchema),
    defaultValues: initialData ? parseInitial(initialData) : myDefaults,
    values: open ? (initialData ? parseInitial(initialData) : myDefaults) : undefined,
  });

  function handleFormSubmit(values: MyFormValues) {
    onSubmit(toApiPayload(values));
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)}>
        <FormField control={form.control} name="fieldName" render={({ field }) => (
          <FormItem>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </form>
    </Form>
  );
}
```

#### Form Component Pattern (Inline/onChange forms)
For forms that emit changes in real-time (no submit button):
```tsx
function MyInlineForm({ value, onChange }) {
  const form = useForm<MyFormValues>({
    resolver: zodResolver(mySchema),
    defaultValues: parseInitial(value),
  });

  useEffect(() => { form.reset(parseInitial(value)); }, [value, form]);

  function emitChange() {
    onChange(toApiPayload(form.getValues()));
  }

  // In each field's onChange: call field.onChange(e) then emitChange()
}
```

#### Dynamic Arrays
Use `useFieldArray` for add/remove/reorder patterns:
```tsx
const { fields, append, remove } = useFieldArray({
  control: form.control,
  name: "items",
});
```

#### Key Rules
- **One `useForm` per form** — replace multiple `useState` calls
- **Transform at boundaries** — `parseInitialValues()` converts API → form shape, `toHandler()` converts form → API shape
- **Schema = single source of truth** — types are inferred via `z.infer<typeof schema>`
- **`values` prop for dialog reset** — pass `values` to `useForm` so form resets when dialog opens
- **Shared validators** — reuse `durationSchema`, `addressSchema`, etc. from `src/lib/schemas/common.ts`
- **Sub-forms own their state** — inline forms (headers, encode, etc.) have their own RHF instance and emit via `onChange`

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
