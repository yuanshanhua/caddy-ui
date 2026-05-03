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
  getCaCerts: (caId: string): Promise<string> => {
    return request<string>(`/pki/ca/${caId}/certificates`);
  },
};
