/**
 * Basic Auth handler converter: Caddy JSON ↔ form values.
 */

import { type BasicAuthFormValues, basicAuthFormDefaults } from "@/lib/schemas/middleware";
import type { AuthenticationHandler, BasicAuthAccount } from "@/types/handlers";

let nextId = 0;
export function generateId(): string {
  return `auth-${++nextId}-${Date.now()}`;
}

export function isBcryptHash(value: string): boolean {
  return /^\$2[aby]?\$/.test(value);
}

export function parseBasicAuth(handler: AuthenticationHandler | undefined): BasicAuthFormValues {
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

export function toBasicAuth(
  values: BasicAuthFormValues,
  original?: AuthenticationHandler,
): AuthenticationHandler {
  const validAccounts: BasicAuthAccount[] = values.accounts
    .filter((a) => a.username.trim() && a.password.trim())
    .map((a) => ({
      username: a.username.trim(),
      password: a.password,
    }));

  // Preserve the original hash config if present, otherwise default to bcrypt
  const originalBasic = original?.providers?.http_basic;
  const hash = originalBasic?.hash ?? { algorithm: "bcrypt" };

  const httpBasic = {
    ...originalBasic,
    hash,
    accounts: validAccounts,
    realm: values.realm.trim() || undefined,
  };

  return {
    ...original,
    handler: "authentication",
    providers: {
      ...original?.providers,
      http_basic: httpBasic,
    },
  };
}
