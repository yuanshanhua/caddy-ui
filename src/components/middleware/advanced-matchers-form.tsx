/**
 * Advanced matchers form for route configuration.
 *
 * Adds header, query, and remote_ip matchers beyond the basic host/path/method.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type AdvancedMatchersFormValues,
  advancedMatchersFormDefaults,
  advancedMatchersFormSchema,
} from "@/lib/schemas/middleware";
import type { RequestMatcher } from "@/types/matchers";

interface AdvancedMatchersFormProps {
  value?: RequestMatcher;
  onChange: (matcher: Partial<RequestMatcher>) => void;
}

let nextId = 0;
function generateId(): string {
  return `matcher-${++nextId}-${Date.now()}`;
}

function parseInitialValues(matcher: RequestMatcher | undefined): AdvancedMatchersFormValues {
  if (!matcher) return advancedMatchersFormDefaults;

  const headerMatches: AdvancedMatchersFormValues["headerMatches"] = [];
  if (matcher.header) {
    for (const [name, values] of Object.entries(matcher.header)) {
      for (const val of values) {
        headerMatches.push({ id: generateId(), name, value: val });
      }
    }
  }

  const queryMatches: AdvancedMatchersFormValues["queryMatches"] = [];
  if (matcher.query) {
    for (const [name, values] of Object.entries(matcher.query)) {
      for (const val of values) {
        queryMatches.push({ id: generateId(), name, value: val });
      }
    }
  }

  return {
    headerMatches,
    queryMatches,
    remoteIpRanges: matcher.remote_ip?.ranges?.join(", ") ?? "",
    remoteIpForwarded: matcher.remote_ip?.forwarded ?? false,
    protocol: matcher.protocol ?? "",
  };
}

function toMatcher(values: AdvancedMatchersFormValues): Partial<RequestMatcher> {
  const matcher: Partial<RequestMatcher> = {};

  const validHeaders = values.headerMatches.filter((h) => h.name.trim());
  if (validHeaders.length > 0) {
    const headerMap: Record<string, string[]> = {};
    for (const h of validHeaders) {
      const existing = headerMap[h.name];
      if (!existing) {
        headerMap[h.name] = [h.value];
      } else {
        existing.push(h.value);
      }
    }
    matcher.header = headerMap;
  }

  const validQueries = values.queryMatches.filter((q) => q.name.trim());
  if (validQueries.length > 0) {
    const queryMap: Record<string, string[]> = {};
    for (const q of validQueries) {
      const existing = queryMap[q.name];
      if (!existing) {
        queryMap[q.name] = [q.value];
      } else {
        existing.push(q.value);
      }
    }
    matcher.query = queryMap;
  }

  if (values.remoteIpRanges.trim()) {
    matcher.remote_ip = {
      ranges: values.remoteIpRanges
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean),
    };
    if (values.remoteIpForwarded) {
      matcher.remote_ip.forwarded = true;
    }
  }

  if (values.protocol.trim()) {
    matcher.protocol = values.protocol.trim();
  }

  return matcher;
}

export function AdvancedMatchersForm({ value, onChange }: AdvancedMatchersFormProps) {
  const { t } = useTranslation("middleware");
  const { t: tc } = useTranslation();

  const form = useForm<AdvancedMatchersFormValues>({
    resolver: zodResolver(advancedMatchersFormSchema),
    defaultValues: parseInitialValues(value),
  });

  const headerFields = useFieldArray({ control: form.control, name: "headerMatches" });
  const queryFields = useFieldArray({ control: form.control, name: "queryMatches" });

  useEffect(() => {
    if (value) {
      form.reset(parseInitialValues(value));
    }
  }, [value, form]);

  function emitChange() {
    const values = form.getValues();
    onChange(toMatcher(values));
  }

  return (
    <Form {...form}>
      <div className="space-y-5">
        {/* Header matchers */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">{t("matchers.headerMatchers")}</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => headerFields.append({ id: generateId(), name: "", value: "" })}
            >
              <Plus className="h-3 w-3" />
              {tc("actions.add")}
            </Button>
          </div>
          {headerFields.fields.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("matchers.noHeaderMatchers")}</p>
          ) : (
            <div className="space-y-2">
              {headerFields.fields.map((field, idx) => (
                <div key={field.id} className="flex gap-2 items-center">
                  <FormField
                    control={form.control}
                    name={`headerMatches.${idx}.name`}
                    render={({ field: f }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            placeholder={t("matchers.headerName")}
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
                  <FormField
                    control={form.control}
                    name={`headerMatches.${idx}.value`}
                    render={({ field: f }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            placeholder={t("matchers.headerValue")}
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => {
                      headerFields.remove(idx);
                      emitChange();
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Query matchers */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">{t("matchers.queryMatchers")}</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => queryFields.append({ id: generateId(), name: "", value: "" })}
            >
              <Plus className="h-3 w-3" />
              {tc("actions.add")}
            </Button>
          </div>
          {queryFields.fields.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("matchers.noQueryMatchers")}</p>
          ) : (
            <div className="space-y-2">
              {queryFields.fields.map((field, idx) => (
                <div key={field.id} className="flex gap-2 items-center">
                  <FormField
                    control={form.control}
                    name={`queryMatches.${idx}.name`}
                    render={({ field: f }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            placeholder={t("matchers.paramName")}
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
                  <FormField
                    control={form.control}
                    name={`queryMatches.${idx}.value`}
                    render={({ field: f }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            placeholder={t("matchers.paramValue")}
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => {
                      queryFields.remove(idx);
                      emitChange();
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Remote IP */}
        <section className="space-y-3">
          <Label className="text-sm font-semibold">{t("matchers.remoteIp")}</Label>
          <div className="space-y-2">
            <FormField
              control={form.control}
              name="remoteIpRanges"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder={t("matchers.remoteIpPlaceholder")}
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        emitChange();
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <p className="text-xs text-muted-foreground">{t("matchers.remoteIpHint")}</p>
            <FormField
              control={form.control}
              name="remoteIpForwarded"
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ip-forwarded"
                    checked={field.value}
                    onChange={(e) => {
                      field.onChange(e.target.checked);
                      emitChange();
                    }}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="ip-forwarded" className="font-normal text-xs">
                    {t("matchers.useXForwardedFor")}
                  </Label>
                </div>
              )}
            />
          </div>
        </section>

        {/* Protocol */}
        <section className="space-y-2">
          <Label htmlFor="matcher-protocol" className="text-sm font-semibold">
            {t("matchers.protocol")}
          </Label>
          <FormField
            control={form.control}
            name="protocol"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    id="matcher-protocol"
                    placeholder={t("matchers.protocolPlaceholder")}
                    className="max-w-xs"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      emitChange();
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <p className="text-xs text-muted-foreground">{t("matchers.protocolHint")}</p>
        </section>
      </div>
    </Form>
  );
}
