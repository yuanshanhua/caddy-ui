/**
 * Zod schemas for middleware forms: CORS, Encode, Rewrite, Basic Auth, Advanced Matchers.
 */

import { z } from "zod";

// --- CORS Form ---

export const corsFormSchema = z.object({
  origins: z.string(),
  methods: z.string(),
  headers: z.string(),
  exposeHeaders: z.string(),
  maxAge: z.string(),
  credentials: z.boolean(),
});

export type CorsFormValues = z.infer<typeof corsFormSchema>;

export const corsFormDefaults: CorsFormValues = {
  origins: "*",
  methods: "GET, POST, PUT, DELETE, OPTIONS",
  headers: "Content-Type, Authorization",
  exposeHeaders: "",
  maxAge: "86400",
  credentials: false,
};

// --- Encode Form ---

export const encodeFormSchema = z.object({
  gzipEnabled: z.boolean(),
  zstdEnabled: z.boolean(),
  minLength: z.string(),
  prefer: z.array(z.string()),
});

export type EncodeFormValues = z.infer<typeof encodeFormSchema>;

export const encodeFormDefaults: EncodeFormValues = {
  gzipEnabled: true,
  zstdEnabled: true,
  minLength: "256",
  prefer: ["zstd", "gzip"],
};

// --- Rewrite Form ---

export const substringEntrySchema = z.object({
  id: z.string(),
  find: z.string(),
  replace: z.string(),
});

export const rewriteFormSchema = z.object({
  mode: z.enum(["uri", "strip_prefix", "strip_suffix", "substring", "path_regexp"]),
  uri: z.string(),
  stripPrefix: z.string(),
  stripSuffix: z.string(),
  substrings: z.array(substringEntrySchema),
  regexpFind: z.string(),
  regexpReplace: z.string(),
  method: z.string(),
});

export type RewriteFormValues = z.infer<typeof rewriteFormSchema>;

export const rewriteFormDefaults: RewriteFormValues = {
  mode: "uri",
  uri: "",
  stripPrefix: "",
  stripSuffix: "",
  substrings: [],
  regexpFind: "",
  regexpReplace: "",
  method: "",
};

// --- Basic Auth Form ---

export const accountEntrySchema = z.object({
  id: z.string(),
  username: z.string(),
  password: z.string(),
  isHashed: z.boolean(),
});

export const basicAuthFormSchema = z.object({
  accounts: z.array(accountEntrySchema).min(1),
  realm: z.string(),
});

export type BasicAuthFormValues = z.infer<typeof basicAuthFormSchema>;
export type AccountEntry = z.infer<typeof accountEntrySchema>;

export const basicAuthFormDefaults: BasicAuthFormValues = {
  accounts: [{ id: "initial", username: "", password: "", isHashed: false }],
  realm: "",
};

// --- Advanced Matchers Form ---

export const matchEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.string(),
});

export const advancedMatchersFormSchema = z.object({
  headerMatches: z.array(matchEntrySchema),
  queryMatches: z.array(matchEntrySchema),
  remoteIpRanges: z.string(),
  remoteIpForwarded: z.boolean(),
  protocol: z.string(),
});

export type AdvancedMatchersFormValues = z.infer<typeof advancedMatchersFormSchema>;

export const advancedMatchersFormDefaults: AdvancedMatchersFormValues = {
  headerMatches: [],
  queryMatches: [],
  remoteIpRanges: "",
  remoteIpForwarded: false,
  protocol: "",
};
