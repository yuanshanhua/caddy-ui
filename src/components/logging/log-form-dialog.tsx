/**
 * Dialog for creating/editing a named log configuration.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { type LogFormValues, logFormDefaults, logFormSchema } from "@/lib/schemas/log";
import type { LogConfig, LogWriter } from "@/types/caddy";

interface LogFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, log: LogConfig) => void;
  loading?: boolean;
  initialName?: string;
  initialLog?: LogConfig;
}

function parseInitialValues(name: string, log: LogConfig): LogFormValues {
  const writer = log.writer;
  let outputType: LogFormValues["outputType"] = "stdout";
  let filename = "";
  let rollSizeMb = "100";
  let rollKeep = "5";
  let rollKeepDays = "90";

  if (writer) {
    if (writer.output === "file") {
      outputType = "file";
      filename = writer.filename ?? "";
      rollSizeMb = writer.roll_size_mb ? String(writer.roll_size_mb) : "100";
      rollKeep = writer.roll_keep ? String(writer.roll_keep) : "5";
      rollKeepDays = writer.roll_keep_days ? String(writer.roll_keep_days) : "90";
    } else if (writer.output === "discard") {
      outputType = "discard";
    } else if (writer.output === "stderr") {
      outputType = "stderr";
    }
  }

  return {
    name,
    level: (log.level as LogFormValues["level"]) ?? "INFO",
    outputType,
    filename,
    rollSizeMb,
    rollKeep,
    rollKeepDays,
    encoderFormat: (log.encoder?.format as LogFormValues["encoderFormat"]) ?? "console",
    includes: log.include?.join(", ") ?? "",
    excludes: log.exclude?.join(", ") ?? "",
  };
}

function toLogConfig(values: LogFormValues, initialLog?: LogConfig): LogConfig {
  // Start from existing config to preserve unknown fields
  const log: LogConfig = initialLog ? { ...initialLog } : {};

  log.level = values.level;
  log.encoder = { ...initialLog?.encoder, format: values.encoderFormat };

  const writer: LogWriter = initialLog?.writer
    ? { ...initialLog.writer, output: values.outputType }
    : { output: values.outputType };
  if (values.outputType === "file" && values.filename.trim()) {
    writer.filename = values.filename.trim();
    const sizeMb = Number.parseInt(values.rollSizeMb, 10);
    if (!Number.isNaN(sizeMb) && sizeMb > 0) writer.roll_size_mb = sizeMb;
    const keep = Number.parseInt(values.rollKeep, 10);
    if (!Number.isNaN(keep) && keep > 0) writer.roll_keep = keep;
    const keepDays = Number.parseInt(values.rollKeepDays, 10);
    if (!Number.isNaN(keepDays) && keepDays > 0) writer.roll_keep_days = keepDays;
  }
  log.writer = writer;

  if (values.includes.trim()) {
    log.include = values.includes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  } else {
    delete log.include;
  }
  if (values.excludes.trim()) {
    log.exclude = values.excludes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  } else {
    delete log.exclude;
  }

  return log;
}

export function LogFormDialog({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
  initialName,
  initialLog,
}: LogFormDialogProps) {
  const { t } = useTranslation("middleware");
  const { t: tc } = useTranslation();
  const isEdit = !!initialName;

  const form = useForm<LogFormValues>({
    resolver: zodResolver(logFormSchema),
    defaultValues:
      isEdit && initialLog ? parseInitialValues(initialName, initialLog) : logFormDefaults,
    values: open
      ? isEdit && initialLog
        ? parseInitialValues(initialName, initialLog)
        : logFormDefaults
      : undefined,
  });

  const outputType = form.watch("outputType");

  function handleFormSubmit(values: LogFormValues) {
    onSubmit(values.name.trim(), toLogConfig(values, initialLog));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)}>
            <DialogHeader>
              <DialogTitle>
                {isEdit ? t("logForm.editTitle") : t("logForm.createTitle")}
              </DialogTitle>
              <DialogDescription>{t("logForm.description")}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <Label htmlFor="log-name">{t("logForm.logName")}</Label>
                    <FormControl>
                      <Input
                        id="log-name"
                        placeholder={t("logForm.logNamePlaceholder")}
                        disabled={isEdit}
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">{t("logForm.logNameHint")}</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Level */}
              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <Label htmlFor="log-level">{t("logForm.level")}</Label>
                    <FormControl>
                      <Select
                        id="log-level"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                      >
                        <option value="DEBUG">DEBUG</option>
                        <option value="INFO">INFO</option>
                        <option value="WARN">WARN</option>
                        <option value="ERROR">ERROR</option>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Output */}
              <FormField
                control={form.control}
                name="outputType"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <Label htmlFor="log-output">{t("logForm.output")}</Label>
                    <FormControl>
                      <Select
                        id="log-output"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                      >
                        <option value="stdout">{t("logForm.outputStdout")}</option>
                        <option value="stderr">{t("logForm.outputStderr")}</option>
                        <option value="file">{t("logForm.outputFile")}</option>
                        <option value="discard">{t("logForm.outputDiscard")}</option>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* File-specific options */}
              {outputType === "file" && (
                <div className="space-y-3 pl-3 border-l-2 border-muted">
                  <FormField
                    control={form.control}
                    name="filename"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <Label htmlFor="log-filename">{t("logForm.filePath")}</Label>
                        <FormControl>
                          <Input
                            id="log-filename"
                            placeholder={t("logForm.filePathPlaceholder")}
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="rollSizeMb"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <Label className="text-xs">{t("logForm.maxSize")}</Label>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="rollKeep"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <Label className="text-xs">{t("logForm.keepFiles")}</Label>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="rollKeepDays"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <Label className="text-xs">{t("logForm.keepDays")}</Label>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Format */}
              <FormField
                control={form.control}
                name="encoderFormat"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <Label htmlFor="log-format">{t("logForm.encoderFormat")}</Label>
                    <FormControl>
                      <Select
                        id="log-format"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                      >
                        <option value="console">{t("logForm.formatConsole")}</option>
                        <option value="json">{t("logForm.formatJson")}</option>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Include/Exclude */}
              <FormField
                control={form.control}
                name="includes"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <Label htmlFor="log-include">{t("logForm.includeLoggers")}</Label>
                    <FormControl>
                      <Input
                        id="log-include"
                        placeholder={t("logForm.includePlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">{t("logForm.includeHint")}</p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="excludes"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <Label htmlFor="log-exclude">{t("logForm.excludeLoggers")}</Label>
                    <FormControl>
                      <Input
                        id="log-exclude"
                        placeholder={t("logForm.excludePlaceholder")}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {tc("actions.cancel")}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? tc("status.saving") : isEdit ? t("logForm.update") : t("logForm.addLog")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
