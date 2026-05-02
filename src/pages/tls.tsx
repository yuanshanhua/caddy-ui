/**
 * TLS / Certificates page.
 *
 * Displays certificate status and manages TLS automation policies.
 */

import { Card, CardContent } from "@/components/ui/card";
import { CertificateList } from "@/components/tls/certificate-list";
import { PolicyFormDialog } from "@/components/tls/policy-form-dialog";
import { PolicyList } from "@/components/tls/policy-list";
import { useAddTlsPolicy, useTlsApp, useUpdateTlsPolicy } from "@/hooks/use-tls";
import type { AutomationPolicy } from "@/types/tls-app";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";

export function TlsPage() {
  const { data: tlsApp, isLoading, isError, error } = useTlsApp();
  const addPolicyMutation = useAddTlsPolicy();
  const updatePolicyMutation = useUpdateTlsPolicy();

  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<{
    index: number;
    policy: AutomationPolicy;
  } | null>(null);

  const policies = tlsApp?.automation?.policies ?? [];
  const noTlsConfigured = !isLoading && !isError && !tlsApp;

  function handleAddPolicy() {
    setEditingPolicy(null);
    setPolicyDialogOpen(true);
  }

  function handleEditPolicy(index: number, policy: AutomationPolicy) {
    setEditingPolicy({ index, policy });
    setPolicyDialogOpen(true);
  }

  function handleSubmitPolicy(policy: AutomationPolicy) {
    if (editingPolicy) {
      updatePolicyMutation.mutate(
        { index: editingPolicy.index, policy },
        { onSuccess: () => setPolicyDialogOpen(false) },
      );
    } else {
      addPolicyMutation.mutate(policy, {
        onSuccess: () => setPolicyDialogOpen(false),
      });
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">TLS / Certificates</h1>
          <p className="text-muted-foreground">Loading TLS configuration...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">TLS / Certificates</h1>
          <p className="text-muted-foreground">Manage TLS certificates and automation policies.</p>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              Failed to load TLS configuration: {error?.message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">TLS / Certificates</h1>
        <p className="text-muted-foreground">
          Manage TLS certificates and automation policies.
        </p>
      </div>

      {noTlsConfigured && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShieldCheck className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No TLS Configuration</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4 text-center max-w-sm">
              Caddy automatically manages HTTPS for domains configured in your HTTP servers.
              Add an automation policy to customize certificate issuance behavior.
            </p>
          </CardContent>
        </Card>
      )}

      {!noTlsConfigured && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Certificates</h2>
          <CertificateList certificates={tlsApp?.certificates} />
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">Automation Policies</h2>
        <PolicyList
          policies={policies}
          onAdd={handleAddPolicy}
          onEdit={handleEditPolicy}
        />
      </section>

      <PolicyFormDialog
        open={policyDialogOpen}
        onOpenChange={setPolicyDialogOpen}
        onSubmit={handleSubmitPolicy}
        loading={addPolicyMutation.isPending || updatePolicyMutation.isPending}
        initialPolicy={editingPolicy?.policy}
      />
    </div>
  );
}
