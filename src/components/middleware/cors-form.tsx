/**
 * CORS quick-configuration form.
 *
 * Generates a headers middleware handler with proper CORS headers.
 */

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HeadersHandler } from "@/types/handlers";

interface CorsFormProps {
  value?: HeadersHandler;
  onChange: (handler: HeadersHandler) => void;
}

const DEFAULT_METHODS = "GET, POST, PUT, DELETE, OPTIONS";
const DEFAULT_HEADERS = "Content-Type, Authorization";
const DEFAULT_MAX_AGE = "86400";

/**
 * Try to parse CORS settings from a headers handler.
 */
function parseCorsFromHeaders(handler: HeadersHandler | undefined): {
  origins: string;
  methods: string;
  headers: string;
  exposeHeaders: string;
  maxAge: string;
  credentials: boolean;
} {
  const defaults = {
    origins: "*",
    methods: DEFAULT_METHODS,
    headers: DEFAULT_HEADERS,
    exposeHeaders: "",
    maxAge: DEFAULT_MAX_AGE,
    credentials: false,
  };

  if (!handler?.response?.set) return defaults;

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

export function CorsForm({ value, onChange }: CorsFormProps) {
  const [origins, setOrigins] = useState("*");
  const [methods, setMethods] = useState(DEFAULT_METHODS);
  const [headers, setHeaders] = useState(DEFAULT_HEADERS);
  const [exposeHeaders, setExposeHeaders] = useState("");
  const [maxAge, setMaxAge] = useState(DEFAULT_MAX_AGE);
  const [credentials, setCredentials] = useState(false);

  useEffect(() => {
    const parsed = parseCorsFromHeaders(value);
    setOrigins(parsed.origins);
    setMethods(parsed.methods);
    setHeaders(parsed.headers);
    setExposeHeaders(parsed.exposeHeaders);
    setMaxAge(parsed.maxAge);
    setCredentials(parsed.credentials);
  }, [value]);

  function emitChange(o: string, m: string, h: string, eh: string, ma: string, creds: boolean) {
    const set: Record<string, string[]> = {
      "Access-Control-Allow-Origin": [o.trim() || "*"],
      "Access-Control-Allow-Methods": [m.trim() || DEFAULT_METHODS],
      "Access-Control-Allow-Headers": [h.trim() || DEFAULT_HEADERS],
    };

    if (ma.trim()) {
      set["Access-Control-Max-Age"] = [ma.trim()];
    }

    if (eh.trim()) {
      set["Access-Control-Expose-Headers"] = [eh.trim()];
    }

    if (creds) {
      set["Access-Control-Allow-Credentials"] = ["true"];
    }

    const handler: HeadersHandler = {
      handler: "headers",
      response: {
        set,
        deferred: true,
      },
    };

    onChange(handler);
  }

  function handleOriginsChange(val: string) {
    setOrigins(val);
    emitChange(val, methods, headers, exposeHeaders, maxAge, credentials);
  }

  function handleMethodsChange(val: string) {
    setMethods(val);
    emitChange(origins, val, headers, exposeHeaders, maxAge, credentials);
  }

  function handleHeadersChange(val: string) {
    setHeaders(val);
    emitChange(origins, methods, val, exposeHeaders, maxAge, credentials);
  }

  function handleExposeHeadersChange(val: string) {
    setExposeHeaders(val);
    emitChange(origins, methods, headers, val, maxAge, credentials);
  }

  function handleMaxAgeChange(val: string) {
    setMaxAge(val);
    emitChange(origins, methods, headers, exposeHeaders, val, credentials);
  }

  function handleCredentialsChange(checked: boolean) {
    setCredentials(checked);
    emitChange(origins, methods, headers, exposeHeaders, maxAge, checked);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Quickly configure CORS response headers. This generates a headers middleware handler.
      </p>

      <section className="space-y-2">
        <Label htmlFor="cors-origins" className="text-sm font-semibold">
          Allowed Origins
        </Label>
        <Input
          id="cors-origins"
          placeholder="* or https://example.com"
          value={origins}
          onChange={(e) => handleOriginsChange(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Use * for any origin, or specify exact origins (comma-separated).
        </p>
      </section>

      <section className="space-y-2">
        <Label htmlFor="cors-methods" className="text-sm font-semibold">
          Allowed Methods
        </Label>
        <Input
          id="cors-methods"
          placeholder={DEFAULT_METHODS}
          value={methods}
          onChange={(e) => handleMethodsChange(e.target.value)}
        />
      </section>

      <section className="space-y-2">
        <Label htmlFor="cors-headers" className="text-sm font-semibold">
          Allowed Headers
        </Label>
        <Input
          id="cors-headers"
          placeholder={DEFAULT_HEADERS}
          value={headers}
          onChange={(e) => handleHeadersChange(e.target.value)}
        />
      </section>

      <section className="space-y-2">
        <Label htmlFor="cors-expose-headers" className="text-sm font-semibold">
          Expose Headers (optional)
        </Label>
        <Input
          id="cors-expose-headers"
          placeholder="X-Request-Id, X-Total-Count"
          value={exposeHeaders}
          onChange={(e) => handleExposeHeadersChange(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Headers the client is allowed to access from the response.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <section className="space-y-2">
          <Label htmlFor="cors-max-age" className="text-sm font-semibold">
            Max Age (seconds)
          </Label>
          <Input
            id="cors-max-age"
            type="number"
            placeholder="86400"
            value={maxAge}
            onChange={(e) => handleMaxAgeChange(e.target.value)}
          />
        </section>

        <section className="flex items-end pb-1">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="cors-credentials"
              checked={credentials}
              onChange={(e) => handleCredentialsChange(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="cors-credentials" className="font-normal text-sm">
              Allow Credentials
            </Label>
          </div>
        </section>
      </div>

      {credentials && origins === "*" && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Warning: credentials with &quot;*&quot; origin is not allowed by browsers. Specify exact
          origins instead.
        </p>
      )}
    </div>
  );
}
