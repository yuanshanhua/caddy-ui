/**
 * Dialog for creating/editing an HTTP server.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
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
import { type ServerFormValues, serverFormDefaults, serverFormSchema } from "@/lib/schemas/server";
import type { HttpServer } from "@/types/http-app";

interface ServerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (id: string, server: HttpServer) => void;
  loading?: boolean;
  /** If provided, the dialog is in "edit" mode. */
  initialId?: string;
  initialServer?: HttpServer;
}

function parseInitialValues(id: string, server: HttpServer): ServerFormValues {
  return {
    serverId: id,
    listenAddresses: server.listen ?? [":443"],
    disableHttps: server.automatic_https?.disable ?? false,
    protocols: server.protocols ?? [],
  };
}

export function ServerFormDialog({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
  initialId,
  initialServer,
}: ServerFormDialogProps) {
  const { t } = useTranslation("middleware");
  const { t: tc } = useTranslation();
  const isEdit = !!initialId;

  const form = useForm<ServerFormValues>({
    resolver: zodResolver(serverFormSchema),
    defaultValues:
      isEdit && initialServer ? parseInitialValues(initialId, initialServer) : serverFormDefaults,
    values: open
      ? isEdit && initialServer
        ? parseInitialValues(initialId, initialServer)
        : serverFormDefaults
      : undefined,
  });

  const listenAddresses = form.watch("listenAddresses");

  function handleFormSubmit(values: ServerFormValues) {
    const server: HttpServer = {
      listen: values.listenAddresses.filter((a) => a.trim() !== ""),
    };

    if (values.disableHttps) {
      server.automatic_https = { disable: true };
    }

    onSubmit(values.serverId.trim(), server);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)}>
            <DialogHeader>
              <DialogTitle>
                {isEdit ? t("serverForm.editTitle") : t("serverForm.createTitle")}
              </DialogTitle>
              <DialogDescription>
                {isEdit ? t("serverForm.editDescription") : t("serverForm.createDescription")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Server ID */}
              <FormField
                control={form.control}
                name="serverId"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <Label htmlFor="server-id">{t("serverForm.serverId")}</Label>
                    <FormControl>
                      <Input
                        id="server-id"
                        placeholder={t("serverForm.serverIdPlaceholder")}
                        disabled={isEdit}
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">{t("serverForm.serverIdHint")}</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Listen Addresses */}
              <div className="space-y-2">
                <Label>{t("serverForm.listenAddresses")}</Label>
                <div className="space-y-2">
                  {listenAddresses.map((_, idx) => (
                    <div key={idx} className="flex gap-2">
                      <FormField
                        control={form.control}
                        name={`listenAddresses.${idx}`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input placeholder={t("serverForm.listenPlaceholder")} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {listenAddresses.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const current = form.getValues("listenAddresses");
                            form.setValue(
                              "listenAddresses",
                              current.filter((_, i) => i !== idx),
                            );
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const current = form.getValues("listenAddresses");
                    form.setValue("listenAddresses", [...current, ""]);
                  }}
                >
                  <Plus className="h-3 w-3" />
                  {t("serverForm.addAddress")}
                </Button>
              </div>

              {/* Automatic HTTPS */}
              <FormField
                control={form.control}
                name="disableHttps"
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="disable-https"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 rounded border-input"
                    />
                    <Label htmlFor="disable-https" className="font-normal">
                      {t("serverForm.disableHttps")}
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
                    ? t("serverForm.update")
                    : t("serverForm.create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
