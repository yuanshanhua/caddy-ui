/**
 * TLS App configuration types.
 *
 * Source refs:
 * - TlsApp (TLS)            → https://github.com/caddyserver/caddy/blob/master/modules/caddytls/tls.go (TLS struct)
 * - TlsCertificates         → Module map under tls.certificates namespace
 *   - automate              → https://github.com/caddyserver/caddy/blob/master/modules/caddytls/tls.go (AutomateLoader)
 *   - load_files            → https://github.com/caddyserver/caddy/blob/master/modules/caddytls/fileloader.go
 *   - load_pem              → https://github.com/caddyserver/caddy/blob/master/modules/caddytls/pemloader.go
 *   - load_folders           → https://github.com/caddyserver/caddy/blob/master/modules/caddytls/folderloader.go
 * - TlsAutomation           → https://github.com/caddyserver/caddy/blob/master/modules/caddytls/automation.go (AutomationConfig struct)
 * - AutomationPolicy        → https://github.com/caddyserver/caddy/blob/master/modules/caddytls/automation.go (AutomationPolicy struct)
 * - TlsIssuer (ACMEIssuer)  → https://github.com/caddyserver/caddy/blob/master/modules/caddytls/acmeissuer.go
 * - AcmeChallenges          → https://github.com/caddyserver/caddy/blob/master/modules/caddytls/automation.go (ChallengesConfig struct)
 * - SessionTickets          → https://github.com/caddyserver/caddy/blob/master/modules/caddytls/sessiontickets.go
 * - OnDemandConfig          → https://github.com/caddyserver/caddy/blob/master/modules/caddytls/ondemand.go
 */

export interface TlsApp {
  certificates?: TlsCertificates;
  automation?: TlsAutomation;
  session_tickets?: SessionTickets;
  cache?: TlsCache;
  disable_ocsp_stapling?: boolean;
  [key: string]: unknown;
}

export interface TlsCertificates {
  automate?: string[];
  load_files?: CertificateFile[];
  load_folders?: string[];
  load_pem?: PemCertificate[];
}

export interface CertificateFile {
  certificate: string;
  key: string;
  format?: string;
  tags?: string[];
}

export interface PemCertificate {
  certificate: string;
  key: string;
  tags?: string[];
}

export interface TlsAutomation {
  policies?: AutomationPolicy[];
  on_demand?: OnDemandConfig;
  ocsp_interval?: string;
  renew_interval?: string;
}

export interface AutomationPolicy {
  subjects?: string[];
  issuers?: TlsIssuer[];
  get_certificate?: GetCertificate[];
  key_type?: string;
  must_staple?: boolean;
  renewal_window_ratio?: number;
  storage?: { module: string; [key: string]: unknown };
  on_demand?: boolean;
  disable_ocsp_stapling?: boolean;
  [key: string]: unknown;
}

export interface TlsIssuer {
  module: "acme" | "zerossl" | "internal" | string;
  ca?: string;
  email?: string;
  challenges?: AcmeChallenges;
  trusted_roots_pem_files?: string[];
  [key: string]: unknown;
}

export interface AcmeChallenges {
  http?: AcmeHttpChallenge;
  "tls-alpn"?: AcmeTlsAlpnChallenge;
  dns?: AcmeDnsChallenge;
  bind_host?: string;
}

export interface AcmeHttpChallenge {
  disabled?: boolean;
  alternate_port?: number;
}

export interface AcmeTlsAlpnChallenge {
  disabled?: boolean;
  alternate_port?: number;
}

export interface AcmeDnsChallenge {
  provider?: { name: string; [key: string]: unknown };
  ttl?: string;
  propagation_delay?: string;
  propagation_timeout?: string;
  resolvers?: string[];
  override_domain?: string;
}

export interface GetCertificate {
  via: string;
  [key: string]: unknown;
}

export interface OnDemandConfig {
  permission?: OnDemandPermission;
}

export interface OnDemandPermission {
  module: string;
  endpoint?: string;
  [key: string]: unknown;
}

export interface SessionTickets {
  disabled?: boolean;
  key_source?: { provider: string; [key: string]: unknown };
}

export interface TlsCache {
  capacity?: number;
}
