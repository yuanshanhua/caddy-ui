/**
 * Raw Config page — full JSON editor for the Caddy configuration.
 */

import { AlertTriangle, Copy, RotateCcw, Save } from "lucide-react";
import { useMemo, useState } from "react";
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

  function handleChange(value: string) {
    setEditedJson(value);
    try {
      JSON.parse(value);
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
        <h1 className="text-3xl font-bold tracking-tight">Raw Configuration</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Raw Configuration</h1>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">Failed to load: {error?.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Raw Configuration</h1>
          <p className="text-muted-foreground">View and edit the full Caddy JSON configuration.</p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && <Badge variant="warning">Unsaved changes</Badge>}
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
            Copy
          </Button>
          {hasChanges && (
            <>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!!parseError || loadMutation.isPending}
              >
                <Save className="h-4 w-4" />
                {loadMutation.isPending ? "Saving..." : "Apply"}
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
                  Admin API configuration changed
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Modifying the <code className="bg-muted px-1 rounded">admin</code> section may
                  cause this UI to lose connectivity. If you change the admin listen address or
                  disable the API, the panel will not be able to communicate with Caddy until the
                  configuration is corrected manually.
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
              Failed to apply config: {loadMutation.error?.message}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">JSON Configuration</CardTitle>
          <CardDescription>
            Edit the configuration below and click &quot;Apply&quot; to load it via POST /load.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            className="w-full min-h-[600px] rounded-md border bg-muted/50 p-4 font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
            value={displayJson}
            onChange={(e) => handleChange(e.target.value)}
            spellCheck={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
