/**
 * Raw Config page — full JSON editor for the Caddy configuration.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfig, useConfigLoad } from "@/hooks/use-config";
import { Copy, RotateCcw, Save } from "lucide-react";
import { useState } from "react";

export function RawConfigPage() {
  const { data: config, isLoading, isError, error } = useConfig();
  const loadMutation = useConfigLoad();
  const [editedJson, setEditedJson] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const currentJson = config ? JSON.stringify(config, null, 2) : "";
  const displayJson = editedJson ?? currentJson;
  const hasChanges = editedJson !== null && editedJson !== currentJson;

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
            This is the live configuration. Changes are applied immediately via POST /load.
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
