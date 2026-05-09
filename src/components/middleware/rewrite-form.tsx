/**
 * URI Rewrite handler configuration form.
 *
 * Supports full URI rewrite, strip prefix/suffix, substring, and path_regexp.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  type RewriteFormValues,
  rewriteFormDefaults,
  rewriteFormSchema,
} from "@/lib/schemas/middleware";
import type { RewriteHandler } from "@/types/handlers";

interface RewriteFormProps {
  value?: RewriteHandler;
  onChange: (handler: RewriteHandler) => void;
}

let nextId = 0;
function generateId(): string {
  return `rewrite-${++nextId}-${Date.now()}`;
}

function parseInitialValues(handler: RewriteHandler | undefined): RewriteFormValues {
  if (!handler) return rewriteFormDefaults;

  const values: RewriteFormValues = { ...rewriteFormDefaults, method: handler.method ?? "" };

  if (handler.uri) {
    values.mode = "uri";
    values.uri = handler.uri;
  } else if (handler.strip_path_prefix) {
    values.mode = "strip_prefix";
    values.stripPrefix = handler.strip_path_prefix;
  } else if (handler.strip_path_suffix) {
    values.mode = "strip_suffix";
    values.stripSuffix = handler.strip_path_suffix;
  } else if (handler.uri_substring && handler.uri_substring.length > 0) {
    values.mode = "substring";
    values.substrings = handler.uri_substring.map((s) => ({
      id: generateId(),
      find: s.find,
      replace: s.replace,
    }));
  } else if (handler.path_regexp && handler.path_regexp.length > 0) {
    values.mode = "path_regexp";
    values.regexpFind = handler.path_regexp[0]?.find ?? "";
    values.regexpReplace = handler.path_regexp[0]?.replace ?? "";
  }

  return values;
}

function toHandler(values: RewriteFormValues, original?: RewriteHandler): RewriteHandler {
  const handler: RewriteHandler = { ...original, handler: "rewrite" };

  // Only one rewrite mode is active at a time
  delete handler.uri;
  delete handler.strip_path_prefix;
  delete handler.strip_path_suffix;
  delete handler.uri_substring;
  delete handler.path_regexp;

  if (values.method.trim()) {
    handler.method = values.method.trim().toUpperCase();
  } else {
    delete handler.method;
  }

  switch (values.mode) {
    case "uri":
      if (values.uri.trim()) handler.uri = values.uri.trim();
      break;
    case "strip_prefix":
      if (values.stripPrefix.trim()) handler.strip_path_prefix = values.stripPrefix.trim();
      break;
    case "strip_suffix":
      if (values.stripSuffix.trim()) handler.strip_path_suffix = values.stripSuffix.trim();
      break;
    case "substring": {
      const validSubs = values.substrings
        .filter((s) => s.find.trim())
        .map((s) => ({ find: s.find, replace: s.replace }));
      if (validSubs.length > 0) handler.uri_substring = validSubs;
      break;
    }
    case "path_regexp":
      if (values.regexpFind.trim()) {
        handler.path_regexp = [{ find: values.regexpFind, replace: values.regexpReplace }];
      }
      break;
  }

  return handler;
}

export function RewriteForm({ value, onChange }: RewriteFormProps) {
  const { t } = useTranslation("middleware");
  const { t: tc } = useTranslation();

  const form = useForm<RewriteFormValues>({
    resolver: zodResolver(rewriteFormSchema),
    defaultValues: parseInitialValues(value),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "substrings",
  });

  // Sync external value changes (skip when change originated from this form)
  const isInternalChange = useRef(false);
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    if (value) {
      form.reset(parseInitialValues(value));
    }
  }, [value, form]);

  const mode = form.watch("mode");

  function emitChange() {
    isInternalChange.current = true;
    const values = form.getValues();
    onChange(toHandler(values, value));
  }

  return (
    <Form {...form}>
      <div className="space-y-4">
        {/* Rewrite mode */}
        <section className="space-y-2">
          <Label className="text-sm font-semibold">{t("rewrite.mode")}</Label>
          <FormField
            control={form.control}
            name="mode"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Select
                    value={field.value}
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      emitChange();
                    }}
                  >
                    <option value="uri">{t("rewrite.fullUri")}</option>
                    <option value="strip_prefix">{t("rewrite.stripPrefix")}</option>
                    <option value="strip_suffix">{t("rewrite.stripSuffix")}</option>
                    <option value="substring">{t("rewrite.substring")}</option>
                    <option value="path_regexp">{t("rewrite.pathRegex")}</option>
                  </Select>
                </FormControl>
              </FormItem>
            )}
          />
        </section>

        {/* Mode-specific fields */}
        {mode === "uri" && (
          <section className="space-y-2">
            <Label htmlFor="rewrite-uri">{t("rewrite.newUri")}</Label>
            <FormField
              control={form.control}
              name="uri"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      id="rewrite-uri"
                      placeholder={t("rewrite.newUriPlaceholder")}
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
            <p className="text-xs text-muted-foreground">{t("rewrite.newUriHint")}</p>
          </section>
        )}

        {mode === "strip_prefix" && (
          <section className="space-y-2">
            <Label htmlFor="rewrite-strip-prefix">{t("rewrite.prefixToStrip")}</Label>
            <FormField
              control={form.control}
              name="stripPrefix"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      id="rewrite-strip-prefix"
                      placeholder={t("rewrite.prefixPlaceholder")}
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
            <p className="text-xs text-muted-foreground">{t("rewrite.prefixHint")}</p>
          </section>
        )}

        {mode === "strip_suffix" && (
          <section className="space-y-2">
            <Label htmlFor="rewrite-strip-suffix">{t("rewrite.suffixToStrip")}</Label>
            <FormField
              control={form.control}
              name="stripSuffix"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      id="rewrite-strip-suffix"
                      placeholder={t("rewrite.suffixPlaceholder")}
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
          </section>
        )}

        {mode === "substring" && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">{t("rewrite.substringReplacements")}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ id: generateId(), find: "", replace: "" })}
              >
                <Plus className="h-3 w-3" />
                {tc("actions.add")}
              </Button>
            </div>
            {fields.map((field, idx) => (
              <div key={field.id} className="flex gap-2 items-center">
                <FormField
                  control={form.control}
                  name={`substrings.${idx}.find`}
                  render={({ field: f }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          placeholder={t("rewrite.find")}
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
                <span className="text-xs text-muted-foreground shrink-0">&rarr;</span>
                <FormField
                  control={form.control}
                  name={`substrings.${idx}.replace`}
                  render={({ field: f }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          placeholder={t("rewrite.replace")}
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
                    remove(idx);
                    emitChange();
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {fields.length === 0 && (
              <p className="text-xs text-muted-foreground">{t("rewrite.noSubstitutions")}</p>
            )}
          </section>
        )}

        {mode === "path_regexp" && (
          <section className="space-y-3">
            <FormField
              control={form.control}
              name="regexpFind"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <Label htmlFor="rewrite-regexp-find">{t("rewrite.regexPattern")}</Label>
                  <FormControl>
                    <Input
                      id="rewrite-regexp-find"
                      placeholder={t("rewrite.regexPlaceholder")}
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
            <FormField
              control={form.control}
              name="regexpReplace"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <Label htmlFor="rewrite-regexp-replace">{t("rewrite.replacement")}</Label>
                  <FormControl>
                    <Input
                      id="rewrite-regexp-replace"
                      placeholder={t("rewrite.replacementPlaceholder")}
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
            <p className="text-xs text-muted-foreground">{t("rewrite.regexHint")}</p>
          </section>
        )}

        {/* Method override */}
        <section className="space-y-2">
          <Label htmlFor="rewrite-method">{t("rewrite.methodOverride")}</Label>
          <FormField
            control={form.control}
            name="method"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    id="rewrite-method"
                    placeholder={t("rewrite.methodPlaceholder")}
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
          <p className="text-xs text-muted-foreground">{t("rewrite.methodHint")}</p>
        </section>
      </div>
    </Form>
  );
}
