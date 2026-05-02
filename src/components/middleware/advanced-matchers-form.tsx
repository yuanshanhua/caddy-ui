/**
 * Advanced matchers form for route configuration.
 *
 * Adds header, query, and remote_ip matchers beyond the basic host/path/method.
 */

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RequestMatcher } from "@/types/matchers";

interface HeaderMatchEntry {
  id: string;
  name: string;
  value: string;
}

interface QueryMatchEntry {
  id: string;
  name: string;
  value: string;
}

interface AdvancedMatchersFormProps {
  value?: RequestMatcher;
  onChange: (matcher: Partial<RequestMatcher>) => void;
}

let nextId = 0;
function generateId(): string {
  return `matcher-${++nextId}-${Date.now()}`;
}

export function AdvancedMatchersForm({ value, onChange }: AdvancedMatchersFormProps) {
  const [headerMatches, setHeaderMatches] = useState<HeaderMatchEntry[]>([]);
  const [queryMatches, setQueryMatches] = useState<QueryMatchEntry[]>([]);
  const [remoteIpRanges, setRemoteIpRanges] = useState("");
  const [remoteIpForwarded, setRemoteIpForwarded] = useState(false);
  const [protocol, setProtocol] = useState("");

  useEffect(() => {
    if (!value) return;

    // Parse header matchers
    if (value.header) {
      const entries: HeaderMatchEntry[] = [];
      for (const [name, values] of Object.entries(value.header)) {
        for (const val of values) {
          entries.push({ id: generateId(), name, value: val });
        }
      }
      setHeaderMatches(entries);
    }

    // Parse query matchers
    if (value.query) {
      const entries: QueryMatchEntry[] = [];
      for (const [name, values] of Object.entries(value.query)) {
        for (const val of values) {
          entries.push({ id: generateId(), name, value: val });
        }
      }
      setQueryMatches(entries);
    }

    // Parse remote_ip
    if (value.remote_ip) {
      setRemoteIpRanges(value.remote_ip.ranges?.join(", ") ?? "");
      setRemoteIpForwarded(value.remote_ip.forwarded ?? false);
    }

    // Parse protocol
    setProtocol(value.protocol ?? "");
  }, [value]);

  function emitChange(
    headers: HeaderMatchEntry[],
    queries: QueryMatchEntry[],
    ipRanges: string,
    ipForwarded: boolean,
    proto: string,
  ) {
    const matcher: Partial<RequestMatcher> = {};

    // Build header matcher
    const validHeaders = headers.filter((h) => h.name.trim());
    if (validHeaders.length > 0) {
      const headerMap: Record<string, string[]> = {};
      for (const h of validHeaders) {
        const existing = headerMap[h.name];
        if (!existing) {
          headerMap[h.name] = [h.value];
        } else {
          existing.push(h.value);
        }
      }
      matcher.header = headerMap;
    }

    // Build query matcher
    const validQueries = queries.filter((q) => q.name.trim());
    if (validQueries.length > 0) {
      const queryMap: Record<string, string[]> = {};
      for (const q of validQueries) {
        const existing = queryMap[q.name];
        if (!existing) {
          queryMap[q.name] = [q.value];
        } else {
          existing.push(q.value);
        }
      }
      matcher.query = queryMap;
    }

    // Build remote_ip matcher
    if (ipRanges.trim()) {
      matcher.remote_ip = {
        ranges: ipRanges
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean),
      };
      if (ipForwarded) {
        matcher.remote_ip.forwarded = true;
      }
    }

    // Protocol matcher
    if (proto.trim()) {
      matcher.protocol = proto.trim();
    }

    onChange(matcher);
  }

  // --- Header matchers ---
  function addHeaderMatch() {
    const updated = [...headerMatches, { id: generateId(), name: "", value: "" }];
    setHeaderMatches(updated);
  }

  function updateHeaderMatch(id: string, field: "name" | "value", val: string) {
    const updated = headerMatches.map((h) => (h.id === id ? { ...h, [field]: val } : h));
    setHeaderMatches(updated);
    emitChange(updated, queryMatches, remoteIpRanges, remoteIpForwarded, protocol);
  }

  function removeHeaderMatch(id: string) {
    const updated = headerMatches.filter((h) => h.id !== id);
    setHeaderMatches(updated);
    emitChange(updated, queryMatches, remoteIpRanges, remoteIpForwarded, protocol);
  }

  // --- Query matchers ---
  function addQueryMatch() {
    const updated = [...queryMatches, { id: generateId(), name: "", value: "" }];
    setQueryMatches(updated);
  }

  function updateQueryMatch(id: string, field: "name" | "value", val: string) {
    const updated = queryMatches.map((q) => (q.id === id ? { ...q, [field]: val } : q));
    setQueryMatches(updated);
    emitChange(headerMatches, updated, remoteIpRanges, remoteIpForwarded, protocol);
  }

  function removeQueryMatch(id: string) {
    const updated = queryMatches.filter((q) => q.id !== id);
    setQueryMatches(updated);
    emitChange(headerMatches, updated, remoteIpRanges, remoteIpForwarded, protocol);
  }

  // --- Remote IP ---
  function handleIpRangesChange(val: string) {
    setRemoteIpRanges(val);
    emitChange(headerMatches, queryMatches, val, remoteIpForwarded, protocol);
  }

  function handleIpForwardedChange(checked: boolean) {
    setRemoteIpForwarded(checked);
    emitChange(headerMatches, queryMatches, remoteIpRanges, checked, protocol);
  }

  // --- Protocol ---
  function handleProtocolChange(val: string) {
    setProtocol(val);
    emitChange(headerMatches, queryMatches, remoteIpRanges, remoteIpForwarded, val);
  }

  return (
    <div className="space-y-5">
      {/* Header matchers */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Header Matchers</Label>
          <Button type="button" variant="outline" size="sm" onClick={addHeaderMatch}>
            <Plus className="h-3 w-3" />
            Add
          </Button>
        </div>
        {headerMatches.length === 0 ? (
          <p className="text-xs text-muted-foreground">No header matchers configured.</p>
        ) : (
          <div className="space-y-2">
            {headerMatches.map((entry) => (
              <div key={entry.id} className="flex gap-2 items-center">
                <Input
                  placeholder="Header name"
                  className="flex-1"
                  value={entry.name}
                  onChange={(e) => updateHeaderMatch(entry.id, "name", e.target.value)}
                />
                <Input
                  placeholder="Value (or * for any)"
                  className="flex-1"
                  value={entry.value}
                  onChange={(e) => updateHeaderMatch(entry.id, "value", e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => removeHeaderMatch(entry.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Query matchers */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Query Parameter Matchers</Label>
          <Button type="button" variant="outline" size="sm" onClick={addQueryMatch}>
            <Plus className="h-3 w-3" />
            Add
          </Button>
        </div>
        {queryMatches.length === 0 ? (
          <p className="text-xs text-muted-foreground">No query parameter matchers configured.</p>
        ) : (
          <div className="space-y-2">
            {queryMatches.map((entry) => (
              <div key={entry.id} className="flex gap-2 items-center">
                <Input
                  placeholder="Parameter name"
                  className="flex-1"
                  value={entry.name}
                  onChange={(e) => updateQueryMatch(entry.id, "name", e.target.value)}
                />
                <Input
                  placeholder="Value"
                  className="flex-1"
                  value={entry.value}
                  onChange={(e) => updateQueryMatch(entry.id, "value", e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => removeQueryMatch(entry.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Remote IP */}
      <section className="space-y-3">
        <Label className="text-sm font-semibold">Remote IP</Label>
        <div className="space-y-2">
          <Input
            placeholder="192.168.1.0/24, 10.0.0.0/8"
            value={remoteIpRanges}
            onChange={(e) => handleIpRangesChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            CIDR ranges (comma-separated). Leave empty to skip IP matching.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ip-forwarded"
              checked={remoteIpForwarded}
              onChange={(e) => handleIpForwardedChange(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="ip-forwarded" className="font-normal text-xs">
              Use X-Forwarded-For header (for proxied requests)
            </Label>
          </div>
        </div>
      </section>

      {/* Protocol */}
      <section className="space-y-2">
        <Label htmlFor="matcher-protocol" className="text-sm font-semibold">
          Protocol (optional)
        </Label>
        <Input
          id="matcher-protocol"
          placeholder="https"
          value={protocol}
          onChange={(e) => handleProtocolChange(e.target.value)}
          className="max-w-xs"
        />
        <p className="text-xs text-muted-foreground">
          Match only requests with this protocol (http or https).
        </p>
      </section>
    </div>
  );
}
