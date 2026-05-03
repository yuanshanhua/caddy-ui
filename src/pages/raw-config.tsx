/**
 * Configuration page — JSON editor + Caddyfile import.
 *
 * Provides:
 * - Full JSON config editing with Monaco editor
 * - Export/import JSON backups
 * - Caddyfile import (paste/upload → adapt → preview → apply)
 */

import Editor, { useMonaco } from "@monaco-editor/react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileUp,
  Play,
  RotateCcw,
  Save,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdaptCaddyfile, useConfig, useConfigLoad } from "@/hooks/use-config";
import {
  caddyfileLanguageConfig,
  caddyfileLanguageId,
  caddyfileMonarchLanguage,
} from "@/lib/monaco-caddyfile";
import { useUiStore } from "@/stores/ui";

/**
 * Detect if the admin section was changed between original and edited config.
 */
function hasAdminChanges(original: string, edited: string): boolean {
  try {
    const orig = JSON.parse(original) as Record<string, unknown>;
    const edit = JSON.parse(edited) as Record<string, unknown>;
    return JSON.stringify(orig["admin"]) !== JSON.stringify(edit["admin"]);
  } catch {
    return false;
  }
}

export function RawConfigPage() {
  const { t } = useTranslation("config");
  const { t: ti } = useTranslation("import");
  const { t: tc } = useTranslation();
  const { data: config, isLoading, isError, error } = useConfig();
  const loadMutation = useConfigLoad();
  const adaptMutation = useAdaptCaddyfile();
  const theme = useUiStore((s) => s.theme);
  const monaco = useMonaco();

  // JSON editor state
  const [editedJson, setEditedJson] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  // Caddyfile import state
  const [showCaddyfileImport, setShowCaddyfileImport] = useState(false);
  const [caddyfile, setCaddyfile] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const caddyfileInputRef = useRef<HTMLInputElement>(null);

  // Register Caddyfile language with Monaco
  useEffect(() => {
    if (!monaco) return;
    if (!monaco.languages.getLanguages().some((lang) => lang.id === caddyfileLanguageId)) {
      monaco.languages.register({ id: caddyfileLanguageId });
      monaco.languages.setMonarchTokensProvider(caddyfileLanguageId, caddyfileMonarchLanguage);
      monaco.languages.setLanguageConfiguration(caddyfileLanguageId, caddyfileLanguageConfig);
    }
  }, [monaco]);

  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const monacoTheme = isDark ? "vs-dark" : "light";

  const currentJson = config ? JSON.stringify(config, null, 2) : "";
  const displayJson = editedJson ?? currentJson;
  const hasChanges = editedJson !== null && editedJson !== currentJson;

  const adminChanged = useMemo(
    () => hasChanges && !parseError && hasAdminChanges(currentJson, editedJson ?? ""),
    [hasChanges, parseError, currentJson, editedJson],
  );

  // Caddyfile state
  const hasCaddyfileContent = caddyfile.trim().length > 0;
  const adaptedConfig = adaptMutation.data?.result ?? null;
  const warnings = adaptMutation.data?.warnings?.map((w) => w.message) ?? [];
  const hasPreview = adaptedConfig !== null;
  const jsonPreview = useMemo(
    () => (adaptedConfig ? JSON.stringify(adaptedConfig, null, 2) : ""),
    [adaptedConfig],
  );

  // === JSON Editor Handlers ===

  function handleJsonChange(value: string | undefined) {
    const v = value ?? "";
    setEditedJson(v);
    try {
      JSON.parse(v);
      setParseError(null);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Invalid JSON");
    }
  }

  function handleSave() {
    if (!editedJson || parseError) return;
    try {
      const parsed = JSON.parse(editedJson) as Record<string, unknown>;
      loadMutation.mutate(parsed, {
        onSuccess: () => {
          setEditedJson(null);
        },
      });
    } catch {
      // parseError should already be set
    }
  }

  function handleReset() {
    setEditedJson(null);
    setParseError(null);
  }

  function handleCopy() {
    void navigator.clipboard.writeText(displayJson);
  }

  function handleExport() {
    const blob = new Blob([displayJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `caddy-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportJsonFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content !== "string") return;
      try {
        JSON.parse(content);
        setEditedJson(content);
        setParseError(null);
        toast.success(t("rawConfig.importSuccess"));
      } catch {
        toast.error(t("rawConfig.importError"));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // === Caddyfile Import Handlers ===

  function handleCaddyfileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        setCaddyfile(content);
        adaptMutation.reset();
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleConvert() {
    if (!hasCaddyfileContent) return;
    adaptMutation.mutate(caddyfile, {
      onSuccess: () => {
        toast.success(ti("convertSuccess"));
      },
      onError: (err) => {
        toast.error(ti("convertError"), { description: err.message });
      },
    });
  }

  function handleConfirmApply() {
    if (!adaptedConfig) return;
    loadMutation.mutate(adaptedConfig, {
      onSuccess: () => {
        toast.success(ti("applySuccess"));
        setConfirmOpen(false);
        setCaddyfile("");
        adaptMutation.reset();
      },
      onError: (err) => {
        toast.error(ti("applyError"), { description: err.message });
        setConfirmOpen(false);
      },
    });
  }

  function handleCaddyfileReset() {
    setCaddyfile("");
    adaptMutation.reset();
  }

  // === Render ===

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("rawConfig.title")}</h1>
        <p className="text-muted-foreground">{tc("status.loading")}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("rawConfig.title")}</h1>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              {t("rawConfig.loadError", { message: error?.message })}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("rawConfig.title")}</h1>
          <p className="text-muted-foreground">{t("rawConfig.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && <Badge variant="warning">{t("rawConfig.unsavedChanges")}</Badge>}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4" />
            {t("rawConfig.export")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => jsonFileInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            {t("rawConfig.import")}
          </Button>
          <input
            ref={jsonFileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportJsonFile}
          />
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
            {tc("actions.copy")}
          </Button>
          {hasChanges && (
            <>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
                {tc("actions.reset")}
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!!parseError || loadMutation.isPending}
              >
                <Save className="h-4 w-4" />
                {loadMutation.isPending ? tc("status.saving") : tc("actions.apply")}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Warnings */}
      {parseError && (
        <Card className="border-destructive">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-destructive font-mono">{parseError}</p>
          </CardContent>
        </Card>
      )}

      {adminChanged && (
        <Card className="border-amber-500/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  {t("rawConfig.adminWarning.title")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("rawConfig.adminWarning.description")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loadMutation.isError && (
        <Card className="border-destructive">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-destructive">
              {t("rawConfig.applyError", { message: loadMutation.error?.message })}
            </p>
          </CardContent>
        </Card>
      )}

      {/* JSON Editor */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{t("rawConfig.jsonTitle")}</CardTitle>
          <CardDescription>{t("rawConfig.jsonDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Editor
              height="600px"
              defaultLanguage="json"
              value={displayJson}
              onChange={handleJsonChange}
              theme={monacoTheme}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "JetBrains Mono, monospace",
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: "on",
                formatOnPaste: true,
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Caddyfile Import Section (collapsible) */}
      <Card>
        <CardHeader className="pb-3">
          <button
            type="button"
            className="flex items-center justify-between w-full"
            onClick={() => setShowCaddyfileImport(!showCaddyfileImport)}
          >
            <div className="text-left">
              <CardTitle className="text-sm font-medium">{ti("caddyfile.title")}</CardTitle>
              <CardDescription>{ti("caddyfile.description")}</CardDescription>
            </div>
            {showCaddyfileImport ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
          </button>
        </CardHeader>

        {showCaddyfileImport && (
          <CardContent className="space-y-4">
            {/* Warning */}
            <div className="flex items-start gap-3 rounded-md border border-amber-500/50 bg-amber-500/5 p-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-500">{ti("warning.title")}</p>
                <p className="text-muted-foreground mt-1">
                  <Trans
                    i18nKey="warning.description"
                    ns="import"
                    components={{ strong: <strong /> }}
                  />
                </p>
              </div>
            </div>

            {/* Caddyfile Editor */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{ti("caddyfile.adaptHint")}</p>
              <div className="flex items-center gap-2">
                {hasCaddyfileContent && (
                  <Button variant="outline" size="sm" onClick={handleCaddyfileReset}>
                    <RotateCcw className="h-3 w-3" />
                    {tc("actions.reset")}
                  </Button>
                )}
                <input
                  ref={caddyfileInputRef}
                  type="file"
                  accept=".caddyfile,.Caddyfile,Caddyfile"
                  className="hidden"
                  onChange={handleCaddyfileUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => caddyfileInputRef.current?.click()}
                >
                  <Upload className="h-3 w-3" />
                  {ti("uploadFile")}
                </Button>
              </div>
            </div>

            <div className="rounded-md border overflow-hidden">
              <Editor
                height="300px"
                language={caddyfileLanguageId}
                value={caddyfile}
                onChange={(value) => {
                  setCaddyfile(value ?? "");
                  if (adaptedConfig) adaptMutation.reset();
                }}
                theme={monacoTheme}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  fontFamily: "JetBrains Mono, monospace",
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                  wordWrap: "on",
                }}
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleConvert}
                disabled={!hasCaddyfileContent || adaptMutation.isPending}
              >
                <Play className="h-4 w-4" />
                {adaptMutation.isPending ? ti("converting") : ti("convertPreview")}
              </Button>
            </div>

            {/* Warnings from adapt */}
            {warnings.length > 0 && (
              <div className="rounded-md border border-amber-500/50 p-3 space-y-1">
                <p className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  {ti("warnings.title", { count: warnings.length })}
                </p>
                <ul className="space-y-1 pl-6">
                  {warnings.map((warning) => (
                    <li key={warning} className="text-sm text-amber-600">
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* JSON Preview from Caddyfile */}
            {hasPreview && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{ti("jsonPreview.title")}</p>
                    <p className="text-xs text-muted-foreground">{ti("jsonPreview.description")}</p>
                  </div>
                  <Badge variant="success">{ti("jsonPreview.readyBadge")}</Badge>
                </div>
                <div className="rounded-md border overflow-hidden">
                  <Editor
                    height="300px"
                    language="json"
                    value={jsonPreview}
                    theme={monacoTheme}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 13,
                      fontFamily: "JetBrains Mono, monospace",
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      wordWrap: "on",
                    }}
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={() => setConfirmOpen(true)}
                    disabled={loadMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <FileUp className="h-4 w-4" />
                    {loadMutation.isPending ? tc("status.applying") : ti("applyConfig")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Confirm apply Caddyfile */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={ti("confirmDialog.title")}
        description={ti("confirmDialog.description")}
        confirmLabel={ti("confirmDialog.confirm")}
        onConfirm={handleConfirmApply}
        loading={loadMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
