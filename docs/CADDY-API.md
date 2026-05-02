# Caddy Admin API Reference

Quick reference for the Caddy Admin API endpoints used by this UI.

## Configuration Endpoints

### GET /config/{path...}
Read the full config or any sub-path.

```bash
# Full config
curl http://localhost:2019/config/

# Specific path
curl http://localhost:2019/config/apps/http/servers
```

### PUT /config/{path...}
Replace the value at the given path (overwrite).

```bash
curl -X PUT http://localhost:2019/config/apps/http/servers/srv0/listen \
  -H "Content-Type: application/json" \
  -d '[":8080", ":8443"]'
```

### PATCH /config/{path...}
Merge (patch) the value at the given path.

### DELETE /config/{path...}
Delete the value at the given path.

### POST /load
Replace the entire configuration.

```bash
curl -X POST http://localhost:2019/load \
  -H "Content-Type: application/json" \
  -d '{"apps": {"http": {"servers": {}}}}'
```

### POST /adapt
Convert a Caddyfile (or other format) to JSON.

```bash
curl -X POST http://localhost:2019/adapt \
  -H "Content-Type: text/caddyfile" \
  -d ':8080 { respond "hello" }'
```

## Monitoring Endpoints

### GET /reverse_proxy/upstreams
Returns upstream health status for all configured reverse proxies.

```json
[
  { "address": "localhost:3000", "num_requests": 142, "fails": 0 }
]
```

### GET /metrics
Prometheus-format metrics endpoint.

### GET /pki/ca/{id}
Certificate Authority information.

### GET /pki/ca/{id}/certificates
CA certificate chain in PEM format.

## System Endpoints

### POST /stop
Gracefully stop the Caddy process.

## Important Behaviors

1. **No WebSocket**: Admin API explicitly rejects WebSocket upgrades
2. **ETag support**: Config endpoints support conditional requests
3. **JSON path traversal**: Paths map directly to JSON keys (e.g., `/config/apps/http/servers/srv0`)
4. **Array indexing**: Arrays are accessed by numeric index (e.g., `/config/apps/http/servers/srv0/routes/0`)
5. **Content-Type for /load**: Supports `application/json` (native) or adapter content types like `text/caddyfile`
