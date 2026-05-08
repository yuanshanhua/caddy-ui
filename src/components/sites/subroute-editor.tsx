/**
 * SubrouteEditor — manages nested routes within a subroute handler.
 *
 * Displays a list of nested routes and supports add/edit/delete via a
 * nested RouteFormDialog (without further subroute support).
 */

import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RouteFormDialog } from "@/components/sites/route-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { HttpRoute } from "@/types/http-app";

interface SubrouteEditorProps {
  routes: HttpRoute[];
  onChange: (routes: HttpRoute[]) => void;
}

function getNestedRouteLabel(route: HttpRoute): { label: string; sublabel: string } {
  const hosts = route.match?.flatMap((m) => m.host ?? []) ?? [];
  const paths = route.match?.flatMap((m) => m.path ?? []) ?? [];
  const handlers = route.handle?.map((h) => h.handler) ?? [];

  let label = hosts.join(", ");
  if (!label) label = paths.join(", ");
  if (!label) label = "Catch All";

  const sublabel = handlers.join(" → ") || "No handler";
  return { label, sublabel };
}

export function SubrouteEditor({ routes, onChange }: SubrouteEditorProps) {
  const { t } = useTranslation("middleware");
  const [showNestedForm, setShowNestedForm] = useState(false);
  const [editingNestedIndex, setEditingNestedIndex] = useState<number | null>(null);

  function handleAddNested(route: HttpRoute) {
    onChange([...routes, route]);
    setShowNestedForm(false);
  }

  function handleEditNested(route: HttpRoute) {
    if (editingNestedIndex === null) return;
    const updated = [...routes];
    updated[editingNestedIndex] = route;
    onChange(updated);
    setEditingNestedIndex(null);
  }

  function handleDeleteNested(index: number) {
    onChange(routes.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-semibold">{t("subroute.nestedRoutes")}</h5>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowNestedForm(true)}>
          <Plus className="h-3 w-3" />
          {t("subroute.addNestedRoute")}
        </Button>
      </div>

      {routes.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center border rounded-md border-dashed">
          {t("subroute.noNestedRoutes")}
        </p>
      ) : (
        <div className="space-y-1.5 border rounded-md p-2">
          {routes.map((route, idx) => {
            const { label, sublabel } = getNestedRouteLabel(route);
            return (
              <div
                key={`nested-${idx}`}
                className="group flex items-center gap-2 rounded px-2 py-1.5 hover:bg-accent/50 transition-colors"
              >
                <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground w-5 shrink-0">#{idx}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium truncate">{label}</span>
                    {route.terminal && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
                        term
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{sublabel}</p>
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setEditingNestedIndex(idx)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteNested(idx)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Nested Route Dialog */}
      <RouteFormDialog
        open={showNestedForm}
        onOpenChange={setShowNestedForm}
        onSubmit={handleAddNested}
        hideSubroute
      />

      {/* Edit Nested Route Dialog */}
      <RouteFormDialog
        key={editingNestedIndex !== null ? `edit-nested-${editingNestedIndex}` : "closed"}
        open={editingNestedIndex !== null}
        onOpenChange={(open) => {
          if (!open) setEditingNestedIndex(null);
        }}
        onSubmit={handleEditNested}
        initialRoute={editingNestedIndex !== null ? routes[editingNestedIndex] : undefined}
        hideSubroute
      />
    </div>
  );
}
