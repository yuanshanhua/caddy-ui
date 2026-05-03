/**
 * Basic Authentication configuration form.
 *
 * Manages user accounts with bcrypt password hashing.
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
import {
  type BasicAuthFormValues,
  basicAuthFormDefaults,
  basicAuthFormSchema,
} from "@/lib/schemas/middleware";
import type { AuthenticationHandler, BasicAuthAccount } from "@/types/handlers";

interface BasicAuthFormProps {
  value?: AuthenticationHandler;
  onChange: (handler: AuthenticationHandler) => void;
}

let nextId = 0;
function generateId(): string {
  return `auth-${++nextId}-${Date.now()}`;
}

function isBcryptHash(str: string): boolean {
  return /^\$2[aby]?\$\d{2}\$.{53}$/.test(str);
}

function parseInitialValues(handler: AuthenticationHandler | undefined): BasicAuthFormValues {
  if (!handler?.providers?.http_basic) return basicAuthFormDefaults;

  const basic = handler.providers.http_basic;
  const parsed =
    basic.accounts?.map((acc) => ({
      id: generateId(),
      username: acc.username,
      password: acc.password,
      isHashed: isBcryptHash(acc.password),
    })) ?? [];

  return {
    accounts:
      parsed.length > 0
        ? parsed
        : [{ id: generateId(), username: "", password: "", isHashed: false }],
    realm: basic.realm ?? "",
  };
}

function toHandler(values: BasicAuthFormValues): AuthenticationHandler {
  const validAccounts: BasicAuthAccount[] = values.accounts
    .filter((a) => a.username.trim() && a.password.trim())
    .map((a) => ({
      username: a.username.trim(),
      password: a.password,
    }));

  return {
    handler: "authentication",
    providers: {
      http_basic: {
        hash: { algorithm: "bcrypt" },
        accounts: validAccounts,
        ...(values.realm.trim() ? { realm: values.realm.trim() } : {}),
      },
    },
  };
}

export function BasicAuthForm({ value, onChange }: BasicAuthFormProps) {
  const { t } = useTranslation("middleware");

  const form = useForm<BasicAuthFormValues>({
    resolver: zodResolver(basicAuthFormSchema),
    defaultValues: parseInitialValues(value),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "accounts",
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

  function emitChange() {
    isInternalChange.current = true;
    const values = form.getValues();
    onChange(toHandler(values));
  }

  return (
    <Form {...form}>
      <div className="space-y-5">
        {/* Realm */}
        <section className="space-y-2">
          <Label htmlFor="auth-realm" className="text-sm font-semibold">
            {t("basicAuth.realm")}
          </Label>
          <FormField
            control={form.control}
            name="realm"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    id="auth-realm"
                    placeholder={t("basicAuth.realmPlaceholder")}
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
          <p className="text-xs text-muted-foreground">{t("basicAuth.realmHint")}</p>
        </section>

        {/* Accounts */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">{t("basicAuth.accounts")}</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                append({ id: generateId(), username: "", password: "", isHashed: false });
              }}
            >
              <Plus className="h-3 w-3" />
              {t("basicAuth.addAccount")}
            </Button>
          </div>
          <div className="space-y-2">
            {fields.map((field, idx) => {
              const isHashed = form.watch(`accounts.${idx}.isHashed`);
              return (
                <div key={field.id} className="flex gap-2 items-center">
                  <FormField
                    control={form.control}
                    name={`accounts.${idx}.username`}
                    render={({ field: f }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            placeholder={t("basicAuth.username")}
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
                    name={`accounts.${idx}.password`}
                    render={({ field: f }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder={
                                isHashed ? t("basicAuth.bcryptHash") : t("basicAuth.password")
                              }
                              type={isHashed ? "text" : "password"}
                              {...f}
                              onChange={(e) => {
                                f.onChange(e);
                                // Update isHashed flag
                                form.setValue(
                                  `accounts.${idx}.isHashed`,
                                  isBcryptHash(e.target.value),
                                );
                                emitChange();
                              }}
                            />
                            {isHashed && (
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                {t("basicAuth.hashed")}
                              </span>
                            )}
                          </div>
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
                      if (fields.length > 1) {
                        remove(idx);
                      } else {
                        form.setValue("accounts.0", {
                          id: generateId(),
                          username: "",
                          password: "",
                          isHashed: false,
                        });
                      }
                      emitChange();
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">{t("basicAuth.passwordHint")}</p>
        </section>
      </div>
    </Form>
  );
}
