/**
 * Config Templates page.
 *
 * Provides built-in config presets for common patterns that can be
 * previewed and applied to a server.
 */

import { Check, Copy, FileCode2, Globe, Network, Server } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useConfig } from "@/hooks/use-config";
import { useAddRoute } from "@/hooks/use-routes";
import type { ConfigTemplate } from "@/lib/templates";
import { BUILT_IN_TEMPLATES } from "@/lib/templates";

function CategoryIcon({ category }: { category: ConfigTemplate["category"] }) {
  switch (category) {
    case "web":
      return <Globe className="h-5 w-5 text-blue-500" />;
    case "api":
      return <Network className="h-5 w-5 text-emerald-500" />;
    case "proxy":
      return <Server className="h-5 w-5 text-violet-500" />;
  }
}

function CategoryBadge({ category }: { category: ConfigTemplate["category"] }) {
  const { t } = useTranslation("templates");
  switch (category) {
    case "web":
      return <Badge variant="outline">{t("category.web")}</Badge>;
    case "api":
      return <Badge variant="outline">{t("category.api")}</Badge>;
    case "proxy":
      return <Badge variant="outline">{t("category.proxy")}</Badge>;
  }
}

export function TemplatesPage() {
  const { t } = useTranslation("templates");
  const { t: tc } = useTranslation();
  const { data: config } = useConfig();
  const addRoute = useAddRoute();

  const [selectedTemplate, setSelectedTemplate] = useState<ConfigTemplate | null>(null);
  const [targetServer, setTargetServer] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [appliedId, setAppliedId] = useState<string | null>(null);

  const servers = config?.apps?.http?.servers ?? {};
  const serverIds = Object.keys(servers);

  function handleApplyClick(template: ConfigTemplate) {
    setSelectedTemplate(template);
    if (serverIds.length === 1 && serverIds[0]) {
      setTargetServer(serverIds[0]);
    }
    setShowConfirm(true);
  }

  function handlePreview(template: ConfigTemplate) {
    setSelectedTemplate(template);
    setShowPreview(true);
  }

  async function handleApply() {
    if (!selectedTemplate || !targetServer) return;

    try {
      for (const route of selectedTemplate.routes) {
        await addRoute.mutateAsync({ serverId: targetServer, route });
      }

      toast.success(t("success", { name: selectedTemplate.name }), {
        description: t("successDescription", {
          count: selectedTemplate.routes.length,
          server: targetServer,
        }),
      });
      setAppliedId(selectedTemplate.id);
      setShowConfirm(false);
      setTimeout(() => setAppliedId(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(t("error"), { description: message });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Template Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {BUILT_IN_TEMPLATES.map((template) => (
          <Card key={template.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CategoryIcon category={template.category} />
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm">{template.name}</CardTitle>
                </div>
                <CategoryBadge category={template.category} />
              </div>
              <CardDescription className="text-xs mt-2">{template.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto pt-0">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {template.routes.length === 1
                    ? t("routeCount", { count: 1 })
                    : t("routeCountPlural", { count: template.routes.length })}
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handlePreview(template)}>
                    <FileCode2 className="h-3 w-3" />
                    {tc("actions.preview")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyClick(template)}
                    disabled={serverIds.length === 0}
                  >
                    {appliedId === template.id ? (
                      <>
                        <Check className="h-3 w-3" />
                        {t("applied")}
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        {t("applyTemplate")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {serverIds.length === 0 && (
        <Card className="border-amber-500/50">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-600 dark:text-amber-400">{t("noServers")}</p>
          </CardContent>
        </Card>
      )}

      {/* JSON Preview Dialog */}
      {showPreview && selectedTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowPreview(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowPreview(false);
          }}
        >
          <div
            className="bg-background border rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{selectedTemplate.name}</h3>
                <p className="text-xs text-muted-foreground">{t("preview.subtitle")}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                {tc("actions.close")}
              </Button>
            </div>
            <div className="p-4 overflow-auto flex-1">
              <pre className="text-xs bg-muted rounded-md p-4 overflow-x-auto">
                {JSON.stringify(selectedTemplate.routes, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Apply Confirmation */}
      {showConfirm && selectedTemplate && (
        <ConfirmDialog
          open={showConfirm}
          onOpenChange={setShowConfirm}
          title={t("confirm.title", { name: selectedTemplate.name })}
          description={
            serverIds.length > 1
              ? t("confirm.selectServer", { count: selectedTemplate.routes.length })
              : t("confirm.description", {
                  count: selectedTemplate.routes.length,
                  server: targetServer,
                })
          }
          confirmLabel={t("confirm.confirm")}
          onConfirm={handleApply}
          loading={addRoute.isPending}
        >
          {serverIds.length > 1 && (
            <div className="space-y-2 py-2">
              <Label htmlFor="target-server">{t("confirm.targetServer")}</Label>
              <Select
                id="target-server"
                value={targetServer}
                onChange={(e) => setTargetServer(e.target.value)}
              >
                <option value="">{t("confirm.selectPlaceholder")}</option>
                {serverIds.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}
