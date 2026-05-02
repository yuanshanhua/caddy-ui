/**
 * Config diff view — shows what will change before applying.
 */

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfigDiffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading?: boolean;
  title?: string;
  description?: string;
  before: unknown;
  after: unknown;
}

interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
  lineNumber: number;
}

function computeDiff(before: string, after: string): DiffLine[] {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  const result: DiffLine[] = [];

  // Simple line-by-line diff (not LCS - good enough for config preview)
  const maxLen = Math.max(beforeLines.length, afterLines.length);
  let lineNum = 1;

  for (let i = 0; i < maxLen; i++) {
    const bLine = beforeLines[i];
    const aLine = afterLines[i];

    if (bLine === aLine) {
      if (bLine !== undefined) {
        result.push({ type: "unchanged", content: bLine, lineNumber: lineNum++ });
      }
    } else {
      if (bLine !== undefined) {
        result.push({ type: "removed", content: bLine, lineNumber: lineNum++ });
      }
      if (aLine !== undefined) {
        result.push({ type: "added", content: aLine, lineNumber: lineNum++ });
      }
    }
  }

  return result;
}

export function ConfigDiffDialog({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
  title = "Review Changes",
  description = "The following changes will be applied to your Caddy configuration.",
  before,
  after,
}: ConfigDiffDialogProps) {
  const beforeJson = JSON.stringify(before, null, 2);
  const afterJson = JSON.stringify(after, null, 2);

  const diffLines = useMemo(() => computeDiff(beforeJson, afterJson), [beforeJson, afterJson]);

  const addedCount = diffLines.filter((l) => l.type === "added").length;
  const removedCount = diffLines.filter((l) => l.type === "removed").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
          <div className="flex gap-2 pt-2">
            {addedCount > 0 && <Badge variant="success">+{addedCount} added</Badge>}
            {removedCount > 0 && <Badge variant="destructive">-{removedCount} removed</Badge>}
          </div>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-auto rounded-md border bg-muted/30">
          <pre className="p-4 text-xs font-mono leading-relaxed">
            {diffLines.map((line) => (
              <div
                key={`${line.type}-${line.lineNumber}-${line.content.slice(0, 20)}`}
                className={
                  line.type === "added"
                    ? "bg-green-500/10 text-green-700"
                    : line.type === "removed"
                      ? "bg-red-500/10 text-red-700 line-through"
                      : "text-foreground/70"
                }
              >
                <span className="inline-block w-5 text-right mr-3 text-muted-foreground select-none">
                  {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                </span>
                {line.content}
              </div>
            ))}
          </pre>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? "Applying..." : "Apply Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
