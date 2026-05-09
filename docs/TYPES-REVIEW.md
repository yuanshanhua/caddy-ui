# Caddy UI Types Review

> Reviewed against Caddy source: `github.com/caddyserver/caddy/v2` @ commit `9c78b97` (master, May 2026)

---

## 1. File-by-File Review with Source References

### `src/types/caddy.ts`

**Caddy Source Ref:**
- `CaddyConfig` -> [caddy.go#L69](https://github.com/caddyserver/caddy/blob/master/caddy.go#L69)
- `LoggingConfig` -> [logging.go#L68](https://github.com/caddyserver/caddy/blob/master/logging.go#L68)
- `LogConfig` (CustomLog) -> [logging.go#L302](https://github.com/caddyserver/caddy/blob/master/logging.go#L302)
- `StorageConfig` -> [caddy.go#L77](https://github.com/caddyserver/caddy/blob/master/caddy.go#L77)
- `PkiApp` -> [modules/caddypki/pki.go#L35](https://github.com/caddyserver/caddy/blob/master/modules/caddypki/pki.go#L35)
- `PkiCaConfig` -> [modules/caddypki/ca.go#L40](https://github.com/caddyserver/caddy/blob/master/modules/caddypki/ca.go#L40)

**Issues Found:**

| # | Severity | Field | Issue |
|---|----------|-------|-------|
| 1 | LOW | `LogConfig.level` | UI restricts to `"DEBUG" \| "INFO" \| "WARN" \| "ERROR" \| "PANIC" \| "FATAL"`. Caddy source uses `string` — valid but the union is stricter than source. `PANIC` and `FATAL` are Zap levels used internally; in practice `string` is fine. |
| 2 | MEDIUM | `LogConfig` | Missing fields: `with_caller` (bool), `with_caller_skip` (int), `with_stacktrace` (string), `core` (module). |
| 3 | LOW | `PkiCaConfig` | Missing fields: `intermediate_lifetime`, `maintenance_interval`, `renewal_window_ratio`. |

**Data Loss Risk:** LOW — `LogConfig` has `[key: string]: unknown` on `LogWriter` and `LogEncoder`, but `LogConfig` itself does NOT have an index signature. If a Caddy config has `with_caller: true` on a log, the UI type would reject it at TypeScript level (though at runtime JSON will roundtrip fine if the UI preserves unknown keys).

---

### `src/types/admin.ts`

**Caddy Source Ref:**
- `AdminConfig` -> [admin.go#L76](https://github.com/caddyserver/caddy/blob/master/admin.go#L76)
- `ConfigSettings` (AdminConfigOptions) -> [admin.go#L134](https://github.com/caddyserver/caddy/blob/master/admin.go#L134)
- `IdentityConfig` (AdminIdentity) -> [admin.go#L165](https://github.com/caddyserver/caddy/blob/master/admin.go#L165)
- `RemoteAdmin` -> [admin.go#L188](https://github.com/caddyserver/caddy/blob/master/admin.go#L188)
- `AdminAccess` (RemoteAccessControl) -> [admin.go#L203](https://github.com/caddyserver/caddy/blob/master/admin.go#L203)
- `AdminPermissions` (RemotePermissions) -> [admin.go#L217](https://github.com/caddyserver/caddy/blob/master/admin.go#L217)

**Issues Found:**

| # | Severity | Field | Issue |
|---|----------|-------|-------|
| 1 | **HIGH** | `RemoteAccessControl.permissions` | UI type: `permissions?: RemotePermissions` (single object). Caddy source: `Permissions []AdminPermissions` (**array**). This is a **structural mismatch** — configs with multiple permissions entries would lose data. |
| 2 | MEDIUM | `AdminConfigOptions` | Missing field: `load_delay` (caddy.Duration string). |

---

### `src/types/http-app.ts`

**Caddy Source Ref:**
- `HttpApp` (App) -> [modules/caddyhttp/app.go#L120](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/app.go#L120)
- `HttpServer` (Server) -> [modules/caddyhttp/server.go#L53](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/server.go#L53)
- `HttpRoute` (Route) -> [modules/caddyhttp/routes.go#L37](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/routes.go#L37)
- `AutomaticHttps` (AutoHTTPSConfig) -> [modules/caddyhttp/autohttps.go#L36](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/autohttps.go#L36)
- `ServerLogConfig` -> [modules/caddyhttp/logging.go#L44](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/logging.go#L44)

**Issues Found:**

| # | Severity | Field | Issue |
|---|----------|-------|-------|
| 1 | MEDIUM | `HttpApp` | Missing field: `metrics` (`{per_host?, observe_catchall_hosts?, otlp?}`). |
| 2 | MEDIUM | `HttpServer` | Missing fields: `listener_wrappers`, `named_routes`, `tls_connection_policies`, `client_ip_headers`, `trusted_proxies_strict`, `trusted_proxies_unix`, `listen_protocols`, `allow_0rtt`, `metrics`, `enable_full_duplex`, `keepalive_idle`, `keepalive_count`. |
| 3 | LOW | `ServerLogConfig` | Missing fields: `skip_hosts` (string[]), `skip_unmapped_hosts` (bool), `trace` (bool). |
| 4 | LOW | `HttpServer.protocols` | Type is `string[]` which is correct. |

**Data Loss Risk:** MEDIUM — `HttpServer` does NOT have `[key: string]: unknown`, so fields like `tls_connection_policies`, `listener_wrappers`, `named_routes`, `client_ip_headers` etc. would be **silently dropped** when the UI reads and writes back a server config that contains them. This is the most significant data loss risk in the system.

**Recommendation:** Add `[key: string]: unknown` to `HttpServer` and `HttpApp` interfaces, or explicitly model the missing fields.

---

### `src/types/matchers.ts`

**Caddy Source Ref:**
- Matchers are individual modules under `http.matchers.*`:
  - `host` -> [modules/caddyhttp/matchers.go (MatchHost)](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/matchers.go)
  - `path` -> [modules/caddyhttp/matchers.go (MatchPath)](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/matchers.go)
  - `path_regexp` -> [modules/caddyhttp/matchers.go (MatchPathRE)](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/matchers.go)
  - `method` -> [modules/caddyhttp/matchers.go (MatchMethod)](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/matchers.go)
  - `query` -> [modules/caddyhttp/matchers.go (MatchQuery)](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/matchers.go)
  - `header` -> [modules/caddyhttp/matchers.go (MatchHeader)](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/matchers.go)
  - `header_regexp` -> [modules/caddyhttp/matchers.go (MatchHeaderRE)](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/matchers.go)
  - `protocol` -> [modules/caddyhttp/matchers.go (MatchProtocol)](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/matchers.go)
  - `remote_ip` -> [modules/caddyhttp/ip_matchers.go (MatchRemoteIP)](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/ip_matchers.go)
  - `client_ip` -> [modules/caddyhttp/ip_matchers.go (MatchClientIP)](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/ip_matchers.go)
  - `not` -> [modules/caddyhttp/matchers.go (MatchNot)](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/matchers.go)
  - `expression` (CEL) -> [modules/caddyhttp/celmatcher.go](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/celmatcher.go)
  - `file` -> [modules/caddyhttp/fileserver/matcher.go](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/fileserver/matcher.go)
  - `vars` -> [modules/caddyhttp/vars.go](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/vars.go)
  - `vars_regexp` -> [modules/caddyhttp/vars.go](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/vars.go)
  - `tls` -> [modules/caddyhttp/matchers.go (MatchTLS)](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/matchers.go)

**Issues Found:**

| # | Severity | Field | Issue |
|---|----------|-------|-------|
| 1 | LOW | `RequestMatcher` | Missing matchers: `client_ip`, `expression`, `file`, `vars`, `vars_regexp`, `tls`. These are covered by `[key: string]: unknown`. |
| 2 | LOW | `RemoteIpMatcher` | Missing the `forwarded` field is incorrect — `MatchRemoteIP` does NOT have a `forwarded` field. The `forwarded` concept is in `client_ip` (a separate matcher). |

**Data Loss Risk:** NONE — the `[key: string]: unknown` on `RequestMatcher` ensures all unmodeled matchers are preserved.

---

### `src/types/handlers.ts`

**Caddy Source Ref:**
- `FileServerHandler` -> [modules/caddyhttp/fileserver/staticfiles.go#L97](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/fileserver/staticfiles.go#L97)
- `StaticResponseHandler` -> [modules/caddyhttp/staticresp.go#L89](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/staticresp.go#L89)
- `HeadersHandler` -> [modules/caddyhttp/headers/headers.go#L43](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/headers/headers.go#L43)
- `EncodeHandler` -> [modules/caddyhttp/encode/encode.go#L42](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/encode/encode.go#L42)
- `RewriteHandler` -> [modules/caddyhttp/rewrite/rewrite.go#L54](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/rewrite/rewrite.go#L54)
- `TemplatesHandler` -> [modules/caddyhttp/templates/templates.go#L345](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/templates/templates.go#L345)
- `AuthenticationHandler` -> [modules/caddyhttp/caddyauth/caddyauth.go#L45](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/caddyauth/caddyauth.go#L45)
- `SubrouteHandler` -> [modules/caddyhttp/subroute.go](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/subroute.go)
- `RequestBodyHandler` -> [modules/caddyhttp/requestbody/requestbody.go#L36](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/requestbody/requestbody.go#L36)
- `MapHandler` -> [modules/caddyhttp/map/map.go#L39](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/map/map.go#L39)
- `PushHandler` -> [modules/caddyhttp/push/handler.go#L46](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/push/handler.go#L46)
- `InterceptHandler` -> [modules/caddyhttp/intercept/intercept.go#L45](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/intercept/intercept.go#L45)
- `TracingHandler` -> [modules/caddyhttp/tracing/module.go#L25](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/tracing/module.go#L25)

**Issues Found:**

| # | Severity | Field | Issue |
|---|----------|-------|-------|
| 1 | **HIGH** | `TracingHandler.span_name` | UI uses `span_name?: string`. Caddy source uses JSON key **`"span"`**. This will cause the span name to be lost on roundtrip. |
| 2 | **HIGH** | `TracingHandler.custom_labels` | UI uses `custom_labels?: Record<string, string>`. Caddy source uses **`"span_attributes"`**. This will cause attributes to be lost on roundtrip. |
| 3 | **HIGH** | `RedirHandler` | UI models redirect as `handler: "static_response"` with `headers: { Location: string[] }`. This is **technically correct** for how Caddy represents redirects internally, but it creates a **discriminant collision** — both `StaticResponseHandler` and `RedirHandler` share `handler: "static_response"`. TypeScript's discriminated union cannot differentiate them. |
| 4 | MEDIUM | `FileServerHandler` | Missing fields: `fs` (filesystem module), `status_code` (WeakString), `precompressed_order` (string[]), `etag_file_extensions` (string[]). |
| 5 | MEDIUM | `StaticResponseHandler` | Missing field: `abort` (bool) — force close the connection without response. |
| 6 | MEDIUM | `RewriteHandler` | Missing field: `query` — query string operations (`rename`, `set`, `add`, `replace`, `delete`). This is a significant Caddy feature (query rewriting). |
| 7 | LOW | `BrowseConfig` | Missing fields: `sort` (string[]), `file_limit` (int). |
| 8 | LOW | `FileServerHandler.canonical_uris` | Should be `*bool` (pointer to bool in Go) — modeled as `boolean` which conflates "unset" with "false". Not a real problem since TypeScript uses `?:`. |
| 9 | LOW | `RequestBodyHandler` | Fields `read_timeout` and `write_timeout` should be `caddy.Duration` (string), but UI models them as `number`. |
| 10 | LOW | `HttpBasicAuth` | Missing field: `hash_cache` (Cache config). |
| 11 | LOW | Missing handlers | Not modeled: `invoke`, `vars`, `log_append`, `copy_response`, `copy_response_headers`, `error` (static_error), `metrics`. All fall through to `UnknownHandler`. |

**Data Loss Risk:** HIGH for `TracingHandler` field name mismatch. LOW otherwise — `UnknownHandler` with `[key: string]: unknown` catches all unmodeled handlers.

---

### `src/types/reverse-proxy.ts`

**Caddy Source Ref:**
- `ReverseProxyHandler` (Handler) -> [modules/caddyhttp/reverseproxy/reverseproxy.go#L104](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/reverseproxy/reverseproxy.go#L104)
- `Upstream` -> [modules/caddyhttp/reverseproxy/hosts.go#L36](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/reverseproxy/hosts.go#L36)
- `LoadBalancing` -> [modules/caddyhttp/reverseproxy/reverseproxy.go#L1601](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/reverseproxy/reverseproxy.go#L1601)
- `HealthChecks` -> [modules/caddyhttp/reverseproxy/healthchecks.go#L47](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/reverseproxy/healthchecks.go#L47)
- `ActiveHealthChecks` -> [modules/caddyhttp/reverseproxy/healthchecks.go#L75](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/reverseproxy/healthchecks.go#L75)
- `PassiveHealthChecks` -> [modules/caddyhttp/reverseproxy/healthchecks.go#L236](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/reverseproxy/healthchecks.go#L236)
- `HTTPTransport` (Transport) -> [modules/caddyhttp/reverseproxy/httptransport.go#L61](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/reverseproxy/httptransport.go#L61)
- `TLSConfig` (TransportTls) -> [modules/caddyhttp/reverseproxy/httptransport.go#L633](https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/reverseproxy/httptransport.go#L633)

**Issues Found:**

| # | Severity | Field | Issue |
|---|----------|-------|-------|
| 1 | **HIGH** | `ReverseProxyHandler.buffer_requests` | UI type has `buffer_requests?: boolean`. Caddy source has `request_buffers` (int64) — **different field name AND type**. This will silently ignore buffering config and potentially lose it on write-back. |
| 2 | **HIGH** | `ReverseProxyHandler.buffer_responses` | Same issue — UI has `buffer_responses?: boolean`, Caddy has `response_buffers` (int64). |
| 3 | MEDIUM | `Upstream` | UI has `lookup_srv?: string` — this field does **NOT exist** on `Upstream` struct in Caddy. SRV lookup is a separate dynamic upstream module. This phantom field will not cause data loss but is misleading. |
| 4 | MEDIUM | `ReverseProxyHandler` | Missing fields: `dynamic_upstreams`, `circuit_breaker`, `stream_timeout`, `stream_buffer_size`, `stream_close_delay`, `rewrite`, `verbose_logs`. |
| 5 | MEDIUM | `ActiveHealthCheck` | Missing fields: `path` (deprecated but still parsed), `upstream`, `method`, `body`, `follow_redirects`, `passes`, `fails`. |
| 6 | MEDIUM | `Transport` (HTTPTransport) | Missing many fields: `resolver`, `keep_alive` (full struct), `compression`, `max_conns_per_host`, `proxy_protocol`, `forward_proxy_url`, `dial_fallback_delay`, `response_header_timeout`, `expect_continue_timeout`, `max_response_header_size`, `read_timeout`, `write_timeout`, `versions`, `local_address`, `network_proxy`. The `[key: string]: unknown` escape hatch covers these. |
| 7 | MEDIUM | `TransportTls` | Missing fields: `ca` (module), `root_ca_pem_files`, `client_certificate_automate`, `handshake_timeout`, `renegotiation`, `except_ports`, `curves`. |
| 8 | LOW | `LoadBalancing` | Missing `retry_match` field (matcher sets for retry conditions). |
| 9 | LOW | `HandleResponse` | The `routes` field is typed `unknown[]` rather than `HttpRoute[]` — this is a minor type weakness. |

**Data Loss Risk:** HIGH — `buffer_requests`/`buffer_responses` field name mismatch means these values will be silently discarded. However, `ReverseProxyHandler` does NOT have `[key: string]: unknown`, so **any field not explicitly listed will be lost on roundtrip**.

**Recommendation:** Add `[key: string]: unknown` to `ReverseProxyHandler` to prevent data loss of unmodeled fields.

---

### `src/types/tls-app.ts`

**Caddy Source Ref:**
- `TlsApp` (TLS) -> [modules/caddytls/tls.go#L52](https://github.com/caddyserver/caddy/blob/master/modules/caddytls/tls.go#L52)
- `TlsCertificates` -> Module map under `tls.certificates` namespace
  - `automate` -> [modules/caddytls/tls.go#L941 (AutomateLoader)](https://github.com/caddyserver/caddy/blob/master/modules/caddytls/tls.go#L941)
  - `load_files` -> [modules/caddytls/fileloader.go#L31](https://github.com/caddyserver/caddy/blob/master/modules/caddytls/fileloader.go#L31)
  - `load_pem` -> [modules/caddytls/pemloader.go#L31](https://github.com/caddyserver/caddy/blob/master/modules/caddytls/pemloader.go#L31)
  - `load_folders` -> [modules/caddytls/folderloader.go](https://github.com/caddyserver/caddy/blob/master/modules/caddytls/folderloader.go)
- `TlsAutomation` (AutomationConfig) -> [modules/caddytls/automation.go#L37](https://github.com/caddyserver/caddy/blob/master/modules/caddytls/automation.go#L37)
- `AutomationPolicy` -> [modules/caddytls/automation.go#L91](https://github.com/caddyserver/caddy/blob/master/modules/caddytls/automation.go#L91)
- `TlsIssuer` (ACMEIssuer) -> [modules/caddytls/acmeissuer.go#L45](https://github.com/caddyserver/caddy/blob/master/modules/caddytls/acmeissuer.go#L45)
- `AcmeChallenges` (ChallengesConfig) -> [modules/caddytls/automation.go#L506](https://github.com/caddyserver/caddy/blob/master/modules/caddytls/automation.go#L506)
- `SessionTickets` (SessionTicketService) -> [modules/caddytls/sessiontickets.go#L32](https://github.com/caddyserver/caddy/blob/master/modules/caddytls/sessiontickets.go#L32)
- `OnDemandConfig` -> [modules/caddytls/ondemand.go#L44](https://github.com/caddyserver/caddy/blob/master/modules/caddytls/ondemand.go#L44)

**Issues Found:**

| # | Severity | Field | Issue |
|---|----------|-------|-------|
| 1 | MEDIUM | `TlsApp` | Missing fields: `disable_storage_check`, `disable_storage_clean`, `encrypted_client_hello` (ECH), `dns` (provider module), `resolvers`. |
| 2 | MEDIUM | `TlsAutomation` | Missing field: `storage_clean_interval`. |
| 3 | MEDIUM | `AutomationPolicy` | Missing fields: `reuse_private_keys`, `ocsp_overrides`. |
| 4 | LOW | `TlsIssuer` | Missing ACME-specific fields: `test_ca`, `profile`, `account_key`, `external_account`, `acme_timeout`, `preferred_chains`, `certificate_lifetime`, `network_proxy`. Covered by `[key: string]: unknown`. |
| 5 | LOW | `SessionTickets` | Missing fields: `rotation_interval`, `max_keys`, `disable_rotation`. |
| 6 | **HIGH** | `AcmeChallenges.tls_alpn` | The JSON key in Caddy source is **`"tls-alpn"`** (with hyphen). The UI uses `tls_alpn` (underscore). This means the TLS-ALPN challenge config will be **silently ignored** on read and **lost** on write-back. |
| 7 | LOW | `OnDemandConfig` | UI models `permission?: OnDemandPermission` (with `module` + `endpoint`). Caddy has deprecated `ask` field (still supported). The UI model is acceptable for current usage. |

**Data Loss Risk:** MEDIUM — `TlsApp` does NOT have `[key: string]: unknown`. Fields like `encrypted_client_hello`, `dns`, `resolvers`, `disable_storage_check`, `disable_storage_clean` would be lost.

**Recommendation:** Add `[key: string]: unknown` to `TlsApp`.

---

## 2. Summary of Critical Issues

### HIGH Severity (will cause data loss or incorrect behavior)

1. **`TracingHandler` field names wrong** — `span_name` should be `span`, `custom_labels` should be `span_attributes`.
2. **`ReverseProxyHandler.buffer_requests/buffer_responses`** — field names AND types wrong. Should be `request_buffers?: number` and `response_buffers?: number`.
3. **`RemoteAccessControl.permissions`** — should be an array (`RemotePermissions[]`), not a single object.
4. **`ReverseProxyHandler` missing index signature** — any config fields not modeled will be lost on roundtrip (e.g., `dynamic_upstreams`, `circuit_breaker`, `stream_timeout`, `rewrite`, etc.).
5. **`AcmeChallenges.tls_alpn`** — JSON key should be `"tls-alpn"` (hyphen), not `tls_alpn` (underscore). TLS-ALPN challenge config is silently ignored.

### MEDIUM Severity (missing fields that won't be preserved)

5. **`HttpServer` missing index signature** — `tls_connection_policies`, `listener_wrappers`, `named_routes`, `client_ip_headers` etc. will be lost.
6. **`TlsApp` missing index signature** — `encrypted_client_hello`, `dns`, `resolvers` etc. will be lost.
7. **`HttpApp` missing `metrics`** — server-level metrics config will be lost.
8. **`Upstream.lookup_srv`** — phantom field that doesn't exist in Caddy.
9. **`RewriteHandler` missing `query`** — query string manipulation cannot be represented.
10. **`RequestBodyHandler` timeout types** — should be duration strings, not numbers.

---

## 3. Form Coverage Analysis (Zod Schemas)

### Server Form (`server.ts`)

**Modeled:** `serverId`, `listenAddresses`, `disableHttps`, `protocols`

**NOT modeled in form (requires raw JSON or data preservation):**
- `read_timeout`, `read_header_timeout`, `write_timeout`, `idle_timeout`, `keepalive_interval`
- `max_header_bytes`
- `strict_sni_host`
- `trusted_proxies`
- `tls_connection_policies`
- `listener_wrappers`
- `named_routes`
- `errors` (error routes)
- `logs` (per-server logging)
- `metrics`

**Coverage Assessment:** The form covers the minimal required fields (listen + auto-HTTPS toggle). All other server fields must be preserved through roundtrips via the raw JSON editor.

**Risk:** If the server form writes back a minimal `HttpServer` without preserving unmodeled fields, data WILL be lost. The form must use PATCH semantics (only update known fields) or carry forward all unknown fields.

---

### Route Form (`route.ts`)

**Modeled:** `hosts`, `paths`, `methods`, handler type selection (reverse_proxy, file_server, static_response, redir, subroute), `terminal`

**NOT modeled:**
- `@id`, `group`
- Advanced matchers (header, query, protocol, remote_ip, path_regexp) — handled separately in `advancedMatchersFormSchema`
- Multiple handlers per route (form assumes single primary handler)
- `not` matcher (negation)

**Coverage Assessment:** The route form covers the most common use case (single handler per route with host/path matching). The `route-handlers.ts` helper properly preserves unknown handlers via `extractUnknownHandlers` + `mergeHandlers`.

**Risk:** LOW — the handler preservation pattern correctly keeps non-form-managed handlers intact.

---

### Reverse Proxy Form (`reverse-proxy.ts`)

**Modeled:** upstreams (dial + max_requests), load balancing policy + try_duration + retries, active health check (uri, interval, timeout), passive health check (max_fails, fail_duration), disable X-Forwarded headers, insecure TLS skip verify.

**NOT modeled (data loss on edit via form):**
- `flush_interval`
- `transport` — only `insecure_skip_verify` is modeled; full transport config (keepalive, compression, timeouts, proxy protocol, HTTP versions, resolver) is NOT preserved
- `handle_response` (response handling routes)
- `headers` — only delete for X-Forwarded is modeled; arbitrary header manipulation is lost
- `dynamic_upstreams`
- `circuit_breaker`
- `stream_timeout`, `stream_buffer_size`, `stream_close_delay`
- `rewrite` (pre-request rewrite)
- `request_buffers`, `response_buffers`
- Load balancing: `try_interval`, `retry_match`, selection policy options (e.g., `header`, `cookie` params)
- Active health check: `port`, `max_size`, `expect_status`, `expect_body`, `headers`, `method`, `body`, `passes`, `fails`
- Passive health check: `unhealthy_request_count`, `unhealthy_status`, `unhealthy_latency`

**Risk:** **HIGH** — The `toHandler()` function constructs a new `ReverseProxyHandler` from scratch. Any fields that exist in the original config but aren't captured by `parseInitialValues()` will be **permanently lost** when the user saves. This is the most serious data loss vector in the application.

**Recommendation:** The `toHandler()` function should start from a copy of the original handler and only overlay form-managed fields, preserving all others.

---

### TLS Policy Form (`tls-policy.ts`)

**Modeled:** subjects, issuer module (acme/zerossl/internal) + email + CA URL, HTTP/TLS-ALPN challenge disable toggles, key_type, on_demand, must_staple.

**NOT modeled:**
- `get_certificate` (external certificate managers)
- `renewal_window_ratio`
- `storage` (per-policy storage override)
- `disable_ocsp_stapling`
- `reuse_private_keys`
- `ocsp_overrides`
- Issuer: `challenges.dns`, `challenges.bind_host`, `trusted_roots_pem_files`, `external_account`, `preferred_chains`, `certificate_lifetime`, `test_ca`, `profile`, `account_key`

**Risk:** MEDIUM — same pattern as reverse proxy. If `toHandler()` constructs from scratch, policy fields like `dns` challenges, `external_account`, and `storage` overrides will be lost.

---

### Middleware Forms

#### Encode (`middleware.ts`)
**Modeled:** gzip/zstd enable, min_length, prefer order.
**Missing:** Custom encodings (brotli), `match` (response matcher for selective encoding).
**Risk:** LOW — the form preserves the essence; `match` is rarely used.

#### Rewrite (`middleware.ts`)
**Modeled:** uri, strip_path_prefix, strip_path_suffix, uri_substring, path_regexp, method.
**Missing:** `query` operations (rename, set, add, replace, delete query params).
**Risk:** MEDIUM — query rewriting is a common Caddy feature that cannot be represented.

#### Headers (`headers.ts`)
**Modeled:** request/response header add/set/delete, response deferred.
**Missing:** `replace` operations (search/replace in header values), `require` (conditional response headers).
**Risk:** MEDIUM — header replacement configs will be lost.

#### Basic Auth (`middleware.ts`)
**Modeled:** accounts (username/password), realm.
**Missing:** `hash_cache` config.
**Risk:** LOW.

#### Advanced Matchers (`middleware.ts`)
**Modeled:** header, query, remote_ip (ranges + forwarded), protocol.
**Missing:** `path_regexp`, `expression` (CEL), `file`, `vars`, `tls`, `client_ip`, `not` (negation).
**Risk:** LOW — `[key: string]: unknown` on `RequestMatcher` preserves them.

---

### Log Form (`log.ts`)

**Modeled:** name, level, output type (stdout/stderr/file/discard), file options (filename, roll_*), encoder format (console/json), include/exclude namespaces.

**Missing:** `sampling` config, `with_caller`, `with_stacktrace`.
**Risk:** LOW — these are rarely configured.

---

## 4. Recommendations

### Immediate Fixes (prevent data loss)

1. **Add `[key: string]: unknown`** to these interfaces:
   - `ReverseProxyHandler`
   - `HttpServer`
   - `HttpApp`
   - `TlsApp`
   - `LogConfig`
   - `AutomationPolicy`
   - `ActiveHealthCheck`
   - `PassiveHealthCheck`
   - `SessionTickets`

2. **Fix field name errors:**
   - `TracingHandler`: `span_name` -> `span`, `custom_labels` -> `span_attributes`
   - `ReverseProxyHandler`: `buffer_requests`/`buffer_responses` -> `request_buffers`/`response_buffers` (also change type to `number`)

3. **Fix structural errors:**
   - `RemoteAccessControl.permissions`: change from `RemotePermissions` to `RemotePermissions[]`
   - Remove `Upstream.lookup_srv` (doesn't exist)

4. **Fix form `toHandler()` patterns:** All `toHandler()`/form-to-config conversion functions should **spread the original handler** and overlay form fields, rather than constructing from scratch:
   ```typescript
   function toHandler(values: FormValues, original?: ReverseProxyHandler): ReverseProxyHandler {
     return {
       ...original,        // preserve ALL existing fields
       handler: "reverse_proxy",
       upstreams: /* form values */,
       // ... only override form-managed fields
     };
   }
   ```

### Medium-term (improve coverage)

5. Add `query` field to `RewriteHandler` type.
6. Add `replace` to `HeaderOps` in headers form.
7. Model `tls_connection_policies` on `HttpServer`.
8. Add `metrics` to `HttpApp`.

### Architecture Note

The "escape hatch" strategy (`UnknownHandler` + `[key: string]: unknown`) is sound for plugin extensibility. The primary risk is **interfaces that lack the index signature** — these create "closed" types that will silently drop unknown fields when TypeScript code spreads or reconstructs them.

The `route-handlers.ts` pattern (extract unknown handlers, merge back after edit) is the correct approach and should be replicated for ALL form-to-config conversions.
