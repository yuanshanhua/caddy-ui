/**
 * Dashboard page — overview of Caddy status and quick stats.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfig } from "@/hooks/use-config";
import { useConnectionStore } from "@/stores/connection";

export function DashboardPage() {
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
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your Caddy server status.</p>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Connection Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Connection</CardDescription>
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
                {connectionStatus}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Admin API at {config?.admin?.listen ?? "localhost:2019"}
            </p>
          </CardContent>
        </Card>

        {/* Server Count */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>HTTP Servers</CardDescription>
            <CardTitle>{isLoading ? "..." : isError ? "N/A" : serverCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {listenAddresses.length > 0
                ? `Listening on ${listenAddresses.join(", ")}`
                : "No servers configured"}
            </p>
          </CardContent>
        </Card>

        {/* Admin Config */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Admin API</CardDescription>
            <CardTitle className="text-base">
              {config?.admin?.disabled ? "Disabled" : (config?.admin?.listen ?? ":2019")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {config?.admin?.enforce_origin ? "Origin enforcement enabled" : "Default security"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Info */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle>Configuration Summary</CardTitle>
            <CardDescription>Current active configuration overview</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Apps Loaded</dt>
                <dd className="text-sm">
                  {config.apps ? Object.keys(config.apps).join(", ") : "None"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Logging</dt>
                <dd className="text-sm">
                  {config.logging?.logs
                    ? `${Object.keys(config.logging.logs).length} logger(s)`
                    : "Default"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Storage</dt>
                <dd className="text-sm">{config.storage?.module ?? "file_system (default)"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">HTTP Port</dt>
                <dd className="text-sm">{config.apps?.http?.http_port ?? 80}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
