/**
 * Theme toggle button — cycles between light, dark, and system modes.
 */

import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/ui";

export function ThemeToggle() {
  const { theme, setTheme } = useUiStore();

  function cycleTheme() {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  }

  return (
    <Button variant="ghost" size="icon" onClick={cycleTheme} aria-label="Toggle theme">
      {theme === "light" && <Sun className="h-4 w-4" />}
      {theme === "dark" && <Moon className="h-4 w-4" />}
      {theme === "system" && <Monitor className="h-4 w-4" />}
    </Button>
  );
}
