/**
 * Type barrel export — re-exports all Caddy config types.
 */

export type {
  CaddyConfig,
  CaddyApps,
  LoggingConfig,
  LogConfig,
  LogWriter,
  LogEncoder,
  StorageConfig,
  PkiApp,
  PkiCaConfig,
} from "./caddy";
export type { AdminConfig, RemoteAdmin } from "./admin";
export type { HttpApp, HttpServer, HttpRoute, AutomaticHttps, ServerLogConfig } from "./http-app";
export type {
  TlsApp,
  TlsAutomation,
  AutomationPolicy,
  TlsIssuer,
  TlsCertificates,
} from "./tls-app";
export type {
  HttpHandler,
  FileServerHandler,
  StaticResponseHandler,
  RedirHandler,
  HeadersHandler,
  EncodeHandler,
  RewriteHandler,
  TemplatesHandler,
  AuthenticationHandler,
  UnknownHandler,
} from "./handlers";
export type {
  ReverseProxyHandler,
  Upstream,
  LoadBalancing,
  HealthChecks,
  ActiveHealthCheck,
  PassiveHealthCheck,
  Transport,
} from "./reverse-proxy";
export type { RequestMatcher, PathRegexp, RemoteIpMatcher } from "./matchers";
