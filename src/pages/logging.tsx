/**
 * Logging configuration page.
 *
 * Manages Caddy's named log configurations (output, level, format).
 */

import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { LogFormDialog } from "@/components/logging/log-form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDeleteLog, useLogging, useUpsertLog } from "@/hooks/use-logging";
import type { LogConfig } from "@/types/caddy";

function getOutputLabel(log: LogConfig): string {
  if (!log.writer) return "default";
  switch (log.writer.output) {
    case "stdout":
      return "stdout";
    case "stderr":
      return "stderr";
    case "file":
      return log.writer.filename ?? "file";
    case "discard":
      return "discard";
    default:
      return log.writer.output;
  }
}

export function LoggingPage() {
  const { data: logging, isLoading, isError, error } = useLogging();
  const upsertLog = useUpsertLog();
  const deleteLog = useDeleteLog();

  const [formOpen, setFormOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<{ name: string; log: LogConfig } | null>(null);
  const [deletingName, setDeletingName] = useState<string | null>(null);

  const logs = logging?.logs ?? {};
  const logEntries = Object.entries(logs);

  function handleAdd() {
    setEditingLog(null);
    setFormOpen(true);
  }

  function handleEdit(name: string, log: LogConfig) {
    setEditingLog({ name, log });
    setFormOpen(true);
  }

  function handleSubmit(name: string, log: LogConfig) {
    upsertLog.mutate({ name, log }, { onSuccess: () => setFormOpen(false) });
  }

  function handleDelete() {
    if (!deletingName) return;
    deleteLog.mutate(deletingName, { onSuccess: () => setDeletingName(null) });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logging</h1>
          <p className="text-muted-foreground">Loading logging configuration...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logging</h1>
          <p className="text-muted-foreground">Configure log outputs, levels, and formats.</p>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              Failed to load logging configuration: {error?.message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logging</h1>
          <p className="text-muted-foreground">Configure log outputs, levels, and formats.</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          Add Log
        </Button>
      </div>

      {/* Log list */}
      {logEntries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No Logs Configured</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4 text-center max-w-sm">
              Caddy logs to stderr by default. Add named log configurations to customize output
              destinations, levels, and formats.
            </p>
            <Button variant="outline" onClick={handleAdd}>
              <Plus className="h-4 w-4" />
              Add First Log
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {logEntries.map(([name, log]) => (
            <Card key={name} className="group">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-mono">{name}</CardTitle>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleEdit(name, log)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeletingName(name)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="font-mono text-xs">
                  {getOutputLabel(log)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{log.level ?? "INFO"}</Badge>
                  <Badge variant="secondary">{log.encoder?.format ?? "console"}</Badge>
                  {log.include && log.include.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      include: {log.include.length}
                    </Badge>
                  )}
                  {log.exclude && log.exclude.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      exclude: {log.exclude.length}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <LogFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        loading={upsertLog.isPending}
        initialName={editingLog?.name}
        initialLog={editingLog?.log}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deletingName !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingName(null);
        }}
        title="Delete Log"
        description={`Are you sure you want to delete the "${deletingName}" log configuration? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleteLog.isPending}
      />
    </div>
  );
}
