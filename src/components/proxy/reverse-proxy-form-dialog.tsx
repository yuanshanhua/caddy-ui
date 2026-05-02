/**
 * Advanced reverse proxy configuration form.
 * Used as a standalone page/section when editing proxy settings in detail.
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
import type { ReverseProxyHandler } from "@/types/reverse-proxy";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface ReverseProxyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (handler: ReverseProxyHandler) => void;
  loading?: boolean;
  initialHandler?: ReverseProxyHandler;
}

export function ReverseProxyFormDialog({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
  initialHandler,
}: ReverseProxyFormProps) {
  // Upstreams
  const [upstreams, setUpstreams] = useState<Array<{ dial: string; maxRequests: string }>>([
    { dial: "", maxRequests: "" },
  ]);

  // Load balancing
  const [lbPolicy, setLbPolicy] = useState("round_robin");
  const [tryDuration, setTryDuration] = useState("");
  const [retries, setRetries] = useState("");

  // Health checks
  const [healthEnabled, setHealthEnabled] = useState(false);
  const [healthUri, setHealthUri] = useState("/");
  const [healthInterval, setHealthInterval] = useState("30s");
  const [healthTimeout, setHealthTimeout] = useState("5s");

  // Passive health
  const [passiveEnabled, setPassiveEnabled] = useState(false);
  const [maxFails, setMaxFails] = useState("3");
  const [failDuration, setFailDuration] = useState("30s");

  // Headers
  const [addXForwardedFor, setAddXForwardedFor] = useState(true);

  // Transport
  const [insecureSkipVerify, setInsecureSkipVerify] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialHandler) {
      // Parse upstreams
      const ups = initialHandler.upstreams?.map((u) => ({
        dial: u.dial ?? "",
        maxRequests: u.max_requests ? String(u.max_requests) : "",
      })) ?? [{ dial: "", maxRequests: "" }];
      setUpstreams(ups.length > 0 ? ups : [{ dial: "", maxRequests: "" }]);

      // Parse LB
      setLbPolicy(initialHandler.load_balancing?.selection_policy?.policy ?? "round_robin");
      setTryDuration(initialHandler.load_balancing?.try_duration ?? "");
      setRetries(
        initialHandler.load_balancing?.retries ? String(initialHandler.load_balancing.retries) : "",
      );

      // Parse active health
      const active = initialHandler.health_checks?.active;
      setHealthEnabled(!!active);
      setHealthUri(active?.uri ?? "/");
      setHealthInterval(active?.interval ?? "30s");
      setHealthTimeout(active?.timeout ?? "5s");

      // Parse passive health
      const passive = initialHandler.health_checks?.passive;
      setPassiveEnabled(!!passive);
      setMaxFails(passive?.max_fails ? String(passive.max_fails) : "3");
      setFailDuration(passive?.fail_duration ?? "30s");

      // Transport
      setInsecureSkipVerify(initialHandler.transport?.tls?.insecure_skip_verify ?? false);
    } else {
      setUpstreams([{ dial: "localhost:3000", maxRequests: "" }]);
      setLbPolicy("round_robin");
      setTryDuration("");
      setRetries("");
      setHealthEnabled(false);
      setHealthUri("/");
      setHealthInterval("30s");
      setHealthTimeout("5s");
      setPassiveEnabled(false);
      setMaxFails("3");
      setFailDuration("30s");
      setAddXForwardedFor(true);
      setInsecureSkipVerify(false);
    }
  }, [open, initialHandler]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const handler: ReverseProxyHandler = {
      handler: "reverse_proxy",
      upstreams: upstreams
        .filter((u) => u.dial.trim())
        .map((u) => ({
          dial: u.dial.trim(),
          ...(u.maxRequests ? { max_requests: Number.parseInt(u.maxRequests) } : {}),
        })),
    };

    // Load balancing
    if (lbPolicy !== "round_robin" || tryDuration || retries) {
      handler.load_balancing = {
        selection_policy: { policy: lbPolicy },
        ...(tryDuration ? { try_duration: tryDuration } : {}),
        ...(retries ? { retries: Number.parseInt(retries) } : {}),
      };
    }

    // Health checks
    if (healthEnabled || passiveEnabled) {
      handler.health_checks = {};
      if (healthEnabled) {
        handler.health_checks.active = {
          uri: healthUri,
          interval: healthInterval,
          timeout: healthTimeout,
        };
      }
      if (passiveEnabled) {
        handler.health_checks.passive = {
          max_fails: Number.parseInt(maxFails),
          fail_duration: failDuration,
        };
      }
    }

    // Headers
    if (addXForwardedFor) {
      handler.headers = {
        request: {
          set: {
            "X-Forwarded-For": ["{http.request.remote.host}"],
            "X-Forwarded-Proto": ["{http.request.scheme}"],
          },
        },
      };
    }

    // Transport
    if (insecureSkipVerify) {
      handler.transport = {
        protocol: "http",
        tls: { insecure_skip_verify: true },
      };
    }

    onSubmit(handler);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Reverse Proxy Configuration</DialogTitle>
            <DialogDescription>
              Configure upstreams, load balancing, health checks, and more.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
            {/* Upstreams */}
            <section className="space-y-3">
              <h4 className="text-sm font-semibold">Upstreams</h4>
              {upstreams.map((upstream, idx) => (
                <div key={idx} className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="host:port (e.g., localhost:3000)"
                      value={upstream.dial}
                      onChange={(e) => {
                        const updated = [...upstreams];
                        updated[idx] = { ...upstream, dial: e.target.value };
                        setUpstreams(updated);
                      }}
                    />
                  </div>
                  <div className="w-32">
                    <Input
                      placeholder="Max reqs"
                      type="number"
                      value={upstream.maxRequests}
                      onChange={(e) => {
                        const updated = [...upstreams];
                        updated[idx] = { ...upstream, maxRequests: e.target.value };
                        setUpstreams(updated);
                      }}
                    />
                  </div>
                  {upstreams.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setUpstreams(upstreams.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUpstreams([...upstreams, { dial: "", maxRequests: "" }])}
              >
                <Plus className="h-3 w-3" />
                Add Upstream
              </Button>
            </section>

            {/* Load Balancing */}
            <section className="space-y-3">
              <h4 className="text-sm font-semibold">Load Balancing</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Policy</Label>
                  <Select value={lbPolicy} onChange={(e) => setLbPolicy(e.target.value)}>
                    <option value="round_robin">Round Robin</option>
                    <option value="random">Random</option>
                    <option value="least_conn">Least Connections</option>
                    <option value="ip_hash">IP Hash</option>
                    <option value="uri_hash">URI Hash</option>
                    <option value="first">First Available</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Try Duration</Label>
                  <Input
                    placeholder="e.g., 5s"
                    value={tryDuration}
                    onChange={(e) => setTryDuration(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Retries</Label>
                  <Input
                    placeholder="e.g., 3"
                    type="number"
                    value={retries}
                    onChange={(e) => setRetries(e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* Active Health Checks */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="health-enabled"
                  checked={healthEnabled}
                  onChange={(e) => setHealthEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="health-enabled" className="text-sm font-semibold">
                  Active Health Checks
                </Label>
              </div>
              {healthEnabled && (
                <div className="grid grid-cols-3 gap-3 pl-6">
                  <div className="space-y-1">
                    <Label className="text-xs">URI</Label>
                    <Input value={healthUri} onChange={(e) => setHealthUri(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Interval</Label>
                    <Input
                      value={healthInterval}
                      onChange={(e) => setHealthInterval(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Timeout</Label>
                    <Input
                      value={healthTimeout}
                      onChange={(e) => setHealthTimeout(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </section>

            {/* Passive Health Checks */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="passive-enabled"
                  checked={passiveEnabled}
                  onChange={(e) => setPassiveEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="passive-enabled" className="text-sm font-semibold">
                  Passive Health Checks
                </Label>
              </div>
              {passiveEnabled && (
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <div className="space-y-1">
                    <Label className="text-xs">Max Fails</Label>
                    <Input
                      type="number"
                      value={maxFails}
                      onChange={(e) => setMaxFails(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Fail Duration</Label>
                    <Input value={failDuration} onChange={(e) => setFailDuration(e.target.value)} />
                  </div>
                </div>
              )}
            </section>

            {/* Options */}
            <section className="space-y-3">
              <h4 className="text-sm font-semibold">Options</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="x-forwarded"
                    checked={addXForwardedFor}
                    onChange={(e) => setAddXForwardedFor(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="x-forwarded" className="font-normal">
                    Add X-Forwarded-For / X-Forwarded-Proto headers
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="insecure-skip"
                    checked={insecureSkipVerify}
                    onChange={(e) => setInsecureSkipVerify(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="insecure-skip" className="font-normal">
                    Skip TLS verification (insecure - for self-signed backends)
                  </Label>
                </div>
              </div>
            </section>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
