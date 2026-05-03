/**
 * Caddyfile Import page.
 *
 * Allows users to paste (or upload) a Caddyfile, convert it to JSON via
 * Caddy's /adapt endpoint, preview the result, and apply it as the running config.
 */

import Editor, { useMonaco } from "@monaco-editor/react";
import { AlertTriangle, FileUp, Play, RotateCcw, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdaptCaddyfile, useConfigLoad } from "@/hooks/use-config";
import {
  caddyfileLanguageConfig,
  caddyfileLanguageId,
  caddyfileMonarchLanguage,
} from "@/lib/monaco-caddyfile";
import { useUiStore } from "@/stores/ui";

export function ImportPage() {
  const { t } = useTranslation("import");
  const { t: tc } = useTranslation();
  const [caddyfile, setCaddyfile] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const theme = useUiStore((s) => s.theme);
  const monaco = useMonaco();

  const adaptMutation = useAdaptCaddyfile();
  const loadMutation = useConfigLoad();

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

  const hasContent = caddyfile.trim().length > 0;
  const adaptedConfig = adaptMutation.data?.result ?? null;
  const warnings = adaptMutation.data?.warnings?.map((w) => w.message) ?? [];
  const hasPreview = adaptedConfig !== null;

  const jsonPreview = useMemo(
    () => (adaptedConfig ? JSON.stringify(adaptedConfig, null, 2) : ""),
    [adaptedConfig],
  );

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
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
    if (!hasContent) return;

    adaptMutation.mutate(caddyfile, {
      onSuccess: () => {
        toast.success(t("convertSuccess"));
      },
      onError: (error) => {
        toast.error(t("convertError"), {
          description: error.message,
        });
      },
    });
  }

  function handleConfirmApply() {
    if (!adaptedConfig) return;

    loadMutation.mutate(adaptedConfig, {
      onSuccess: () => {
        toast.success(t("applySuccess"));
        setConfirmOpen(false);
        setCaddyfile("");
        adaptMutation.reset();
        void navigate("/sites");
      },
      onError: (error) => {
        toast.error(t("applyError"), {
          description: error.message,
        });
        setConfirmOpen(false);
      },
    });
  }

  function handleReset() {
    setCaddyfile("");
    adaptMutation.reset();
    loadMutation.reset();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasContent && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
              {tc("actions.reset")}
            </Button>
          )}
        </div>
      </div>

      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardContent className="flex items-start gap-3 pt-4 pb-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-500">{t("warning.title")}</p>
            <p className="text-muted-foreground mt-1">
              <Trans
                i18nKey="warning.description"
                ns="import"
                components={{ strong: <strong /> }}
              />
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">{t("caddyfile.title")}</CardTitle>
              <CardDescription>{t("caddyfile.description")}</CardDescription>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".caddyfile,.Caddyfile,Caddyfile"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" />
                {t("uploadFile")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-muted-foreground">{t("caddyfile.adaptHint")}</p>
            <Button onClick={handleConvert} disabled={!hasContent || adaptMutation.isPending}>
              <Play className="h-4 w-4" />
              {adaptMutation.isPending ? t("converting") : t("convertPreview")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {warnings.length > 0 && (
        <Card className="border-amber-500/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {t("warnings.title", { count: warnings.length })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {warnings.map((warning) => (
                <li key={warning} className="text-sm text-amber-600">
                  {warning}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {hasPreview && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">{t("jsonPreview.title")}</CardTitle>
                <CardDescription>{t("jsonPreview.description")}</CardDescription>
              </div>
              <Badge variant="success">{t("jsonPreview.readyBadge")}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Editor
                height="400px"
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
            <div className="flex justify-end mt-4">
              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={loadMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <FileUp className="h-4 w-4" />
                {loadMutation.isPending ? tc("status.applying") : t("applyConfig")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("confirmDialog.title")}
        description={t("confirmDialog.description")}
        confirmLabel={t("confirmDialog.confirm")}
        onConfirm={handleConfirmApply}
        loading={loadMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
