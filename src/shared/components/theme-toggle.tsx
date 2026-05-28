import { usePreferencesStore } from "@/preferences/store";
import { Button } from "@/shared/ui/button";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const theme = usePreferencesStore((state) => state.theme);
  const toggleTheme = usePreferencesStore((state) => state.toggleTheme);

  return (
    <Button
      intent="toggle"
      size="iconSm"
      onClick={toggleTheme}
      pressed={theme === "dark"}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      leadingIcon={theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
      iconOnly
    />
  );
}
