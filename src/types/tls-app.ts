/**
 * TLS App configuration types.
 */

export interface TlsApp {
  certificates?: TlsCertificates;
  automation?: TlsAutomation;
  session_tickets?: SessionTickets;
  cache?: TlsCache;
  disable_ocsp_stapling?: boolean;
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
  tls_alpn?: AcmeTlsAlpnChallenge;
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
