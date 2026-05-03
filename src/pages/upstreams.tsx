/**
 * Upstream Health Monitoring page.
 *
 * Real-time polling of reverse proxy upstream status with status cards.
 */

import { Activity, AlertTriangle, CheckCircle2, Server, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { UpstreamStatus } from "@/hooks/use-upstreams";
import { useUpstreams } from "@/hooks/use-upstreams";

function getHealthStatus(upstream: UpstreamStatus): "healthy" | "degraded" | "down" {
  if (upstream.num_requests === 0 && upstream.fails === 0) return "healthy";
  if (upstream.fails === 0) return "healthy";
  const failRate = upstream.fails / Math.max(upstream.num_requests, 1);
  if (failRate > 0.5) return "down";
  return "degraded";
}

function StatusIcon({ status }: { status: "healthy" | "degraded" | "down" }) {
  switch (status) {
    case "healthy":
      return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    case "degraded":
      return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    case "down":
      return <XCircle className="h-5 w-5 text-destructive" />;
  }
}

function StatusBadge({ status }: { status: "healthy" | "degraded" | "down" }) {
  const { t } = useTranslation("upstreams");
  switch (status) {
    case "healthy":
      return <Badge variant="success">{t("status.healthy")}</Badge>;
    case "degraded":
      return <Badge variant="warning">{t("status.degraded")}</Badge>;
    case "down":
      return <Badge variant="destructive">{t("status.down")}</Badge>;
  }
}

function UpstreamCard({ upstream }: { upstream: UpstreamStatus }) {
  const { t } = useTranslation("upstreams");
  const status = getHealthStatus(upstream);
  const failRate =
    upstream.num_requests > 0 ? ((upstream.fails / upstream.num_requests) * 100).toFixed(1) : "0.0";

  return (
    <Card
      className={
        status === "down"
          ? "border-destructive/50"
          : status === "degraded"
            ? "border-amber-500/50"
            : ""
      }
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon status={status} />
            <CardTitle className="text-base font-mono">{upstream.address}</CardTitle>
          </div>
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">{t("card.requests")}</p>
            <p className="text-lg font-semibold">{upstream.num_requests.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("card.failures")}</p>
            <p className="text-lg font-semibold text-destructive">
              {upstream.fails.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("card.failRate")}</p>
            <p className="text-lg font-semibold">{failRate}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function UpstreamsPage() {
  const { t } = useTranslation("upstreams");
  const { data: upstreams, isLoading, isError, error } = useUpstreams();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("loadingSubtitle")}</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("errorSubtitle")}</p>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              {t("loadError", { message: error?.message })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t("loadErrorHint")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const healthyCount = upstreams?.filter((u) => getHealthStatus(u) === "healthy").length ?? 0;
  const degradedCount = upstreams?.filter((u) => getHealthStatus(u) === "degraded").length ?? 0;
  const downCount = upstreams?.filter((u) => getHealthStatus(u) === "down").length ?? 0;
  const totalRequests = upstreams?.reduce((sum, u) => sum + u.num_requests, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("summary.total")}</CardDescription>
            <CardTitle className="text-2xl">{upstreams?.length ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("summary.healthy")}</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">{healthyCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("summary.degradedDown")}</CardDescription>
            <CardTitle className="text-2xl text-amber-600">{degradedCount + downCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("summary.totalRequests")}</CardDescription>
            <CardTitle className="text-2xl">{totalRequests.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Upstream List */}
      {!upstreams || upstreams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Server className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground">{t("empty.title")}</p>
            <p className="text-xs text-muted-foreground mt-1 text-center max-w-sm">
              {t("empty.description")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">{t("status.title")}</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {upstreams.map((upstream) => (
              <UpstreamCard key={upstream.address} upstream={upstream} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
