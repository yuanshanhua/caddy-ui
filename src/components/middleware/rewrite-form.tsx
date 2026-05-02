/**
 * URI Rewrite handler configuration form.
 *
 * Supports full URI rewrite, strip prefix/suffix, substring, and path_regexp.
 */

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { RewriteHandler } from "@/types/handlers";

type RewriteMode = "uri" | "strip_prefix" | "strip_suffix" | "substring" | "path_regexp";

interface SubstringEntry {
  id: string;
  find: string;
  replace: string;
}

interface RewriteFormProps {
  value?: RewriteHandler;
  onChange: (handler: RewriteHandler) => void;
}

let nextId = 0;
function generateId(): string {
  return `rewrite-${++nextId}-${Date.now()}`;
}

export function RewriteForm({ value, onChange }: RewriteFormProps) {
  const [mode, setMode] = useState<RewriteMode>("uri");
  const [uri, setUri] = useState("");
  const [stripPrefix, setStripPrefix] = useState("");
  const [stripSuffix, setStripSuffix] = useState("");
  const [substrings, setSubstrings] = useState<SubstringEntry[]>([]);
  const [regexpFind, setRegexpFind] = useState("");
  const [regexpReplace, setRegexpReplace] = useState("");
  const [method, setMethod] = useState("");

  useEffect(() => {
    if (!value) return;

    setMethod(value.method ?? "");

    if (value.uri) {
      setMode("uri");
      setUri(value.uri);
    } else if (value.strip_path_prefix) {
      setMode("strip_prefix");
      setStripPrefix(value.strip_path_prefix);
    } else if (value.strip_path_suffix) {
      setMode("strip_suffix");
      setStripSuffix(value.strip_path_suffix);
    } else if (value.uri_substring && value.uri_substring.length > 0) {
      setMode("substring");
      setSubstrings(
        value.uri_substring.map((s) => ({
          id: generateId(),
          find: s.find,
          replace: s.replace,
        })),
      );
    } else if (value.path_regexp && value.path_regexp.length > 0) {
      setMode("path_regexp");
      setRegexpFind(value.path_regexp[0]?.find ?? "");
      setRegexpReplace(value.path_regexp[0]?.replace ?? "");
    }
  }, [value]);

  function emitChange(
    m: RewriteMode,
    u: string,
    sp: string,
    ss: string,
    subs: SubstringEntry[],
    rf: string,
    rr: string,
    meth: string,
  ) {
    const handler: RewriteHandler = {
      handler: "rewrite",
    };

    if (meth.trim()) handler.method = meth.trim().toUpperCase();

    switch (m) {
      case "uri":
        if (u.trim()) handler.uri = u.trim();
        break;
      case "strip_prefix":
        if (sp.trim()) handler.strip_path_prefix = sp.trim();
        break;
      case "strip_suffix":
        if (ss.trim()) handler.strip_path_suffix = ss.trim();
        break;
      case "substring": {
        const validSubs = subs
          .filter((s) => s.find.trim())
          .map((s) => ({ find: s.find, replace: s.replace }));
        if (validSubs.length > 0) handler.uri_substring = validSubs;
        break;
      }
      case "path_regexp":
        if (rf.trim()) {
          handler.path_regexp = [{ find: rf, replace: rr }];
        }
        break;
    }

    onChange(handler);
  }

  function handleModeChange(newMode: RewriteMode) {
    setMode(newMode);
    emitChange(
      newMode,
      uri,
      stripPrefix,
      stripSuffix,
      substrings,
      regexpFind,
      regexpReplace,
      method,
    );
  }

  function handleUriChange(val: string) {
    setUri(val);
    emitChange(mode, val, stripPrefix, stripSuffix, substrings, regexpFind, regexpReplace, method);
  }

  function handleStripPrefixChange(val: string) {
    setStripPrefix(val);
    emitChange(mode, uri, val, stripSuffix, substrings, regexpFind, regexpReplace, method);
  }

  function handleStripSuffixChange(val: string) {
    setStripSuffix(val);
    emitChange(mode, uri, stripPrefix, val, substrings, regexpFind, regexpReplace, method);
  }

  function handleMethodChange(val: string) {
    setMethod(val);
    emitChange(mode, uri, stripPrefix, stripSuffix, substrings, regexpFind, regexpReplace, val);
  }

  function addSubstring() {
    const updated = [...substrings, { id: generateId(), find: "", replace: "" }];
    setSubstrings(updated);
  }

  function updateSubstring(id: string, field: "find" | "replace", val: string) {
    const updated = substrings.map((s) => (s.id === id ? { ...s, [field]: val } : s));
    setSubstrings(updated);
    emitChange(mode, uri, stripPrefix, stripSuffix, updated, regexpFind, regexpReplace, method);
  }

  function removeSubstring(id: string) {
    const updated = substrings.filter((s) => s.id !== id);
    setSubstrings(updated);
    emitChange(mode, uri, stripPrefix, stripSuffix, updated, regexpFind, regexpReplace, method);
  }

  function handleRegexpFindChange(val: string) {
    setRegexpFind(val);
    emitChange(mode, uri, stripPrefix, stripSuffix, substrings, val, regexpReplace, method);
  }

  function handleRegexpReplaceChange(val: string) {
    setRegexpReplace(val);
    emitChange(mode, uri, stripPrefix, stripSuffix, substrings, regexpFind, val, method);
  }

  return (
    <div className="space-y-4">
      {/* Rewrite mode */}
      <section className="space-y-2">
        <Label className="text-sm font-semibold">Rewrite Mode</Label>
        <Select value={mode} onChange={(e) => handleModeChange(e.target.value as RewriteMode)}>
          <option value="uri">Full URI replacement</option>
          <option value="strip_prefix">Strip path prefix</option>
          <option value="strip_suffix">Strip path suffix</option>
          <option value="substring">Substring replacement</option>
          <option value="path_regexp">Path regex replacement</option>
        </Select>
      </section>

      {/* Mode-specific fields */}
      {mode === "uri" && (
        <section className="space-y-2">
          <Label htmlFor="rewrite-uri">New URI</Label>
          <Input
            id="rewrite-uri"
            placeholder="/new-path{uri}"
            value={uri}
            onChange={(e) => handleUriChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Supports placeholders like <code className="bg-muted px-1 rounded">{"{uri}"}</code>,{" "}
            <code className="bg-muted px-1 rounded">{"{path}"}</code>,{" "}
            <code className="bg-muted px-1 rounded">{"{query}"}</code>
          </p>
        </section>
      )}

      {mode === "strip_prefix" && (
        <section className="space-y-2">
          <Label htmlFor="rewrite-strip-prefix">Path Prefix to Strip</Label>
          <Input
            id="rewrite-strip-prefix"
            placeholder="/api/v1"
            value={stripPrefix}
            onChange={(e) => handleStripPrefixChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Removes this prefix from the request path before passing to the handler.
          </p>
        </section>
      )}

      {mode === "strip_suffix" && (
        <section className="space-y-2">
          <Label htmlFor="rewrite-strip-suffix">Path Suffix to Strip</Label>
          <Input
            id="rewrite-strip-suffix"
            placeholder=".html"
            value={stripSuffix}
            onChange={(e) => handleStripSuffixChange(e.target.value)}
          />
        </section>
      )}

      {mode === "substring" && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Substring Replacements</Label>
            <Button type="button" variant="outline" size="sm" onClick={addSubstring}>
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </div>
          {substrings.map((sub) => (
            <div key={sub.id} className="flex gap-2 items-center">
              <Input
                placeholder="Find"
                className="flex-1"
                value={sub.find}
                onChange={(e) => updateSubstring(sub.id, "find", e.target.value)}
              />
              <span className="text-xs text-muted-foreground shrink-0">→</span>
              <Input
                placeholder="Replace"
                className="flex-1"
                value={sub.replace}
                onChange={(e) => updateSubstring(sub.id, "replace", e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => removeSubstring(sub.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {substrings.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Click &quot;Add&quot; to add a substring replacement.
            </p>
          )}
        </section>
      )}

      {mode === "path_regexp" && (
        <section className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="rewrite-regexp-find">Regex Pattern</Label>
            <Input
              id="rewrite-regexp-find"
              placeholder="^/old/(.*)"
              value={regexpFind}
              onChange={(e) => handleRegexpFindChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rewrite-regexp-replace">Replacement</Label>
            <Input
              id="rewrite-regexp-replace"
              placeholder="/new/$1"
              value={regexpReplace}
              onChange={(e) => handleRegexpReplaceChange(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Uses Go regular expression syntax. Capture groups are referenced with $1, $2, etc.
          </p>
        </section>
      )}

      {/* Method override */}
      <section className="space-y-2">
        <Label htmlFor="rewrite-method">Method Override (optional)</Label>
        <Input
          id="rewrite-method"
          placeholder="GET"
          value={method}
          onChange={(e) => handleMethodChange(e.target.value)}
          className="max-w-xs"
        />
        <p className="text-xs text-muted-foreground">Optionally change the request HTTP method.</p>
      </section>
    </div>
  );
}
