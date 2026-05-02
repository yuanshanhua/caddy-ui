/**
 * Placeholder pages for features to be implemented in later phases.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Construction className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Coming Soon</p>
          <p className="text-sm text-muted-foreground mt-1">
            This feature is planned for a future release.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function UpstreamsPage() {
  return (
    <PlaceholderPage
      title="Upstreams"
      description="Monitor reverse proxy upstream health and traffic."
    />
  );
}

export function TlsPage() {
  return (
    <PlaceholderPage
      title="TLS / Certificates"
      description="Manage TLS certificates and automation policies."
    />
  );
}

export function GlobalConfigPage() {
  return (
    <PlaceholderPage
      title="Global Configuration"
      description="Configure admin API, logging, storage, and other global settings."
    />
  );
}

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <p className="text-lg text-muted-foreground mt-2">Page not found</p>
    </div>
  );
}
