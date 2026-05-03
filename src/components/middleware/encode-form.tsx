/**
 * Compression (encode) middleware configuration form.
 *
 * Configures gzip/zstd compression with minimum length and content-type preferences.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type EncodeFormValues,
  encodeFormDefaults,
  encodeFormSchema,
} from "@/lib/schemas/middleware";
import type { EncodeHandler } from "@/types/handlers";

interface EncodeFormProps {
  value?: EncodeHandler;
  onChange: (handler: EncodeHandler) => void;
}

function parseInitialValues(handler: EncodeHandler | undefined): EncodeFormValues {
  if (!handler) return encodeFormDefaults;
  const encodings = handler.encodings ?? {};
  return {
    gzipEnabled: Object.hasOwn(encodings, "gzip"),
    zstdEnabled: Object.hasOwn(encodings, "zstd"),
    minLength: handler.minimum_length ? String(handler.minimum_length) : "256",
    prefer: handler.prefer ?? ["zstd", "gzip"],
  };
}

function toHandler(values: EncodeFormValues): EncodeHandler {
  const encodings: Record<string, Record<string, unknown>> = {};
  if (values.gzipEnabled) encodings["gzip"] = {};
  if (values.zstdEnabled) encodings["zstd"] = {};

  const handler: EncodeHandler = {
    handler: "encode",
    encodings,
    prefer: values.prefer.filter(
      (p) => (p === "gzip" && values.gzipEnabled) || (p === "zstd" && values.zstdEnabled),
    ),
  };

  const minVal = Number.parseInt(values.minLength, 10);
  if (!Number.isNaN(minVal) && minVal > 0) {
    handler.minimum_length = minVal;
  }

  return handler;
}

export function EncodeForm({ value, onChange }: EncodeFormProps) {
  const { t } = useTranslation("middleware");

  const form = useForm<EncodeFormValues>({
    resolver: zodResolver(encodeFormSchema),
    defaultValues: parseInitialValues(value),
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

  const gzipEnabled = form.watch("gzipEnabled");
  const zstdEnabled = form.watch("zstdEnabled");
  const prefer = form.watch("prefer");

  function emitChange() {
    isInternalChange.current = true;
    const values = form.getValues();
    onChange(toHandler(values));
  }

  return (
    <Form {...form}>
      <div className="space-y-4">
        {/* Encoding algorithms */}
        <section className="space-y-3">
          <Label className="text-sm font-semibold">{t("encode.encodings")}</Label>
          <div className="space-y-2">
            <FormField
              control={form.control}
              name="gzipEnabled"
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="encode-gzip"
                    checked={field.value}
                    onChange={(e) => {
                      field.onChange(e.target.checked);
                      emitChange();
                    }}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="encode-gzip" className="font-normal">
                    {t("encode.gzip")}
                  </Label>
                  <span className="text-xs text-muted-foreground">{t("encode.gzipHint")}</span>
                </div>
              )}
            />
            <FormField
              control={form.control}
              name="zstdEnabled"
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="encode-zstd"
                    checked={field.value}
                    onChange={(e) => {
                      field.onChange(e.target.checked);
                      emitChange();
                    }}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="encode-zstd" className="font-normal">
                    {t("encode.zstd")}
                  </Label>
                  <span className="text-xs text-muted-foreground">{t("encode.zstdHint")}</span>
                </div>
              )}
            />
          </div>
        </section>

        {/* Preference order */}
        {gzipEnabled && zstdEnabled && (
          <section className="space-y-2">
            <Label className="text-sm font-semibold">{t("encode.preferred")}</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="encode-prefer"
                  value="zstd"
                  checked={prefer[0] === "zstd"}
                  onChange={() => {
                    form.setValue("prefer", ["zstd", "gzip"]);
                    emitChange();
                  }}
                  className="h-4 w-4"
                />
                <span className="text-sm">{t("encode.zstdFirst")}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="encode-prefer"
                  value="gzip"
                  checked={prefer[0] === "gzip"}
                  onChange={() => {
                    form.setValue("prefer", ["gzip", "zstd"]);
                    emitChange();
                  }}
                  className="h-4 w-4"
                />
                <span className="text-sm">{t("encode.gzipFirst")}</span>
              </label>
            </div>
            <p className="text-xs text-muted-foreground">{t("encode.preferredHint")}</p>
          </section>
        )}

        {/* Minimum length */}
        <section className="space-y-2">
          <Label htmlFor="encode-min-length" className="text-sm font-semibold">
            {t("encode.minLength")}
          </Label>
          <FormField
            control={form.control}
            name="minLength"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    id="encode-min-length"
                    type="number"
                    min="0"
                    placeholder="256"
                    className="w-32"
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
          <p className="text-xs text-muted-foreground">{t("encode.minLengthHint")}</p>
        </section>
      </div>
    </Form>
  );
}
