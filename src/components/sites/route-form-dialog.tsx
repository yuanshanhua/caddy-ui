/**
 * Dialog for creating/editing a route within a server.
 *
 * Supports:
 * - Basic matchers (host, path, method)
 * - Advanced matchers (header, query, remote_ip, protocol)
 * - Primary handler (reverse_proxy, file_server, static_response, redirect, subroute)
 * - Middleware handlers (headers, encode, rewrite, authentication, CORS)
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { AdvancedMatchersForm } from "@/components/middleware/advanced-matchers-form";
import { BasicAuthForm } from "@/components/middleware/basic-auth-form";
import { CorsForm } from "@/components/middleware/cors-form";
import { EncodeForm } from "@/components/middleware/encode-form";
import { HeadersForm } from "@/components/middleware/headers-form";
import { RewriteForm } from "@/components/middleware/rewrite-form";
import { ReverseProxyForm } from "@/components/proxy/reverse-proxy-form";
import { SubrouteEditor } from "@/components/sites/subroute-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { extractUnknownHandlers } from "@/lib/route-handlers";
import { type RouteFormValues, routeFormDefaults, routeFormSchema } from "@/lib/schemas/route";
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
  /** Hide the "subroute" handler option (used for nested routes within a subroute). */
  hideSubroute?: boolean;
}

type HandlerType = "reverse_proxy" | "file_server" | "static_response" | "redir" | "subroute";
type MiddlewareType = "headers" | "encode" | "rewrite" | "authentication" | "cors";

function parseInitialFormValues(route: HttpRoute | undefined): RouteFormValues {
  if (!route) return routeFormDefaults;

  const firstMatch = route.match?.[0];
  const handlers = route.handle ?? [];

  let handlerType: HandlerType = "reverse_proxy";
  let fileRoot = "";
  let staticBody = "";
  let staticStatus = "200";
  let redirUrl = "";
  let redirStatus: RouteFormValues["redirStatus"] = "302";

  for (const handler of handlers) {
    if (handler.handler === "reverse_proxy") {
      handlerType = "reverse_proxy";
    } else if (handler.handler === "file_server") {
      handlerType = "file_server";
      const fs = handler as { root?: string };
      fileRoot = fs.root ?? "";
    } else if (handler.handler === "static_response") {
      const sr = handler as {
        headers?: Record<string, string[]>;
        status_code?: string | number;
        body?: string;
      };
      if (sr.headers?.["Location"]) {
        handlerType = "redir";
        redirUrl = sr.headers["Location"]?.[0] ?? "";
        redirStatus = String(sr.status_code ?? "302") as RouteFormValues["redirStatus"];
      } else {
        handlerType = "static_response";
        staticBody = sr.body ?? "";
        staticStatus = String(sr.status_code ?? "200");
      }
    } else if (handler.handler === "subroute") {
      handlerType = "subroute";
    }
  }

  return {
    hosts: firstMatch?.host?.join(", ") ?? "",
    paths: firstMatch?.path?.join(", ") ?? "",
    methods: firstMatch?.method?.join(", ") ?? "",
    handlerType,
    fileRoot,
    staticBody,
    staticStatus,
    redirUrl,
    redirStatus,
    terminal: route.terminal ?? true,
  };
}

