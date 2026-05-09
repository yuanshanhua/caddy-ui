/**
 * Caddy Admin configuration types.
 *
 * Source refs:
 * - AdminConfig         → https://github.com/caddyserver/caddy/blob/master/admin.go (AdminConfig struct)
 * - AdminConfigOptions  → https://github.com/caddyserver/caddy/blob/master/admin.go (ConfigSettings struct)
 * - AdminIdentity       → https://github.com/caddyserver/caddy/blob/master/admin.go (IdentityConfig struct)
 * - RemoteAdmin         → https://github.com/caddyserver/caddy/blob/master/admin.go (RemoteAdmin struct)
 * - RemoteAccessControl → https://github.com/caddyserver/caddy/blob/master/admin.go (AdminAccess struct)
 * - RemotePermissions   → https://github.com/caddyserver/caddy/blob/master/admin.go (AdminPermissions struct)
 */

export interface AdminConfig {
  disabled?: boolean;
  listen?: string;
  enforce_origin?: boolean;
  origins?: string[];
  config?: AdminConfigOptions;
  identity?: AdminIdentity;
  remote?: RemoteAdmin;
}

export interface AdminConfigOptions {
  persist?: boolean;
  load?: AdminConfigLoad;
}

export interface AdminConfigLoad {
  module: string;
  [key: string]: unknown;
}

export interface AdminIdentity {
  identifiers?: string[];
  issuers?: AdminIdentityIssuer[];
}

export interface AdminIdentityIssuer {
  module: string;
  [key: string]: unknown;
}

export interface RemoteAdmin {
  listen?: string;
  access_control?: RemoteAccessControl[];
}

export interface RemoteAccessControl {
  public_keys?: string[];
  permissions?: RemotePermissions[];
}

export interface RemotePermissions {
  paths?: string[];
  methods?: string[];
}
