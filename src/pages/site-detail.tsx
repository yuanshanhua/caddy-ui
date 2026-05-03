/**
 * Site Detail page — view and manage routes for a specific server.
 */

import { ArrowLeft, GripVertical, Pencil, Plus, Settings, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { RouteFormDialog } from "@/components/sites/route-form-dialog";
import { ServerFormDialog } from "@/components/sites/server-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfig } from "@/hooks/use-config";
import { useAddRoute, useDeleteRoute, useUpdateRoute } from "@/hooks/use-routes";
import { useUpdateSite } from "@/hooks/use-sites";
import type { HttpRoute } from "@/types/http-app";

export function SiteDetailPage() {
  const { t } = useTranslation("sites");
  const { serverId } = useParams<{ serverId: string }>();
  const navigate = useNavigate();
  const { data: config, isLoading } = useConfig();

  const updateSite = useUpdateSite();
  const addRoute = useAddRoute();
  const updateRoute = useUpdateRoute();
  const deleteRoute = useDeleteRoute();

  const [showServerEdit, setShowServerEdit] = useState(false);
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [editingRouteIndex, setEditingRouteIndex] = useState<number | null>(null);
  const [deleteRouteIndex, setDeleteRouteIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {t("loadingSubtitle", { defaultValue: "Loading..." })}
        </h1>
      </div>
    );
  }

  if (!serverId || !config?.apps?.http?.servers?.[serverId]) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/sites")}>
          <ArrowLeft className="h-4 w-4" />
          {t("backToSites")}
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              {t("serverNotFound", { serverId: serverId ?? "" })}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const server = config.apps.http.servers[serverId];
  if (!server) {
    return null;
  }
  const routes = server.routes ?? [];

  function handleServerUpdate(id: string, updatedServer: typeof server) {
    updateSite.mutate(
      { id, server: { ...server, ...updatedServer } },
      { onSuccess: () => setShowServerEdit(false) },
    );
  }

  function handleAddRoute(route: HttpRoute) {
    if (!serverId) return;
    addRoute.mutate({ serverId, route }, { onSuccess: () => setShowRouteForm(false) });
  }

  function handleUpdateRoute(route: HttpRoute) {
    if (!serverId || editingRouteIndex === null) return;
    updateRoute.mutate(
      { serverId, index: editingRouteIndex, route },
      { onSuccess: () => setEditingRouteIndex(null) },
    );
  }

  function handleDeleteRoute() {
    if (!serverId || deleteRouteIndex === null) return;
    deleteRoute.mutate(
      { serverId, index: deleteRouteIndex },
      { onSuccess: () => setDeleteRouteIndex(null) },
    );
  }

  function getRouteDescription(route: HttpRoute): { label: string; sublabel: string } {
    const hosts = route.match?.flatMap((m) => m.host ?? []) ?? [];
    const paths = route.match?.flatMap((m) => m.path ?? []) ?? [];
    const handlers = route.handle?.map((h) => h.handler) ?? [];

    let label = t("catchAll");
    if (hosts.length > 0) label = hosts.join(", ");
    else if (paths.length > 0) label = paths.join(", ");

    const sublabel = handlers.join(" → ") || t("noHandler");
    return { label, sublabel };
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/sites")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight font-mono">{serverId}</h1>
          <p className="text-muted-foreground">
            {server.listen?.join(", ") ?? t("noListenAddress")}
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowServerEdit(true)}>
          <Settings className="h-4 w-4" />
          {t("serverSettings")}
        </Button>
      </div>

      {/* Server Info */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("detail.listen")}</CardDescription>
            <CardTitle className="text-base font-mono">
              {server.listen?.join(", ") ?? "none"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("detail.https")}</CardDescription>
            <CardTitle className="text-base">
              {server.automatic_https?.disable ? (
                <Badge variant="warning">{t("detail.httpsDisabled")}</Badge>
              ) : (
                <Badge variant="success">{t("detail.httpsAutomatic")}</Badge>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("detail.routes")}</CardDescription>
            <CardTitle className="text-base">{routes.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Routes Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("detail.routes")}</CardTitle>
              <CardDescription>{t("detail.routesDescription")}</CardDescription>
            </div>
            <Button onClick={() => setShowRouteForm(true)}>
              <Plus className="h-4 w-4" />
              {t("detail.addRoute")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {routes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground">{t("detail.noRoutes")}</p>
              <Button className="mt-3" variant="outline" onClick={() => setShowRouteForm(true)}>
                <Plus className="h-4 w-4" />
                {t("detail.addFirstRoute")}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {routes.map((route, idx) => {
                const { label, sublabel } = getRouteDescription(route);
                return (
                  <div
                    key={route["@id"] ?? `route-${idx}`}
                    className="group flex items-center gap-3 rounded-md border px-3 py-3 hover:bg-accent/50 transition-colors"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground w-6 shrink-0">#{idx}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{label}</span>
                        {route.terminal && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            {t("terminal")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{sublabel}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditingRouteIndex(idx)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteRouteIndex(idx)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Server Dialog */}
      <ServerFormDialog
        open={showServerEdit}
        onOpenChange={setShowServerEdit}
        onSubmit={handleServerUpdate}
        loading={updateSite.isPending}
        initialId={serverId}
        initialServer={server}
      />

      {/* Add Route Dialog */}
      <RouteFormDialog
        open={showRouteForm}
        onOpenChange={setShowRouteForm}
        onSubmit={handleAddRoute}
        loading={addRoute.isPending}
      />

      {/* Edit Route Dialog */}
      <RouteFormDialog
        open={editingRouteIndex !== null}
        onOpenChange={(open) => {
          if (!open) setEditingRouteIndex(null);
        }}
        onSubmit={handleUpdateRoute}
        loading={updateRoute.isPending}
        initialRoute={editingRouteIndex !== null ? routes[editingRouteIndex] : undefined}
      />

      {/* Delete Route Confirmation */}
      <ConfirmDialog
        open={deleteRouteIndex !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteRouteIndex(null);
        }}
        title={t("detail.deleteRoute.title")}
        description={t("detail.deleteRoute.description", { index: deleteRouteIndex ?? 0 })}
        confirmLabel={t("detail.deleteRoute.confirm")}
        onConfirm={handleDeleteRoute}
        loading={deleteRoute.isPending}
      />
    </div>
  );
}
