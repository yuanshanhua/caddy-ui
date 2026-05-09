/**
 * Request matcher types for Caddy HTTP routes.
 *
 * Matchers determine which requests a route handles.
 * Multiple matchers in the same set are AND'd; multiple sets are OR'd.
 *
 * Source refs:
 * - host, path, path_regexp, method, query, header, header_regexp, protocol, not
 *   → https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/matchers.go
 * - remote_ip, client_ip
 *   → https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/ip_matchers.go
 * - expression (CEL)
 *   → https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/celmatcher.go
 * - file
 *   → https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/fileserver/matcher.go
 * - vars, vars_regexp
 *   → https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/vars.go
 */

export interface RequestMatcher {
  host?: string[];
  path?: string[];
  path_regexp?: PathRegexp;
  method?: string[];
  query?: Record<string, string[]>;
  header?: Record<string, string[]>;
  header_regexp?: Record<string, HeaderRegexp>;
  protocol?: string;
  remote_ip?: RemoteIpMatcher;
  not?: RequestMatcher[];
  [key: string]: unknown;
}

export interface PathRegexp {
  name?: string;
  pattern: string;
}

export interface HeaderRegexp {
  name?: string;
  pattern: string;
}

export interface RemoteIpMatcher {
  ranges?: string[];
  forwarded?: boolean;
}
