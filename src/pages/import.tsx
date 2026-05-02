/**
 * Caddyfile Import page.
 *
 * Allows users to paste (or upload) a Caddyfile, convert it to JSON via
 * Caddy's /adapt endpoint, preview the result, and apply it as the running config.
 */

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAdaptCaddyfile, useConfigLoad } from "@/hooks/use-config";
import { AlertTriangle, FileUp, Play, RotateCcw, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

export function ImportPage() {
  const [caddyfile, setCaddyfile] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const adaptMutation = useAdaptCaddyfile();
  const loadMutation = useConfigLoad();

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
        toast.success("Caddyfile converted successfully");
      },
      onError: (error) => {
        toast.error("Failed to convert Caddyfile", {
          description: error.message,
        });
      },
    });
  }

  function handleConfirmApply() {
    if (!adaptedConfig) return;

    loadMutation.mutate(adaptedConfig, {
      onSuccess: () => {
        toast.success("Configuration applied successfully");
        setConfirmOpen(false);
        setCaddyfile("");
        adaptMutation.reset();
        void navigate("/sites");
      },
      onError: (error) => {
        toast.error("Failed to apply configuration", {
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
          <h1 className="text-3xl font-bold tracking-tight">Import Caddyfile</h1>
          <p className="text-muted-foreground">
            Convert a Caddyfile to JSON and apply it as the running configuration.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasContent && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
      </div>

      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardContent className="flex items-start gap-3 pt-4 pb-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-500">Full Configuration Replacement</p>
            <p className="text-muted-foreground mt-1">
              Importing a Caddyfile will <strong>replace the entire running configuration</strong>.
              All existing servers, routes, and TLS settings will be overwritten.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">Caddyfile</CardTitle>
              <CardDescription>Paste your Caddyfile content or upload a file.</CardDescription>
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
                Upload File
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            className="min-h-[300px] font-mono text-sm resize-y"
            placeholder={
              "# Example Caddyfile\nexample.com {\n    reverse_proxy localhost:3000\n}\n\napi.example.com {\n    reverse_proxy localhost:8080\n}"
            }
            value={caddyfile}
            onChange={(e) => {
              setCaddyfile(e.target.value);
              if (adaptedConfig) adaptMutation.reset();
            }}
            spellCheck={false}
          />
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-muted-foreground">
              Uses Caddy's <code className="text-xs bg-muted px-1 py-0.5 rounded">/adapt</code>{" "}
              endpoint for conversion.
            </p>
            <Button onClick={handleConvert} disabled={!hasContent || adaptMutation.isPending}>
              <Play className="h-4 w-4" />
              {adaptMutation.isPending ? "Converting..." : "Convert & Preview"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {warnings.length > 0 && (
        <Card className="border-amber-500/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Warnings ({warnings.length})
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
                <CardTitle className="text-sm font-medium">JSON Preview</CardTitle>
                <CardDescription>
                  This is the resulting configuration that will be applied.
                </CardDescription>
              </div>
              <Badge variant="success">Ready to Apply</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="w-full max-h-[400px] overflow-auto rounded-md border bg-muted/50 p-4 font-mono text-sm">
              {jsonPreview}
            </pre>
            <div className="flex justify-end mt-4">
              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={loadMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <FileUp className="h-4 w-4" />
                {loadMutation.isPending ? "Applying..." : "Apply Configuration"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Replace Entire Configuration?"
        description="This will overwrite the entire running Caddy configuration with the converted Caddyfile. All existing servers, routes, and TLS policies will be replaced. This action cannot be undone."
        confirmLabel="Apply Configuration"
        onConfirm={handleConfirmApply}
        loading={loadMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
