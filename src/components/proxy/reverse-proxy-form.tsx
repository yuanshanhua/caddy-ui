/**
 * Inline reverse proxy configuration form.
 *
 * Used as an expandable section within the route form dialog.
 * Follows the same value/onChange pattern as other middleware forms.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  type ReverseProxyFormValues,
  reverseProxyDefaults,
  reverseProxyFormSchema,
} from "@/lib/schemas/reverse-proxy";
import type { ReverseProxyHandler } from "@/types/reverse-proxy";

interface ReverseProxyFormProps {
  value?: ReverseProxyHandler;
  onChange: (handler: ReverseProxyHandler) => void;
}

function parseInitialValues(handler: ReverseProxyHandler | undefined): ReverseProxyFormValues {
  if (!handler) return reverseProxyDefaults;

  const ups = handler.upstreams?.map((u) => ({
    dial: u.dial ?? "",
    maxRequests: u.max_requests ? String(u.max_requests) : "",
  })) ?? [{ dial: "", maxRequests: "" }];

  const active = handler.health_checks?.active;
  const passive = handler.health_checks?.passive;
  const deleteHeaders = handler.headers?.request?.delete ?? [];

  return {
    upstreams: ups.length > 0 ? ups : [{ dial: "", maxRequests: "" }],
    lbPolicy:
      (handler.load_balancing?.selection_policy?.policy as ReverseProxyFormValues["lbPolicy"]) ??
      "round_robin",
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

function toHandler(
  values: ReverseProxyFormValues,
  original?: ReverseProxyHandler,
): ReverseProxyHandler {
  const handler: ReverseProxyHandler = { ...original, handler: "reverse_proxy" };

  handler.upstreams = values.upstreams
    .filter((u) => u.dial.trim())
    .map((u) => ({
      dial: u.dial.trim(),
      ...(u.maxRequests ? { max_requests: Number.parseInt(u.maxRequests, 10) } : {}),
    }));

  if (values.lbPolicy !== "round_robin" || values.tryDuration || values.retries) {
    handler.load_balancing = {
      ...original?.load_balancing,
      selection_policy: { policy: values.lbPolicy },
      ...(values.tryDuration ? { try_duration: values.tryDuration } : {}),
      ...(values.retries ? { retries: Number.parseInt(values.retries, 10) } : {}),
    };
  } else {
    delete handler.load_balancing;
  }

  if (values.healthEnabled || values.passiveEnabled) {
    handler.health_checks = { ...original?.health_checks };
    if (values.healthEnabled) {
      handler.health_checks.active = {
        ...original?.health_checks?.active,
        uri: values.healthUri,
        interval: values.healthInterval,
        timeout: values.healthTimeout,
      };
    } else {
      delete handler.health_checks.active;
    }
    if (values.passiveEnabled) {
      handler.health_checks.passive = {
        ...original?.health_checks?.passive,
        max_fails: Number.parseInt(values.maxFails, 10),
        fail_duration: values.failDuration,
      };
    } else {
      delete handler.health_checks.passive;
    }
  } else {
    delete handler.health_checks;
  }

  if (values.disableXForwarded) {
    handler.headers = {
      ...original?.headers,
      request: {
        ...original?.headers?.request,
        delete: ["X-Forwarded-For", "X-Forwarded-Proto", "X-Forwarded-Host"],
      },
    };
  } else if (original?.headers) {
    const existingDeletes = original.headers.request?.delete?.filter(
      (h) => !["X-Forwarded-For", "X-Forwarded-Proto", "X-Forwarded-Host"].includes(h),
    );
    if (existingDeletes?.length || original.headers.request?.add || original.headers.request?.set) {
      handler.headers = {
        ...original.headers,
        request: {
          ...original.headers.request,
          delete: existingDeletes?.length ? existingDeletes : undefined,
        },
      };
    } else if (original.headers.response) {
      handler.headers = { ...original.headers };
      delete handler.headers.request;
    } else {
      delete handler.headers;
    }
  } else {
    delete handler.headers;
  }

  if (values.insecureSkipVerify) {
    handler.transport = {
      ...original?.transport,
      protocol: original?.transport?.protocol ?? "http",
      tls: { ...original?.transport?.tls, insecure_skip_verify: true },
    };
  } else if (original?.transport) {
    const tls = original.transport.tls ? { ...original.transport.tls } : undefined;
    if (tls) {
      delete tls.insecure_skip_verify;
      if (Object.keys(tls).length === 0) {
        handler.transport = { ...original.transport };
        delete handler.transport.tls;
      } else {
        handler.transport = { ...original.transport, tls };
      }
    }
    // transport may still have plugin fields (resolver, keep_alive, etc.)
  } else {
    delete handler.transport;
  }

  return handler;
}

export function ReverseProxyForm({ value, onChange }: ReverseProxyFormProps) {
  const { t } = useTranslation("middleware");

  const form = useForm<ReverseProxyFormValues>({
    resolver: zodResolver(reverseProxyFormSchema),
    defaultValues: parseInitialValues(value),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "upstreams",
  });

  // Sync external value changes (skip when change originated from this form)
  const isInternalChange = useRef(false);
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    form.reset(parseInitialValues(value));
  }, [value, form]);

  const healthEnabled = form.watch("healthEnabled");
  const passiveEnabled = form.watch("passiveEnabled");

  function emitChange() {
    isInternalChange.current = true;
    const values = form.getValues();
    onChange(toHandler(values, value));
  }

  return (
    <Form {...form}>
      <div className="space-y-5">
        {/* Upstreams */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">{t("reverseProxy.upstreams")}</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                append({ dial: "", maxRequests: "" });
                emitChange();
              }}
            >
              <Plus className="h-3 w-3" />
              {t("reverseProxy.addUpstream")}
            </Button>
          </div>
          {fields.map((field, idx) => (
            <div key={field.id} className="flex gap-2">
              <div className="flex-1">
                <FormField
                  control={form.control}
                  name={`upstreams.${idx}.dial`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder={t("reverseProxy.dialPlaceholder")}
                          {...f}
                          onChange={(e) => {
                            f.onChange(e);
                            emitChange();
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="w-28">
                <FormField
                  control={form.control}
                  name={`upstreams.${idx}.maxRequests`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder={t("reverseProxy.maxRequests")}
                          type="number"
                          {...f}
                          onChange={(e) => {
                            f.onChange(e);
                            emitChange();
                          }}
                        />
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
                  className="h-9 w-9 shrink-0"
                  onClick={() => {
                    remove(idx);
                    emitChange();
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </section>

        {/* Load Balancing */}
        <section className="space-y-3">
          <Label className="text-sm font-semibold">{t("reverseProxy.loadBalancing")}</Label>
          <div className="grid grid-cols-3 gap-3">
            <FormField
              control={form.control}
              name="lbPolicy"
              render={({ field: f }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs">{t("reverseProxy.policy")}</FormLabel>
                  <FormControl>
                    <Select
                      value={f.value}
                      onChange={(e) => {
                        f.onChange(e.target.value);
                        emitChange();
                      }}
                    >
                      <option value="round_robin">{t("reverseProxy.roundRobin")}</option>
                      <option value="random">{t("reverseProxy.random")}</option>
                      <option value="least_conn">{t("reverseProxy.leastConn")}</option>
                      <option value="ip_hash">{t("reverseProxy.ipHash")}</option>
                      <option value="uri_hash">{t("reverseProxy.uriHash")}</option>
                      <option value="first">{t("reverseProxy.firstAvailable")}</option>
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
                  <FormLabel className="text-xs">{t("reverseProxy.tryDuration")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("reverseProxy.tryDurationPlaceholder")}
                      {...f}
                      onChange={(e) => {
                        f.onChange(e);
                        emitChange();
                      }}
                    />
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
                  <FormLabel className="text-xs">{t("reverseProxy.retries")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("reverseProxy.retriesPlaceholder")}
                      type="number"
                      {...f}
                      onChange={(e) => {
                        f.onChange(e);
                        emitChange();
                      }}
                    />
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
                  id="rp-health-enabled"
                  checked={f.value}
                  onChange={(e) => {
                    f.onChange(e.target.checked);
                    emitChange();
                  }}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="rp-health-enabled" className="text-sm font-semibold">
                  {t("reverseProxy.activeHealthChecks")}
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
                    <FormLabel className="text-xs">{t("reverseProxy.healthUri")}</FormLabel>
                    <FormControl>
                      <Input
                        {...f}
                        onChange={(e) => {
                          f.onChange(e);
                          emitChange();
                        }}
                      />
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
                    <FormLabel className="text-xs">{t("reverseProxy.healthInterval")}</FormLabel>
                    <FormControl>
                      <Input
                        {...f}
                        onChange={(e) => {
                          f.onChange(e);
                          emitChange();
                        }}
                      />
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
                    <FormLabel className="text-xs">{t("reverseProxy.healthTimeout")}</FormLabel>
                    <FormControl>
                      <Input
                        {...f}
                        onChange={(e) => {
                          f.onChange(e);
                          emitChange();
                        }}
                      />
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
                  id="rp-passive-enabled"
                  checked={f.value}
                  onChange={(e) => {
                    f.onChange(e.target.checked);
                    emitChange();
                  }}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="rp-passive-enabled" className="text-sm font-semibold">
                  {t("reverseProxy.passiveHealthChecks")}
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
                    <FormLabel className="text-xs">{t("reverseProxy.maxFails")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...f}
                        onChange={(e) => {
                          f.onChange(e);
                          emitChange();
                        }}
                      />
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
                    <FormLabel className="text-xs">{t("reverseProxy.failDuration")}</FormLabel>
                    <FormControl>
                      <Input
                        {...f}
                        onChange={(e) => {
                          f.onChange(e);
                          emitChange();
                        }}
                      />
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
          <Label className="text-sm font-semibold">{t("reverseProxy.options")}</Label>
          <div className="space-y-2">
            <FormField
              control={form.control}
              name="disableXForwarded"
              render={({ field: f }) => (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rp-disable-x-forwarded"
                    checked={f.value}
                    onChange={(e) => {
                      f.onChange(e.target.checked);
                      emitChange();
                    }}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="rp-disable-x-forwarded" className="font-normal">
                    {t("reverseProxy.disableXForwarded")}
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
                    id="rp-insecure-skip"
                    checked={f.value}
                    onChange={(e) => {
                      f.onChange(e.target.checked);
                      emitChange();
                    }}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="rp-insecure-skip" className="font-normal">
                    {t("reverseProxy.insecureSkipVerify")}
                  </Label>
                </div>
              )}
            />
          </div>
        </section>
      </div>
    </Form>
  );
}
