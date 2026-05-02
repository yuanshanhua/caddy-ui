/**
 * Compression (encode) middleware configuration form.
 *
 * Configures gzip/zstd compression with minimum length and content-type preferences.
 */

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EncodeHandler } from "@/types/handlers";

interface EncodeFormProps {
  value?: EncodeHandler;
  onChange: (handler: EncodeHandler) => void;
}

export function EncodeForm({ value, onChange }: EncodeFormProps) {
  const [gzipEnabled, setGzipEnabled] = useState(true);
  const [zstdEnabled, setZstdEnabled] = useState(true);
  const [minLength, setMinLength] = useState("256");
  const [prefer, setPrefer] = useState<string[]>(["zstd", "gzip"]);

  useEffect(() => {
    if (value) {
      const encodings = value.encodings ?? {};
      setGzipEnabled(Object.hasOwn(encodings, "gzip"));
      setZstdEnabled(Object.hasOwn(encodings, "zstd"));
      setMinLength(value.minimum_length ? String(value.minimum_length) : "256");
      setPrefer(value.prefer ?? ["zstd", "gzip"]);
    }
  }, [value]);

  function emitChange(gzip: boolean, zstd: boolean, min: string, pref: string[]) {
    const encodings: Record<string, Record<string, unknown>> = {};
    if (gzip) encodings["gzip"] = {};
    if (zstd) encodings["zstd"] = {};

    const handler: EncodeHandler = {
      handler: "encode",
      encodings,
      prefer: pref.filter((p) => (p === "gzip" && gzip) || (p === "zstd" && zstd)),
    };

    const minVal = Number.parseInt(min, 10);
    if (!Number.isNaN(minVal) && minVal > 0) {
      handler.minimum_length = minVal;
    }

    onChange(handler);
  }

  function handleGzipChange(checked: boolean) {
    setGzipEnabled(checked);
    emitChange(checked, zstdEnabled, minLength, prefer);
  }

  function handleZstdChange(checked: boolean) {
    setZstdEnabled(checked);
    emitChange(gzipEnabled, checked, minLength, prefer);
  }

  function handleMinLengthChange(val: string) {
    setMinLength(val);
    emitChange(gzipEnabled, zstdEnabled, val, prefer);
  }

  function handlePreferChange(first: string) {
    const newPrefer = first === "zstd" ? ["zstd", "gzip"] : ["gzip", "zstd"];
    setPrefer(newPrefer);
    emitChange(gzipEnabled, zstdEnabled, minLength, newPrefer);
  }

  return (
    <div className="space-y-4">
      {/* Encoding algorithms */}
      <section className="space-y-3">
        <Label className="text-sm font-semibold">Encodings</Label>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="encode-gzip"
              checked={gzipEnabled}
              onChange={(e) => handleGzipChange(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="encode-gzip" className="font-normal">
              gzip
            </Label>
            <span className="text-xs text-muted-foreground">(widely supported)</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="encode-zstd"
              checked={zstdEnabled}
              onChange={(e) => handleZstdChange(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="encode-zstd" className="font-normal">
              zstd
            </Label>
            <span className="text-xs text-muted-foreground">(faster, better ratio)</span>
          </div>
        </div>
      </section>

      {/* Preference order */}
      {gzipEnabled && zstdEnabled && (
        <section className="space-y-2">
          <Label className="text-sm font-semibold">Preferred Encoding</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="encode-prefer"
                value="zstd"
                checked={prefer[0] === "zstd"}
                onChange={() => handlePreferChange("zstd")}
                className="h-4 w-4"
              />
              <span className="text-sm">zstd first</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="encode-prefer"
                value="gzip"
                checked={prefer[0] === "gzip"}
                onChange={() => handlePreferChange("gzip")}
                className="h-4 w-4"
              />
              <span className="text-sm">gzip first</span>
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            The preferred encoding is used when the client supports both.
          </p>
        </section>
      )}

      {/* Minimum length */}
      <section className="space-y-2">
        <Label htmlFor="encode-min-length" className="text-sm font-semibold">
          Minimum Length (bytes)
        </Label>
        <Input
          id="encode-min-length"
          type="number"
          min="0"
          placeholder="256"
          value={minLength}
          onChange={(e) => handleMinLengthChange(e.target.value)}
          className="w-32"
        />
        <p className="text-xs text-muted-foreground">
          Responses smaller than this won&apos;t be compressed.
        </p>
      </section>
    </div>
  );
}
