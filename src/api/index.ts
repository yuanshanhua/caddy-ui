/**
 * API barrel export — re-exports all API modules.
 */

export { CaddyApiError, checkConnection, NetworkError, request } from "./client";
export { configApi } from "./config";
export type { UpstreamStatus } from "./monitoring";
export { monitoringApi } from "./monitoring";
export type { CaInfo } from "./pki";
export { pkiApi } from "./pki";
export { systemApi } from "./system";
