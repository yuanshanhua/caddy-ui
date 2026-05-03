/**
 * CORS quick-configuration form.
 *
 * Generates a headers middleware handler with proper CORS headers.
 */

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { corsFormSchema, corsFormDefaults, type CorsFormValues } from "@/lib/schemas/middleware";
import type { HeadersHandler } from "@/types/handlers";

interface CorsFormProps {
  value?: HeadersHandler;
  onChange: (handler: HeadersHandler) => void;
}

const DEFAULT_METHODS = "GET, POST, PUT, DELETE, OPTIONS";
const DEFAULT_HEADERS = "Content-Type, Authorization";
const DEFAULT_MAX_AGE = "86400";

function parseCorsFromHeaders(handler: HeadersHandler | undefined): CorsFormValues {
  if (!handler?.response?.set) return corsFormDefaults;

  const set = handler.response.set;
  return {
    origins: set["Access-Control-Allow-Origin"]?.join(", ") ?? "*",
    methods: set["Access-Control-Allow-Methods"]?.join(", ") ?? DEFAULT_METHODS,
    headers: set["Access-Control-Allow-Headers"]?.join(", ") ?? DEFAULT_HEADERS,
    exposeHeaders: set["Access-Control-Expose-Headers"]?.join(", ") ?? "",
    maxAge: set["Access-Control-Max-Age"]?.[0] ?? DEFAULT_MAX_AGE,
    credentials: set["Access-Control-Allow-Credentials"]?.[0] === "true",
  };
}

function toHandler(values: CorsFormValues): HeadersHandler {
  const set: Record<string, string[]> = {
    "Access-Control-Allow-Origin": [values.origins.trim() || "*"],
    "Access-Control-Allow-Methods": [values.methods.trim() || DEFAULT_METHODS],
    "Access-Control-Allow-Headers": [values.headers.trim() || DEFAULT_HEADERS],
  };

  if (values.maxAge.trim()) {
    set["Access-Control-Max-Age"] = [values.maxAge.trim()];
  }

  if (values.exposeHeaders.trim()) {
    set["Access-Control-Expose-Headers"] = [values.exposeHeaders.trim()];
  }

  if (values.credentials) {
    set["Access-Control-Allow-Credentials"] = ["true"];
  }

  return {
    handler: "headers",
    response: { set, deferred: true },
  };
}

export function CorsForm({ value, onChange }: CorsFormProps) {
  const { t } = useTranslation("middleware");

  const form = useForm<CorsFormValues>({
    resolver: zodResolver(corsFormSchema),
    defaultValues: parseCorsFromHeaders(value),
  });

  useEffect(() => {
    form.reset(parseCorsFromHeaders(value));
  }, [value, form]);

  const credentials = form.watch("credentials");
  const origins = form.watch("origins");

  function emitChange() {
    const values = form.getValues();
    onChange(toHandler(values));
  }

  return (
    <Form {...form}>
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">{t("cors.description")}</p>

        <section className="space-y-2">
          <Label htmlFor="cors-origins" className="text-sm font-semibold">
            {t("cors.allowedOrigins")}
          </Label>
          <FormField
            control={form.control}
            name="origins"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    id="cors-origins"
                    placeholder={t("cors.originsPlaceholder")}
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
          <p className="text-xs text-muted-foreground">{t("cors.originsHint")}</p>
        </section>

        <section className="space-y-2">
          <Label htmlFor="cors-methods" className="text-sm font-semibold">
            {t("cors.allowedMethods")}
          </Label>
          <FormField
            control={form.control}
            name="methods"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    id="cors-methods"
                    placeholder={t("cors.methodsPlaceholder")}
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

        <section className="space-y-2">
          <Label htmlFor="cors-headers" className="text-sm font-semibold">
            {t("cors.allowedHeaders")}
          </Label>
          <FormField
            control={form.control}
            name="headers"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    id="cors-headers"
                    placeholder={t("cors.headersPlaceholder")}
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

        <section className="space-y-2">
          <Label htmlFor="cors-expose-headers" className="text-sm font-semibold">
            {t("cors.exposeHeaders")}
          </Label>
          <FormField
            control={form.control}
            name="exposeHeaders"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    id="cors-expose-headers"
                    placeholder={t("cors.exposeHeadersPlaceholder")}
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
          <p className="text-xs text-muted-foreground">{t("cors.exposeHeadersHint")}</p>
        </section>

        <div className="grid grid-cols-2 gap-4">
          <section className="space-y-2">
            <Label htmlFor="cors-max-age" className="text-sm font-semibold">
              {t("cors.maxAge")}
            </Label>
            <FormField
              control={form.control}
              name="maxAge"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      id="cors-max-age"
                      type="number"
                      placeholder={t("cors.maxAgePlaceholder")}
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

          <section className="flex items-end pb-1">
            <FormField
              control={form.control}
              name="credentials"
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="cors-credentials"
                    checked={field.value}
                    onChange={(e) => {
                      field.onChange(e.target.checked);
                      emitChange();
                    }}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="cors-credentials" className="font-normal text-sm">
                    {t("cors.allowCredentials")}
                  </Label>
                </div>
              )}
            />
          </section>
        </div>

        {credentials && origins === "*" && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {t("cors.credentialsWarning")}
          </p>
        )}
      </div>
    </Form>
  );
}
