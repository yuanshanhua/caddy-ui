/**
 * App Shell — the main layout wrapper with sidebar, header, and content area.
 */

import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui";
import { Outlet } from "react-router";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

export function AppShell() {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={cn("transition-all duration-200", sidebarCollapsed ? "ml-16" : "ml-64")}>
        <Header />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
