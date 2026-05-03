/**
 * Zod schema for the Server form.
 */

import { z } from "zod";

export const serverFormSchema = z.object({
  serverId: z.string().min(1, "Server ID is required").regex(/^[\w-]+$/, "Only letters, numbers, hyphens, and underscores"),
  listenAddresses: z.array(z.string().min(1, "Address cannot be empty")).min(1, "At least one listen address is required"),
  disableHttps: z.boolean(),
  protocols: z.array(z.string()),
});

export type ServerFormValues = z.infer<typeof serverFormSchema>;

export const serverFormDefaults: ServerFormValues = {
  serverId: "",
  listenAddresses: [":443"],
  disableHttps: false,
  protocols: [],
};
