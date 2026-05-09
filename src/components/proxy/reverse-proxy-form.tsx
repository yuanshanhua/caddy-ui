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
import { parseReverseProxy, toReverseProxy } from "@/lib/converters";
import { type ReverseProxyFormValues, reverseProxyFormSchema } from "@/lib/schemas/reverse-proxy";
import type { ReverseProxyHandler } from "@/types/reverse-proxy";

interface ReverseProxyFormProps {
  value?: ReverseProxyHandler;
  onChange: (handler: ReverseProxyHandler) => void;
}

export function ReverseProxyForm({ value, onChange }: ReverseProxyFormProps) {
  const { t } = useTranslation("middleware");

  const form = useForm<ReverseProxyFormValues>({
    resolver: zodResolver(reverseProxyFormSchema),
    defaultValues: parseReverseProxy(value),
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
    form.reset(parseReverseProxy(value));
  }, [value, form]);

  const healthEnabled = form.watch("healthEnabled");
  const passiveEnabled = form.watch("passiveEnabled");

  function emitChange() {
    isInternalChange.current = true;
    const values = form.getValues();
    onChange(toReverseProxy(values, value));
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
