/**
 * Dialog for creating/editing a named log configuration.
 */

import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { LogConfig, LogWriter } from "@/types/caddy";

interface LogFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, log: LogConfig) => void;
  loading?: boolean;
  initialName?: string;
  initialLog?: LogConfig;
}

type OutputType = "stdout" | "stderr" | "file" | "discard";
type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";
type EncoderFormat = "console" | "json";

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

  const [name, setName] = useState("");
  const [level, setLevel] = useState<LogLevel>("INFO");
  const [outputType, setOutputType] = useState<OutputType>("stdout");
  const [filename, setFilename] = useState("");
  const [rollSizeMb, setRollSizeMb] = useState("100");
  const [rollKeep, setRollKeep] = useState("5");
  const [rollKeepDays, setRollKeepDays] = useState("90");
  const [encoderFormat, setEncoderFormat] = useState<EncoderFormat>("console");
  const [includes, setIncludes] = useState("");
  const [excludes, setExcludes] = useState("");

  useEffect(() => {
    if (!open) return;

    if (initialName && initialLog) {
      setName(initialName);
      setLevel((initialLog.level as LogLevel) ?? "INFO");

      const writer = initialLog.writer;
      if (writer) {
        if (writer.output === "file") {
          setOutputType("file");
          setFilename(writer.filename ?? "");
          setRollSizeMb(writer.roll_size_mb ? String(writer.roll_size_mb) : "100");
          setRollKeep(writer.roll_keep ? String(writer.roll_keep) : "5");
          setRollKeepDays(writer.roll_keep_days ? String(writer.roll_keep_days) : "90");
        } else if (writer.output === "discard") {
          setOutputType("discard");
        } else if (writer.output === "stderr") {
          setOutputType("stderr");
        } else {
          setOutputType("stdout");
        }
      }

      setEncoderFormat((initialLog.encoder?.format as EncoderFormat) ?? "console");
      setIncludes(initialLog.include?.join(", ") ?? "");
      setExcludes(initialLog.exclude?.join(", ") ?? "");
    } else {
      setName("");
      setLevel("INFO");
      setOutputType("stdout");
      setFilename("");
      setRollSizeMb("100");
      setRollKeep("5");
      setRollKeepDays("90");
      setEncoderFormat("console");
      setIncludes("");
      setExcludes("");
    }
  }, [open, initialName, initialLog]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const writer: LogWriter = { output: outputType };
    if (outputType === "file" && filename.trim()) {
      writer.filename = filename.trim();
      const sizeMb = Number.parseInt(rollSizeMb, 10);
      if (!Number.isNaN(sizeMb) && sizeMb > 0) writer.roll_size_mb = sizeMb;
      const keep = Number.parseInt(rollKeep, 10);
      if (!Number.isNaN(keep) && keep > 0) writer.roll_keep = keep;
      const keepDays = Number.parseInt(rollKeepDays, 10);
      if (!Number.isNaN(keepDays) && keepDays > 0) writer.roll_keep_days = keepDays;
    }

    const log: LogConfig = {
      writer,
      level,
      encoder: { format: encoderFormat },
    };

    if (includes.trim()) {
      log.include = includes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (excludes.trim()) {
      log.exclude = excludes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    onSubmit(name.trim(), log);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? t("logForm.editTitle") : t("logForm.createTitle")}</DialogTitle>
            <DialogDescription>{t("logForm.description")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="log-name">{t("logForm.logName")}</Label>
              <Input
                id="log-name"
                placeholder={t("logForm.logNamePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isEdit}
              />
              <p className="text-xs text-muted-foreground">{t("logForm.logNameHint")}</p>
            </div>

            {/* Level */}
            <div className="space-y-2">
              <Label htmlFor="log-level">{t("logForm.level")}</Label>
              <Select
                id="log-level"
                value={level}
                onChange={(e) => setLevel(e.target.value as LogLevel)}
              >
                <option value="DEBUG">DEBUG</option>
                <option value="INFO">INFO</option>
                <option value="WARN">WARN</option>
                <option value="ERROR">ERROR</option>
              </Select>
            </div>

            {/* Output */}
            <div className="space-y-2">
              <Label htmlFor="log-output">{t("logForm.output")}</Label>
              <Select
                id="log-output"
                value={outputType}
                onChange={(e) => setOutputType(e.target.value as OutputType)}
              >
                <option value="stdout">{t("logForm.outputStdout")}</option>
                <option value="stderr">{t("logForm.outputStderr")}</option>
                <option value="file">{t("logForm.outputFile")}</option>
                <option value="discard">{t("logForm.outputDiscard")}</option>
              </Select>
            </div>

            {/* File-specific options */}
            {outputType === "file" && (
              <div className="space-y-3 pl-3 border-l-2 border-muted">
                <div className="space-y-2">
                  <Label htmlFor="log-filename">{t("logForm.filePath")}</Label>
                  <Input
                    id="log-filename"
                    placeholder={t("logForm.filePathPlaceholder")}
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{t("logForm.maxSize")}</Label>
                    <Input
                      type="number"
                      value={rollSizeMb}
                      onChange={(e) => setRollSizeMb(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("logForm.keepFiles")}</Label>
                    <Input
                      type="number"
                      value={rollKeep}
                      onChange={(e) => setRollKeep(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("logForm.keepDays")}</Label>
                    <Input
                      type="number"
                      value={rollKeepDays}
                      onChange={(e) => setRollKeepDays(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Format */}
            <div className="space-y-2">
              <Label htmlFor="log-format">{t("logForm.encoderFormat")}</Label>
              <Select
                id="log-format"
                value={encoderFormat}
                onChange={(e) => setEncoderFormat(e.target.value as EncoderFormat)}
              >
                <option value="console">{t("logForm.formatConsole")}</option>
                <option value="json">{t("logForm.formatJson")}</option>
              </Select>
            </div>

            {/* Include/Exclude */}
            <div className="space-y-2">
              <Label htmlFor="log-include">{t("logForm.includeLoggers")}</Label>
              <Input
                id="log-include"
                placeholder={t("logForm.includePlaceholder")}
                value={includes}
                onChange={(e) => setIncludes(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t("logForm.includeHint")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="log-exclude">{t("logForm.excludeLoggers")}</Label>
              <Input
                id="log-exclude"
                placeholder={t("logForm.excludePlaceholder")}
                value={excludes}
                onChange={(e) => setExcludes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? tc("status.saving") : isEdit ? t("logForm.update") : t("logForm.addLog")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
