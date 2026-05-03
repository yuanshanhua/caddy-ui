/**
 * Zod schema for the Log configuration form.
 */

import { z } from "zod";

export const logFormSchema = z.object({
  name: z.string().min(1, "This field is required"),
  level: z.enum(["DEBUG", "INFO", "WARN", "ERROR"]),
  outputType: z.enum(["stdout", "stderr", "file", "discard"]),
  filename: z.string(),
  rollSizeMb: z.string(),
  rollKeep: z.string(),
  rollKeepDays: z.string(),
  encoderFormat: z.enum(["console", "json"]),
  includes: z.string(),
  excludes: z.string(),
});

export type LogFormValues = z.infer<typeof logFormSchema>;

export const logFormDefaults: LogFormValues = {
  name: "",
  level: "INFO",
  outputType: "stdout",
  filename: "",
  rollSizeMb: "100",
  rollKeep: "5",
  rollKeepDays: "90",
  encoderFormat: "console",
  includes: "",
  excludes: "",
};
