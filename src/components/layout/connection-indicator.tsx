/**
 * Connection indicator — shows whether the Caddy Admin API is reachable.
 */

import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { useConnection } from "@/hooks/use-connection";

export function ConnectionIndicator() {
  const { t } = useTranslation();
  const { status } = useConnection();

  const variants = {
    connected: { variant: "success" as const, label: t("status.connected") },
    disconnected: { variant: "destructive" as const, label: t("status.disconnected") },
    checking: { variant: "secondary" as const, label: t("status.checking") },
  };

  const { variant, label } = variants[status];

  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-2 w-2 rounded-full ${
          status === "connected"
            ? "bg-success animate-pulse"
            : status === "disconnected"
              ? "bg-destructive"
              : "bg-muted-foreground"
        }`}
      />
      <Badge variant={variant}>{label}</Badge>
    </div>
  );
}
