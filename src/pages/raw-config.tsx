/**
 * Raw Config page — full JSON editor for the Caddy configuration.
 */

import Editor from "@monaco-editor/react";
import { AlertTriangle, Copy, RotateCcw, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfig, useConfigLoad } from "@/hooks/use-config";

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
  const { t: tc } = useTranslation();
  const { data: config, isLoading, isError, error } = useConfig();
  const loadMutation = useConfigLoad();
  const [editedJson, setEditedJson] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const currentJson = config ? JSON.stringify(config, null, 2) : "";
  const displayJson = editedJson ?? currentJson;
  const hasChanges = editedJson !== null && editedJson !== currentJson;

  const adminChanged = useMemo(
    () => hasChanges && !parseError && hasAdminChanges(currentJson, editedJson ?? ""),
    [hasChanges, parseError, currentJson, editedJson],
  );

  function handleChange(value: string | undefined) {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("rawConfig.title")}</h1>
          <p className="text-muted-foreground">{t("rawConfig.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && <Badge variant="warning">{t("rawConfig.unsavedChanges")}</Badge>}
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
              onChange={handleChange}
              theme="vs-dark"
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
    </div>
  );
}
