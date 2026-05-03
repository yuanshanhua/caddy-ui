/**
 * Dashboard page — overview of Caddy status and quick stats.
 */

import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfig } from "@/hooks/use-config";
import { useConnectionStore } from "@/stores/connection";

export function DashboardPage() {
  const { t } = useTranslation("dashboard");
  const { t: tc } = useTranslation();
  const { data: config, isLoading, isError } = useConfig();
  const connectionStatus = useConnectionStore((s) => s.status);

  const serverCount = config?.apps?.http?.servers
    ? Object.keys(config.apps.http.servers).length
    : 0;

  const listenAddresses = config?.apps?.http?.servers
    ? Object.values(config.apps.http.servers).flatMap((s) => s.listen ?? [])
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Connection Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("connection")}</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <Badge
                variant={
                  connectionStatus === "connected"
                    ? "success"
                    : connectionStatus === "disconnected"
                      ? "destructive"
                      : "secondary"
                }
              >
                {tc(`status.${connectionStatus}`)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {t("adminApiAt", { address: config?.admin?.listen ?? "localhost:2019" })}
            </p>
          </CardContent>
        </Card>

        {/* Server Count */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("httpServers")}</CardDescription>
            <CardTitle>{isLoading ? "..." : isError ? "N/A" : serverCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {listenAddresses.length > 0
                ? t("listeningOn", { addresses: listenAddresses.join(", ") })
                : t("noServers")}
            </p>
          </CardContent>
        </Card>

        {/* Admin Config */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("adminApi")}</CardDescription>
            <CardTitle className="text-base">
              {config?.admin?.disabled ? t("disabled") : (config?.admin?.listen ?? ":2019")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {config?.admin?.enforce_origin ? t("originEnforcement") : t("defaultSecurity")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Info */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle>{t("configSummary.title")}</CardTitle>
            <CardDescription>{t("configSummary.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  {t("configSummary.appsLoaded")}
                </dt>
                <dd className="text-sm">
                  {config.apps ? Object.keys(config.apps).join(", ") : t("configSummary.none")}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  {t("configSummary.logging")}
                </dt>
                <dd className="text-sm">
                  {config.logging?.logs
                    ? t("configSummary.loggerCount", {
                        count: Object.keys(config.logging.logs).length,
                      })
                    : t("configSummary.loggerDefault")}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  {t("configSummary.storage")}
                </dt>
                <dd className="text-sm">
                  {config.storage?.module ?? t("configSummary.storageDefault")}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  {t("configSummary.httpPort")}
                </dt>
                <dd className="text-sm">{config.apps?.http?.http_port ?? 80}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
