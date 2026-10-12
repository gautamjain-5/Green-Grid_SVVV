import { Languages, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleLang, toggleTheme, usePrefs } from "@/lib/preferences";

export function PrefToggles() {
  const { theme, lang } = usePrefs();
  return (
    <div className="flex items-center gap-2">
      <Button variant="glass" size="sm" onClick={toggleLang} aria-label="Switch language">
        <Languages className="h-4 w-4" />{lang === "en" ? "हिंदी" : "English"}
      </Button>
      <Button variant="glass" size="icon" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    </div>
  );
}
