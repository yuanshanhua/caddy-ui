/**
 * Dialog for creating/editing an HTTP server.
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
import type { HttpServer } from "@/types/http-app";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface ServerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (id: string, server: HttpServer) => void;
  loading?: boolean;
  /** If provided, the dialog is in "edit" mode. */
  initialId?: string;
  initialServer?: HttpServer;
}

export function ServerFormDialog({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
  initialId,
  initialServer,
}: ServerFormDialogProps) {
  const isEdit = !!initialId;

  const [serverId, setServerId] = useState("");
  const [listenAddresses, setListenAddresses] = useState<string[]>([":443"]);
  const [disableHttps, setDisableHttps] = useState(false);

  useEffect(() => {
    if (open) {
      if (isEdit && initialServer) {
        setServerId(initialId);
        setListenAddresses(initialServer.listen ?? [":443"]);
        setDisableHttps(initialServer.automatic_https?.disable ?? false);
      } else {
        setServerId("");
        setListenAddresses([":443"]);
        setDisableHttps(false);
      }
    }
  }, [open, isEdit, initialId, initialServer]);

  function handleAddAddress() {
    setListenAddresses([...listenAddresses, ""]);
  }

  function handleRemoveAddress(index: number) {
    setListenAddresses(listenAddresses.filter((_, i) => i !== index));
  }

  function handleAddressChange(index: number, value: string) {
    const updated = [...listenAddresses];
    updated[index] = value;
    setListenAddresses(updated);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!serverId.trim()) return;

    const server: HttpServer = {
      listen: listenAddresses.filter((a) => a.trim() !== ""),
    };

    if (disableHttps) {
      server.automatic_https = { disable: true };
    }

    onSubmit(serverId.trim(), server);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Server" : "New Server"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Modify the server configuration."
                : "Create a new HTTP server with listen addresses."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Server ID */}
            <div className="space-y-2">
              <Label htmlFor="server-id">Server ID</Label>
              <Input
                id="server-id"
                placeholder="e.g., srv0, my-site"
                value={serverId}
                onChange={(e) => setServerId(e.target.value)}
                disabled={isEdit}
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier for this server. Cannot be changed after creation.
              </p>
            </div>

            {/* Listen Addresses */}
            <div className="space-y-2">
              <Label>Listen Addresses</Label>
              <div className="space-y-2">
                {listenAddresses.map((addr, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      placeholder=":443 or :80 or 0.0.0.0:8080"
                      value={addr}
                      onChange={(e) => handleAddressChange(idx, e.target.value)}
                    />
                    {listenAddresses.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveAddress(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddAddress}>
                <Plus className="h-3 w-3" />
                Add Address
              </Button>
            </div>

            {/* Automatic HTTPS */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="disable-https"
                checked={disableHttps}
                onChange={(e) => setDisableHttps(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="disable-https" className="font-normal">
                Disable automatic HTTPS
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !serverId.trim()}>
              {loading ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
