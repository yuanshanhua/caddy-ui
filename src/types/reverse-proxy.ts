/**
 * Reverse Proxy handler types — the most complex handler in Caddy.
 *
 * Source refs:
 * - ReverseProxyHandler (Handler)   → https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/reverseproxy/reverseproxy.go
 * - Upstream                        → https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/reverseproxy/hosts.go
 * - LoadBalancing                   → https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/reverseproxy/reverseproxy.go (LoadBalancing struct)
 * - SelectionPolicy                 → https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/reverseproxy/selectionpolicies.go
 * - HealthChecks                    → https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/reverseproxy/healthchecks.go
 * - Transport (HTTPTransport)       → https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/reverseproxy/httptransport.go
 * - TransportTls (TLSConfig)        → https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/reverseproxy/httptransport.go (TLSConfig struct)
 * - HandleResponse                  → https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/caddyhttp.go (ResponseHandler struct)
 */

export interface ReverseProxyHandler {
  handler: "reverse_proxy";
  upstreams?: Upstream[];
  load_balancing?: LoadBalancing;
  health_checks?: HealthChecks;
  headers?: ProxyHeaderOps;
  transport?: Transport;
  flush_interval?: string;
  request_buffers?: number;
  response_buffers?: number;
  max_buffer_size?: number;
  trusted_proxies?: string[];
  handle_response?: HandleResponse[];
  [key: string]: unknown;
}

export interface Upstream {
  dial?: string;
  max_requests?: number;
}

export interface LoadBalancing {
  selection_policy?: SelectionPolicy;
  try_duration?: string;
  try_interval?: string;
  retries?: number;
  retry_match?: RetryMatch[];
}

export interface SelectionPolicy {
  policy:
    | "random"
    | "round_robin"
    | "least_conn"
    | "ip_hash"
    | "uri_hash"
    | "first"
    | "header"
    | "cookie"
    | string;
  [key: string]: unknown;
}

export interface RetryMatch {
  status_code?: number[];
  error?: string[];
}

export interface HealthChecks {
  active?: ActiveHealthCheck;
  passive?: PassiveHealthCheck;
}

export interface ActiveHealthCheck {
  uri?: string;
  port?: number;
  interval?: string;
  timeout?: string;
  max_size?: number;
  expect_status?: number;
  expect_body?: string;
  headers?: Record<string, string[]>;
}

export interface PassiveHealthCheck {
  max_fails?: number;
  fail_duration?: string;
  unhealthy_request_count?: number;
  unhealthy_status?: number[];
  unhealthy_latency?: string;
}

export interface ProxyHeaderOps {
  request?: ProxyHeaderRequest;
  response?: ProxyHeaderResponse;
}

export interface ProxyHeaderRequest {
  add?: Record<string, string[]>;
  set?: Record<string, string[]>;
  delete?: string[];
}

export interface ProxyHeaderResponse {
  add?: Record<string, string[]>;
  set?: Record<string, string[]>;
  delete?: string[];
}

export interface Transport {
  protocol: "http" | "fastcgi" | string;
  tls?: TransportTls;
  read_buffer_size?: number;
  write_buffer_size?: number;
  dial_timeout?: string;
  [key: string]: unknown;
}

export interface TransportTls {
  server_name?: string;
  insecure_skip_verify?: boolean;
  client_certificate_file?: string;
  client_certificate_key_file?: string;
  root_ca_pool?: string[];
}

export interface HandleResponse {
  match?: HandleResponseMatch;
  status_code?: number;
  routes?: unknown[];
}

export interface HandleResponseMatch {
  status_code?: number[];
  headers?: Record<string, string[]>;
}
