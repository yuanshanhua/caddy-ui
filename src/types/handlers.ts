/**
 * HTTP Handler types — discriminated union based on the `handler` field.
 *
 * Each handler module in Caddy is identified by its handler name.
 * We model known handlers as specific interfaces and provide an escape hatch
 * for unknown/plugin handlers.
 */

import type { HttpRoute } from "./http-app";
import type { ReverseProxyHandler } from "./reverse-proxy";

// --- Discriminated Union of All Known Handlers ---

export type HttpHandler =
  | ReverseProxyHandler
  | FileServerHandler
  | StaticResponseHandler
  | RedirHandler
  | SubrouteHandler
  | HeadersHandler
  | EncodeHandler
  | RewriteHandler
  | TemplatesHandler
  | AuthenticationHandler
  | RequestBodyHandler
  | MapHandler
  | PushHandler
  | InterceptHandler
  | TracingHandler
  | UnknownHandler;

// --- File Server ---

export interface FileServerHandler {
  handler: "file_server";
  root?: string;
  hide?: string[];
  index_names?: string[];
  browse?: BrowseConfig;
  precompressed?: Record<string, Record<string, unknown>>;
  canonical_uris?: boolean;
  pass_thru?: boolean;
}

export interface BrowseConfig {
  template_file?: string;
  reveal_symlinks?: boolean;
}

// --- Static Response ---

export interface StaticResponseHandler {
  handler: "static_response";
  status_code?: number | string;
  headers?: Record<string, string[]>;
  body?: string;
  close?: boolean;
}

// --- Redirect ---

export interface RedirHandler {
  handler: "static_response";
  headers: {
    Location: string[];
  };
  status_code: "301" | "302" | "303" | "307" | "308" | string;
}

// --- Headers ---

export interface HeadersHandler {
  handler: "headers";
  request?: HeaderOps;
  response?: RespHeaderOps;
}

export interface HeaderOps {
  add?: Record<string, string[]>;
  set?: Record<string, string[]>;
  delete?: string[];
  replace?: Record<string, HeaderReplacement[]>;
}

export interface RespHeaderOps extends HeaderOps {
  deferred?: boolean;
  require?: HeaderRequire;
}

export interface HeaderReplacement {
  search: string;
  search_regexp?: string;
  replace: string;
}

export interface HeaderRequire {
  status_code?: number[];
  headers?: Record<string, string[]>;
}

// --- Encode (compression) ---

export interface EncodeHandler {
  handler: "encode";
  encodings?: Record<string, Record<string, unknown>>;
  prefer?: string[];
  minimum_length?: number;
  match?: EncodeMatch;
}

export interface EncodeMatch {
  status_code?: number[];
  headers?: Record<string, string[]>;
}

// --- Rewrite ---

export interface RewriteHandler {
  handler: "rewrite";
  uri?: string;
  method?: string;
  strip_path_prefix?: string;
  strip_path_suffix?: string;
  uri_substring?: RewriteSubstring[];
  path_regexp?: RewritePathRegexp[];
}

export interface RewriteSubstring {
  find: string;
  replace: string;
  limit?: number;
}

export interface RewritePathRegexp {
  find: string;
  replace: string;
}

// --- Templates ---

export interface TemplatesHandler {
  handler: "templates";
  file_root?: string;
  mime_types?: string[];
  delimiters?: [string, string];
}

// --- Authentication ---

export interface AuthenticationHandler {
  handler: "authentication";
  providers?: AuthProviders;
}

export interface AuthProviders {
  http_basic?: HttpBasicAuth;
  [key: string]: unknown;
}

export interface HttpBasicAuth {
  hash?: HashConfig;
  accounts?: BasicAuthAccount[];
  realm?: string;
}

export interface HashConfig {
  algorithm: string;
  [key: string]: unknown;
}

export interface BasicAuthAccount {
  username: string;
  password: string;
  salt?: string;
}

// --- Subroute ---

export interface SubrouteHandler {
  handler: "subroute";
  routes: HttpRoute[];
}

// --- Request Body ---

export interface RequestBodyHandler {
  handler: "request_body";
  max_size?: number;
  read_timeout?: number;
  write_timeout?: number;
  set?: string;
}

// --- Map ---

export interface MapHandler {
  handler: "map";
  source?: string;
  destinations?: string[];
  mappings?: MapMapping[];
  defaults?: string[];
}

export interface MapMapping {
  input?: string;
  input_regexp?: string;
  outputs?: unknown[];
}

// --- HTTP/2 Server Push ---

export interface PushHandler {
  handler: "push";
  resources?: PushResource[];
  headers?: {
    add?: Record<string, string[]>;
    set?: Record<string, string[]>;
    delete?: string[];
    replace?: Record<string, HeaderReplacement[]>;
  };
}

export interface PushResource {
  method?: string;
  target?: string;
}

// --- Intercept (response interception) ---

export interface InterceptHandler {
  handler: "intercept";
  handle_response?: ResponseHandler[];
}

export interface ResponseHandler {
  match?: ResponseMatcher[];
  routes?: HttpRoute[];
  status_code?: string | number;
}

export interface ResponseMatcher {
  status?: number[];
  headers?: Record<string, string[]>;
}

// --- Tracing (OpenTelemetry) ---

export interface TracingHandler {
  handler: "tracing";
  span_name?: string;
  custom_labels?: Record<string, string>;
}

// --- Escape hatch for unknown/plugin handlers ---

export interface UnknownHandler {
  handler: string;
  [key: string]: unknown;
}
