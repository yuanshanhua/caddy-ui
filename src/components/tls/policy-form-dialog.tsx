/**
 * TLS Automation Policy form dialog.
 * Used for both creating and editing automation policies.
 */

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { AutomationPolicy, TlsIssuer } from "@/types/tls-app";

interface PolicyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (policy: AutomationPolicy) => void;
  loading?: boolean;
  initialPolicy?: AutomationPolicy;
}

type IssuerModule = "acme" | "zerossl" | "internal";

interface IssuerFormState {
  module: IssuerModule;
  email: string;
  ca: string;
  httpChallengeDisabled: boolean;
  tlsAlpnChallengeDisabled: boolean;
}

const DEFAULT_ISSUER: IssuerFormState = {
  module: "acme",
  email: "",
  ca: "",
  httpChallengeDisabled: false,
  tlsAlpnChallengeDisabled: false,
};

const KEY_TYPES = [
  { value: "", label: "Default" },
  { value: "ed25519", label: "Ed25519" },
  { value: "p256", label: "P-256 (ECDSA)" },
  { value: "p384", label: "P-384 (ECDSA)" },
  { value: "rsa2048", label: "RSA 2048" },
  { value: "rsa4096", label: "RSA 4096" },
];

function issuerToFormState(issuer: TlsIssuer): IssuerFormState {
  return {
    module: (issuer.module as IssuerModule) || "acme",
    email: issuer.email ?? "",
    ca: issuer.ca ?? "",
    httpChallengeDisabled: issuer.challenges?.http?.disabled ?? false,
    tlsAlpnChallengeDisabled: issuer.challenges?.tls_alpn?.disabled ?? false,
  };
}

function formStateToIssuer(state: IssuerFormState): TlsIssuer {
  const issuer: TlsIssuer = { module: state.module };

  if (state.email) {
    issuer.email = state.email;
  }

  if (state.module === "acme" || state.module === "zerossl") {
    if (state.ca) {
      issuer.ca = state.ca;
    }
    if (state.httpChallengeDisabled || state.tlsAlpnChallengeDisabled) {
      issuer.challenges = {};
      if (state.httpChallengeDisabled) {
        issuer.challenges.http = { disabled: true };
      }
      if (state.tlsAlpnChallengeDisabled) {
        issuer.challenges.tls_alpn = { disabled: true };
      }
    }
  }

  return issuer;
}

