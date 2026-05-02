/**
 * Sidebar navigation component.
 */

import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui";
import { ArrowUpDown, FileCode, Globe, LayoutDashboard, Settings, Shield } from "lucide-react";
import { NavLink } from "react-router";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/sites", icon: Globe, label: "Sites" },
  { to: "/upstreams", icon: ArrowUpDown, label: "Upstreams" },
  { to: "/tls", icon: Shield, label: "TLS / Certs" },
  { to: "/global", icon: Settings, label: "Global Config" },
  { to: "/config", icon: FileCode, label: "Raw Config" },
] as const;

export function Sidebar() {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r bg-card transition-all duration-200",
        sidebarCollapsed ? "w-16" : "sidebar-width",
      )}
    >
      {/* Logo / Brand */}
      <div className="flex h-14 items-center border-b px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">C</span>
          </div>
          {!sidebarCollapsed && <span className="text-lg font-semibold">Caddy UI</span>}
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
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                sidebarCollapsed && "justify-center px-2",
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
