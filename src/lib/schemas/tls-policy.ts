/**
 * Zod schemas for TLS automation policy form.
 */

import { z } from "zod";

export const issuerFormSchema = z.object({
  module: z.enum(["acme", "zerossl", "internal"]),
  email: z.string(),
  ca: z.string(),
  httpChallengeDisabled: z.boolean(),
  tlsAlpnChallengeDisabled: z.boolean(),
});

export const tlsPolicyFormSchema = z.object({
  subjects: z.string(),
  issuers: z.array(issuerFormSchema).min(1),
  keyType: z.string(),
  onDemand: z.boolean(),
  mustStaple: z.boolean(),
});

export type TlsPolicyFormValues = z.infer<typeof tlsPolicyFormSchema>;
export type IssuerFormValues = z.infer<typeof issuerFormSchema>;

export const issuerDefaults: IssuerFormValues = {
  module: "acme",
  email: "",
  ca: "",
  httpChallengeDisabled: false,
  tlsAlpnChallengeDisabled: false,
};

export const tlsPolicyFormDefaults: TlsPolicyFormValues = {
  subjects: "",
  issuers: [issuerDefaults],
  keyType: "",
  onDemand: false,
  mustStaple: false,
};
