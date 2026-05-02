/**
 * Caddy Admin configuration types.
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
  permissions?: RemotePermissions;
}

export interface RemotePermissions {
  paths?: string[];
  methods?: string[];
}
