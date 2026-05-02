/**
 * Caddy HTTP App types.
 *
 * This is the most complex part of Caddy's config — it defines servers,
 * routes, matchers, and handlers.
 */

import type { HttpHandler } from "./handlers";
import type { RequestMatcher } from "./matchers";

export interface HttpApp {
  http_port?: number;
  https_port?: number;
  grace_period?: string;
  shutdown_delay?: string;
  servers?: Record<string, HttpServer>;
}

export interface HttpServer {
  listen?: string[];
  routes?: HttpRoute[];
  errors?: HttpServerErrors;
  automatic_https?: AutomaticHttps;
  max_header_bytes?: number;
  read_timeout?: string;
  read_header_timeout?: string;
  write_timeout?: string;
  idle_timeout?: string;
  keepalive_interval?: string;
  protocols?: string[];
  strict_sni_host?: boolean;
  trusted_proxies?: TrustedProxies;
  logs?: ServerLogConfig;
}

export interface HttpRoute {
  "@id"?: string;
  group?: string;
  match?: RequestMatcher[];
  handle?: HttpHandler[];
  terminal?: boolean;
}

export interface HttpServerErrors {
  routes?: HttpRoute[];
}

export interface AutomaticHttps {
  disable?: boolean;
  disable_redirects?: boolean;
  disable_certificates?: boolean;
  skip?: string[];
  skip_certificates?: string[];
  ignore_loaded_certificates?: boolean;
}

export interface TrustedProxies {
  source: string;
  ranges?: string[];
  [key: string]: unknown;
}

export interface ServerLogConfig {
  default_logger_name?: string;
  logger_names?: Record<string, string>;
  should_log_credentials?: boolean;
}
