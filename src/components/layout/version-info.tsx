/**
 * Version information component that displays the app version and GitHub link.
 */

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VersionInfoProps {
  version: string;
  githubUrl?: string;
}

export function VersionInfo({ version, githubUrl }: VersionInfoProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>v{version}</span>
      {githubUrl && (
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" asChild>
          <a href={githubUrl} target="_blank" rel="noopener noreferrer" title="View on GitHub">
            <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
      )}
    </div>
  );
}