export function PolicyFormDialog({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
  initialPolicy,
}: PolicyFormDialogProps) {
  const [subjects, setSubjects] = useState("");
  const [issuers, setIssuers] = useState<IssuerFormState[]>([DEFAULT_ISSUER]);
  const [keyType, setKeyType] = useState("");
  const [onDemand, setOnDemand] = useState(false);
  const [mustStaple, setMustStaple] = useState(false);

  const isEditing = !!initialPolicy;

  // Reset form when dialog opens/closes or initial data changes
  useEffect(() => {
    if (open && initialPolicy) {
      setSubjects(initialPolicy.subjects?.join(", ") ?? "");
      setIssuers(
        initialPolicy.issuers && initialPolicy.issuers.length > 0
          ? initialPolicy.issuers.map(issuerToFormState)
          : [DEFAULT_ISSUER],
      );
      setKeyType(initialPolicy.key_type ?? "");
      setOnDemand(initialPolicy.on_demand ?? false);
      setMustStaple(initialPolicy.must_staple ?? false);
    } else if (open) {
      setSubjects("");
      setIssuers([DEFAULT_ISSUER]);
      setKeyType("");
      setOnDemand(false);
      setMustStaple(false);
    }
  }, [open, initialPolicy]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const policy: AutomationPolicy = {};

    // Subjects
    const subjectList = subjects
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (subjectList.length > 0) {
      policy.subjects = subjectList;
    }

    // Issuers
    const issuerObjects = issuers.map(formStateToIssuer);
    if (issuerObjects.length > 0) {
      policy.issuers = issuerObjects;
    }

    // Key type
    if (keyType) {
      policy.key_type = keyType;
    }

    // Options
    if (onDemand) {
      policy.on_demand = true;
    }
    if (mustStaple) {
      policy.must_staple = true;
    }

    onSubmit(policy);
  }

  function addIssuer() {
    setIssuers([...issuers, { ...DEFAULT_ISSUER }]);
  }

  function removeIssuer(index: number) {
    setIssuers(issuers.filter((_, i) => i !== index));
  }

  function updateIssuer(index: number, updates: Partial<IssuerFormState>) {
    setIssuers(issuers.map((iss, i) => (i === index ? { ...iss, ...updates } : iss)));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="max-w-2xl max-h-[85vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit" : "Add"} Automation Policy</DialogTitle>
          <DialogDescription>
            Configure how certificates are obtained and managed for specific domains.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Subjects */}
          <div className="space-y-2">
            <Label htmlFor="subjects">Subjects (domains)</Label>
            <Input
              id="subjects"
              placeholder="example.com, *.example.com, api.example.com"
              value={subjects}
              onChange={(e) => setSubjects(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of domains this policy applies to. Leave empty for a catch-all
              policy.
            </p>
          </div>

          {/* Issuers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Issuers</Label>
              <Button type="button" variant="outline" size="sm" onClick={addIssuer}>
                <Plus className="h-3.5 w-3.5" />
                Add Issuer
              </Button>
            </div>

            {issuers.map((issuer, index) => (
              <div key={`issuer-${index}`} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Issuer #{index + 1}</p>
                  {issuers.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeIssuer(index)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                {/* Issuer module */}
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={issuer.module}
                    onChange={(e) =>
                      updateIssuer(index, { module: e.target.value as IssuerModule })
                    }
                  >
                    <option value="acme">ACME (Let's Encrypt)</option>
                    <option value="zerossl">ZeroSSL</option>
                    <option value="internal">Internal CA</option>
                  </Select>
                </div>

                {/* ACME / ZeroSSL fields */}
                {(issuer.module === "acme" || issuer.module === "zerossl") && (
                  <>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        placeholder="admin@example.com"
                        value={issuer.email}
                        onChange={(e) => updateIssuer(index, { email: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Contact email for the ACME account.
                      </p>
                    </div>

                    {issuer.module === "acme" && (
                      <div className="space-y-2">
                        <Label>CA URL (optional)</Label>
                        <Input
                          placeholder="https://acme-v02.api.letsencrypt.org/directory"
                          value={issuer.ca}
                          onChange={(e) => updateIssuer(index, { ca: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Leave empty for Let's Encrypt production. Use staging URL for testing.
                        </p>
                      </div>
                    )}

                    {/* Challenge toggles */}
                    <div className="space-y-2">
                      <Label>Challenges</Label>
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={issuer.httpChallengeDisabled}
                            onChange={(e) =>
                              updateIssuer(index, { httpChallengeDisabled: e.target.checked })
                            }
                            className="rounded border-input"
                          />
                          Disable HTTP challenge
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={issuer.tlsAlpnChallengeDisabled}
                            onChange={(e) =>
                              updateIssuer(index, { tlsAlpnChallengeDisabled: e.target.checked })
                            }
                            className="rounded border-input"
                          />
                          Disable TLS-ALPN challenge
                        </label>
                      </div>
                    </div>
                  </>
                )}

                {/* Internal CA note */}
                {issuer.module === "internal" && (
                  <p className="text-xs text-muted-foreground">
                    Uses Caddy's built-in CA to issue certificates. Useful for local development or
                    internal services.
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Key type */}
          <div className="space-y-2">
            <Label>Key Type</Label>
            <Select value={keyType} onChange={(e) => setKeyType(e.target.value)}>
              {KEY_TYPES.map((kt) => (
                <option key={kt.value || "__default"} value={kt.value}>
                  {kt.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <Label>Options</Label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={onDemand}
                  onChange={(e) => setOnDemand(e.target.checked)}
                  className="rounded border-input"
                />
                On-Demand TLS (obtain certificates at handshake time)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={mustStaple}
                  onChange={(e) => setMustStaple(e.target.checked)}
                  className="rounded border-input"
                />
                Must-Staple (require OCSP stapling)
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEditing ? "Update Policy" : "Add Policy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
