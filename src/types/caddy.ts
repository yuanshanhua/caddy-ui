/**
 * Top-level Caddy configuration type.
 *
 * This represents the root JSON document that Caddy uses as its config.
 * Reference: https://caddyserver.com/docs/json/
 *
 * Source refs:
 * - CaddyConfig     → https://github.com/caddyserver/caddy/blob/master/caddy.go  (Config struct)
 * - LoggingConfig   → https://github.com/caddyserver/caddy/blob/master/logging.go (Logging struct)
 * - LogConfig       → https://github.com/caddyserver/caddy/blob/master/logging.go (CustomLog struct)
 * - StorageConfig   → https://github.com/caddyserver/caddy/blob/master/caddy.go   (StorageRaw field)
 * - PkiApp          → https://github.com/caddyserver/caddy/blob/master/modules/caddypki/pki.go (PKI struct)
 * - PkiCaConfig     → https://github.com/caddyserver/caddy/blob/master/modules/caddypki/ca.go  (CA struct)
 */

import type { AdminConfig } from "./admin";
import type { HttpApp } from "./http-app";
import type { TlsApp } from "./tls-app";

export interface CaddyConfig {
  admin?: AdminConfig;
  logging?: LoggingConfig;
  storage?: StorageConfig;
  apps?: CaddyApps;
}

export interface CaddyApps {
  http?: HttpApp;
  tls?: TlsApp;
  pki?: PkiApp;
  [key: string]: unknown;
}

// --- Logging ---

export interface LoggingConfig {
  sink?: LogSink;
  logs?: Record<string, LogConfig>;
}

export interface LogSink {
  writer?: LogWriter;
}

export interface LogConfig {
  writer?: LogWriter;
  encoder?: LogEncoder;
  level?: "DEBUG" | "INFO" | "WARN" | "ERROR" | "PANIC" | "FATAL";
  sampling?: LogSampling;
  include?: string[];
  exclude?: string[];
}

export interface LogWriter {
  output: string;
  filename?: string;
  roll_disabled?: boolean;
  roll_size_mb?: number;
  roll_keep?: number;
  roll_keep_days?: number;
  [key: string]: unknown;
}

export interface LogEncoder {
  format: "console" | "json" | "filter" | string;
  [key: string]: unknown;
}

export interface LogSampling {
  interval?: number;
  first?: number;
  thereafter?: number;
}

// --- Storage ---

export interface StorageConfig {
  module: string;
  root?: string;
  [key: string]: unknown;
}

// --- PKI ---

export interface PkiApp {
  certificate_authorities?: Record<string, PkiCaConfig>;
}

export interface PkiCaConfig {
  name?: string;
  root_common_name?: string;
  intermediate_common_name?: string;
  install_trust?: boolean;
  root?: PkiKeyPair;
  intermediate?: PkiKeyPair;
  storage?: StorageConfig;
}

export interface PkiKeyPair {
  certificate?: string;
  private_key?: string;
}
