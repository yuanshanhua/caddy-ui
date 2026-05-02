/**
 * Basic Authentication configuration form.
 *
 * Manages user accounts with bcrypt password hashing.
 */

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthenticationHandler, BasicAuthAccount } from "@/types/handlers";

interface AccountEntry {
  id: string;
  username: string;
  password: string;
  isHashed: boolean;
}

interface BasicAuthFormProps {
  value?: AuthenticationHandler;
  onChange: (handler: AuthenticationHandler) => void;
}

let nextId = 0;
function generateId(): string {
  return `auth-${++nextId}-${Date.now()}`;
}

/**
 * Detect if a password string looks like a bcrypt hash.
 */
function isBcryptHash(str: string): boolean {
  return /^\$2[aby]?\$\d{2}\$.{53}$/.test(str);
}

export function BasicAuthForm({ value, onChange }: BasicAuthFormProps) {
  const [accounts, setAccounts] = useState<AccountEntry[]>([]);
  const [realm, setRealm] = useState("");

  useEffect(() => {
    if (value?.providers?.http_basic) {
      const basic = value.providers.http_basic;
      setRealm(basic.realm ?? "");
      const parsed =
        basic.accounts?.map((acc) => ({
          id: generateId(),
          username: acc.username,
          password: acc.password,
          isHashed: isBcryptHash(acc.password),
        })) ?? [];
      setAccounts(
        parsed.length > 0
          ? parsed
          : [{ id: generateId(), username: "", password: "", isHashed: false }],
      );
    } else {
      setAccounts([{ id: generateId(), username: "", password: "", isHashed: false }]);
      setRealm("");
    }
  }, [value]);

  function emitChange(accs: AccountEntry[], r: string) {
    const validAccounts: BasicAuthAccount[] = accs
      .filter((a) => a.username.trim() && a.password.trim())
      .map((a) => ({
        username: a.username.trim(),
        password: a.password,
      }));

    const handler: AuthenticationHandler = {
      handler: "authentication",
      providers: {
        http_basic: {
          hash: { algorithm: "bcrypt" },
          accounts: validAccounts,
          ...(r.trim() ? { realm: r.trim() } : {}),
        },
      },
    };

    onChange(handler);
  }

  function addAccount() {
    const updated = [
      ...accounts,
      { id: generateId(), username: "", password: "", isHashed: false },
    ];
    setAccounts(updated);
  }

  function removeAccount(id: string) {
    const updated = accounts.filter((a) => a.id !== id);
    setAccounts(
      updated.length > 0
        ? updated
        : [{ id: generateId(), username: "", password: "", isHashed: false }],
    );
    emitChange(
      updated.length > 0
        ? updated
        : [{ id: generateId(), username: "", password: "", isHashed: false }],
      realm,
    );
  }

  function updateAccount(id: string, field: "username" | "password", val: string) {
    const updated = accounts.map((a) =>
      a.id === id
        ? { ...a, [field]: val, ...(field === "password" ? { isHashed: isBcryptHash(val) } : {}) }
        : a,
    );
    setAccounts(updated);
    emitChange(updated, realm);
  }

  function handleRealmChange(val: string) {
    setRealm(val);
    emitChange(accounts, val);
  }

  return (
    <div className="space-y-5">
      {/* Realm */}
      <section className="space-y-2">
        <Label htmlFor="auth-realm" className="text-sm font-semibold">
          Realm (optional)
        </Label>
        <Input
          id="auth-realm"
          placeholder="Restricted Area"
          value={realm}
          onChange={(e) => handleRealmChange(e.target.value)}
          className="max-w-xs"
        />
        <p className="text-xs text-muted-foreground">
          Displayed in the browser&apos;s authentication prompt.
        </p>
      </section>

      {/* Accounts */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Accounts</Label>
          <Button type="button" variant="outline" size="sm" onClick={addAccount}>
            <Plus className="h-3 w-3" />
            Add Account
          </Button>
        </div>
        <div className="space-y-2">
          {accounts.map((account) => (
            <div key={account.id} className="flex gap-2 items-center">
              <Input
                placeholder="Username"
                className="flex-1"
                value={account.username}
                onChange={(e) => updateAccount(account.id, "username", e.target.value)}
              />
              <div className="flex-1 relative">
                <Input
                  placeholder={
                    account.isHashed ? "Bcrypt hash" : "Password (plaintext or bcrypt hash)"
                  }
                  className="flex-1"
                  value={account.password}
                  onChange={(e) => updateAccount(account.id, "password", e.target.value)}
                  type={account.isHashed ? "text" : "password"}
                />
                {account.isHashed && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    hashed
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => removeAccount(account.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Passwords should be bcrypt hashes. Use{" "}
          <code className="bg-muted px-1 rounded">caddy hash-password</code> to generate hashes.
          Plaintext passwords will NOT work with Caddy directly.
        </p>
      </section>
    </div>
  );
}
