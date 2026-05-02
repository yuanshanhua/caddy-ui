/**
 * Sites page — list all HTTP servers with CRUD operations.
 */

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ServerFormDialog } from "@/components/sites/server-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfig } from "@/hooks/use-config";
import { useCreateSite, useDeleteSite, useEnsureHttpApp } from "@/hooks/use-sites";
import type { HttpServer } from "@/types/http-app";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

export function SitesPage() {
  const { data: config, isLoading, isError, error } = useConfig();
  const createSite = useCreateSite();
  const deleteSite = useDeleteSite();
  const ensureHttpApp = useEnsureHttpApp();
  const navigate = useNavigate();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  async function handleCreate(id: string, server: HttpServer) {
    await ensureHttpApp();
    createSite.mutate({ id, server }, { onSuccess: () => setShowCreateDialog(false) });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteSite.mutate(deleteTarget, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Sites</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Sites</h1>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              Failed to load configuration: {error?.message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const servers = config?.apps?.http?.servers ?? {};
  const serverEntries = Object.entries(servers);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sites</h1>
          <p className="text-muted-foreground">Manage your HTTP servers and routes.</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4" />
          New Server
        </Button>
      </div>

      {serverEntries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium text-muted-foreground">No servers configured</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add a server to start serving traffic.
            </p>
            <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4" />
              Create Your First Server
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {serverEntries.map(([serverId, server]) => (
            <Card key={serverId} className="group">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-mono text-base">{serverId}</CardTitle>
                    <CardDescription>
                      {server.listen?.join(", ") ?? "No listen address"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {server.automatic_https?.disable && (
                      <Badge variant="warning">HTTPS disabled</Badge>
                    )}
                    <Badge variant="outline">{server.routes?.length ?? 0} route(s)</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => navigate(`/sites/${serverId}`)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(serverId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent
                className="cursor-pointer"
                onClick={() => navigate(`/sites/${serverId}`)}
              >
                {server.routes && server.routes.length > 0 ? (
                  <div className="space-y-2">
                    {server.routes.slice(0, 5).map((route, idx) => {
                      const hosts = route.match?.flatMap((m) => m.host ?? []) ?? [];
                      const paths = route.match?.flatMap((m) => m.path ?? []) ?? [];
                      const handlers = route.handle?.map((h) => h.handler) ?? [];

                      return (
                        <div
                          key={route["@id"] ?? `route-${idx}`}
                          className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            {hosts.length > 0 && (
                              <span className="font-medium">{hosts.join(", ")}</span>
                            )}
                            {paths.length > 0 && (
                              <span className="text-muted-foreground font-mono text-xs">
                                {paths.join(", ")}
                              </span>
                            )}
                            {hosts.length === 0 && paths.length === 0 && (
                              <span className="text-muted-foreground italic">catch-all</span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            {handlers.map((h) => (
                              <Badge key={h} variant="secondary" className="text-xs">
                                {h}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {server.routes.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center">
                        ... and {server.routes.length - 5} more routes
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No routes configured</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Server Dialog */}
      <ServerFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreate}
        loading={createSite.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Server"
        description={`Are you sure you want to delete server "${deleteTarget}"? This will remove all its routes and configuration. This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleteSite.isPending}
      />
    </div>
  );
}
