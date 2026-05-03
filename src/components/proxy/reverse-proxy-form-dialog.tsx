/**
 * Advanced reverse proxy configuration form.
 * Used as a standalone page/section when editing proxy settings in detail.
 */

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  reverseProxyFormSchema,
  reverseProxyDefaults,
  type ReverseProxyFormValues,
} from "@/lib/schemas/reverse-proxy";
import type { ReverseProxyHandler } from "@/types/reverse-proxy";

interface ReverseProxyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (handler: ReverseProxyHandler) => void;
  loading?: boolean;
  initialHandler?: ReverseProxyHandler;
}

function parseInitialValues(handler: ReverseProxyHandler): ReverseProxyFormValues {
  const ups = handler.upstreams?.map((u) => ({
    dial: u.dial ?? "",
    maxRequests: u.max_requests ? String(u.max_requests) : "",
  })) ?? [{ dial: "", maxRequests: "" }];

  const active = handler.health_checks?.active;
  const passive = handler.health_checks?.passive;
  const deleteHeaders = handler.headers?.request?.delete ?? [];

  return {
    upstreams: ups.length > 0 ? ups : [{ dial: "", maxRequests: "" }],
    lbPolicy: (handler.load_balancing?.selection_policy?.policy as ReverseProxyFormValues["lbPolicy"]) ?? "round_robin",
    tryDuration: handler.load_balancing?.try_duration ?? "",
    retries: handler.load_balancing?.retries ? String(handler.load_balancing.retries) : "",
    healthEnabled: !!active,
    healthUri: active?.uri ?? "/",
    healthInterval: active?.interval ?? "30s",
    healthTimeout: active?.timeout ?? "5s",
    passiveEnabled: !!passive,
    maxFails: passive?.max_fails ? String(passive.max_fails) : "3",
    failDuration: passive?.fail_duration ?? "30s",
    disableXForwarded:
      deleteHeaders.includes("X-Forwarded-For") || deleteHeaders.includes("X-Forwarded-Proto"),
    insecureSkipVerify: handler.transport?.tls?.insecure_skip_verify ?? false,
  };
}

function toHandler(values: ReverseProxyFormValues): ReverseProxyHandler {
  const handler: ReverseProxyHandler = {
    handler: "reverse_proxy",
    upstreams: values.upstreams
      .filter((u) => u.dial.trim())
      .map((u) => ({
        dial: u.dial.trim(),
        ...(u.maxRequests ? { max_requests: Number.parseInt(u.maxRequests, 10) } : {}),
      })),
  };

  if (values.lbPolicy !== "round_robin" || values.tryDuration || values.retries) {
    handler.load_balancing = {
      selection_policy: { policy: values.lbPolicy },
      ...(values.tryDuration ? { try_duration: values.tryDuration } : {}),
      ...(values.retries ? { retries: Number.parseInt(values.retries, 10) } : {}),
    };
  }

  if (values.healthEnabled || values.passiveEnabled) {
    handler.health_checks = {};
    if (values.healthEnabled) {
      handler.health_checks.active = {
        uri: values.healthUri,
        interval: values.healthInterval,
        timeout: values.healthTimeout,
      };
    }
    if (values.passiveEnabled) {
      handler.health_checks.passive = {
        max_fails: Number.parseInt(values.maxFails, 10),
        fail_duration: values.failDuration,
      };
    }
  }

  if (values.disableXForwarded) {
    handler.headers = {
      request: {
        delete: ["X-Forwarded-For", "X-Forwarded-Proto", "X-Forwarded-Host"],
      },
    };
  }

  if (values.insecureSkipVerify) {
    handler.transport = {
      protocol: "http",
      tls: { insecure_skip_verify: true },
    };
  }

  return handler;
}

