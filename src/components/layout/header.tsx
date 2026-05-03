/**
 * Header component with connection indicator, language switcher, and sidebar toggle.
 */

import { PanelLeft, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/ui";
import { ConnectionIndicator } from "./connection-indicator";
import { LanguageSwitcher } from "./language-switcher";

export function Header() {
  const { sidebarCollapsed, toggleSidebar } = useUiStore();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/60 bg-background/80 px-6 backdrop-blur-lg">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle sidebar">
          {sidebarCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <LanguageSwitcher />
        <ConnectionIndicator />
      </div>
    </header>
  );
}
