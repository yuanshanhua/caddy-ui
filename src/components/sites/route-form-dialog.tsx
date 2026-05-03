/**
 * Dialog for creating/editing a route within a server.
 *
 * Supports:
 * - Basic matchers (host, path, method)
 * - Advanced matchers (header, query, remote_ip, protocol)
 * - Primary handler (reverse_proxy, file_server, static_response, redirect)
 * - Middleware handlers (headers, encode, rewrite, authentication, CORS)
 */

import { ChevronDown, ChevronRight, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AdvancedMatchersForm } from "@/components/middleware/advanced-matchers-form";
import { BasicAuthForm } from "@/components/middleware/basic-auth-form";
import { CorsForm } from "@/components/middleware/cors-form";
import { EncodeForm } from "@/components/middleware/encode-form";
import { HeadersForm } from "@/components/middleware/headers-form";
import { RewriteForm } from "@/components/middleware/rewrite-form";
import { ReverseProxyFormDialog } from "@/components/proxy/reverse-proxy-form-dialog";
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
import type {
  AuthenticationHandler,
  EncodeHandler,
  HeadersHandler,
  HttpHandler,
  RewriteHandler,
} from "@/types/handlers";
import type { HttpRoute } from "@/types/http-app";
import type { RequestMatcher } from "@/types/matchers";
import type { ReverseProxyHandler } from "@/types/reverse-proxy";

interface RouteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (route: HttpRoute) => void;
  loading?: boolean;
  initialRoute?: HttpRoute;
}

type HandlerType = "reverse_proxy" | "file_server" | "static_response" | "redir";

type MiddlewareType = "headers" | "encode" | "rewrite" | "authentication" | "cors";

