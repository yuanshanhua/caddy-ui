/**
 * Headers middleware configuration form.
 *
 * Allows adding/setting/deleting request and response headers.
 */

import { Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  headersFormSchema,
  headersFormDefaults,
  type HeadersFormValues,
  type HeaderEntry,
} from "@/lib/schemas/headers";
import type { HeaderOps, HeadersHandler, RespHeaderOps } from "@/types/handlers";

interface HeadersFormProps {
  value?: HeadersHandler;
  onChange: (handler: HeadersHandler) => void;
}

let nextId = 0;
function generateId(): string {
  return `header-${++nextId}-${Date.now()}`;
}

function parseHeaderOps(ops: HeaderOps | undefined): HeaderEntry[] {
  const entries: HeaderEntry[] = [];
  if (!ops) return entries;

  if (ops.add) {
    for (const [name, values] of Object.entries(ops.add)) {
      for (const value of values) {
        entries.push({ id: generateId(), operation: "add", name, value });
      }
    }
  }
  if (ops.set) {
    for (const [name, values] of Object.entries(ops.set)) {
      for (const value of values) {
        entries.push({ id: generateId(), operation: "set", name, value });
      }
    }
  }
  if (ops.delete) {
    for (const name of ops.delete) {
      entries.push({ id: generateId(), operation: "delete", name, value: "" });
    }
  }

  return entries;
}

function buildHeaderOps(entries: HeaderEntry[]): HeaderOps | undefined {
  const ops: HeaderOps = {};
  let hasOps = false;

  for (const entry of entries) {
    if (!entry.name.trim()) continue;

    if (entry.operation === "add") {
      if (!ops.add) ops.add = {};
      const arr = ops.add[entry.name] ?? [];
      arr.push(entry.value);
      ops.add[entry.name] = arr;
      hasOps = true;
    } else if (entry.operation === "set") {
      if (!ops.set) ops.set = {};
      const arr = ops.set[entry.name] ?? [];
      arr.push(entry.value);
      ops.set[entry.name] = arr;
      hasOps = true;
    } else if (entry.operation === "delete") {
      if (!ops.delete) ops.delete = [];
      ops.delete.push(entry.name);
      hasOps = true;
    }
  }

  return hasOps ? ops : undefined;
}

function parseInitialValues(handler: HeadersHandler | undefined): HeadersFormValues {
  if (!handler) return headersFormDefaults;
  return {
    requestHeaders: parseHeaderOps(handler.request),
    responseHeaders: parseHeaderOps(handler.response),
    responseDeferred: handler.response?.deferred ?? false,
  };
}

function toHandler(values: HeadersFormValues): HeadersHandler {
  const handler: HeadersHandler = { handler: "headers" };

  const requestOps = buildHeaderOps(values.requestHeaders);
  if (requestOps) handler.request = requestOps;

  const responseOps = buildHeaderOps(values.responseHeaders);
  if (responseOps) {
    const respOps: RespHeaderOps = { ...responseOps };
    if (values.responseDeferred) respOps.deferred = true;
    handler.response = respOps;
  }

  return handler;
}

export function HeadersForm({ value, onChange }: HeadersFormProps) {
  const { t } = useTranslation("middleware");
  const { t: tc } = useTranslation();

  const form = useForm<HeadersFormValues>({
    resolver: zodResolver(headersFormSchema),
    defaultValues: parseInitialValues(value),
  });

  const requestFields = useFieldArray({ control: form.control, name: "requestHeaders" });
  const responseFields = useFieldArray({ control: form.control, name: "responseHeaders" });

  // Sync external value changes
  useEffect(() => {
    if (value) {
      form.reset(parseInitialValues(value));
    }
  }, [value, form]);

  // Emit changes on form value update
  function emitChange() {
    const values = form.getValues();
    onChange(toHandler(values));
  }

  return (
    <Form {...form}>
      <div className="space-y-5">
        {/* Request Headers */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">{t("headers.requestHeaders")}</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                requestFields.append({ id: generateId(), operation: "set", name: "", value: "" });
              }}
            >
              <Plus className="h-3 w-3" />
              {tc("actions.add")}
            </Button>
          </div>
          {requestFields.fields.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("headers.noModifications", { type: "request" })}
            </p>
          ) : (
            <div className="space-y-2">
              {requestFields.fields.map((field, idx) => (
                <div key={field.id} className="flex gap-2 items-center">
                  <FormField
                    control={form.control}
                    name={`requestHeaders.${idx}.operation`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormControl>
                          <Select
                            className="w-24 shrink-0"
                            value={f.value}
                            onChange={(e) => {
                              f.onChange(e.target.value);
                              emitChange();
                            }}
                          >
                            <option value="set">{t("headers.set")}</option>
                            <option value="add">{t("headers.add")}</option>
                            <option value="delete">{t("headers.delete")}</option>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`requestHeaders.${idx}.name`}
                    render={({ field: f }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            placeholder={t("headers.headerName")}
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
                  {form.watch(`requestHeaders.${idx}.operation`) !== "delete" && (
                    <FormField
                      control={form.control}
                      name={`requestHeaders.${idx}.value`}
                      render={({ field: f }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              placeholder={t("headers.value")}
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
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => {
                      requestFields.remove(idx);
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

        {/* Response Headers */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">{t("headers.responseHeaders")}</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                responseFields.append({ id: generateId(), operation: "set", name: "", value: "" });
              }}
            >
              <Plus className="h-3 w-3" />
              {tc("actions.add")}
            </Button>
          </div>
          {responseFields.fields.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("headers.noModifications", { type: "response" })}
            </p>
          ) : (
            <div className="space-y-2">
              {responseFields.fields.map((field, idx) => (
                <div key={field.id} className="flex gap-2 items-center">
                  <FormField
                    control={form.control}
                    name={`responseHeaders.${idx}.operation`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormControl>
                          <Select
                            className="w-24 shrink-0"
                            value={f.value}
                            onChange={(e) => {
                              f.onChange(e.target.value);
                              emitChange();
                            }}
                          >
                            <option value="set">{t("headers.set")}</option>
                            <option value="add">{t("headers.add")}</option>
                            <option value="delete">{t("headers.delete")}</option>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`responseHeaders.${idx}.name`}
                    render={({ field: f }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            placeholder={t("headers.headerName")}
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
                  {form.watch(`responseHeaders.${idx}.operation`) !== "delete" && (
                    <FormField
                      control={form.control}
                      name={`responseHeaders.${idx}.value`}
                      render={({ field: f }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              placeholder={t("headers.value")}
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
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => {
                      responseFields.remove(idx);
                      emitChange();
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <FormField
            control={form.control}
            name="responseDeferred"
            render={({ field: f }) => (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="resp-deferred"
                  checked={f.value}
                  onChange={(e) => {
                    f.onChange(e.target.checked);
                    emitChange();
                  }}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="resp-deferred" className="font-normal text-xs">
                  {t("headers.deferred")}
                </Label>
              </div>
            )}
          />
        </section>
      </div>
    </Form>
  );
}
