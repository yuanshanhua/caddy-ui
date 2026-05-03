/**
 * Zod schema for the Headers middleware form.
 */

import { z } from "zod";

export const headerEntrySchema = z.object({
  id: z.string(),
  operation: z.enum(["add", "set", "delete"]),
  name: z.string(),
  value: z.string(),
});

export const headersFormSchema = z.object({
  requestHeaders: z.array(headerEntrySchema),
  responseHeaders: z.array(headerEntrySchema),
  responseDeferred: z.boolean(),
});

export type HeadersFormValues = z.infer<typeof headersFormSchema>;
export type HeaderEntry = z.infer<typeof headerEntrySchema>;

export const headersFormDefaults: HeadersFormValues = {
  requestHeaders: [],
  responseHeaders: [],
  responseDeferred: false,
};
