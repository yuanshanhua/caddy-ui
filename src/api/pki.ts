/**
 * PKI (Public Key Infrastructure) Admin API endpoints.
 */

import { request } from "./client";

export interface CaInfo {
  id: string;
  name: string;
  root_common_name: string;
  intermediate_common_name: string;
  root_certificate: string;
  intermediate_certificate: string;
}

export const pkiApi = {
  /** Get information about a Certificate Authority. */
  getCa: (caId: string): Promise<CaInfo> => {
    return request<CaInfo>(`/pki/ca/${caId}`);
  },

  /** Get the certificate chain for a CA (PEM format, returned as text). */
  getCaCerts: async (caId: string): Promise<string> => {
    const response = await fetch(
      `${import.meta.env["VITE_CADDY_API_BASE"] ?? "/ui/api"}/pki/ca/${caId}/certificates`,
    );
    return response.text();
  },
};
