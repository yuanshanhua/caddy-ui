/**
 * Sites page — list all HTTP servers with CRUD operations.
 */

import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ServerFormDialog } from "@/components/sites/server-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfig } from "@/hooks/use-config";
import { useCreateSite, useDeleteSite, useEnsureHttpApp } from "@/hooks/use-sites";
import type { HttpServer } from "@/types/http-app";

export function SitesPage() {
  const { t } = useTranslation("sites");
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
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("loadingSubtitle", { defaultValue: "Loading..." })}
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              {t("loadError", {
                defaultValue: "Failed to load configuration: {{message}}",
                message: error?.message,
              })}
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
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4" />
          {t("newServer")}
        </Button>
      </div>

      {serverEntries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium text-muted-foreground">{t("noServers")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("noServersHint")}</p>
            <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4" />
              {t("createFirst")}
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
                      {server.listen?.join(", ") ?? t("noListenAddress")}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {server.automatic_https?.disable && (
                      <Badge variant="warning">{t("httpsDisabled")}</Badge>
                    )}
                    <Badge variant="outline">
                      {t("routeCount", { count: server.routes?.length ?? 0 })}
                    </Badge>
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
                              <span className="text-muted-foreground italic">{t("catchAll")}</span>
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
                        {t("moreRoutes", { count: server.routes.length - 5 })}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("noRoutes")}</p>
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
        title={t("deleteServer.title")}
        description={t("deleteServer.description", { serverId: deleteTarget ?? "" })}
        confirmLabel={t("deleteServer.confirm")}
        onConfirm={handleDelete}
        loading={deleteSite.isPending}
      />
    </div>
  );
}