export function ReverseProxyFormDialog({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
  initialHandler,
}: ReverseProxyFormProps) {
  const form = useForm<ReverseProxyFormValues>({
    resolver: zodResolver(reverseProxyFormSchema),
    defaultValues: initialHandler ? parseInitialValues(initialHandler) : reverseProxyDefaults,
    values: open
      ? initialHandler
        ? parseInitialValues(initialHandler)
        : reverseProxyDefaults
      : undefined,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "upstreams",
  });

  const healthEnabled = form.watch("healthEnabled");
  const passiveEnabled = form.watch("passiveEnabled");

  function handleFormSubmit(values: ReverseProxyFormValues) {
    onSubmit(toHandler(values));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)}>
            <DialogHeader>
              <DialogTitle>Reverse Proxy Configuration</DialogTitle>
              <DialogDescription>
                Configure upstreams, load balancing, health checks, and more.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
              {/* Upstreams */}
              <section className="space-y-3">
                <h4 className="text-sm font-semibold">Upstreams</h4>
                {fields.map((field, idx) => (
                  <div key={field.id} className="flex gap-2">
                    <div className="flex-1">
                      <FormField
                        control={form.control}
                        name={`upstreams.${idx}.dial`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="host:port (e.g., localhost:3000)" {...f} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="w-32">
                      <FormField
                        control={form.control}
                        name={`upstreams.${idx}.maxRequests`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Max reqs" type="number" {...f} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ dial: "", maxRequests: "" })}
                >
                  <Plus className="h-3 w-3" />
                  Add Upstream
                </Button>
              </section>

              {/* Load Balancing */}
              <section className="space-y-3">
                <h4 className="text-sm font-semibold">Load Balancing</h4>
                <div className="grid grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="lbPolicy"
                    render={({ field: f }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs">Policy</FormLabel>
                        <FormControl>
                          <Select value={f.value} onChange={(e) => f.onChange(e.target.value)}>
                            <option value="round_robin">Round Robin</option>
                            <option value="random">Random</option>
                            <option value="least_conn">Least Connections</option>
                            <option value="ip_hash">IP Hash</option>
                            <option value="uri_hash">URI Hash</option>
                            <option value="first">First Available</option>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tryDuration"
                    render={({ field: f }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs">Try Duration</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 5s" {...f} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="retries"
                    render={({ field: f }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs">Retries</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 3" type="number" {...f} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              {/* Active Health Checks */}
              <section className="space-y-3">
                <FormField
                  control={form.control}
                  name="healthEnabled"
                  render={({ field: f }) => (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="health-enabled"
                        checked={f.value}
                        onChange={f.onChange}
                        className="h-4 w-4 rounded border-input"
                      />
                      <Label htmlFor="health-enabled" className="text-sm font-semibold">
                        Active Health Checks
                      </Label>
                    </div>
                  )}
                />
                {healthEnabled && (
                  <div className="grid grid-cols-3 gap-3 pl-6">
                    <FormField
                      control={form.control}
                      name="healthUri"
                      render={({ field: f }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">URI</FormLabel>
                          <FormControl>
                            <Input {...f} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="healthInterval"
                      render={({ field: f }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">Interval</FormLabel>
                          <FormControl>
                            <Input {...f} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="healthTimeout"
                      render={({ field: f }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">Timeout</FormLabel>
                          <FormControl>
                            <Input {...f} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </section>

              {/* Passive Health Checks */}
              <section className="space-y-3">
                <FormField
                  control={form.control}
                  name="passiveEnabled"
                  render={({ field: f }) => (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="passive-enabled"
                        checked={f.value}
                        onChange={f.onChange}
                        className="h-4 w-4 rounded border-input"
                      />
                      <Label htmlFor="passive-enabled" className="text-sm font-semibold">
                        Passive Health Checks
                      </Label>
                    </div>
                  )}
                />
                {passiveEnabled && (
                  <div className="grid grid-cols-2 gap-3 pl-6">
                    <FormField
                      control={form.control}
                      name="maxFails"
                      render={({ field: f }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">Max Fails</FormLabel>
                          <FormControl>
                            <Input type="number" {...f} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="failDuration"
                      render={({ field: f }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">Fail Duration</FormLabel>
                          <FormControl>
                            <Input {...f} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </section>

              {/* Options */}
              <section className="space-y-3">
                <h4 className="text-sm font-semibold">Options</h4>
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="disableXForwarded"
                    render={({ field: f }) => (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="disable-x-forwarded"
                          checked={f.value}
                          onChange={f.onChange}
                          className="h-4 w-4 rounded border-input"
                        />
                        <Label htmlFor="disable-x-forwarded" className="font-normal">
                          Disable X-Forwarded-For / X-Forwarded-Proto headers
                        </Label>
                      </div>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="insecureSkipVerify"
                    render={({ field: f }) => (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="insecure-skip"
                          checked={f.value}
                          onChange={f.onChange}
                          className="h-4 w-4 rounded border-input"
                        />
                        <Label htmlFor="insecure-skip" className="font-normal">
                          Skip TLS verification (insecure - for self-signed backends)
                        </Label>
                      </div>
                    )}
                  />
                </div>
              </section>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
