/**
 * Sidebar navigation component.
 */

import {
  ArrowUpDown,
  FileCode,
  FileText,
  FileUp,
  Globe,
  LayoutDashboard,
  LayoutTemplate,
  Settings,
  Shield,
} from "lucide-react";
import { NavLink } from "react-router";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/sites", icon: Globe, label: "Sites" },
  { to: "/import", icon: FileUp, label: "Import" },
  { to: "/upstreams", icon: ArrowUpDown, label: "Upstreams" },
  { to: "/tls", icon: Shield, label: "TLS / Certs" },
  { to: "/logging", icon: FileText, label: "Logging" },
  { to: "/templates", icon: LayoutTemplate, label: "Templates" },
  { to: "/global", icon: Settings, label: "Global Config" },
  { to: "/config", icon: FileCode, label: "Raw Config" },
] as const;

export function Sidebar() {
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
            <span className="text-lg font-semibold tracking-tight">Caddy UI</span>
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
            {!sidebarCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
