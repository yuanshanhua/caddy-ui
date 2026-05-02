/**
 * Type barrel export — re-exports all Caddy config types.
 */

export type { AdminConfig, RemoteAdmin } from "./admin";
export type {
  CaddyApps,
  CaddyConfig,
  LogConfig,
  LogEncoder,
  LoggingConfig,
  LogWriter,
  PkiApp,
  PkiCaConfig,
  StorageConfig,
} from "./caddy";
export type {
  AuthenticationHandler,
  EncodeHandler,
  FileServerHandler,
  HeadersHandler,
  HttpHandler,
  RedirHandler,
  RewriteHandler,
  StaticResponseHandler,
  TemplatesHandler,
  UnknownHandler,
} from "./handlers";
export type { AutomaticHttps, HttpApp, HttpRoute, HttpServer, ServerLogConfig } from "./http-app";
export type { PathRegexp, RemoteIpMatcher, RequestMatcher } from "./matchers";
export type {
  ActiveHealthCheck,
  HealthChecks,
  LoadBalancing,
  PassiveHealthCheck,
  ReverseProxyHandler,
  Transport,
  Upstream,
} from "./reverse-proxy";
export type {
  AutomationPolicy,
  TlsApp,
  TlsAutomation,
  TlsCertificates,
  TlsIssuer,
} from "./tls-app";
