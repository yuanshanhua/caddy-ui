# Caddy Admin API Reference

Quick reference for the Caddy Admin API endpoints used by this UI. Behaviors documented here are verified by integration tests (`tests/integration/`).

## Config CRUD Methods

All config operations use the path `/config/{path...}` where path maps to JSON keys (objects) or numeric indices (arrays).

### Method Semantics (Verified)

| Method | Purpose | On success | On conflict |
|--------|---------|-----------|-------------|
| **PUT** | Create new key | 200 | **409** if key already exists |
| **PATCH** | Replace existing key | 200 | **404** if key doesn't exist |
| **POST** | Append to array | 200 | Error if target is not an array |
| **DELETE** | Remove key | 200 | **404** if key doesn't exist |
| **GET** | Read value | 200 | **400** if intermediate path missing |

> **Critical**: PUT is create-only, PATCH is update-only. Neither performs a deep merge — both set the entire value at the target path.

### GET /config/{path...}

Read the full config or any sub-path.

```bash
curl http://localhost:2019/config/
curl http://localhost:2019/config/apps/http/servers/srv0
```

Returns **400** "invalid traversal path" if an intermediate path doesn't exist.

### PUT /config/{path...}

**Create** a new key at the given path. Builds intermediate structure automatically.

```bash
curl -X PUT http://localhost:2019/config/apps/http/servers/srv0 \
  -H "Content-Type: application/json" \
  -d '{"listen": [":8080"]}'
```

Returns **409** "key already exists" if the key is already present. For arrays, PUT at an index **inserts** at that position.

### PATCH /config/{path...}

**Replace** the value at an existing key.

```bash
curl -X PATCH http://localhost:2019/config/apps/http/servers/srv0 \
  -H "Content-Type: application/json" \
  -d '{"listen": [":9090"], "routes": [...]}'
```

Returns **404** "key does not exist" if the key isn't present. The value is **entirely replaced** — not merged. Callers must provide the complete object.

### POST /config/{path...}

**Append** a value to an array at the given path.

```bash
curl -X POST http://localhost:2019/config/apps/http/servers/srv0/routes \
  -H "Content-Type: application/json" \
  -d '{"handle": [{"handler": "static_response", "body": "hello"}]}'
```

### DELETE /config/{path...}

Remove the value at the given path.

```bash
curl -X DELETE http://localhost:2019/config/apps/http/servers/srv0
```

Returns **404** if the key doesn't exist.

### POST /load

Replace the **entire** configuration atomically.

```bash
curl -X POST http://localhost:2019/load \
  -H "Content-Type: application/json" \
  -d '{"apps": {"http": {"servers": {}}}}'
```

### POST /adapt

Convert a Caddyfile to JSON config.

```bash
curl -X POST http://localhost:2019/adapt \
  -H "Content-Type: text/caddyfile" \
  -d ':8080 { respond "hello" }'
```

## Usage Patterns

### Create a new resource

```typescript
await configApi.put("apps/http/servers/my-site", { listen: [":8080"], routes: [] });
```

### Update an existing resource

```typescript
await configApi.patch("apps/http/servers/my-site", updatedServer);
```

### Upsert (create-or-update)

When the path may or may not exist:

```typescript
try {
  await configApi.patch(`logging/logs/${name}`, log);
} catch (err) {
  if (!(err instanceof CaddyApiError) || err.status !== 404) throw err;
  await configApi.put("logging", { logs: { [name]: log } });
}
```

### Append to array

```typescript
await configApi.post("apps/http/servers/srv/routes", newRoute);
```

## Monitoring Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /reverse_proxy/upstreams` | Upstream health status |
| `GET /metrics` | Prometheus metrics |
| `GET /pki/ca/{id}` | CA information |
| `GET /pki/ca/{id}/certificates` | CA certificate chain (PEM) |

## Important Behaviors

1. **Admin listener restarts** on config changes — clients should retry on connection drops
2. **No WebSocket** — Admin API rejects WebSocket upgrades
3. **Origin enforcement** — requests with `Sec-Fetch-Mode` header require a matching `Origin`
4. **JSON path traversal** — paths map to JSON keys (`/config/apps/http/servers/srv0`)
5. **Array indexing** — arrays accessed by numeric index (`/config/.../routes/0`)
6. **PUT on arrays** — inserts at the specified index (shifts existing elements)
