/**
 * Configuration page — JSON editor + Caddyfile import.
 *
 * Provides:
 * - Full JSON config editing with Monaco editor
 * - Export/import JSON backups
 * - Caddyfile import (paste/upload → adapt → diff view → apply)
 */

import Editor, { DiffEditor, useMonaco } from "@monaco-editor/react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Play,
  RotateCcw,
  Save,
  Upload,
  X,
} from "lucide-react";
import type { editor } from "monaco-editor";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Caddyfile import state
  const [showCaddyfileImport, setShowCaddyfileImport] = useState(false);
  const [caddyfile, setCaddyfile] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Diff view state: when a Caddyfile is converted, show diff instead of normal editor
  const [diffTarget, setDiffTarget] = useState<string | null>(null);
  const diffEditorRef = useRef<editor.IStandaloneDiffEditor | null>(null);

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

  // Caddyfile derived state
  const hasCaddyfileContent = caddyfile.trim().length > 0;
  const warnings = adaptMutation.data?.warnings?.map((w) => w.message) ?? [];

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

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content !== "string") return;

      // Detect file type: JSON or Caddyfile
      try {
        JSON.parse(content);
        // Valid JSON — load into editor
        setEditedJson(content);
        setParseError(null);
        toast.success(t("rawConfig.importSuccess"));
      } catch {
        // Not JSON — treat as Caddyfile
        setCaddyfile(content);
        setShowCaddyfileImport(true);
        adaptMutation.reset();
        toast.success(ti("uploadSuccess", { defaultValue: "Caddyfile loaded" }));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // === Caddyfile Import Handlers ===

  function handleConvert() {
    if (!hasCaddyfileContent) return;
    adaptMutation.mutate(caddyfile, {
      onSuccess: (data) => {
        toast.success(ti("convertSuccess"));
        // Enter diff view
        const converted = JSON.stringify(data.result, null, 2);
        setDiffTarget(converted);
      },
      onError: (err) => {
        toast.error(ti("convertError"), { description: err.message });
      },
    });
  }

  function handleApplyDiff() {
    if (!diffTarget) return;
    setConfirmOpen(true);
  }

  function handleConfirmApply() {
    if (!diffTarget) return;
    try {
      const parsed = JSON.parse(diffTarget) as Record<string, unknown>;
      loadMutation.mutate(parsed, {
        onSuccess: () => {
          toast.success(ti("applySuccess"));
          setConfirmOpen(false);
          setDiffTarget(null);
          setCaddyfile("");
          adaptMutation.reset();
          setEditedJson(null);
        },
        onError: (err) => {
          toast.error(ti("applyError"), { description: err.message });
          setConfirmOpen(false);
        },
      });
    } catch {
      toast.error(t("rawConfig.importError"));
      setConfirmOpen(false);
    }
  }

  function handleCancelDiff() {
    // Keep edits from the original side of the diff editor
    if (diffEditorRef.current) {
      const editedValue = diffEditorRef.current.getOriginalEditor().getValue();
      if (editedValue !== currentJson) {
        setEditedJson(editedValue);
        // Validate
        try {
          JSON.parse(editedValue);
          setParseError(null);
        } catch (e) {
          setParseError(e instanceof Error ? e.message : "Invalid JSON");
        }
      }
    }
    setDiffTarget(null);
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("rawConfig.title")}</h1>
        <p className="text-muted-foreground">{t("rawConfig.subtitle")}</p>
      </div>

      {/* Warnings */}
      {parseError && !diffTarget && (
        <Card className="border-destructive">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-destructive font-mono">{parseError}</p>
          </CardContent>
        </Card>
      )}

      {adminChanged && !diffTarget && (
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

      {/* Caddyfile Import Section (collapsible, above JSON editor) */}
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

            {/* Caddyfile Editor toolbar */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{ti("caddyfile.adaptHint")}</p>
              <div className="flex items-center gap-2">
                {hasCaddyfileContent && (
                  <Button variant="outline" size="sm" onClick={handleCaddyfileReset}>
                    <RotateCcw className="h-3 w-3" />
                    {tc("actions.reset")}
                  </Button>
                )}
              </div>
            </div>

            {/* Caddyfile Monaco Editor */}
            <div className="rounded-md border overflow-hidden">
              <Editor
                height="300px"
                language={caddyfileLanguageId}
                value={caddyfile}
                onChange={(value) => {
                  setCaddyfile(value ?? "");
                  if (adaptMutation.data) adaptMutation.reset();
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

            {/* Convert button */}
            <div className="flex justify-end">
              <Button
                onClick={handleConvert}
                disabled={!hasCaddyfileContent || adaptMutation.isPending}
              >
                <Play className="h-4 w-4" />
                {adaptMutation.isPending ? ti("converting") : ti("convertPreview")}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* JSON Editor or Diff View */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">
                {diffTarget ? t("rawConfig.diffTitle") : t("rawConfig.jsonTitle")}
              </CardTitle>
              <CardDescription>
                {diffTarget ? t("rawConfig.diffDescription") : t("rawConfig.jsonDescription")}
              </CardDescription>
            </div>
            {diffTarget ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCancelDiff}>
                  <X className="h-4 w-4" />
                  {tc("actions.cancel")}
                </Button>
                <Button
                  size="sm"
                  onClick={handleApplyDiff}
                  disabled={loadMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Save className="h-4 w-4" />
                  {loadMutation.isPending ? tc("status.applying") : tc("actions.apply")}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {hasChanges && <Badge variant="warning">{t("rawConfig.unsavedChanges")}</Badge>}
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4" />
                  {t("rawConfig.export")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {t("rawConfig.import")}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.caddyfile,.Caddyfile,Caddyfile"
                  className="hidden"
                  onChange={handleImportFile}
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
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            {diffTarget ? (
              <DiffEditor
                height="600px"
                language="json"
                original={displayJson}
                modified={diffTarget}
                theme={monacoTheme}
                onMount={(editor) => {
                  diffEditorRef.current = editor;
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  fontFamily: "JetBrains Mono, monospace",
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  wordWrap: "on",
                  originalEditable: true,
                  renderSideBySide: true,
                  readOnly: true,
                }}
              />
            ) : (
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
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirm apply Caddyfile config */}
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
