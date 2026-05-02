/**
 * Request matcher types for Caddy HTTP routes.
 *
 * Matchers determine which requests a route handles.
 * Multiple matchers in the same set are AND'd; multiple sets are OR'd.
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
