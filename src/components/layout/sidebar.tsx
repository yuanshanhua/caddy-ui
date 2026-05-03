/**
 * Sidebar navigation component.
 */

import {
  ArrowUpDown,
  FileCode,
  FileText,
  Globe,
  LayoutDashboard,
  LayoutTemplate,
  Settings,
  Shield,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui";

const navItems = [
  { to: "/", icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { to: "/sites", icon: Globe, labelKey: "nav.sites" },
  { to: "/upstreams", icon: ArrowUpDown, labelKey: "nav.upstreams" },
  { to: "/tls", icon: Shield, labelKey: "nav.tls" },
  { to: "/logging", icon: FileText, labelKey: "nav.logging" },
  { to: "/templates", icon: LayoutTemplate, labelKey: "nav.templates" },
  { to: "/global", icon: Settings, labelKey: "nav.globalConfig" },
  { to: "/config", icon: FileCode, labelKey: "nav.rawConfig" },
] as const;

export function Sidebar() {
  const { t } = useTranslation();
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r bg-sidebar transition-all duration-300 ease-out",
        sidebarCollapsed ? "w-16" : "sidebar-width",
      )}
    >
      {/* Logo / Brand */}
      <div className="flex h-14 items-center border-b px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm">
            <span className="text-sm font-bold text-primary-foreground">C</span>
          </div>
          {!sidebarCollapsed && (
            <span className="text-lg font-semibold tracking-tight">{t("brand")}</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                "hover:bg-primary/5 hover:text-foreground",
                isActive
                  ? "bg-primary/10 text-primary border-l-2 border-primary font-semibold"
                  : "text-muted-foreground border-l-2 border-transparent",
                sidebarCollapsed && "justify-center px-2 border-l-0",
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span>{t(item.labelKey)}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