export function RouteFormDialog({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
  initialRoute,
  hideSubroute = false,
}: RouteFormDialogProps) {
  const { t } = useTranslation("middleware");
  const { t: tc } = useTranslation();
  const isEdit = !!initialRoute;

  const HANDLER_OPTIONS: Array<{ value: HandlerType; label: string }> = [
    { value: "reverse_proxy", label: t("routeForm.handlerReverseProxy") },
    { value: "file_server", label: t("routeForm.handlerFileServer") },
    { value: "static_response", label: t("routeForm.handlerStaticResponse") },
    { value: "redir", label: t("routeForm.handlerRedirect") },
    ...(hideSubroute
      ? []
      : [{ value: "subroute" as const, label: t("routeForm.handlerSubroute") }]),
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

  // Form for direct fields (matchers, handler config, terminal)
  const form = useForm<RouteFormValues>({
    resolver: zodResolver(routeFormSchema),
    defaultValues: parseInitialFormValues(initialRoute),
    values: open ? parseInitialFormValues(initialRoute) : undefined,
  });

  const handlerType = form.watch("handlerType");

  // Sub-form state managed externally (each sub-form has its own RHF instance)
  const [showAdvancedMatchers, setShowAdvancedMatchers] = useState(false);
  const [advancedMatcher, setAdvancedMatcher] = useState<Partial<RequestMatcher>>({});
  const [reverseProxyHandler, setReverseProxyHandler] = useState<ReverseProxyHandler | undefined>();
  const [showProxyConfig, setShowProxyConfig] = useState(false);
  const [enabledMiddleware, setEnabledMiddleware] = useState<Set<MiddlewareType>>(new Set());
  const [headersHandler, setHeadersHandler] = useState<HeadersHandler | undefined>();
  const [encodeHandler, setEncodeHandler] = useState<EncodeHandler | undefined>();
  const [rewriteHandler, setRewriteHandler] = useState<RewriteHandler | undefined>();
  const [authHandler, setAuthHandler] = useState<AuthenticationHandler | undefined>();
  const [corsHandler, setCorsHandler] = useState<HeadersHandler | undefined>();
  const [expandedMiddleware, setExpandedMiddleware] = useState<MiddlewareType | null>(null);
  const [subrouteRoutes, setSubrouteRoutes] = useState<HttpRoute[]>([]);
  const [unknownHandlers, setUnknownHandlers] = useState<HttpHandler[]>([]);

  // Initialize sub-form state when dialog opens
  // Using a stable key approach: reset sub-form state when open/initialRoute changes
  const [lastInitKey, setLastInitKey] = useState<string | null>(null);
  const initKey = open ? (initialRoute ? "edit" : "new") : "closed";
  if (initKey !== lastInitKey && open) {
    setLastInitKey(initKey);

    if (initialRoute) {
      const firstMatch = initialRoute.match?.[0];
      const handlers = initialRoute.handle ?? [];

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

      // Parse handlers
      const enabled = new Set<MiddlewareType>();
      for (const handler of handlers) {
        if (handler.handler === "reverse_proxy") {
          setReverseProxyHandler(handler as ReverseProxyHandler);
          setShowProxyConfig(true);
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
        } else if (handler.handler === "subroute") {
          const sr = handler as { routes?: HttpRoute[] };
          setSubrouteRoutes(sr.routes ?? []);
        }
      }
      setEnabledMiddleware(enabled);

      setUnknownHandlers(extractUnknownHandlers(handlers));
    } else {
      setShowAdvancedMatchers(false);
      setAdvancedMatcher({});
      setReverseProxyHandler({ handler: "reverse_proxy", upstreams: [{ dial: "localhost:3000" }] });
      setShowProxyConfig(true);
      setEnabledMiddleware(new Set());
      setHeadersHandler(undefined);
      setEncodeHandler(undefined);
      setRewriteHandler(undefined);
      setAuthHandler(undefined);
      setCorsHandler(undefined);
      setExpandedMiddleware(null);
      setSubrouteRoutes([]);
      setUnknownHandlers([]);
    }
  }

  function buildMatcher(values: RouteFormValues): RequestMatcher[] | undefined {
    const matcher: RequestMatcher = {};
    let hasMatcher = false;

    if (values.hosts.trim()) {
      matcher.host = values.hosts
        .split(",")
        .map((h) => h.trim())
        .filter(Boolean);
      hasMatcher = true;
    }
    if (values.paths.trim()) {
      matcher.path = values.paths
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      hasMatcher = true;
    }
    if (values.methods.trim()) {
      matcher.method = values.methods
        .split(",")
        .map((m) => m.trim().toUpperCase())
        .filter(Boolean);
      hasMatcher = true;
    }

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

  function buildHandlers(values: RouteFormValues): HttpHandler[] {
    const handlers: HttpHandler[] = [];

    handlers.push(...unknownHandlers);

    if (enabledMiddleware.has("authentication") && authHandler) handlers.push(authHandler);
    if (enabledMiddleware.has("rewrite") && rewriteHandler) handlers.push(rewriteHandler);
    if (enabledMiddleware.has("headers") && headersHandler) handlers.push(headersHandler);
    if (enabledMiddleware.has("cors") && corsHandler) handlers.push(corsHandler);
    if (enabledMiddleware.has("encode") && encodeHandler) handlers.push(encodeHandler);

    switch (values.handlerType) {
      case "reverse_proxy": {
        if (reverseProxyHandler) {
          handlers.push(reverseProxyHandler);
        } else {
          handlers.push({
            handler: "reverse_proxy" as const,
            upstreams: [{ dial: "localhost:3000" }],
          });
        }
        break;
      }
      case "file_server":
        handlers.push({ handler: "file_server" as const, root: values.fileRoot || undefined });
        break;
      case "static_response":
        handlers.push({
          handler: "static_response" as const,
          status_code: values.staticStatus,
          body: values.staticBody || undefined,
        });
        break;
      case "redir":
        handlers.push({
          handler: "static_response" as const,
          status_code: values.redirStatus,
          headers: { Location: [values.redirUrl] },
        });
        break;
      case "subroute":
        handlers.push({
          handler: "subroute" as const,
          routes: subrouteRoutes,
        });
        break;
    }

    return handlers;
  }

  function handleFormSubmit(values: RouteFormValues) {
    const route: HttpRoute = {
      match: buildMatcher(values),
      handle: buildHandlers(values),
      terminal: values.terminal,
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)}>
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
                <FormField
                  control={form.control}
                  name="hosts"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <Label htmlFor="hosts">{t("routeForm.hosts")}</Label>
                      <FormControl>
                        <Input
                          id="hosts"
                          placeholder={t("routeForm.hostsPlaceholder")}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paths"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <Label htmlFor="paths">{t("routeForm.paths")}</Label>
                      <FormControl>
                        <Input
                          id="paths"
                          placeholder={t("routeForm.pathsPlaceholder")}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="methods"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <Label htmlFor="methods">{t("routeForm.methods")}</Label>
                      <FormControl>
                        <Input
                          id="methods"
                          placeholder={t("routeForm.methodsPlaceholder")}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

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
              {handlerType !== "subroute" && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold border-b pb-1">
                    {t("routeForm.middleware")}
                  </h4>
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
              )}

              {/* ===== PRIMARY HANDLER SECTION ===== */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold border-b pb-1">
                  {t("routeForm.primaryHandler")}
                </h4>
                <FormField
                  control={form.control}
                  name="handlerType"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <Label htmlFor="handler-type">{t("routeForm.handlerType")}</Label>
                      <FormControl>
                        <Select
                          id="handler-type"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                        >
                          {HANDLER_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {handlerType === "subroute" && (
                  <SubrouteEditor routes={subrouteRoutes} onChange={setSubrouteRoutes} />
                )}

                {handlerType !== "subroute" && (
                  <>
                    {handlerType === "reverse_proxy" && (
                      <div className="border rounded-md">
                        <button
                          type="button"
                          className="flex items-center justify-between w-full px-3 py-2"
                          onClick={() => setShowProxyConfig(!showProxyConfig)}
                        >
                          <span className="text-sm font-medium">{t("reverseProxy.title")}</span>
                          {showProxyConfig ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                        {showProxyConfig && (
                          <div className="px-3 pb-3 pt-1 border-t">
                            <ReverseProxyForm
                              value={reverseProxyHandler}
                              onChange={setReverseProxyHandler}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {handlerType === "file_server" && (
                      <FormField
                        control={form.control}
                        name="fileRoot"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <Label htmlFor="file-root">{t("routeForm.rootDirectory")}</Label>
                            <FormControl>
                              <Input
                                id="file-root"
                                placeholder={t("routeForm.rootPlaceholder")}
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}

                    {handlerType === "static_response" && (
                      <>
                        <FormField
                          control={form.control}
                          name="staticStatus"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <Label htmlFor="static-status">{t("routeForm.statusCode")}</Label>
                              <FormControl>
                                <Input
                                  id="static-status"
                                  placeholder={t("routeForm.statusCodePlaceholder")}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="staticBody"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <Label htmlFor="static-body">{t("routeForm.responseBody")}</Label>
                              <FormControl>
                                <textarea
                                  id="static-body"
                                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px] resize-y"
                                  placeholder={t("routeForm.responsePlaceholder")}
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    {handlerType === "redir" && (
                      <>
                        <FormField
                          control={form.control}
                          name="redirUrl"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <Label htmlFor="redir-url">{t("routeForm.redirectUrl")}</Label>
                              <FormControl>
                                <Input
                                  id="redir-url"
                                  placeholder={t("routeForm.redirectPlaceholder")}
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="redirStatus"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <Label htmlFor="redir-status">
                                {t("routeForm.redirectStatusCode")}
                              </Label>
                              <FormControl>
                                <Select
                                  id="redir-status"
                                  value={field.value}
                                  onChange={(e) => field.onChange(e.target.value)}
                                >
                                  <option value="301">{t("routeForm.redirect301")}</option>
                                  <option value="302">{t("routeForm.redirect302")}</option>
                                  <option value="307">{t("routeForm.redirect307")}</option>
                                  <option value="308">{t("routeForm.redirect308")}</option>
                                </Select>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </>
                )}
              </div>

              {/* ===== OPTIONS ===== */}
              <FormField
                control={form.control}
                name="terminal"
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="terminal"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 rounded border-input"
                    />
                    <Label htmlFor="terminal" className="font-normal">
                      {t("routeForm.terminal")}
                    </Label>
                  </div>
                )}
              />
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
        </Form>
      </DialogContent>
    </Dialog>
  );
}
