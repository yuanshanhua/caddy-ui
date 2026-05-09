/**
 * TLS Automation Policy form dialog.
 * Used for both creating and editing automation policies.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  type IssuerFormValues,
  issuerDefaults,
  type TlsPolicyFormValues,
  tlsPolicyFormDefaults,
  tlsPolicyFormSchema,
} from "@/lib/schemas/tls-policy";
import type { AutomationPolicy, TlsIssuer } from "@/types/tls-app";

interface PolicyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (policy: AutomationPolicy) => void;
  loading?: boolean;
  initialPolicy?: AutomationPolicy;
}

const KEY_TYPES = [
  { value: "", label: "Default" },
  { value: "ed25519", label: "Ed25519" },
  { value: "p256", label: "P-256 (ECDSA)" },
  { value: "p384", label: "P-384 (ECDSA)" },
  { value: "rsa2048", label: "RSA 2048" },
  { value: "rsa4096", label: "RSA 4096" },
];

function issuerToFormState(issuer: TlsIssuer): IssuerFormValues {
  return {
    module: (issuer.module as IssuerFormValues["module"]) || "acme",
    email: issuer.email ?? "",
    ca: issuer.ca ?? "",
    httpChallengeDisabled: issuer.challenges?.http?.disabled ?? false,
    tlsAlpnChallengeDisabled: issuer.challenges?.["tls-alpn"]?.disabled ?? false,
  };
}

function formStateToIssuer(state: IssuerFormValues): TlsIssuer {
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
        issuer.challenges["tls-alpn"] = { disabled: true };
      }
    }
  }

  return issuer;
}

function parseInitialValues(policy: AutomationPolicy): TlsPolicyFormValues {
  return {
    subjects: policy.subjects?.join(", ") ?? "",
    issuers:
      policy.issuers && policy.issuers.length > 0
        ? policy.issuers.map(issuerToFormState)
        : [issuerDefaults],
    keyType: policy.key_type ?? "",
    onDemand: policy.on_demand ?? false,
    mustStaple: policy.must_staple ?? false,
  };
}

function toPolicy(values: TlsPolicyFormValues, original?: AutomationPolicy): AutomationPolicy {
  const policy: AutomationPolicy = { ...original };

  const subjectList = values.subjects
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (subjectList.length > 0) {
    policy.subjects = subjectList;
  } else {
    delete policy.subjects;
  }

  const issuerObjects = values.issuers.map(formStateToIssuer);
  if (issuerObjects.length > 0) {
    policy.issuers = issuerObjects;
  } else {
    delete policy.issuers;
  }

  if (values.keyType) {
    policy.key_type = values.keyType;
  } else {
    delete policy.key_type;
  }

  if (values.onDemand) {
    policy.on_demand = true;
  } else {
    delete policy.on_demand;
  }
  if (values.mustStaple) {
    policy.must_staple = true;
  } else {
    delete policy.must_staple;
  }

  return policy;
}

export function PolicyFormDialog({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
  initialPolicy,
}: PolicyFormDialogProps) {
  const isEditing = !!initialPolicy;

  const form = useForm<TlsPolicyFormValues>({
    resolver: zodResolver(tlsPolicyFormSchema),
    defaultValues: initialPolicy ? parseInitialValues(initialPolicy) : tlsPolicyFormDefaults,
    values: open
      ? initialPolicy
        ? parseInitialValues(initialPolicy)
        : tlsPolicyFormDefaults
      : undefined,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "issuers",
  });

  function handleFormSubmit(values: TlsPolicyFormValues) {
    onSubmit(toPolicy(values, initialPolicy));
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Subjects */}
            <FormField
              control={form.control}
              name="subjects"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <Label htmlFor="subjects">Subjects (domains)</Label>
                  <FormControl>
                    <Input
                      id="subjects"
                      placeholder="example.com, *.example.com, api.example.com"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Comma-separated list of domains this policy applies to. Leave empty for a
                    catch-all policy.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Issuers */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Issuers</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append(issuerDefaults)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Issuer
                </Button>
              </div>

              {fields.map((field, index) => {
                const issuerModule = form.watch(`issuers.${index}.module`);
                return (
                  <div key={field.id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Issuer #{index + 1}</p>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    {/* Issuer module */}
                    <FormField
                      control={form.control}
                      name={`issuers.${index}.module`}
                      render={({ field: f }) => (
                        <FormItem className="space-y-2">
                          <Label>Type</Label>
                          <FormControl>
                            <Select value={f.value} onChange={(e) => f.onChange(e.target.value)}>
                              <option value="acme">ACME (Let's Encrypt)</option>
                              <option value="zerossl">ZeroSSL</option>
                              <option value="internal">Internal CA</option>
                            </Select>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* ACME / ZeroSSL fields */}
                    {(issuerModule === "acme" || issuerModule === "zerossl") && (
                      <>
                        <FormField
                          control={form.control}
                          name={`issuers.${index}.email`}
                          render={({ field: f }) => (
                            <FormItem className="space-y-2">
                              <Label>Email</Label>
                              <FormControl>
                                <Input placeholder="admin@example.com" {...f} />
                              </FormControl>
                              <p className="text-xs text-muted-foreground">
                                Contact email for the ACME account.
                              </p>
                            </FormItem>
                          )}
                        />

                        {issuerModule === "acme" && (
                          <FormField
                            control={form.control}
                            name={`issuers.${index}.ca`}
                            render={({ field: f }) => (
                              <FormItem className="space-y-2">
                                <Label>CA URL (optional)</Label>
                                <FormControl>
                                  <Input
                                    placeholder="https://acme-v02.api.letsencrypt.org/directory"
                                    {...f}
                                  />
                                </FormControl>
                                <p className="text-xs text-muted-foreground">
                                  Leave empty for Let's Encrypt production. Use staging URL for
                                  testing.
                                </p>
                              </FormItem>
                            )}
                          />
                        )}

                        {/* Challenge toggles */}
                        <div className="space-y-2">
                          <Label>Challenges</Label>
                          <div className="flex flex-col gap-2">
                            <FormField
                              control={form.control}
                              name={`issuers.${index}.httpChallengeDisabled`}
                              render={({ field: f }) => (
                                <label className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={f.value}
                                    onChange={f.onChange}
                                    className="rounded border-input"
                                  />
                                  Disable HTTP challenge
                                </label>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`issuers.${index}.tlsAlpnChallengeDisabled`}
                              render={({ field: f }) => (
                                <label className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={f.value}
                                    onChange={f.onChange}
                                    className="rounded border-input"
                                  />
                                  Disable TLS-ALPN challenge
                                </label>
                              )}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Internal CA note */}
                    {issuerModule === "internal" && (
                      <p className="text-xs text-muted-foreground">
                        Uses Caddy's built-in CA to issue certificates. Useful for local development
                        or internal services.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Key type */}
            <FormField
              control={form.control}
              name="keyType"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <Label>Key Type</Label>
                  <FormControl>
                    <Select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                      {KEY_TYPES.map((kt) => (
                        <option key={kt.value || "__default"} value={kt.value}>
                          {kt.label}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Options */}
            <div className="space-y-2">
              <Label>Options</Label>
              <div className="flex flex-col gap-2">
                <FormField
                  control={form.control}
                  name="onDemand"
                  render={({ field }) => (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="rounded border-input"
                      />
                      On-Demand TLS (obtain certificates at handshake time)
                    </label>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mustStaple"
                  render={({ field }) => (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="rounded border-input"
                      />
                      Must-Staple (require OCSP stapling)
                    </label>
                  )}
                />
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
        </Form>
      </DialogContent>
    </Dialog>
  );
}
