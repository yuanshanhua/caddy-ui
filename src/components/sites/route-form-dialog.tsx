/**
 * Dialog for creating/editing a route within a server.
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { HttpHandler } from "@/types/handlers";
import type { HttpRoute } from "@/types/http-app";
import type { RequestMatcher } from "@/types/matchers";
import { useEffect, useState } from "react";

interface RouteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (route: HttpRoute) => void;
  loading?: boolean;
  initialRoute?: HttpRoute;
}

type HandlerType = "reverse_proxy" | "file_server" | "static_response" | "redir";

const HANDLER_OPTIONS: Array<{ value: HandlerType; label: string }> = [
  { value: "reverse_proxy", label: "Reverse Proxy" },
  { value: "file_server", label: "File Server" },
  { value: "static_response", label: "Static Response" },
  { value: "redir", label: "Redirect" },
];

export function RouteFormDialog({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
  initialRoute,
}: RouteFormDialogProps) {
  const isEdit = !!initialRoute;

  // Matcher state
  const [hosts, setHosts] = useState("");
  const [paths, setPaths] = useState("");
  const [methods, setMethods] = useState("");

  // Handler state
  const [handlerType, setHandlerType] = useState<HandlerType>("reverse_proxy");
  const [proxyUpstreams, setProxyUpstreams] = useState("");
  const [fileRoot, setFileRoot] = useState("");
  const [staticBody, setStaticBody] = useState("");
  const [staticStatus, setStaticStatus] = useState("200");
  const [redirUrl, setRedirUrl] = useState("");
  const [redirStatus, setRedirStatus] = useState("302");

  const [terminal, setTerminal] = useState(true);

  useEffect(() => {
    if (open && initialRoute) {
      // Parse matchers
      const firstMatch = initialRoute.match?.[0];
      setHosts(firstMatch?.host?.join(", ") ?? "");
      setPaths(firstMatch?.path?.join(", ") ?? "");
      setMethods(firstMatch?.method?.join(", ") ?? "");

      // Parse handler
      const handler = initialRoute.handle?.[0];
      if (handler) {
        if (handler.handler === "reverse_proxy") {
          setHandlerType("reverse_proxy");
          const rp = handler as { upstreams?: Array<{ dial?: string }> };
          setProxyUpstreams(rp.upstreams?.map((u) => u.dial ?? "").join(", ") ?? "");
        } else if (handler.handler === "file_server") {
          setHandlerType("file_server");
          const fs = handler as { root?: string };
          setFileRoot(fs.root ?? "");
        } else if (handler.handler === "static_response") {
          // Check if it's a redirect (has Location header)
          const sr = handler as {
            headers?: Record<string, string[]>;
            status_code?: string | number;
            body?: string;
          };
          if (sr.headers?.["Location"]) {
            setHandlerType("redir");
            setRedirUrl(sr.headers["Location"]?.[0] ?? "");
            setRedirStatus(String(sr.status_code ?? "302"));
          } else {
            setHandlerType("static_response");
            setStaticBody(sr.body ?? "");
            setStaticStatus(String(sr.status_code ?? "200"));
          }
        }
      }

      setTerminal(initialRoute.terminal ?? true);
    } else if (open) {
      // Reset for new route
      setHosts("");
      setPaths("");
      setMethods("");
      setHandlerType("reverse_proxy");
      setProxyUpstreams("localhost:3000");
      setFileRoot("");
      setStaticBody("");
      setStaticStatus("200");
      setRedirUrl("");
      setRedirStatus("302");
      setTerminal(true);
    }
  }, [open, initialRoute]);

  function buildMatcher(): RequestMatcher[] | undefined {
    const matcher: RequestMatcher = {};
    let hasMatcher = false;

    if (hosts.trim()) {
      matcher.host = hosts
        .split(",")
        .map((h) => h.trim())
        .filter(Boolean);
      hasMatcher = true;
    }
    if (paths.trim()) {
      matcher.path = paths
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      hasMatcher = true;
    }
    if (methods.trim()) {
      matcher.method = methods
        .split(",")
        .map((m) => m.trim().toUpperCase())
        .filter(Boolean);
      hasMatcher = true;
    }

    return hasMatcher ? [matcher] : undefined;
  }

  function buildHandler(): HttpHandler[] {
    switch (handlerType) {
      case "reverse_proxy": {
        const upstreams = proxyUpstreams
          .split(",")
          .map((u) => u.trim())
          .filter(Boolean)
          .map((dial) => ({ dial }));
        return [{ handler: "reverse_proxy" as const, upstreams }];
      }
      case "file_server":
        return [{ handler: "file_server" as const, root: fileRoot || undefined }];
      case "static_response":
        return [
          {
            handler: "static_response" as const,
            status_code: staticStatus,
            body: staticBody || undefined,
          },
        ];
      case "redir":
        return [
          {
            handler: "static_response" as const,
            status_code: redirStatus,
            headers: { Location: [redirUrl] },
          },
        ];
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const route: HttpRoute = {
      match: buildMatcher(),
      handle: buildHandler(),
      terminal,
    };

    onSubmit(route);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Route" : "New Route"}</DialogTitle>
            <DialogDescription>
              Configure matchers (when to trigger) and handlers (what to do).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Matchers Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Matchers</h4>
              <div className="space-y-2">
                <Label htmlFor="hosts">Hosts (comma-separated)</Label>
                <Input
                  id="hosts"
                  placeholder="example.com, www.example.com"
                  value={hosts}
                  onChange={(e) => setHosts(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paths">Paths (comma-separated)</Label>
                <Input
                  id="paths"
                  placeholder="/api/*, /static/*"
                  value={paths}
                  onChange={(e) => setPaths(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="methods">Methods (comma-separated, optional)</Label>
                <Input
                  id="methods"
                  placeholder="GET, POST"
                  value={methods}
                  onChange={(e) => setMethods(e.target.value)}
                />
              </div>
            </div>

            {/* Handler Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Handler</h4>
              <div className="space-y-2">
                <Label htmlFor="handler-type">Type</Label>
                <Select
                  id="handler-type"
                  value={handlerType}
                  onChange={(e) => setHandlerType(e.target.value as HandlerType)}
                >
                  {HANDLER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Handler-specific fields */}
              {handlerType === "reverse_proxy" && (
                <div className="space-y-2">
                  <Label htmlFor="upstreams">Upstreams (comma-separated)</Label>
                  <Input
                    id="upstreams"
                    placeholder="localhost:3000, localhost:3001"
                    value={proxyUpstreams}
                    onChange={(e) => setProxyUpstreams(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Backend addresses to proxy to. Format: host:port
                  </p>
                </div>
              )}

              {handlerType === "file_server" && (
                <div className="space-y-2">
                  <Label htmlFor="file-root">Root Directory</Label>
                  <Input
                    id="file-root"
                    placeholder="/var/www/html"
                    value={fileRoot}
                    onChange={(e) => setFileRoot(e.target.value)}
                  />
                </div>
              )}

              {handlerType === "static_response" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="static-status">Status Code</Label>
                    <Input
                      id="static-status"
                      placeholder="200"
                      value={staticStatus}
                      onChange={(e) => setStaticStatus(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="static-body">Response Body</Label>
                    <textarea
                      id="static-body"
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px] resize-y"
                      placeholder="Hello, World!"
                      value={staticBody}
                      onChange={(e) => setStaticBody(e.target.value)}
                    />
                  </div>
                </>
              )}

              {handlerType === "redir" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="redir-url">Redirect URL</Label>
                    <Input
                      id="redir-url"
                      placeholder="https://example.com{uri}"
                      value={redirUrl}
                      onChange={(e) => setRedirUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="redir-status">Status Code</Label>
                    <Select
                      id="redir-status"
                      value={redirStatus}
                      onChange={(e) => setRedirStatus(e.target.value)}
                    >
                      <option value="301">301 - Permanent</option>
                      <option value="302">302 - Temporary</option>
                      <option value="307">307 - Temporary (preserve method)</option>
                      <option value="308">308 - Permanent (preserve method)</option>
                    </Select>
                  </div>
                </>
              )}
            </div>

            {/* Terminal */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="terminal"
                checked={terminal}
                onChange={(e) => setTerminal(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="terminal" className="font-normal">
                Terminal (stop processing after this route matches)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Update" : "Add Route"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
