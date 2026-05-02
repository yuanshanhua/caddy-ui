/**
 * Upstream Health Monitoring page.
 *
 * Real-time polling of reverse proxy upstream status with status cards.
 */

import { Activity, AlertTriangle, CheckCircle2, Server, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { UpstreamStatus } from "@/hooks/use-upstreams";
import { useUpstreams } from "@/hooks/use-upstreams";

function getHealthStatus(upstream: UpstreamStatus): "healthy" | "degraded" | "down" {
  // Simple heuristic: if fails > 50% of requests, it's down
  // If fails > 0 but < 50%, it's degraded
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
  switch (status) {
    case "healthy":
      return <Badge variant="success">Healthy</Badge>;
    case "degraded":
      return <Badge variant="warning">Degraded</Badge>;
    case "down":
      return <Badge variant="destructive">Down</Badge>;
  }
}

function UpstreamCard({ upstream }: { upstream: UpstreamStatus }) {
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
            <p className="text-xs text-muted-foreground">Requests</p>
            <p className="text-lg font-semibold">{upstream.num_requests.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Failures</p>
            <p className="text-lg font-semibold text-destructive">
              {upstream.fails.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fail Rate</p>
            <p className="text-lg font-semibold">{failRate}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function UpstreamsPage() {
  const { data: upstreams, isLoading, isError, error } = useUpstreams();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Upstreams</h1>
          <p className="text-muted-foreground">Loading upstream health status...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Upstreams</h1>
          <p className="text-muted-foreground">Monitor reverse proxy upstream health.</p>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              Failed to load upstream status: {error?.message}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Make sure at least one reverse_proxy handler is configured.
            </p>
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
        <h1 className="text-3xl font-bold tracking-tight">Upstreams</h1>
        <p className="text-muted-foreground">
          Monitor reverse proxy upstream health and traffic. Refreshes every 5 seconds.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Upstreams</CardDescription>
            <CardTitle className="text-2xl">{upstreams?.length ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Healthy</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">{healthyCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Degraded / Down</CardDescription>
            <CardTitle className="text-2xl text-amber-600">{degradedCount + downCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Requests</CardDescription>
            <CardTitle className="text-2xl">{totalRequests.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Upstream List */}
      {!upstreams || upstreams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Server className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No Upstreams Found</p>
            <p className="text-xs text-muted-foreground mt-1 text-center max-w-sm">
              Configure a reverse_proxy handler in your routes to see upstream health here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Upstream Status</h2>
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