export function RouteFormDialog({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
  initialRoute,
}: RouteFormDialogProps) {
  const { t } = useTranslation("middleware");
  const { t: tc } = useTranslation();
  const isEdit = !!initialRoute;

  const HANDLER_OPTIONS: Array<{ value: HandlerType; label: string }> = [
    { value: "reverse_proxy", label: t("routeForm.handlerReverseProxy") },
    { value: "file_server", label: t("routeForm.handlerFileServer") },
    { value: "static_response", label: t("routeForm.handlerStaticResponse") },
    { value: "redir", label: t("routeForm.handlerRedirect") },
  ];

  const MIDDLEWARE_OPTIONS: Array<{ value: MiddlewareType; label: string; description: string }> = [
    {
      value: "headers",
      label: t("routeForm.mwHeaders"),
      description: t("routeForm.mwHeadersHint"),
    },
    {
      value: "encode",
      label: t("routeForm.mwCompression"),
      description: t("routeForm.mwCompressionHint"),
    },
    {
      value: "rewrite",
      label: t("routeForm.mwRewrite"),
      description: t("routeForm.mwRewriteHint"),
    },
    {
      value: "authentication",
      label: t("routeForm.mwBasicAuth"),
      description: t("routeForm.mwBasicAuthHint"),
    },
    { value: "cors", label: t("routeForm.mwCors"), description: t("routeForm.mwCorsHint") },
  ];

  // Matcher state
  const [hosts, setHosts] = useState("");
  const [paths, setPaths] = useState("");
  const [methods, setMethods] = useState("");

  // Advanced matchers
  const [showAdvancedMatchers, setShowAdvancedMatchers] = useState(false);
  const [advancedMatcher, setAdvancedMatcher] = useState<Partial<RequestMatcher>>({});

  // Handler state
  const [handlerType, setHandlerType] = useState<HandlerType>("reverse_proxy");
  const [proxyUpstreams, setProxyUpstreams] = useState("");
  const [reverseProxyHandler, setReverseProxyHandler] = useState<ReverseProxyHandler | undefined>();
  const [showProxyAdvanced, setShowProxyAdvanced] = useState(false);
  const [fileRoot, setFileRoot] = useState("");
  const [staticBody, setStaticBody] = useState("");
  const [staticStatus, setStaticStatus] = useState("200");
  const [redirUrl, setRedirUrl] = useState("");
  const [redirStatus, setRedirStatus] = useState("302");

  // Middleware state
  const [enabledMiddleware, setEnabledMiddleware] = useState<Set<MiddlewareType>>(new Set());
  const [headersHandler, setHeadersHandler] = useState<HeadersHandler | undefined>();
  const [encodeHandler, setEncodeHandler] = useState<EncodeHandler | undefined>();
  const [rewriteHandler, setRewriteHandler] = useState<RewriteHandler | undefined>();
  const [authHandler, setAuthHandler] = useState<AuthenticationHandler | undefined>();
  const [corsHandler, setCorsHandler] = useState<HeadersHandler | undefined>();

  // Middleware expand state
  const [expandedMiddleware, setExpandedMiddleware] = useState<MiddlewareType | null>(null);

  const [terminal, setTerminal] = useState(true);

  useEffect(() => {
    if (open && initialRoute) {
      // Parse matchers
      const firstMatch = initialRoute.match?.[0];
      setHosts(firstMatch?.host?.join(", ") ?? "");
      setPaths(firstMatch?.path?.join(", ") ?? "");
      setMethods(firstMatch?.method?.join(", ") ?? "");

      // Parse advanced matchers
      const advMatcher: Partial<RequestMatcher> = {};
      let hasAdvanced = false;
      if (firstMatch?.header) {
        advMatcher.header = firstMatch.header;
        hasAdvanced = true;
      }
      if (firstMatch?.query) {
        advMatcher.query = firstMatch.query;
        hasAdvanced = true;
      }
      if (firstMatch?.remote_ip) {
        advMatcher.remote_ip = firstMatch.remote_ip;
        hasAdvanced = true;
      }
      if (firstMatch?.protocol) {
        advMatcher.protocol = firstMatch.protocol;
        hasAdvanced = true;
      }
      setAdvancedMatcher(advMatcher);
      setShowAdvancedMatchers(hasAdvanced);

      // Parse handlers - separate primary from middleware
      const handlers = initialRoute.handle ?? [];
      const enabled = new Set<MiddlewareType>();

      for (const handler of handlers) {
        if (handler.handler === "reverse_proxy") {
          setHandlerType("reverse_proxy");
          const rp = handler as ReverseProxyHandler;
          setProxyUpstreams(rp.upstreams?.map((u) => u.dial ?? "").join(", ") ?? "");
          // Store full handler if it has advanced config beyond upstreams
          const hasAdvanced =
            !!rp.load_balancing || !!rp.health_checks || !!rp.transport || !!rp.headers;
          setReverseProxyHandler(hasAdvanced ? rp : undefined);
        } else if (handler.handler === "file_server") {
          setHandlerType("file_server");
          const fs = handler as { root?: string };
          setFileRoot(fs.root ?? "");
        } else if (handler.handler === "static_response") {
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
        } else if (handler.handler === "headers") {
          const hdrHandler = handler as HeadersHandler;
          const responseSet = hdrHandler.response?.set;
          if (responseSet && "Access-Control-Allow-Origin" in responseSet) {
            enabled.add("cors");
            setCorsHandler(hdrHandler);
          } else {
            enabled.add("headers");
            setHeadersHandler(hdrHandler);
          }
        } else if (handler.handler === "encode") {
          enabled.add("encode");
          setEncodeHandler(handler as EncodeHandler);
        } else if (handler.handler === "rewrite") {
          enabled.add("rewrite");
          setRewriteHandler(handler as RewriteHandler);
        } else if (handler.handler === "authentication") {
          enabled.add("authentication");
          setAuthHandler(handler as AuthenticationHandler);
        }
      }

      setEnabledMiddleware(enabled);
      setTerminal(initialRoute.terminal ?? true);
    } else if (open) {
      // Reset for new route
      setHosts("");
      setPaths("");
      setMethods("");
      setShowAdvancedMatchers(false);
      setAdvancedMatcher({});
      setHandlerType("reverse_proxy");
      setProxyUpstreams("localhost:3000");
      setReverseProxyHandler(undefined);
      setShowProxyAdvanced(false);
      setFileRoot("");
      setStaticBody("");
      setStaticStatus("200");
      setRedirUrl("");
      setRedirStatus("302");
      setEnabledMiddleware(new Set());
      setHeadersHandler(undefined);
      setEncodeHandler(undefined);
      setRewriteHandler(undefined);
      setAuthHandler(undefined);
      setCorsHandler(undefined);
      setExpandedMiddleware(null);
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

    // Merge advanced matchers
    if (showAdvancedMatchers) {
      if (advancedMatcher.header) {
        matcher.header = advancedMatcher.header;
        hasMatcher = true;
      }
      if (advancedMatcher.query) {
        matcher.query = advancedMatcher.query;
        hasMatcher = true;
      }
      if (advancedMatcher.remote_ip) {
        matcher.remote_ip = advancedMatcher.remote_ip;
        hasMatcher = true;
      }
      if (advancedMatcher.protocol) {
        matcher.protocol = advancedMatcher.protocol;
        hasMatcher = true;
      }
    }

    return hasMatcher ? [matcher] : undefined;
  }

  function buildHandlers(): HttpHandler[] {
    const handlers: HttpHandler[] = [];

    if (enabledMiddleware.has("authentication") && authHandler) {
      handlers.push(authHandler);
    }
    if (enabledMiddleware.has("rewrite") && rewriteHandler) {
      handlers.push(rewriteHandler);
    }
    if (enabledMiddleware.has("headers") && headersHandler) {
      handlers.push(headersHandler);
    }
    if (enabledMiddleware.has("cors") && corsHandler) {
      handlers.push(corsHandler);
    }
    if (enabledMiddleware.has("encode") && encodeHandler) {
      handlers.push(encodeHandler);
    }

    switch (handlerType) {
      case "reverse_proxy": {
        const upstreams = proxyUpstreams
          .split(",")
          .map((u) => u.trim())
          .filter(Boolean)
          .map((dial) => ({ dial }));
        if (reverseProxyHandler) {
          // Use full advanced config but override upstreams from the text field
          handlers.push({ ...reverseProxyHandler, upstreams });
        } else {
          handlers.push({ handler: "reverse_proxy" as const, upstreams });
        }
        break;
      }
      case "file_server":
        handlers.push({ handler: "file_server" as const, root: fileRoot || undefined });
        break;
      case "static_response":
        handlers.push({
          handler: "static_response" as const,
          status_code: staticStatus,
          body: staticBody || undefined,
        });
        break;
      case "redir":
        handlers.push({
          handler: "static_response" as const,
          status_code: redirStatus,
          headers: { Location: [redirUrl] },
        });
        break;
    }

    return handlers;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const route: HttpRoute = {
      match: buildMatcher(),
      handle: buildHandlers(),
      terminal,
    };

    onSubmit(route);
  }

  function toggleMiddleware(mw: MiddlewareType) {
    const updated = new Set(enabledMiddleware);
    if (updated.has(mw)) {
      updated.delete(mw);
      setExpandedMiddleware(null);
    } else {
      updated.add(mw);
      setExpandedMiddleware(mw);
      if (mw === "encode" && !encodeHandler) {
        setEncodeHandler({
          handler: "encode",
          encodings: { gzip: {}, zstd: {} },
          prefer: ["zstd", "gzip"],
          minimum_length: 256,
        });
      }
    }
    setEnabledMiddleware(updated);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-2xl max-h-[85vh]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? t("routeForm.editTitle") : t("routeForm.createTitle")}
            </DialogTitle>
            <DialogDescription>{t("routeForm.description")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* ===== MATCHERS SECTION ===== */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold border-b pb-1">{t("routeForm.matchers")}</h4>
              <div className="space-y-2">
                <Label htmlFor="hosts">{t("routeForm.hosts")}</Label>
                <Input
                  id="hosts"
                  placeholder={t("routeForm.hostsPlaceholder")}
                  value={hosts}
                  onChange={(e) => setHosts(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paths">{t("routeForm.paths")}</Label>
                <Input
                  id="paths"
                  placeholder={t("routeForm.pathsPlaceholder")}
                  value={paths}
                  onChange={(e) => setPaths(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="methods">{t("routeForm.methods")}</Label>
                <Input
                  id="methods"
                  placeholder={t("routeForm.methodsPlaceholder")}
                  value={methods}
                  onChange={(e) => setMethods(e.target.value)}
                />
              </div>

              {/* Advanced matchers toggle */}
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowAdvancedMatchers(!showAdvancedMatchers)}
              >
                {showAdvancedMatchers ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                {t("routeForm.advancedMatchers")}
              </button>

              {showAdvancedMatchers && (
                <div className="pl-3 border-l-2 border-muted">
                  <AdvancedMatchersForm
                    value={advancedMatcher as RequestMatcher}
                    onChange={setAdvancedMatcher}
                  />
                </div>
              )}
            </div>

            {/* ===== MIDDLEWARE SECTION ===== */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold border-b pb-1">{t("routeForm.middleware")}</h4>
              <p className="text-xs text-muted-foreground">
                {t("routeForm.middlewareDescription")}
              </p>

              <div className="space-y-2">
                {MIDDLEWARE_OPTIONS.map((mw) => (
                  <div key={mw.value} className="border rounded-md">
                    <div className="flex items-center gap-3 px-3 py-2">
                      <input
                        type="checkbox"
                        id={`mw-${mw.value}`}
                        checked={enabledMiddleware.has(mw.value)}
                        onChange={() => toggleMiddleware(mw.value)}
                        className="h-4 w-4 rounded border-input"
                      />
                      <button
                        type="button"
                        className="flex-1 flex items-center justify-between"
                        onClick={() => {
                          if (enabledMiddleware.has(mw.value)) {
                            setExpandedMiddleware(
                              expandedMiddleware === mw.value ? null : mw.value,
                            );
                          }
                        }}
                      >
                        <div className="text-left">
                          <Label
                            htmlFor={`mw-${mw.value}`}
                            className="font-medium text-sm cursor-pointer"
                          >
                            {mw.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">{mw.description}</p>
                        </div>
                        {enabledMiddleware.has(mw.value) &&
                          (expandedMiddleware === mw.value ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          ))}
                      </button>
                    </div>

                    {enabledMiddleware.has(mw.value) && expandedMiddleware === mw.value && (
                      <div className="px-3 pb-3 pt-1 border-t">
                        {mw.value === "headers" && (
                          <HeadersForm value={headersHandler} onChange={setHeadersHandler} />
                        )}
                        {mw.value === "encode" && (
                          <EncodeForm value={encodeHandler} onChange={setEncodeHandler} />
                        )}
                        {mw.value === "rewrite" && (
                          <RewriteForm value={rewriteHandler} onChange={setRewriteHandler} />
                        )}
                        {mw.value === "authentication" && (
                          <BasicAuthForm value={authHandler} onChange={setAuthHandler} />
                        )}
                        {mw.value === "cors" && (
                          <CorsForm value={corsHandler} onChange={setCorsHandler} />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ===== PRIMARY HANDLER SECTION ===== */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold border-b pb-1">
                {t("routeForm.primaryHandler")}
              </h4>
              <div className="space-y-2">
                <Label htmlFor="handler-type">{t("routeForm.handlerType")}</Label>
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

              {handlerType === "reverse_proxy" && (
                <div className="space-y-2">
                  <Label htmlFor="upstreams">{t("routeForm.upstreams")}</Label>
                  <Input
                    id="upstreams"
                    placeholder={t("routeForm.upstreamsPlaceholder")}
                    value={proxyUpstreams}
                    onChange={(e) => setProxyUpstreams(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">{t("routeForm.upstreamsHint")}</p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowProxyAdvanced(true)}
                    >
                      <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                      {t("routeForm.proxyAdvanced")}
                    </Button>
                    {reverseProxyHandler && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">
                        {t("routeForm.proxyAdvancedConfigured")}
                      </span>
                    )}
                  </div>
                  <ReverseProxyFormDialog
                    open={showProxyAdvanced}
                    onOpenChange={setShowProxyAdvanced}
                    initialHandler={
                      reverseProxyHandler ?? {
                        handler: "reverse_proxy",
                        upstreams: proxyUpstreams
                          .split(",")
                          .map((u) => u.trim())
                          .filter(Boolean)
                          .map((dial) => ({ dial })),
                      }
                    }
                    onSubmit={(handler) => {
                      setReverseProxyHandler(handler);
                      // Sync upstreams text field from the advanced dialog
                      const ups = handler.upstreams?.map((u) => u.dial ?? "").join(", ") ?? "";
                      setProxyUpstreams(ups);
                      setShowProxyAdvanced(false);
                    }}
                  />
                </div>
              )}

              {handlerType === "file_server" && (
                <div className="space-y-2">
                  <Label htmlFor="file-root">{t("routeForm.rootDirectory")}</Label>
                  <Input
                    id="file-root"
                    placeholder={t("routeForm.rootPlaceholder")}
                    value={fileRoot}
                    onChange={(e) => setFileRoot(e.target.value)}
                  />
                </div>
              )}

              {handlerType === "static_response" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="static-status">{t("routeForm.statusCode")}</Label>
                    <Input
                      id="static-status"
                      placeholder={t("routeForm.statusCodePlaceholder")}
                      value={staticStatus}
                      onChange={(e) => setStaticStatus(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="static-body">{t("routeForm.responseBody")}</Label>
                    <textarea
                      id="static-body"
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px] resize-y"
                      placeholder={t("routeForm.responsePlaceholder")}
                      value={staticBody}
                      onChange={(e) => setStaticBody(e.target.value)}
                    />
                  </div>
                </>
              )}

              {handlerType === "redir" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="redir-url">{t("routeForm.redirectUrl")}</Label>
                    <Input
                      id="redir-url"
                      placeholder={t("routeForm.redirectPlaceholder")}
                      value={redirUrl}
                      onChange={(e) => setRedirUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="redir-status">{t("routeForm.redirectStatusCode")}</Label>
                    <Select
                      id="redir-status"
                      value={redirStatus}
                      onChange={(e) => setRedirStatus(e.target.value)}
                    >
                      <option value="301">{t("routeForm.redirect301")}</option>
                      <option value="302">{t("routeForm.redirect302")}</option>
                      <option value="307">{t("routeForm.redirect307")}</option>
                      <option value="308">{t("routeForm.redirect308")}</option>
                    </Select>
                  </div>
                </>
              )}
            </div>

            {/* ===== OPTIONS ===== */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="terminal"
                checked={terminal}
                onChange={(e) => setTerminal(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="terminal" className="font-normal">
                {t("routeForm.terminal")}
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? tc("status.saving")
                : isEdit
                  ? t("routeForm.update")
                  : t("routeForm.addRoute")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
