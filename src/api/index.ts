/**
 * API barrel export — re-exports all API modules.
 */

export { request, checkConnection, CaddyApiError, NetworkError } from "./client";
export { configApi } from "./config";
export { systemApi } from "./system";
export { monitoringApi } from "./monitoring";
export { pkiApi } from "./pki";
export type { UpstreamStatus } from "./monitoring";
export type { CaInfo } from "./pki";
