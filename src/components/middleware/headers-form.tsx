/**
 * Headers middleware configuration form.
 *
 * Allows adding/setting/deleting request and response headers.
 */

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { HeaderOps, HeadersHandler, RespHeaderOps } from "@/types/handlers";

interface HeaderEntry {
  id: string;
  operation: "add" | "set" | "delete";
  name: string;
  value: string;
}

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

export function HeadersForm({ value, onChange }: HeadersFormProps) {
  const { t } = useTranslation("middleware");
  const { t: tc } = useTranslation();
  const [requestHeaders, setRequestHeaders] = useState<HeaderEntry[]>([]);
  const [responseHeaders, setResponseHeaders] = useState<HeaderEntry[]>([]);
  const [responseDeferred, setResponseDeferred] = useState(false);

  useEffect(() => {
    if (value) {
      setRequestHeaders(parseHeaderOps(value.request));
      setResponseHeaders(parseHeaderOps(value.response));
      setResponseDeferred(value.response?.deferred ?? false);
    }
  }, [value]);

  function emitChange(reqHeaders: HeaderEntry[], respHeaders: HeaderEntry[], deferred: boolean) {
    const handler: HeadersHandler = {
      handler: "headers",
    };

    const requestOps = buildHeaderOps(reqHeaders);
    if (requestOps) handler.request = requestOps;

    const responseOps = buildHeaderOps(respHeaders);
    if (responseOps) {
      const respOps: RespHeaderOps = { ...responseOps };
      if (deferred) respOps.deferred = true;
      handler.response = respOps;
    }

    onChange(handler);
  }

  function addRequestHeader() {
    const updated = [
      ...requestHeaders,
      { id: generateId(), operation: "set" as const, name: "", value: "" },
    ];
    setRequestHeaders(updated);
  }

  function addResponseHeader() {
    const updated = [
      ...responseHeaders,
      { id: generateId(), operation: "set" as const, name: "", value: "" },
    ];
    setResponseHeaders(updated);
  }

  function updateRequestHeader(id: string, field: keyof HeaderEntry, val: string) {
    const updated = requestHeaders.map((h) => (h.id === id ? { ...h, [field]: val } : h));
    setRequestHeaders(updated);
    emitChange(updated, responseHeaders, responseDeferred);
  }

  function removeRequestHeader(id: string) {
    const updated = requestHeaders.filter((h) => h.id !== id);
    setRequestHeaders(updated);
    emitChange(updated, responseHeaders, responseDeferred);
  }

  function updateResponseHeader(id: string, field: keyof HeaderEntry, val: string) {
    const updated = responseHeaders.map((h) => (h.id === id ? { ...h, [field]: val } : h));
    setResponseHeaders(updated);
    emitChange(requestHeaders, updated, responseDeferred);
  }

  function removeResponseHeader(id: string) {
    const updated = responseHeaders.filter((h) => h.id !== id);
    setResponseHeaders(updated);
    emitChange(requestHeaders, updated, responseDeferred);
  }

  function toggleDeferred(checked: boolean) {
    setResponseDeferred(checked);
    emitChange(requestHeaders, responseHeaders, checked);
  }

  return (
    <div className="space-y-5">
      {/* Request Headers */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">{t("headers.requestHeaders")}</Label>
          <Button type="button" variant="outline" size="sm" onClick={addRequestHeader}>
            <Plus className="h-3 w-3" />
            {tc("actions.add")}
          </Button>
        </div>
        {requestHeaders.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t("headers.noModifications", { type: "request" })}
          </p>
        ) : (
          <div className="space-y-2">
            {requestHeaders.map((entry) => (
              <div key={entry.id} className="flex gap-2 items-center">
                <Select
                  className="w-24 shrink-0"
                  value={entry.operation}
                  onChange={(e) => updateRequestHeader(entry.id, "operation", e.target.value)}
                >
                  <option value="set">{t("headers.set")}</option>
                  <option value="add">{t("headers.add")}</option>
                  <option value="delete">{t("headers.delete")}</option>
                </Select>
                <Input
                  placeholder={t("headers.headerName")}
                  className="flex-1"
                  value={entry.name}
                  onChange={(e) => updateRequestHeader(entry.id, "name", e.target.value)}
                />
                {entry.operation !== "delete" && (
                  <Input
                    placeholder={t("headers.value")}
                    className="flex-1"
                    value={entry.value}
                    onChange={(e) => updateRequestHeader(entry.id, "value", e.target.value)}
                  />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => removeRequestHeader(entry.id)}
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
          <Button type="button" variant="outline" size="sm" onClick={addResponseHeader}>
            <Plus className="h-3 w-3" />
            {tc("actions.add")}
          </Button>
        </div>
        {responseHeaders.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t("headers.noModifications", { type: "response" })}
          </p>
        ) : (
          <div className="space-y-2">
            {responseHeaders.map((entry) => (
              <div key={entry.id} className="flex gap-2 items-center">
                <Select
                  className="w-24 shrink-0"
                  value={entry.operation}
                  onChange={(e) => updateResponseHeader(entry.id, "operation", e.target.value)}
                >
                  <option value="set">{t("headers.set")}</option>
                  <option value="add">{t("headers.add")}</option>
                  <option value="delete">{t("headers.delete")}</option>
                </Select>
                <Input
                  placeholder={t("headers.headerName")}
                  className="flex-1"
                  value={entry.name}
                  onChange={(e) => updateResponseHeader(entry.id, "name", e.target.value)}
                />
                {entry.operation !== "delete" && (
                  <Input
                    placeholder={t("headers.value")}
                    className="flex-1"
                    value={entry.value}
                    onChange={(e) => updateResponseHeader(entry.id, "value", e.target.value)}
                  />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => removeResponseHeader(entry.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="resp-deferred"
            checked={responseDeferred}
            onChange={(e) => toggleDeferred(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          <Label htmlFor="resp-deferred" className="font-normal text-xs">
            {t("headers.deferred")}
          </Label>
        </div>
      </section>
    </div>
  );
}
