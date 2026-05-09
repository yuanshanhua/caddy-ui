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
import { generateRewriteId, parseRewrite, toRewrite } from "@/lib/converters";
import { type RewriteFormValues, rewriteFormSchema } from "@/lib/schemas/middleware";
import type { RewriteHandler } from "@/types/handlers";

interface RewriteFormProps {
  value?: RewriteHandler;
  onChange: (handler: RewriteHandler) => void;
}

export function RewriteForm({ value, onChange }: RewriteFormProps) {
  const { t } = useTranslation("middleware");
  const { t: tc } = useTranslation();

  const form = useForm<RewriteFormValues>({
    resolver: zodResolver(rewriteFormSchema),
    defaultValues: parseRewrite(value),
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
      form.reset(parseRewrite(value));
    }
  }, [value, form]);

  const mode = form.watch("mode");

  function emitChange() {
    isInternalChange.current = true;
    const values = form.getValues();
    onChange(toRewrite(values, value));
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
                onClick={() => append({ id: generateRewriteId(), find: "", replace: "" })}
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
