/**
 * Policy list component — displays TLS automation policies with edit/delete actions.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useDeleteTlsPolicy } from "@/hooks/use-tls";
import type { AutomationPolicy } from "@/types/tls-app";
import { Globe, Pencil, Plus, Shield, Trash2 } from "lucide-react";
import { useState } from "react";

interface PolicyListProps {
  policies: AutomationPolicy[];
  onAdd: () => void;
  onEdit: (index: number, policy: AutomationPolicy) => void;
}

export function PolicyList({ policies, onAdd, onEdit }: PolicyListProps) {
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const deleteMutation = useDeleteTlsPolicy();

  function handleDelete() {
    if (deleteIndex === null) return;
    deleteMutation.mutate(deleteIndex, {
      onSuccess: () => setDeleteIndex(null),
    });
  }

  function issuerModuleLabel(module: string): string {
    switch (module) {
      case "acme": return "ACME";
      case "zerossl": return "ZeroSSL";
      case "internal": return "Internal CA";
      default: return module;
    }
  }

  function issuerBadgeVariant(module: string): "default" | "secondary" | "success" {
    switch (module) {
      case "acme": return "default";
      case "zerossl": return "success";
      default: return "secondary";
    }
  }

  if (policies.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Shield className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No Automation Policies</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Caddy uses default ACME settings. Add a policy to customize certificate issuance.
          </p>
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4" />
            Add Policy
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Automation Policies</h3>
          <p className="text-xs text-muted-foreground">
            {policies.length} {policies.length === 1 ? "policy" : "policies"} configured
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add Policy
        </Button>
      </div>

      {policies.map((policy, index) => (
        <Card key={`policy-${index}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Policy #{index + 1}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(index, policy)}
                  className="h-8 w-8 p-0"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteIndex(index)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            {policy.subjects && policy.subjects.length > 0 && (
              <CardDescription className="flex items-center gap-1.5 mt-1">
                <Globe className="h-3 w-3" />
                {policy.subjects.join(", ")}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {policy.issuers && policy.issuers.length > 0 ? (
                policy.issuers.map((issuer, i) => (
                  <Badge key={`issuer-${i}`} variant={issuerBadgeVariant(issuer.module)}>
                    {issuer.module === "acme" && issuer.ca
                      ? `ACME (${issuer.ca.includes("letsencrypt") ? "Let's Encrypt" : issuer.ca})`
                      : issuerModuleLabel(issuer.module)}
                  </Badge>
                ))
              ) : (
                <Badge variant="secondary">Default Issuer</Badge>
              )}

              {policy.on_demand && <Badge variant="warning">On-Demand</Badge>}
              {policy.must_staple && <Badge variant="secondary">Must-Staple</Badge>}
              {policy.key_type && (
                <Badge variant="secondary">{policy.key_type}</Badge>
              )}
            </div>

            {policy.issuers?.some((i) => i.email) && (
              <p className="text-xs text-muted-foreground mt-2">
                Email: {policy.issuers.find((i) => i.email)?.email}
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      <ConfirmDialog
        open={deleteIndex !== null}
        onOpenChange={(open) => { if (!open) setDeleteIndex(null); }}
        title="Delete Automation Policy?"
        description={`This will delete policy #${(deleteIndex ?? 0) + 1}. Domains covered by this policy will fall back to Caddy's default certificate management.`}
        confirmLabel="Delete Policy"
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
