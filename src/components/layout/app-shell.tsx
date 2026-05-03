/**
 * App Shell — the main layout wrapper with sidebar, header, and content area.
 */

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

export function AppShell() {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage ?? "en";
  }, [i18n.resolvedLanguage]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div
        className={cn("transition-all duration-300 ease-out", sidebarCollapsed ? "ml-16" : "ml-64")}
      >
        <Header />
        <main className="bg-background p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
