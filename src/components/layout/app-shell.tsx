/**
 * App Shell — the main layout wrapper with sidebar, header, and content area.
 */

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router";
import { useVersionCheck } from "@/hooks/use-version-check";
import { cn } from "@/lib/utils";
import { getVersionInfo } from "@/lib/version";
import { useUiStore } from "@/stores/ui";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { VersionInfo } from "./version-info";

export function AppShell() {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const { i18n } = useTranslation();
  const { data: updateInfo } = useVersionCheck();

  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage ?? "en";
  }, [i18n.resolvedLanguage]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div
        className={cn(
          "transition-all duration-300 ease-out flex flex-col min-h-screen",
          sidebarCollapsed ? "ml-16" : "ml-64",
        )}
      >
        <Header />
        <main className="bg-background p-6 flex-1">
          <Outlet />
        </main>
        <footer className="border-t border-border/60 bg-background/80 px-6 py-5 backdrop-blur-lg">
          <div className="flex justify-center">
            <VersionInfo
              {...getVersionInfo()}
              hasUpdate={updateInfo?.hasUpdate}
              latestVersion={updateInfo?.latestVersion}
            />
          </div>
        </footer>
      </div>
    </div>
  );
}
