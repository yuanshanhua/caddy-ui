/**
 * Form value converters — pure transformations between Caddy JSON and form shapes.
 *
 * Each converter exports a pair:
 * - parse{Name}(handler?) → FormValues  (Caddy JSON → form)
 * - to{Name}(values, original?) → Handler (form → Caddy JSON, preserving unmanaged fields)
 */

export { issuerDefaults } from "@/lib/schemas/tls-policy";
export {
  generateId as generateAuthId,
  isBcryptHash,
  parseBasicAuth,
  toBasicAuth,
} from "./basic-auth";
export { parseCors, toCors } from "./cors";
export { parseEncode, toEncode } from "./encode";
export {
  buildHeaderOps,
  generateId as generateHeaderId,
  parseHeaderOps,
  parseHeaders,
  toHeaders,
} from "./headers";
export { parseReverseProxy, toReverseProxy } from "./reverse-proxy";
export { generateId as generateRewriteId, parseRewrite, toRewrite } from "./rewrite";
export {
  formStateToIssuer,
  issuerToFormState,
  parsePolicy,
  toPolicy,
} from "./tls-policy";
